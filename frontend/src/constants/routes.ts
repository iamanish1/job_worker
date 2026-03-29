export const Routes = {
  // Shared
  SPLASH:          'Splash',
  AUTH:            'Auth',

  // Customer
  CUSTOMER_HOME:   'CustomerHome',
  WORKER_LISTING:  'WorkerListing',
  WORKER_PROFILE:  'WorkerProfile',
  BOOKING:         'Booking',
  BOOKING_TRACKING:'BookingTracking',

  // Worker
  WORKER_ONBOARDING: 'WorkerOnboarding',
  WORKER_DASHBOARD:  'WorkerDashboard',
  BOOKING_REQUESTS:  'BookingRequests',
  EARNINGS:          'Earnings',
  WORKER_PROFILE_EDIT: 'WorkerProfileEdit',
} as const;

export type RouteName = typeof Routes[keyof typeof Routes];
