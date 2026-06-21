// firebase.ts (project root, same level as app.json / package.json)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Values below are taken from your ESP32 firmware where they matched.
// Fill in authDomain / storageBucket / messagingSenderId / appId from
// Firebase Console -> Project Settings -> General -> Your apps -> SDK setup.
const firebaseConfig = {
  apiKey: "AIzaSyATLmwNY24_xyAPBrcRWLshjKAH-DFJvJU",
  authDomain: "smart-parking-finder-app.firebaseapp.com",
  databaseURL: "https://smart-parking-finder-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-parking-finder-app",
  storageBucket: "smart-parking-finder-app.firebasestorage.app",
  messagingSenderId: "844560194748",
  appId: "1:844560194748:web:5b74ccccd3897680e044b9"
};

const app = initializeApp(firebaseConfig);

// Persist auth session across app restarts on mobile
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore — used for: users, parkingRecords (time in/out history)
export const db = getFirestore(app);

// Realtime Database — used for: live IR sensor data written by the ESP32
// (/parking/{zone}/slot{n}/occupied, /availableSlots/{zone})
export const rtdb = getDatabase(app);
