import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOrder } from '@/hooks/useOrder';
import { ScreenHeader } from '@/components/feature/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/feature/SuccessModal';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { DELIVERY_FEE } from '@/constants/products';

function SummaryRow({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[
        styles.rowValue,
        bold && styles.rowBold,
        green && styles.rowGreen,
      ]}>{value}</Text>
    </View>
  );
}

export default function OrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentProduct, currentCustomer, placeOrder, clearCurrent } = useOrder();
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentProduct || !currentCustomer) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Order Summary" showBack showLogo />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No order data found. Please start over.</Text>
          <Button label="Go Back" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  const subtotal = currentProduct.price * currentProduct.quantity;
  const total = subtotal + DELIVERY_FEE;

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const order = placeOrder();
    setLoading(false);
    if (order) setPlacedOrderId(order.id);
  };

  const handleGoHome = () => {
    clearCurrent();
    setPlacedOrderId(null);
    router.replace('/(tabs)');
  };

  const handleViewOrder = () => {
    clearCurrent();
    setPlacedOrderId(null);
    router.replace('/(tabs)/orders');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Order Summary" showBack showLogo />
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order ID placeholder */}
        <View style={styles.orderIdCard}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderIdValue}>Will be generated on confirmation</Text>
        </View>

        {/* Product Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product Details</Text>
          <SummaryRow label="Product" value={currentProduct.name} />
          <SummaryRow label="Size" value={currentProduct.size} />
          <SummaryRow label="Quantity" value={`${currentProduct.quantity}`} />
          <SummaryRow label="Purpose" value={currentProduct.purpose} />
          <SummaryRow label="Sub-Purpose" value={currentProduct.subPurpose} />
          <SummaryRow label="Unit Price" value={`₹${currentProduct.price}`} />
        </View>

        {/* Customer/Dealer Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {currentCustomer.type === 'customer' ? 'Customer Details' : 'Dealer Details'}
          </Text>
          {currentCustomer.type === 'dealer' ? (
            <>
              <SummaryRow label="Business Name" value={currentCustomer.businessName || ''} />
              <SummaryRow label="Contact Person" value={currentCustomer.contactPerson || ''} />
              <SummaryRow label="UDYAM Number" value={currentCustomer.udyamNumber || ''} />
            </>
          ) : null}
          <SummaryRow label="Name" value={currentCustomer.name} />
          <SummaryRow label="Email" value={currentCustomer.email} />
          <SummaryRow label="Phone" value={currentCustomer.phone} />
          <SummaryRow label="Address" value={currentCustomer.address} />
          <SummaryRow label="City" value={currentCustomer.city} />
          <SummaryRow label="Pincode" value={currentCustomer.pincode} />
          {currentCustomer.gstNumber ? (
            <SummaryRow label="GST Number" value={currentCustomer.gstNumber} />
          ) : null}
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          <SummaryRow label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
          <SummaryRow label="Delivery Fee" value={`₹${DELIVERY_FEE}`} />
          <View style={styles.totalDivider} />
          <SummaryRow label="Total" value={`₹${total.toLocaleString()}`} bold green />
        </View>

        <Button
          label="Confirm Order"
          onPress={handleConfirm}
          fullWidth
          size="lg"
          loading={loading}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>

      {placedOrderId ? (
        <SuccessModal
          visible
          orderId={placedOrderId}
          onGoHome={handleGoHome}
          onViewOrder={handleViewOrder}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPage,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    textAlign: 'center',
  },
  orderIdCard: {
    backgroundColor: Colors.bgLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  orderIdValue: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    flex: 1,
  },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.textDark,
    fontWeight: FontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  rowBold: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xl,
  },
  rowGreen: {
    color: Colors.primary,
  },
  totalDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 8,
  },
});
