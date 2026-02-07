import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { userService } from '../services/userService';

const ThemeContext = createContext(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [theme, setTheme] = useState(user?.theme_preference || 'light');

    useEffect(() => {
        // Apply theme class to body
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    }, [theme]);

    useEffect(() => {
        // Sync theme with user preference
        if (user?.theme_preference) {
            setTheme(user.theme_preference);
        }
    }, [user]);

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);

        // Update on server if user is logged in
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

    const value = {
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
