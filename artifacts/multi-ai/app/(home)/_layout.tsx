import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { setApiTokenGetter } from "@/constants/apiAuth";
import { useColors } from "@/hooks/useColors";

export default function HomeLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const colors = useColors();

  useEffect(() => {
    if (isSignedIn) {
      setApiTokenGetter(getToken);
    } else {
      // Guest mode: no token, server tracks anonymously
      setApiTokenGetter(async () => null);
    }
  }, [isSignedIn, getToken]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#07070d" }} />;
  }
  // No redirect — app works in guest mode without sign-in

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="thread" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
      <Stack.Screen name="history" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="search" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="compare" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
      <Stack.Screen name="upgrade" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
      <Stack.Screen name="enterprise" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="session-detail" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="memories" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
