import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'web') return 'http://localhost:8000';
    const hostUri = Constants?.expoConfig?.hostUri;
    if (hostUri) return `http://${hostUri.split(':')[0]}:8000`;
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
    return 'http://localhost:8000';
  }
  return 'https://expenses-tracker-api-mbpc.onrender.com';
};

export const uploadService = {
  /**
   * Upload a bank statement file and analyze it with AI.
   * Returns { count, transactions }
   */
  analyzeStatement: async (fileUri: string, fileName: string, mimeType: string) => {
    const token = await AsyncStorage.getItem('token');
    const baseUrl = getBaseUrl();

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await axios.post(`${baseUrl}/api/upload/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
      timeout: 120000, // 2 min — AI analysis can take time
    });

    return response.data;
  },

  /**
   * Confirm and import the reviewed transactions.
   */
  confirmTransactions: async (transactions: any[]) => {
    const response = await api.post('/api/upload/confirm', { transactions });
    return response.data;
  },
};
