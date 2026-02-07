import api from './api';

export const authService = {
  async signup(userData) {
    try {
      console.log('🔵 Signup request:', { ...userData, password: '***' });
      const response = await api.post('/auth/signup', userData);
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

  logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
