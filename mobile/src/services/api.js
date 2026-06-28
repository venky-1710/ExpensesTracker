import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// In React Native, window.location won't work. For router redirect outside components, 
// it's tricky with expo-router. We can export a function to handle unauthorized, or let the UI handle it.
// Or we can use the router from 'expo-router'.
import { router } from 'expo-router';

// In Android emulator, localhost points to the emulator itself.
// 10.0.2.2 is the alias to your host loopback interface (i.e. localhost of the development machine)
// On iOS simulator, localhost works fine.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
    if (__DEV__) {
        // For web browser, localhost is always the machine running the server
        if (Platform.OS === 'web') {
            return 'http://localhost:8000';
        }

        // For physical devices (Expo Go), extract the local IP from the Metro server URI
        const hostUri = Constants?.expoConfig?.hostUri;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            return `http://${ip}:8000`;
        }

        // Emulator fallbacks
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8000';
        }
        return 'http://localhost:8000';
    }
    return 'https://expensestracker.onrender.com'; // TODO: replace with your actual Render service URL
};

const API_BASE_URL = getBaseUrl();

console.log('🔧 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 Request to ${config.url} with auth token`);
    } else {
      console.log(`📡 Request to ${config.url} without auth`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response.status);
    return response;
  },
  async (error) => {
    const isAuthError = error.response?.status === 401;
    const logMethod = isAuthError ? console.warn : console.error;
    
    logMethod('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (isAuthError) {

      console.warn('⚠️ Unauthorized - clearing auth and redirecting to login');
      // Unauthorized - clear token and redirect to login
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      router.replace('/');
    }
    return Promise.reject(error);
  }
);

export default api;
