import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  disabled, loading, style, textStyle, fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? Colors.white : Colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles], size === 'sm' && styles.smText, textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    paddingVertical: 11,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  ghost: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  sm: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    minHeight: 32,
    borderRadius: 5,
  },
  lg: {
    paddingVertical: 14,
    minHeight: 50,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.textDark,
  },
  ghostText: {
    color: Colors.primary,
  },
  smText: {
    fontSize: FontSize.xs,
  },
});
