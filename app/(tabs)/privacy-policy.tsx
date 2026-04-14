import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Logo } from '@/components/feature/Logo';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Logo />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Eco Sudar Privacy Policy</Text>
        <Text style={styles.date}>Last Updated: May 2026</Text>
        
        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect information you provide directly to us, such as your name, email address, phone number, and delivery address when you create an account, place an order, or contact us for support. We also collect commercial details for dealer accounts.
        </Text>
        
        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to process your orders, schedule deliveries, communicate with you regarding your biomass pellet requests, and improve our platform and services.
        </Text>
        
        <Text style={styles.heading}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. We may share your delivery information with our trusted transport partners solely for fulfilling your orders across Tamil Nadu.
        </Text>
        
        <Text style={styles.heading}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical measures to securely protect your data against unauthorized access, alteration, or destruction. 
        </Text>
        
        <Text style={styles.heading}>5. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at ecosudarbiomasspellets@gmail.com.
        </Text>
      </View>
    </ScrollView>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
    minHeight: 56,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  content: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderGray,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginBottom: Spacing.xl,
  },
  heading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
});
