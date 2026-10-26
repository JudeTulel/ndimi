export const colors = {
  // Brand palette
  sulphur: '#F5ECC2',
  dark: '#111314',
  red: '#FF073A',

  // Surfaces derived from the palette
  background: '#F8F6EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F5ECC2',
  text: '#111314',
  secondaryText: '#5C5F63',
  border: '#E7E2D2',
  track: '#E7E2D2',
  soft: '#FFF1D9',

  // Logo mark
  markRed: '#A00000',
  markGreen: '#0A7A00',
  markOverlap: '#4A4A00',

  // States
  success: '#0A7A00',
  successSoft: '#CDE8CD',
  danger: '#FF073A',
  accent: '#FF073A',
  accentSoft: '#FFE3E9',
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
  display: { fontFamily: fonts.display, fontSize: 40, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.bold, fontSize: 15 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14 },
  body: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8 },
  cta: { fontFamily: fonts.bold, fontSize: 15 },
};
