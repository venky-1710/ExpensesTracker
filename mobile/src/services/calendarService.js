import api from './api';

export const calendarService = {
  async getEvents() {
    const response = await api.get('/api/calendar');
    return response.data;
  },

  async createEvent(data) {
    const response = await api.post('/api/calendar', data);
    return response.data;
  },

  async updateEvent(id, data) {
    const response = await api.put(`/api/calendar/${id}`, data);
    return response.data;
  },

  async deleteEvent(id) {
    const response = await api.delete(`/api/calendar/${id}`);
    return response.data;
  },
};
