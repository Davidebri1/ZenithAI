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
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS } from "@/constants/aiConfig";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import {
  getSessions,
  deleteSession,
  toggleSessionPrivate,
  clearSessionsByFilter,
  formatSessionDate,
  type Session,
} from "@/constants/sessions";

const BG = require("../../assets/images/bg-alley.png");

type Tab = "public" | "private";

export default function HistoryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tab, setTab] = useState<Tab>("public");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getSessions().then((data) => { setSessions(data); setLoading(false); });
    }, [])
  );

  const visible = sessions.filter((s) =>
    tab === "private" ? s.isPrivate : !s.isPrivate
  );

  const publicCount = sessions.filter((s) => !s.isPrivate).length;
  const privateCount = sessions.filter((s) => s.isPrivate).length;

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
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSession(id);
          setSessions((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  };

  const handleTogglePrivate = async (id: string) => {
    const nowPrivate = await toggleSessionPrivate(id);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPrivate: nowPrivate } : s))
    );
  };

  const handleClearTab = () => {
    if (visible.length === 0) return;
    const label = tab === "private" ? "private" : "public";
    Alert.alert(
      `Clear ${label === "private" ? "Private" : "All"} History?`,
      `${visible.length} session${visible.length !== 1 ? "s" : ""} will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await clearSessionsByFilter(tab);
            setSessions((prev) =>
              prev.filter((s) =>
                tab === "private" ? !s.isPrivate : s.isPrivate
              )
            );
          },
        },
      ]
    );
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,13,0.65)", "rgba(7,7,13,0.88)", "rgba(7,7,13,0.97)"]}
        style={StyleSheet.absoluteFill}
      />
      <NeonGlowOverlay />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 10 }]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(7,7,20,0.5)",
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: "rgba(255,255,255,0.08)",
              },
            ]}
          />
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color="#e8e8f4" />
          </TouchableOpacity>
          <Text style={styles.title}>History</Text>
          <TouchableOpacity
            onPress={() => router.push("/(home)/search")}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather name="search" size={19} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearTab}
            style={styles.clearBtn}
            activeOpacity={0.7}
            disabled={visible.length === 0}
          >
            <Text
              style={[
                styles.clearText,
                { color: visible.length > 0 ? "#ff4466" : "rgba(255,255,255,0.25)" },
              ]}
            >
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setTab("public")}
            style={[styles.tab, tab === "public" && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Feather
              name="clock"
              size={13}
              color={tab === "public" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"}
            />
            <Text style={[styles.tabText, tab === "public" && styles.tabTextActive]}>
              All
            </Text>
            {publicCount > 0 && (
              <View style={[styles.tabBadge, tab === "public" && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, tab === "public" && styles.tabBadgeTextActive]}>
                  {publicCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("private")}
            style={[styles.tab, tab === "private" && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Feather
              name="lock"
              size={13}
              color={tab === "private" ? "#a78bfa" : "rgba(255,255,255,0.4)"}
            />
            <Text
              style={[
                styles.tabText,
                tab === "private" && { color: "#a78bfa" },
              ]}
            >
              Private
            </Text>
            {privateCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  tab === "private" && {
                    backgroundColor: "rgba(167,139,250,0.2)",
                    borderColor: "rgba(167,139,250,0.3)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    tab === "private" && { color: "#a78bfa" },
                  ]}
                >
                  {privateCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather
                name={tab === "private" ? "lock" : "clock"}
                size={28}
                color="rgba(255,255,255,0.25)"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {tab === "private" ? "No Private Sessions" : "No History Yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === "private"
                ? "Tap the lock icon on any session to make it private."
                : "Sessions are saved when you start a New Chat."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(s) => s.id}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: insets.bottom + 20 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleOpen(item)}
                style={({ pressed }) => [
                  styles.card,
                  item.isPrivate && styles.cardPrivate,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: item.isPrivate
                        ? "rgba(30,10,50,0.6)"
                        : "rgba(7,7,20,0.55)",
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: item.isPrivate
                        ? "rgba(167,139,250,0.2)"
                        : "rgba(255,255,255,0.08)",
                    },
                  ]}
                />
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
                              Platform.OS === "web"
                                ? ({ boxShadow: `0 0 6px ${p.color}` } as object)
                                : {},
                            ]}
                          />
                        ) : null
                      )}
                    </View>
                    <Text style={styles.sessionDate}>
                      {formatSessionDate(item.createdAt)}
                    </Text>
                    {/* Lock / Unlock */}
                    <TouchableOpacity
                      onPress={() => handleTogglePrivate(item.id)}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      activeOpacity={0.7}
                      style={styles.actionBtn}
                    >
                      <Feather
                        name={item.isPrivate ? "lock" : "unlock"}
                        size={14}
                        color={
                          item.isPrivate
                            ? "#a78bfa"
                            : "rgba(255,255,255,0.3)"
                        }
                      />
                    </TouchableOpacity>
                    {/* Delete */}
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      activeOpacity={0.7}
                      style={styles.actionBtn}
                    >
                      <Feather name="trash-2" size={14} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  </View>

                  {item.isPrivate && (
                    <View style={styles.privateBadge}>
                      <Feather name="lock" size={10} color="#a78bfa" />
                      <Text style={styles.privateBadgeText}>Private</Text>
                    </View>
                  )}

                  <Text style={styles.sessionTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.hintRow}>
                    <Feather name="eye" size={12} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.hintText}>Tap to view</Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    overflow: "hidden",
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    color: "#e8e8f4",
    zIndex: 1,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  clearBtn: { paddingHorizontal: 4, zIndex: 1 },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabActive: {
    borderColor: "rgba(0,229,176,0.35)",
    backgroundColor: "rgba(0,229,176,0.08)",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
  },
  tabTextActive: { color: "rgba(255,255,255,0.9)" },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tabBadgeActive: {
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.4)",
  },
  tabBadgeTextActive: { color: "rgba(255,255,255,0.9)" },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#e8e8f4",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 48,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 21,
  },

  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardPrivate: {
    shadowColor: "#a78bfa",
    shadowOpacity: 0.2,
  },
  cardContent: { padding: 16, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerDots: { flexDirection: "row", gap: 6, flex: 1 },
  providerDot: { width: 10, height: 10, borderRadius: 5 },
  sessionDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  actionBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(167,139,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.25)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  privateBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#a78bfa",
  },
  sessionTitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    color: "#e8e8f4",
  },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },
});
