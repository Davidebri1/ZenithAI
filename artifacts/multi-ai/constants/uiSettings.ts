import AsyncStorage from "@react-native-async-storage/async-storage";

const UI_SETTINGS_KEY = "@zenith_ui_settings_v1";

export interface UISettings {
  columnCount: 1 | 2 | 3;
}

export const DEFAULT_UI_SETTINGS: UISettings = {
  columnCount: 2,
};

export async function getUISettings(): Promise<UISettings> {
  try {
    const raw = await AsyncStorage.getItem(UI_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_UI_SETTINGS, ...(JSON.parse(raw) as Partial<UISettings>) };
  } catch {}
  return { ...DEFAULT_UI_SETTINGS };
}

export async function setUISettings(settings: Partial<UISettings>): Promise<UISettings> {
  const current = await getUISettings();
  const merged = { ...current, ...settings };
  await AsyncStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}
