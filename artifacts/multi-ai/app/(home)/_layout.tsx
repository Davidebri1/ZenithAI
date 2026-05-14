import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { Stack, Redirect } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { setApiTokenGetter, authFetch } from "@/constants/apiAuth";
import { useColors } from "@/hooks/useColors";
import { BASE_URL } from "@/constants/aiConfig";

export default function HomeLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const colors = useColors();
  const welcomeSent = useRef(false);

  useEffect(() => {
    if (isSignedIn) {
      setApiTokenGetter(getToken);

      // Trigger welcome email once per session
      if (!welcomeSent.current && user?.primaryEmailAddress?.emailAddress) {
        welcomeSent.current = true;
        const email = user.primaryEmailAddress.emailAddress;
        const name = user.firstName ?? undefined;
        authFetch(`${BASE_URL}/api/email/welcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        }).catch(() => {});
      }
    }
  }, [isSignedIn, getToken, user]);

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
    </Stack>
  );
}
