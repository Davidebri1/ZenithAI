import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface AiCardProps {
  name: string;
  model: string;
  color: string;
  lightColor: string;
  text: string;
  loading: boolean;
  done: boolean;
  error?: string;
}

function AiResponseCard({ name, model, color, lightColor, text, loading, done, error }: AiCardProps) {
  const c = useColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canCopy = text.length > 0 && !error;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: c.border }]}>
        <View style={[styles.aiIndicator, { backgroundColor: lightColor }]}>
          <View style={[styles.aiDot, { backgroundColor: color }]} />
          <Text style={[styles.aiName, { color: color, fontFamily: "Inter_600SemiBold" }]}>{name}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={[styles.modelLabel, { color: c.mutedForeground }]}>{model}</Text>
          {canCopy && (
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.copyButton,
                { backgroundColor: copied ? color + "22" : c.secondary, borderColor: copied ? color : c.border },
              ]}
              activeOpacity={0.7}
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={13}
                color={copied ? color : c.mutedForeground}
              />
              <Text style={[styles.copyLabel, { color: copied ? color : c.mutedForeground }]}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.cardBody}>
        {error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={16} color={c.destructive} />
            <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
          </View>
        ) : loading && text.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={color} />
            <Text style={[styles.loadingText, { color: c.mutedForeground }]}>Thinking...</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.responseText, { color: c.foreground }]} selectable>
              {text}
            </Text>
            {loading && (
              <View style={styles.streamingIndicator}>
                <View style={[styles.cursor, { backgroundColor: color }]} />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

interface StreamState {
  text: string;
  loading: boolean;
  done: boolean;
  error?: string;
}

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

  const [openai, setOpenai] = useState<StreamState>({ text: "", loading: false, done: false });
  const [anthropic, setAnthropic] = useState<StreamState>({ text: "", loading: false, done: false });
  const [gemini, setGemini] = useState<StreamState>({ text: "", loading: false, done: false });

  const hasStarted = useRef(false);

  const streamResponse = useCallback(
    async (
      conversationId: string,
      provider: "openai" | "anthropic" | "gemini",
      setter: React.Dispatch<React.SetStateAction<StreamState>>
    ) => {
      const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const url = `${baseUrl}/api/${provider}/conversations/${conversationId}/messages`;

      setter({ text: "", loading: true, done: false });

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: params.prompt }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No stream reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
                if (data.error) {
                  setter((prev) => ({ ...prev, loading: false, error: data.error }));
                  return;
                }
                if (data.content) {
                  setter((prev) => ({ ...prev, text: prev.text + data.content }));
                }
                if (data.done) {
                  setter((prev) => ({ ...prev, loading: false, done: true }));
                  return;
                }
              } catch {}
            }
          }
        }

        setter((prev) => ({ ...prev, loading: false, done: true }));
      } catch (err) {
        setter({
          text: "",
          loading: false,
          done: false,
          error: err instanceof Error ? err.message : "Failed to connect",
        });
      }
    },
    [params.prompt]
  );

  useEffect(() => {
    if (hasStarted.current || params.readonly === "true") return;
    hasStarted.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    streamResponse(params.openaiId, "openai", setOpenai);
    streamResponse(params.anthropicId, "anthropic", setAnthropic);
    streamResponse(params.geminiId, "gemini", setGemini);
  }, []);

  const allDone = (openai.done || !!openai.error) && (anthropic.done || !!anthropic.error) && (gemini.done || !!gemini.error);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.promptPreview, { color: c.foreground }]} numberOfLines={2}>
            {params.prompt}
          </Text>
        </View>
        {allDone && (
          <Feather name="check-circle" size={20} color={colors.ai.openai} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <AiResponseCard
          name="ChatGPT"
          model="GPT-5.4"
          color={colors.ai.openai}
          lightColor={colors.ai.openaiLight}
          text={openai.text}
          loading={openai.loading}
          done={openai.done}
          error={openai.error}
        />
        <AiResponseCard
          name="Claude"
          model="Sonnet 4.6"
          color={colors.ai.anthropic}
          lightColor={colors.ai.anthropicLight}
          text={anthropic.text}
          loading={anthropic.loading}
          done={anthropic.done}
          error={anthropic.error}
        />
        <AiResponseCard
          name="Gemini"
          model="Flash 3"
          color={colors.ai.gemini}
          lightColor={colors.ai.geminiLight}
          text={gemini.text}
          loading={gemini.loading}
          done={gemini.done}
          error={gemini.error}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  headerContent: { flex: 1 },
  promptPreview: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  aiName: { fontSize: 13 },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modelLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cardBody: { padding: 14, minHeight: 80 },
  responseText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  streamingIndicator: { marginTop: 8 },
  cursor: { width: 2, height: 16, borderRadius: 1, opacity: 0.8 },
});
