import * as Notifications from 'expo-notifications';
import * as Device       from 'expo-device';
import Constants         from 'expo-constants';
import { Platform }      from 'react-native';
import { userApi }       from '../api/user.api';

// How foreground notifications behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Requests push permission and registers the Expo push token with our backend.
 * Call this once after the user logs in successfully.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    // Save token to backend so server can send push via FCM
    await userApi.updateProfile({ fcmToken: token });
    console.log('Push token registered:', token);
  } catch (e) {
    console.warn('Failed to get push token:', e);
  }
}
