/**
 * Zenith AI — Theme definitions
 * Each theme maps a beautiful illustration to a named colour palette.
 * The background image must NOT be obscured — overlays are kept minimal.
 */

export interface Theme {
  key: string;
  name: string;
  // Static require — Expo bundles these at build time
  image: ReturnType<typeof require>;
  // Overlay opacity: lower = show more of the illustration
  overlayOpacity: number;
  // Primary accent colour derived from the artwork palette
  accent: string;
  accentGlow: string;
  // Gradient overlay colours (very subtle)
  gradientTop: string;
  gradientBottom: string;
}

export const THEMES: Theme[] = [
  {
    key: "alley",
    name: "Night Alley",
    image: require("../assets/images/themes/alley3.jpg"),
    overlayOpacity: 0.52,
    accent: "#00e5c8",
    accentGlow: "rgba(0,229,200,0.35)",
    gradientTop: "rgba(7,12,20,0.08)",
    gradientBottom: "rgba(4,8,16,0.88)",
  },
  {
    key: "alley4",
    name: "Alley Rain",
    image: require("../assets/images/themes/alley4.jpg"),
    overlayOpacity: 0.50,
    accent: "#4db8ff",
    accentGlow: "rgba(77,184,255,0.35)",
    gradientTop: "rgba(4,8,20,0.08)",
    gradientBottom: "rgba(4,8,18,0.88)",
  },
  {
    key: "cabin",
    name: "Space Cabin",
    image: require("../assets/images/themes/cabin.jpg"),
    overlayOpacity: 0.48,
    accent: "#ff8c42",
    accentGlow: "rgba(255,140,66,0.35)",
    gradientTop: "rgba(10,6,14,0.06)",
    gradientBottom: "rgba(8,5,12,0.88)",
  },
  {
    key: "neoncity",
    name: "Neon City",
    image: require("../assets/images/themes/neoncity.jpg"),
    overlayOpacity: 0.50,
    accent: "#00ffcc",
    accentGlow: "rgba(0,255,204,0.35)",
    gradientTop: "rgba(0,20,16,0.08)",
    gradientBottom: "rgba(0,14,12,0.88)",
  },
  {
    key: "blade",
    name: "Blade Night",
    image: require("../assets/images/themes/blade.jpg"),
    overlayOpacity: 0.52,
    accent: "#e040fb",
    accentGlow: "rgba(224,64,251,0.35)",
    gradientTop: "rgba(14,4,20,0.08)",
    gradientBottom: "rgba(10,2,16,0.88)",
  },
  {
    key: "starbridge",
    name: "Star Bridge",
    image: require("../assets/images/themes/starbridge.jpg"),
    overlayOpacity: 0.45,
    accent: "#7c9fff",
    accentGlow: "rgba(124,159,255,0.35)",
    gradientTop: "rgba(4,6,18,0.06)",
    gradientBottom: "rgba(4,6,18,0.88)",
  },
  {
    key: "observatory",
    name: "Observatory",
    image: require("../assets/images/themes/observatory.jpg"),
    overlayOpacity: 0.48,
    accent: "#ffd700",
    accentGlow: "rgba(255,215,0,0.35)",
    gradientTop: "rgba(8,6,14,0.06)",
    gradientBottom: "rgba(8,6,12,0.88)",
  },
  {
    key: "ocean",
    name: "Ocean Depths",
    image: require("../assets/images/themes/ocean.jpg"),
    overlayOpacity: 0.50,
    accent: "#00b8d4",
    accentGlow: "rgba(0,184,212,0.35)",
    gradientTop: "rgba(0,8,18,0.06)",
    gradientBottom: "rgba(0,6,16,0.88)",
  },
  {
    key: "transit",
    name: "Transit",
    image: require("../assets/images/themes/transit.jpg"),
    overlayOpacity: 0.50,
    accent: "#ff6b6b",
    accentGlow: "rgba(255,107,107,0.35)",
    gradientTop: "rgba(14,4,4,0.06)",
    gradientBottom: "rgba(12,4,4,0.88)",
  },
  {
    key: "garden",
    name: "Garden",
    image: require("../assets/images/themes/garden.jpg"),
    overlayOpacity: 0.48,
    accent: "#69ff47",
    accentGlow: "rgba(105,255,71,0.35)",
    gradientTop: "rgba(2,10,4,0.06)",
    gradientBottom: "rgba(2,8,4,0.88)",
  },
  {
    key: "rainfall",
    name: "Rainfall",
    image: require("../assets/images/themes/rainfall.jpg"),
    overlayOpacity: 0.50,
    accent: "#80cbc4",
    accentGlow: "rgba(128,203,196,0.35)",
    gradientTop: "rgba(2,8,14,0.06)",
    gradientBottom: "rgba(2,6,12,0.88)",
  },
  {
    key: "twilight",
    name: "Twilight",
    image: require("../assets/images/themes/twilight.jpg"),
    overlayOpacity: 0.48,
    accent: "#ce93d8",
    accentGlow: "rgba(206,147,216,0.35)",
    gradientTop: "rgba(8,4,14,0.06)",
    gradientBottom: "rgba(8,4,14,0.88)",
  },
  {
    key: "twinsuns",
    name: "Twin Suns",
    image: require("../assets/images/themes/twinsuns.jpg"),
    overlayOpacity: 0.48,
    accent: "#ffb300",
    accentGlow: "rgba(255,179,0,0.35)",
    gradientTop: "rgba(18,8,2,0.06)",
    gradientBottom: "rgba(16,6,2,0.88)",
  },
  {
    key: "dunehall",
    name: "Dune Hall",
    image: require("../assets/images/themes/dunehall.jpg"),
    overlayOpacity: 0.50,
    accent: "#d4a96a",
    accentGlow: "rgba(212,169,106,0.35)",
    gradientTop: "rgba(14,8,2,0.06)",
    gradientBottom: "rgba(12,6,2,0.88)",
  },
  {
    key: "sanctuary",
    name: "Sanctuary",
    image: require("../assets/images/themes/sanctuary.jpg"),
    overlayOpacity: 0.48,
    accent: "#a5d6a7",
    accentGlow: "rgba(165,214,167,0.35)",
    gradientTop: "rgba(2,10,4,0.06)",
    gradientBottom: "rgba(2,8,4,0.88)",
  },
  {
    key: "deck",
    name: "Deck",
    image: require("../assets/images/themes/deck.jpg"),
    overlayOpacity: 0.50,
    accent: "#90caf9",
    accentGlow: "rgba(144,202,249,0.35)",
    gradientTop: "rgba(2,6,14,0.06)",
    gradientBottom: "rgba(2,6,14,0.88)",
  },
];

export const DEFAULT_THEME_KEY = "alley";

export function getTheme(key: string): Theme {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}
