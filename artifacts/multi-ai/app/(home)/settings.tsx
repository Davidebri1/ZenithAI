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
import { getPrivateMode, setPrivateMode } from "@/constants/sessions";
import { SettingsSheet } from "@/components/SettingsSheet";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import { BgImage } from "@/components/BgImage";


export default function SettingsScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  const [providerSettings, setProviderSettings] = useState<Record<string, ProviderSettings>>({});
  const [sheetProvider, setSheetProvider] = useState<string | null>(null);
  const [sheetSettings, setSheetSettings] = useState<ProviderSettings | null>(null);
  const [privateMode, setPrivateModeState] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        Promise.all(AI_PROVIDERS.map((p) => getGlobalSettings(p.key))),
        getPrivateMode(),
      ]).then(([results, pm]) => {
        const map: Record<string, ProviderSettings> = {};
        AI_PROVIDERS.forEach((p, i) => { map[p.key] = results[i]; });
        setProviderSettings(map);
        setPrivateModeState(pm);
      });
    }, [])
  );

  const handleTogglePrivate = async () => {
    const next = !privateMode;
    setPrivateModeState(next);
    await setPrivateMode(next);
  };

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
    <BgImage style={styles.bg}>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Global defaults per model</Text>
      </View>

      {/* Private Mode toggle */}
      <TouchableOpacity style={styles.privateRow} onPress={handleTogglePrivate} activeOpacity={0.75}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.privateRowBg, privateMode && styles.privateRowBgActive]} />
        <View style={styles.privateLeft}>
          <Feather name="eye-off" size={16} color={privateMode ? "#a78bfa" : "rgba(255,255,255,0.45)"} />
          <View>
            <Text style={[styles.privateLabel, privateMode && styles.privateLabelActive]}>Private Mode</Text>
            <Text style={styles.privateSub}>New sessions won't appear in History</Text>
          </View>
        </View>
        <View style={[styles.toggle, privateMode && styles.toggleActive]}>
          <View style={[styles.toggleThumb, privateMode && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

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
    </BgImage>
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

  privateRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginTop: 14, marginBottom: 2,
    borderRadius: 16, overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14, paddingHorizontal: 16,
  },
  privateRowBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  privateRowBgActive: { backgroundColor: "rgba(167,139,250,0.07)" },
  privateLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  privateLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },
  privateLabelActive: { color: "#a78bfa" },
  privateSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", marginTop: 2 },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: "#a78bfa" },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignSelf: "flex-start",
  },
  toggleThumbActive: { backgroundColor: "#fff", alignSelf: "flex-end" },

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
