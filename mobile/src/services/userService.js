import api from './api';

export const userService = {
  async getProfile() {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/users/me', data);
    return response.data;
  },

  async changePassword(oldPassword, newPassword) {
    const response = await api.put('/users/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async deleteAccount(password) {
    const response = await api.delete('/users/me', { data: { password } });
    return response.data;
  },
};
