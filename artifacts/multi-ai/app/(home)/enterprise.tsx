import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ImageBackground,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BG = require("../../assets/images/bg-alley.png");
const { width: SW } = Dimensions.get("window");

const GOLD = "#f59e0b";
const GOLD_GLOW = "#f59e0b44";
const ACCENT = "#22c55e";

const MODELS = [
  { name: "GPT", color: "#74aa9c" },
  { name: "Claude", color: "#d97757" },
  { name: "Gemini", color: "#4285f4" },
  { name: "Grok", color: "#e2e8f0" },
  { name: "DeepSeek", color: "#4f9cf9" },
  { name: "Mistral", color: "#f97316" },
  { name: "Llama", color: "#a855f7" },
  { name: "Qwen", color: "#06b6d4" },
];

const TIERS = [
  {
    name: "Starter",
    price: "$14.99",
    period: "/mo",
    seats: "1 user",
    prompts: "Unlimited",
    models: "All 8 models",
    support: "Email",
    highlight: false,
    cta: "Get Started",
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    seats: "Up to 5 users",
    prompts: "Unlimited",
    models: "All 8 models",
    support: "Priority email",
    highlight: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    seats: "Unlimited seats",
    prompts: "Unlimited",
    models: "All 8 models + custom",
    support: "Dedicated CSM",
    highlight: false,
    cta: "Contact Sales",
  },
];

const ENTERPRISE_FEATURES = [
  { icon: "shield", title: "SSO & SAML", desc: "Integrate with Okta, Azure AD, Google Workspace" },
  { icon: "users", title: "Team Management", desc: "Centralized billing, role-based access control" },
  { icon: "trending-up", title: "Usage Analytics", desc: "Per-user and team-level prompt analytics dashboard" },
  { icon: "cpu", title: "Custom Models", desc: "Bring your own fine-tuned or private AI endpoints" },
  { icon: "lock", title: "Data Privacy", desc: "No training on your data, SOC2 Type II available" },
  { icon: "zap", title: "API Access", desc: "Programmatic access to all 8 models via unified REST API" },
];

const LOGOS = ["Acme Corp", "Nexus AI", "BuildFast", "Vertex Labs", "DataMind", "ShiftOps"];

export default function EnterpriseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleContact() {
    Linking.openURL("mailto:enterprise@oneai.app?subject=Enterprise%20Inquiry");
  }

  function handleTierCTA(tier: typeof TIERS[0]) {
    if (tier.name === "Enterprise") {
      handleContact();
    } else {
      router.push("/(home)/upgrade");
    }
  }

  return (
    <ImageBackground source={BG} style={StyleSheet.absoluteFill} resizeMode="cover">
      <LinearGradient
        colors={["rgba(7,7,20,0.90)", "rgba(7,7,20,0.78)", "rgba(7,7,20,0.95)"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={22} color="rgba(240,240,255,0.7)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plans & Pricing</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.modelPillRow}>
              {MODELS.map((m) => (
                <View key={m.name} style={[styles.modelPill, { borderColor: `${m.color}50`, backgroundColor: `${m.color}12` }]}>
                  <View style={[styles.modelDot, { backgroundColor: m.color }]} />
                  <Text style={[styles.modelPillText, { color: m.color }]}>{m.name}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.heroTitle}>One prompt.{"\n"}Eight answers.</Text>
            <Text style={styles.heroSub}>
              Compare every major AI model side by side. Stop guessing which one is best — see them all at once.
            </Text>
          </View>

          {/* Pricing cards */}
          <View style={styles.tiersRow}>
            {TIERS.map((tier) => (
              <View
                key={tier.name}
                style={[
                  styles.tierCard,
                  tier.highlight && styles.tierCardHighlight,
                  Platform.OS === "web" && tier.highlight
                    ? { boxShadow: `0 0 0 1px ${ACCENT}60, 0 0 40px ${ACCENT}18` } as object
                    : {},
                ]}
              >
                <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: tier.highlight ? "rgba(34,197,94,0.08)" : "rgba(7,7,20,0.55)",
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: tier.highlight ? `${ACCENT}50` : "rgba(255,255,255,0.07)",
                  }
                ]} />

                {tier.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tier.badge}</Text>
                  </View>
                )}

                <View style={styles.tierContent}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <View style={styles.tierPriceRow}>
                    <Text style={[styles.tierPrice, tier.name === "Enterprise" && { fontSize: 22 }]}>{tier.price}</Text>
                    {tier.period ? <Text style={styles.tierPeriod}>{tier.period}</Text> : null}
                  </View>

                  <View style={styles.tierDivider} />

                  {[
                    { icon: "users" as const, val: tier.seats },
                    { icon: "zap" as const, val: tier.prompts },
                    { icon: "cpu" as const, val: tier.models },
                    { icon: "headphones" as const, val: tier.support },
                  ].map((row) => (
                    <View key={row.icon} style={styles.tierRow}>
                      <Feather name={row.icon} size={12} color={tier.highlight ? ACCENT : "rgba(240,240,255,0.4)"} />
                      <Text style={[styles.tierRowText, tier.highlight && { color: "rgba(240,240,255,0.9)" }]}>{row.val}</Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={() => handleTierCTA(tier)}
                    activeOpacity={0.85}
                    style={[styles.tierCTA, tier.highlight && styles.tierCTAHighlight]}
                  >
                    {tier.highlight ? (
                      <LinearGradient colors={[ACCENT, "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tierCTAGrad}>
                        <Text style={[styles.tierCTAText, { color: "#000" }]}>{tier.cta}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.tierCTAText}>{tier.cta}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Social proof */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TRUSTED BY TEAMS AT</Text>
            <View style={styles.logoRow}>
              {LOGOS.map((l) => (
                <View key={l} style={styles.logoPill}>
                  <Text style={styles.logoText}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Enterprise features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Built for teams</Text>
            <Text style={styles.sectionSub}>Everything your organization needs to run AI at scale.</Text>
            <View style={styles.featuresGrid}>
              {ENTERPRISE_FEATURES.map((f) => (
                <View key={f.title} style={[styles.featureCard, { overflow: "hidden" }]}>
                  <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.50)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }]} />
                  <View style={styles.featureCardContent}>
                    <View style={[styles.featureIcon, { backgroundColor: `${GOLD}18` }]}>
                      <Feather name={f.icon as any} size={16} color={GOLD} />
                    </View>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* CTA banner */}
          <View style={[styles.ctaBanner, { overflow: "hidden" }]}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[`${GOLD}22`, `${GOLD}08`, "transparent"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <View style={[StyleSheet.absoluteFill, { borderRadius: 20, borderWidth: 1, borderColor: `${GOLD}30` }]} />
            <View style={styles.ctaBannerContent}>
              <Feather name="mail" size={22} color={GOLD} style={{ marginBottom: 10 }} />
              <Text style={styles.ctaBannerTitle}>Ready to bring OneAI to your team?</Text>
              <Text style={styles.ctaBannerSub}>Get custom pricing, a dedicated success manager, and white-glove onboarding.</Text>
              <TouchableOpacity onPress={handleContact} activeOpacity={0.85} style={styles.ctaBannerBtn}>
                <Text style={styles.ctaBannerBtnText}>Contact Sales</Text>
                <Feather name="arrow-right" size={14} color={GOLD} />
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#f0f0ff", fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  hero: { alignItems: "center", marginBottom: 28, marginTop: 4 },
  modelPillRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 20 },
  modelPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  modelDot: { width: 6, height: 6, borderRadius: 3 },
  modelPillText: { fontSize: 11, fontWeight: "700" },
  heroTitle: { color: "#f0f0ff", fontSize: 30, fontWeight: "800", textAlign: "center", lineHeight: 36, marginBottom: 10 },
  heroSub: { color: "rgba(240,240,255,0.55)", fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },

  tiersRow: { gap: 12, marginBottom: 28 },
  tierCard: { borderRadius: 18, overflow: "hidden", minHeight: 260 },
  tierCardHighlight: {},
  badge: { position: "absolute", top: 14, right: 14, zIndex: 10, backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#000", fontSize: 10, fontWeight: "800" },
  tierContent: { padding: 18 },
  tierName: { color: "rgba(240,240,255,0.6)", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
  tierPriceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginBottom: 14 },
  tierPrice: { color: "#f0f0ff", fontSize: 32, fontWeight: "800" },
  tierPeriod: { color: "rgba(240,240,255,0.4)", fontSize: 14, marginBottom: 5 },
  tierDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginBottom: 12 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  tierRowText: { color: "rgba(240,240,255,0.55)", fontSize: 13 },
  tierCTA: { marginTop: 16, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  tierCTAHighlight: { backgroundColor: "transparent", padding: 0, borderWidth: 0 },
  tierCTAGrad: { width: "100%", paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  tierCTAText: { color: "rgba(240,240,255,0.85)", fontSize: 14, fontWeight: "700" },

  section: { marginBottom: 28 },
  sectionLabel: { color: "rgba(240,240,255,0.3)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12, textAlign: "center" },
  sectionTitle: { color: "#f0f0ff", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  sectionSub: { color: "rgba(240,240,255,0.5)", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  logoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  logoPill: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  logoText: { color: "rgba(240,240,255,0.35)", fontSize: 12, fontWeight: "600" },

  featuresGrid: { gap: 10 },
  featureCard: { borderRadius: 14 },
  featureCardContent: { padding: 16 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  featureTitle: { color: "#f0f0ff", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  featureDesc: { color: "rgba(240,240,255,0.5)", fontSize: 13, lineHeight: 18 },

  ctaBanner: { borderRadius: 20, marginTop: 4 },
  ctaBannerContent: { padding: 24, alignItems: "center" },
  ctaBannerTitle: { color: "#f0f0ff", fontSize: 19, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  ctaBannerSub: { color: "rgba(240,240,255,0.5)", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  ctaBannerBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: `${GOLD}50`, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: `${GOLD}12` },
  ctaBannerBtnText: { color: GOLD, fontSize: 14, fontWeight: "700" },
});
