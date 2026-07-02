import { globalStyles } from '@/styles/global';
import { colors, radii, spacing } from '@/styles/theme';
import { requestPermissions } from '@/utils/notifications';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../../firebase';

const isExpoGo = Constants.appOwnership === 'expo';

const QUICK_MUTE_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr',    minutes: 60 },
  { label: '2 hr',    minutes: 120 },
  { label: '8 hr',    minutes: 480 },
];

function buildDateOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    opts.push({ label: i === 0 ? `Today · ${label}` : label, value });
  }
  return opts;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function Notify() {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [mutedUntil, setMutedUntil] = useState<Date | null>(null);

  const [pickerMode, setPickerMode] = useState<'quick' | 'custom'>('quick');
  const dateOptions = useMemo(buildDateOptions, []);

  const defaultTarget = new Date(Date.now() + 60 * 60 * 1000);
  const [selDate, setSelDate] = useState(dateOptions[0].value);
  const [selHour, setSelHour] = useState(defaultTarget.getHours());
  const [selMinute, setSelMinute] = useState(
    MINUTES.reduce((closest, m) =>
      Math.abs(m - defaultTarget.getMinutes()) < Math.abs(closest - defaultTarget.getMinutes())
        ? m
        : closest
    , 0)
  );

  const customDate = useMemo(() => {
    const [y, m, d] = selDate.split('-').map(Number);
    return new Date(y, m - 1, d, selHour, selMinute, 0, 0);
  }, [selDate, selHour, selMinute]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      if (isExpoGo) {
        console.log('Skipping push notification setup — running in Expo Go');
      } else {
        try {
          const granted = await requestPermissions();
          if (granted) {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            await updateDoc(doc(db, 'users', user.uid), {
              expoPushToken: tokenData.data,
            });
          }
        } catch (err) {
          console.error('Token save error:', err);
        }
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().mutedUntil) {
          setMutedUntil(new Date(userDoc.data().mutedUntil));
        }
      } catch (err) {
        console.error('Mute fetch error:', err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const applyMute = async (minutes: number) => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      let until: string | null = null;

      if (minutes === 0) {
        setMutedUntil(null);
      } else if (minutes === -1) {
        if (customDate.getTime() <= Date.now()) {
          Alert.alert('Invalid date', 'Please choose a future date and time.');
          setSaving(false);
          return;
        }
        until = customDate.toISOString();
        setMutedUntil(customDate);
      } else {
        const d = new Date(Date.now() + minutes * 60000);
        until = d.toISOString();
        setMutedUntil(d);
      }

      await updateDoc(doc(db, 'users', user.uid), { mutedUntil: until });

      Alert.alert(
        'Saved',
        minutes === 0
          ? 'Notifications re-enabled.'
          : `Paused until ${
              until
                ? new Date(until).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '—'
            }.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const isMuted = mutedUntil !== null && mutedUntil > new Date();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={globalStyles.title}>Alerts</Text>
      <Text style={styles.subtitle}>Parking availability in your zone</Text>

      {isExpoGo && (
        <View style={styles.devBanner}>
          <Text style={styles.devBannerText}>
            ⚠️ Push notifications require a development build — running in
            Expo Go, mute settings still work.
          </Text>
        </View>
      )}

      {/* Status card */}
      <View style={[styles.statusCard, isMuted && styles.statusCardMuted]}>
        <Text style={styles.statusLabel}>Current status</Text>
        {isMuted ? (
          <Text style={styles.mutedText}>
            🔕 Paused until{' '}
            {mutedUntil!.toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
        ) : (
          <Text style={styles.activeText}>🔔 Notifications active</Text>
        )}
      </View>

      <Text style={globalStyles.sectionTitle}>Pause notifications</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeTab, pickerMode === 'quick' && styles.modeTabActive]}
          onPress={() => setPickerMode('quick')}
        >
          <Text style={[styles.modeTabText, pickerMode === 'quick' && styles.modeTabTextActive]}>
            ⚡ Quick
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, pickerMode === 'custom' && styles.modeTabActive]}
          onPress={() => setPickerMode('custom')}
        >
          <Text style={[styles.modeTabText, pickerMode === 'custom' && styles.modeTabTextActive]}>
            📅 Date & Time
          </Text>
        </TouchableOpacity>
      </View>

      {saving ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : pickerMode === 'quick' ? (
        <View style={styles.quickGrid}>
          {QUICK_MUTE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.quickPill}
              onPress={() => applyMute(opt.minutes)}
            >
              <Text style={styles.quickPillText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.customCard}>
          <Text style={styles.fieldLabel}>Pause until</Text>

          <View style={styles.pickerRow}>
            <View style={[styles.pickerWrap, { flex: 1.6 }]}>
              <Picker
                selectedValue={selDate}
                onValueChange={(v) => setSelDate(v)}
                style={styles.picker}
                dropdownIconColor={colors.text}
                itemStyle={styles.pickerItemIOS}
              >
                {dateOptions.map((d) => (
                  <Picker.Item key={d.value} label={d.label} value={d.value} color={colors.text} />
                ))}
              </Picker>
            </View>

            <View style={[styles.pickerWrap, { flex: 1 }]}>
              <Picker
                selectedValue={selHour}
                onValueChange={(v) => setSelHour(Number(v))}
                style={styles.picker}
                dropdownIconColor={colors.text}
                itemStyle={styles.pickerItemIOS}
              >
                {HOURS.map((h) => (
                  <Picker.Item key={h} label={pad2(h)} value={h} color={colors.text} />
                ))}
              </Picker>
            </View>

            <Text style={styles.colon}>:</Text>

            <View style={[styles.pickerWrap, { flex: 1 }]}>
              <Picker
                selectedValue={selMinute}
                onValueChange={(v) => setSelMinute(Number(v))}
                style={styles.picker}
                dropdownIconColor={colors.text}
                itemStyle={styles.pickerItemIOS}
              >
                {MINUTES.map((m) => (
                  <Picker.Item key={m} label={pad2(m)} value={m} color={colors.text} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              Notifications paused until{' '}
              <Text style={styles.summaryHighlight}>
                {customDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => applyMute(-1)}
          >
            <Text style={globalStyles.primaryButtonText}>Pause alerts</Text>
          </TouchableOpacity>
        </View>
      )}

      {isMuted && (
        <TouchableOpacity
          style={styles.unmuteButton}
          onPress={() => applyMute(0)}
          disabled={saving}
        >
          <Text style={styles.unmuteText}>Resume notifications now</Text>
        </TouchableOpacity>
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
  devBanner: {
    backgroundColor: 'rgba(246,173,85,0.1)',
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  devBannerText: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  statusCardMuted: {
    borderColor: 'rgba(246,173,85,0.4)',
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  activeText: {
    fontSize: 15,
    color: colors.successAlt,
    fontWeight: '700',
  },
  mutedText: {
    fontSize: 15,
    color: colors.warning,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  modeTabActive: {
    backgroundColor: 'rgba(246,173,85,0.2)',
    borderBottomWidth: 2,
    borderBottomColor: colors.warning,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.warning,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickPill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  customCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerWrap: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    justifyContent: 'center',
    height: Platform.select({ ios: 120, android: 50 }),
    overflow: Platform.select({
    ios: 'hidden',
    android: 'visible',
  }) as 'hidden' | 'visible',
  },
  picker: {
    color: colors.text,
    width: '100%',
    height: Platform.select({ ios: 120, android: 50 }),
  },
  pickerItemIOS: {
    color: colors.text,
    fontSize: 16,
    height: 120,
  },
  colon: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  summaryBox: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.3)',
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: colors.warning,
    paddingVertical: 13,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  unmuteButton: {
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.successAlt,
    backgroundColor: 'rgba(72,187,120,0.08)',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  unmuteText: {
    color: colors.successAlt,
    fontWeight: '700',
    fontSize: 14,
  },
});
