import api from './api';

export const transactionService = {
  async getTransactions(params = {}) {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  async createTransaction(transactionData) {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  async updateTransaction(id, transactionData) {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },

  async deleteTransaction(id) {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  async exportCSV(filters = {}) {
    const response = await api.get('/transactions/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};
