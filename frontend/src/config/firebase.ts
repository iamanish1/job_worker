import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import Constants from 'expo-constants';

const firebaseConfig = Constants.expoConfig?.extra?.firebase ?? {
  apiKey:            'YOUR_FIREBASE_API_KEY',
  authDomain:        'YOUR_PROJECT.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

let app: FirebaseApp;
let firebaseAuth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  firebaseAuth = initializeAuth(app);
} else {
  app = getApps()[0];
  firebaseAuth = getAuth(app);
}

export { firebaseAuth };
export default app;
