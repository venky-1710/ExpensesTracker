import api from './api';
import { User } from '../types';

export const userService = {
  async getProfile(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const response = await api.put('/users/me', profileData);
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    const response = await api.put('/users/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async updatePreferences(preferences: any): Promise<User> {
    const response = await api.put('/users/preferences', preferences);
    return response.data;
  },

  async deleteAccount(): Promise<any> {
    const response = await api.delete('/users/me');
    return response.data;
  },
};
