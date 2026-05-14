import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { AI_PROVIDERS, BASE_URL, type AiProvider } from "@/constants/aiConfig";
import {
  getSessions,
  deleteSession,
  toggleSessionPrivate,
  CONV_IDS_KEY,
  formatSessionDate,
  type Session,
} from "@/constants/sessions";
import { authFetch } from "@/constants/apiAuth";

const BG = require("../../assets/images/bg-alley.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 10;

interface ProviderSnapshot {
  provider: AiProvider;
  convId: number;
  lastMessage: string;
  messageCount: number;
  loading: boolean;
}

function SnapshotCard({
  snap,
  cardWidth,
  onPress,
}: {
  snap: ProviderSnapshot;
  cardWidth: number;
  onPress: () => void;
}) {
  const { provider } = snap;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        { width: cardWidth, borderColor: `${provider.color}55` },
        Platform.OS === "web"
          ? ({ boxShadow: `0 0 0 1px ${provider.color}30, 0 4px 20px rgba(0,0,0,0.5)` } as object)
          : {},
      ]}
      activeOpacity={0.8}
    >
      <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(7,7,20,0.52)", borderRadius: 18 },
        ]}
      />

      <LinearGradient
        colors={[`${provider.color}24`, `${provider.color}00`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.cardTopGrad}
      >
        <View
          style={[
            styles.aiCircle,
            { borderColor: `${provider.color}70` },
            Platform.OS === "web"
              ? ({ boxShadow: `0 0 14px ${provider.colorGlow}` } as object)
              : {},
          ]}
        >
          <Text style={[styles.aiInitial, { color: provider.color }]}>
            {provider.name[0]}
          </Text>
        </View>
        {snap.messageCount > 0 && (
          <View style={styles.msgCountBadge}>
            <Text style={styles.msgCountText}>{snap.messageCount}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{provider.name}</Text>
          <View style={[styles.modelChip, { borderColor: `${provider.color}40` }]}>
            <Text style={[styles.modelChipText, { color: `${provider.color}cc` }]}>
              {provider.model}
            </Text>
          </View>
        </View>

        {snap.loading ? (
          <ActivityIndicator
            size="small"
            color={provider.color}
            style={{ alignSelf: "flex-start", marginTop: 8 }}
          />
        ) : (
          <Text
            style={[
              styles.previewText,
              {
                color: snap.lastMessage
                  ? "rgba(240,240,255,0.85)"
                  : "rgba(240,240,255,0.3)",
              },
            ]}
            numberOfLines={4}
          >
            {snap.lastMessage || "No response in this session"}
          </Text>
        )}

        <View style={styles.openHint}>
          <Feather name="message-circle" size={11} color="rgba(255,255,255,0.22)" />
          <Text style={styles.openHintText}>Open thread</Text>
          <Feather name="chevron-right" size={11} color="rgba(255,255,255,0.22)" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SessionDetailScreen() {
  useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<Session | null>(null);
  const [snapshots, setSnapshots] = useState<ProviderSnapshot[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  const cardWidth = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

  useEffect(() => {
    if (!sessionId) return;
    loadSessionData(sessionId);
  }, [sessionId]);

  const loadSessionData = async (id: string) => {
    const sessions = await getSessions();
    const found = sessions.find((s) => s.id === id) ?? null;
    setSession(found);
    setIsPrivate(found?.isPrivate ?? false);
    setLoadingSession(false);
    if (!found) return;

    const initial: ProviderSnapshot[] = AI_PROVIDERS.filter(
      (p) => found.convIds[p.key]
    ).map((p) => ({
      provider: p,
      convId: found.convIds[p.key],
      lastMessage: "",
      messageCount: 0,
      loading: true,
    }));
    setSnapshots(initial);

    await Promise.allSettled(
      initial.map(async (snap, idx) => {
        try {
          const res = await authFetch(
            `${BASE_URL}/api/conversations/${snap.convId}/messages`
          );
          if (!res.ok) throw new Error("failed");
          const msgs = (await res.json()) as Array<{
            role: string;
            content: string;
          }>;
          const lastAssistant = [...msgs]
            .reverse()
            .find((m) => m.role === "assistant");
          setSnapshots((prev) =>
            prev.map((s, i) =>
              i === idx
                ? {
                    ...s,
                    lastMessage: lastAssistant?.content ?? "",
                    messageCount: msgs.length,
                    loading: false,
                  }
                : s
            )
          );
        } catch {
          setSnapshots((prev) =>
            prev.map((s, i) => (i === idx ? { ...s, loading: false } : s))
          );
        }
      })
    );
  };

  const handleResume = async () => {
    if (!session) return;
    await AsyncStorage.setItem(CONV_IDS_KEY, JSON.stringify(session.convIds));
    router.back();
    router.back();
  };

  const handleTogglePrivate = async () => {
    if (!session) return;
    const nowPrivate = await toggleSessionPrivate(session.id);
    setIsPrivate(nowPrivate);
    setSession((s) => s ? { ...s, isPrivate: nowPrivate } : s);
  };

  const handleDelete = () => {
    if (!session) return;
    Alert.alert("Delete Session?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSession(session.id);
          router.back();
        },
      },
    ]);
  };

  const handleOpenThread = (snap: ProviderSnapshot) => {
    router.push({
      pathname: "/thread",
      params: { key: snap.provider.key, convId: String(snap.convId) },
    });
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;

  const rows: (ProviderSnapshot | null)[][] = [];
  for (let i = 0; i < snapshots.length; i += 2) {
    rows.push([snapshots[i], snapshots[i + 1] ?? null]);
  }

  if (loadingSession) {
    return (
      <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient
          colors={["rgba(7,7,13,0.65)", "rgba(7,7,13,0.97)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#00e5b0" size="large" />
        </View>
      </ImageBackground>
    );
  }

  if (!session) {
    return (
      <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient
          colors={["rgba(7,7,13,0.65)", "rgba(7,7,13,0.97)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Feather name="alert-circle" size={32} color="rgba(255,255,255,0.3)" />
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>
            Session not found
          </Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={{ color: "#00e5b0", fontSize: 15 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={[
          "rgba(7,7,13,0.55)",
          "rgba(7,7,13,0.82)",
          "rgba(7,7,13,0.97)",
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.container}>
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

          <View style={styles.headerMid}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {session.title}
              </Text>
              {isPrivate && (
                <View style={styles.privatePill}>
                  <Feather name="lock" size={10} color="#a78bfa" />
                  <Text style={styles.privatePillText}>Private</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerDate}>
              {formatSessionDate(session.createdAt)}
            </Text>
          </View>

          {/* Lock / Unlock */}
          <TouchableOpacity
            onPress={handleTogglePrivate}
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Feather
              name={isPrivate ? "lock" : "unlock"}
              size={18}
              color={isPrivate ? "#a78bfa" : "rgba(255,255,255,0.4)"}
            />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Feather name="trash-2" size={18} color="rgba(255,80,80,0.6)" />
          </TouchableOpacity>

          {/* Resume */}
          <TouchableOpacity
            onPress={handleResume}
            style={styles.resumeBtn}
            activeOpacity={0.8}
          >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "rgba(0,229,176,0.12)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(0,229,176,0.3)",
                },
              ]}
            />
            <Feather name="rotate-ccw" size={13} color="#00e5b0" style={{ zIndex: 1 }} />
            <Text style={styles.resumeText}>Resume</Text>
          </TouchableOpacity>
        </View>

        {snapshots.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={28} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No model responses found for this session.</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={[
              styles.grid,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: row }) => (
              <View style={styles.row}>
                {row.map((snap, i) =>
                  snap ? (
                    <SnapshotCard
                      key={snap.provider.key}
                      snap={snap}
                      cardWidth={cardWidth}
                      onPress={() => handleOpenThread(snap)}
                    />
                  ) : (
                    <View key={`empty-${i}`} style={{ width: cardWidth }} />
                  )
                )}
              </View>
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
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    overflow: "hidden",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  headerMid: { flex: 1, zIndex: 1, gap: 2, minWidth: 0 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "nowrap" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#e8e8f4",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(167,139,250,0.15)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  privatePillText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#a78bfa",
  },
  headerDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    zIndex: 1,
  },
  resumeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#00e5b0",
    zIndex: 1,
  },

  grid: { padding: 16, gap: 10 },
  row: { flexDirection: "row", gap: CARD_GAP },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopGrad: {
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  aiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  aiInitial: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  msgCountBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  msgCountText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },

  cardBody: { padding: 12, gap: 6 },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  cardName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#f0f0ff",
  },
  modelChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modelChipText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  previewText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  openHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  openHintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.22)",
    flex: 1,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
