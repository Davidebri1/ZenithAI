export interface AiProvider {
  key: string;
  name: string;
  model: string;
  initial: string;
  color: string;
  colorLight: string;
  colorDark: string;
  colorGlow: string;
  tagline: string;
  /** Tier required to use this model */
  tier: "free" | "pro" | "elite";
  /** Providers backed by Groq (primary) + OpenRouter (fallback) */
  usesGroq?: boolean;
  /** Provider backed by OpenRouter free tier (zero cost) */
  usesOpenRouterFree?: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  // ── FREE TIER ──────────────────────────────────────────────────
  {
    key: "llama",
    name: "Llama",
    model: "3.3 70B · Groq",
    initial: "L",
    color: "#e040fb",
    colorLight: "#e040fb12",
    colorDark: "#cc22ee",
    colorGlow: "#e040fb35",
    tagline: "Open-source powerhouse",
    tier: "free",
    usesGroq: true,
  },
  {
    key: "mistral",
    name: "Mistral",
    model: "8x7B · Groq",
    initial: "M",
    color: "#ffc400",
    colorLight: "#ffc40012",
    colorDark: "#e0aa00",
    colorGlow: "#ffc40035",
    tagline: "Efficient & precise",
    tier: "free",
    usesGroq: true,
  },
  {
    key: "gemma",
    name: "Gemma",
    model: "3 27B · Free",
    initial: "G",
    color: "#34d399",
    colorLight: "#34d39912",
    colorDark: "#10b981",
    colorGlow: "#34d39935",
    tagline: "Google's open model",
    tier: "free",
    usesOpenRouterFree: true,
  },
  {
    key: "phi",
    name: "Phi",
    model: "4 · Free",
    initial: "P",
    color: "#60a5fa",
    colorLight: "#60a5fa12",
    colorDark: "#3b82f6",
    colorGlow: "#60a5fa35",
    tagline: "Microsoft's efficient AI",
    tier: "free",
    usesOpenRouterFree: true,
  },
  {
    key: "deepseek-free",
    name: "DeepSeek",
    model: "V3 · Free",
    initial: "D",
    color: "#818cf8",
    colorLight: "#818cf812",
    colorDark: "#6366f1",
    colorGlow: "#818cf835",
    tagline: "Code & logic · free tier",
    tier: "free",
    usesOpenRouterFree: true,
  },
  {
    key: "qwen-free",
    name: "Qwen",
    model: "3 30B · Free",
    initial: "Q",
    color: "#4ade80",
    colorLight: "#4ade8012",
    colorDark: "#22c55e",
    colorGlow: "#4ade8035",
    tagline: "Multilingual · free tier",
    tier: "free",
    usesOpenRouterFree: true,
  },

  // ── PRO TIER ($20) ────────────────────────────────────────────
  {
    key: "openai",
    name: "ChatGPT",
    model: "GPT-4.1",
    initial: "C",
    color: "#00e5b0",
    colorLight: "#00e5b012",
    colorDark: "#00c99a",
    colorGlow: "#00e5b035",
    tagline: "Creative & versatile",
    tier: "pro",
  },
  {
    key: "anthropic",
    name: "Claude",
    model: "Sonnet 4.6",
    initial: "C",
    color: "#ff6b47",
    colorLight: "#ff6b4712",
    colorDark: "#e85530",
    colorGlow: "#ff6b4735",
    tagline: "Deep reasoning & nuance",
    tier: "pro",
  },
  {
    key: "gemini",
    name: "Gemini",
    model: "Flash 3",
    initial: "G",
    color: "#7c5fff",
    colorLight: "#7c5fff12",
    colorDark: "#6644e8",
    colorGlow: "#7c5fff35",
    tagline: "Multimodal & fast",
    tier: "pro",
  },
  {
    key: "grok",
    name: "Grok",
    model: "3 Beta",
    initial: "G",
    color: "#00d4ff",
    colorLight: "#00d4ff12",
    colorDark: "#00b8e0",
    colorGlow: "#00d4ff35",
    tagline: "Real-time & unfiltered",
    tier: "pro",
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    model: "R1",
    initial: "D",
    color: "#4d6bfe",
    colorLight: "#4d6bfe12",
    colorDark: "#3a55e8",
    colorGlow: "#4d6bfe35",
    tagline: "Deep reasoning specialist",
    tier: "pro",
  },
  {
    key: "qwen",
    name: "Qwen",
    model: "3 235B",
    initial: "Q",
    color: "#69ff47",
    colorLight: "#69ff4712",
    colorDark: "#4ae828",
    colorGlow: "#69ff4735",
    tagline: "Multilingual & broad",
    tier: "pro",
  },

  // ── ELITE TIER ($50) ─────────────────────────────────────────
  {
    key: "openai-elite",
    name: "GPT o3",
    model: "o3 Full",
    initial: "O",
    color: "#f0c040",
    colorLight: "#f0c04012",
    colorDark: "#d4a800",
    colorGlow: "#f0c04040",
    tagline: "Advanced reasoning · elite",
    tier: "elite",
  },
  {
    key: "claude-opus",
    name: "Claude Opus",
    model: "Opus 4",
    initial: "O",
    color: "#ff8c60",
    colorLight: "#ff8c6012",
    colorDark: "#f06030",
    colorGlow: "#ff8c6040",
    tagline: "Most capable Claude · elite",
    tier: "elite",
  },
];

export const GROQ_PROVIDERS = new Set(AI_PROVIDERS.filter((p) => p.usesGroq).map((p) => p.key));
export const FREE_OR_PROVIDERS = new Set(AI_PROVIDERS.filter((p) => p.usesOpenRouterFree).map((p) => p.key));

/** Returns the API path segment for a provider */
export function providerApiPath(key: string): string {
  if (GROQ_PROVIDERS.has(key)) return `${key}/groq`;
  if (FREE_OR_PROVIDERS.has(key)) return `${key}/free`;
  return key;
}

/** Returns providers accessible for a given plan */
export function accessibleProviders(plan: string): AiProvider[] {
  if (plan === "elite") return AI_PROVIDERS;
  if (plan === "pro") return AI_PROVIDERS.filter((p) => p.tier !== "elite");
  return AI_PROVIDERS.filter((p) => p.tier === "free");
}

export const SYNTHESIS_COLOR = "#ffd700";
export const SYNTHESIS_COLOR_DARK = "#cc9900";
export const SYNTHESIS_COLOR_GLOW = "#ffd70040";

export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
