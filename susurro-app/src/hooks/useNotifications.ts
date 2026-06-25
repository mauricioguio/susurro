import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId as string | undefined
          ?? 'ed4b5937-23df-4ed9-84f0-157f27ae1063';
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log('[useNotifications] token obtenido:', token?.slice(0, 50));
        await usersApi.updatePushToken(token);
        console.log('[useNotifications] token guardado en BD');
      } catch (e) {
        console.warn('[useNotifications] error:', e);
      }
    }

    register();
  }, [isLoggedIn]);
}
