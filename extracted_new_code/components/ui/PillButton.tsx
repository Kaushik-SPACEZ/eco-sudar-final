import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

interface PillButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function PillButton({ label, selected, onPress }: PillButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  selected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
  },
  selectedText: {
    color: Colors.textDark,
  },
});
