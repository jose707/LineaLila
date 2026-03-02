/**
 * 🎨 LÍNEA LILA - THEME COLORS
 * Sistema de colores premium minimalista
 * Empresa de taxi exclusivamente para mujeres
 */

export const COLORS = {
  // Colores principales - Púrpura elegante
  primary: "#7C3AED", // Púrpura principal (Línea Lila)
  primaryLight: "#A78BFA", // Púrpura claro
  primaryDark: "#6D28D9", // Púrpura oscuro

  // Color secundario - Rosa femenino
  secondary: "#EC4899", // Rosa
  secondaryLight: "#F472B6", // Rosa claro

  // Neutrales
  white: "#FFFFFF",
  background: "#FAFAFA",
  gray: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#999999",
    600: "#757575",
    700: "#424242",
    800: "#2D2D2D",
    900: "#1A1A1A",
  },

  // Estados
  success: "#10B981",
  warning: "#FFB800",
  error: "#EF4444",
  info: "#3B82F6",

  // Textos
  textPrimary: "#2D2D2D",
  textSecondary: "#888888",
  textTertiary: "#AAAAAA",

  // Bordes y divisores
  border: "#F0F0F0",
  divider: "#F5F5F5",
};

export const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  primary: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondary: {
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  full: 9999,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  h4: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
};
