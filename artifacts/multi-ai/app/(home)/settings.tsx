import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { AI_PROVIDERS } from "@/constants/aiConfig";
import {
  ProviderSettings,
  PROVIDER_SETTING_DEFS,
  getGlobalSettings,
  setGlobalSettings,
  settingsSummary,
} from "@/constants/providerSettings";
import { SettingsSheet } from "@/components/SettingsSheet";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";

const BG = require("../../assets/images/bg-alley.png");

export default function SettingsScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  const [providerSettings, setProviderSettings] = useState<Record<string, ProviderSettings>>({});
  const [sheetProvider, setSheetProvider] = useState<string | null>(null);
  const [sheetSettings, setSheetSettings] = useState<ProviderSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all(AI_PROVIDERS.map((p) => getGlobalSettings(p.key))).then((results) => {
        const map: Record<string, ProviderSettings> = {};
        AI_PROVIDERS.forEach((p, i) => { map[p.key] = results[i]; });
        setProviderSettings(map);
      });
    }, [])
  );

  const openSheet = (key: string) => {
    const s = providerSettings[key];
    if (s) { setSheetProvider(key); setSheetSettings(s); }
  };

  const handleApply = async (key: string, s: ProviderSettings) => {
    await setGlobalSettings(key, s);
    setProviderSettings((prev) => ({ ...prev, [key]: s }));
  };

  const activeProvider = AI_PROVIDERS.find((p) => p.key === sheetProvider);

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,13,0.6)", "rgba(7,7,13,0.92)", "rgba(7,7,13,0.98)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <NeonGlowOverlay />

      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.headerBg]} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={22} color="#e8e8f4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Settings</Text>
        <Text style={styles.headerSub}>Global defaults per model</Text>
      </View>

      <FlatList
        data={AI_PROVIDERS}
        keyExtractor={(p) => p.key}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: p }) => {
          const s = providerSettings[p.key];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => openSheet(p.key)}
            >
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.cardBg]} />
              <View style={[styles.cardAccent, { backgroundColor: p.color }]} />

              <View style={styles.cardLeft}>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <View>
                  <Text style={[styles.providerName, { color: p.color }]}>{p.name}</Text>
                  <Text style={styles.providerModel}>{p.model}</Text>
                </View>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.summaryText}>{s ? settingsSummary(s) : "Default"}</Text>
                <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.25)" />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {activeProvider && sheetSettings && (
        <SettingsSheet
          visible={!!sheetProvider}
          providerName={activeProvider.name}
          providerColor={activeProvider.color}
          providerKey={activeProvider.key}
          defs={PROVIDER_SETTING_DEFS[activeProvider.key]}
          initial={sheetSettings}
          onApply={(s) => handleApply(activeProvider.key, s)}
          onClose={() => setSheetProvider(null)}
          isGlobal
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerBg: { backgroundColor: "rgba(7,7,20,0.55)" },
  backBtn: { marginBottom: 8 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#e8e8f4" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },

  list: { padding: 16, gap: 10 },

  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, opacity: 0.7 },

  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  providerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  providerModel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 1 },

  cardRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)" },
});
