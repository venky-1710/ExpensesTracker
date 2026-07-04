import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { userService } from '../services/userService';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, updateUser } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (user?.theme_preference as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, [theme]);

  useEffect(() => {
    if (user?.theme_preference) {
      setTheme(user.theme_preference as 'light' | 'dark');
    }
  }, [user]);

  const toggleTheme = async () => {
    const newTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    if (user) {
      try {
        const updated = await userService.updatePreferences({
          theme_preference: newTheme,
        });
        updateUser(updated);
      } catch (error) {
        console.error('Failed to update theme preference:', error);
      }
    }
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
