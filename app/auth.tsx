import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Logo } from '@/components/feature/Logo';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signIn, signUp, isLoading } = useAuth();
  const { showAlert } = useAlert();

  const [tab, setTab] = useState<'signin' | 'signup'>(
    params.tab === 'signup' ? 'signup' : 'signin'
  );

  // Sign In state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Sign Up state
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');

  const handleSignIn = async () => {
    if (!siEmail || !siPassword) {
      showAlert('Missing Fields', 'Please enter email and password');
      return;
    }
    const ok = await signIn(siEmail, siPassword);
    if (ok) {
      router.back();
    } else {
      showAlert('Sign In Failed', 'Invalid credentials. Please try again.');
    }
  };

  const handleSignUp = async () => {
    if (!suName || !suEmail || !suPhone || !suPassword || !suConfirm) {
      showAlert('Missing Fields', 'Please fill all required fields');
      return;
    }
    if (suPassword !== suConfirm) {
      showAlert('Password Mismatch', 'Passwords do not match');
      return;
    }
    if (suPassword.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    const ok = await signUp(suName, suEmail, suPhone, suPassword);
    if (ok) {
      router.back();
    } else {
      showAlert('Sign Up Failed', 'Please check your details and try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textDark} />
          </Pressable>
          <Logo />
          <Text style={styles.headerTitle}>
            {tab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, tab === 'signin' && styles.activeTab]}
            onPress={() => setTab('signin')}
          >
            <Text style={[styles.tabText, tab === 'signin' && styles.activeTabText]}>Sign In</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'signup' && styles.activeTab]}
            onPress={() => setTab('signup')}
          >
            <Text style={[styles.tabText, tab === 'signup' && styles.activeTabText]}>Sign Up</Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {tab === 'signin' ? (
            <>
              <FormInput
                label="Email Address"
                required
                icon="email"
                placeholder="Enter your email"
                value={siEmail}
                onChangeText={setSiEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormInput
                label="Password"
                required
                icon="lock"
                placeholder="Enter your password"
                value={siPassword}
                onChangeText={setSiPassword}
                isPassword
              />
              <Pressable style={styles.forgotLink}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
              <Button
                label="Sign In"
                onPress={handleSignIn}
                fullWidth
                loading={isLoading}
                style={styles.submitBtn}
              />
            </>
          ) : (
            <>
              <FormInput
                label="Full Name"
                required
                icon="person"
                placeholder="Enter your full name"
                value={suName}
                onChangeText={setSuName}
              />
              <FormInput
                label="Email Address"
                required
                icon="email"
                placeholder="Enter your email"
                value={suEmail}
                onChangeText={setSuEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormInput
                label="Phone Number"
                required
                icon="phone"
                placeholder="Enter your phone number"
                value={suPhone}
                onChangeText={setSuPhone}
                keyboardType="phone-pad"
              />
              <FormInput
                label="Password"
                required
                icon="lock"
                placeholder="Create a password"
                value={suPassword}
                onChangeText={setSuPassword}
                isPassword
              />
              <FormInput
                label="Confirm Password"
                required
                icon="lock"
                placeholder="Confirm your password"
                value={suConfirm}
                onChangeText={setSuConfirm}
                isPassword
              />
              <Button
                label="Sign Up"
                onPress={handleSignUp}
                fullWidth
                loading={isLoading}
                style={styles.submitBtn}
              />
            </>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <Pressable onPress={() => setTab(tab === 'signin' ? 'signup' : 'signin')}>
              <Text style={styles.switchLink}>
                {tab === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  headerTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
  },
  activeTabText: {
    color: Colors.textDark,
  },
  form: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -4,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  submitBtn: {
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  switchText: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
  },
  switchLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
