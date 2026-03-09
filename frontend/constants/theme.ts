import { Platform } from 'react-native';

// ─── Color palette ───────────────────────────────────────────────────────────
// Brand: #28ECFF (cyan) + #0080C1 (blue)

export const Colors = {
  // Brand
  primary: '#0080C1',
  primaryLight: '#28ECFF',
  primaryDark: '#006399',
  accent: '#28ECFF',

  // Text
  textPrimary: '#0d1a26',
  textSecondary: '#3c4b60',
  textMuted: '#6b7a8c',
  textOnPrimary: '#ffffff',

  // Backgrounds
  background: '#ffffff',
  surface: '#f5fafd',
  surfaceLight: '#e8f8fc',
  surfaceAccent: '#d4f4fc',

  // Borders / dividers
  border: '#c5e4f0',
  borderLight: '#dceef4',
  divider: '#e0f2f7',

  // Tab bar
  tabActive: '#0080C1',
  tabInactive: '#7b9cad',
  tabBorder: '#dceef4',

  // Service cards
  cardBackground: '#f8fcfe',
  cardBorder: '#d4f4fc',
  cardIconBackground: '#e8f8fc',
  cardIconColor: '#0080C1',

  // Misc
  whatsapp: '#2cbf5e',
  white: '#ffffff',
  black: '#000000',

  // Dark gradient (brand colours, dark → light)
  gradientDark: '#002a40',
  gradientMid: '#003d5c',
  gradientPrimary: '#005a87',
  gradientLight: '#0080C1',

  // Glass (iOS-style, 75% translucent, sky blue)
  glassSkyBlue: 'rgba(94, 176, 230, 0.75)',
  glassSkyBlueSoft: 'rgba(130, 198, 238, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.45)',
  glassInner: 'rgba(255, 255, 255, 0.22)',
  // Icons on glass: darker blue, less translucent (opaque)
  iconOnGlass: '#0a3d5c',
} as const;

// ─── Fonts ───────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
