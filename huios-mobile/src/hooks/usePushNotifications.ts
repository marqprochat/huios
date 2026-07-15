import { useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { EventSubscription } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { registerPushToken } from '@/services/notifications';

const PUSH_TOKEN_KEY = 'huios_push_token';

export function usePushNotifications() {
  const notificationListener = useRef<EventSubscription | undefined>(undefined);
  const responseListener = useRef<EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return;
    }

    let isActive = true;

    void import('expo-notifications').then(async (Notifications) => {
      if (!isActive) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      await registerForPushNotificationsAsync(Notifications);
      if (!isActive) return;

      notificationListener.current = Notifications.addNotificationReceivedListener(() => {
        // notification received while app is open
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        // user tapped notification
      });
    });

    return () => {
      isActive = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

async function registerForPushNotificationsAsync(
  Notifications: typeof import('expo-notifications'),
) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HuIOS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#135bec',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (stored !== token) {
      await registerPushToken(token, Platform.OS as 'android' | 'ios');
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    }
  } catch {
    // push token registration failed silently
  }
}
