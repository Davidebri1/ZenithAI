import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { QuotaState } from "@/hooks/useQuota";

interface Props {
  quota: QuotaState;
}

const LOW_THRESHOLD = 10;

export function QuotaBanner({ quota }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (quota.loading || quota.plan !== "free" || dismissed) return null;

  const isEmpty = quota.remaining <= 0;
  const isLow = quota.remaining <= LOW_THRESHOLD && quota.remaining > 0;

  if (!isEmpty && !isLow) return null;

  const accent = isEmpty ? "#ef4444" : "#f97316";
  const bgColor = isEmpty ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.10)";
  const borderColor = isEmpty ? "rgba(239,68,68,0.35)" : "rgba(249,115,22,0.30)";
  const icon = isEmpty ? "alert-octagon" : "alert-triangle";

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
      <Feather name={icon} size={14} color={accent} style={styles.icon} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: accent }]}>
          {isEmpty ? "No prompts remaining" : `${quota.remaining} prompt${quota.remaining === 1 ? "" : "s"} left`}
        </Text>
        <Text style={styles.sub}>
          {isEmpty
            ? "Upgrade to Pro to keep comparing AI models."
            : `You've used ${quota.promptsUsed} of ${quota.promptsLimit} free prompts.`}
        </Text>
      </View>
      {isEmpty ? (
        <TouchableOpacity
          onPress={() => router.push("/(home)/upgrade")}
          style={[styles.upgradeBtn, { backgroundColor: accent }]}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} activeOpacity={0.7}>
          <Feather name="x" size={14} color={`${accent}80`} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  icon: { flexShrink: 0 },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  upgradeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, flexShrink: 0,
  },
  upgradeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
