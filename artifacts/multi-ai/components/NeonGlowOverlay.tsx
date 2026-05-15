import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function NeonGlowOverlay() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 4800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.15, duration: 5000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
      <LinearGradient
        colors={[
          "transparent",
          "transparent",
          "rgba(124,95,255,0.06)",
          "rgba(255,107,71,0.05)",
          "rgba(0,229,176,0.05)",
        ]}
        locations={[0, 0.48, 0.70, 0.85, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
