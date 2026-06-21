import { globalStyles } from '@/styles/global';
import { colors, radii, spacing } from '@/styles/theme';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebase';
import HomeHeader from '../components/HomeHeader';

const toAuthEmail = (userId: string) =>
  `${userId.trim().toLowerCase()}@mmucampus.app`;

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const signIn = async () => {
    if (!userId || !password) {
      setErrorMsg('Enter your User ID and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const email = toAuthEmail(userId);
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userDoc.exists()) {
        setErrorMsg('User profile not found. Please register.');
        return;
      }

      const role = userDoc.data().role;
      if (role === 'Admin') {
        router.replace('/(tabs)/parking');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.log(error);
      setErrorMsg('User ID or password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={globalStyles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand mark */}
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={{ fontSize: 16 }}>🅿️</Text>
          </View>
          <Text style={styles.brandLabel}>CAMPUS SMART PARKING FINDER APP</Text>
        </View>

        <Text style={globalStyles.title} >Welcome</Text>
        <HomeHeader />
        <Text style={styles.subtitle}>Sign in to find your parking spot</Text>

        <Text style={styles.fieldLabel}>User ID</Text>
        <TextInput
          style={globalStyles.input}
          placeholder="Enter UserID"
          placeholderTextColor={colors.textSecondary}
          value={userId}
          onChangeText={(t) => { setUserId(t); if (errorMsg) setErrorMsg(''); }}
          autoCapitalize="none"
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Password</Text>
        <TextInput
          style={globalStyles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={(t) => { setPassword(t); if (errorMsg) setErrorMsg(''); }}
          secureTextEntry
        />

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={signIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        {/* Register button at bottom per spec */}
        <View style={styles.registerContainer}>
          <View style={styles.divider} />
          <Text style={styles.registerPrompt}>First time user?</Text>
          <TouchableOpacity
            style={[globalStyles.outlineButton, { width: '100%' }]}
            onPress={() => router.push('/register')}
          >
            <Text style={globalStyles.outlineButtonText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 160,
    marginBottom: 30,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorText: {
    color: colors.alert,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  registerContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  registerPrompt: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.md,
    marginTop: 200,
  },
});
