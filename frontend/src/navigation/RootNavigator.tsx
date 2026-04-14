import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { RootState } from '../store';
import { setAuth } from '../store/auth.slice';
import { SecureStorage } from '../utils/storage';
import { Config } from '../constants/config';
import { userApi } from '../api/user.api';
import SplashScreen    from '../screens/shared/SplashScreen';
import AuthScreen      from '../screens/shared/AuthScreen';
import CustomerNavigator from './CustomerNavigator';
import WorkerNavigator   from './WorkerNavigator';
import UpdateManager     from '../utils/UpdateManager';

const Stack = createNativeStackNavigator();

/** Decode a JWT payload without verifying signature (base64url safe) */
function decodeJwtPayload(token: string): any {
  const base64url = token.split('.')[1];
  // base64url → standard base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );
  return JSON.parse(json);
}

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = decodeJwtPayload(token);
    return exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export default function RootNavigator() {
  const dispatch             = useDispatch();
  const { isLoggedIn, role } = useSelector((s: RootState) => s.auth);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const accessToken = await SecureStorage.getAccessToken();

        let activeToken = accessToken;

        // Case 1: access token expired or missing → try refresh token
        if (!activeToken || isTokenExpired(activeToken)) {
          const refreshToken = await SecureStorage.getRefreshToken();
          if (!refreshToken || isTokenExpired(refreshToken)) return; // both expired → show auth

          const res = await axios.post(`${Config.API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
          await SecureStorage.saveTokens(newAccess, newRefresh);
          activeToken = newAccess;
        }

        // Restore basic auth from JWT so navigation works immediately
        const payload = decodeJwtPayload(activeToken!);
        dispatch(setAuth({
          userId: payload.sub,
          phone:  '',
          name:   null,
          role:   payload.role,
        }));

        // Fetch real user profile (phone + name) from backend
        try {
          const { data } = await userApi.getMe();
          const user = data.data;
          dispatch(setAuth({
            userId: user.id,
            phone:  user.phone,
            name:   user.name,
            role:   user.role,
          }));
        } catch (_) { /* profile fetch failed — session still valid, profile shows partial data */ }
      } catch (_) {
        // Refresh failed (revoked / network error) — clear tokens and show auth screen
        await SecureStorage.clearTokens();
      } finally {
        setBootstrapped(true);
      }
    })();
  }, [dispatch]);

  if (!bootstrapped) return <SplashScreen />;

  return (
    <NavigationContainer>
      <UpdateManager />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : role === 'WORKER' ? (
          <Stack.Screen name="WorkerApp" component={WorkerNavigator} />
        ) : (
          <Stack.Screen name="CustomerApp" component={CustomerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
