import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ size = 'md' }: LogoProps) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const textSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 16;

  return (
    <View style={styles.container}>
      <MaterialIcons name="eco" size={iconSize} color={Colors.primary} />
      <Text style={[styles.text, { fontSize: textSize }]}>
        <Text style={styles.eco}>Eco </Text>
        <Text style={styles.sudar}>Sudar</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  eco: {
    color: Colors.primary,
  },
  sudar: {
    color: Colors.red,
  },
});
