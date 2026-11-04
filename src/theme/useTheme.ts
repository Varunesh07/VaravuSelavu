import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { lightColors, darkColors, balanceCardGradient, ColorTokens } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode } = useThemeStore();

  const isDark =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const colors: ColorTokens = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    themeMode,
    setThemeMode,
    spacing,
    radius,
    typography,
    balanceCardGradient,
  };
}
