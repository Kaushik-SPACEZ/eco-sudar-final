import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/feature/Logo';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

// ─── Data Model ─────────────────────────────────────────────────────────────

const FUELS = [
  { id: 'lpg',      label: 'LPG',      unit: 'kg',    cv: 11900, co2: 3.0,  icon: '🔥', defaultPrice: 85 },
  { id: 'diesel',   label: 'Diesel',   unit: 'L',     cv: 10500, co2: 2.68, icon: '⛽', defaultPrice: 95 },
  { id: 'coal',     label: 'Coal',     unit: 'kg',    cv: 7000,  co2: 2.42, icon: '⚫', defaultPrice: 12 },
  { id: 'firewood', label: 'Firewood', unit: 'kg',    cv: 4500,  co2: 1.9,  icon: '🪵', defaultPrice: 8  },
] as const;

type FuelId = typeof FUELS[number]['id'];

const PELLET_CV            = 4200;
const PELLET_CO2_PER_KG    = 0.1;
const PELLET_DEFAULT_PRICE = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEffectiveCV(cv: number, id: FuelId, mc: number) {
  if (id !== 'firewood') return cv;
  return cv * (1 - mc / 100) * (1 - mc / 200);
}

function getMoistureStatus(mc: number) {
  if (mc <= 20) return { label: 'Well-seasoned',   color: '#22C55E', emoji: '🟢' };
  if (mc <= 35) return { label: 'Partially dried', color: '#F59E0B', emoji: '🟡' };
  return         { label: 'Green / wet',           color: '#EF4444', emoji: '🔴' };
}

// ─── Reusable numeric input ──────────────────────────────────────────────────

function NumInput({
  label, value, onChange, suffix, icon,
}: {
  label: string; value: string; onChange: (v: string) => void; suffix: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.numWrap}>
      <Text style={styles.numLabel}>{label}</Text>
      <View style={styles.numRow}>
        <MaterialIcons name={icon} size={17} color={Colors.textMedium} style={styles.numIcon} />
        <TextInput
          style={styles.numInput}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholderTextColor={Colors.textLight}
        />
        <Text style={styles.numSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SavingsCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();

  const [fuelId,      setFuelId]      = useState<FuelId>('lpg');
  const [consumption, setConsumption] = useState('100');
  const [fuelPrice,   setFuelPrice]   = useState('85');
  const [pelletPrice, setPelletPrice] = useState(String(PELLET_DEFAULT_PRICE));
  const [moisture,    setMoisture]    = useState(20);

  const fuel        = FUELS.find(f => f.id === fuelId)!;
  const effectiveCV = getEffectiveCV(fuel.cv, fuelId, moisture);
  const msStatus    = getMoistureStatus(moisture);

  const handleFuelSelect = (id: FuelId) => {
    setFuelId(id);
    setFuelPrice(String(FUELS.find(f => f.id === id)!.defaultPrice));
  };

  const calc = useMemo(() => {
    const qty = parseFloat(consumption) || 0;
    const fp  = parseFloat(fuelPrice)   || 0;
    const pp  = parseFloat(pelletPrice) || PELLET_DEFAULT_PRICE;

    const totalEnergy    = qty * effectiveCV;
    const pelletNeeded   = totalEnergy / PELLET_CV;

    const currentCost    = qty * fp;
    const pelletCost     = pelletNeeded * pp;
    const monthlySavings = currentCost - pelletCost;
    const annualSavings  = monthlySavings * 12;
    const savingsPct     = currentCost > 0 ? (monthlySavings / currentCost) * 100 : 0;

    const currentCO2          = qty * fuel.co2;
    const pelletCO2           = pelletNeeded * PELLET_CO2_PER_KG;
    const monthlyCO2Reduction = currentCO2 - pelletCO2;
    const annualCO2Reduction  = monthlyCO2Reduction * 12;
    const treesEquivalent     = annualCO2Reduction / 22;

    const pelletBarPct =
      currentCO2 > 0 ? Math.min(100, (pelletCO2 / currentCO2) * 100) : 5;

    return {
      pelletNeeded, currentCost, pelletCost,
      monthlySavings, annualSavings, savingsPct,
      currentCO2, pelletCO2,
      monthlyCO2Reduction, annualCO2Reduction, treesEquivalent,
      pelletBarPct,
    };
  }, [consumption, fuelPrice, pelletPrice, effectiveCV, fuel]);

  const hasSavings = calc.monthlySavings > 0;

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Logo />
        <Text style={styles.headerTitle}>Savings Calculator</Text>
      </View>

      {/* Hero banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroIconCircle}>
          <MaterialIcons name="calculate" size={28} color={Colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.heroTitle}>Compare Fuel Costs</Text>
          <Text style={styles.heroSub}>
            See how much you save by switching to Biomass Pellets
          </Text>
        </View>
      </View>

      {/* ── Fuel Selector ───────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Your Current Fuel</Text>
        <View style={styles.fuelGrid}>
          {FUELS.map(f => (
            <Pressable
              key={f.id}
              style={[styles.fuelCard, fuelId === f.id && styles.fuelCardActive]}
              onPress={() => handleFuelSelect(f.id)}
            >
              <Text style={styles.fuelIcon}>{f.icon}</Text>
              <Text style={[styles.fuelLabel, fuelId === f.id && styles.fuelLabelActive]}>
                {f.label}
              </Text>
              <Text style={[styles.fuelUnit, fuelId === f.id && styles.fuelUnitActive]}>
                /{f.unit}
              </Text>
              {fuelId === f.id && (
                <View style={styles.fuelCheck}>
                  <MaterialIcons name="check-circle" size={14} color={Colors.primary} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Firewood Moisture ────────────────────────────────────────── */}
      {fuelId === 'firewood' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wood Moisture Content</Text>
          <View style={styles.moistureHeader}>
            <Text style={styles.moistureStatus}>
              {msStatus.emoji}  {moisture}%
            </Text>
            <View style={[styles.moistureBadge, { backgroundColor: msStatus.color + '20', borderColor: msStatus.color }]}>
              <Text style={[styles.moistureBadgeText, { color: msStatus.color }]}>
                {msStatus.label}
              </Text>
            </View>
          </View>

          {/* Visual track */}
          <View style={styles.trackBg}>
            <View
              style={[
                styles.trackFill,
                {
                  width: `${((moisture - 10) / 40) * 100}%`,
                  backgroundColor: msStatus.color,
                },
              ]}
            />
          </View>

          <View style={styles.sliderControls}>
            <Pressable
              style={styles.sliderBtn}
              onPress={() => setMoisture(m => Math.max(10, m - 5))}
            >
              <MaterialIcons name="remove" size={18} color={Colors.primary} />
            </Pressable>
            <Text style={styles.sliderRange}>10% ← → 50%</Text>
            <Pressable
              style={styles.sliderBtn}
              onPress={() => setMoisture(m => Math.min(50, m + 5))}
            >
              <MaterialIcons name="add" size={18} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.effectiveCVBox}>
            <MaterialIcons name="bolt" size={15} color={Colors.primary} />
            <Text style={styles.effectiveCVText}>
              Effective Calorific Value: <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>
                {effectiveCV.toFixed(0)} kcal/kg
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* ── Usage Inputs ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Usage Details</Text>
        <NumInput
          label={`Monthly Consumption (${fuel.unit})`}
          value={consumption}
          onChange={setConsumption}
          suffix={fuel.unit}
          icon="local-fire-department"
        />
        <NumInput
          label={`${fuel.icon} ${fuel.label} Price (₹/${fuel.unit})`}
          value={fuelPrice}
          onChange={setFuelPrice}
          suffix={`₹/${fuel.unit}`}
          icon="currency-rupee"
        />
        <NumInput
          label="🌿 Biomass Pellet Price (₹/kg)"
          value={pelletPrice}
          onChange={setPelletPrice}
          suffix="₹/kg"
          icon="grass"
        />
      </View>

      {/* ── Cost Comparison ──────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Cost Comparison</Text>

        <View style={styles.compRow}>
          {/* Current fuel */}
          <View style={styles.compSide}>
            <Text style={styles.compFuelEmoji}>{fuel.icon}</Text>
            <Text style={styles.compFuelName}>{fuel.label}</Text>
            <Text style={styles.compCost}>₹{fmt(calc.currentCost)}</Text>
            <Text style={styles.compSub}>per month</Text>
          </View>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Pellets */}
          <View style={styles.compSide}>
            <Text style={styles.compFuelEmoji}>🌿</Text>
            <Text style={styles.compFuelName}>Pellets</Text>
            <Text style={[styles.compCost, { color: Colors.primary }]}>
              ₹{fmt(calc.pelletCost)}
            </Text>
            <Text style={styles.compSub}>{calc.pelletNeeded.toFixed(1)} kg</Text>
          </View>
        </View>

        {/* Savings box */}
        <View style={[
          styles.savingsBox,
          hasSavings ? styles.savingsBoxGreen : styles.savingsBoxRed,
        ]}>
          <MaterialIcons
            name={hasSavings ? 'trending-down' : 'trending-up'}
            size={26}
            color={hasSavings ? Colors.primary : Colors.red}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.savingsLabel, !hasSavings && { color: Colors.red }]}>
              {hasSavings ? 'Monthly Savings' : 'Monthly Extra Cost'}
            </Text>
            <Text style={[styles.savingsAmount, !hasSavings && { color: Colors.red }]}>
              ₹{fmt(Math.abs(calc.monthlySavings))}
              <Text style={styles.savingsPct}>  ({Math.abs(calc.savingsPct).toFixed(1)}%)</Text>
            </Text>
          </View>
        </View>

        {hasSavings && (
          <View style={styles.annualBox}>
            <MaterialIcons name="calendar-today" size={15} color={Colors.primary} />
            <Text style={styles.annualText}>
              Annual savings:{' '}
              <Text style={styles.annualAmount}>₹{fmt(calc.annualSavings)}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* ── Environmental Impact ─────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌍 Environmental Impact</Text>

        <View style={styles.envGrid}>
          <View style={styles.envItem}>
            <Text style={styles.envValue}>{calc.monthlyCO2Reduction.toFixed(1)}</Text>
            <Text style={styles.envUnit}>kg CO₂</Text>
            <Text style={styles.envLabel}>Monthly{'\n'}Reduction</Text>
          </View>
          <View style={[styles.envItem, styles.envBorder]}>
            <Text style={styles.envValue}>{calc.annualCO2Reduction.toFixed(0)}</Text>
            <Text style={styles.envUnit}>kg CO₂</Text>
            <Text style={styles.envLabel}>Annual{'\n'}Reduction</Text>
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envValue}>{Math.max(0, calc.treesEquivalent).toFixed(0)}</Text>
            <Text style={styles.envUnit}>🌳 trees</Text>
            <Text style={styles.envLabel}>Equivalent{'\n'}per year</Text>
          </View>
        </View>

        {/* CO₂ bar comparison */}
        <View style={styles.co2Section}>
          <View style={styles.co2Row}>
            <Text style={styles.co2BarLabel}>{fuel.icon} {fuel.label}</Text>
            <Text style={styles.co2BarVal}>{calc.currentCO2.toFixed(1)} kg</Text>
          </View>
          <View style={styles.co2TrackBg}>
            <View style={[styles.co2Fill, { width: '100%', backgroundColor: '#EF4444' }]} />
          </View>

          <View style={[styles.co2Row, { marginTop: 10 }]}>
            <Text style={styles.co2BarLabel}>🌿 Pellets</Text>
            <Text style={[styles.co2BarVal, { color: Colors.primary }]}>
              {calc.pelletCO2.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.co2TrackBg}>
            <View style={[styles.co2Fill, {
              width: `${calc.pelletBarPct}%`,
              backgroundColor: Colors.primary,
            }]} />
          </View>
          <Text style={styles.co2Footnote}>Monthly CO₂ emissions comparison</Text>
        </View>
      </View>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <View style={styles.ctaCard}>
        <MaterialIcons name="handshake" size={32} color={Colors.primary} />
        <Text style={styles.ctaTitle}>Ready to Switch?</Text>
        <Text style={styles.ctaText}>
          Get a personalised quote from our team and start saving today
        </Text>
        <Button
          label="Request a Quote"
          onPress={() => router.push('/(tabs)/queries')}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPage,
  },

  // Header
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

  // Hero
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  heroIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 3,
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    lineHeight: 17,
  },

  // Card
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },

  // Fuel grid
  fuelGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fuelCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.bgPage,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: 4,
    position: 'relative',
  },
  fuelCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  fuelIcon: { fontSize: 22, marginBottom: 4 },
  fuelLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
    textAlign: 'center',
  },
  fuelLabelActive: { color: Colors.primaryDark },
  fuelUnit: {
    fontSize: 9,
    color: Colors.textLight,
    marginTop: 1,
  },
  fuelUnitActive: { color: Colors.primary },
  fuelCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },

  // Moisture
  moistureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  moistureStatus: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  moistureBadge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  moistureBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  trackBg: {
    height: 10,
    backgroundColor: Colors.bgPage,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  trackFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sliderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderRange: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
  },
  effectiveCVBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  effectiveCVText: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
  },

  // Numeric input
  numWrap: { marginBottom: Spacing.md },
  numLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: 6,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgPage,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  numIcon: { marginRight: 8 },
  numInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textDark,
    height: 46,
  },
  numSuffix: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    marginLeft: 6,
  },

  // Cost comparison
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  compSide: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.bgPage,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  compFuelEmoji: { fontSize: 26, marginBottom: 4 },
  compFuelName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
    marginBottom: 6,
  },
  compCost: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  compSub: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgPage,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  vsText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textMedium,
  },
  savingsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  savingsBoxGreen: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryBorder,
  },
  savingsBoxRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  savingsLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  savingsAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  savingsPct: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
  },
  annualBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgPage,
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  annualText: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
  },
  annualAmount: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Environmental
  envGrid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.borderGray,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  envItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  envBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.borderGray,
  },
  envValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  envUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginTop: 1,
  },
  envLabel: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 12,
  },
  co2Section: { marginTop: 0 },
  co2Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  co2BarLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textDark,
  },
  co2BarVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textMedium,
  },
  co2TrackBg: {
    height: 10,
    backgroundColor: Colors.bgPage,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  co2Fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  co2Footnote: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },

  // CTA
  ctaCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  ctaText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
