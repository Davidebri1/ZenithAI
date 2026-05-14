import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack, Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { setApiTokenGetter } from "@/constants/apiAuth";
import { useColors } from "@/hooks/useColors";

export default function HomeLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const colors = useColors();

  useEffect(() => {
    if (isSignedIn) {
      setApiTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#07070d" }} />;
  }
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

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
    </Stack>
  );
}
