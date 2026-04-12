import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

interface SuccessModalProps {
  visible: boolean;
  orderId: string;
  onGoHome: () => void;
  onViewOrder: () => void;
}

export function SuccessModal({ visible, orderId, onGoHome, onViewOrder }: SuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="check-circle" size={60} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.subtitle}>Your order has been successfully placed</Text>
          <View style={styles.orderIdBox}>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderId}>{orderId}</Text>
          </View>
          <Text style={styles.trackText}>Track your order in the Orders section</Text>
          <Button label="Back to Home" onPress={onGoHome} fullWidth style={styles.btn} />
          <Pressable onPress={onViewOrder} style={styles.viewLink}>
            <Text style={styles.viewLinkText}>View Order Details</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  orderIdBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  orderIdLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginBottom: 2,
  },
  orderId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  trackText: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  btn: {
    marginBottom: 12,
  },
  viewLink: {
    padding: 8,
  },
  viewLinkText: {
    color: Colors.primary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
});
