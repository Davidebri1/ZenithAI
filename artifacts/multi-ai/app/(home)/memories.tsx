import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { BgImage } from "@/components/BgImage";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getMemories,
  addMemory,
  deleteMemory,
  pinMemory,
  clearAllMemories,
  type Memory,
} from "@/constants/memories";

export default function MemoriesScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { theme } = useTheme();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    getMemories().then((mems) => {
      // Pinned first, then by recency
      const sorted = [
        ...mems.filter((m) => m.pinned),
        ...mems.filter((m) => !m.pinned),
      ];
      setMemories(sorted);
    });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const text = inputText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addMemory(text);
    setInputText("");
    load();
  };

  const handlePin = async (id: string) => {
    Haptics.selectionAsync();
    await pinMemory(id);
    load();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete memory?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMemory(id);
          setMemories((prev) => prev.filter((m) => m.id !== id));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (memories.length === 0) return;
    Alert.alert("Clear all memories?", "All memories will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          await clearAllMemories();
          setMemories([]);
        },
      },
    ]);
  };

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
        <View style={styles.headerTextRow}>
          <Text style={styles.headerTitle}>Memories</Text>
          <Text style={styles.headerSub}>Persistent context injected into every prompt</Text>
        </View>
        {memories.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add memory input */}
      <View style={styles.addRow}>
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.addRowBg]} />
        <TextInput
          ref={inputRef}
          style={styles.addInput}
          placeholder="Add a memory… (e.g. I prefer concise answers)"
          placeholderTextColor="rgba(255,255,255,0.28)"
          selectionColor={theme.accent}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={400}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!inputText.trim()}
          style={[
            styles.addBtn,
            { backgroundColor: inputText.trim() ? theme.accent : "rgba(255,255,255,0.08)" },
          ]}
          activeOpacity={0.75}
        >
          <Feather name="plus" size={18} color={inputText.trim() ? "#000" : "rgba(255,255,255,0.25)"} />
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="bookmark" size={32} color="rgba(255,255,255,0.12)" />
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptySub}>
            Memories are injected as context into every prompt you send, helping AI models remember your preferences.
          </Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.memCard, { overflow: "hidden" }]}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.memCardBg, item.pinned && styles.memCardBgPinned]} />
              {item.pinned && (
                <View style={[styles.pinAccent, { backgroundColor: theme.accent }]} />
              )}
              <View style={styles.memContent}>
                <Text style={styles.memText}>{item.text}</Text>
                <Text style={styles.memDate}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
              <View style={styles.memActions}>
                <TouchableOpacity
                  onPress={() => handlePin(item.id)}
                  style={[styles.actionBtn, item.pinned && { backgroundColor: `${theme.accent}22` }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Feather
                    name="bookmark"
                    size={14}
                    color={item.pinned ? theme.accent : "rgba(255,255,255,0.3)"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Feather name="trash-2" size={14} color="rgba(255,80,80,0.6)" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <Text style={styles.countLabel}>
              {memories.length} memor{memories.length === 1 ? "y" : "ies"} · pinned first
            </Text>
          }
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
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  headerBg: { backgroundColor: "rgba(7,7,20,0.55)" },
  backBtn: { marginBottom: 2 },
  headerTextRow: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#e8e8f4" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 10, marginBottom: 2 },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,80,80,0.6)" },

  addRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    gap: 8,
  },
  addRowBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  addInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#f0f0ff",
    maxHeight: 80,
    lineHeight: 20,
    paddingVertical: 4,
    zIndex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.3)" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    lineHeight: 19,
  },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 8 },
  countLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  memCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    gap: 8,
  },
  memCardBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  memCardBgPinned: { backgroundColor: "rgba(255,255,255,0.05)" },
  pinAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 2.5, opacity: 0.7 },

  memContent: { flex: 1, gap: 3 },
  memText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(240,240,255,0.85)",
    lineHeight: 19,
  },
  memDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
  },

  memActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
