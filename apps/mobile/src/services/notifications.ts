import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Le projet Expo EAS est absent de la configuration.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.registerPushDevice(Platform.OS as 'ios' | 'android', token);
  return true;
}

export async function unregisterPushNotifications(): Promise<void> {
  const devices = await api.pushDevices();
  await Promise.all(devices.map((device) => api.removePushDevice(device.id)));
}
