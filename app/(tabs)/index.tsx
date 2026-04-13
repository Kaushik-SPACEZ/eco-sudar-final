import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ImageBackground, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/feature/Logo';
import { Button } from '@/components/ui/Button';
import { ProductCarousel } from '@/components/feature/ProductCarousel';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

const STATS = [
  { icon: 'cloud-off' as const, value: '2,400+', label: 'Tons CO₂ Reduced' },
  { icon: 'park' as const, value: '5,000+', label: 'Trees Saved' },
  { icon: 'loop' as const, value: '100%', label: 'Circular Economy' },
];

const APPS = [
  { icon: '🌿', label: 'Eco-Friendly' },
  { icon: '⚡', label: 'High Efficiency' },
  { icon: '🛡️', label: 'Reliable Supply' },
  { icon: '📊', label: 'Cost Effective' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Logo size="md" />
        <View style={styles.headerActions}>
          {user ? (
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/auth')} style={styles.signInBtn}>
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Greeting */}
      {user ? (
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Hi, {user.name} 👋</Text>
        </View>
      ) : null}

      {/* Hero — text overlaid on image */}
      <ImageBackground
        source={require('@/assets/images/hero-biomass.png')}
        style={styles.hero}
        imageStyle={{ opacity: 0.92 }}
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Powering a{'\n'}Sustainable Future</Text>
          <Text style={styles.heroSubtitle}>
            India's leading biomass energy company{'\n'}transforming agro residue into clean fuel
          </Text>
        </View>
      </ImageBackground>

      {/* Main Content */}
      <View style={[styles.section, { marginTop: 0, paddingTop: Spacing.lg }]}>

        <Text style={styles.sectionTitle}>Our Products</Text>
        <ProductCarousel />
      </View>

      {/* CTA Buttons */}
      <View style={styles.ctaRow}>
        <Button
          label="Start Ordering"
          onPress={() => router.push('/product-selection')}
          style={styles.ctaBtn}
        />
        <Button
          label="Learn More"
          onPress={() => Linking.openURL('https://www.ecosudar.com/')}
          variant="secondary"
          style={styles.ctaBtn}
        />
      </View>

      {/* EaaS Banner */}
      <View style={styles.eaasBanner}>
        <Text style={styles.eaasTitle}>Biomass Energy-as-a-Service (EaaS)</Text>
        <Text style={styles.eaasSub}>Fuel Management Platform | Made in Tamil Nadu 🇮🇳</Text>
      </View>

      {/* Why Eco Sudar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why Eco Sudar?</Text>
        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.value} style={styles.statItem}>
              <MaterialIcons name={s.icon} size={28} color={Colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About Us</Text>
        <Text style={styles.aboutText}>
          Transform agro residue into premium biomass pellets, briquettes, and chips.
          Our circular economy model ensures zero waste while delivering clean, cost-effective fuel to industries across Tamil Nadu.
        </Text>
      </View>

      {/* Applications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Applications</Text>
        <View style={styles.appGrid}>
          {APPS.map(app => (
            <View key={app.label} style={styles.appCard}>
              <Text style={styles.appIcon}>{app.icon}</Text>
              <Text style={styles.appLabel}>{app.label}</Text>
            </View>
          ))}
        </View>
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
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  signInText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  greeting: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  greetingText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  // Hero — full image with text overlay
  hero: {
    height: 200,
    width: '100%',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },
  section: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
  },
  ctaBtn: {
    flex: 1,
  },
  eaasBanner: {
    backgroundColor: Colors.primaryLight,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  eaasTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textAlign: 'center',
  },
  eaasSub: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    margin: Spacing.lg,
    marginBottom: 0,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginTop: 6,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    textAlign: 'center',
    marginTop: 2,
  },
  aboutText: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    lineHeight: 22,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  appCard: {
    width: '47%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  appIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  appLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    textAlign: 'center',
  },
});
