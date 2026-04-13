import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useOrder } from '@/hooks/useOrder';
import { Logo } from '@/components/feature/Logo';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

const MENU_ITEMS = [
  { icon: 'inventory-2' as const, label: 'My Orders', route: '/orders' },
  { icon: 'help-outline' as const, label: 'Help & Support', route: '/queries' },
  { icon: 'info-outline' as const, label: 'About Eco Sudar', route: null },
  { icon: 'privacy-tip' as const, label: 'Privacy Policy', route: null },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { orders } = useOrder();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Logo />
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {user ? (
        <>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{orders.length}</Text>
              <Text style={styles.statLbl}>Total Orders</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={styles.statNum}>
                {orders.filter(o => o.status === 'pending').length}
              </Text>
              <Text style={styles.statLbl}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {orders.filter(o => o.status === 'delivered').length}
              </Text>
              <Text style={styles.statLbl}>Delivered</Text>
            </View>
          </View>

          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, i) => (
              <Pressable
                key={item.label}
                style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuBorder]}
                onPress={() => item.route ? router.push(item.route as any) : null}
              >
                <MaterialIcons name={item.icon} size={22} color={Colors.primary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color={Colors.textMedium} />
              </Pressable>
            ))}
          </View>

          <View style={styles.signOutSection}>
            <Button label="Sign Out" onPress={signOut} variant="secondary" fullWidth />
          </View>
        </>
      ) : (
        <View style={styles.guestSection}>
          <MaterialIcons name="person-outline" size={72} color={Colors.borderLight} />
          <Text style={styles.guestTitle}>Welcome to Eco Sudar</Text>
          <Text style={styles.guestText}>Sign in to view your profile and track orders</Text>
          <Button
            label="Sign In"
            onPress={() => router.push('/auth')}
            fullWidth
            style={styles.guestBtn}
          />
        </View>
      )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  avatarSection: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    padding: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGray,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.borderGray,
  },
  statNum: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLbl: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    margin: Spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: 12,
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textDark,
  },
  signOutSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  guestSection: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xxxl,
    paddingTop: 60,
  },
  guestTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginTop: Spacing.lg,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestText: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  guestBtn: {
    marginBottom: 12,
  },
});
