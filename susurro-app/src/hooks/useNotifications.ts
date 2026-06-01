import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { usersApi } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return;

    async function register() {
      if (!Device.isDevice) return; // No funciona en emuladores

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Susurro',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#ffffff',
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
      try {
        await usersApi.updatePushToken(token);
      } catch {
        // No crítico
      }
    }

    register();
  }, [isLoggedIn]);
}
