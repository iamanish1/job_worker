import apiClient from './client';
import { PageResponse, WorkerListing, WorkerProfile } from '../types/api.types';

export const workerApi = {
  list: (params: {
    categoryId?: string;
    city?: string;
    available?: boolean;
    page?: number;
    size?: number;
  }) => apiClient.get<{ data: PageResponse<WorkerListing> }>('/workers', { params }),

  getProfile: (workerId: string) =>
    apiClient.get<{ data: WorkerProfile }>(`/workers/${workerId}`),

  getMyProfile: () =>
    apiClient.get<{ data: WorkerProfile }>('/workers/me'),

  updateProfile: (data: any) =>
    apiClient.put<{ data: WorkerProfile }>('/workers/me', data),

  setAvailability: (available: boolean) =>
    apiClient.patch('/workers/me/availability', { available }),

  addDocument: (docType: string, s3Key: string) =>
    apiClient.post('/workers/me/documents', { docType, s3Key }),

  getPresignedUrl: (fileType: string, folder: string) =>
    apiClient.post<{ data: { uploadUrl: string; s3Key: string } }>(
      '/storage/presigned-url', null, { params: { fileType, folder } }),

  // ── Identity verification ────────────────────────────────────

  sendAadhaarOtp: (aadhaarNumber: string) =>
    apiClient.post<{ data: { clientId: string } }>(
      '/verify/aadhaar/send-otp', { aadhaarNumber }),

  verifyAadhaarOtp: (clientId: string, otp: string) =>
    apiClient.post<{ data: { aadhaarVerified: boolean } }>(
      '/verify/aadhaar/verify-otp', { clientId, otp }),

  matchFace: (selfieBase64: string) =>
    apiClient.post<{ data: { faceVerified: boolean } }>(
      '/verify/face', { selfieBase64 }),
};
