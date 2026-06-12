import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  style?: object;
  children?: React.ReactNode;
}

export function BgImage({ style, children }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.root, style]}>
      <Image
        source={theme.image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        transition={400}
        cachePolicy="memory-disk"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
});
