import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usersApi } from '../services/api';

export function useNotifications(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return;

    async function register() {
      try {
        // Dynamic import — falla silenciosamente en Expo Go (SDK 53+)
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        if (!Device.default.isDevice) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Susurro',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;

        if (existing !== 'granted') {
          const { status: requested } = await Notifications.requestPermissionsAsync();
          status = requested;
        }

        if (status !== 'granted') return;

        const { data: token } = await Notifications.getExpoPushTokenAsync();
        await usersApi.updatePushToken(token);
      } catch {
        // No disponible en Expo Go — requiere development build
      }
    }

    register();
  }, [isLoggedIn]);
}
