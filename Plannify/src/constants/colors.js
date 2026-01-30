export default {
  // Shared colors (constants that don't change based on theme)
  common: {
    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
    absoluteZero: "#000000",
  },

  // ☀️ LIGHT THEME (Soft, Clean, Modern)
  light: {
    type: "light",
    background: "#F2F6FF", // Very faint blue-ish gray (High-end feel)
    surface: "#FFFFFF", // Pure white for cards
    surfaceHighlight: "#F8FAFC", // Slightly lighter for active states

    // Typography
    textPrimary: "#1A2138", // Dark Navy (Softer than pure black)
    textSecondary: "#64748B", // Cool Gray
    textMuted: "#94A3B8", // Lighter Gray

    // Accents (Electric Blue & Violet from your ref images)
    primary: "#4F46E5", // Indigo/Electric Blue
    primaryLight: "#818CF8",
    secondary: "#EC4899", // Neon Pink accent
    accent: "#06B6D4", // Cyan

    // Glassmorphism specific
    glassBg: "rgba(255, 255, 255, 0.7)",
    glassBorder: "rgba(255, 255, 255, 0.5)",

    // UI Elements
    border: "#E2E8F0",
    divider: "#F1F5F9",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",

    // Shadows for 3D bounce effect
    shadow: "#64748B",
  },

  // 🌙 DARK THEME (Cyber, Deep Midnight, Neon)
  dark: {
    type: "dark",
    background: "#0F172A", // Deep Midnight Blue (Not pitch black)
    surface: "#1E293B", // Slate Blue for cards
    surfaceHighlight: "#334155", // Lighter slate

    // Typography
    textPrimary: "#F1F5F9", // Off-white
    textSecondary: "#94A3B8", // Cool Gray
    textMuted: "#64748B", // Darker Gray

    // Accents (Glowing Neon versions)
    primary: "#6366F1", // Bright Indigo
    primaryLight: "#818CF8",
    secondary: "#F472B6", // Bright Pink
    accent: "#22D3EE", // Neon Cyan

    // Glassmorphism specific
    glassBg: "rgba(30, 41, 59, 0.7)", // Dark translucent
    glassBorder: "rgba(255, 255, 255, 0.1)", // Subtle white border for depth

    // UI Elements
    border: "#334155",
    divider: "#1E293B",
    success: "#34D399",
    danger: "#F87171",
    warning: "#FBBF24",

    // Shadows
    shadow: "#020617",
  },
};
