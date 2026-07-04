import api from './api';
import { Transaction } from '../types';

export const transactionService = {
  async getTransactions(params: Record<string, any> = {}): Promise<any> {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  async createTransaction(transactionData: Partial<Transaction>): Promise<Transaction> {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  async updateTransaction(id: string, transactionData: Partial<Transaction>): Promise<Transaction> {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },

  async deleteTransaction(id: string): Promise<any> {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  async exportTransactions(params: Record<string, any> = {}): Promise<Blob> {
    const response = await api.get('/transactions/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
