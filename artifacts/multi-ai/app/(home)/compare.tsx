import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "@/constants/apiAuth";

import { AI_PROVIDERS, BASE_URL } from "@/constants/aiConfig";
import { CONV_IDS_KEY } from "@/constants/sessions";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";

const BG = require("../../assets/images/bg-alley.png");

const { width: SW } = Dimensions.get("window");
const PANEL_GAP = 8;
const PANEL_W = (SW - 32 - PANEL_GAP) / 2;

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProviderState {
  convId: number | null;
  messages: ConvMessage[];
  loading: boolean;
}

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // All 8 providers always shown — selected defaults to first 2
  const [selectedKeys, setSelectedKeys] = useState<string[]>([
    AI_PROVIDERS[0].key,
    AI_PROVIDERS[1].key,
  ]);
  const [providerState, setProviderState] = useState<Record<string, ProviderState>>(() =>
    Object.fromEntries(AI_PROVIDERS.map((p) => [p.key, { convId: null, messages: [], loading: false }]))
  );

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
      const convIds: Record<string, number> = stored ? JSON.parse(stored) : {};

      // Mark providers that have conversations as loading
      const withConv = AI_PROVIDERS.filter((p) => convIds[p.key]);
      setProviderState((prev) => {
        const next = { ...prev };
        withConv.forEach((p) => {
          next[p.key] = { ...next[p.key], convId: convIds[p.key], loading: true };
        });
        return next;
      });

      // Fetch messages for all providers that have a conversation
      await Promise.all(
        withConv.map(async (p) => {
          try {
            const res = await authFetch(`${BASE_URL}/api/conversations/${convIds[p.key]}/messages`);
            if (!res.ok) throw new Error("Failed");
            const msgs = (await res.json()) as ConvMessage[];
            setProviderState((prev) => ({
              ...prev,
              [p.key]: { convId: convIds[p.key], messages: msgs, loading: false },
            }));
          } catch {
            setProviderState((prev) => ({
              ...prev,
              [p.key]: { ...prev[p.key], loading: false },
            }));
          }
        })
      );
    } catch {}
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 2) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= 4) return [...prev.slice(1), key];
      return [...prev, key];
    });
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const displayProviders = AI_PROVIDERS.filter((p) => selectedKeys.includes(p.key));
  const rows: (typeof AI_PROVIDERS)[number][][] = [];
  for (let i = 0; i < displayProviders.length; i += 2) {
    rows.push(displayProviders.slice(i, i + 2));
  }

  function getLastExchange(messages: ConvMessage[]) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastAI = [...messages].reverse().find((m) => m.role === "assistant");
    return { lastUser, lastAI };
  }

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,13,0.6)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <NeonGlowOverlay />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 10 }]}>
          <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, styles.headerBlur]} />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.headerOverlay]}
          />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#e8e8f4" />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Compare</Text>
          <Text style={styles.subtitle}>{selectedKeys.length} shown · tap to swap</Text>
        </View>

        {/* Provider selector — all 8 always visible */}
        <View style={styles.selectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {AI_PROVIDERS.map((p) => {
              const sel = selectedKeys.includes(p.key);
              const hasMsgs = (providerState[p.key]?.messages.length ?? 0) > 0;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => toggleKey(p.key)}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: sel ? `${p.color}18` : "rgba(255,255,255,0.04)",
                      borderColor: sel ? `${p.color}70` : "rgba(255,255,255,0.1)",
                      opacity: hasMsgs || sel ? 1 : 0.55,
                    },
                    sel && Platform.OS === "web" ? ({ boxShadow: `0 0 10px ${p.colorGlow}` } as object) : {},
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipDot, { backgroundColor: sel ? p.color : hasMsgs ? `${p.color}80` : "rgba(255,255,255,0.25)" }]} />
                  <Text style={[styles.chipLabel, { color: sel ? p.color : hasMsgs ? `${p.color}80` : "rgba(255,255,255,0.35)" }]}>
                    {p.name}
                  </Text>
                  {!hasMsgs && !providerState[p.key]?.loading && (
                    <View style={[styles.emptyDot, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.selectorHint}>Select 2–4 to compare · dim = no conversation yet</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((p) => {
                const state = providerState[p.key];
                const { lastUser, lastAI } = state ? getLastExchange(state.messages) : { lastUser: undefined, lastAI: undefined };
                const hasConv = state?.convId !== null;

                return (
                  <View key={p.key} style={[styles.panel, { width: PANEL_W, overflow: "hidden" }]}>
                    <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: "rgba(7,7,20,0.58)", borderRadius: 18, borderWidth: 1, borderColor: `${p.color}30` },
                      ]}
                    />
                    <LinearGradient
                      colors={[`${p.color}22`, `${p.color}00`]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.panelHeader}
                      pointerEvents="none"
                    >
                      <View style={[styles.panelBadge, { borderColor: `${p.color}50` }]}>
                        <View style={[styles.panelDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.panelName, { color: p.color }]}>{p.name}</Text>
                      </View>
                      <Text style={styles.panelModel}>{p.model}</Text>
                    </LinearGradient>

                    <View style={styles.panelBody}>
                      {state?.loading ? (
                        <ActivityIndicator size="small" color={p.color} />
                      ) : !hasConv ? (
                        <View style={styles.noConvRow}>
                          <Feather name="slash" size={13} color="rgba(255,255,255,0.2)" />
                          <Text style={styles.noConvText}>No conversation yet</Text>
                        </View>
                      ) : !lastAI ? (
                        <Text style={styles.noReply}>No response yet</Text>
                      ) : (
                        <>
                          {lastUser && (
                            <View style={styles.userMsgRow}>
                              <Text style={styles.userMsgLabel}>You asked</Text>
                              <Text style={styles.userMsg} numberOfLines={2}>{lastUser.content}</Text>
                            </View>
                          )}
                          <View style={[styles.aiMsgRow, { borderLeftColor: `${p.color}80` }]}>
                            <Text style={styles.aiMsg} numberOfLines={12}>{lastAI.content}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
              {row.length === 1 && <View style={{ width: PANEL_W }} />}
            </View>
          ))}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
    overflow: "hidden",
  },
  headerBlur: { borderRadius: 0 },
  headerOverlay: {
    backgroundColor: "rgba(7,7,20,0.55)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", zIndex: 1 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: "#e8e8f4", letterSpacing: -0.3, zIndex: 1 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", zIndex: 1 },

  selectorBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 5 },
  selectorRow: { flexDirection: "row", gap: 7 },
  selectorChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyDot: { width: 4, height: 4, borderRadius: 2, marginLeft: 2 },
  selectorHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.2)" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: PANEL_GAP },
  gridRow: { flexDirection: "row", gap: PANEL_GAP },

  panel: {
    borderRadius: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  panelHeader: {
    paddingHorizontal: 12, paddingVertical: 10, gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  panelBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  panelDot: { width: 5, height: 5, borderRadius: 3 },
  panelName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  panelModel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", letterSpacing: 0.3 },

  panelBody: { padding: 10, gap: 8, minHeight: 120, justifyContent: "center" },
  noConvRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  noConvText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)", fontStyle: "italic" },
  noReply: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", fontStyle: "italic" },

  userMsgRow: { gap: 3 },
  userMsgLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.3)", letterSpacing: 0.5, textTransform: "uppercase" },
  userMsg: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", lineHeight: 16 },

  aiMsgRow: { borderLeftWidth: 2, paddingLeft: 8 },
  aiMsg: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(240,240,255,0.85)", lineHeight: 18 },
});
