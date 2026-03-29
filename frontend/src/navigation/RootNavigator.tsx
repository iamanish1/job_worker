import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setAuth } from '../store/auth.slice';
import { SecureStorage } from '../utils/storage';
import SplashScreen    from '../screens/shared/SplashScreen';
import AuthScreen      from '../screens/shared/AuthScreen';
import CustomerNavigator from './CustomerNavigator';
import WorkerNavigator   from './WorkerNavigator';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch       = useDispatch();
  const { isLoggedIn, role } = useSelector((s: RootState) => s.auth);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStorage.getAccessToken();
        if (token) {
          // Decode JWT payload (no verify — just read claims for UI)
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
          if (payload.exp * 1000 > Date.now()) {
            dispatch(setAuth({
              userId: payload.sub,
              phone:  '',
              name:   null,
              role:   payload.role,
            }));
          }
        }
      } catch (_) { /* expired or invalid token — stay logged out */ }
      finally { setBootstrapped(true); }
    })();
  }, [dispatch]);

  if (!bootstrapped) return <SplashScreen />;

  return (
    <NavigationContainer>
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
