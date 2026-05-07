export interface AiProvider {
  key: string;
  name: string;
  model: string;
  initial: string;
  color: string;
  colorLight: string;
  colorDark: string;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    key: "openai",
    name: "ChatGPT",
    model: "GPT-5.4",
    initial: "G",
    color: "#10a37f",
    colorLight: "#10a37f18",
    colorDark: "#0d8a6a",
  },
  {
    key: "anthropic",
    name: "Claude",
    model: "Sonnet 4.6",
    initial: "C",
    color: "#d4761c",
    colorLight: "#d4761c18",
    colorDark: "#b5621a",
  },
  {
    key: "gemini",
    name: "Gemini",
    model: "Flash 3",
    initial: "G",
    color: "#4285f4",
    colorLight: "#4285f418",
    colorDark: "#3470d4",
  },
];

export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
