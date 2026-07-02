import { getZonesForRole, ZoneKey } from '@/config/parkingZones';
import { useParkingSlots } from '@/hooks/useParkingData';
import { globalStyles } from '@/styles/global';
import { colors, radii, roleColors, spacing } from '@/styles/theme';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../../firebase';

interface DisplaySlot {
  zoneKey: ZoneKey;
  zoneName: string;
  slotNumber: string;
  occupied: boolean;
  sensorId: string;
  latitude: number;
  longitude: number;
}

export default function ParkingScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const { slots, loading, error } = useParkingSlots();

  // Use role from nav param (fast path from home.tsx) or fetch from Firestore
  // when user arrives via the tab bar directly
  const [role, setRole] = useState<string>(roleParam ?? '');
  const [roleLoading, setRoleLoading] = useState(!roleParam);
  const [selectedSlot, setSelectedSlot] = useState<DisplaySlot | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (roleParam) return;
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setRole(snap.data().role ?? '');
      }
      setRoleLoading(false);
    };
    fetchRole();
  }, [roleParam]);

  // Build slot list — only zones allowed for this role, coords from Firebase
  const buildDisplaySlots = (): DisplaySlot[] => {
    const allowedZones = getZonesForRole(role);
    const result: DisplaySlot[] = [];

    allowedZones.forEach((zoneConfig) => {
      const key = zoneConfig.key;
      const liveSlots = slots[key] ?? [];

      liveSlots.forEach((liveSlot) => {
        result.push({
          zoneKey:    key,
          zoneName:   zoneConfig.zoneName,
          slotNumber: liveSlot.slotNumber,
          occupied:   liveSlot.occupied,
          sensorId:   liveSlot.sensorId,
          // Coordinates now come directly from Firebase via the hook
          latitude:   liveSlot.latitude,
          longitude:  liveSlot.longitude,
        });
      });
    });

    return result;
  };

  const displaySlots = buildDisplaySlots();
  const availableCount = displaySlots.filter((s) => !s.occupied).length;

  const handleSelectSlot = (slot: DisplaySlot) => {
    if (slot.occupied) return;
    setSelectedSlot(slot);
    setConfirmVisible(true);
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;
    setConfirmVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/(tabs)/navi',
      params: {
        zoneKey:    selectedSlot.zoneKey,
        slotNumber: selectedSlot.slotNumber,
        zoneName:   selectedSlot.zoneName,
        sensorId:   selectedSlot.sensorId,
        latitude:   String(selectedSlot.latitude),
        longitude:  String(selectedSlot.longitude),
      },
    });
    setSelectedSlot(null);
  };

  const handleCancel = () => {
    setConfirmVisible(false);
    setSelectedSlot(null);
  };

  if (loading || roleLoading) {
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

  const rc = roleColors[role] ?? roleColors.Student;
  const allowedZones = getZonesForRole(role);

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Parking List</Text>

      {/* Role badge — shows which zones are visible */}
      {!!role && (
        <View style={[styles.roleBadge, { backgroundColor: rc.accent + '22' }]}>
          <View style={[styles.roleDot, { backgroundColor: rc.accent }]} />
          <Text style={[styles.roleText, { color: rc.label }]}>
            {role} · {allowedZones.map((z) => z.zoneName).join(', ')}
          </Text>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
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
          <Text style={styles.fullBannerTitle}>All slots are full</Text>
          <Text style={styles.fullBannerSubtitle}>
            You'll be notified when a slot opens
          </Text>
        </View>
      )}

      <Text style={styles.subtitle}>
        {availableCount > 0 ? 'Tap an available slot to navigate' : ''}
      </Text>

      <FlatList
        data={displaySlots}
        keyExtractor={(item) => `${item.zoneKey}-${item.slotNumber}`}
        numColumns={1}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: spacing.sm }}
        ListEmptyComponent={
          <Text style={globalStyles.empty}>
            No parking slots available for your role.
          </Text>
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
              activeOpacity={isAvailable ? 0.75 : 1}
              disabled={!isAvailable}
            >
              <View style={[
                styles.slotIconWrap,
                { backgroundColor: isAvailable ? 'rgba(0,201,167,0.12)' : 'rgba(255,255,255,0.04)' },
              ]}>
                <Text style={styles.slotIcon}>{isAvailable ? '🅿️' : '🚗'}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.slotNumber}>Slot {item.slotNumber}</Text>
                <Text style={styles.slotZone}>{item.zoneName}</Text>
                {/* Show sensor ID so user knows which physical sensor covers this bay */}
                <Text style={styles.sensorId}>Sensor: {item.sensorId}</Text>
              </View>

              <View style={[
                styles.statusPill,
                { backgroundColor: isAvailable ? 'rgba(0,201,167,0.15)' : 'rgba(252,92,92,0.1)' },
              ]}>
                <Text style={isAvailable ? styles.statusAvail : styles.statusOccupied}>
                  {isAvailable ? '● Available' : '● Occupied'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Confirmation Modal ───────────────────────────────────────────── */}
      <Modal
        transparent
        visible={confirmVisible}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>🅿️</Text>
            </View>

            <Text style={styles.modalTitle}>Confirm Parking</Text>
            <Text style={styles.modalSubtitle}>Navigate to your selected slot?</Text>

            <View style={styles.modalDetailBox}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Slot</Text>
                <Text style={styles.modalDetailValue}>{selectedSlot?.slotNumber}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Zone</Text>
                <Text style={styles.modalDetailValue}>{selectedSlot?.zoneName}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Sensor</Text>
                <Text style={styles.modalDetailValue}>{selectedSlot?.sensorId}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Location</Text>
                <Text style={styles.modalDetailValue}>
                  {selectedSlot?.latitude.toFixed(6)},{'\n'}
                  {selectedSlot?.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Status</Text>
                <Text style={[styles.modalDetailValue, { color: colors.success }]}>
                  Available ●
                </Text>
              </View>
            </View>

            <Text style={styles.modalHint}>
              The map will pin exactly where sensor {selectedSlot?.sensorId} is mounted.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Navigate →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleDot: { width: 7, height: 7, borderRadius: 4 },
  roleText: { fontSize: 11, fontWeight: '600' },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 2,
  },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  fullBanner: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(252,92,92,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(252,92,92,0.25)',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  fullBannerTitle: { color: colors.alert, fontWeight: '700', fontSize: 14 },
  fullBannerSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
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
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIcon: { fontSize: 18 },
  slotAvail: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(0,201,167,0.4)',
  },
  slotOccupied: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.5,
  },
  slotNumber: { fontSize: 15, fontWeight: '700', color: colors.text },
  slotZone: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  sensorId: { color: colors.textSecondary, fontSize: 10, marginTop: 1, fontStyle: 'italic' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  statusAvail:    { color: colors.success, fontWeight: '700', fontSize: 11 },
  statusOccupied: { color: colors.alert,   fontWeight: '700', fontSize: 11 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.header,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,201,167,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalIcon: { fontSize: 26 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },
  modalDetailBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalDetailLabel: { fontSize: 13, color: colors.textSecondary },
  modalDetailValue: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right' },
  modalDivider: { height: 1, backgroundColor: colors.border },
  modalHint: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  confirmBtn: {
    flex: 1.4,
    backgroundColor: colors.success,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  confirmText: { color: colors.background, fontWeight: '800', fontSize: 14 },
});
