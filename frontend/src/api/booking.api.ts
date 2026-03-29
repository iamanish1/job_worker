import apiClient from './client';
import { Booking, PageResponse } from '../types/api.types';

export const bookingApi = {
  create: (data: {
    workerId:       string;
    categoryId:     string;
    address:        string;
    scheduledAt:    string;
    description?:   string;
    quotedAmount?:  number;
    latitude?:      number;
    longitude?:     number;
    idempotencyKey: string;
  }) => apiClient.post<{ data: Booking }>('/bookings', data),

  getMyBookings: (page = 0, size = 20) =>
    apiClient.get<{ data: PageResponse<Booking> }>('/bookings', { params: { page, size } }),

  getById: (bookingId: string) =>
    apiClient.get<{ data: Booking }>(`/bookings/${bookingId}`),

  confirm: (bookingId: string) =>
    apiClient.patch<{ data: Booking }>(`/bookings/${bookingId}/confirm`),

  start: (bookingId: string, otpCode: string) =>
    apiClient.patch<{ data: Booking }>(`/bookings/${bookingId}/start`, { otpCode }),

  complete: (bookingId: string) =>
    apiClient.patch<{ data: Booking }>(`/bookings/${bookingId}/complete`),

  cancel: (bookingId: string, reason?: string) =>
    apiClient.patch<{ data: Booking }>(`/bookings/${bookingId}/cancel`, { reason }),
};
