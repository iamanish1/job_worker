import apiClient from './client';
import { AuthResponse } from '../types/api.types';

export const authApi = {
  verifyOtp: (phone: string, firebaseIdToken: string, role: string) =>
    apiClient.post<{ data: AuthResponse }>('/auth/otp/verify', {
      phone, firebaseIdToken, role,
    }),

  refresh: (refreshToken: string) =>
    apiClient.post<{ data: AuthResponse }>('/auth/refresh', { refreshToken }),
};
