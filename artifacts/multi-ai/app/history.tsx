import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS } from "@/constants/aiConfig";
import {
  getSessions,
  deleteSession,
  clearAllSessions,
  formatSessionDate,
  CONV_IDS_KEY,
  type Session,
} from "@/constants/sessions";

export default function HistoryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => { getSessions().then(setSessions); }, [])
  );

  const handleRestore = (session: Session) => {
    Alert.alert("Restore Session?", "This will replace your current conversation.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        onPress: async () => {
          await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(session.convIds));
          router.back();
        },
      },
    ]);
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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={["#0f0f1e", c.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: c.border }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.foreground }]}>History</Text>
        <TouchableOpacity onPress={() => router.push("/search")} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="search" size={19} color={c.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} activeOpacity={0.7} disabled={sessions.length === 0}>
          <Text style={[styles.clearText, { color: sessions.length > 0 ? "#ff4466" : c.mutedForeground }]}>
            Clear All
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { borderColor: c.border }]}>
            <Feather name="clock" size={28} color={c.mutedForeground} style={{ opacity: 0.5 }} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>No History Yet</Text>
          <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
            Sessions are saved when you start a New Chat.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleRestore(item)}
              style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
              activeOpacity={0.75}
            >
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
                <Text style={[styles.sessionDate, { color: c.mutedForeground }]}>
                  {formatSessionDate(item.createdAt)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} activeOpacity={0.7}>
                  <Feather name="trash-2" size={14} color={c.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.sessionTitle, { color: c.foreground }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.restoreRow}>
                <Feather name="rotate-ccw" size={12} color={c.mutedForeground} />
                <Text style={[styles.restoreHint, { color: c.mutedForeground }]}>Tap to restore</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 16, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  clearBtn: { paddingHorizontal: 4 },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 48 },

  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 18, borderWidth: 1, padding: 16, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  providerDots: { flexDirection: "row", gap: 6, flex: 1 },
  providerDot: { width: 10, height: 10, borderRadius: 5 },
  sessionDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionTitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  restoreRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  restoreHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
