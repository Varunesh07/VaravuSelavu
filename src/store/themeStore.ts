import { create } from 'zustand';
import { getSetting, setSetting } from '../services/settings';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  isInitialized: boolean;
  initTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  isInitialized: false,
  initTheme: async () => {
    try {
      const saved = await getSetting('theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ themeMode: saved, isInitialized: true });
        return;
      }
    } catch {
      // Ignore if DB not ready yet
    }
    set({ isInitialized: true });
  },
  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    try {
      await setSetting('theme', mode);
    } catch (e) {
      console.warn('Failed to persist theme setting:', e);
    }
  },
}));
