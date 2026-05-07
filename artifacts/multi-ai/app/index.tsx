import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL, type AiProvider } from "@/constants/aiConfig";

const CONV_IDS_KEY = "@multiai_conv_ids_v2";
const CARD_GAP = 12;

interface ConvIds {
  [key: string]: number;
}

interface CardState {
  conversationId: number | null;
  lastMessage: string;
  lastRole: "user" | "assistant";
  streaming: boolean;
  streamingText: string;
  hasUnread: boolean;
}

function makeDefaultCard(): CardState {
  return { conversationId: null, lastMessage: "", lastRole: "user", streaming: false, streamingText: "", hasUnread: false };
}

interface AiCardProps {
  provider: AiProvider;
  state: CardState;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  cardWidth: number;
}

function AiCard({ provider, state, selected, onToggleSelect, onOpen, cardWidth }: AiCardProps) {
  const c = useColors();
  const previewText = state.streaming
    ? state.streamingText || "Thinking..."
    : state.lastMessage || "Tap to start chatting";

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          backgroundColor: c.card,
          borderColor: selected ? provider.color : c.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* Colored header strip */}
      <View style={[styles.cardTop, { backgroundColor: provider.colorLight }]}>
        <View style={[styles.aiCircle, { backgroundColor: provider.color }]}>
          <Text style={styles.aiInitial}>{provider.name[0]}</Text>
        </View>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onToggleSelect(); }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? provider.color : c.background,
              borderColor: selected ? provider.color : c.border,
            },
          ]}
          activeOpacity={0.7}
        >
          {selected && <Feather name="check" size={11} color="#fff" />}
        </TouchableOpacity>
        {/* Unread badge */}
        {state.hasUnread && !state.streaming && (
          <View style={[styles.unreadDot, { backgroundColor: provider.color }]} />
        )}
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={[styles.cardName, { color: c.foreground }]}>{provider.name}</Text>
          <Text style={[styles.cardModel, { color: c.mutedForeground }]}>{provider.model}</Text>
        </View>
        <View style={styles.previewRow}>
          {state.streaming ? (
            <View style={styles.streamingRow}>
              <ActivityIndicator size="small" color={provider.color} style={{ transform: [{ scale: 0.75 }] }} />
              <Text style={[styles.previewText, { color: provider.color }]} numberOfLines={2}>
                {state.streamingText || "Generating..."}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.previewText,
                { color: state.lastMessage ? (state.lastRole === "assistant" ? c.foreground : c.mutedForeground) : c.mutedForeground },
              ]}
              numberOfLines={3}
            >
              {previewText}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const cardWidth = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

  const [cards, setCards] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(AI_PROVIDERS.map((p) => [p.key, makeDefaultCard()]))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(AI_PROVIDERS.map((p) => p.key)));
  const [message, setMessage] = useState("");
  const [convIds, setConvIds] = useState<ConvIds>({});
  const inputRef = useRef<TextInput>(null);

  const updateCard = (key: string, patch: Partial<CardState>) =>
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // Load stored conversation IDs on mount
  useEffect(() => {
    AsyncStorage.getItem(CONV_IDS_KEY).then((stored) => {
      if (stored) {
        const ids: ConvIds = JSON.parse(stored);
        setConvIds(ids);
        // Load last message for each AI
        AI_PROVIDERS.forEach((p) => {
          if (ids[p.key]) loadLastMessage(p.key, ids[p.key]);
        });
      }
    });
  }, []);

  // Reload unread on focus
  useFocusEffect(
    useCallback(() => {
      // Mark cards with unread if they have a last message
      AI_PROVIDERS.forEach((p) => {
        setCards((prev) => {
          if (prev[p.key].lastMessage && prev[p.key].lastRole === "assistant") {
            return { ...prev, [p.key]: { ...prev[p.key], hasUnread: true } };
          }
          return prev;
        });
      });
    }, [])
  );

  const loadLastMessage = async (key: string, convId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`);
      const msgs = await res.json() as Array<{ role: string; content: string }>;
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        updateCard(key, { lastMessage: last.content, lastRole: last.role as "user" | "assistant", conversationId: convId });
      }
    } catch {}
  };

  const getOrCreateConvIds = async (): Promise<ConvIds> => {
    if (Object.keys(convIds).length === AI_PROVIDERS.length) return convIds;
    const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
    if (stored) {
      const ids = JSON.parse(stored) as ConvIds;
      setConvIds(ids);
      return ids;
    }
    // Create one conversation per provider
    const results = await Promise.all(
      AI_PROVIDERS.map(async (p) => {
        const res = await fetch(`${BASE_URL}/api/${p.key}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "My Conversations" }),
        });
        const data = await res.json() as { id: number };
        return [p.key, data.id] as [string, number];
      })
    );
    const ids = Object.fromEntries(results);
    await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(ids));
    setConvIds(ids);
    return ids;
  };

  const streamForProvider = async (key: string, convId: number, content: string) => {
    updateCard(key, { streaming: true, streamingText: "", hasUnread: false, lastMessage: content, lastRole: "user" });

    try {
      const res = await fetch(`${BASE_URL}/api/${key}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
            if (data.content) {
              fullText += data.content;
              updateCard(key, { streamingText: fullText });
            }
            if (data.done) {
              updateCard(key, { streaming: false, streamingText: "", lastMessage: fullText, lastRole: "assistant", hasUnread: true, conversationId: convId });
              return;
            }
            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }
      updateCard(key, { streaming: false, streamingText: "", lastMessage: fullText, lastRole: "assistant", hasUnread: true, conversationId: convId });
    } catch (err) {
      updateCard(key, { streaming: false, streamingText: "", lastMessage: "Error — tap to retry", lastRole: "user" });
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || selected.size === 0) return;
    if ([...selected].some((k) => cards[k].streaming)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    inputRef.current?.blur();
    setMessage("");

    try {
      const ids = await getOrCreateConvIds();
      [...selected].forEach((key) => {
        if (ids[key]) streamForProvider(key, ids[key], text);
      });
    } catch {
      Alert.alert("Error", "Could not connect to server. Make sure the app is running.");
    }
  };

  const toggleSelect = (key: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openThread = (provider: AiProvider) => {
    const card = cards[provider.key];
    if (card.streaming) return;
    Haptics.selectionAsync();
    updateCard(provider.key, { hasUnread: false });
    router.push({
      pathname: "/thread",
      params: { key: provider.key, convId: String(card.conversationId ?? "") },
    });
  };

  const handleNewChat = () => {
    Alert.alert("Start New Chat?", "This will clear all conversations and start fresh.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Chat",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(CONV_IDS_KEY);
          setConvIds({});
          setCards(Object.fromEntries(AI_PROVIDERS.map((p) => [p.key, makeDefaultCard()])));
          setSelected(new Set(AI_PROVIDERS.map((p) => p.key)));
        },
      },
    ]);
  };

  const anyStreaming = Object.values(cards).some((c) => c.streaming);
  const selectedProviders = AI_PROVIDERS.filter((p) => selected.has(p.key));
  const canSend = message.trim().length > 0 && selected.size > 0 && !anyStreaming;

  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  // Build grid data: pairs of providers for 2-col layout
  const rows: (AiProvider | null)[][] = [];
  for (let i = 0; i < AI_PROVIDERS.length; i += 2) {
    rows.push([AI_PROVIDERS[i], AI_PROVIDERS[i + 1] ?? null]);
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior="padding">
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoDots}>
            {AI_PROVIDERS.map((p) => (
              <View key={p.key} style={[styles.logoDot, { backgroundColor: p.color }]} />
            ))}
          </View>
          <Text style={[styles.appName, { color: c.foreground }]}>MultiAI</Text>
        </View>
        <TouchableOpacity onPress={handleNewChat} style={styles.newChatBtn} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={15} color={c.mutedForeground} />
          <Text style={[styles.newChatText, { color: c.mutedForeground }]}>New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Card Grid */}
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((p, i) =>
              p ? (
                <AiCard
                  key={p.key}
                  provider={p}
                  state={cards[p.key]}
                  selected={selected.has(p.key)}
                  onToggleSelect={() => toggleSelect(p.key)}
                  onOpen={() => openThread(p)}
                  cardWidth={cardWidth}
                />
              ) : (
                <View key={`empty-${i}`} style={{ width: cardWidth }} />
              )
            )}
          </View>
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />

      {/* Bottom input */}
      <View style={[styles.bottomBar, { borderTopColor: c.border, paddingBottom: bottomPad + 8, backgroundColor: c.background }]}>
        {/* Who we're sending to */}
        <View style={styles.sendingRow}>
          <Text style={[styles.sendingLabel, { color: c.mutedForeground }]}>
            Sending to:{" "}
          </Text>
          <View style={styles.sendingChips}>
            {AI_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => toggleSelect(p.key)}
                style={[
                  styles.sendingChip,
                  {
                    backgroundColor: selected.has(p.key) ? p.colorLight : c.secondary,
                    borderColor: selected.has(p.key) ? p.color : c.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: selected.has(p.key) ? p.color : c.mutedForeground }]} />
                <Text style={[styles.chipLabel, { color: selected.has(p.key) ? p.color : c.mutedForeground }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input row */}
        <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.foreground }]}
            placeholder={`Message ${selectedProviders.map((p) => p.name).join(", ")}...`}
            placeholderTextColor={c.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? AI_PROVIDERS[0].color : c.muted }]}
            activeOpacity={0.7}
          >
            {anyStreaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={17} color={canSend ? "#fff" : c.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoDots: { flexDirection: "row", gap: 4 },
  logoDot: { width: 9, height: 9, borderRadius: 5 },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  newChatBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  newChatText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  grid: { paddingHorizontal: 16, gap: CARD_GAP, paddingBottom: 12 },
  row: { flexDirection: "row", gap: CARD_GAP },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  aiCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  aiInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  checkbox: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  cardBody: { padding: 12, gap: 6 },
  cardNameRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardModel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  previewRow: { minHeight: 48 },
  streamingRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  previewText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  bottomBar: { paddingTop: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  sendingRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  sendingLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sendingChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  sendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 13,
    paddingRight: 7,
    paddingVertical: 7,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", maxHeight: 110, lineHeight: 22, paddingVertical: 3 },
  sendBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
