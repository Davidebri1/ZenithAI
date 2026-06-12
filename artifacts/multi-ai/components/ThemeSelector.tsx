import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES } from "@/constants/themes";

const { width: W } = Dimensions.get("window");
// 2 columns with gap
const TILE_GAP = 12;
const TILE_SIZE = (W - 48 - TILE_GAP) / 2;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSelector({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme: currentTheme, setThemeKey } = useTheme();

  const handleSelect = useCallback(
    async (key: string) => {
      Haptics.selectionAsync();
      await setThemeKey(key);
    },
    [setThemeKey]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.sheetBg]} />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Choose Theme</Text>
              <Text style={styles.headerSub}>
                {THEMES.length} beautiful environments
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Grid */}
          <FlatList
            data={THEMES}
            keyExtractor={(t) => t.key}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: t }) => {
              const active = t.key === currentTheme.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.tile,
                    active && styles.tileActive,
                    active && Platform.OS === "web"
                      ? ({ boxShadow: `0 0 0 2px ${t.accent}, 0 0 20px ${t.accentGlow}` } as object)
                      : {},
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelect(t.key)}
                >
                  <Image
                    source={t.image}
                    style={styles.tileImage}
                    contentFit="cover"
                    contentPosition="center"
                    cachePolicy="memory-disk"
                  />
                  {/* Subtle bottom gradient for label readability */}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.72)"]}
                    style={styles.tileGradient}
                  />
                  <View style={styles.tileLabel}>
                    <Text style={styles.tileName}>{t.name}</Text>
                  </View>
                  {active && (
                    <View style={[styles.tileCheck, { backgroundColor: t.accent }]}>
                      <Feather name="check" size={11} color="#000" />
                    </View>
                  )}
                  {active && (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        styles.tileActiveBorder,
                        { borderColor: t.accent },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },

  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    maxHeight: "88%",
  },
  sheetBg: {
    backgroundColor: "rgba(6,6,18,0.90)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.10)",
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#e8e8f4",
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },

  grid: { padding: 16, gap: TILE_GAP },
  row: { gap: TILE_GAP },

  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 0.72,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tileActive: {
    // Border handled by tileActiveBorder view to preserve rounded corners cleanly
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  tileGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  tileLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  tileName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: 0.1,
  },
  tileCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tileActiveBorder: {
    borderRadius: 16,
    borderWidth: 2,
  },
});
