import apiClient from './client';
import { Category } from '../types/api.types';

export const categoryApi = {
  getAll: () => apiClient.get<{ data: Category[] }>('/categories'),
};
