export interface ColorTokens {
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  accent: string;
  income: string;
  expense: string;
  border: string;
  warning: string;
}

export const lightColors: ColorTokens = {
  background: '#F6F6FB',
  card: '#FFFFFF',
  cardAlt: '#EFEFF6',
  text: '#14141F',
  textMuted: '#6B6B80',
  primary: '#7C3AED',
  accent: '#F97316',
  income: '#16A34A',
  expense: '#EF4444',
  border: '#E5E5F0',
  warning: '#F59E0B',
};

export const darkColors: ColorTokens = {
  background: '#0E0E14',
  card: '#1A1A24',
  cardAlt: '#242433',
  text: '#F4F4FA',
  textMuted: '#9A9AB0',
  primary: '#8B5CF6',
  accent: '#FB923C',
  income: '#22C55E',
  expense: '#F87171',
  border: '#2E2E40',
  warning: '#FBBF24',
};

export const balanceCardGradient = ['#4C1D95', '#7C3AED'] as const;
