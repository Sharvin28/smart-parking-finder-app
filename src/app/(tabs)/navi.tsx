import { colors, radii, spacing } from '@/styles/theme';
import { ZoneKey } from '@/config/parkingZones';
import { router, useLocalSearchParams } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { auth, db, rtdb } from '../../../firebase';

const CAMPUS_REGION = {
  latitude: 3.139,
  longitude: 101.6869,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function NavigationScreen() {
  const { zoneKey, slotNumber, zoneName, latitude, longitude } =
    useLocalSearchParams<{
      zoneKey?: ZoneKey;
      slotNumber?: string;
      zoneName?: string;
      latitude?: string;
      longitude?: string;
    }>();

  const hasSlot = Boolean(zoneKey && slotNumber);
  const lat = latitude ? parseFloat(latitude) : CAMPUS_REGION.latitude;
  const lng = longitude ? parseFloat(longitude) : CAMPUS_REGION.longitude;

  const [occupied, setOccupied] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!zoneKey || !slotNumber) return;
    const slotPath = `/parking/${zoneKey}/slot${slotNumber}/occupied`;
    const slotRef = ref(rtdb, slotPath);
    const unsubscribe = onValue(slotRef, (snapshot) => {
      setOccupied(Boolean(snapshot.val()));
    });
    return () => unsubscribe();
  }, [zoneKey, slotNumber]);

  useEffect(() => {
    if (!zoneKey || !slotNumber) return;
    const checkSession = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const slotId = `${zoneKey}-slot${slotNumber}`;
      const q = query(
        collection(db, 'parkingRecords'),
        where('userId', '==', user.uid),
        where('slotId', '==', slotId),
        where('timeOut', '==', null)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setActiveRecordId(snap.docs[0].id);
        setCheckedIn(true);
      }
    };
    checkSession();
  }, [zoneKey, slotNumber]);

  const handleCheckIn = async () => {
    const user = auth.currentUser;
    if (!user || !zoneKey || !slotNumber) return;
    setActionLoading(true);
    try {
      const slotId = `${zoneKey}-slot${slotNumber}`;
      const recordRef = doc(collection(db, 'parkingRecords'));
      await setDoc(recordRef, {
        userId: user.uid,
        slotId,
        zone: zoneName ?? zoneKey,
        timeIn: serverTimestamp(),
        timeOut: null,
      });
      setActiveRecordId(recordRef.id);
      setCheckedIn(true);
      Alert.alert('Checked In ✅', 'Your parking session has started.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = () => {
    if (!activeRecordId) return;
    Alert.alert('Check Out', 'End your parking session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await updateDoc(doc(db, 'parkingRecords', activeRecordId), {
              timeOut: serverTimestamp(),
            });
            Alert.alert(
              'Checked Out ✅',
              'Session recorded. The sensor will detect when you leave.',
              [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
            );
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const mapRegion = {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={hasSlot ? mapRegion : CAMPUS_REGION}>
        {hasSlot ? (
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            title={`Slot ${slotNumber}`}
            description={zoneName}
            pinColor={occupied && !checkedIn ? colors.alert : checkedIn ? colors.primary : colors.successAlt}
          />
        ) : (
          <Marker
            coordinate={{
              latitude: CAMPUS_REGION.latitude,
              longitude: CAMPUS_REGION.longitude,
            }}
            title="Campus"
            description="Select a slot from the Parking tab"
          />
        )}
      </MapView>

      <View style={styles.infoBar}>
        {hasSlot ? (
          <>
            {/* Slot summary card, mirrors the mockup's slot info bar */}
            <View style={styles.slotCard}>
              <View>
                <Text style={styles.slotNumber}>Slot {slotNumber}</Text>
                <Text style={styles.zoneName}>{zoneName}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: checkedIn
                      ? 'rgba(0,201,167,0.15)'
                      : occupied
                      ? 'rgba(252,92,92,0.15)'
                      : 'rgba(72,187,120,0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: checkedIn
                        ? colors.primary
                        : occupied
                        ? colors.alert
                        : colors.successAlt,
                    },
                  ]}
                >
                  {checkedIn ? 'Session Active' : occupied ? 'Occupied' : 'Available'}
                </Text>
              </View>
            </View>

            {occupied && !checkedIn && (
              <Text style={styles.warningLabel}>
                ⚠️ Sensor reports this slot is now occupied
              </Text>
            )}

            {checkedIn ? (
              <TouchableOpacity
                style={styles.checkOutBtn}
                onPress={handleCheckOut}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.btnTextLight}>
                    Check Out (Record Time Out)
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.checkInBtn}
                onPress={handleCheckIn}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.btnTextDark}>
                    Check In (Record Time In)
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.hint}>
            Select a parking slot from the Parking tab to navigate here.
          </Text>
        )}

        <TouchableOpacity
          style={styles.homeLink}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.homeLinkText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  infoBar: {
    padding: spacing.lg,
    backgroundColor: colors.header,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  slotNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  zoneName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  warningLabel: {
    textAlign: 'center',
    color: colors.alert,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: spacing.md,
  },
  checkInBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  checkOutBtn: {
    backgroundColor: colors.alert,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnTextDark: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  btnTextLight: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  homeLink: { padding: spacing.md, alignItems: 'center' },
  homeLinkText: { color: colors.primary, fontWeight: '700' },
});
