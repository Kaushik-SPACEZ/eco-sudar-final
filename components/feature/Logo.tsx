import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { width: 80,  height: 27 },
  md: { width: 110, height: 37 },
  lg: { width: 140, height: 47 },
};

export function Logo({ size = 'md' }: LogoProps) {
  const dims = SIZE_MAP[size];
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={[styles.logo, dims]}
      contentFit="contain"
      transition={100}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // width & height applied via dims above
  },
});
