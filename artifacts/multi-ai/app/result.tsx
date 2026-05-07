import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Pressable,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface AiState {
  conversationId: string;
  messages: ConvMessage[];
  streaming: boolean;
  error?: string;
}

const AI_CONFIG = [
  { key: "openai" as const, name: "ChatGPT", model: "GPT-5.4", color: colors.ai.openai, light: colors.ai.openaiLight },
  { key: "anthropic" as const, name: "Claude", model: "Sonnet 4.6", color: colors.ai.anthropic, light: colors.ai.anthropicLight },
  { key: "gemini" as const, name: "Gemini", model: "Flash 3", color: colors.ai.gemini, light: colors.ai.geminiLight },
];

function MessageBubble({ msg, aiColor }: { msg: ConvMessage; aiColor: string }) {
  const c = useColors();
  const isUser = msg.role === "user";
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {isUser ? (
        <View style={[styles.userBubble, { backgroundColor: aiColor + "22" }]}>
          <Text style={[styles.userBubbleText, { color: c.foreground }]}>{msg.content}</Text>
        </View>
      ) : (
        <View style={styles.aiBubble}>
          <Text style={[styles.aiText, { color: c.foreground }]} selectable>
            {msg.content}
          </Text>
          {msg.streaming && (
            <View style={[styles.cursor, { backgroundColor: aiColor }]} />
          )}
        </View>
      )}
    </View>
  );
}

function AiCard({ cfg, state, onCopy }: {
  cfg: typeof AI_CONFIG[number];
  state: AiState;
  onCopy: (text: string) => void;
}) {
  const c = useColors();
  const lastAssistant = [...state.messages].reverse().find(m => m.role === "assistant");
  const hasText = !!lastAssistant?.content;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: c.border }]}>
        <View style={[styles.aiIndicator, { backgroundColor: cfg.light }]}>
          <View style={[styles.aiDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.aiName, { color: cfg.color }]}>{cfg.name}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.modelLabel, { color: c.mutedForeground }]}>{cfg.model}</Text>
          {hasText && !state.streaming && (
            <TouchableOpacity
              onPress={() => lastAssistant && onCopy(lastAssistant.content)}
              style={[styles.copyBtn, { backgroundColor: c.secondary, borderColor: c.border }]}
              activeOpacity={0.7}
            >
              <Feather name="copy" size={12} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.cardBody}>
        {state.error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={14} color={c.destructive} />
            <Text style={[styles.errorText, { color: c.destructive }]}>{state.error}</Text>
          </View>
        ) : state.messages.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={cfg.color} />
            <Text style={[styles.loadingText, { color: c.mutedForeground }]}>Thinking...</Text>
          </View>
        ) : (
          state.messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} aiColor={cfg.color} />
          ))
        )}
      </View>
    </View>
  );
}

type ReplyMode = "all" | "custom";

export default function ResultScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    prompt: string;
    openaiId: string;
    anthropicId: string;
    geminiId: string;
    readonly?: string;
  }>();

  const convIds = {
    openai: params.openaiId,
    anthropic: params.anthropicId,
    gemini: params.geminiId,
  };

  const makeInitial = (id: string): AiState => ({ conversationId: id, messages: [], streaming: false });

  const [states, setStates] = useState<Record<string, AiState>>({
    openai: makeInitial(params.openaiId),
    anthropic: makeInitial(params.anthropicId),
    gemini: makeInitial(params.geminiId),
  });

  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState<ReplyMode>("all");
  const [selectedAis, setSelectedAis] = useState<Set<string>>(new Set(["openai", "anthropic", "gemini"]));
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({ openai: "", anthropic: "", gemini: "" });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [anySent, setAnySent] = useState(false);

  const hasStarted = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  const updateState = (key: string, updater: (prev: AiState) => AiState) => {
    setStates(prev => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const streamResponse = useCallback(async (key: string, convId: string, content: string) => {
    updateState(key, prev => ({
      ...prev,
      streaming: true,
      error: undefined,
      messages: [...prev.messages, { role: "user", content }, { role: "assistant", content: "", streaming: true }],
    }));

    try {
      const response = await fetch(`${baseUrl}/api/${key}/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

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
            if (data.error) {
              updateState(key, prev => ({ ...prev, streaming: false, error: data.error }));
              return;
            }
            if (data.content) {
              updateState(key, prev => {
                const msgs = [...prev.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, content: last.content + data.content };
                }
                return { ...prev, messages: msgs };
              });
            }
            if (data.done) {
              updateState(key, prev => {
                const msgs = [...prev.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") msgs[msgs.length - 1] = { ...last, streaming: false };
                return { ...prev, streaming: false, messages: msgs };
              });
              return;
            }
          } catch {}
        }
      }
      updateState(key, prev => {
        const msgs = [...prev.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === "assistant") msgs[msgs.length - 1] = { ...last, streaming: false };
        return { ...prev, streaming: false, messages: msgs };
      });
    } catch (err) {
      updateState(key, prev => {
        const msgs = prev.messages.filter((_, i) => i < prev.messages.length - 2);
        return { ...prev, streaming: false, error: err instanceof Error ? err.message : "Failed", messages: msgs };
      });
    }
  }, [baseUrl]);

  const loadHistory = useCallback(async (key: string, convId: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/conversations/${convId}/messages`);
      const data = await res.json() as Array<{ role: string; content: string }>;
      updateState(key, prev => ({
        ...prev,
        messages: data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      }));
    } catch {}
  }, [baseUrl]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (params.readonly === "true") {
      loadHistory("openai", params.openaiId);
      loadHistory("anthropic", params.anthropicId);
      loadHistory("gemini", params.geminiId);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      streamResponse("openai", params.openaiId, params.prompt);
      streamResponse("anthropic", params.anthropicId, params.prompt);
      streamResponse("gemini", params.geminiId, params.prompt);
      setAnySent(true);
    }
  }, []);

  const anyStreaming = Object.values(states).some(s => s.streaming);

  const toggleAi = (key: string) => {
    Haptics.selectionAsync();
    setSelectedAis(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (replyMode === "all") {
      setCustomTexts({ openai: replyText, anthropic: replyText, gemini: replyText });
      setReplyMode("custom");
    } else {
      setReplyMode("all");
    }
  };

  const handleSend = () => {
    if (anyStreaming) return;

    if (replyMode === "all") {
      const text = replyText.trim();
      if (!text) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      selectedAis.forEach(key => streamResponse(key, convIds[key as keyof typeof convIds], text));
      setReplyText("");
    } else {
      const hasAny = AI_CONFIG.some(a => selectedAis.has(a.key) && customTexts[a.key].trim());
      if (!hasAny) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      AI_CONFIG.forEach(a => {
        if (selectedAis.has(a.key) && customTexts[a.key].trim()) {
          streamResponse(a.key, convIds[a.key], customTexts[a.key].trim());
        }
      });
      setCustomTexts({ openai: "", anthropic: "", gemini: "" });
      setReplyMode("all");
      setReplyText("");
    }
    setAnySent(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const handleCopy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const allDone = anySent && !anyStreaming;
  const canSend = replyMode === "all" ? !!replyText.trim() : AI_CONFIG.some(a => selectedAis.has(a.key) && customTexts[a.key].trim());

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior="padding">
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.promptPreview, { color: c.foreground }]} numberOfLines={2}>
            {params.prompt}
          </Text>
        </View>
        {allDone && <Feather name="check-circle" size={18} color={colors.ai.openai} />}
        {anyStreaming && <ActivityIndicator size="small" color={c.mutedForeground} />}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {AI_CONFIG.map(cfg => (
          <AiCard
            key={cfg.key}
            cfg={cfg}
            state={states[cfg.key]}
            onCopy={text => handleCopy(cfg.key, text)}
          />
        ))}
      </ScrollView>

      <View style={[styles.replyContainer, { borderTopColor: c.border, backgroundColor: c.background, paddingBottom: bottomPad + 8 }]}>
        {replyMode === "all" ? (
          <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
            <TextInput
              style={[styles.input, { color: c.foreground }]}
              placeholder={selectedAis.size === 3 ? "Reply to all 3 AIs..." : `Reply to ${AI_CONFIG.filter(a => selectedAis.has(a.key)).map(a => a.name).join(" & ")}...`}
              placeholderTextColor={c.mutedForeground}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend || anyStreaming}
              style={[styles.sendBtn, { backgroundColor: canSend && !anyStreaming ? colors.ai.openai : c.muted }]}
              activeOpacity={0.7}
            >
              <Feather name="send" size={16} color={canSend && !anyStreaming ? "#fff" : c.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.customInputs}>
            {AI_CONFIG.map(cfg => (
              <View key={cfg.key} style={[styles.customRow, { backgroundColor: c.card, borderColor: selectedAis.has(cfg.key) ? cfg.color : c.border }]}>
                <TouchableOpacity onPress={() => toggleAi(cfg.key)} style={styles.customToggle}>
                  <View style={[styles.customDot, { backgroundColor: selectedAis.has(cfg.key) ? cfg.color : c.mutedForeground }]} />
                  <Text style={[styles.customLabel, { color: selectedAis.has(cfg.key) ? cfg.color : c.mutedForeground }]}>{cfg.name}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.customInput, { color: selectedAis.has(cfg.key) ? c.foreground : c.mutedForeground }]}
                  placeholder={`Message to ${cfg.name}...`}
                  placeholderTextColor={c.mutedForeground}
                  value={customTexts[cfg.key]}
                  onChangeText={t => setCustomTexts(prev => ({ ...prev, [cfg.key]: t }))}
                  editable={selectedAis.has(cfg.key)}
                  multiline
                  maxLength={2000}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend || anyStreaming}
              style={[styles.sendAllBtn, { backgroundColor: canSend && !anyStreaming ? colors.ai.openai : c.muted }]}
              activeOpacity={0.7}
            >
              <Feather name="send" size={15} color={canSend && !anyStreaming ? "#fff" : c.mutedForeground} />
              <Text style={[styles.sendAllText, { color: canSend && !anyStreaming ? "#fff" : c.mutedForeground }]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.replyToolbar}>
          <View style={styles.aiChips}>
            {AI_CONFIG.map(cfg => (
              <Pressable
                key={cfg.key}
                onPress={() => toggleAi(cfg.key)}
                style={[
                  styles.aiChip,
                  {
                    backgroundColor: selectedAis.has(cfg.key) ? cfg.color + "22" : c.secondary,
                    borderColor: selectedAis.has(cfg.key) ? cfg.color : c.border,
                  },
                ]}
              >
                <View style={[styles.chipDot, { backgroundColor: selectedAis.has(cfg.key) ? cfg.color : c.mutedForeground }]} />
                <Text style={[styles.chipText, { color: selectedAis.has(cfg.key) ? cfg.color : c.mutedForeground }]}>
                  {cfg.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <TouchableOpacity onPress={toggleMode} style={styles.customizeBtn} activeOpacity={0.7}>
            <Text style={[styles.customizeBtnText, { color: replyMode === "custom" ? colors.ai.openai : c.mutedForeground }]}>
              {replyMode === "custom" ? "Simple" : "Customize"}
            </Text>
            <Feather name={replyMode === "custom" ? "chevron-up" : "chevron-down"} size={13} color={replyMode === "custom" ? colors.ai.openai : c.mutedForeground} />
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  headerContent: { flex: 1 },
  promptPreview: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 4, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aiIndicator: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  aiDot: { width: 7, height: 7, borderRadius: 4 },
  aiName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  modelLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  copyBtn: { padding: 6, borderRadius: 7, borderWidth: 1 },
  cardBody: { padding: 12, minHeight: 70, gap: 8 },
  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  userBubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  userBubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  aiBubble: { flex: 1 },
  aiText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  cursor: { width: 2, height: 14, borderRadius: 1, marginTop: 4, opacity: 0.8 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  replyContainer: { paddingTop: 10, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 13,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100, lineHeight: 21, paddingVertical: 3 },
  sendBtn: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },

  customInputs: { gap: 8 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 8,
  },
  customToggle: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, minWidth: 66 },
  customDot: { width: 7, height: 7, borderRadius: 4 },
  customLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  customInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 80, lineHeight: 20 },
  sendAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    paddingVertical: 11,
  },
  sendAllText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  replyToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  aiChips: { flexDirection: "row", gap: 6 },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  customizeBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  customizeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
