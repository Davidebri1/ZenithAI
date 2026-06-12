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
  /** Providers backed by Groq (primary) + OpenRouter (fallback) */
  usesGroq?: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    key: "openai",
    name: "ChatGPT",
    model: "GPT-5.4",
    initial: "C",
    color: "#00e5b0",
    colorLight: "#00e5b012",
    colorDark: "#00c99a",
    colorGlow: "#00e5b035",
    tagline: "Creative & versatile",
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
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    model: "V3",
    initial: "D",
    color: "#4d6bfe",
    colorLight: "#4d6bfe12",
    colorDark: "#3a55e8",
    colorGlow: "#4d6bfe35",
    tagline: "Code & logic specialist",
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
    usesGroq: true,
  },
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
    usesGroq: true,
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
  },
];

export const GROQ_PROVIDERS = new Set(AI_PROVIDERS.filter((p) => p.usesGroq).map((p) => p.key));

/** Returns the API path segment for a provider (groq-backed vs standard) */
export function providerApiPath(key: string): string {
  return GROQ_PROVIDERS.has(key) ? `${key}/groq` : key;
}

export const SYNTHESIS_COLOR = "#ffd700";
export const SYNTHESIS_COLOR_DARK = "#cc9900";
export const SYNTHESIS_COLOR_GLOW = "#ffd70040";

export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
