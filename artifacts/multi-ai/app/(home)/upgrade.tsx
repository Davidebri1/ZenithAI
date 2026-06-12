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
import { BgImage } from "@/components/BgImage";

const ACCENT_PRO = "#22c55e";
const ACCENT_PRO_GLOW = "#22c55e55";
const ACCENT_ELITE = "#f0c040";
const ACCENT_ELITE_GLOW = "#f0c04055";

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

const PRO_FEATURES = [
  { icon: "zap", label: "500 prompts/month across all frontier models" },
  { icon: "layers", label: "GPT-4.1, Claude Sonnet, Gemini Flash, Grok 3, DeepSeek R1 & more" },
  { icon: "cpu", label: "Synthesis — AI-powered cross-model consensus" },
  { icon: "search", label: "Search across all your conversations" },
  { icon: "clock", label: "Full session history" },
  { icon: "shield", label: "Priority access to new text models" },
];

const ELITE_FEATURES = [
  { icon: "star", label: "Everything in Pro" },
  { icon: "image", label: "Standard image generation (DALL·E, Stable Diffusion)" },
  { icon: "film", label: "Standard video generation (Runway, Pika)" },
  { icon: "music", label: "Standard music generation (Suno, Udio)" },
  { icon: "award", label: "1,000 prompts/month" },
  { icon: "zap", label: "Early access to advanced media models (coming soon)" },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">("year");
  const [selectedTier, setSelectedTier] = useState<"pro" | "elite">("pro");
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

  // Products are sorted by price ascending — Pro is index 0, Elite is index 1
  const proProduct = products.find((p) => {
    const monthly = p.prices?.find((pr) => pr.recurring?.interval === "month");
    return monthly && monthly.unit_amount <= 2500; // <= $25/mo → Pro
  }) ?? products[0] ?? null;
  const eliteProduct = products.find((p) => {
    const monthly = p.prices?.find((pr) => pr.recurring?.interval === "month");
    return monthly && monthly.unit_amount > 2500; // > $25/mo → Elite
  }) ?? products[1] ?? null;

  const activeProduct = selectedTier === "elite" ? eliteProduct : proProduct;
  const ACCENT = selectedTier === "elite" ? ACCENT_ELITE : ACCENT_PRO;
  const ACCENT_GLOW = selectedTier === "elite" ? ACCENT_ELITE_GLOW : ACCENT_PRO_GLOW;

  const selectedPrice = activeProduct?.prices?.find(
    (p) => p.recurring?.interval === selectedInterval
  );
  const otherPrice = activeProduct?.prices?.find(
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
      <BgImage style={StyleSheet.absoluteFill}>
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
          <Text style={styles.successTitle}>
            Welcome to {selectedTier === "elite" ? "Elite" : "Pro"}!
          </Text>
          <Text style={styles.successSub}>
            {selectedTier === "elite"
              ? "You now have full access to all frontier models and media generation."
              : "You now have access to all frontier AI models. Start comparing."}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(home)")} style={styles.successCTA} activeOpacity={0.85}>
            <LinearGradient colors={[ACCENT, selectedTier === "elite" ? "#b8900a" : "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successCTAGrad}>
              <Text style={styles.successCTAText}>Start comparing</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BgImage>
    );
  }

  const activeFeatures = selectedTier === "elite" ? ELITE_FEATURES : PRO_FEATURES;
  const ctaColors: [string, string] = selectedTier === "elite" ? [ACCENT_ELITE, "#b8900a"] : [ACCENT_PRO, "#16a34a"];

  return (
    <>
      <BgImage style={StyleSheet.absoluteFill}>
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
            <Text style={styles.headerTitle}>Upgrade Zenith</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={[styles.heroBadge, Platform.OS === "web" ? { boxShadow: `0 0 32px ${ACCENT_GLOW}` } as object : {}]}>
                <LinearGradient colors={[`${ACCENT}30`, `${ACCENT}08`]} style={styles.heroBadgeGrad}>
                  <Feather name={selectedTier === "elite" ? "star" : "zap"} size={28} color={ACCENT} />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>
                {selectedTier === "elite" ? "Zenith Elite" : "Zenith Pro"}
              </Text>
              <Text style={styles.heroSub}>
                {selectedTier === "elite"
                  ? "Frontier AI models + image, video & music generation."
                  : "Unlock all frontier text models — GPT, Claude, Gemini, Grok & more."}
              </Text>
            </View>

            {/* Tier selector */}
            <View style={styles.tierRow}>
              <TouchableOpacity
                onPress={() => setSelectedTier("pro")}
                style={[styles.tierBtn, selectedTier === "pro" && { borderColor: ACCENT_PRO, backgroundColor: `${ACCENT_PRO}12` }]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedTier === "pro" ? [`${ACCENT_PRO}30`, `${ACCENT_PRO}00`] : ["transparent", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.tierBtnBadge, { backgroundColor: `${ACCENT_PRO}20`, borderColor: `${ACCENT_PRO}50` }]}>
                  <Feather name="zap" size={11} color={ACCENT_PRO} />
                  <Text style={[styles.tierBtnBadgeText, { color: ACCENT_PRO }]}>PRO</Text>
                </View>
                <Text style={styles.tierBtnPrice}>$20<Text style={styles.tierBtnPricePer}>/mo</Text></Text>
                <Text style={styles.tierBtnSub}>All frontier text models</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedTier("elite")}
                style={[styles.tierBtn, selectedTier === "elite" && { borderColor: ACCENT_ELITE, backgroundColor: `${ACCENT_ELITE}10` }]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedTier === "elite" ? [`${ACCENT_ELITE}28`, `${ACCENT_ELITE}00`] : ["transparent", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.tierBtnBadge, { backgroundColor: `${ACCENT_ELITE}20`, borderColor: `${ACCENT_ELITE}50` }]}>
                  <Feather name="star" size={11} color={ACCENT_ELITE} />
                  <Text style={[styles.tierBtnBadgeText, { color: ACCENT_ELITE }]}>ELITE</Text>
                </View>
                <Text style={styles.tierBtnPrice}>$50<Text style={styles.tierBtnPricePer}>/mo</Text></Text>
                <Text style={styles.tierBtnSub}>Pro + media generation</Text>
              </TouchableOpacity>
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
                    <Text style={[styles.priceName, { color: ACCENT }]}>{activeProduct?.name ?? (selectedTier === "elite" ? "Zenith Elite" : "Zenith Pro")}</Text>
                    <Text style={styles.priceAmount}>
                      ${(selectedPrice.unit_amount / 100).toFixed(0)}
                      <Text style={styles.pricePer}>/{selectedInterval === "year" ? "year" : "month"}</Text>
                    </Text>
                    {monthlyEquiv && (
                      <Text style={styles.priceEquiv}>{monthlyEquiv} — billed annually</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.priceAmount}>{selectedTier === "elite" ? "$50/mo" : "$20/mo"}</Text>
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
              <LinearGradient colors={ctaColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                {checkoutLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.ctaText}>
                    Start {selectedTier === "elite" ? "Elite" : "Pro"} — {selectedInterval === "year" ? "Best Value" : "Monthly"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.finePrint}>Cancel anytime. Secure checkout — stays right here in the app.</Text>

            {/* Features */}
            <View style={[styles.featuresCard, { overflow: "hidden" }]}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.50)", borderRadius: 16, borderWidth: 1, borderColor: `${ACCENT}18` }]} />
              <View style={styles.featuresContent}>
                <Text style={[styles.featuresTitle, { color: ACCENT }]}>
                  {selectedTier === "elite" ? "Elite includes" : "Pro includes"}
                </Text>
                {activeFeatures.map((f) => (
                  <View key={f.label} style={styles.featureRow}>
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
              <Text style={styles.freeTierText}>Free plan: 10 prompts to explore Zenith</Text>
            </View>
          </ScrollView>
        </View>
      </BgImage>

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
  savingsBadge: { backgroundColor: ACCENT_PRO, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  savingsText: { color: "#000", fontSize: 11, fontWeight: "800" },
  tierRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tierBtn: {
    flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    padding: 14, gap: 6, overflow: "hidden", alignItems: "flex-start",
  },
  tierBtnBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3,
  },
  tierBtnBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  tierBtnPrice: { color: "#f0f0ff", fontSize: 28, fontWeight: "800", marginTop: 2 },
  tierBtnPricePer: { color: "rgba(240,240,255,0.5)", fontSize: 13, fontWeight: "500" },
  tierBtnSub: { color: "rgba(240,240,255,0.45)", fontSize: 11, fontWeight: "400" },
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
  webviewSecureText: { color: ACCENT_PRO, fontSize: 12, fontWeight: "600" },
  webview: { flex: 1 },
  webviewLoading: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#07070d" } as any,
});
