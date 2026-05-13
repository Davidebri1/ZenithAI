import React, { useState, useRef, useCallback, useEffect } from "react";
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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { fetch } from "expo/fetch";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL, type AiProvider } from "@/constants/aiConfig";
import { saveSession, CONV_IDS_KEY } from "@/constants/sessions";

const CARD_GAP = 12;

interface ConvIds { [key: string]: number; }

interface CardState {
  conversationId: number | null;
  lastMessage: string;
  lastRole: "user" | "assistant";
  streaming: boolean;
  streamingText: string;
  hasUnread: boolean;
}

interface Attachment {
  base64: string;
  mimeType: string;
  uri: string;
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
    ? state.streamingText || "Thinking…"
    : state.lastMessage || "Tap to start chatting";

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth, backgroundColor: c.card, borderColor: selected ? provider.color : c.border, borderWidth: selected ? 2 : 1, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.cardTop, { backgroundColor: provider.colorLight }]}>
        <View style={[styles.aiCircle, { backgroundColor: provider.color }]}>
          <Text style={styles.aiInitial}>{provider.name[0]}</Text>
        </View>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onToggleSelect(); }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={[styles.checkbox, { backgroundColor: selected ? provider.color : c.background, borderColor: selected ? provider.color : c.border }]}
          activeOpacity={0.7}
        >
          {selected && <Feather name="check" size={11} color="#fff" />}
        </TouchableOpacity>
        {state.hasUnread && !state.streaming && (
          <View style={[styles.unreadDot, { backgroundColor: provider.color }]} />
        )}
      </View>
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
                {state.streamingText || "Generating…"}
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.previewText, { color: state.lastMessage ? (state.lastRole === "assistant" ? c.foreground : c.mutedForeground) : c.mutedForeground }]}
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
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const inputRef = useRef<TextInput>(null);
  const activeReaders = useRef<Map<string, ReadableStreamDefaultReader<Uint8Array>>>(new Map());
  const sessionTitleRef = useRef<string>("");

  const updateCard = useCallback((key: string, patch: Partial<CardState>) =>
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } })), []);

  const loadLastMessage = useCallback(async (key: string, convId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`);
      if (!res.ok) return;
      const msgs = (await res.json()) as Array<{ role: string; content: string }>;
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        updateCard(key, { lastMessage: last.content, lastRole: last.role as "user" | "assistant", conversationId: convId, hasUnread: last.role === "assistant" });
      }
    } catch {}
  }, [updateCard]);

  const refreshFromStorage = useCallback(() => {
    AsyncStorage.getItem(CONV_IDS_KEY).then((stored) => {
      if (!stored) return;
      const ids: ConvIds = JSON.parse(stored);
      setConvIds(ids);
      AI_PROVIDERS.forEach((p) => { if (ids[p.key]) loadLastMessage(p.key, ids[p.key]); });
    });
  }, [loadLastMessage]);

  useEffect(() => { refreshFromStorage(); }, [refreshFromStorage]);
  useFocusEffect(useCallback(() => { refreshFromStorage(); }, [refreshFromStorage]));

  const getOrCreateConvIds = useCallback(async (): Promise<ConvIds> => {
    const allKeys = AI_PROVIDERS.map((p) => p.key);
    if (allKeys.every((k) => convIds[k])) return convIds;

    const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
    const existing: ConvIds = stored ? JSON.parse(stored) : {};
    if (allKeys.every((k) => existing[k])) { setConvIds(existing); return existing; }

    const missing = AI_PROVIDERS.filter((p) => !existing[p.key]);
    const results = await Promise.all(
      missing.map(async (p) => {
        const res = await fetch(`${BASE_URL}/api/${p.key}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "My Conversations" }),
        });
        if (!res.ok) throw new Error(`Failed to create ${p.name} conversation`);
        const data = (await res.json()) as { id: number };
        return [p.key, data.id] as [string, number];
      })
    );
    const ids = { ...existing, ...Object.fromEntries(results) };
    await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(ids));
    setConvIds(ids);
    return ids;
  }, [convIds]);

  const streamForProvider = useCallback(async (
    key: string, convId: number, content: string,
    imageBase64?: string, imageMimeType?: string
  ) => {
    updateCard(key, { streaming: true, streamingText: "", hasUnread: false, lastMessage: content, lastRole: "user" });
    try {
      const body: Record<string, string> = { content };
      if (imageBase64) { body.imageBase64 = imageBase64; body.imageMimeType = imageMimeType || "image/jpeg"; }

      const res = await fetch(`${BASE_URL}/api/${key}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      activeReaders.current.set(key, reader);

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let parsed: { content?: string; done?: boolean; error?: string };
          try { parsed = JSON.parse(line.slice(6)); } catch { continue; }

          if (parsed.content) { fullText += parsed.content; updateCard(key, { streamingText: fullText }); }
          if (parsed.done) {
            finished = true;
            updateCard(key, { streaming: false, streamingText: "", lastMessage: fullText, lastRole: "assistant", hasUnread: true, conversationId: convId });
            break;
          }
          if (parsed.error) throw new Error(parsed.error);
        }
        if (finished) break;
      }

      if (!finished) {
        updateCard(key, { streaming: false, streamingText: "", lastMessage: fullText || content, lastRole: fullText ? "assistant" : "user", hasUnread: !!fullText, conversationId: convId });
      }
    } catch {
      const providerName = AI_PROVIDERS.find((p) => p.key === key)?.name ?? key;
      updateCard(key, { streaming: false, streamingText: "" });
      Alert.alert(`${providerName} failed`, "Your message is still in the input bar — you can try again.", [{ text: "OK" }]);
    } finally {
      activeReaders.current.delete(key);
    }
  }, [updateCard]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({ base64: asset.base64 ?? "", mimeType: asset.mimeType || "image/jpeg", uri: asset.uri });
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if ((!text && !attachment) || selected.size === 0) return;
    if ([...selected].some((k) => cards[k].streaming)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    inputRef.current?.blur();

    try {
      const isFirstMessage = AI_PROVIDERS.every((p) => !convIds[p.key]);
      const ids = await getOrCreateConvIds();

      if (isFirstMessage && !sessionTitleRef.current) {
        sessionTitleRef.current = text || "[Image]";
      }

      const pendingAttachment = attachment;
      setMessage("");
      setAttachment(null);

      [...selected].forEach((key) => {
        if (ids[key]) streamForProvider(key, ids[key], text, pendingAttachment?.base64, pendingAttachment?.mimeType);
      });
    } catch {
      Alert.alert("Connection failed", "Could not reach the server. Your message is still in the input bar.", [{ text: "OK" }]);
    }
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    activeReaders.current.forEach((reader) => { try { reader.cancel(); } catch {} });
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
    Haptics.selectionAsync();
    updateCard(provider.key, { hasUnread: false });
    router.push({ pathname: "/thread", params: { key: provider.key, convId: String(cards[provider.key].conversationId ?? convIds[provider.key] ?? "") } });
  };

  const handleNewChat = () => {
    Alert.alert("Start New Chat?", "Current session will be saved to History.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Chat",
        style: "destructive",
        onPress: async () => {
          const currentIds = convIds;
          if (Object.keys(currentIds).length > 0) {
            await saveSession(sessionTitleRef.current || "Untitled session", currentIds);
          }
          sessionTitleRef.current = "";
          activeReaders.current.forEach((reader) => { try { reader.cancel(); } catch {} });
          activeReaders.current.clear();
          await AsyncStorage.removeItem(CONV_IDS_KEY);
          setConvIds({});
          setCards(Object.fromEntries(AI_PROVIDERS.map((p) => [p.key, makeDefaultCard()])));
          setSelected(new Set(AI_PROVIDERS.map((p) => p.key)));
          setMessage("");
          setAttachment(null);
        },
      },
    ]);
  };

  const anyStreaming = Object.values(cards).some((c) => c.streaming);
  const selectedProviders = AI_PROVIDERS.filter((p) => selected.has(p.key));
  const canSend = (message.trim().length > 0 || !!attachment) && selected.size > 0 && !anyStreaming;

  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  const rows: (AiProvider | null)[][] = [];
  for (let i = 0; i < AI_PROVIDERS.length; i += 2) rows.push([AI_PROVIDERS[i], AI_PROVIDERS[i + 1] ?? null]);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior="padding">
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoDots}>
            {AI_PROVIDERS.map((p) => <View key={p.key} style={[styles.logoDot, { backgroundColor: p.color }]} />)}
          </View>
          <Text style={[styles.appName, { color: c.foreground }]}>MultiAI</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/search")} style={styles.headerBtn} activeOpacity={0.7}>
            <Feather name="search" size={17} color={c.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/history")} style={styles.headerBtn} activeOpacity={0.7}>
            <Feather name="clock" size={17} color={c.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatBtn} activeOpacity={0.7}>
            <Feather name="plus-square" size={15} color={c.mutedForeground} />
            <Text style={[styles.newChatText, { color: c.mutedForeground }]}>New Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card Grid */}
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((p, i) =>
              p ? (
                <AiCard key={p.key} provider={p} state={cards[p.key]} selected={selected.has(p.key)} onToggleSelect={() => toggleSelect(p.key)} onOpen={() => openThread(p)} cardWidth={cardWidth} />
              ) : (
                <View key={`empty-${i}`} style={{ width: cardWidth }} />
              )
            )}
          </View>
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { borderTopColor: c.border, paddingBottom: bottomPad + 8, backgroundColor: c.background }]}>
        <View style={styles.sendingRow}>
          <Text style={[styles.sendingLabel, { color: c.mutedForeground }]}>Sending to: </Text>
          <View style={styles.sendingChips}>
            {AI_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => toggleSelect(p.key)}
                style={[styles.sendingChip, { backgroundColor: selected.has(p.key) ? p.colorLight : c.secondary, borderColor: selected.has(p.key) ? p.color : c.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: selected.has(p.key) ? p.color : c.mutedForeground }]} />
                <Text style={[styles.chipLabel, { color: selected.has(p.key) ? p.color : c.mutedForeground }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Attachment preview */}
        {attachment && (
          <View style={styles.attachmentPreview}>
            <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} />
            <TouchableOpacity
              onPress={() => setAttachment(null)}
              style={[styles.removeAttachment, { backgroundColor: c.card, borderColor: c.border }]}
              activeOpacity={0.8}
            >
              <Feather name="x" size={13} color={c.foreground} />
            </TouchableOpacity>
            <Text style={[styles.attachmentLabel, { color: c.mutedForeground }]}>
              Image → {selectedProviders.map((p) => p.name).join(", ")}
            </Text>
          </View>
        )}

        <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7} disabled={anyStreaming}>
            <Feather name="paperclip" size={19} color={attachment ? AI_PROVIDERS[0].color : c.mutedForeground} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.foreground }]}
            placeholder={`Message ${selectedProviders.map((p) => p.name).join(", ")}…`}
            placeholderTextColor={c.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={4000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          {anyStreaming ? (
            <TouchableOpacity onPress={handleStop} style={[styles.sendBtn, { backgroundColor: "#ef4444" }]} activeOpacity={0.7}>
              <Feather name="square" size={15} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSend} disabled={!canSend} style={[styles.sendBtn, { backgroundColor: canSend ? AI_PROVIDERS[0].color : c.muted }]} activeOpacity={0.7}>
              <Feather name="send" size={17} color={canSend ? "#fff" : c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoDots: { flexDirection: "row", gap: 4 },
  logoDot: { width: 9, height: 9, borderRadius: 5 },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  newChatBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  newChatText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  grid: { paddingHorizontal: 16, gap: CARD_GAP, paddingBottom: 12 },
  row: { flexDirection: "row", gap: CARD_GAP },

  card: { borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop: { height: 80, alignItems: "center", justifyContent: "center", position: "relative" },
  aiCircle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  aiInitial: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  checkbox: { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  unreadDot: { position: "absolute", bottom: 10, right: 10, width: 9, height: 9, borderRadius: 5 },
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
  sendingChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },

  attachmentPreview: { flexDirection: "row", alignItems: "center", gap: 10 },
  attachmentThumb: { width: 44, height: 44, borderRadius: 8 },
  removeAttachment: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  attachmentLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  inputRow: { flexDirection: "row", alignItems: "flex-end", borderRadius: 14, borderWidth: 1, paddingLeft: 4, paddingRight: 7, paddingVertical: 7, gap: 4 },
  attachBtn: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", maxHeight: 110, lineHeight: 22, paddingVertical: 3 },
  sendBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
