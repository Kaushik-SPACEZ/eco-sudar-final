import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useOrder } from '@/hooks/useOrder';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { ScreenHeader } from '@/components/feature/ScreenHeader';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type UserType = 'customer' | 'dealer';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return /^\d{10}$/.test(phone);
}

function validatePincode(pin: string) {
  return /^\d{6}$/.test(pin);
}

export default function UserDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setCurrentCustomer } = useOrder();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [userType, setUserType] = useState<UserType>('customer');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Customer fields
  const [cName, setCName] = useState(user?.name || '');
  const [cEmail, setCEmail] = useState(user?.email || '');
  const [cPhone, setCPhone] = useState(user?.phone || '');
  const [cAddress, setCAddress] = useState('');
  const [cCity, setCCity] = useState('');
  const [cPincode, setCPincode] = useState('');

  // Dealer fields
  const [dBizName, setDBizName] = useState('');
  const [dContact, setDContact] = useState(user?.name || '');
  const [dEmail, setDEmail] = useState(user?.email || '');
  const [dPhone, setDPhone] = useState(user?.phone || '');
  const [dUdyam, setDUdyam] = useState('');
  const [dAddress, setDAddress] = useState('');
  const [dCity, setDCity] = useState('');
  const [dPincode, setDPincode] = useState('');
  const [dGst, setDGst] = useState('');

  const validateAndContinue = () => {
    const errs: Record<string, string> = {};

    if (userType === 'customer') {
      if (cName.length < 3) errs.cName = 'Name must be at least 3 characters';
      if (!validateEmail(cEmail)) errs.cEmail = 'Enter a valid email address';
      if (!validatePhone(cPhone)) errs.cPhone = 'Enter a valid 10-digit phone number';
      if (cAddress.length < 10) errs.cAddress = 'Address must be at least 10 characters';
      if (cCity.length < 3) errs.cCity = 'Enter a valid city name';
      if (!validatePincode(cPincode)) errs.cPincode = 'Enter a valid 6-digit pincode';
    } else {
      if (dBizName.length < 3) errs.dBizName = 'Business name must be at least 3 characters';
      if (dContact.length < 3) errs.dContact = 'Contact person name must be at least 3 characters';
      if (!validateEmail(dEmail)) errs.dEmail = 'Enter a valid email address';
      if (!validatePhone(dPhone)) errs.dPhone = 'Enter a valid 10-digit phone number';
      if (dUdyam.length !== 12) errs.dUdyam = 'UDYAM number must be 12 characters';
      if (dAddress.length < 10) errs.dAddress = 'Address must be at least 10 characters';
      if (dCity.length < 3) errs.dCity = 'Enter a valid city name';
      if (!validatePincode(dPincode)) errs.dPincode = 'Enter a valid 6-digit pincode';
      if (dGst && dGst.length !== 15) errs.dGst = 'GST number must be 15 characters';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showAlert('Validation Error', 'Please correct the highlighted fields.');
      return;
    }

    if (userType === 'customer') {
      setCurrentCustomer({ type: 'customer', name: cName, email: cEmail, phone: cPhone, address: cAddress, city: cCity, pincode: cPincode });
    } else {
      setCurrentCustomer({
        type: 'dealer', name: dContact, email: dEmail, phone: dPhone,
        address: dAddress, city: dCity, pincode: dPincode,
        businessName: dBizName, contactPerson: dContact,
        udyamNumber: dUdyam, gstNumber: dGst || undefined,
      });
    }
    router.push('/order-summary');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: Colors.bgPage }}>
        <ScreenHeader title="Your Details" showBack showLogo />
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Type Selection */}
          <Text style={styles.sectionLabel}>I am a</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeCard, userType === 'customer' && styles.typeCardActive]}
              onPress={() => setUserType('customer')}
            >
              <MaterialIcons name="person" size={32} color={userType === 'customer' ? Colors.primary : Colors.textMedium} />
              <Text style={[styles.typeTitle, userType === 'customer' && styles.typeTitleActive]}>Customer</Text>
              <Text style={styles.typeSub}>For personal use</Text>
            </Pressable>
            <Pressable
              style={[styles.typeCard, userType === 'dealer' && styles.typeCardActive]}
              onPress={() => setUserType('dealer')}
            >
              <MaterialIcons name="business" size={32} color={userType === 'dealer' ? Colors.primary : Colors.textMedium} />
              <Text style={[styles.typeTitle, userType === 'dealer' && styles.typeTitleActive]}>Dealer</Text>
              <Text style={styles.typeSub}>For business</Text>
            </Pressable>
          </View>

          {/* Customer Form */}
          {userType === 'customer' ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Customer Details</Text>
              <FormInput label="Full Name" required icon="person" placeholder="Enter your full name" value={cName} onChangeText={setCName} error={errors.cName} />
              <FormInput label="Email Address" required icon="email" placeholder="Enter your email" value={cEmail} onChangeText={setCEmail} keyboardType="email-address" autoCapitalize="none" error={errors.cEmail} />
              <FormInput label="Phone Number" required icon="phone" placeholder="Enter your phone number" value={cPhone} onChangeText={setCPhone} keyboardType="phone-pad" error={errors.cPhone} />
              <FormInput label="Delivery Address" required icon="location-on" placeholder="Enter your delivery address" value={cAddress} onChangeText={setCAddress} error={errors.cAddress} multiline numberOfLines={2} />
              <FormInput label="City" required icon="location-city" placeholder="Enter your city" value={cCity} onChangeText={setCCity} error={errors.cCity} />
              <FormInput label="Pincode" required icon="local-post-office" placeholder="Enter your pincode" value={cPincode} onChangeText={setCPincode} keyboardType="number-pad" error={errors.cPincode} />
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Dealer Details</Text>
              <FormInput label="Business Name" required icon="business" placeholder="Enter your business name" value={dBizName} onChangeText={setDBizName} error={errors.dBizName} />
              <FormInput label="Contact Person" required icon="person" placeholder="Enter contact person name" value={dContact} onChangeText={setDContact} error={errors.dContact} />
              <FormInput label="Business Email" required icon="email" placeholder="Enter business email" value={dEmail} onChangeText={setDEmail} keyboardType="email-address" autoCapitalize="none" error={errors.dEmail} />
              <FormInput label="Business Phone" required icon="phone" placeholder="Enter business phone" value={dPhone} onChangeText={setDPhone} keyboardType="phone-pad" error={errors.dPhone} />
              <FormInput label="UDYAM Number" required icon="tag" placeholder="12-character UDYAM number" value={dUdyam} onChangeText={setDUdyam} autoCapitalize="characters" maxLength={12} error={errors.dUdyam} helperText="12-character UDYAM registration number" />
              <FormInput label="Business Address" required icon="location-on" placeholder="Enter business address" value={dAddress} onChangeText={setDAddress} error={errors.dAddress} multiline numberOfLines={2} />
              <FormInput label="City" required icon="location-city" placeholder="Enter city" value={dCity} onChangeText={setDCity} error={errors.dCity} />
              <FormInput label="Pincode" required icon="local-post-office" placeholder="Enter pincode" value={dPincode} onChangeText={setDPincode} keyboardType="number-pad" error={errors.dPincode} />
              <FormInput label="GST Number" icon="description" placeholder="Enter GST number (optional)" value={dGst} onChangeText={setDGst} autoCapitalize="characters" maxLength={15} error={errors.dGst} />
            </View>
          )}

          <Button
            label="Continue to Summary"
            onPress={validateAndContinue}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.md }}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  typeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
  },
  typeTitleActive: {
    color: Colors.textDark,
  },
  typeSub: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: Spacing.lg,
  },
});
