import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import { SavingsCalculator } from '@/components/feature/SavingsCalculator';
import { Logo } from '@/components/feature/Logo';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';

import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

const FAQ = [
  {
    q: 'What is the minimum order quantity?',
    a: 'Minimum order is 100 kg for commercial customers and 500 kg for dealers.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Delivery typically takes 2-5 business days depending on your location.',
  },
  {
    q: 'What is the GCV of your pellets?',
    a: 'Our premium biomass pellets have a GCV of 4200 Kcal/kg with less than 3% ash content.',
  },
  {
    q: 'Do you offer bulk discounts?',
    a: 'Yes! We offer tiered pricing for orders above 1 tonne. Contact us for dealer pricing.',
  },
];

export default function QueriesScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !message) {
      showAlert('Missing Fields', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setName(''); setEmail(''); setMessage('');
    showAlert('Query Submitted!', 'Our team will contact you within 24 hours.');
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Logo />
        <Text style={styles.headerTitle}>Queries</Text>
      </View>

      {/* Savings Calculator */}
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <SavingsCalculator />
      </View>

      {/* Contact Info */}
      <View style={styles.contactBanner}>
        <MaterialIcons name="support-agent" size={32} color={Colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactText}>We are here Mon–Sat, 9 AM – 6 PM IST</Text>
        </View>
      </View>

      {/* Query Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send Us a Query</Text>
        <FormInput
          label="Full Name"
          required
          icon="person"
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
        />
        <FormInput
          label="Email Address"
          required
          icon="email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormInput
          label="Message"
          required
          icon="chat-bubble-outline"
          placeholder="Describe your query..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          style={{ height: 100, paddingTop: 12 }}
        />
        <Button
          label="Submit Query"
          onPress={handleSubmit}
          fullWidth
          loading={loading}
        />
      </View>

      {/* FAQ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
        {FAQ.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => setOpenFaq(openFaq === i ? null : i)}
            style={[styles.faqItem, i < FAQ.length - 1 && styles.faqBorder]}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <MaterialIcons
                name={openFaq === i ? 'expand-less' : 'expand-more'}
                size={22}
                color={Colors.textMedium}
              />
            </View>
            {openFaq === i ? <Text style={styles.faqA}>{item.a}</Text> : null}
          </Pressable>
        ))}
      </View>

      {/* Contact Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact Us</Text>
        {[
          { icon: 'email' as const, label: 'info@ecosudar.com' },
          { icon: 'phone' as const, label: '+91 98765 43210' },
          { icon: 'location-on' as const, label: 'Tamil Nadu, India' },
        ].map(c => (
          <View key={c.label} style={styles.contactRow}>
            <MaterialIcons name={c.icon} size={20} color={Colors.primary} />
            <Text style={styles.contactValue}>{c.label}</Text>
          </View>
        ))}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  contactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  contactTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  contactText: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: Spacing.lg,
  },
  faqItem: {
    paddingVertical: 12,
  },
  faqBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQ: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textDark,
    flex: 1,
    paddingRight: 8,
  },
  faqA: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    marginTop: 8,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactValue: {
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
});
