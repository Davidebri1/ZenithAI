import React, { useState, useEffect, useCallback } from "react";
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
import { fetch } from "expo/fetch";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL } from "@/constants/aiConfig";
import { CONV_IDS_KEY } from "@/constants/sessions";

const BG = require("../assets/images/bg-alley.png");
const { width: SW } = Dimensions.get("window");
const PANEL_GAP = 8;
const PANEL_W = (SW - 32 - PANEL_GAP) / 2;

interface LastMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ProviderData {
  convId: number;
  messages: LastMessage[];
  loading: boolean;
}

export default function CompareScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [providerData, setProviderData] = useState<Record<string, ProviderData>>({});
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(CONV_IDS_KEY);
      if (!stored) return;
      const convIds: Record<string, number> = JSON.parse(stored);
      const keys = Object.keys(convIds).filter((k) => AI_PROVIDERS.find((p) => p.key === k));
      setActiveKeys(keys);
      setSelectedKeys(keys.slice(0, 2));

      const initial: Record<string, ProviderData> = {};
      keys.forEach((k) => { initial[k] = { convId: convIds[k], messages: [], loading: true }; });
      setProviderData(initial);

      await Promise.all(keys.map(async (k) => {
        try {
          const res = await fetch(`${BASE_URL}/api/conversations/${convIds[k]}/messages`);
          if (!res.ok) throw new Error("Failed");
          const msgs = (await res.json()) as LastMessage[];
          setProviderData((prev) => ({ ...prev, [k]: { ...prev[k], messages: msgs, loading: false } }));
        } catch {
          setProviderData((prev) => ({ ...prev, [k]: { ...prev[k], loading: false } }));
        }
      }));
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
    rows.push([displayProviders[i], displayProviders[i + 1]].filter(Boolean) as (typeof AI_PROVIDERS)[number][]);
  }

  function getLastExchange(messages: LastMessage[]) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastAI = [...messages].reverse().find((m) => m.role === "assistant");
    return { lastUser, lastAI };
  }

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,13,0.6)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad + 10 }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.55)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" }]} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#e8e8f4" />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Compare</Text>
          <Text style={styles.subtitle}>{selectedKeys.length} of {activeKeys.length}</Text>
        </View>

        {activeKeys.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="zap" size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No Active Session</Text>
            <Text style={styles.emptySubtitle}>Send a prompt first, then come back to compare.</Text>
          </View>
        ) : (
          <>
            <View style={styles.selectorBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
                {AI_PROVIDERS.filter((p) => activeKeys.includes(p.key)).map((p) => {
                  const sel = selectedKeys.includes(p.key);
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => toggleKey(p.key)}
                      style={[
                        styles.selectorChip,
                        {
                          backgroundColor: sel ? `${p.color}18` : "rgba(255,255,255,0.04)",
                          borderColor: sel ? `${p.color}70` : "rgba(255,255,255,0.1)",
                        },
                        sel && Platform.OS === "web" ? { boxShadow: `0 0 10px ${p.colorGlow}` } as object : {},
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.chipDot, { backgroundColor: sel ? p.color : "rgba(255,255,255,0.3)" }]} />
                      <Text style={[styles.chipLabel, { color: sel ? p.color : "rgba(255,255,255,0.4)" }]}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.selectorHint}>Select 2–4</Text>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
              showsVerticalScrollIndicator={false}
            >
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((p) => {
                    const data = providerData[p.key];
                    const { lastUser, lastAI } = data ? getLastExchange(data.messages) : { lastUser: undefined, lastAI: undefined };
                    return (
                      <View key={p.key} style={[styles.panel, { width: PANEL_W, overflow: "hidden" }]}>
                        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.58)", borderRadius: 18, borderWidth: 1, borderColor: `${p.color}30` }]} />

                        <LinearGradient
                          colors={[`${p.color}22`, `${p.color}00`]}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={styles.panelHeader}
                        >
                          <View style={[styles.panelBadge, { borderColor: `${p.color}50` }]}>
                            <View style={[styles.panelDot, { backgroundColor: p.color }]} />
                            <Text style={[styles.panelName, { color: p.color }]}>{p.name}</Text>
                          </View>
                          <Text style={styles.panelModel}>{p.model}</Text>
                        </LinearGradient>

                        <View style={styles.panelBody}>
                          {data?.loading ? (
                            <ActivityIndicator size="small" color={p.color} />
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
          </>
        )}
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
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", zIndex: 1 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: "#e8e8f4", letterSpacing: -0.3, zIndex: 1 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", zIndex: 1 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#e8e8f4" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 48, color: "rgba(255,255,255,0.4)" },

  selectorBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  selectorRow: { flexDirection: "row", gap: 8 },
  selectorChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  selectorHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)" },

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

  panelBody: { padding: 10, gap: 8, minHeight: 120 },
  noReply: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", fontStyle: "italic" },

  userMsgRow: { gap: 3 },
  userMsgLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.3)", letterSpacing: 0.5, textTransform: "uppercase" },
  userMsg: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", lineHeight: 16 },

  aiMsgRow: { borderLeftWidth: 2, paddingLeft: 8 },
  aiMsg: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(240,240,255,0.85)", lineHeight: 18 },
});
