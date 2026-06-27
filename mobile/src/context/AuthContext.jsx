import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import Toast from 'react-native-toast-message';

const AuthContext = createContext(null);

// Safely extract a readable string from various error shapes
const getErrorMessage = (error) => {
    const detail = error.response?.data?.detail;
    if (!detail) return error.response?.data?.error || error.message || 'Something went wrong';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
    return String(detail);
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if user is already logged in
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    await fetchUser();
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error("Error reading token", e);
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const fetchUser = async () => {
        try {
            const userData = await authService.getMe();
            setUser(userData);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            await AsyncStorage.removeItem('token');
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            await authService.login(email, password);
            await fetchUser();
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Login successful!',
            });
            return true;
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: getErrorMessage(error) || 'Login failed',
            });
            return false;
        }
    };

    const googleLogin = async (idToken) => {
        try {
            await authService.googleLogin(idToken);
            await fetchUser();
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Google Login successful!',
            });
            return true;
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: getErrorMessage(error) || 'Google Login failed',
            });
            return false;
        }
    };

    const signup = async (userData) => {
        try {
            await authService.signup(userData);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Signup successful! Please login.',
            });
            return true;
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: getErrorMessage(error) || 'Signup failed',
            });
            return false;
        }
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
        setIsAuthenticated(false);
        Toast.show({
            type: 'info',
            text1: 'Logged Out',
            text2: 'Logged out successfully',
        });
    };

    const updateUser = (updatedData) => {
        setUser((prev) => ({ ...prev, ...updatedData }));
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        googleLogin,
        signup,
        logout,
        updateUser,
        refreshUser: fetchUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
