import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface GlowProps {
  color: string;
  width: number;
  height: number;
  borderRadius: number;
  flickerDelayMs: number;
  style?: object;
}

function NeonGlow({ color, width, height, borderRadius, flickerDelayMs, style }: GlowProps) {
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.delay(flickerDelayMs),
      Animated.timing(opacity, { toValue: 0.08, duration: 55,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.9,  duration: 40,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.35, duration: 30,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,    duration: 50,  useNativeDriver: true }),
      Animated.delay(180),
      Animated.timing(opacity, { toValue: 0.1,  duration: 35,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.88, duration: 55,  useNativeDriver: true }),
      Animated.delay(3200 + flickerDelayMs * 0.3),
    ]);
    Animated.loop(seq).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width,
          height,
          borderRadius,
          opacity,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 18,
        },
      ]}
    />
  );
}

export function NeonSignsOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Left wall sign — teal */}
      <NeonGlow
        color="rgba(0,245,212,0.55)"
        width={18}
        height={110}
        borderRadius={6}
        flickerDelayMs={900}
        style={styles.leftSign}
      />

      {/* Right wall sign — amber */}
      <NeonGlow
        color="rgba(255,140,20,0.55)"
        width={18}
        height={85}
        borderRadius={6}
        flickerDelayMs={3400}
        style={styles.rightSign}
      />

      {/* Center sign — violet */}
      <NeonGlow
        color="rgba(190,80,255,0.50)"
        width={14}
        height={55}
        borderRadius={5}
        flickerDelayMs={6100}
        style={styles.centerSign}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  leftSign:   { left: "9%",  top: "39%" },
  rightSign:  { right: "7%", top: "38%" },
  centerSign: { left: "47%", top: "57%" },
});
