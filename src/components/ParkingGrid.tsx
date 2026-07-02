import { getZonesForRole } from '@/config/parkingZones';
import { useAvailableSlots } from '@/hooks/useParkingData';
import { colors, spacing } from '@/styles/theme';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ParkingCard from './ParkingCard';

type ParkingGridProps = {
  role: string;
};

export default function ParkingGrid({ role }: ParkingGridProps) {

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
      {zones.map((zone) => {
        // AvailableCounts keys are PascalCase (Student/Staff/Visitor) —
        // zone.key is already in that exact casing, so use it directly.
        const key = zone.key as keyof typeof counts;
        return (
          <ParkingCard
            key={zone.key}
            label={zone.zoneName}
            available={counts?.[key] ?? 0}
            total={zone.totalSlots}
            color={zone.color}
          />
        );
      })}
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
