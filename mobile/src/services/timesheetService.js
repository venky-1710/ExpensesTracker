import api from './api';

export const timesheetService = {
  createTimesheet: async (data) => {
    const res = await api.post('/timesheets', data);
    return res.data.data;
  },

  getTimesheets: async (startDate, endDate, page = 1, limit = 20) => {
    let url = '/timesheets';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('page', page);
    params.append('limit', limit);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await api.get(url);
    return res.data.data;
  },

  updateTimesheet: async (id, data) => {
    const res = await api.put(`/timesheets/${id}`, data);
    return res.data.data;
  },

  deleteTimesheet: async (id) => {
    const res = await api.delete(`/timesheets/${id}`);
    return res.data.data;
  },

  deleteMultipleTimesheets: async (ids) => {
    const res = await api.post('/timesheets/bulk-delete', { ids });
    return res.data;
  }
};
