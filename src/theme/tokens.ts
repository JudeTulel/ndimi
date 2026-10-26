import { Platform } from 'react-native';

/**
 * Brand palette — three colours, held down. Glass surfaces, pastel gradients and
 * shadows are all derived from these so nothing introduces a fourth hue.
 */
export const colors = {
  sulphur: '#F5ECC2',
  dark: '#111314',
  red: '#FF073A',

  // Solid scheme: background is the tone, surfaces are a lighter tone of it.
  background: '#F5ECC2',
  surface: '#FDF9EA',
  surfaceRaised: '#FFFDF5',
  text: '#111314',
  secondaryText: '#5E594C',
  border: '#EAE1C3',

  // Tints derived from the two brand hues
  redWash: 'rgba(255,7,58,0.10)',
  darkWash: 'rgba(17,19,20,0.06)',
  sulphurWash: 'rgba(245,236,194,0.85)',

  success: '#111314',
  successSoft: '#EEE6C6',
  track: '#EAE1C3',
  danger: '#FF073A',
};

/** Only used by the orb; screens are flat colour. */
export const gradient = {
  orb: ['#FFFDF5', '#F5ECC2', '#FF073A', '#F5ECC2', '#FFFDF5'] as const,
};

export const radius = {
  card: 24,
  input: 18,
  button: 20,
  pill: 999,
  badge: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fonts = {
  display: 'Bungee_400Regular',
  body: 'Quicksand_400Regular',
  medium: 'Quicksand_500Medium',
  semibold: 'Quicksand_600SemiBold',
  bold: 'Quicksand_700Bold',
};

export const type = {
  display: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3 },
  hero: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.4, lineHeight: 31 },
  h1: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.2 },
  h2: { fontFamily: fonts.bold, fontSize: 15 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  body: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.7 },
  cta: { fontFamily: fonts.bold, fontSize: 15 },
};

/**
 * Surface recipe. Cards sit a lighter tone above the background so they read as
 * raised without translucency; a hairline border and soft warm shadow do the
 * rest.
 */
export const surfaceTheme = {
  fill: colors.surface,
  border: colors.border,
  shadow: {
    shadowColor: '#7A6E45',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.select({ android: 3, default: 0 }),
  },
};

export const glass = surfaceTheme;
