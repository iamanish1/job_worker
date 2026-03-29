import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store, RootState }  from './src/store';
import RootNavigator         from './src/navigation/RootNavigator';
import Toast                 from 'react-native-toast-message';
import { registerForPushNotifications } from './src/utils/notifications';

// Inner component so it can access Redux state
function AppInner() {
  const isLoggedIn = useSelector((s: RootState) => s.auth.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      // Register push token with backend after login
      registerForPushNotifications().catch(console.warn);
    }
  }, [isLoggedIn]);

  return (
    <>
      <RootNavigator />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
