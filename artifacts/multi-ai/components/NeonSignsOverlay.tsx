import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface SignProps {
  letters: string[];
  color: string;
  glowColor: string;
  flickerDelayMs: number;
  style?: object;
}

function NeonSign({ letters, color, glowColor, flickerDelayMs, style }: SignProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.delay(flickerDelayMs),
      Animated.timing(opacity, { toValue: 0.15, duration: 60,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,    duration: 40,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.5,  duration: 30,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,    duration: 50,  useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(opacity, { toValue: 0.2,  duration: 40,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,    duration: 60,  useNativeDriver: true }),
      Animated.delay(3500 + flickerDelayMs * 0.4),
    ]);
    Animated.loop(seq).start();
  }, []);

  return (
    <Animated.View style={[styles.sign, style, { opacity }]}>
      {letters.map((ch, i) => (
        <Text
          key={i}
          style={[
            styles.letter,
            {
              color,
              textShadowColor: glowColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 14,
            },
          ]}
        >
          {ch}
        </Text>
      ))}
    </Animated.View>
  );
}

export function NeonSignsOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <NeonSign
        letters={["Z", "E", "N", "I", "T", "H"]}
        color="#00f5d4"
        glowColor="rgba(0,245,212,0.95)"
        flickerDelayMs={1200}
        style={styles.leftSign}
      />

      <NeonSign
        letters={["A", "I"]}
        color="#ff9f1c"
        glowColor="rgba(255,159,28,0.95)"
        flickerDelayMs={3100}
        style={styles.rightSign}
      />

      <NeonSign
        letters={["∞"]}
        color="#c084fc"
        glowColor="rgba(192,132,252,0.95)"
        flickerDelayMs={5400}
        style={styles.centerSign}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sign: {
    position: "absolute",
    alignItems: "center",
  },
  letter: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
    letterSpacing: 1,
  },

  leftSign:   { left: "7%",  top: "38%" },
  rightSign:  { right: "6%", top: "38%", transform: [{ scale: 1.4 }] },
  centerSign: { left: "47%", top: "56%", transform: [{ translateX: -14 }, { scale: 1.6 }] },
});
