export const C = {
  bg: "#18181b",
  sidebar: "#111114",
  surface: "#242428",
  surfaceHover: "#2e2e34",
  border: "#323238",
  green: "#F07820",
  greenDim: "rgba(240,120,32,0.15)",
  red: "#e24b4a",
  redDim: "rgba(226,75,74,0.15)",
  amber: "#efaf27",
  amberDim: "rgba(239,175,39,0.15)",
  blue: "#4a9eff",
  blueDim: "rgba(74,158,255,0.15)",
  aiAccent: "#a78bfa",
  aiAccentDim: "rgba(167,139,250,0.12)",
  textPrimary: "#f0f0f0",
  textSecondary: "#9a9da3",
  textMuted: "#555960",
};

export const font = "'Segoe UI', system-ui, sans-serif";

export const card = (extra = {}) => ({
  background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, ...extra,
});
