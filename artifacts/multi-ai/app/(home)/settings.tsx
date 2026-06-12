import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuth } from "@clerk/expo";

import { AI_PROVIDERS } from "@/constants/aiConfig";
import {
  ProviderSettings,
  PROVIDER_SETTING_DEFS,
  getGlobalSettings,
  setGlobalSettings,
  settingsSummary,
} from "@/constants/providerSettings";
import { getPrivateMode, setPrivateMode } from "@/constants/sessions";
import { getUISettings, setUISettings } from "@/constants/uiSettings";
import { SettingsSheet } from "@/components/SettingsSheet";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import { BgImage } from "@/components/BgImage";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useTheme } from "@/contexts/ThemeContext";


export default function SettingsScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { theme } = useTheme();

  const [providerSettings, setProviderSettings] = useState<Record<string, ProviderSettings>>({});
  const [sheetProvider, setSheetProvider] = useState<string | null>(null);
  const [sheetSettings, setSheetSettings] = useState<ProviderSettings | null>(null);
  const [privateMode, setPrivateModeState] = useState(false);
  const [columnCount, setColumnCountState] = useState<1 | 2 | 3>(2);
  const [themeSelectVisible, setThemeSelectVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        Promise.all(AI_PROVIDERS.map((p) => getGlobalSettings(p.key))),
        getPrivateMode(),
        getUISettings(),
      ]).then(([results, pm, uiS]) => {
        const map: Record<string, ProviderSettings> = {};
        AI_PROVIDERS.forEach((p, i) => { map[p.key] = results[i]; });
        setProviderSettings(map);
        setPrivateModeState(pm);
        setColumnCountState(uiS.columnCount);
      });
    }, [])
  );

  const handleTogglePrivate = async () => {
    const next = !privateMode;
    setPrivateModeState(next);
    await setPrivateMode(next);
  };

  const handleColumnCount = async (n: 1 | 2 | 3) => {
    setColumnCountState(n);
    await setUISettings({ columnCount: n });
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
        <Text style={styles.headerSub}>Preferences & model defaults</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── APPEARANCE ── */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>

        {/* Theme selector row */}
        <TouchableOpacity style={styles.settingRow} onPress={() => setThemeSelectVisible(true)} activeOpacity={0.75}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.rowBg]} />
          <View style={styles.rowLeft}>
            <Feather name="image" size={16} color={theme.accent} />
            <View>
              <Text style={styles.rowLabel}>Theme</Text>
              <Text style={[styles.rowValue, { color: theme.accent }]}>{theme.name}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />
        </TouchableOpacity>

        {/* Column count */}
        <View style={[styles.settingRow, { paddingVertical: 10 }]}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.rowBg]} />
          <View style={styles.rowLeft}>
            <Feather name="grid" size={16} color="rgba(255,255,255,0.6)" />
            <View>
              <Text style={styles.rowLabel}>Card Columns</Text>
              <Text style={styles.rowSub}>How many columns on the home grid</Text>
            </View>
          </View>
          <View style={styles.colSelector}>
            {([1, 2, 3] as const).map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => handleColumnCount(n)}
                style={[styles.colBtn, columnCount === n && styles.colBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.colBtnText, columnCount === n && styles.colBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── PRIVACY ── */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>PRIVACY</Text>

        {/* Private Mode toggle */}
        <TouchableOpacity style={styles.settingRow} onPress={handleTogglePrivate} activeOpacity={0.75}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.rowBg, privateMode && styles.rowBgActive]} />
          <View style={styles.rowLeft}>
            <Feather name="eye-off" size={16} color={privateMode ? "#a78bfa" : "rgba(255,255,255,0.45)"} />
            <View>
              <Text style={[styles.rowLabel, privateMode && styles.rowLabelActive]}>Private Mode</Text>
              <Text style={styles.rowSub}>New sessions won't appear in History</Text>
            </View>
          </View>
          <View style={[styles.toggle, privateMode && styles.toggleActive]}>
            <View style={[styles.toggleThumb, privateMode && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        {/* ── ACCOUNT ── */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ACCOUNT</Text>
        {!isSignedIn ? (
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push("/(auth)/sign-in")} activeOpacity={0.75}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.rowBg]} />
            <View style={styles.rowLeft}>
              <Feather name="log-in" size={16} color="#00e5a0" />
              <View>
                <Text style={[styles.rowLabel, { color: "#00e5a0" }]}>Sign In / Create Account</Text>
                <Text style={styles.rowSub}>Sync history and unlock more prompts</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.settingRow, { alignItems: "center" }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.rowBg]} />
            <View style={styles.rowLeft}>
              <Feather name="user-check" size={16} color="#00e5a0" />
              <View>
                <Text style={[styles.rowLabel, { color: "#00e5a0" }]}>Signed In</Text>
                <Text style={styles.rowSub}>Your history is synced</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── AI MODEL DEFAULTS ── */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>MODEL DEFAULTS</Text>

        {AI_PROVIDERS.map((p) => {
          const s = providerSettings[p.key];
          return (
            <TouchableOpacity
              key={p.key}
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
        })}
      </ScrollView>

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

      {/* Theme Selector */}
      <ThemeSelector visible={themeSelectVisible} onClose={() => setThemeSelectVisible(false)} />
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

  scrollContent: { padding: 16, gap: 8, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.3)", letterSpacing: 1.5,
    textTransform: "uppercase", paddingHorizontal: 4, marginBottom: 4,
  },

  settingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 16, overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
    marginBottom: 2,
  },
  rowBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  rowBgActive: { backgroundColor: "rgba(167,139,250,0.07)" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)" },
  rowLabelActive: { color: "#a78bfa" },
  rowValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", marginTop: 2 },

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

  colSelector: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  colBtn: { width: 32, height: 28, alignItems: "center", justifyContent: "center" },
  colBtnActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  colBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)" },
  colBtnTextActive: { color: "#ffffff" },

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
