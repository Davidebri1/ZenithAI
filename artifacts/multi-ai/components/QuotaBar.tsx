import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { QuotaState } from "@/hooks/useQuota";

const ACCENT = "#22c55e";

interface Props {
  quota: QuotaState;
}

export function QuotaBar({ quota }: Props) {
  const router = useRouter();

  if (quota.loading || quota.plan !== "free") return null;

  const pct = Math.min(1, quota.promptsUsed / Math.max(1, quota.promptsLimit));
  const isLow = quota.remaining <= 3;
  const isEmpty = quota.remaining === 0;
  const barColor = isEmpty ? "#ef4444" : isLow ? "#f97316" : ACCENT;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(home)/upgrade")}
      activeOpacity={0.85}
      style={styles.wrap}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Feather
            name={isEmpty ? "lock" : "zap"}
            size={13}
            color={barColor}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.label, { color: isEmpty ? "#ef4444" : "rgba(240,240,255,0.65)" }]}>
            {isEmpty
              ? "No prompts left"
              : `${quota.remaining} prompt${quota.remaining === 1 ? "" : "s"} remaining`}
          </Text>
        </View>
        <View style={styles.upgradeBtn}>
          <Text style={styles.upgradeText}>Upgrade</Text>
          <Feather name="arrow-right" size={11} color={ACCENT} />
        </View>
      </View>

      <View style={styles.track}>
        <LinearGradient
          colors={[barColor, `${barColor}aa`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct * 100}%` }]}
        />
      </View>

      <Text style={styles.sub}>
        {quota.promptsUsed}/{quota.promptsLimit} used · Free plan
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 10,
    ...(Platform.OS === "web" ? {} : {}),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  left: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 12, fontWeight: "600" },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${ACCENT}18`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${ACCENT}30`,
  },
  upgradeText: { color: ACCENT, fontSize: 11, fontWeight: "700" },
  track: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 5,
  },
  fill: { height: "100%", borderRadius: 2 },
  sub: { color: "rgba(240,240,255,0.3)", fontSize: 11 },
});
