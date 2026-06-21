import { colors, spacing } from '@/styles/theme';
import { getZonesForRole } from '@/config/parkingZones';
import { useAvailableSlots } from '@/hooks/useParkingData';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ParkingCard from './ParkingCard';

type ParkingGridProps = {
  role: string;
};

export default function ParkingGrid({ role }: ParkingGridProps) {
  // Live data straight from the ESP32 via Realtime Database —
  // NOT Firestore. The ESP32 firmware writes to /availableSlots,
  // it never touches a Firestore 'parkingZones' collection.
  const { counts, loading, error } = useAvailableSlots();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <Text style={styles.empty}>
        Unable to load live parking data. Check your connection.
      </Text>
    );
  }

  const zones = getZonesForRole(role);

  if (zones.length === 0) {
    return (
      <Text style={styles.empty}>No parking zones assigned to your role.</Text>
    );
  }

  return (
    <View style={styles.grid}>
      {zones.map((zone) => (
        <ParkingCard
          key={zone.key}
          label={zone.zoneName}
          available={counts[zone.key]}
          total={zone.totalSlots}
          color={zone.color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  center: {
    marginTop: 30,
    alignItems: 'center',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
