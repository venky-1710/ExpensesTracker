import api from './api';

export const userService = {
  async getProfile() {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await api.put('/users/me', profileData);
    return response.data;
  },

  async changePassword(oldPassword, newPassword) {
    const response = await api.put('/users/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async updatePreferences(preferences) {
    const response = await api.put('/users/preferences', preferences);
    return response.data;
  },

  async deleteAccount() {
    const response = await api.delete('/users/me');
    return response.data;
  },
};
