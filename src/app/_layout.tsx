import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { auth, db } from '../../firebase';

export default function RootLayout() {

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          router.replace('/');
          return;
        }
        const role = userDoc.data().role;

        const currentRoute = router.canGoBack() ? null : 'root';
        if (role === 'Admin') {
          router.replace('/(tabs)/home'); // admin tab
        } else {
          router.replace('/(tabs)/parking');
        }
      } catch (err) {
        console.error('Auth redirect error:', err);
        router.replace('/');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleColdLaunch = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return;
      const data = response.notification.request.content.data as {
        zone?: string;
      };
      if (data?.zone) {
        router.push({
          pathname: '/(tabs)/parking',
          params: { zone: data.zone },
        });
      }
    };
    handleColdLaunch();

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          zone?: string;
        };
        if (data?.zone) {
          router.push({
            pathname: '/(tabs)/parking',
            params: { zone: data.zone },
          });
        }
      }
    );
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
