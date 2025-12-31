export const THEMES = [
  { id: "emerald", label: "Emerald Glow", preview: ["#10b981", "#047857"] },
  { id: "sapphire", label: "Sapphire Sky", preview: ["#3b82f6", "#1d4ed8"] },
  { id: "violet", label: "Violet Pulse", preview: ["#8b5cf6", "#6d28d9"] },
  { id: "rose", label: "Rose Dawn", preview: ["#f472b6", "#db2777"] },
  { id: "amber", label: "Amber Bloom", preview: ["#f59e0b", "#b45309"] },
  { id: "forest", label: "Forest Shade", preview: ["#22c55e", "#166534"] },
  { id: "sunrise", label: "Sunrise Haze", preview: ["#f97316", "#ec4899"] },
  { id: "ocean", label: "Ocean Mist", preview: ["#38bdf8", "#0ea5e9"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ThemeMode = "light" | "dark";

export const DEFAULT_THEME_ID: ThemeId = "emerald";

export const THEME_PALETTE_STORAGE_KEY = "StewardTrack.theme";
export const THEME_MODE_STORAGE_KEY = "StewardTrack.mode";
