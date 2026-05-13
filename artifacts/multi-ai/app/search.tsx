import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL } from "@/constants/aiConfig";
import { getSessions, CONV_IDS_KEY, formatMessageTime, type Session } from "@/constants/sessions";

interface SearchResult {
  id: number;
  conversationId: number;
  content: string;
  role: string;
  createdAt: string;
}

interface EnrichedResult extends SearchResult {
  provider: (typeof AI_PROVIDERS)[number] | null;
  session: Session | null;
}

function getExcerpt(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 140);
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
}

function HighlightText({ text, query, baseColor, highlightColor }: {
  text: string; query: string; baseColor: string; highlightColor: string;
}) {
  if (!query) return <Text style={{ color: baseColor, fontSize: 14, lineHeight: 20 }}>{text}</Text>;

  const parts: { text: string; match: boolean }[] = [];
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  let pos = 0;
  let idx = lower.indexOf(qLower, pos);
  while (idx !== -1) {
    if (idx > pos) parts.push({ text: text.slice(pos, idx), match: false });
    parts.push({ text: text.slice(idx, idx + query.length), match: true });
    pos = idx + query.length;
    idx = lower.indexOf(qLower, pos);
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), match: false });

  return (
    <Text style={{ fontSize: 14, lineHeight: 20 }}>
      {parts.map((p, i) =>
        p.match
          ? <Text key={i} style={{ color: highlightColor, fontFamily: "Inter_600SemiBold" }}>{p.text}</Text>
          : <Text key={i} style={{ color: baseColor }}>{p.text}</Text>
      )}
    </Text>
  );
}

export default function SearchScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const [res, sessions] = await Promise.all([
        fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(q.trim())}`),
        getSessions(),
      ]);
      if (!res.ok) throw new Error("Search failed");
      const raw = (await res.json()) as SearchResult[];

      const enriched: EnrichedResult[] = raw.map((r) => {
        let provider: (typeof AI_PROVIDERS)[number] | null = null;
        let session: Session | null = null;
        for (const s of sessions) {
          for (const p of AI_PROVIDERS) {
            if (s.convIds[p.key] === r.conversationId) {
              provider = p;
              session = s;
              break;
            }
          }
          if (provider) break;
        }
        return { ...r, provider, session };
      });

      setResults(enriched);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleRestore = async (r: EnrichedResult) => {
    if (!r.session) return;
    await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(r.session.convIds));
    router.back();
    router.back();
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: c.secondary, borderColor: c.border }]}>
          <Feather name="search" size={15} color={c.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: c.foreground }]}
            placeholder="Search all conversations…"
            placeholderTextColor={c.mutedForeground}
            value={query}
            onChangeText={handleChangeText}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); setSearched(false); }} activeOpacity={0.7}>
              <Feather name="x" size={15} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AI_PROVIDERS[0].color} />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Feather name="search" size={48} color={c.mutedForeground} style={{ opacity: 0.3 }} />
          <Text style={[styles.hintText, { color: c.mutedForeground }]}>
            Search across all AI conversations
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={48} color={c.mutedForeground} style={{ opacity: 0.3 }} />
          <Text style={[styles.hintText, { color: c.mutedForeground }]}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: r }) => (
            <TouchableOpacity
              onPress={() => handleRestore(r)}
              style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
              activeOpacity={0.75}
              disabled={!r.session}
            >
              <View style={styles.cardTop}>
                {r.provider ? (
                  <View style={[styles.providerBadge, { backgroundColor: r.provider.colorLight }]}>
                    <View style={[styles.providerDot, { backgroundColor: r.provider.color }]} />
                    <Text style={[styles.providerName, { color: r.provider.color }]}>{r.provider.name}</Text>
                  </View>
                ) : (
                  <View style={[styles.providerBadge, { backgroundColor: c.secondary }]}>
                    <Feather name="message-circle" size={12} color={c.mutedForeground} />
                    <Text style={[styles.providerName, { color: c.mutedForeground }]}>Unknown</Text>
                  </View>
                )}
                <Text style={[styles.roleTag, { color: c.mutedForeground }]}>
                  {r.role === "user" ? "You" : "AI"}
                </Text>
                <Text style={[styles.timeText, { color: c.mutedForeground }]}>
                  {formatMessageTime(r.createdAt)}
                </Text>
              </View>

              {r.session && (
                <Text style={[styles.sessionTitle, { color: c.mutedForeground }]} numberOfLines={1}>
                  {r.session.title}
                </Text>
              )}

              <HighlightText
                text={getExcerpt(r.content, query)}
                query={query}
                baseColor={c.foreground}
                highlightColor={r.provider?.color ?? AI_PROVIDERS[0].color}
              />

              {r.session && (
                <View style={styles.restoreRow}>
                  <Feather name="rotate-ccw" size={12} color={c.mutedForeground} />
                  <Text style={[styles.restoreLabel, { color: c.mutedForeground }]}>Tap to restore session</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 80 },
  hintText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },

  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  providerDot: { width: 6, height: 6, borderRadius: 3 },
  providerName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  roleTag: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  sessionTitle: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  restoreRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  restoreLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
