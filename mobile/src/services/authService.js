import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const authService = {
  async signup(userData) {
    try {
      console.log('🔵 Signup request:', { ...userData, password: '***' });
      // Send as JSON (same as web client)
      const response = await api.post('/auth/signup', userData, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('✅ Signup successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Signup error:', error.response?.data || error.message);
      throw error;
    }
  },

  async login(email, password) {
    try {
      console.log('🔵 Login request:', email);
      // FastAPI OAuth2PasswordRequestForm expects form-encoded data
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await api.post('/auth/login', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('✅ Login successful');

      if (response.data.access_token) {
        await AsyncStorage.setItem('token', response.data.access_token);
      }

      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  async getMe() {
    try {
      console.log('🔵 Get user profile request');
      const response = await api.get('/auth/me');
      console.log('✅ Profile retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Get profile error:', error.response?.data || error.message);
      throw error;
    }
  },

  async googleLogin(idToken) {
    try {
      console.log('🔵 Google login request');
      const response = await api.post('/auth/google', { id_token: idToken });
      console.log('✅ Google login successful');
      
      if (response.data.access_token) {
        await AsyncStorage.setItem('token', response.data.access_token);
      }
      return response.data;
    } catch (error) {
      console.error('❌ Google login error:', error.response?.data || error.message);
      throw error;
    }
  },

  async forgotPassword(email) {
    try {
      console.log('🔵 Forgot password request:', email);
      const response = await api.post('/auth/forgot-password', { email });
      console.log('✅ Forgot password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Forgot password error:', error.response?.data || error.message);
      throw error;
    }
  },

  async resetPassword(email, code, newPassword) {
    try {
      console.log('🔵 Reset password request:', email);
      const response = await api.post('/auth/reset-password', {
        email,
        code,
        new_password: newPassword,
      });
      console.log('✅ Reset password successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Reset password error:', error.response?.data || error.message);
      throw error;
    }
  },

  async logout() {
    console.log('Logging out...');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    router.replace('/');
  },
};
