export interface AiProvider {
  key: string;
  name: string;
  model: string;
  initial: string;
  color: string;
  colorLight: string;
  colorDark: string;
  colorGlow: string;
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
  },
  {
    key: "grok",
    name: "Grok",
    model: "4.20",
    initial: "G",
    color: "#00d4ff",
    colorLight: "#00d4ff12",
    colorDark: "#00b8e0",
    colorGlow: "#00d4ff35",
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    model: "V4 Flash",
    initial: "D",
    color: "#4d6bfe",
    colorLight: "#4d6bfe12",
    colorDark: "#3a55e8",
    colorGlow: "#4d6bfe35",
  },
  {
    key: "mistral",
    name: "Mistral",
    model: "Large",
    initial: "M",
    color: "#ffc400",
    colorLight: "#ffc40012",
    colorDark: "#e0aa00",
    colorGlow: "#ffc40035",
  },
  {
    key: "llama",
    name: "Llama",
    model: "4 Maverick",
    initial: "L",
    color: "#e040fb",
    colorLight: "#e040fb12",
    colorDark: "#cc22ee",
    colorGlow: "#e040fb35",
  },
  {
    key: "qwen",
    name: "Qwen",
    model: "3.6 Plus",
    initial: "Q",
    color: "#69ff47",
    colorLight: "#69ff4712",
    colorDark: "#4ae828",
    colorGlow: "#69ff4735",
  },
];

export const SYNTHESIS_COLOR = "#ffd700";
export const SYNTHESIS_COLOR_DARK = "#cc9900";
export const SYNTHESIS_COLOR_GLOW = "#ffd70040";

export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
