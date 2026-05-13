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
];

export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
