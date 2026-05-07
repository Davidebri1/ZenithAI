import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface Session {
  id: string;
  prompt: string;
  timestamp: number;
  openaiConversationId: number;
  anthropicConversationId: number;
  geminiConversationId: number;
}

const STORAGE_KEY = "@multiai_sessions";

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Session[] = JSON.parse(stored);
        setSessions(parsed.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch {}
  };

  const saveSession = async (session: Session) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: Session[] = stored ? JSON.parse(stored) : [];
      const updated = [session, ...existing].slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSessions(updated);
    } catch {}
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    inputRef.current?.blur();

    try {
      const apiUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/prompt/multi`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const data = await response.json() as {
        openaiConversationId: number;
        anthropicConversationId: number;
        geminiConversationId: number;
      };

      const session: Session = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        prompt: trimmed,
        timestamp: Date.now(),
        openaiConversationId: data.openaiConversationId,
        anthropicConversationId: data.anthropicConversationId,
        geminiConversationId: data.geminiConversationId,
      };

      await saveSession(session);
      setPrompt("");

      router.push({
        pathname: "/result",
        params: {
          prompt: session.prompt,
          openaiId: String(session.openaiConversationId),
          anthropicId: String(session.anthropicConversationId),
          geminiId: String(session.geminiConversationId),
        },
      });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, router]);

  const openSession = (session: Session) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/result",
      params: {
        prompt: session.prompt,
        openaiId: String(session.openaiConversationId),
        anthropicId: String(session.anthropicConversationId),
        geminiId: String(session.geminiConversationId),
        readonly: "true",
      },
    });
  };

  const renderSession = ({ item }: { item: Session }) => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return (
      <Pressable
        onPress={() => openSession(item)}
        style={({ pressed }) => [
          styles.sessionCard,
          { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.sessionDots}>
          <View style={[styles.dot, { backgroundColor: colors.ai.openai }]} />
          <View style={[styles.dot, { backgroundColor: colors.ai.anthropic }]} />
          <View style={[styles.dot, { backgroundColor: colors.ai.gemini }]} />
        </View>
        <View style={styles.sessionContent}>
          <Text style={[styles.sessionPrompt, { color: c.foreground }]} numberOfLines={2}>
            {item.prompt}
          </Text>
          <Text style={[styles.sessionTime, { color: c.mutedForeground }]}>{timeStr}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={c.mutedForeground} />
      </Pressable>
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.logoRow}>
          <View style={styles.aiDots}>
            <View style={[styles.logoDot, { backgroundColor: colors.ai.openai }]} />
            <View style={[styles.logoDot, { backgroundColor: colors.ai.anthropic }]} />
            <View style={[styles.logoDot, { backgroundColor: colors.ai.gemini }]} />
          </View>
          <Text style={[styles.appName, { color: c.foreground }]}>MultiAI</Text>
        </View>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          One prompt. Three answers.
        </Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="layers" size={40} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>Ask anything</Text>
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            Your prompt will be sent to ChatGPT, Claude, and Gemini simultaneously.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!sessions.length}
        />
      )}

      <View
        style={[
          styles.inputContainer,
          { borderTopColor: c.border, paddingBottom: bottomPad + 12, backgroundColor: c.background },
        ]}
      >
        <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Ask all three AI models..."
            placeholderTextColor={c.mutedForeground}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            blurOnSubmit={true}
          />
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!prompt.trim() || loading}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  prompt.trim() && !loading ? colors.ai.openai : c.muted,
              },
            ]}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color={prompt.trim() ? "#fff" : c.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          GPT-5 · Claude Sonnet · Gemini Flash
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  aiDots: { flexDirection: "row", gap: 4 },
  logoDot: { width: 10, height: 10, borderRadius: 5 },
  appName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 15, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 22 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  sessionDots: { flexDirection: "column", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sessionContent: { flex: 1, gap: 4 },
  sessionPrompt: { fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 20 },
  sessionTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, maxHeight: 120, lineHeight: 22, paddingVertical: 4 },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 12, textAlign: "center", fontFamily: "Inter_400Regular" },
});
