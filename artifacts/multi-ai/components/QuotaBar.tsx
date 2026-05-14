import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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
    <TouchableOpacity onPress={() => router.push("/(home)/upgrade")} activeOpacity={0.8} style={styles.wrap}>
      <Feather name={isEmpty ? "lock" : "zap"} size={10} color={barColor} />
      <Text style={[styles.label, { color: isEmpty ? "#ef4444" : "rgba(240,240,255,0.35)" }]}>
        {isEmpty ? "No prompts left" : `${quota.remaining} left`}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
      </View>
      {(isLow || isEmpty) && (
        <Text style={[styles.upgrade, { color: barColor }]}>Upgrade →</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  track: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 1,
    overflow: "hidden",
  },
  fill: { height: "100%" as any, borderRadius: 1 },
  upgrade: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
