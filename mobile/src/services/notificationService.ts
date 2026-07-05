import api from './api';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_event_id?: string;
  related_event_amount?: number;
  related_event_payment_method?: string;
  related_event_start_time?: string;
  created_at: string;
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const response = await api.get('/api/notifications');
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<any> {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<any> {
    const response = await api.put('/api/notifications/read-all');
    return response.data;
  },

  async clearAll(): Promise<any> {
    const response = await api.delete('/api/notifications');
    return response.data;
  },

  async deleteNotification(notificationId: string): Promise<any> {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  }
};
