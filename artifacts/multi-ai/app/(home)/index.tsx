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
  ImageBackground,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { authFetch } from "@/constants/apiAuth";

import { useColors } from "@/hooks/useColors";
import { useQuota } from "@/hooks/useQuota";
import { QuotaBar } from "@/components/QuotaBar";
import { AI_PROVIDERS, BASE_URL, SYNTHESIS_COLOR, SYNTHESIS_COLOR_GLOW, type AiProvider } from "@/constants/aiConfig";
import { saveSession, CONV_IDS_KEY } from "@/constants/sessions";

const CARD_GAP = 10;
const BG = require("../../assets/images/bg-alley.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

interface SynthesisState {
  status: "idle" | "loading" | "done" | "error";
  text: string;
  expanded: boolean;
}

function makeDefaultCard(): CardState {
  return { conversationId: null, lastMessage: "", lastRole: "user", streaming: false, streamingText: "", hasUnread: false };
}

function cardGlowStyle(color: string, selected: boolean) {
  if (!selected || Platform.OS !== "web") return {};
  return { boxShadow: `0 0 0 1.5px ${color}, 0 0 28px ${color}55` } as object;
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
  const previewText = state.streaming
    ? state.streamingText || "Thinking…"
    : state.lastMessage || "Start a conversation";

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          borderColor: selected ? `${provider.color}cc` : "rgba(255,255,255,0.08)",
          borderWidth: 1,
          opacity: pressed ? 0.85 : 1,
          overflow: "hidden",
          ...cardGlowStyle(provider.color, selected),
        },
      ]}
    >
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.52)" }]} />

      <LinearGradient
        colors={[`${provider.color}22`, `${provider.color}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardTop}
      >
        <Text style={[styles.cardProviderName, { color: provider.color }]}>{provider.name}</Text>

        {!selected && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onToggleSelect(); }}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={[styles.checkbox, { backgroundColor: "rgba(0,0,0,0.4)", borderColor: `${provider.color}50` }]}
            activeOpacity={0.7}
          />
        )}

        {state.hasUnread && !state.streaming && (
          <View style={[styles.unreadDot, { backgroundColor: provider.color }]} />
        )}
      </LinearGradient>

      <View style={styles.cardBody}>
        <View style={styles.previewRow}>
          {state.streaming ? (
            <View style={styles.streamingRow}>
              <ActivityIndicator size="small" color={provider.color} style={{ transform: [{ scale: 0.7 }] }} />
              <Text style={[styles.previewText, { color: `${provider.color}cc` }]} numberOfLines={2}>
                {state.streamingText || "Generating…"}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.previewText,
                {
                  color: state.lastMessage
                    ? state.lastRole === "assistant" ? "rgba(240,240,255,0.9)" : "rgba(240,240,255,0.55)"
                    : "rgba(240,240,255,0.4)",
                },
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

function SynthesisCard({ synthesis, onClose, stale }: { synthesis: SynthesisState; onClose: () => void; stale?: boolean }) {
  if (!synthesis.expanded) return null;
  return (
    <View style={[styles.synthCard, { overflow: "hidden" }]}>
      <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.60)", borderRadius: 22, borderWidth: 1, borderColor: stale ? "rgba(255,255,255,0.12)" : `${SYNTHESIS_COLOR}40` }]} />
      <LinearGradient
        colors={stale ? ["rgba(255,255,255,0.05)", "transparent"] : [`${SYNTHESIS_COLOR}30`, `${SYNTHESIS_COLOR}08`, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.synthHeader}>
        <LinearGradient
          colors={stale ? ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.25)"] : [SYNTHESIS_COLOR, "#ff8c00", SYNTHESIS_COLOR]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.synthBadge}
        >
          <Text style={styles.synthBadgeText}>✦  SYNTHESIS</Text>
        </LinearGradient>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} activeOpacity={0.7}>
          <Feather name="x" size={16} color={`${SYNTHESIS_COLOR}80`} />
        </TouchableOpacity>
      </View>

      <View style={styles.synthSubtitleRow}>
        <Feather name="git-merge" size={11} color={stale ? "rgba(255,255,255,0.3)" : `${SYNTHESIS_COLOR}70`} />
        <Text style={[styles.synthSubtitle, stale && { color: "rgba(255,255,255,0.3)" }]}>
          {stale ? "Previous round — new responses loading…" : "Consensus across all AI responses"}
        </Text>
      </View>

      {synthesis.status === "loading" && synthesis.text.length === 0 ? (
        <View style={styles.synthLoading}>
          <ActivityIndicator size="small" color={SYNTHESIS_COLOR} />
          <Text style={styles.synthLoadingText}>Synthesizing responses…</Text>
        </View>
      ) : synthesis.status === "error" ? (
        <Text style={styles.synthError}>Synthesis failed. Please try again.</Text>
      ) : (
        <ScrollView style={styles.synthScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <Text style={styles.synthText}>
            {synthesis.text}
            {synthesis.status === "loading" && (
              <Text style={[styles.synthCursor, { color: SYNTHESIS_COLOR }]}> ▋</Text>
            )}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cardWidth = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;
  const { quota, refresh: refreshQuota } = useQuota();

  const [cards, setCards] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(AI_PROVIDERS.map((p) => [p.key, makeDefaultCard()]))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(AI_PROVIDERS.map((p) => p.key)));
  const [message, setMessage] = useState("");
  const [convIds, setConvIds] = useState<ConvIds>({});
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisState>({ status: "idle", text: "", expanded: false });

  const inputRef = useRef<TextInput>(null);
  const activeReaders = useRef<Map<string, ReadableStreamDefaultReader<Uint8Array>>>(new Map());
  const sessionTitleRef = useRef<string>("");
  const lastPromptRef = useRef<string>("");

  const updateCard = useCallback((key: string, patch: Partial<CardState>) =>
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } })), []);

  const loadLastMessage = useCallback(async (key: string, convId: number) => {
    try {
      const res = await authFetch(`${BASE_URL}/api/conversations/${convId}/messages`);
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
        const res = await authFetch(`${BASE_URL}/api/${p.key}/conversations`, {
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
      const res = await authFetch(`${BASE_URL}/api/${key}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      activeReaders.current.set(key, reader);
      const decoder = new TextDecoder();
      let buffer = "", fullText = "";
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
      if (!finished) updateCard(key, { streaming: false, streamingText: "", lastMessage: fullText || content, lastRole: fullText ? "assistant" : "user", hasUnread: !!fullText, conversationId: convId });
    } catch {
      const pName = AI_PROVIDERS.find((p) => p.key === key)?.name ?? key;
      updateCard(key, { streaming: false, streamingText: "" });
      Alert.alert(`${pName} failed`, "Your message is still in the input bar.", [{ text: "OK" }]);
    } finally {
      activeReaders.current.delete(key);
    }
  }, [updateCard]);

  const handleSynthesize = useCallback(async () => {
    if (synthesis.status === "loading") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const readyProviders = AI_PROVIDERS.filter(
      (p) => selected.has(p.key) && cards[p.key].lastRole === "assistant" && cards[p.key].lastMessage.length > 10
    );
    if (readyProviders.length < 2) {
      Alert.alert("Not enough responses", "Send a prompt to at least 2 AI models first.", [{ text: "OK" }]);
      return;
    }

    setSynthesis({ status: "loading", text: "", expanded: true });

    try {
      const responses = readyProviders.map((p) => ({ name: p.name, content: cards[p.key].lastMessage }));
      const res = await authFetch(`${BASE_URL}/api/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: lastPromptRef.current || "the question", responses }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "", fullText = "";
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
          if (parsed.content) { fullText += parsed.content; setSynthesis((prev) => ({ ...prev, text: fullText })); }
          if (parsed.done) { finished = true; setSynthesis((prev) => ({ ...prev, status: "done", text: fullText })); break; }
          if (parsed.error) throw new Error(parsed.error);
        }
        if (finished) break;
      }
      if (!finished) setSynthesis((prev) => ({ ...prev, status: "done" }));
    } catch {
      setSynthesis((prev) => ({ ...prev, status: "error" }));
    }
  }, [synthesis.status, cards, selected]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow photo access."); return; }
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

    if (quota.plan === "free" && quota.remaining === 0) {
      Alert.alert(
        "No prompts remaining",
        "You've used all your free prompts. Upgrade to Pro for unlimited access.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/(home)/upgrade") },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    inputRef.current?.blur();
    if (text) lastPromptRef.current = text;
    try {
      // Server-side quota check + increment before any streaming begins
      const trackRes = await authFetch(`${BASE_URL}/api/prompt/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (trackRes.status === 402) {
        Alert.alert(
          "No prompts remaining",
          "You've used all your free prompts. Upgrade to Pro for 250 prompts/month.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Upgrade to Pro", onPress: () => router.push("/(home)/upgrade") },
          ]
        );
        return;
      }
      if (!trackRes.ok) throw new Error(`track ${trackRes.status}`);

      const isFirstMessage = AI_PROVIDERS.every((p) => !convIds[p.key]);
      const ids = await getOrCreateConvIds();
      if (isFirstMessage && !sessionTitleRef.current) sessionTitleRef.current = text || "[Image]";
      const pendingAttachment = attachment;
      setMessage("");
      setAttachment(null);
      [...selected].forEach((key) => {
        if (ids[key]) streamForProvider(key, ids[key], text, pendingAttachment?.base64, pendingAttachment?.mimeType);
      });
      refreshQuota();
    } catch (err: any) {
      Alert.alert("Connection failed", "Could not reach the server.", [{ text: "OK" }]);
    }
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    activeReaders.current.forEach((reader) => { try { reader.cancel(); } catch {} });
    activeReaders.current.clear();
    setCards((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key].streaming) next[key] = { ...next[key], streaming: false, streamingText: "" };
      }
      return next;
    });
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

  const handleNewChat = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentIds = convIds;
    if (Object.keys(currentIds).length > 0) {
      await saveSession(sessionTitleRef.current || "Untitled session", currentIds);
    }
    sessionTitleRef.current = "";
    lastPromptRef.current = "";
    activeReaders.current.forEach((reader) => { try { reader.cancel(); } catch {} });
    activeReaders.current.clear();
    await AsyncStorage.removeItem(CONV_IDS_KEY);
    setConvIds({});
    setCards(Object.fromEntries(AI_PROVIDERS.map((p) => [p.key, makeDefaultCard()])));
    setSelected(new Set(AI_PROVIDERS.map((p) => p.key)));
    setSynthesis({ status: "idle", text: "", expanded: false });
    setMessage("");
    setAttachment(null);
  };

  const anyStreaming = Object.values(cards).some((c) => c.streaming);
  const selectedProviders = AI_PROVIDERS.filter((p) => selected.has(p.key));
  const canSend = (message.trim().length > 0 || !!attachment) && selected.size > 0 && !anyStreaming;
  const canSynthesize = !anyStreaming && AI_PROVIDERS.filter((p) => selected.has(p.key) && cards[p.key].lastRole === "assistant" && cards[p.key].lastMessage.length > 10).length >= 2;
  const hasSomeResponse = AI_PROVIDERS.some((p) => cards[p.key].lastRole === "assistant" && cards[p.key].lastMessage.length > 0);
  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  const rows: (AiProvider | null)[][] = [];
  for (let i = 0; i < AI_PROVIDERS.length; i += 2) rows.push([AI_PROVIDERS[i], AI_PROVIDERS[i + 1] ?? null]);

  const listFooter = <View style={{ paddingBottom: 4 }} />;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,13,0.25)", "rgba(7,7,13,0.55)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        locations={[0, 0.35, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <View style={[styles.header, { paddingTop: topPad + 14 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoZ}>Z</Text>
            </View>
            <Text style={styles.appName}>Zenith</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/(home)/enterprise")} style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="star" size={17} color="#f59e0b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(home)/compare")} style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="columns" size={17} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(home)/search")} style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="search" size={17} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(home)/history")} style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="clock" size={17} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatBtn} activeOpacity={0.7}>
              <Feather name="plus" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.newChatText}>New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasSomeResponse && (
          <View style={styles.synthesisTop}>
            {synthesis.expanded && (
              <SynthesisCard synthesis={synthesis} onClose={() => setSynthesis((s) => ({ ...s, expanded: false }))} stale={anyStreaming && synthesis.status === "done"} />
            )}
            <TouchableOpacity
              onPress={
                synthesis.expanded
                  ? () => setSynthesis((s) => ({ ...s, expanded: false }))
                  : synthesis.status !== "idle"
                    ? () => setSynthesis((s) => ({ ...s, expanded: true }))
                    : handleSynthesize
              }
              disabled={!canSynthesize && synthesis.status === "idle"}
              style={[
                styles.synthesizeBtn,
                synthesis.expanded && { borderColor: `${SYNTHESIS_COLOR}70` },
                !canSynthesize && synthesis.status === "idle" && { opacity: 0.45 },
                Platform.OS === "web" ? { boxShadow: `0 0 18px ${SYNTHESIS_COLOR_GLOW}` } as object : {},
              ]}
              activeOpacity={0.75}
            >
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
              <LinearGradient
                colors={[`${SYNTHESIS_COLOR}20`, `${SYNTHESIS_COLOR}05`]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <Text style={styles.synthesizeBtnIcon}>✦</Text>
              <View style={styles.synthesizeBtnContent}>
                <Text style={[styles.synthesizeBtnTitle, Platform.OS === "web" ? { textShadow: `0 0 20px ${SYNTHESIS_COLOR}` } as object : {}]}>
                  {synthesis.status === "loading" ? "Synthesizing…" : "Synthesize"}
                </Text>
                <Text style={styles.synthesizeBtnSub}>
                  {synthesis.expanded && synthesis.status !== "idle"
                    ? "Tap to collapse"
                    : synthesis.status !== "idle"
                      ? "Tap to reveal consensus"
                      : `Consensus across ${AI_PROVIDERS.filter((p) => selected.has(p.key) && cards[p.key].lastRole === "assistant").length} AI responses`}
                </Text>
              </View>
              {synthesis.status === "loading" ? (
                <ActivityIndicator size="small" color={SYNTHESIS_COLOR} />
              ) : (
                <Feather name={synthesis.expanded ? "chevron-up" : "chevron-down"} size={16} color={`${SYNTHESIS_COLOR}90`} />
              )}
            </TouchableOpacity>
          </View>
        )}

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
          ListHeaderComponent={
            AI_PROVIDERS.every((p) => !cards[p.key].lastMessage) ? (
              <View style={styles.firstTimeHint}>
                <Text style={styles.firstTimeTitle}>Ask anything. Get every answer at once.</Text>
                <View style={styles.firstTimeModels}>
                  {AI_PROVIDERS.map((p) => (
                    <View key={p.key} style={[styles.firstTimeChip, { borderColor: `${p.color}40`, backgroundColor: `${p.color}0f` }]}>
                      <View style={[styles.firstTimeDot, { backgroundColor: p.color }]} />
                      <Text style={[styles.firstTimeChipText, { color: `${p.color}cc` }]}>{p.name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.firstTimeSub}>Type a prompt below. Tap any card to open the full thread. Use the chips below to include or exclude a model.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={listFooter}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8 }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.6)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)" }]} />

          <QuotaBar quota={quota} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {AI_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => toggleSelect(p.key)}
                style={[
                  styles.providerChip,
                  {
                    backgroundColor: selected.has(p.key) ? `${p.color}18` : "rgba(255,255,255,0.05)",
                    borderColor: selected.has(p.key) ? `${p.color}70` : "rgba(255,255,255,0.1)",
                  },
                  selected.has(p.key) && Platform.OS === "web" ? { boxShadow: `0 0 10px ${p.colorGlow}` } as object : {},
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: selected.has(p.key) ? p.color : "rgba(255,255,255,0.35)" }]} />
                <Text style={[styles.chipLabel, { color: selected.has(p.key) ? p.color : "rgba(255,255,255,0.45)" }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {attachment && (
            <View style={styles.attachmentRow}>
              <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} />
              <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeBtn} activeOpacity={0.8}>
                <Feather name="x" size={12} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.attachmentLabel}>
                → {selectedProviders.map((p) => p.name).join(", ")}
              </Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7} disabled={anyStreaming}>
              <Feather name="paperclip" size={18} color={attachment ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={selectedProviders.length === AI_PROVIDERS.length ? "Ask All AI Models…" : selectedProviders.length === 0 ? "Select a model…" : `Ask ${selectedProviders.map(p => p.name).join(", ")}…`}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            {anyStreaming ? (
              <TouchableOpacity onPress={handleStop} style={[styles.sendBtn, { backgroundColor: "#ff4466" }]} activeOpacity={0.7}>
                <Feather name="square" size={14} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                style={[
                  styles.sendBtn,
                  { backgroundColor: canSend ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)" },
                  canSend && Platform.OS === "web" ? { boxShadow: "0 0 14px rgba(255,255,255,0.25)" } as object : {},
                ]}
                activeOpacity={0.7}
              >
                <Feather name="send" size={16} color={canSend ? "#000" : "rgba(255,255,255,0.25)"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, ...(Platform.OS === "web" ? { height: "100dvh" } as object : {}) },
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1, borderColor: "rgba(34,197,94,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  logoZ: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#22c55e" },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5, color: "#f0f0ff" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  newChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  newChatText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },

  grid: { paddingHorizontal: 16, gap: CARD_GAP, paddingBottom: 12 },
  row: { flexDirection: "row", gap: CARD_GAP },

  firstTimeHint: {
    marginBottom: 14,
    paddingHorizontal: 4,
    paddingTop: 6,
    gap: 12,
    alignItems: "center",
  },
  firstTimeTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#e8e8f4",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  firstTimeModels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  firstTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  firstTimeDot: { width: 6, height: 6, borderRadius: 3 },
  firstTimeChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  firstTimeSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },

  card: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTop: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    position: "relative",
  },
  cardProviderName: {
    fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.2, textAlign: "center",
  },
  checkbox: {
    position: "absolute", top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  unreadDot: { position: "absolute", bottom: 6, right: 10, width: 7, height: 7, borderRadius: 4 },

  cardBody: { padding: 10, paddingTop: 6, gap: 4 },
  previewRow: { minHeight: 54 },
  streamingRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  previewText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  synthesizeBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 0, marginTop: 4, marginBottom: 4,
    paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 18, borderWidth: 1, borderColor: `${SYNTHESIS_COLOR}35`,
    overflow: "hidden",
  },
  synthesizeBtnIcon: { fontSize: 20, color: SYNTHESIS_COLOR },
  synthesizeBtnContent: { flex: 1, gap: 2, alignItems: "center" },
  synthesizeBtnTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold",
    color: SYNTHESIS_COLOR, letterSpacing: 0.3, textAlign: "center",
  },
  synthesizeBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,200,0,0.5)", textAlign: "center" },

  synthCard: {
    borderRadius: 22,
    marginTop: 4,
  },
  synthesisTop: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 4,
  },
  synthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  synthBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  synthBadgeText: {
    fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5, color: "#000",
  },
  synthSubtitleRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  synthSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: `${SYNTHESIS_COLOR}60` },
  synthLoading: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 20 },
  synthLoadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: `${SYNTHESIS_COLOR}80` },
  synthError: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ff4466", padding: 16 },
  synthScroll: { maxHeight: 260 },
  synthText: {
    fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22,
    color: "rgba(255,240,200,0.9)",
    padding: 16, paddingTop: 0,
  },
  synthCursor: { fontFamily: "Inter_700Bold" },

  bottomBar: {
    paddingTop: 10, paddingHorizontal: 14, gap: 8,
    overflow: "hidden",
  },
  chipRow: { flexDirection: "row", gap: 6, paddingBottom: 2 },
  providerChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    flexShrink: 0,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  attachmentRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 4,
  },
  attachmentThumb: { width: 32, height: 32, borderRadius: 7 },
  removeBtn: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,68,102,0.8)",
    alignItems: "center", justifyContent: "center",
  },
  attachmentLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", flex: 1 },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    borderRadius: 16,
    paddingLeft: 12, paddingRight: 6, paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  attachBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
    color: "#f0f0ff", maxHeight: 100, lineHeight: 21, paddingVertical: 3,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
});
