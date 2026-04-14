import React from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useOrder } from '@/hooks/useOrder';
import { Logo } from '@/components/feature/Logo';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { PlacedOrder } from '@/contexts/OrderContext';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: Colors.primary,
  delivered: '#6B7280',
};

function OrderCard({ order }: { order: PlacedOrder }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] + '20', borderColor: STATUS_COLORS[order.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Product</Text>
        <Text style={styles.orderValue}>{order.product.name}</Text>
      </View>
      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Quantity</Text>
        <Text style={styles.orderValue}>{order.product.quantity} kg</Text>
      </View>
      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Total</Text>
        <Text style={[styles.orderValue, styles.totalValue]}>₹{order.total.toLocaleString()}</Text>
      </View>
      <View style={styles.orderRow}>
        <Text style={styles.orderLabel}>Date</Text>
        <Text style={styles.orderValue}>{order.placedAt.toLocaleDateString('en-IN')}</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders } = useOrder();
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Logo />
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.empty}>
          <MaterialIcons name="person-outline" size={72} color={Colors.borderLight} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>Sign in to view and track your orders</Text>
          <Button label="Sign In" onPress={() => router.push('/auth')} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Logo />
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="inventory-2" size={64} color={Colors.borderLight} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Your orders will appear here after you place them</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
  list: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: 12,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  orderLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
  },
  orderValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textDark,
  },
  totalValue: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.body,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginTop: Spacing.lg,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
});
