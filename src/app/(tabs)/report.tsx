import { globalStyles } from '@/styles/global';
import { colors, radii, spacing } from '@/styles/theme';
import { useParkingReport } from '@/hooks/useParkingReport';
import { exportReportAsCSV, exportReportAsPDF } from '@/utils/exportReport';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ExportKind = 'csv' | 'pdf' | null;

export default function AdminReportScreen() {
  const { records, summary, loading, error, refetch } = useParkingReport();
  const [exporting, setExporting] = useState<ExportKind>(null);

  const handleExport = async (kind: 'csv' | 'pdf') => {
    if (!summary || records.length === 0) {
      Alert.alert('No data', 'There are no parking records to export yet.');
      return;
    }
    setExporting(kind);
    try {
      if (kind === 'csv') {
        await exportReportAsCSV(records);
      } else {
        await exportReportAsPDF(summary, records);
      }
    } catch (err: any) {
      Alert.alert('Export failed', err.message ?? 'Something went wrong.');
    } finally {
      setExporting(null);
    }
  };

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={globalStyles.title}>Reports</Text>
      <Text style={styles.subtitle}>Generate usage analytics</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {summary && (
        <>
          {/* Summary stat row */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {summary.totalSessions}
              </Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.warning }]} numberOfLines={1}>
                {summary.peakZone ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Peak Zone</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {summary.avgDurationMinutes !== null ? `${summary.avgDurationMinutes} min` : '—'}
              </Text>
              <Text style={styles.statLabel}>Avg. Stay</Text>
            </View>
          </View>

          {/* Zone breakdown */}
          <Text style={globalStyles.sectionTitle}>Zone Breakdown</Text>
          {summary.zoneSummaries.length === 0 ? (
            <Text style={globalStyles.empty}>No parking sessions recorded yet.</Text>
          ) : (
            summary.zoneSummaries.map((z) => (
              <View key={z.zone} style={styles.zoneRow}>
                <View style={styles.zoneRowHeader}>
                  <Text style={styles.zoneName}>{z.zone}</Text>
                  <Text style={styles.zoneDate}>
                    {z.completedSessions}/{z.sessions} completed
                  </Text>
                </View>
                <View style={styles.zoneStatsRow}>
                  <Text style={styles.zoneStat}>
                    Sessions: <Text style={styles.zoneStatStrong}>{z.sessions}</Text>
                  </Text>
                  <Text style={styles.zoneStat}>
                    Peak:{' '}
                    <Text style={[styles.zoneStatStrong, { color: colors.warning }]}>
                      {z.peakHourLabel ?? '—'}
                    </Text>
                  </Text>
                  <Text style={styles.zoneStat}>
                    Avg:{' '}
                    <Text style={styles.zoneStatStrong}>
                      {z.avgDurationMinutes !== null ? `${z.avgDurationMinutes} min` : '—'}
                    </Text>
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Export buttons */}
          <Text style={globalStyles.sectionTitle}>Export</Text>
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[globalStyles.outlineButton, styles.exportButton]}
              onPress={() => handleExport('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'csv' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={globalStyles.outlineButtonText}>⬇ Export CSV</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.primaryButton, styles.exportButton]}
              onPress={() => handleExport('pdf')}
              disabled={exporting !== null}
            >
              {exporting === 'pdf' ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={globalStyles.primaryButtonText}>⬇ Export PDF</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footnote}>
            CSV includes the full session log. PDF includes a formatted summary plus the
            {records.length > 200 ? ' 200 most recent sessions.' : ' full session log.'}
          </Text>
        </>
      )}
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
  errorBanner: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(252,92,92,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252,92,92,0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: colors.alert,
    fontSize: 12,
    flex: 1,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: spacing.md,
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
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  zoneRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  zoneRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  zoneName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  zoneDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  zoneStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  zoneStat: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  zoneStatStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exportButton: {
    flex: 1,
  },
  footnote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
