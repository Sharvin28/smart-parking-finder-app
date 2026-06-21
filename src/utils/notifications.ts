import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// Called from Cloud Function via Expo Push API — no local scheduling needed.
// These helpers are kept for any local test notifications during development.
export const scheduleTestNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🅿️ Campus Parking',
      body: 'A parking slot in your zone is now available!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
