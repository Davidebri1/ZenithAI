import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSignIn, useSSO, useAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import { BgImage } from "@/components/BgImage";

WebBrowser.maybeCompleteAuthSession();

const PRIMARY = "#00e5a0";
const PRIMARY_GLOW = "rgba(0,229,160,0.4)";

export default function SignInScreen() {
  const { isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.replace("/(home)");
  }, [isSignedIn]);

  const handleSubmit = async () => {
    if (!signIn) return;
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) {
      Alert.alert("Sign in failed", error.message ?? "Check your email and password.");
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize();
      router.replace("/(home)");
    }
  };

  const handleVerify = async () => {
    if (!signIn) return;
    const { error } = await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (error) {
      Alert.alert("Verification failed", error.message ?? "Check the code and try again.");
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize();
      router.replace("/(home)");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(home)");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? "Google sign in failed. Try email instead.";
      Alert.alert("Google sign in failed", msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 52 : insets.top;
  const isLoading = fetchStatus === "fetching";
  const canSubmit = email.length > 0 && password.length > 0 && !isLoading;

  if (signIn?.status === "needs_second_factor") {
    return (
      <BgImage style={styles.bg}>
        <LinearGradient colors={["rgba(7,7,13,0.6)", "rgba(7,7,13,0.97)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <NeonGlowOverlay />
        <KeyboardAvoidingView style={styles.container} behavior="padding">
          <View style={[styles.card, { margin: 24, marginTop: topPad + 60 }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cardOverlay]} />
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>Enter the verification code we sent to {email}</Text>
            <View style={styles.inputWrap}>
              <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inputOverlay]} />
              <TextInput
                style={styles.input}
                value={verifyCode}
                onChangeText={setVerifyCode}
                placeholder="6-digit code"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                maxLength={6}
                onSubmitEditing={handleVerify}
              />
            </View>
            <TouchableOpacity
              onPress={handleVerify}
              style={[styles.primaryBtn, { marginTop: 20 }, (verifyCode.length < 6 || isLoading) && styles.primaryBtnDisabled]}
              disabled={verifyCode.length < 6 || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => signIn.mfa.sendEmailCode()} style={styles.textBtn} activeOpacity={0.7}>
              <Text style={styles.textBtnText}>Resend code</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BgImage>
    );
  }

  return (
    <BgImage style={styles.bg}>
      <LinearGradient colors={["rgba(7,7,13,0.55)", "rgba(7,7,13,0.97)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <NeonGlowOverlay />
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: topPad + 30, paddingHorizontal: 24, alignItems: "center" }}>
            <View style={styles.logoMark}>
              <Text style={styles.logoZ}>Z</Text>
            </View>
            <Text style={styles.logoText}>Zenith</Text>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSubtitle}>Sign in to compare All AI Models</Text>
          </View>

          <View style={[styles.card, { marginHorizontal: 24, marginTop: 28 }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cardOverlay]} />

            <TouchableOpacity onPress={handleGoogle} style={styles.googleBtn} activeOpacity={0.8} disabled={googleLoading}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }]} />
              {googleLoading ? (
                <ActivityIndicator size="small" color="#e8e8f4" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inputOverlay]} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <View style={styles.inputWrap}>
              <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inputOverlay]} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                autoComplete="password"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.primaryBtn,
                { marginTop: 22 },
                !canSubmit && styles.primaryBtnDisabled,
                canSubmit && Platform.OS === "web" ? { boxShadow: `0 0 20px ${PRIMARY_GLOW}` } as object : {},
              ]}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={[styles.footerText, { color: PRIMARY }]}>Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BgImage>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },

  logoMark: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1, borderColor: "rgba(34,197,94,0.35)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  logoZ: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#22c55e" },
  logoText: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#e8e8f4", letterSpacing: -1.5, marginBottom: 18 },

  heroTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 5, marginBottom: 4 },

  card: {
    borderRadius: 24, overflow: "hidden", padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12,
    marginBottom: 32,
  },
  cardOverlay: {
    backgroundColor: "rgba(10,10,26,0.72)",
    borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },

  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 50, borderRadius: 14, overflow: "hidden", gap: 10, marginBottom: 4,
  },
  googleIcon: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#e8e8f4" },
  googleText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#e8e8f4" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },

  label: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },

  inputWrap: { height: 50, borderRadius: 14, overflow: "hidden" },
  inputOverlay: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: "#e8e8f4",
    zIndex: 1,
  },
  eyeBtn: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 2 },

  primaryBtn: {
    height: 52, borderRadius: 14, backgroundColor: PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  primaryBtnDisabled: { backgroundColor: "rgba(0,229,160,0.3)" },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },

  textBtn: { alignItems: "center", marginTop: 12 },
  textBtnText: { fontSize: 14, fontFamily: "Inter_400Regular", color: PRIMARY },

  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },

  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#e8e8f4", marginBottom: 8, zIndex: 1 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginBottom: 20, zIndex: 1 },
});
