import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  ImageBackground,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS } from "@/constants/aiConfig";
import {
  getSessions,
  deleteSession,
  clearAllSessions,
  formatSessionDate,
  type Session,
} from "@/constants/sessions";

const BG = require("../../assets/images/bg-alley.png");

export default function HistoryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => { getSessions().then(setSessions); }, [])
  );

  const handleOpen = (session: Session) => {
    router.push({
      pathname: "/(home)/session-detail",
      params: { sessionId: session.id },
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Session?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (sessions.length === 0) return;
    Alert.alert("Clear All History?", "All saved sessions will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All", style: "destructive",
        onPress: async () => { await clearAllSessions(); setSessions([]); },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,13,0.65)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad + 10 }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.5)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" }]} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#e8e8f4" />
          </TouchableOpacity>
          <Text style={styles.title}>History</Text>
          <TouchableOpacity onPress={() => router.push("/search")} style={styles.iconBtn} activeOpacity={0.7}>
            <Feather name="search" size={19} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} activeOpacity={0.7} disabled={sessions.length === 0}>
            <Text style={[styles.clearText, { color: sessions.length > 0 ? "#ff4466" : "rgba(255,255,255,0.3)" }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="clock" size={28} color="rgba(255,255,255,0.25)" />
            </View>
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptySubtitle}>Sessions are saved when you start a New Chat.</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(s) => s.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleOpen(item)}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
              >
                <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.55)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={styles.providerDots}>
                      {AI_PROVIDERS.map((p) =>
                        item.convIds[p.key] ? (
                          <View
                            key={p.key}
                            style={[
                              styles.providerDot,
                              { backgroundColor: p.color },
                              Platform.OS === "web" ? { boxShadow: `0 0 6px ${p.color}` } as object : {},
                            ]}
                          />
                        ) : null
                      )}
                    </View>
                    <Text style={styles.sessionDate}>{formatSessionDate(item.createdAt)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} activeOpacity={0.7}>
                      <Feather name="trash-2" size={14} color="rgba(255,255,255,0.35)" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.sessionTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.restoreRow}>
                    <Feather name="eye" size={12} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.restoreHint}>Tap to view</Text>
                    <Feather name="chevron-right" size={12} color="rgba(255,255,255,0.2)" />
                  </View>
                </View>
              </Pressable>
            )}
          />
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
    paddingHorizontal: 16, paddingBottom: 16, gap: 10,
    overflow: "hidden",
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", zIndex: 1 },
  title: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3, color: "#e8e8f4", zIndex: 1 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", zIndex: 1 },
  clearBtn: { paddingHorizontal: 4, zIndex: 1 },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: "#e8e8f4" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 48, color: "rgba(255,255,255,0.4)" },

  list: { padding: 16, gap: 10 },
  card: { borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  cardContent: { padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  providerDots: { flexDirection: "row", gap: 6, flex: 1 },
  providerDot: { width: 10, height: 10, borderRadius: 5 },
  sessionDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  sessionTitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, color: "#e8e8f4" },
  restoreRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  restoreHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },
});
