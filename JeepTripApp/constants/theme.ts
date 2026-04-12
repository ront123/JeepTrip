/**
 * JeepTrip App — Off-Road Theme System
 * Palette: Deep Charcoal + Olive Green + Desert Gold + Mud Brown
 */

import { Platform } from 'react-native';

// === Core Palette ===
export const Palette = {
  // Backgrounds
  charcoal: '#1A1A18',
  charcoalMid: '#252520',
  charcoalLight: '#2E2E28',

  // Accent greens (olive / military)
  olive: '#4A5940',
  oliveMid: '#5E7252',
  oliveLight: '#738C64',

  // Desert / golden accents
  gold: '#C8973A',
  goldLight: '#E0B060',
  sand: '#D4B896',

  // Mud / warm neutrals (for text on dark)
  mud: '#8C7B6A',
  cream: '#F0E6D2',
  white: '#FAFAF5',

  // Danger / warning
  rust: '#B84B2A',
  rustLight: '#D4613A',

  // Utility
  transparent: 'transparent',
};

// === App Colors (Semantic) ===
export const Colors = {
  light: {
    text: Palette.charcoal,
    secondaryText: Palette.mud,
    background: Palette.cream,
    surface: '#FFFFFF',
    tint: Palette.olive,
    accent: Palette.gold,
    icon: Palette.mud,
    tabIconDefault: Palette.mud,
    tabIconSelected: Palette.olive,
    border: '#D9CCBB',
    danger: Palette.rust,
  },
  dark: {
    text: Palette.cream,
    secondaryText: Palette.sand,
    background: Palette.charcoal,
    surface: Palette.charcoalMid,
    tint: Palette.oliveLight,
    accent: Palette.gold,
    icon: Palette.sand,
    tabIconDefault: Palette.mud,
    tabIconSelected: Palette.gold,
    border: '#3A3A32',
    danger: Palette.rustLight,
  },
};

// === Typography ===
export const Typography = {
  fontBold: Platform.select({ ios: 'System', android: 'sans-serif-condensed-medium', default: 'System' }),
  fontRegular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),

  // Sizes — bumped up for better readability
  xs: 13,
  sm: 15,
  base: 17,
  md: 19,
  lg: 22,
  xl: 26,
  '2xl': 32,
  '3xl': 40,
  '4xl': 50,
};

// === Spacing ===
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// === Border Radius ===
export const Radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});
