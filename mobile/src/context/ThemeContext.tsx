import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const darkTheme = {
  bg: '#0a0118',
  card: '#1a0d35',
  border: 'rgba(255,255,255,0.08)',
  primary: '#6d4aff',
  accent: '#c850ff',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#6b7280',
  inputBg: '#130a27',
  inputBorder: 'rgba(255,255,255,0.08)',
  socialBg: '#1a1033',
};

const lightTheme = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: 'rgba(0,0,0,0.08)',
  primary: '#6d4aff',
  accent: '#c850ff',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  inputBg: '#ffffff',
  inputBorder: 'rgba(0,0,0,0.15)',
  socialBg: '#f1f5f9',
};

export type ThemeColors = typeof darkTheme;

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  C: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: true,
  setThemeMode: () => {},
  C: darkTheme,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine actual active theme
  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem('appTheme') as ThemeMode;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('appTheme', mode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const C = isDark ? darkTheme : lightTheme;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode, C }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
