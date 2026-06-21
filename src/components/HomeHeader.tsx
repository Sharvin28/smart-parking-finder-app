import { colors, spacing } from '@/styles/theme';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeHeader() {
  const currentDate = new Date().toLocaleDateString('en-MY', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.date}>{currentDate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
