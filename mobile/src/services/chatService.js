import api from './api';

export const chatService = {
  getHistory: async () => {
    const response = await api.get('/api/chat/history');
    return response.data;
  },

  sendMessage: async (message, thread_id = null) => {
    const payload = { message };
    if (thread_id && thread_id !== 'pending') {
      payload.thread_id = thread_id;
    }
    const response = await api.post('/api/chat', payload);
    return response.data;
  },

  deleteThread: async (threadId) => {
    const response = await api.delete(`/api/chat/history/${threadId}`);
    return response.data;
  },

  renameThread: async (threadId, title) => {
    const response = await api.put(`/api/chat/history/${threadId}/title`, { title });
    return response.data;
  }
};
