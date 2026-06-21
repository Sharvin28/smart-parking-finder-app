import { globalStyles } from '@/styles/global';
import { colors, radii, spacing } from '@/styles/theme';
import { getZoneByKey, PARKING_ZONES, ZoneKey } from '@/config/parkingZones';
import { useParkingSlots } from '@/hooks/useParkingData';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface DisplaySlot {
  zoneKey: ZoneKey;
  zoneName: string;
  slotNumber: string;
  occupied: boolean;
  latitude: number;
  longitude: number;
}

export default function ParkingScreen() {
  const { zone } = useLocalSearchParams<{ zone?: string }>();
  const { slots, loading, error } = useParkingSlots();

  const buildDisplaySlots = (): DisplaySlot[] => {
    const zoneKeys: ZoneKey[] = zone
      ? [zone as ZoneKey]
      : (['student', 'staff', 'visitor'] as ZoneKey[]);

    const result: DisplaySlot[] = [];

    zoneKeys.forEach((key) => {
      const zoneConfig = getZoneByKey(key);
      if (!zoneConfig) return;

      const liveSlots = slots[key] ?? [];

      liveSlots.forEach((liveSlot) => {
        const staticSlot = zoneConfig.slots.find(
          (s) => s.slotNumber === liveSlot.slotNumber
        );
        result.push({
          zoneKey: key,
          zoneName: zoneConfig.zoneName,
          slotNumber: liveSlot.slotNumber,
          occupied: liveSlot.occupied,
          latitude: staticSlot?.latitude ?? 0,
          longitude: staticSlot?.longitude ?? 0,
        });
      });
    });

    return result;
  };

  const displaySlots = buildDisplaySlots();
  const availableCount = displaySlots.filter((s) => !s.occupied).length;

  const handleSelectSlot = (slot: DisplaySlot) => {
    if (slot.occupied) {
      Alert.alert('Unavailable', 'This slot is currently occupied.');
      return;
    }

    Alert.alert(
      'Confirm Parking',
      `Navigate to Slot ${slot.slotNumber} in ${slot.zoneName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            router.push({
              pathname: '/(tabs)/navi',
              params: {
                zoneKey: slot.zoneKey,
                slotNumber: slot.slotNumber,
                zoneName: slot.zoneName,
                latitude: String(slot.latitude),
                longitude: String(slot.longitude),
              },
            });
          },
        },
      ]
    );
  };

  const zoneTitle = zone
    ? getZoneByKey(zone)?.zoneName ?? 'Parking List'
    : 'Parking List';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={globalStyles.empty}>
          Unable to load live sensor data. Check your connection.
        </Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>{zoneTitle}</Text>
      <Text style={styles.subtitle}>Tap an available slot to book</Text>

      {/* Summary stat row — Available / Occupied / Total, like the mockup */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {availableCount}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.alert }]}>
            {displaySlots.length - availableCount}
          </Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.textSecondary }]}>
            {displaySlots.length}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {availableCount === 0 && displaySlots.length > 0 && (
        <View style={styles.fullBanner}>
          <Text style={styles.fullBannerTitle}>Zone is full</Text>
          <Text style={styles.fullBannerSubtitle}>
            You'll be notified when a slot opens
          </Text>
        </View>
      )}

      <FlatList
        data={displaySlots}
        keyExtractor={(item) => `${item.zoneKey}-${item.slotNumber}`}
        numColumns={1}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: spacing.md }}
        ListEmptyComponent={
          <Text style={globalStyles.empty}>No parking slots found.</Text>
        }
        renderItem={({ item }) => {
          const isAvailable = !item.occupied;
          return (
            <TouchableOpacity
              style={[
                styles.slotCard,
                isAvailable ? styles.slotAvail : styles.slotOccupied,
              ]}
              onPress={() => handleSelectSlot(item)}
              activeOpacity={isAvailable ? 0.7 : 1}
            >
              <View style={styles.slotIconWrap}>
                <Text style={styles.slotIcon}>🅿️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.slotNumber}>Slot {item.slotNumber}</Text>
                <Text style={styles.slotZone}>{item.zoneName}</Text>
              </View>
              <Text
                style={
                  isAvailable ? styles.statusAvail : styles.statusOccupied
                }
              >
                {isAvailable ? 'Available' : 'Occupied'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fullBanner: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(252,92,92,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252,92,92,0.25)',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  fullBannerTitle: {
    color: colors.alert,
    fontWeight: '700',
    fontSize: 14,
  },
  fullBannerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  slotIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  slotIcon: {
    fontSize: 18,
  },
  slotAvail: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(0,201,167,0.35)',
  },
  slotOccupied: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.6,
  },
  slotNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  slotZone: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusAvail: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  statusOccupied: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
});
