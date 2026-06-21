import HomeHeader from '@/components/HomeHeader';
import ParkingGrid from '@/components/ParkingGrid';
import { useAvailableSlots } from '@/hooks/useParkingData';
import { globalStyles } from '@/styles/global';
import { colors, radii, roleColors, spacing } from '@/styles/theme';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../../firebase';

export default function HomeScreen() {

  // ── FIX 1: Redirect unauthenticated users immediately ────────────────────
  getAuth().onAuthStateChanged((user) => {
    if (!user) router.replace('/');
  });

  const [role, setRole] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Live sensor feed total — drives the pulsing status banner, same data
  // source ParkingGrid already subscribes to (RTDB /availableSlots).
  const { counts } = useAvailableSlots();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setRole(docSnap.data().role ?? '');
          setName(docSnap.data().name ?? '');
        }
      }
      setLoading(false);
    };
    fetchUserProfile();
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName =
    name ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split('@')[0] ||
    'User';

  const firstName = displayName.split(' ')[0];
  const rc = roleColors[role] ?? roleColors.Student;
  const liveTotal =
    role.toLowerCase() === 'admin' ? counts.total : counts[role.toLowerCase() as 'student' | 'staff' | 'visitor'] ?? 0;

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Good day</Text>
          <Text style={styles.welcomeName}>{firstName} 👋</Text>
        </View>
        {!!role && (
          <View style={[styles.roleBadge, { backgroundColor: rc.accent + '33' }]}>
            <Text style={[styles.roleBadgeText, { color: rc.accent }]}>{role}</Text>
          </View>
        )}
      </View>

      <HomeHeader />

      {/* User details card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{displayName}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {auth.currentUser?.email}
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{role}</Text>
        </View>
      </View>

      {/* Live sensor status banner */}
      {!!role && (
        <View style={[styles.liveBanner, { backgroundColor: rc.bg, borderColor: rc.accent + '55' }]}>
          <View style={styles.pulseDot} />
          <Text style={[styles.liveBannerText, { color: rc.label }]}>
            Live sensor feed · {liveTotal} slot{liveTotal === 1 ? '' : 's'} available in your zone
          </Text>
        </View>
      )}

      {/* Realtime parking zones for this role */}
      <Text style={globalStyles.sectionTitle}>Available Parking</Text>
      <ParkingGrid role={role} />

      {/* Quick links */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/parking')}
        >
          <Text style={styles.actionText}>🅿️ View Parking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/navi')}
        >
          <Text style={styles.actionText}>🗺️ Navigate</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '65%',
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  actionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  signOutButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.alert,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.xxl,
    marginBottom: 30,
  },
  signOutText: {
    color: colors.alert,
    fontSize: 15,
    fontWeight: '700',
  },
});
