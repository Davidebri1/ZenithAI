import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ProviderSettings {
  temperature: number;
  length: "concise" | "standard" | "detailed" | "exhaustive";
  tone: "default" | "professional" | "casual" | "creative" | "socratic";
  frequencyPenalty: number;
  presencePenalty: number;
  topK: number;
  safetyLevel: "block_few" | "block_some" | "block_most";
  safeMode: boolean;
}

export interface ProviderSettingsDef {
  temperature: boolean;
  length: boolean;
  tone: boolean;
  frequencyPenalty: boolean;
  presencePenalty: boolean;
  topK: boolean;
  safetyLevel: boolean;
  safeMode: boolean;
}

export const PROVIDER_SETTING_DEFS: Record<string, ProviderSettingsDef> = {
  openai:        { temperature: true,  length: true, tone: true, frequencyPenalty: true,  presencePenalty: true,  topK: false, safetyLevel: false, safeMode: false },
  "openai-elite":{ temperature: false, length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  anthropic:     { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: true,  safetyLevel: false, safeMode: false },
  "claude-opus": { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: true,  safetyLevel: false, safeMode: false },
  gemini:        { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: true,  safetyLevel: true,  safeMode: false },
  grok:          { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  deepseek:      { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  mistral:       { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: true  },
  llama:         { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  qwen:          { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  gemma:         { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  phi:           { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  "deepseek-free":{ temperature: true, length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
  "qwen-free":   { temperature: true,  length: true, tone: true, frequencyPenalty: false, presencePenalty: false, topK: false, safetyLevel: false, safeMode: false },
};

export const DEFAULT_SETTINGS: ProviderSettings = {
  temperature: 0.7,
  length: "standard",
  tone: "default",
  frequencyPenalty: 0,
  presencePenalty: 0,
  topK: 40,
  safetyLevel: "block_some",
  safeMode: false,
};

const GLOBAL_KEY = "@zenith_global_settings_v1";

export async function getGlobalSettings(providerKey: string): Promise<ProviderSettings> {
  try {
    const raw = await AsyncStorage.getItem(GLOBAL_KEY);
    if (raw) {
      const all = JSON.parse(raw) as Record<string, ProviderSettings>;
      if (all[providerKey]) return { ...DEFAULT_SETTINGS, ...all[providerKey] };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export async function setGlobalSettings(providerKey: string, settings: ProviderSettings): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GLOBAL_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, ProviderSettings>) : {};
    all[providerKey] = settings;
    await AsyncStorage.setItem(GLOBAL_KEY, JSON.stringify(all));
  } catch {}
}

export async function getAllGlobalSettings(): Promise<Record<string, ProviderSettings>> {
  try {
    const raw = await AsyncStorage.getItem(GLOBAL_KEY);
    if (raw) return JSON.parse(raw) as Record<string, ProviderSettings>;
  } catch {}
  return {};
}

export function settingsSummary(s: ProviderSettings): string {
  const temp = s.temperature <= 0.2 ? "Precise" : s.temperature <= 0.6 ? "Balanced" : s.temperature <= 1.0 ? "Creative" : "Wild";
  const parts = [temp, s.length !== "standard" ? s.length : null, s.tone !== "default" ? s.tone : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Default";
}
