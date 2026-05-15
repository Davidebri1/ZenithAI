import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { authFetch } from "@/constants/apiAuth";
import { BASE_URL } from "@/constants/aiConfig";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";

const BG = require("../../assets/images/bg-alley.png");
const BG_FOCAL = { transform: [{ scale: 1.5 }, { translateY: -200 }] };
const ACCENT = "#22c55e";
const ACCENT_GLOW = "#22c55e55";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  prices: Price[];
}

const FEATURES = [
  { icon: "zap", label: "Unlimited prompts across All AI Models" },
  { icon: "layers", label: "Simultaneous GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama & Qwen" },
  { icon: "cpu", label: "Synthesis — AI-powered cross-model summary" },
  { icon: "search", label: "Search across all your conversations" },
  { icon: "clock", label: "Full session history" },
  { icon: "shield", label: "Priority access to new models" },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">("year");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/stripe/products`);
        if (res.ok) {
          const { data } = await res.json();
          setProducts(data ?? []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const proProduct = products[0] ?? null;
  const selectedPrice = proProduct?.prices?.find(
    (p) => p.recurring?.interval === selectedInterval
  );
  const otherPrice = proProduct?.prices?.find(
    (p) => p.recurring?.interval !== selectedInterval
  );

  const monthlyEquiv =
    selectedInterval === "year" && selectedPrice
      ? `$${((selectedPrice.unit_amount / 100) / 12).toFixed(2)}/mo`
      : null;

  const savings =
    selectedInterval === "year" && selectedPrice && otherPrice
      ? Math.round(100 - (selectedPrice.unit_amount / (otherPrice.unit_amount * 12)) * 100)
      : null;

  async function handleCheckout() {
    if (!selectedPrice) return;
    setCheckoutLoading(true);
    try {
      const res = await authFetch(`${BASE_URL}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPrice.id }),
      });
      const { url } = await res.json();
      if (url) setCheckoutUrl(url);
    } catch (e) {
      console.error("Checkout error", e);
    } finally {
      setCheckoutLoading(false);
    }
  }

  const handleWebViewNav = useCallback((navState: { url: string }) => {
    if (navState.url.includes("checkout=success")) {
      setCheckoutUrl(null);
      setCheckoutSuccess(true);
    } else if (navState.url.includes("checkout=cancel")) {
      setCheckoutUrl(null);
    }
  }, []);

  if (checkoutSuccess) {
    return (
      <ImageBackground source={BG} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={BG_FOCAL}>
        <LinearGradient
          colors={["rgba(7,7,20,0.92)", "rgba(7,7,20,0.80)", "rgba(7,7,20,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <NeonGlowOverlay />
        <View style={[styles.container, styles.successContainer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.successIcon, Platform.OS === "web" ? { boxShadow: `0 0 40px ${ACCENT_GLOW}` } as object : {}]}>
            <LinearGradient colors={[`${ACCENT}30`, `${ACCENT}08`]} style={styles.successIconGrad}>
              <Feather name="check" size={36} color={ACCENT} />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>Welcome to Pro</Text>
          <Text style={styles.successSub}>
            You now have unlimited prompts across All AI Models. Start asking.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(home)")} style={styles.successCTA} activeOpacity={0.85}>
            <LinearGradient colors={[ACCENT, "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successCTAGrad}>
              <Text style={styles.successCTAText}>Start comparing</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <>
      <ImageBackground source={BG} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={BG_FOCAL}>
        <LinearGradient
          colors={["rgba(7,7,20,0.88)", "rgba(7,7,20,0.72)", "rgba(7,7,20,0.92)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="x" size={22} color="rgba(240,240,255,0.7)" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Zenith Pro</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={[styles.heroBadge, Platform.OS === "web" ? { boxShadow: `0 0 32px ${ACCENT_GLOW}` } as object : {}]}>
                <LinearGradient colors={[`${ACCENT}30`, `${ACCENT}08`]} style={styles.heroBadgeGrad}>
                  <Feather name="zap" size={28} color={ACCENT} />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Unlock All AI Models</Text>
              <Text style={styles.heroSub}>
                Compare GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Llama & Qwen side by side — unlimited.
              </Text>
            </View>

            {/* Interval toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => setSelectedInterval("month")}
                style={[styles.toggleBtn, selectedInterval === "month" && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleLabel, selectedInterval === "month" && styles.toggleLabelActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedInterval("year")}
                style={[styles.toggleBtn, selectedInterval === "year" && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleLabel, selectedInterval === "year" && styles.toggleLabelActive]}>
                  Yearly
                </Text>
                {savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>-{savings}%</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Price card */}
            <View style={[styles.priceCard, Platform.OS === "web" ? { boxShadow: `0 0 0 1px ${ACCENT}40, 0 0 40px ${ACCENT}18` } as object : {}]}>
              <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.55)", borderRadius: 20, borderWidth: 1, borderColor: `${ACCENT}40` }]} />
              <LinearGradient colors={[`${ACCENT}22`, `${ACCENT}00`]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />

              <View style={styles.priceContent}>
                {loading ? (
                  <ActivityIndicator color={ACCENT} />
                ) : selectedPrice ? (
                  <>
                    <Text style={styles.priceName}>{proProduct?.name ?? "Zenith Pro"}</Text>
                    <Text style={styles.priceAmount}>
                      ${(selectedPrice.unit_amount / 100).toFixed(0)}
                      <Text style={styles.pricePer}>/{selectedInterval === "year" ? "year" : "month"}</Text>
                    </Text>
                    {monthlyEquiv && (
                      <Text style={styles.priceEquiv}>{monthlyEquiv} — billed annually</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.priceAmount}>$20/mo</Text>
                )}
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={handleCheckout}
              disabled={checkoutLoading || !selectedPrice}
              activeOpacity={0.85}
              style={styles.ctaWrap}
            >
              <LinearGradient colors={[ACCENT, "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                {checkoutLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.ctaText}>Start Pro — {selectedInterval === "year" ? "Best Value" : "Monthly"}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.finePrint}>Cancel anytime. Secure checkout — stays right here in the app.</Text>

            {/* Features */}
            <View style={[styles.featuresCard, { overflow: "hidden" }]}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.50)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }]} />
              <View style={styles.featuresContent}>
                <Text style={styles.featuresTitle}>Everything included</Text>
                {FEATURES.map((f) => (
                  <View key={f.icon} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: `${ACCENT}18` }]}>
                      <Feather name={f.icon as any} size={14} color={ACCENT} />
                    </View>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Free tier reminder */}
            <View style={styles.freeTier}>
              <Text style={styles.freeTierText}>Free plan: 10 prompts to try Zenith</Text>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      {/* In-app Stripe checkout — never leaves the app */}
      <Modal
        visible={!!checkoutUrl}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCheckoutUrl(null)}
      >
        <View style={styles.webviewContainer}>
          <View style={[styles.webviewHeader, { paddingTop: insets.top + 4 }]}>
            <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.webviewClose} activeOpacity={0.7}>
              <Feather name="x" size={20} color="rgba(240,240,255,0.7)" />
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>Secure Checkout</Text>
            <View style={styles.webviewSecure}>
              <Feather name="lock" size={12} color={ACCENT} />
              <Text style={styles.webviewSecureText}>Stripe</Text>
            </View>
          </View>
          {checkoutUrl && (
            <WebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleWebViewNav}
              style={styles.webview}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator color={ACCENT} size="large" />
                </View>
              )}
              onError={() => {
                setCheckoutUrl(null);
                Alert.alert("Connection error", "Could not load checkout. Please check your connection and try again.");
              }}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 500) {
                  setCheckoutUrl(null);
                  Alert.alert("Checkout unavailable", "Something went wrong. Please try again in a moment.");
                }
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#f0f0ff", fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  hero: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  heroBadge: { width: 68, height: 68, borderRadius: 34, marginBottom: 16, overflow: "hidden" },
  heroBadgeGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#f0f0ff", fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  heroSub: { color: "rgba(240,240,255,0.6)", fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  toggleRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 3, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  toggleBtnActive: { backgroundColor: "rgba(255,255,255,0.10)" },
  toggleLabel: { color: "rgba(240,240,255,0.5)", fontSize: 14, fontWeight: "600" },
  toggleLabelActive: { color: "#f0f0ff" },
  savingsBadge: { backgroundColor: ACCENT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  savingsText: { color: "#000", fontSize: 11, fontWeight: "800" },
  priceCard: { borderRadius: 20, minHeight: 110, marginBottom: 14, overflow: "hidden" },
  priceContent: { padding: 20, alignItems: "center" },
  priceName: { color: "rgba(240,240,255,0.6)", fontSize: 13, marginBottom: 6, fontWeight: "600", letterSpacing: 0.5 },
  priceAmount: { color: "#f0f0ff", fontSize: 42, fontWeight: "800" },
  pricePer: { color: "rgba(240,240,255,0.5)", fontSize: 18, fontWeight: "500" },
  priceEquiv: { color: "rgba(240,240,255,0.45)", fontSize: 13, marginTop: 4 },
  ctaWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  cta: { paddingVertical: 16, alignItems: "center" },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "800" },
  finePrint: { color: "rgba(240,240,255,0.35)", fontSize: 12, textAlign: "center", marginBottom: 24 },
  featuresCard: { borderRadius: 16, marginBottom: 20 },
  featuresContent: { padding: 18 },
  featuresTitle: { color: "#f0f0ff", fontSize: 14, fontWeight: "700", marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  featureIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureLabel: { color: "rgba(240,240,255,0.75)", fontSize: 13, flex: 1 },
  freeTier: { alignItems: "center", marginTop: 4 },
  freeTierText: { color: "rgba(240,240,255,0.3)", fontSize: 12 },

  // Success state
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successIcon: { width: 80, height: 80, borderRadius: 40, overflow: "hidden", marginBottom: 24 },
  successIconGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: { color: "#f0f0ff", fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  successSub: { color: "rgba(240,240,255,0.55)", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  successCTA: { borderRadius: 16, overflow: "hidden", width: "100%" },
  successCTAGrad: { paddingVertical: 16, alignItems: "center" },
  successCTAText: { color: "#000", fontSize: 16, fontWeight: "800" },

  // WebView modal
  webviewContainer: { flex: 1, backgroundColor: "#07070d" },
  webviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  webviewClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  webviewTitle: { color: "#f0f0ff", fontSize: 15, fontWeight: "700" },
  webviewSecure: { flexDirection: "row", alignItems: "center", gap: 4 },
  webviewSecureText: { color: ACCENT, fontSize: 12, fontWeight: "600" },
  webview: { flex: 1 },
  webviewLoading: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#07070d" } as any,
});
