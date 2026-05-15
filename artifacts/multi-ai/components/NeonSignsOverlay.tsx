import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface SignProps {
  letters: string[];
  color: string;
  flickerDelayMs: number;
  style?: object;
}

function NeonSign({ letters, color, flickerDelayMs, style }: SignProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.delay(flickerDelayMs),
      Animated.timing(opacity, { toValue: 0.08, duration: 55,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.95, duration: 40,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3,  duration: 30,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,    duration: 55,  useNativeDriver: true }),
      Animated.delay(220),
      Animated.timing(opacity, { toValue: 0.12, duration: 40,  useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.92, duration: 60,  useNativeDriver: true }),
      Animated.delay(3800 + flickerDelayMs * 0.25),
    ]);
    Animated.loop(seq).start();
  }, []);

  return (
    <Animated.View style={[styles.sign, style, { opacity }]}>
      {/* Dark backing to mask the gibberish underneath */}
      <View style={[StyleSheet.absoluteFill, styles.backing]} />
      {letters.map((ch, i) => (
        <Text
          key={i}
          style={[
            styles.letter,
            {
              color,
              textShadowColor: color,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 12,
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
      {/* Left wall — teal: LUCKY */}
      <NeonSign
        letters={["L", "U", "C", "K", "Y"]}
        color="#00f0d0"
        flickerDelayMs={900}
        style={styles.leftSign}
      />

      {/* Right wall — amber: OPEN */}
      <NeonSign
        letters={["O", "P", "E", "N"]}
        color="#ff9520"
        flickerDelayMs={3200}
        style={styles.rightSign}
      />

      {/* Center depth — violet: BAR */}
      <NeonSign
        letters={["B", "A", "R"]}
        color="#c060ff"
        flickerDelayMs={5800}
        style={styles.centerSign}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sign: {
    position: "absolute",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  backing: {
    backgroundColor: "rgba(8,6,10,0.82)",
    borderRadius: 3,
  },
  letter: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    lineHeight: 25,
    textAlign: "center",
    letterSpacing: 0,
  },

  leftSign:   { left: "8%",  top: "39%" },
  rightSign:  { right: "6%", top: "39%", },
  centerSign: { left: "46%", top: "57%", transform: [{ translateX: -16 }] },
});
