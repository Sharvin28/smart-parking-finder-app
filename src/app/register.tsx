import { globalStyles } from '@/styles/global';
import { colors, radii, spacing } from '@/styles/theme';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

// Converts a plain UserID to a valid Firebase Auth email
const toAuthEmail = (userId: string) =>
  `${userId.trim().toLowerCase()}@mmucampus.app`;

type Role = 'student' | 'staff' | 'visitor';
const ROLES: Role[] = ['student', 'staff', 'visitor'];

export default function Register() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [loading, setLoading] = useState(false);

  const registerUser = async () => {
    if (!userId || !name || !password || !role) {
      Alert.alert('Error', 'Please complete all fields and select a role.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const email = toAuthEmail(userId);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // Store UserID, Name, email, role in Firestore
      await setDoc(doc(db, `users/${uid}`), {
        userId: userId.trim(),
        name: name.trim(),
        email,
        role,
        password,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Account created successfully!');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to sign in</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Register to access your campus parking zone
        </Text>

        <Text style={styles.fieldLabel}>User ID</Text>
        <TextInput
          placeholder="e.g. 1221234"
          placeholderTextColor={colors.textSecondary}
          value={userId}
          onChangeText={setUserId}
          style={globalStyles.input}
          autoCapitalize="none"
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Full name</Text>
        <TextInput
          placeholder="Your full name"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          style={globalStyles.input}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Password</Text>
        <TextInput
          placeholder="Min. 6 characters"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={globalStyles.input}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          I am a…
        </Text>

        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleButton, role === r && styles.selectedRole]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextSelected]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={registerUser}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Register</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: 60,
    backgroundColor: colors.background,
  },
  backLink: {
    marginBottom: spacing.xl,
  },
  backText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  selectedRole: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  roleTextSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
