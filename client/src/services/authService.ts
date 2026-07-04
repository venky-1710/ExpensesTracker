import api from './api';
import { User } from '../types';

export const authService = {
  async signup(userData: any): Promise<any> {
    try {
      console.log('🔵 Signup request:', { ...userData, password: '***' });
      const response = await api.post('/auth/signup', userData);
      console.log('✅ Signup successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Signup error:', error.response?.data || error.message);
      throw error;
    }
  },

  async login(email: string, password: string): Promise<any> {
    try {
      console.log('🔵 Login request:', email);
      const formData = new FormData();
      formData.append('username', email); // FastAPI OAuth2 expects 'username'
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      console.log('✅ Login successful');
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data || error.message);
      throw error;
    }
  },
  async forgotPassword(email: string): Promise<any> {
    try {
      console.log('🔵 Forgot password request:', email);
      const response = await api.post('/auth/forgot-password', { email });
      console.log('✅ Forgot password successful');
      return response.data;
    } catch (error: any) {
      console.error('❌ Forgot password error:', error.response?.data || error.message);
      throw error;
    }
  },

  async resetPassword(payload: { email: string; code: string; new_password: string }): Promise<any> {
    try {
      console.log('🔵 Reset password request:', payload.email);
      const response = await api.post('/auth/reset-password', payload);
      console.log('✅ Password reset successful');
      return response.data;
    } catch (error: any) {
      console.error('❌ Reset password error:', error.response?.data || error.message);
      throw error;
    }
  },

  async getMe(): Promise<User> {
    try {
      console.log('🔵 Get user profile request');
      const response = await api.get('/auth/me');
      console.log('✅ Profile retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get profile error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout(): void {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
