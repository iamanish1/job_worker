import apiClient from './client';
import { PageResponse, Review } from '../types/api.types';

export const reviewApi = {
  create: (data: { bookingId: string; rating: number; comment?: string }) =>
    apiClient.post('/reviews', data),

  getWorkerReviews: (workerId: string, page = 0, size = 10) =>
    apiClient.get<{ data: PageResponse<Review> }>(`/workers/${workerId}/reviews`, {
      params: { page, size },
    }),
};
