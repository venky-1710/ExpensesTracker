import api from './api';

export const transactionService = {
  async getTransactions(params = {}) {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  async createTransaction(data) {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  async updateTransaction(id, data) {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },

  async deleteTransaction(id) {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
};
