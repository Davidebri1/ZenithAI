import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ProviderMode {
  key: string;
  label: string;
  emoji: string;
}

export const PROVIDER_MODES: Record<string, ProviderMode[]> = {
  openai: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think",          emoji: "🧠" },
    { key: "deep",     label: "Deep Research",  emoji: "🔬" },
  ],
  "openai-elite": [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think",          emoji: "🧠" },
    { key: "deep",     label: "Deep Research",  emoji: "🔬" },
  ],
  anthropic: [
    { key: "standard", label: "Standard",         emoji: "⚡" },
    { key: "think",    label: "Extended Thinking", emoji: "🧠" },
    { key: "deep",     label: "Deep Research",     emoji: "🔬" },
  ],
  "claude-opus": [
    { key: "standard", label: "Standard",         emoji: "⚡" },
    { key: "think",    label: "Extended Thinking", emoji: "🧠" },
    { key: "deep",     label: "Deep Research",     emoji: "🔬" },
  ],
  gemini: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think",          emoji: "🧠" },
    { key: "deep",     label: "Deep Research",  emoji: "🔬" },
  ],
  grok: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think",          emoji: "🧠" },
    { key: "deep",     label: "Deep Research",  emoji: "🔬" },
  ],
  deepseek: [
    { key: "standard", label: "Standard",         emoji: "⚡" },
    { key: "think",    label: "DeepThink (R1)",   emoji: "🧠" },
    { key: "deep",     label: "Deep Research",     emoji: "🔬" },
  ],
  "deepseek-free": [
    { key: "standard", label: "Standard",      emoji: "⚡" },
  ],
  mistral: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think",          emoji: "🧠" },
    { key: "deep",     label: "Deep Research",  emoji: "🔬" },
  ],
  llama: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think",          emoji: "🧠" },
    { key: "deep",     label: "Deep Research",  emoji: "🔬" },
  ],
  qwen: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
    { key: "think",    label: "Think (QwQ)",   emoji: "🧠" },
    { key: "deep",     label: "Deep Research", emoji: "🔬" },
  ],
  "qwen-free": [
    { key: "standard", label: "Standard",      emoji: "⚡" },
  ],
  gemma: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
  ],
  phi: [
    { key: "standard", label: "Standard",      emoji: "⚡" },
  ],
};

const MODES_KEY = "@zenith_provider_modes_v1";

export async function getProviderMode(providerKey: string): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(MODES_KEY);
    if (raw) return (JSON.parse(raw) as Record<string, string>)[providerKey] ?? "standard";
  } catch {}
  return "standard";
}

export async function setProviderMode(providerKey: string, mode: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(MODES_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    existing[providerKey] = mode;
    await AsyncStorage.setItem(MODES_KEY, JSON.stringify(existing));
  } catch {}
}

export async function getAllProviderModes(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(MODES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {}
  return {};
}
