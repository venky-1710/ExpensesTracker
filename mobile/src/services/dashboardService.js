import api from './api';

export const dashboardService = {
  async getKPIs(params = {}) {
    const response = await api.get('/dashboard/kpis', { params });
    return response.data;
  },

  async getCharts(params = {}) {
    const response = await api.get('/dashboard/charts', { params });
    return response.data;
  },

  async getWidgets(params = {}) {
    const response = await api.get('/dashboard/widgets', { params });
    return response.data;
  },
};
