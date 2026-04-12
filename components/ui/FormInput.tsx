import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

interface FormInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
}

export function FormInput({
  label, required, icon, error, helperText, isPassword, ...props
}: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[
        styles.inputRow,
        focused && styles.focused,
        error ? styles.errorBorder : null,
        props.multiline && styles.multilineRow,
      ]}>
        {icon ? (
          <MaterialIcons name={icon} size={18} color={focused ? Colors.primary : Colors.textMedium} style={[styles.icon, props.multiline && { marginTop: 2 }]} />
        ) : null}
        <TextInput
          style={[styles.input, props.multiline && styles.multilineInput]}
          placeholderTextColor={Colors.textLight}
          secureTextEntry={isPassword && !showPw}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical={props.multiline ? 'top' : 'center'}
          {...props}
        />
        {isPassword ? (
          <Pressable onPress={() => setShowPw(v => !v)} hitSlop={8}>
            <MaterialIcons
              name={showPw ? 'visibility' : 'visibility-off'}
              size={18}
              color={Colors.textMedium}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: 6,
  },
  required: {
    color: Colors.red,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  focused: {
    borderColor: Colors.primary,
  },
  errorBorder: {
    borderColor: Colors.red,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textDark,
    height: 48,
  },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  helper: {
    color: Colors.textMedium,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  multilineRow: {
    height: 'auto',
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  multilineInput: {
    height: 'auto',
    minHeight: 100 - Spacing.sm * 2,
    paddingTop: 0,
  },
});
