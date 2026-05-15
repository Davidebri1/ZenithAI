import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

const BG = require("../assets/images/bg-alley.png");

interface Props {
  style?: object;
  children?: React.ReactNode;
}

export function BgImage({ style, children }: Props) {
  return (
    <View style={[styles.root, style]}>
      <Image
        source={BG}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
});
