import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEMES, DEFAULT_THEME_KEY, getTheme, type Theme } from "@/constants/themes";

const THEME_STORAGE_KEY = "@zenith_theme_v1";

interface ThemeContextValue {
  theme: Theme;
  setThemeKey: (key: string) => Promise<void>;
  allThemes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme(DEFAULT_THEME_KEY),
  setThemeKey: async () => {},
  allThemes: THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState(DEFAULT_THEME_KEY);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && THEMES.find((t) => t.key === stored)) {
        setThemeKeyState(stored);
      }
    });
  }, []);

  const setThemeKey = useCallback(async (key: string) => {
    setThemeKeyState(key);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, key);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: getTheme(themeKey), setThemeKey, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
