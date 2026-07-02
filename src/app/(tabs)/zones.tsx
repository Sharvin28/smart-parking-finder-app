import { PARKING_ZONES } from '@/config/parkingZones';
import { useAvailableSlots } from '@/hooks/useParkingData';
import { globalStyles } from '@/styles/global';
import { colors, radii, spacing } from '@/styles/theme';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AdminZonesScreen() {

  const { counts, loading, error } = useAvailableSlots();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={globalStyles.title}>All Zones</Text>
      <Text style={styles.subtitle}>Live occupancy · all parking areas</Text>

      {error && (
        <Text style={[globalStyles.empty, { marginTop: spacing.lg }]}>
          Unable to load live sensor data. Check your connection.
        </Text>
      )}

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {PARKING_ZONES.map((zone) => {
          const available = counts[zone.key] ?? 0;
          const occupied = Math.max(zone.totalSlots - available, 0);
          const pct = zone.totalSlots > 0 ? Math.round((occupied / zone.totalSlots) * 100) : 0;
          const statusColor = pct > 80 ? colors.alert : pct > 50 ? colors.warning : colors.primary;

          return (
            <TouchableOpacity
              key={zone.key}
              style={styles.zoneCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({ pathname: '/(tabs)/parking', params: { zone: zone.key } })
              }
            >
              <View style={styles.zoneHeader}>
                <View style={styles.zoneNameRow}>
                  <View style={[styles.colorDot, { backgroundColor: zone.color }]} />
                  <Text style={styles.zoneName}>{zone.zoneName}</Text>
                </View>
                <View style={[styles.pctBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.pctText, { color: statusColor }]}>{pct}% full</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: statusColor },
                  ]}
                />
              </View>

              <View style={styles.zoneFooter}>
                <Text style={styles.footerText}>
                  {available} free of {zone.totalSlots}
                </Text>
                <Text style={styles.footerText}>{occupied} occupied</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.reportLink}
        onPress={() => router.push('/(tabs)/report')}
      >
        <Text style={styles.reportLinkText}>📊 View usage report →</Text>
      </TouchableOpacity>
    </ScrollView>
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
  zoneCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  zoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  zoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reportLink: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  reportLinkText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
