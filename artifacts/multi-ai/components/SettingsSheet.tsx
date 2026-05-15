import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ProviderSettings,
  ProviderSettingsDef,
  DEFAULT_SETTINGS,
} from "@/constants/providerSettings";

interface Props {
  visible: boolean;
  providerName: string;
  providerColor: string;
  providerKey: string;
  defs: ProviderSettingsDef;
  initial: ProviderSettings;
  onApply: (s: ProviderSettings) => void;
  onClose: () => void;
  isGlobal?: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.pills}>{children}</View>
    </View>
  );
}

function Pill({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.pill,
        active && { backgroundColor: `${color}22`, borderColor: `${color}80` },
      ]}
    >
      <Text style={[styles.pillText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const TEMP_PRESETS = [
  { label: "Precise", value: 0.1 },
  { label: "Balanced", value: 0.5 },
  { label: "Creative", value: 0.9 },
  { label: "Wild", value: 1.4 },
];
const LENGTH_OPTS = ["concise", "standard", "detailed", "exhaustive"] as const;
const TONE_OPTS   = ["default", "professional", "casual", "creative", "socratic"] as const;
const PENALTY_OPTS = [
  { label: "None", value: 0 },
  { label: "Low",  value: 0.3 },
  { label: "Med",  value: 0.6 },
  { label: "High", value: 1.0 },
];
const TOPK_OPTS = [
  { label: "Conservative", value: 10 },
  { label: "Balanced",     value: 40 },
  { label: "Diverse",      value: 100 },
];
const SAFETY_OPTS = [
  { label: "Relaxed",  value: "block_few" as const },
  { label: "Moderate", value: "block_some" as const },
  { label: "Strict",   value: "block_most" as const },
];

export function SettingsSheet({ visible, providerName, providerColor, defs, initial, onApply, onClose, isGlobal }: Props) {
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<ProviderSettings>({ ...initial });

  const c = providerColor;

  const nearestTemp = TEMP_PRESETS.reduce((prev, cur) =>
    Math.abs(cur.value - s.temperature) < Math.abs(prev.value - s.temperature) ? cur : prev
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.sheetBg]} />

        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <View style={[styles.providerDot, { backgroundColor: c }]} />
          <Text style={[styles.sheetTitle, { color: c }]}>{providerName}</Text>
          <Text style={styles.sheetSubtitle}>{isGlobal ? "Global defaults" : "This conversation"}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Temperature */}
          <Row label="Temperature">
            {TEMP_PRESETS.map((p) => (
              <Pill
                key={p.label}
                label={p.label}
                active={nearestTemp.value === p.value}
                color={c}
                onPress={() => setS({ ...s, temperature: p.value })}
              />
            ))}
          </Row>

          {/* Length */}
          <Row label="Response Length">
            {LENGTH_OPTS.map((l) => (
              <Pill
                key={l}
                label={l.charAt(0).toUpperCase() + l.slice(1)}
                active={s.length === l}
                color={c}
                onPress={() => setS({ ...s, length: l })}
              />
            ))}
          </Row>

          {/* Tone */}
          <Row label="Tone">
            {TONE_OPTS.map((t) => (
              <Pill
                key={t}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
                active={s.tone === t}
                color={c}
                onPress={() => setS({ ...s, tone: t })}
              />
            ))}
          </Row>

          {/* OpenAI: Frequency Penalty */}
          {defs.frequencyPenalty && (
            <Row label="Frequency Penalty">
              {PENALTY_OPTS.map((p) => (
                <Pill
                  key={p.label}
                  label={p.label}
                  active={Math.abs(s.frequencyPenalty - p.value) < 0.05}
                  color={c}
                  onPress={() => setS({ ...s, frequencyPenalty: p.value })}
                />
              ))}
            </Row>
          )}

          {/* OpenAI: Presence Penalty */}
          {defs.presencePenalty && (
            <Row label="Presence Penalty">
              {PENALTY_OPTS.map((p) => (
                <Pill
                  key={p.label}
                  label={p.label}
                  active={Math.abs(s.presencePenalty - p.value) < 0.05}
                  color={c}
                  onPress={() => setS({ ...s, presencePenalty: p.value })}
                />
              ))}
            </Row>
          )}

          {/* Claude / Gemini: Top-K */}
          {defs.topK && (
            <Row label="Diversity (Top-K)">
              {TOPK_OPTS.map((p) => (
                <Pill
                  key={p.label}
                  label={p.label}
                  active={s.topK === p.value}
                  color={c}
                  onPress={() => setS({ ...s, topK: p.value })}
                />
              ))}
            </Row>
          )}

          {/* Gemini: Safety Level */}
          {defs.safetyLevel && (
            <Row label="Safety Filter">
              {SAFETY_OPTS.map((p) => (
                <Pill
                  key={p.label}
                  label={p.label}
                  active={s.safetyLevel === p.value}
                  color={c}
                  onPress={() => setS({ ...s, safetyLevel: p.value })}
                />
              ))}
            </Row>
          )}

          {/* Mistral: Safe Mode */}
          {defs.safeMode && (
            <View style={styles.toggleRow}>
              <Text style={styles.rowLabel}>Safe Mode</Text>
              <Switch
                value={s.safeMode}
                onValueChange={(v) => setS({ ...s, safeMode: v })}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: `${c}80` }}
                thumbColor={s.safeMode ? c : "rgba(255,255,255,0.6)"}
              />
            </View>
          )}

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetBtn}
            activeOpacity={0.7}
            onPress={() => setS({ ...DEFAULT_SETTINGS })}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: c }]}
            activeOpacity={0.8}
            onPress={() => { onApply(s); onClose(); }}
          >
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    maxHeight: "82%",
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  sheetBg: { backgroundColor: "rgba(10,9,18,0.96)", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginTop: 10, marginBottom: 6 },

  sheetHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sheetSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginLeft: 2, flex: 1 },
  closeBtn: { padding: 4 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 4 },

  row: { paddingVertical: 10, gap: 8 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  pillText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },

  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.07)" },
  resetBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center" },
  resetText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)" },
  applyBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  applyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
