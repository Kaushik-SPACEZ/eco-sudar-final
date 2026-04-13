import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useOrder } from '@/hooks/useOrder';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { ScreenHeader } from '@/components/feature/ScreenHeader';
import { PillButton } from '@/components/ui/PillButton';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { PRODUCTS, PURPOSES, SUB_PURPOSES, DELIVERY_FEE } from '@/constants/products';

export default function ProductSelectionScreen() {
  const router = useRouter();
  const { setCurrentProduct } = useOrder();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
  const [selectedSubPurpose, setSelectedSubPurpose] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedProduct = PRODUCTS.find(p => p.id === selectedProductId);
  const subtotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const total = subtotal + DELIVERY_FEE;

  const handlePurposeSelect = (id: string) => {
    setSelectedPurpose(id);
    setSelectedSubPurpose(null);
    setDropdownOpen(false);
  };

  const handleContinue = () => {
    if (!selectedProduct || !selectedSize || !selectedPurpose || !selectedSubPurpose) {
      showAlert('Incomplete Selection', 'Please select product, size, purpose, and sub-purpose.');
      return;
    }
    setCurrentProduct({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      size: selectedSize,
      quantity,
      purpose: PURPOSES.find(p => p.id === selectedPurpose)?.label || '',
      subPurpose: selectedSubPurpose,
    });
    router.push('/user-details');
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>
        <ScreenHeader title="Order Products" showLogo />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl }}>
          <MaterialIcons name="person-outline" size={72} color={Colors.borderLight} />
          <Text style={{ fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textDark, marginTop: Spacing.lg, marginBottom: 8, textAlign: 'center' }}>Sign In Required</Text>
          <Text style={{ fontSize: FontSize.body, color: Colors.textMedium, textAlign: 'center', marginBottom: Spacing.xxl }}>You need to be signed in to select and order products</Text>
          <Button label="Sign In" onPress={() => router.push('/auth')} fullWidth />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>
      <ScreenHeader title="Select Product" showBack showLogo />
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Grid */}
        <Text style={styles.label}>Choose Product</Text>
        <View style={styles.productGrid}>
          {PRODUCTS.map(product => (
            <Pressable
              key={product.id}
              style={[styles.productCard, selectedProductId === product.id && styles.productCardActive]}
              onPress={() => { setSelectedProductId(product.id); setSelectedSize(null); }}
            >
              <Image source={product.image} style={styles.productImage} contentFit="contain" transition={200} />
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            </Pressable>
          ))}
        </View>



        {/* Size Selection */}
        {selectedProduct ? (
          <View style={styles.section}>
            <Text style={styles.label}>Size</Text>
            <View style={styles.pillRow}>
              {selectedProduct.sizes.map(s => (
                <PillButton
                  key={s}
                  label={s}
                  selected={selectedSize === s}
                  onPress={() => setSelectedSize(s)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Purpose Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Purpose</Text>
          <View style={styles.pillRow}>
            {PURPOSES.map(p => (
              <PillButton
                key={p.id}
                label={p.label}
                selected={selectedPurpose === p.id}
                onPress={() => handlePurposeSelect(p.id)}
              />
            ))}
          </View>
        </View>

        {/* Sub-Purpose Dropdown */}
        {selectedPurpose ? (
          <View style={styles.section}>
            <Text style={styles.label}>Sub-Purpose</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setDropdownOpen(v => !v)}
            >
              <Text style={[styles.dropdownText, !selectedSubPurpose && styles.placeholderText]}>
                {selectedSubPurpose || 'Select sub-purpose'}
              </Text>
              <MaterialIcons
                name={dropdownOpen ? 'expand-less' : 'expand-more'}
                size={22}
                color={Colors.textMedium}
              />
            </Pressable>
            {dropdownOpen ? (
              <View style={styles.dropdownMenu}>
                {SUB_PURPOSES[selectedPurpose].map(sub => (
                  <Pressable
                    key={sub}
                    style={[styles.dropdownItem, selectedSubPurpose === sub && styles.dropdownItemActive]}
                    onPress={() => { setSelectedSubPurpose(sub); setDropdownOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, selectedSubPurpose === sub && styles.dropdownItemTextActive]}>
                      {sub}
                    </Text>
                    {selectedSubPurpose === sub ? (
                      <MaterialIcons name="check" size={16} color={Colors.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Quantity Stepper */}
        <View style={styles.section}>
          <Text style={styles.label}>Quantity (kg)</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setQuantity(q => Math.max(100, q - 50))}
            >
              <MaterialIcons name="remove" size={20} color={Colors.primary} />
            </Pressable>
            <Text style={styles.stepValue}>{quantity}</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setQuantity(q => q + 50)}
            >
              <MaterialIcons name="add" size={20} color={Colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.minHint}>Minimum order: 100 kg</Text>
        </View>

        {/* Price Summary */}
        {selectedProduct ? (
          <View style={styles.priceCard}>
            <Text style={styles.label}>Price Summary</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₹{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>₹{DELIVERY_FEE}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
            </View>
          </View>
        ) : null}

        <Button
          label="Continue"
          onPress={handleContinue}
          fullWidth
          size="lg"
          disabled={!selectedProduct || !selectedSize || !selectedPurpose || !selectedSubPurpose}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  productGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    padding: 10,
    alignItems: 'center',
  },
  productCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  productImage: {
    width: 72,
    height: 72,
    marginBottom: 6,
  },
  productName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  spec: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginBottom: 2,
  },
  specValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  suitableText: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  dropdownText: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  dropdownMenu: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    minWidth: 60,
    textAlign: 'center',
  },
  minHint: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginTop: 6,
  },
  priceCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  priceLabel: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
  },
  priceValue: {
    fontSize: FontSize.body,
    color: Colors.textDark,
    fontWeight: FontWeight.medium,
  },
  totalLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  totalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});
