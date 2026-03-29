export interface ApiResponse<T> {
  success:   boolean;
  message:   string | null;
  data:      T;
  timestamp: string;
}

export interface PageResponse<T> {
  content:       T[];
  page:          number;
  size:          number;
  totalElements: number;
  totalPages:    number;
  last:          boolean;
}

export interface User {
  id:           string;
  phone:        string;
  name:         string | null;
  email:        string | null;
  profilePhoto: string | null;
  role:         'CUSTOMER' | 'WORKER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user: {
    id:        string;
    phone:     string;
    name:      string | null;
    role:      string;
    isNewUser: boolean;
  };
}

export interface Category {
  id:         string;
  name:       string;
  nameHindi:  string | null;
  iconUrl:    string | null;
  sortOrder:  number;
}

export interface WorkerListing {
  id:              string;
  name:            string;
  profilePhoto:    string | null;
  categoryName:    string;
  city:            string;
  locality:        string | null;
  avgRating:       number;
  totalJobs:       number;
  yearsExperience: number;
  dailyRate:       number | null;
  hourlyRate:      number | null;
  isAvailable:     boolean;
}

export interface WorkerCategoryEntry {
  categoryId:      string;
  categoryName:    string;
  yearsExperience: number;
}

export interface WorkerProfile extends WorkerListing {
  userId:             string;
  phone:              string;
  categoryId:         string;
  workerCategories:   WorkerCategoryEntry[];
  bio:                string | null;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  aadhaarVerified:    boolean;
  faceVerified:       boolean;
  documents:          WorkerDocument[];
}

export interface WorkerDocument {
  id:      string;
  docType: string;
  s3Key:   string;
  status:  'UPLOADED' | 'VERIFIED' | 'REJECTED';
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Booking {
  id:                 string;
  status:             BookingStatus;
  otpCode:            string | null;
  worker:             { id: string; name: string; phone: string; profilePhoto: string | null };
  customer:           { id: string; name: string; phone: string };
  categoryName:       string;
  address:            string;
  description:        string | null;
  scheduledAt:        string;
  confirmedAt:        string | null;
  startedAt:          string | null;
  completedAt:        string | null;
  quotedAmount:       number | null;
  finalAmount:        number | null;
  paymentStatus:      string;
  reviewed:           boolean;
  cancellationReason: string | null;
  cancelledBy:        string | null;
  createdAt:          string;
}

export interface Notification {
  id:        string;
  title:     string;
  body:      string | null;
  type:      string;
  refId:     string | null;
  isRead:    boolean;
  createdAt: string;
}

export interface Review {
  id:           string;
  bookingId:    string;
  reviewerName: string;
  reviewerPhoto: string | null;
  rating:       number;
  comment:      string | null;
  createdAt:    string;
}
