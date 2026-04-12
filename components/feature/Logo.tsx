import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ size = 'md' }: LogoProps) {
  const width = size === 'sm' ? 80 : size === 'lg' ? 150 : 130;
  const height = size === 'sm' ? 40 : size === 'lg' ? 70 : 55;

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width, height }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});
