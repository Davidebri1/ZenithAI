import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";
import { authFetch } from "@/constants/apiAuth";
import { BASE_URL, AI_PROVIDERS } from "@/constants/aiConfig";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";

const BG = require("../../assets/images/bg-alley.png");
const BG_FOCAL: object = {};
const { width: SW } = Dimensions.get("window");

const GOLD = "#f59e0b";
const ACCENT = "#22c55e";

const MODELS = AI_PROVIDERS.map((p) => ({ name: p.name, color: p.color }));

const TIERS = [
  {
    name: "Starter",
    price: "$20",
    period: "/mo",
    seats: "1 user",
    prompts: "Unlimited",
    models: "All models",
    support: "In-app support",
    highlight: false,
    cta: "Get Started",
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    seats: "Up to 5 users",
    prompts: "Unlimited",
    models: "All models",
    support: "Priority support",
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
    models: "All models + custom",
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
  { icon: "zap", title: "API Access", desc: "Programmatic access to All AI Models via unified REST API" },
];

const LOGOS = ["Acme Corp", "Nexus AI", "BuildFast", "Vertex Labs", "DataMind", "ShiftOps"];

type ContactState = "idle" | "sending" | "sent";

export default function EnterpriseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [contactOpen, setContactOpen] = useState(false);
  const [contactState, setContactState] = useState<ContactState>("idle");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  async function handleSendInquiry() {
    if (!name.trim() || !message.trim()) return;
    setContactState("sending");
    try {
      const res = await authFetch(`${BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), company: company.trim(), message: message.trim(), email: userEmail }),
      });
      if (!res.ok) throw new Error("Failed");
      setContactState("sent");
    } catch {
      setContactState("idle");
      Alert.alert("Failed to send", "Please check your connection and try again.");
    }
  }

  function handleCloseContact() {
    setContactOpen(false);
    setContactState("idle");
    setName("");
    setCompany("");
    setMessage("");
  }

  function handleTierCTA(tier: typeof TIERS[0]) {
    if (tier.name === "Enterprise") {
      setContactOpen(true);
    } else {
      router.push("/(home)/upgrade");
    }
  }

  return (
    <>
      <ImageBackground source={BG} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={BG_FOCAL}>
        <LinearGradient
          colors={["rgba(7,7,20,0.90)", "rgba(7,7,20,0.78)", "rgba(7,7,20,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <NeonGlowOverlay />

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
              <Text style={styles.heroTitle}>One prompt.{"\n"}All the answers.</Text>
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
                <Feather name="users" size={22} color={GOLD} style={{ marginBottom: 10 }} />
                <Text style={styles.ctaBannerTitle}>Ready to bring Zenith to your team?</Text>
                <Text style={styles.ctaBannerSub}>Get custom pricing, a dedicated success manager, and white-glove onboarding.</Text>
                <TouchableOpacity onPress={() => setContactOpen(true)} activeOpacity={0.85} style={styles.ctaBannerBtn}>
                  <Text style={styles.ctaBannerBtnText}>Contact Sales</Text>
                  <Feather name="arrow-right" size={14} color={GOLD} />
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </View>
      </ImageBackground>

      {/* In-app contact form modal */}
      <Modal
        visible={contactOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseContact}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.formSheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
            {/* Form header */}
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={handleCloseContact} style={styles.formClose}>
                <Feather name="x" size={20} color="rgba(240,240,255,0.6)" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Contact Sales</Text>
              <View style={{ width: 36 }} />
            </View>

            {contactState === "sent" ? (
              <View style={styles.sentState}>
                <View style={styles.sentIcon}>
                  <Feather name="check" size={28} color={ACCENT} />
                </View>
                <Text style={styles.sentTitle}>Message sent</Text>
                <Text style={styles.sentSub}>Our team will follow up with you shortly about enterprise pricing and onboarding.</Text>
                <TouchableOpacity onPress={handleCloseContact} style={styles.sentBtn} activeOpacity={0.85}>
                  <Text style={styles.sentBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.formSub}>Tell us a bit about your team and we'll get back to you with a custom plan.</Text>

                <Text style={styles.fieldLabel}>Your name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Jane Smith"
                  placeholderTextColor="rgba(240,240,255,0.2)"
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>Company</Text>
                <TextInput
                  style={styles.input}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Acme Corp"
                  placeholderTextColor="rgba(240,240,255,0.2)"
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>What are you looking for? <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Team size, use case, questions..."
                  placeholderTextColor="rgba(240,240,255,0.2)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  onPress={handleSendInquiry}
                  disabled={contactState === "sending" || !name.trim() || !message.trim()}
                  activeOpacity={0.85}
                  style={[styles.sendBtn, (!name.trim() || !message.trim()) && styles.sendBtnDisabled]}
                >
                  {contactState === "sending" ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send inquiry</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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

  // Contact form modal
  formSheet: { flex: 1, backgroundColor: "#0d0d1a" },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  formClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  formTitle: { color: "#f0f0ff", fontSize: 16, fontWeight: "700" },
  formScroll: { padding: 20 },
  formSub: { color: "rgba(240,240,255,0.45)", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  fieldLabel: { color: "rgba(240,240,255,0.6)", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  required: { color: GOLD },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f0f0ff",
    fontSize: 15,
    marginBottom: 18,
  },
  inputMulti: { minHeight: 100, paddingTop: 12 },
  sendBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },

  // Sent state
  sentState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  sentIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${ACCENT}18`, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  sentTitle: { color: "#f0f0ff", fontSize: 24, fontWeight: "800", marginBottom: 10 },
  sentSub: { color: "rgba(240,240,255,0.5)", fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 32 },
  sentBtn: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40 },
  sentBtnText: { color: "#f0f0ff", fontSize: 15, fontWeight: "700" },
});
