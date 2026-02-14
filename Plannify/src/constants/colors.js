export default {
  // Shared colors (constants that don't change based on theme)
  common: {
    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
    absoluteZero: "#000000",
  },

  // ☀️ LIGHT THEME (Mint, Fresh, Modern)
  light: {
    type: "light",
    background: "#F0FDF4", // Very faint mint green (Fresh feel)
    surface: "#FFFFFF", // Pure white for cards
    surfaceHighlight: "#ECFDF5", // Slightly greener highlight (Emerald 50)

    // Typography
    textPrimary: "#064E3B", // Dark Emerald (Deep Green)
    textSecondary: "#334155", // Cool Slate
    textMuted: "#94A3B8", // Lighter Gray

    // Accents (Green-ish Palette)
    primary: "#10B981", // Emerald 500 (Vibrant Green)
    primaryLight: "#34D399", // Lighter Green
    secondary: "#059669", // Emerald 600 (Darker Green accent)
    accent: "#0D9488", // Teal 600 (Deep Teal)

    // Glassmorphism specific
    glassBg: "rgba(255, 255, 255, 0.7)",
    glassBorder: "rgba(16, 185, 129, 0.2)", // Subtle green tint

    // UI Elements
    border: "#D1FAE5", // Light Green Border
    divider: "#E2E8F0",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",

    // Shadows for 3D bounce effect
    shadow: "#065F46", // Deep Emerald shadow
  },

  // 🌙 DARK THEME (Cyber Green, Matrix, Deep Forest)
  dark: {
    type: "dark",
    background: "#000A05", // Pitch black with tiniest green hint
    surface: "#01120B", // Deeper, less vivid surface
    surfaceHighlight: "#021A10", // Subtler highlight

    // Typography
    textPrimary: "#E2E8F0", // Off-white (less green tint for readability)
    textSecondary: "#94A3B8", // Cool Gray
    textMuted: "#64748B", // Darker Gray

    // Accents (Dimmed down - less neon)
    primary: "#059669", // Emerald 600 (Darker, richer green)
    primaryLight: "#10B981", // Emerald 500
    secondary: "#047857", // Emerald 700
    accent: "#0F766E", // Teal 700

    // Glassmorphism specific
    glassBg: "rgba(1, 18, 11, 0.8)", 
    glassBorder: "rgba(5, 150, 105, 0.2)", 

    // UI Elements
    border: "#021A10", 
    divider: "#01120B",
    success: "#10B981", // Keep success visible but not blinding
    danger: "#EF4444",
    warning: "#F59E0B",

    // Shadows
    shadow: "#059669", 
  },
};
