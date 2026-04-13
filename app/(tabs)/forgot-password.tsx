import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/feature/Logo';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type ResetStep = 'email' | 'otp' | 'new_password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const [step, setStep] = useState<ResetStep>('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!identifier) {
      showAlert('Error', 'Please enter your email or phone number');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1000);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      showAlert('Error', 'Please enter a valid OTP');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('new_password');
    }, 1000);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showAlert('Success', 'Password has been reset successfully!');
      router.push('/');
    }, 1000);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Logo />
        </View>

        <View style={styles.card}>
          {step === 'email' && (
            <>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email or phone number and we'll send you an OTP to reset your password.
              </Text>
              <FormInput
                label="Email or Phone Number"
                placeholder="Enter email or phone number"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
              <Button
                label="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
                fullWidth
                style={styles.actionBtn}
              />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>
                We've sent a verification code to {identifier}.
              </Text>
              <FormInput
                label="OTP"
                placeholder="Enter 4-digit code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                label="Verify OTP"
                onPress={handleVerifyOTP}
                loading={loading}
                fullWidth
                style={styles.actionBtn}
              />
            </>
          )}

          {step === 'new_password' && (
            <>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                Your new password must be different from previous used passwords.
              </Text>
              <FormInput
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Button
                label="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                fullWidth
                style={styles.actionBtn}
              />
            </>
          )}

          <Button
            label="Back to Sign In"
            onPress={() => router.push('/auth')}
            variant="ghost"
            fullWidth
          />
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
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.borderGray,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  actionBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
