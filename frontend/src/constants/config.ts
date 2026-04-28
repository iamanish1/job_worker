export const Config = {
  API_BASE_URL:   __DEV__
    ? 'http://192.168.1.13:8081/api'   // Expo Go on physical device
    : 'https://jobworker-production.up.railway.app/api',   // Production (Railway)
  BOOKING_POLL_INTERVAL_MS: 30_000,   // 30s polling for tracking
  OTP_RESEND_COOLDOWN_S:    30,
  AUTH_FALLBACK_OTP_CODE:   '98737',
  MAX_FILE_SIZE_MB:         10,

  // ── Cloudinary ──────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME:    'dvl0ucct1',
  CLOUDINARY_UPLOAD_PRESET: 'Kamwala',
};
