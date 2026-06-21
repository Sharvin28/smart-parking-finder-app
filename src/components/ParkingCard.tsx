import { colors, radii, spacing } from '@/styles/theme';
import { StyleSheet, Text, View } from 'react-native';

type ParkingCardProps = {
  label: string;
  available: number;
  total: number;
  color: string;
};

export default function ParkingCard({
  label,
  available,
  total,
  color,
}: ParkingCardProps) {
  const isLow = available === 0;
  const isWarn = available > 0 && available < total * 0.3;
  const valueColor = isLow ? colors.alert : isWarn ? colors.warning : color;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.dot, { backgroundColor: valueColor }]} />
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{available}</Text>
      <Text style={styles.goal}>of {total} slots free</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '47%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  goal: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
