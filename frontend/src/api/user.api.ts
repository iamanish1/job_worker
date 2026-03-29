import apiClient from './client';
import { User } from '../types/api.types';

export const userApi = {
  getMe: () => apiClient.get<{ data: User }>('/users/me'),

  updateProfile: (data: {
    name?:         string;
    email?:        string;
    profilePhoto?: string;
    fcmToken?:     string;
  }) => apiClient.put<{ data: User }>('/users/me', data),
};
