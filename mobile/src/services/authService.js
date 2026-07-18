import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const authService = {
  async requestSignup(userData) {
    try {
      console.log('🔵 Signup request:', { ...userData, password: '***' });
      const response = await api.post('/auth/request-signup', userData, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('✅ Signup request successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Signup request error:', error.response?.data || error.message);
      throw error;
    }
  },

  async verifySignup(email, code) {
    try {
      console.log('🔵 Verify signup request:', email);
      const response = await api.post('/auth/verify-signup', { email, code });
      
      console.log('✅ Signup verified successful');
      if (response.data.access_token) {
        await AsyncStorage.setItem('token', response.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      }
      return response.data;
    } catch (error) {
      console.error('❌ Verify signup error:', error.response?.data || error.message);
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
      if (error.response?.status === 401) {
        console.warn('⚠️ Session expired (401):', error.response?.data || error.message);
      } else {
        console.error('❌ Get profile error:', error.response?.data || error.message);
      }
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
  },
  
  async checkAvailability(username, email) {
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      if (email) params.append('email', email);
      
      const response = await api.get(`/auth/check-availability?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Check availability error:', error);
      return { username_available: true, email_available: true }; // Fallback
    }
  }
};
