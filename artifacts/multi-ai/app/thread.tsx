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
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Markdown from "react-native-markdown-display";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL } from "@/constants/aiConfig";
import { CONV_IDS_KEY, formatMessageTime } from "@/constants/sessions";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  createdAt?: string;
  attachmentUri?: string;
}

interface Attachment {
  base64: string;
  mimeType: string;
  uri: string;
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
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const hasLoaded = useRef(false);
  const activeReader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadHistory();
  }, []);

  useEffect(() => {
    return () => {
      if (activeReader.current) { try { activeReader.current.cancel(); } catch {} activeReader.current = null; }
    };
  }, []);

  const loadHistory = async () => {
    let id = convIdFromParam && !isNaN(convIdFromParam) ? convIdFromParam : null;
    if (!id) {
      try {
        const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
        if (stored) { const ids = JSON.parse(stored) as Record<string, number>; id = ids[provider.key] ?? null; if (id) setConvId(id); }
      } catch {}
    }
    if (!id) { setLoading(false); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${id}/messages`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as Array<{ role: string; content: string; createdAt?: string }>;
      setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content, createdAt: m.createdAt })));
    } catch {}
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  };

  const getOrCreateConvId = async (): Promise<number> => {
    if (convId) return convId;
    try {
      const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
      if (stored) { const ids = JSON.parse(stored) as Record<string, number>; if (ids[provider.key]) { setConvId(ids[provider.key]); return ids[provider.key]; } }
    } catch {}
    const res = await fetch(`${BASE_URL}/api/${provider.key}/conversations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "My Conversations" }) });
    if (!res.ok) throw new Error("Failed to create");
    const data = (await res.json()) as { id: number };
    const newId = data.id;
    const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
    const existing = stored ? (JSON.parse(stored) as Record<string, number>) : {};
    existing[provider.key] = newId;
    await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(existing));
    setConvId(newId);
    return newId;
  };

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
    const text = reply.trim();
    if ((!text && !attachment) || streaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStreaming(true);

    const now = new Date().toISOString();
    const userMsg: Message = { role: "user", content: text, createdAt: now, attachmentUri: attachment?.uri };
    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const pendingAttachment = attachment;
    setAttachment(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const id = await getOrCreateConvId();
      const body: Record<string, string> = { content: text };
      if (pendingAttachment?.base64) { body.imageBase64 = pendingAttachment.base64; body.imageMimeType = pendingAttachment.mimeType; }
      const res = await fetch(`${BASE_URL}/api/${provider.key}/conversations/${id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReply("");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      activeReader.current = reader;
      const decoder = new TextDecoder();
      let buffer = "", finished = false;

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
          if (parsed.content) {
            setMessages((prev) => {
              const u = [...prev]; const last = u[u.length - 1];
              if (last?.role === "assistant") u[u.length - 1] = { ...last, content: last.content + parsed.content };
              return u;
            });
            scrollRef.current?.scrollToEnd({ animated: false });
          }
          if (parsed.done) {
            finished = true;
            setMessages((prev) => { const u = [...prev]; const last = u[u.length - 1]; if (last?.role === "assistant") u[u.length - 1] = { ...last, streaming: false, createdAt: new Date().toISOString() }; return u; });
            setStreaming(false); break;
          }
          if (parsed.error) throw new Error(parsed.error);
        }
        if (finished) break;
      }
      if (!finished) {
        setMessages((prev) => { const u = [...prev]; const last = u[u.length - 1]; if (last?.role === "assistant" && last.streaming) u[u.length - 1] = { ...last, streaming: false, createdAt: new Date().toISOString() }; return u; });
        setStreaming(false);
      }
    } catch {
      setMessages((prev) => prev.slice(0, -2));
      setReply(text);
      if (pendingAttachment) setAttachment(pendingAttachment);
      setStreaming(false);
      Alert.alert("Failed to send", "Your message has been restored.", [{ text: "OK" }]);
    } finally {
      activeReader.current = null;
    }
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeReader.current) { try { activeReader.current.cancel(); } catch {} }
  };

  const handleCopy = async (idx: number, content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowScrollBtn(contentSize.height - contentOffset.y - layoutMeasurement.height > 180);
  }, []);

  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;
  const canSend = (reply.trim().length > 0 || !!attachment) && !streaming;

  const mdStyles = {
    body: { color: c.foreground, fontSize: 15, lineHeight: 23 },
    paragraph: { marginTop: 0, marginBottom: 6 },
    heading1: { fontSize: 20, fontWeight: "700" as const, color: c.foreground, marginVertical: 8 },
    heading2: { fontSize: 18, fontWeight: "600" as const, color: c.foreground, marginVertical: 6 },
    heading3: { fontSize: 16, fontWeight: "600" as const, color: c.foreground, marginVertical: 4 },
    strong: { fontWeight: "700" as const, color: c.foreground },
    em: { fontStyle: "italic" as const },
    code_inline: { backgroundColor: "#0a0a16", color: provider.color, fontSize: 13, borderRadius: 4, paddingHorizontal: 5 },
    fence: { backgroundColor: "#0a0a16", borderRadius: 10, padding: 14, marginVertical: 8, borderWidth: 1, borderColor: `${provider.color}30` },
    code_block: { color: c.foreground, fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    blockquote: { backgroundColor: "#0a0a16", borderLeftWidth: 3, borderLeftColor: provider.color, paddingHorizontal: 14, paddingVertical: 6, marginVertical: 6 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    link: { color: provider.color },
    table: { borderWidth: 1, borderColor: c.border, marginVertical: 8 },
    tr: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
    th: { padding: 8, fontWeight: "600" as const, color: c.foreground },
    td: { padding: 8, color: c.foreground },
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior="padding">
      <LinearGradient
        colors={[`${provider.color}18`, c.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: `${provider.color}25` }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="chevron-down" size={24} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[
            styles.headerBadge,
            { borderColor: `${provider.color}50`, backgroundColor: `${provider.color}12` },
            Platform.OS === "web" ? { boxShadow: `0 0 16px ${provider.colorGlow}` } as object : {},
          ]}>
            <View style={[styles.headerDot, { backgroundColor: provider.color }]} />
            <Text style={[styles.headerName, { color: provider.color }]}>{provider.name}</Text>
          </View>
          <Text style={[styles.headerModel, { color: c.mutedForeground }]}>{provider.model}</Text>
        </View>
        <View style={{ width: 34 }} />
      </LinearGradient>

      <View style={styles.scrollContainer}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={80}
        >
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={provider.color} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[
                styles.emptyRing,
                { borderColor: `${provider.color}40` },
                Platform.OS === "web" ? { boxShadow: `0 0 30px ${provider.colorGlow}` } as object : {},
              ]}>
                <Text style={[styles.emptyInitial, { color: provider.color }]}>{provider.name[0]}</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Chat with {provider.name}</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
                Send a message or attach an image to start.
              </Text>
            </View>
          ) : (
            messages.map((msg, idx) => (
              <View key={idx} style={msg.role === "user" ? styles.msgRowUser : styles.msgRowAi}>
                {msg.role === "user" ? (
                  <View style={styles.userMsgGroup}>
                    {msg.attachmentUri && (
                      <Image source={{ uri: msg.attachmentUri }} style={styles.attachmentThumb} />
                    )}
                    {msg.content.length > 0 && (
                      <LinearGradient
                        colors={[provider.color, provider.colorDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.userBubble}
                      >
                        <Text style={styles.userText} selectable>{msg.content}</Text>
                      </LinearGradient>
                    )}
                    {msg.createdAt && (
                      <Text style={[styles.timestamp, styles.timestampRight, { color: c.mutedForeground }]}>
                        {formatMessageTime(msg.createdAt)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.aiMsgGroup}>
                    <View style={[
                      styles.aiBubble,
                      {
                        backgroundColor: c.card,
                        borderColor: `${provider.color}20`,
                        borderLeftColor: `${provider.color}80`,
                      },
                    ]}>
                      {msg.content.length === 0 && msg.streaming ? (
                        <View style={styles.typingRow}>
                          <ActivityIndicator size="small" color={provider.color} />
                          <Text style={[styles.typingText, { color: c.mutedForeground }]}>
                            {provider.name} is thinking…
                          </Text>
                        </View>
                      ) : (
                        <Markdown style={mdStyles}>{msg.content}</Markdown>
                      )}
                      {msg.streaming && msg.content.length > 0 && (
                        <View style={[styles.cursor, { backgroundColor: provider.color }]} />
                      )}
                      {!msg.streaming && msg.content.length > 0 && (
                        <TouchableOpacity onPress={() => handleCopy(idx, msg.content)} style={styles.copyBtn} activeOpacity={0.7}>
                          <Feather name={copiedIdx === idx ? "check" : "copy"} size={12} color={copiedIdx === idx ? provider.color : c.mutedForeground} />
                          <Text style={[styles.copyLabel, { color: copiedIdx === idx ? provider.color : c.mutedForeground }]}>
                            {copiedIdx === idx ? "Copied" : "Copy"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {msg.createdAt && !msg.streaming && (
                      <Text style={[styles.timestamp, styles.timestampLeft, { color: c.mutedForeground }]}>
                        {formatMessageTime(msg.createdAt)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {showScrollBtn && (
          <TouchableOpacity
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            style={[
              styles.scrollToBottom,
              { backgroundColor: c.card, borderColor: `${provider.color}40` },
              Platform.OS === "web" ? { boxShadow: `0 0 12px ${provider.colorGlow}` } as object : {},
            ]}
            activeOpacity={0.8}
          >
            <Feather name="chevron-down" size={18} color={provider.color} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.replyBar, { borderTopColor: c.border, paddingBottom: bottomPad + 8, backgroundColor: c.background }]}>
        {attachment && (
          <View style={styles.attachmentPreview}>
            <Image source={{ uri: attachment.uri }} style={styles.attachmentPreviewImg} />
            <TouchableOpacity onPress={() => setAttachment(null)} style={[styles.removeAttachment, { backgroundColor: c.card, borderColor: c.border }]} activeOpacity={0.8}>
              <Feather name="x" size={12} color={c.foreground} />
            </TouchableOpacity>
            <Text style={[styles.attachmentLabel, { color: c.mutedForeground }]}>Image attached</Text>
          </View>
        )}
        <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7} disabled={streaming}>
            <Feather name="paperclip" size={18} color={attachment ? provider.color : c.mutedForeground} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: c.foreground }]}
            placeholder={streaming ? "Generating…" : `Reply to ${provider.name}…`}
            placeholderTextColor={c.mutedForeground}
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={4000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!streaming}
          />
          {streaming ? (
            <TouchableOpacity onPress={handleStop} style={[styles.sendBtn, { backgroundColor: "#ff4466" }]} activeOpacity={0.7}>
              <Feather name="square" size={14} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend}
              style={[
                styles.sendBtn,
                { backgroundColor: canSend ? provider.color : c.secondary },
                canSend && Platform.OS === "web" ? { boxShadow: `0 0 14px ${provider.colorGlow}` } as object : {},
              ]}
              activeOpacity={0.7}
            >
              <Feather name="send" size={15} color={canSend ? "#000" : c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  headerDot: { width: 7, height: 7, borderRadius: 4 },
  headerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  headerModel: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },

  scrollContainer: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },

  scrollToBottom: {
    position: "absolute", bottom: 14, right: 16,
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyState: { alignItems: "center", paddingTop: 70, gap: 16 },
  emptyRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  emptyInitial: { fontSize: 28, fontFamily: "Inter_700Bold" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 48, color: "#525278" },

  msgRowUser: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  msgRowAi: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 4 },
  userMsgGroup: { alignItems: "flex-end", gap: 4, maxWidth: "80%" },
  aiMsgGroup: { alignItems: "flex-start", gap: 3, maxWidth: "92%" },

  attachmentThumb: { width: 180, height: 130, borderRadius: 14, marginBottom: 2 },

  userBubble: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: 4 },
  userText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#000", lineHeight: 22 },

  aiBubble: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18, borderBottomLeftRadius: 4,
    borderWidth: 1, borderLeftWidth: 2, gap: 6,
  },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  typingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  cursor: { width: 2, height: 16, borderRadius: 1, opacity: 0.9 },

  timestamp: { fontSize: 11, fontFamily: "Inter_400Regular", opacity: 0.5 },
  timestampLeft: { alignSelf: "flex-start", marginLeft: 2 },
  timestampRight: { alignSelf: "flex-end", marginRight: 2 },

  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  copyLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  replyBar: { paddingTop: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  attachmentPreview: { flexDirection: "row", alignItems: "center", gap: 10 },
  attachmentPreviewImg: { width: 48, height: 48, borderRadius: 10 },
  removeAttachment: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  attachmentLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    borderRadius: 16, borderWidth: 1,
    paddingLeft: 4, paddingRight: 6, paddingVertical: 6, gap: 4,
  },
  attachBtn: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100, lineHeight: 21, paddingVertical: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
