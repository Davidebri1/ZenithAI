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
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { authFetch } from "@/constants/apiAuth";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL } from "@/constants/aiConfig";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import { getSessions, formatMessageTime, type Session } from "@/constants/sessions";

const BG = require("../../assets/images/bg-alley.png");
const BG_FOCAL: object = {};

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

function HighlightText({ text, query, highlightColor }: {
  text: string; query: string; highlightColor: string;
}) {
  if (!query) return <Text style={styles.resultText}>{text}</Text>;
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
    <Text style={styles.resultText}>
      {parts.map((p, i) =>
        p.match
          ? <Text key={i} style={{ color: highlightColor, fontFamily: "Inter_600SemiBold" }}>{p.text}</Text>
          : <Text key={i}>{p.text}</Text>
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
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const [res, sessions] = await Promise.all([
        authFetch(`${BASE_URL}/api/search?q=${encodeURIComponent(q.trim())}`),
        getSessions(),
      ]);
      if (!res.ok) throw new Error("Search failed");
      const raw = (await res.json()) as SearchResult[];
      const enriched: EnrichedResult[] = raw.map((r) => {
        let provider: (typeof AI_PROVIDERS)[number] | null = null;
        let session: Session | null = null;
        for (const s of sessions) {
          for (const p of AI_PROVIDERS) {
            if (s.convIds[p.key] === r.conversationId) { provider = p; session = s; break; }
          }
          if (provider) break;
        }
        return { ...r, provider, session };
      });
      setResults(enriched);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleRestore = (r: EnrichedResult) => {
    if (!r.session) return;
    router.push({
      pathname: "/(home)/session-detail",
      params: { sessionId: r.session.id },
    });
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover" imageStyle={BG_FOCAL}>
      <LinearGradient
        colors={["rgba(7,7,13,0.65)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        style={StyleSheet.absoluteFill}
      />
      <NeonGlowOverlay />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad + 10 }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.5)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" }]} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#e8e8f4" />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }]} />
            <Feather name="search" size={15} color="rgba(255,255,255,0.4)" style={{ zIndex: 1 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search all conversations…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={handleChangeText}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => doSearch(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(""); setResults([]); setSearched(false); }} activeOpacity={0.7} style={{ zIndex: 1 }}>
                <Feather name="x" size={15} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
          </View>
        ) : !searched ? (
          <View style={styles.center}>
            <View style={styles.hintIcon}>
              <Feather name="search" size={28} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.hintText}>Search across all AI conversations</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.hintText}>No results for "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: r }) => (
              <TouchableOpacity
                onPress={() => handleRestore(r)}
                style={styles.card}
                activeOpacity={0.75}
                disabled={!r.session}
              >
                <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.55)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    {r.provider ? (
                      <View style={[styles.providerBadge, { backgroundColor: `${r.provider.color}15`, borderColor: `${r.provider.color}40` }]}>
                        <View style={[styles.badgeDot, { backgroundColor: r.provider.color }]} />
                        <Text style={[styles.badgeName, { color: r.provider.color }]}>{r.provider.name}</Text>
                      </View>
                    ) : (
                      <View style={[styles.providerBadge, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }]}>
                        <Text style={[styles.badgeName, { color: "rgba(255,255,255,0.4)" }]}>Unknown</Text>
                      </View>
                    )}
                    <View style={[styles.roleTag, { borderColor: "rgba(255,255,255,0.1)" }]}>
                      <Text style={styles.roleTagText}>{r.role === "user" ? "You" : "AI"}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatMessageTime(r.createdAt)}</Text>
                  </View>

                  {r.session && (
                    <Text style={styles.sessionTitle} numberOfLines={1}>{r.session.title}</Text>
                  )}

                  <HighlightText
                    text={getExcerpt(r.content, query)}
                    query={query}
                    highlightColor={r.provider?.color ?? AI_PROVIDERS[0].color}
                  />

                  {r.session && (
                    <View style={styles.restoreRow}>
                      <Feather name="eye" size={11} color="rgba(255,255,255,0.3)" />
                      <Text style={styles.restoreLabel}>Tap to view session</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 14, gap: 10,
    overflow: "hidden",
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", zIndex: 1 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, gap: 8, overflow: "hidden",
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#f0f0ff", zIndex: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: 80 },
  hintIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  hintText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 48, color: "rgba(255,255,255,0.4)" },

  list: { padding: 16, gap: 10 },
  card: { borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  cardContent: { padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  roleTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  roleTagText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto", color: "rgba(255,255,255,0.4)" },
  sessionTitle: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", color: "rgba(255,255,255,0.4)" },
  resultText: { fontSize: 14, lineHeight: 21, color: "rgba(240,240,255,0.85)" },
  restoreRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  restoreLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },
});
