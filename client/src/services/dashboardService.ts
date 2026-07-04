import api from './api';
import { KPIs } from '../types';

export const dashboardService = {
  async getKPIs(params: Record<string, any> = {}): Promise<KPIs> {
    const response = await api.get('/dashboard/kpis', { params });
    return response.data;
  },

  async getCharts(params: Record<string, any> = {}): Promise<any> {
    const response = await api.get('/dashboard/charts', { params });
    return response.data;
  },

  async getWidgets(params: Record<string, any> = {}): Promise<any> {
    const response = await api.get('/dashboard/widgets', { params });
    return response.data;
  },
};
