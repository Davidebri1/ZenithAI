import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL } from "@/constants/aiConfig";

const CONV_IDS_KEY = "@multiai_conv_ids_v2";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function ThreadScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ key: string; convId: string }>();

  const provider = AI_PROVIDERS.find((p) => p.key === params.key) ?? AI_PROVIDERS[0];
  const convIdFromParam = params.convId ? parseInt(params.convId, 10) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [reply, setReply] = useState("");
  const [convId, setConvId] = useState<number | null>(
    convIdFromParam && !isNaN(convIdFromParam) ? convIdFromParam : null
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const hasLoaded = useRef(false);
  const activeReader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadHistory();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (activeReader.current) {
        try { activeReader.current.cancel(); } catch {}
        activeReader.current = null;
      }
    };
  }, []);

  const loadHistory = async () => {
    let id = convIdFromParam && !isNaN(convIdFromParam) ? convIdFromParam : null;

    // If no valid convId was passed, check AsyncStorage
    if (!id) {
      try {
        const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
        if (stored) {
          const ids = JSON.parse(stored) as Record<string, number>;
          id = ids[provider.key] ?? null;
          if (id) setConvId(id);
        }
      } catch {}
    }

    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${id}/messages`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as Array<{ role: string; content: string }>;
      setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    } catch {}

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  };

  // Get or create conversation, always checking AsyncStorage first
  const getOrCreateConvId = async (): Promise<number> => {
    if (convId) return convId;

    // Check AsyncStorage before creating a new conversation
    try {
      const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as Record<string, number>;
        if (ids[provider.key]) {
          setConvId(ids[provider.key]);
          return ids[provider.key];
        }
      }
    } catch {}

    // Create new conversation
    const res = await fetch(`${BASE_URL}/api/${provider.key}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Conversations" }),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    const data = (await res.json()) as { id: number };
    const newId = data.id;

    // Merge into AsyncStorage
    const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
    const existing = stored ? (JSON.parse(stored) as Record<string, number>) : {};
    existing[provider.key] = newId;
    await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(existing));

    setConvId(newId);
    return newId;
  };

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || streaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStreaming(true);

    // Add messages optimistically — DON'T clear input yet
    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const id = await getOrCreateConvId();

      const res = await fetch(`${BASE_URL}/api/${provider.key}/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Server accepted — safe to clear input now
      setReply("");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      activeReader.current = reader;

      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          // Parse JSON separately so a bad line doesn't swallow real errors
          let parsed: { content?: string; done?: boolean; error?: string };
          try {
            parsed = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (parsed.content) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
              }
              return updated;
            });
            scrollRef.current?.scrollToEnd({ animated: false });
          }

          if (parsed.done) {
            finished = true;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, streaming: false };
              }
              return updated;
            });
            setStreaming(false);
            break;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }
        }
        if (finished) break;
      }

      // Stream ended without explicit done — clear the streaming flag anyway
      if (!finished) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            updated[updated.length - 1] = { ...last, streaming: false };
          }
          return updated;
        });
        setStreaming(false);
      }
    } catch {
      // Remove the optimistic messages
      setMessages((prev) => prev.slice(0, -2));
      // Restore text — nothing lost
      setReply(text);
      setStreaming(false);
      Alert.alert(
        "Failed to send",
        "Your message has been restored to the input bar. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      activeReader.current = null;
    }
  };

  const handleCopy = async (idx: number, content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior="padding"
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: c.border, backgroundColor: c.card },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="chevron-down" size={24} color={c.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerAi, { backgroundColor: provider.colorLight }]}>
          <View style={[styles.headerDot, { backgroundColor: provider.color }]} />
          <Text style={[styles.headerName, { color: provider.color }]}>{provider.name}</Text>
        </View>
        <Text style={[styles.headerModel, { color: c.mutedForeground }]}>{provider.model}</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={provider.color} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyCircle, { backgroundColor: provider.colorLight }]}>
              <View style={[styles.emptyDot, { backgroundColor: provider.color }]}>
                <Text style={styles.emptyInitial}>{provider.name[0]}</Text>
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>
              Chat with {provider.name}
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
              Send a message below to start a conversation.
            </Text>
          </View>
        ) : (
          messages.map((msg, idx) => (
            <View
              key={idx}
              style={[styles.msgRow, msg.role === "user" ? styles.msgRowUser : styles.msgRowAi]}
            >
              {msg.role === "user" ? (
                <View style={[styles.userBubble, { backgroundColor: provider.color }]}>
                  <Text style={styles.userText} selectable>{msg.content}</Text>
                </View>
              ) : (
                <View
                  style={[styles.aiBubble, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  {msg.content.length === 0 && msg.streaming ? (
                    <View style={styles.typingRow}>
                      <ActivityIndicator size="small" color={provider.color} />
                      <Text style={[styles.typingText, { color: c.mutedForeground }]}>
                        {provider.name} is thinking...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.aiText, { color: c.foreground }]} selectable>
                      {msg.content}
                    </Text>
                  )}
                  {msg.streaming && msg.content.length > 0 && (
                    <View style={[styles.cursor, { backgroundColor: provider.color }]} />
                  )}
                  {!msg.streaming && msg.content.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handleCopy(idx, msg.content)}
                      style={styles.copyBtn}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={copiedIdx === idx ? "check" : "copy"}
                        size={13}
                        color={copiedIdx === idx ? provider.color : c.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.copyLabel,
                          { color: copiedIdx === idx ? provider.color : c.mutedForeground },
                        ]}
                      >
                        {copiedIdx === idx ? "Copied" : "Copy"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply bar */}
      <View
        style={[
          styles.replyBar,
          {
            borderTopColor: c.border,
            paddingBottom: bottomPad + 8,
            backgroundColor: c.background,
          },
        ]}
      >
        <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.foreground }]}
            placeholder={`Reply to ${provider.name}...`}
            placeholderTextColor={c.mutedForeground}
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!streaming}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!reply.trim() || streaming}
            style={[
              styles.sendBtn,
              { backgroundColor: reply.trim() && !streaming ? provider.color : c.muted },
            ]}
            activeOpacity={0.7}
          >
            {streaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather
                name="send"
                size={16}
                color={reply.trim() ? "#fff" : c.mutedForeground}
              />
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerAi: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  headerModel: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },

  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyDot: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  emptyInitial: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAi: { justifyContent: "flex-start" },

  userBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 22 },

  aiBubble: {
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  aiText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  cursor: { width: 2, height: 16, borderRadius: 1, opacity: 0.8 },

  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  copyLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  replyBar: { paddingTop: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
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
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    maxHeight: 110,
    lineHeight: 22,
    paddingVertical: 3,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
