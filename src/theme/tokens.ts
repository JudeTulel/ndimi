/**
 * Strict brand palette — exactly three colours, held regardless of any reference
 * artwork. Every other token is a neutral or a documented tint of these three.
 */
export const colors = {
  sulphur: '#F5ECC2',
  dark: '#111314',
  red: '#FF073A',

  // Derived surfaces
  background: '#F5ECC2',
  surface: '#FFFFFF',
  surfaceMuted: '#F5ECC2',
  text: '#111314',
  secondaryText: '#4A4A4A',
  border: '#DCD2B4',
  track: '#DCD2B4',
  soft: '#F5ECC2',

  // Logo mark — only the two brand hues, no extra oxblood/green
  markRed: '#FF073A',
  markGreen: '#111314',
  markOverlap: '#111314',

  // States — success reuses dark so the palette stays closed
  success: '#111314',
  successSoft: '#DCD2B4',
  danger: '#FF073A',
  accent: '#FF073A',
  accentSoft: '#F5ECC2',
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
