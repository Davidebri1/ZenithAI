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
  Animated,
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
import Markdown from "react-native-markdown-display";
import { authFetch } from "@/constants/apiAuth";

import { useColors } from "@/hooks/useColors";
import { useQuota } from "@/hooks/useQuota";
import { QuotaBar } from "@/components/QuotaBar";
import { NeonSignsOverlay } from "@/components/NeonSignsOverlay";
import { AI_PROVIDERS, BASE_URL, SYNTHESIS_COLOR, SYNTHESIS_COLOR_GLOW, type AiProvider } from "@/constants/aiConfig";
import { PROVIDER_MODES, getAllProviderModes } from "@/constants/providerModes";
import { saveSession, CONV_IDS_KEY, getPrivateMode } from "@/constants/sessions";
import { BgImage } from "@/components/BgImage";

const CARD_GAP = 10;

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

const SYNTH_MD: Record<string, object> = {
  body: { color: "rgba(255,240,200,0.9)", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, backgroundColor: "transparent" },
  paragraph: { marginTop: 0, marginBottom: 6 },
  strong: { fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.95)" },
  em: { fontStyle: "italic", color: "rgba(255,240,200,0.8)" },
  heading1: { fontFamily: "Inter_700Bold", fontSize: 18, color: "rgba(255,255,255,0.95)", marginBottom: 6, marginTop: 8 },
  heading2: { fontFamily: "Inter_700Bold", fontSize: 15, color: "rgba(255,255,255,0.95)", marginBottom: 4, marginTop: 6 },
  heading3: { fontFamily: "Inter_700Bold", fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 3, marginTop: 4 },
  code_inline: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, backgroundColor: "rgba(0,0,0,0.45)", color: SYNTHESIS_COLOR, borderRadius: 4 },
  fence: { backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, borderWidth: 1, borderColor: `${SYNTHESIS_COLOR}35`, padding: 10, marginVertical: 8 },
  code_block: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, color: "rgba(255,255,255,0.85)" },
  blockquote: { backgroundColor: "rgba(255,183,0,0.06)", borderLeftColor: `${SYNTHESIS_COLOR}50`, borderLeftWidth: 3, paddingLeft: 10, marginLeft: 0 },
  hr: { backgroundColor: "rgba(255,255,255,0.12)", height: 1, marginVertical: 10 },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: { marginBottom: 2 },
};

interface AiCardProps {
  provider: AiProvider;
  state: CardState;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  cardWidth: number;
  activeMode?: string;
}

function AiCard({ provider, state, selected, onToggleSelect, onOpen, cardWidth, activeMode }: AiCardProps) {
  const previewText = state.streaming
    ? state.streamingText || "Thinking…"
    : state.lastMessage || provider.tagline;

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
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onToggleSelect(); }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={[
            styles.checkbox,
            selected
              ? { backgroundColor: provider.color, borderColor: provider.color }
              : { backgroundColor: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.28)" },
          ]}
          activeOpacity={0.7}
        >
          {selected && <Feather name="check" size={12} color="#000" />}
        </TouchableOpacity>
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
                    : `${provider.color}50`,
                },
              ]}
              numberOfLines={3}
            >
              {previewText}
            </Text>
          )}
        </View>
        {activeMode && activeMode !== "standard" && (() => {
          const modeInfo = PROVIDER_MODES[provider.key]?.find((m) => m.key === activeMode);
          return modeInfo ? (
            <View style={styles.modeBadge}>
              <Text style={[styles.modeBadgeText, { color: provider.color }]}>
                {modeInfo.emoji}  {modeInfo.label}
              </Text>
            </View>
          ) : null;
        })()}
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
          {stale ? "Previous round — new responses loading…" : "Consensus across active models"}
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
        <ScrollView style={styles.synthScroll} contentContainerStyle={{ padding: 16, paddingTop: 0 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <Markdown style={SYNTH_MD}>
            {synthesis.text + (synthesis.status === "loading" ? " ▋" : "")}
          </Markdown>
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
  const [providerModes, setProviderModes] = useState<Record<string, string>>({});
  const [privateMode, setPrivateModeState] = useState(false);

  // Ambient city-glow pulse — slow neon breath cycling through provider colors
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  // Synthesis button breathing — pulses when ready
  const synthBreath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.25, duration: 4800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.7, duration: 3200, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.15, duration: 5000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(synthBreath, { toValue: 1.02, duration: 2200, useNativeDriver: true }),
        Animated.timing(synthBreath, { toValue: 0.98, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const inputRef = useRef<TextInput>(null);
  const activeReaders = useRef<Map<string, ReadableStreamDefaultReader<Uint8Array>>>(new Map());
  const sessionTitleRef = useRef<string>("");
  const lastPromptRef = useRef<string>("");
  const lastAttachmentRef = useRef<Attachment | null>(null);

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
  useFocusEffect(useCallback(() => {
    refreshFromStorage();
    getAllProviderModes().then(setProviderModes);
    getPrivateMode().then(setPrivateModeState);
  }, [refreshFromStorage]));

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
      const synthesisBody: { question: string; responses: typeof responses; imageBase64?: string; imageMimeType?: string } = {
        question: lastPromptRef.current || "the question",
        responses,
      };
      if (lastAttachmentRef.current) {
        synthesisBody.imageBase64 = lastAttachmentRef.current.base64;
        synthesisBody.imageMimeType = lastAttachmentRef.current.mimeType;
      }
      const res = await authFetch(`${BASE_URL}/api/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(synthesisBody),
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
      if (trackRes.status === 401) {
        Alert.alert("Sign in required", "Please sign in to send prompts.", [{ text: "OK" }]);
        return;
      }
      if (!trackRes.ok) {
        Alert.alert("Server error", `Something went wrong (${trackRes.status}). Try again.`, [{ text: "OK" }]);
        return;
      }

      const isFirstMessage = AI_PROVIDERS.every((p) => !convIds[p.key]);
      const ids = await getOrCreateConvIds();
      if (isFirstMessage && !sessionTitleRef.current) sessionTitleRef.current = text || "[Image]";
      const pendingAttachment = attachment;
      lastAttachmentRef.current = pendingAttachment;
      setMessage("");
      setAttachment(null);
      [...selected].forEach((key) => {
        if (ids[key]) streamForProvider(key, ids[key], text, pendingAttachment?.base64, pendingAttachment?.mimeType);
      });
      refreshQuota();
    } catch {
      Alert.alert("Connection failed", "Could not reach the server. Check your internet connection.", [{ text: "OK" }]);
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
      await saveSession(sessionTitleRef.current || "Untitled session", currentIds, privateMode);
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
  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;


  const rows: (AiProvider | null)[][] = [];
  for (let i = 0; i < AI_PROVIDERS.length; i += 2) rows.push([AI_PROVIDERS[i], AI_PROVIDERS[i + 1] ?? null]);

  return (
    <BgImage style={styles.bg}>
      <LinearGradient
        colors={["rgba(7,7,13,0.25)", "rgba(7,7,13,0.55)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        locations={[0, 0.35, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <NeonSignsOverlay />

      {/* Ambient neon city glow — breathes slowly to simulate distant signage */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glowPulse }]}>
        <LinearGradient
          colors={[
            "transparent",
            "transparent",
            "rgba(124,95,255,0.06)",
            "rgba(255,107,71,0.05)",
            "rgba(0,229,176,0.05)",
          ]}
          locations={[0, 0.48, 0.70, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <KeyboardAvoidingView style={styles.container} behavior="padding">

        {/* ── HEADER ── */}
        <View style={[styles.header, { paddingTop: topPad + 14 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoZ}>Z</Text>
            </View>
            <Text style={styles.appName}>Zenith</Text>
            {privateMode && (
              <View style={styles.privatePill}>
                <Feather name="eye-off" size={10} color="#a78bfa" />
                <Text style={styles.privatePillText}>Private</Text>
              </View>
            )}
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
            <TouchableOpacity onPress={() => router.push("/(home)/settings")} style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="sliders" size={17} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatBtn} activeOpacity={0.7}>
              <Feather name="plus" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.newChatText}>New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── INPUT — pinned at top, never covered by keyboard ── */}
        <View style={styles.inputSection}>
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
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.45)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)" }]} />
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7} disabled={anyStreaming}>
              <Feather name="paperclip" size={18} color={attachment ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={
                selectedProviders.length === AI_PROVIDERS.length
                  ? "Ask All AI Models…"
                  : selectedProviders.length === 0
                    ? "Select a model first…"
                    : `Ask ${selectedProviders.map(p => p.name).join(", ")}…`
              }
              placeholderTextColor="rgba(255,255,255,0.3)"
              selectionColor="#22c55e"
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

        {/* ── SYNTHESIS — always visible, grayed when not ready ── */}
        <View style={styles.synthesisSection}>
          {synthesis.expanded && (
            <SynthesisCard
              synthesis={synthesis}
              onClose={() => setSynthesis((s) => ({ ...s, expanded: false }))}
              stale={anyStreaming && synthesis.status === "done"}
            />
          )}
          <Animated.View style={{ transform: [{ scale: synthBreath }] }}>
            <TouchableOpacity
              onPress={
                synthesis.expanded
                  ? () => setSynthesis((s) => ({ ...s, expanded: false }))
                  : synthesis.status === "done" || synthesis.status === "loading"
                    ? () => setSynthesis((s) => ({ ...s, expanded: true }))
                    : handleSynthesize
              }
              style={[
                styles.synthesizeBtn,
                synthesis.expanded && { borderColor: `${SYNTHESIS_COLOR}70` },
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
                    : synthesis.status === "done"
                      ? "Tap to reveal consensus"
                      : synthesis.status === "error"
                        ? "Tap to retry"
                        : "Consensus across active models"}
                </Text>
              </View>
              {synthesis.status === "loading" ? (
                <ActivityIndicator size="small" color={SYNTHESIS_COLOR} />
              ) : (
                <Feather
                  name={synthesis.expanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={`${SYNTHESIS_COLOR}90`}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── CARDS GRID ── */}
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
                    activeMode={providerModes[p.key]}
                  />
                ) : (
                  <View key={`empty-${i}`} style={{ width: cardWidth }} />
                )
              )}
            </View>
          )}
          contentContainerStyle={styles.grid}
          ListFooterComponent={<View style={{ paddingBottom: 4 }} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* ── BOTTOM — quota bar only ── */}
        <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8 }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.6)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)" }]} />
          <QuotaBar quota={quota} />
        </View>

      </KeyboardAvoidingView>
    </BgImage>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, ...(Platform.OS === "web" ? { height: "100dvh" } as object : {}) },
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  privatePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(167,139,250,0.15)",
    borderWidth: 1, borderColor: "rgba(167,139,250,0.3)",
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  privatePillText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
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

  inputSection: {
    paddingHorizontal: 16, paddingBottom: 8, gap: 6,
  },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    borderRadius: 18,
    paddingLeft: 12, paddingRight: 6, paddingVertical: 6,
    overflow: "hidden",
    minHeight: 50,
  },
  attachBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
    color: "#f0f0ff", maxHeight: 100, lineHeight: 21, paddingVertical: 4,
    zIndex: 1,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  attachmentRow: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4,
  },
  attachmentThumb: { width: 32, height: 32, borderRadius: 7 },
  removeBtn: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,68,102,0.8)",
    alignItems: "center", justifyContent: "center",
  },
  attachmentLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", flex: 1 },

  synthesisSection: {
    paddingHorizontal: 16, paddingBottom: 8, gap: 4,
  },
  synthesizeBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 13,
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

  synthCard: { borderRadius: 22, marginBottom: 4 },
  synthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  synthBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  synthBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5, color: "#000" },
  synthSubtitleRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  synthSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: `${SYNTHESIS_COLOR}60` },
  synthLoading: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 20 },
  synthLoadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: `${SYNTHESIS_COLOR}80` },
  synthError: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ff4466", padding: 16 },
  synthScroll: { maxHeight: 260 },

  grid: { paddingHorizontal: 16, gap: CARD_GAP, paddingBottom: 12 },
  row: { flexDirection: "row", gap: CARD_GAP },

  card: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTop: {
    height: 40, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 10, position: "relative",
  },
  cardProviderName: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.2, textAlign: "center" },
  checkbox: {
    position: "absolute", top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  cardBody: { padding: 10, paddingTop: 6, gap: 4 },
  previewRow: { minHeight: 54 },
  modeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.13)", marginTop: 2 },
  modeBadgeText: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  streamingRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  previewText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  bottomBar: {
    paddingTop: 8, paddingHorizontal: 14,
    overflow: "hidden",
  },
});
