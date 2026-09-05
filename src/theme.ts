import { TextStyle } from 'react-native';

/** Deep forest night palette. */
export const colors = {
  bg: '#0F1A17',
  bgElevated: '#132119',
  card: '#172722',
  cardAlt: '#1F332C',
  ink: '#F4F7F3',
  inkSoft: '#8FA79B',
  inkFaint: '#6B8377',
  accent: '#9BE8B6',
  accentDeep: '#6FD39A',
  sand: '#F0D9A8',
  line: 'rgba(244,247,243,0.08)',
  lineStrong: 'rgba(244,247,243,0.16)',
  success: '#9BE8B6',
  danger: '#F2A7A7',
  overlay: 'rgba(6,12,10,0.82)',
  onAccent: '#0F1A17',
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };

export const space = (n: number) => n * 4;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, fontWeight: '400', color: colors.ink, lineHeight: 23 },
  bodySoft: { fontSize: 15, fontWeight: '400', color: colors.inkSoft, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 1.4, textTransform: 'uppercase' },
  sub: { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  caption: { fontSize: 12, fontWeight: '500', color: colors.inkFaint },
  num: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.8, ...tabular },
  numLg: { fontSize: 44, fontWeight: '800', color: colors.ink, letterSpacing: -1.2, ...tabular },
  numXL: { fontSize: 68, fontWeight: '800', color: colors.ink, letterSpacing: -2.4, ...tabular },
};
