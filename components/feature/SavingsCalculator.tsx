import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

// ─── Data Model ────────────────────────────────────────────────────────────────

interface FuelType {
  id: string;
  label: string;
  unit: string;
  calorificValue: number; // kcal per unit
  co2PerUnit: number;     // kg CO₂ per unit
  emoji: string;
  defaultPrice: number;   // ₹ per unit
}

const FUELS: FuelType[] = [
  { id: 'lpg',      label: 'LPG',      unit: 'kg',  calorificValue: 11900, co2PerUnit: 3.00,  emoji: '🔥', defaultPrice: 85 },
  { id: 'diesel',   label: 'Diesel',   unit: 'L',   calorificValue: 10500, co2PerUnit: 2.68,  emoji: '⛽', defaultPrice: 95 },
  { id: 'coal',     label: 'Coal',     unit: 'kg',  calorificValue: 7000,  co2PerUnit: 2.42,  emoji: '⚫', defaultPrice: 12 },
  { id: 'firewood', label: 'Firewood', unit: 'kg',  calorificValue: 4500,  co2PerUnit: 1.90,  emoji: '🪵', defaultPrice: 8  },
];

const PELLET_CV   = 4200;  // kcal/kg
const PELLET_CO2  = 0.1;   // kg CO₂/kg
const PELLET_PRICE_DEFAULT = 14; // ₹/kg

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFirewoodCV(mc: number) {
  return 4500 * (1 - mc / 100) * (1 - mc / 200);
}

function moistureStatus(mc: number) {
  if (mc <= 20) return { label: 'Well-seasoned', color: Colors.primary };
  if (mc <= 35) return { label: 'Partially dried', color: '#F59E0B' };
  return { label: 'Green / Wet', color: Colors.red };
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ResultRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, highlight && styles.resultHighlight]}>{value}</Text>
    </View>
  );
}

function MetricCard({ icon, value, label, color }: { icon: keyof typeof MaterialIcons.glyphMap; value: string; label: string; color: string }) {
  return (
    <View style={styles.metricCard}>
      <MaterialIcons name={icon} size={26} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ─── Moisture Slider ────────────────────────────────────────────────────────────

function MoistureSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const steps = [10, 15, 20, 25, 30, 35, 40, 45, 50];
  const status = moistureStatus(value);
  return (
    <View style={styles.sliderBox}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>Moisture Content</Text>
        <Text style={[styles.sliderValue, { color: status.color }]}>{value}%</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepRow}>
        {steps.map(s => (
          <Pressable key={s} onPress={() => onChange(s)} style={[styles.stepBtn, s === value && { backgroundColor: status.color, borderColor: status.color }]}>
            <Text style={[styles.stepText, s === value && styles.stepTextActive]}>{s}%</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SavingsCalculatorProps {
  compact?: boolean; // compact = collapsed preview for Home page
}

export function SavingsCalculator({ compact = false }: SavingsCalculatorProps) {
  const { showAlert } = useAlert();
  const [expanded, setExpanded] = useState(!compact);
  const [selectedFuel, setSelectedFuel] = useState<FuelType>(FUELS[0]);
  const [consumption, setConsumption] = useState('100');
  const [fuelPrice, setFuelPrice] = useState(String(FUELS[0].defaultPrice));
  const [pelletPrice, setPelletPrice] = useState(String(PELLET_PRICE_DEFAULT));
  const [moistureContent, setMoistureContent] = useState(25);
  const [showResults, setShowResults] = useState(false);

  // ── Calculation ──────────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const qty    = parseFloat(consumption) || 0;
    const fPrice = parseFloat(fuelPrice)   || 0;
    const pPrice = parseFloat(pelletPrice) || 0;

    const effectiveCV = selectedFuel.id === 'firewood'
      ? getFirewoodCV(moistureContent)
      : selectedFuel.calorificValue;

    const totalEnergy    = qty * effectiveCV;
    const pelletNeeded   = totalEnergy / PELLET_CV;
    const currentCost    = qty * fPrice;
    const pelletCost     = pelletNeeded * pPrice;
    const monthlySavings = currentCost - pelletCost;
    const annualSavings  = monthlySavings * 12;
    const savingsPct     = currentCost > 0 ? (monthlySavings / currentCost) * 100 : 0;

    const currentCO2     = qty * selectedFuel.co2PerUnit;
    const pelletCO2      = pelletNeeded * PELLET_CO2;
    const monthlyCO2     = currentCO2 - pelletCO2;
    const annualCO2      = monthlyCO2 * 12;
    const trees          = annualCO2 / 22;

    return {
      pelletNeeded, currentCost, pelletCost, monthlySavings, annualSavings,
      savingsPct, currentCO2, pelletCO2, monthlyCO2, annualCO2, trees,
      positive: monthlySavings > 0,
    };
  }, [selectedFuel, consumption, fuelPrice, pelletPrice, moistureContent]);

  const handleSelectFuel = (f: FuelType) => {
    setSelectedFuel(f);
    setFuelPrice(String(f.defaultPrice));
    setShowResults(false);
  };

  const handleCalculate = () => {
    const qty = parseFloat(consumption);
    if (!qty || qty <= 0) {
      showAlert('Invalid Input', 'Please enter a valid monthly consumption.');
      return;
    }
    setShowResults(true);
  };

  const handleGetQuote = () => {
    showAlert(
      'Quote Request Received!',
      `Our team will contact you with a custom quote for ${fmt(parseFloat(pelletPrice) * results.pelletNeeded)} kg/month of Biomass Pellets within 24 hours.`
    );
  };

  // ── Compact Header (Home page teaser) ─────────────────────────────────────────
  if (compact && !expanded) {
    return (
      <Pressable onPress={() => setExpanded(true)} style={styles.compactTeaser}>
        <View style={styles.compactLeft}>
          <Text style={styles.compactEmoji}>💰</Text>
          <View>
            <Text style={styles.compactTitle}>Savings Calculator</Text>
            <Text style={styles.compactSub}>See how much you save by switching to biomass</Text>
          </View>
        </View>
        <View style={styles.compactChevron}>
          <MaterialIcons name="chevron-right" size={22} color={Colors.primary} />
        </View>
      </Pressable>
    );
  }

  // ── Full Calculator ───────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/* Card Header */}
      <View style={styles.calcHeader}>
        <View style={styles.calcTitleRow}>
          <Text style={styles.calcEmoji}>💰</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.calcTitle}>Savings Calculator</Text>
            <Text style={styles.calcSub}>Compare your current fuel cost vs Biomass Pellets</Text>
          </View>
        </View>
        {compact ? (
          <Pressable onPress={() => setExpanded(false)} hitSlop={8}>
            <MaterialIcons name="expand-less" size={22} color={Colors.textMedium} />
          </Pressable>
        ) : null}
      </View>

      {/* Step 1: Fuel Selection */}
      <Text style={styles.stepLabel}>Step 1 — Select Your Current Fuel</Text>
      <View style={styles.fuelGrid}>
        {FUELS.map(f => (
          <Pressable
            key={f.id}
            onPress={() => handleSelectFuel(f)}
            style={[styles.fuelCard, selectedFuel.id === f.id && styles.fuelCardActive]}
          >
            <Text style={styles.fuelEmoji}>{f.emoji}</Text>
            <Text style={[styles.fuelLabel, selectedFuel.id === f.id && styles.fuelLabelActive]}>{f.label}</Text>
            <Text style={styles.fuelUnit}>/{f.unit}</Text>
          </Pressable>
        ))}
      </View>

      {/* Moisture Slider for Firewood */}
      {selectedFuel.id === 'firewood' ? (
        <MoistureSlider value={moistureContent} onChange={setMoistureContent} />
      ) : null}

      {/* Step 2: Inputs */}
      <Text style={styles.stepLabel}>Step 2 — Enter Your Usage Details</Text>
      <View style={styles.inputsGrid}>
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Monthly Usage ({selectedFuel.unit})</Text>
          <TextInput
            style={styles.numInput}
            value={consumption}
            onChangeText={t => { setConsumption(t); setShowResults(false); }}
            keyboardType="decimal-pad"
            placeholder="e.g. 100"
            placeholderTextColor={Colors.textLight}
          />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>{selectedFuel.label} Price (₹/{selectedFuel.unit})</Text>
          <TextInput
            style={styles.numInput}
            value={fuelPrice}
            onChangeText={t => { setFuelPrice(t); setShowResults(false); }}
            keyboardType="decimal-pad"
            placeholder="Market rate"
            placeholderTextColor={Colors.textLight}
          />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Pellet Price (₹/kg)</Text>
          <TextInput
            style={styles.numInput}
            value={pelletPrice}
            onChangeText={t => { setPelletPrice(t); setShowResults(false); }}
            keyboardType="decimal-pad"
            placeholder="Default ₹14"
            placeholderTextColor={Colors.textLight}
          />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Pellets Needed (kg/mo)</Text>
          <View style={[styles.numInput, styles.readOnly]}>
            <Text style={styles.readOnlyText}>
              {showResults ? `~${fmt(results.pelletNeeded)} kg` : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Calculate Button */}
      <Pressable onPress={handleCalculate} style={styles.calcBtn}>
        <MaterialIcons name="calculate" size={18} color={Colors.white} />
        <Text style={styles.calcBtnText}>Calculate Savings</Text>
      </Pressable>

      {/* Results */}
      {showResults ? (
        <View style={styles.resultsBox}>
          {/* Savings Banner */}
          <View style={[styles.savingsBanner, { backgroundColor: results.positive ? Colors.primaryLight : '#FEF2F2' }]}>
            <MaterialIcons
              name={results.positive ? 'trending-down' : 'trending-up'}
              size={32}
              color={results.positive ? Colors.primary : Colors.red}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.savingsMain, { color: results.positive ? Colors.primary : Colors.red }]}>
                {results.positive ? 'You save' : 'Higher cost by'} ₹{fmt(Math.abs(results.monthlySavings))}/month
              </Text>
              <Text style={styles.savingsSub}>
                That is ₹{fmt(Math.abs(results.annualSavings))} per year
                {results.positive ? ` (${results.savingsPct.toFixed(0)}% savings)` : ''}
              </Text>
            </View>
          </View>

          {/* Cost Comparison */}
          <Text style={styles.resultsSubTitle}>Cost Comparison</Text>
          <ResultRow label={`Current (${selectedFuel.label})`} value={`₹${fmt(results.currentCost)}/month`} />
          <ResultRow label="With Biomass Pellets"             value={`₹${fmt(results.pelletCost)}/month`} />
          <ResultRow label="Monthly Savings"                  value={`₹${fmt(results.monthlySavings)}/month`} highlight />
          <ResultRow label="Annual Savings"                   value={`₹${fmt(results.annualSavings)}/year`} highlight />

          <View style={styles.divider} />

          {/* Environmental Impact */}
          <Text style={styles.resultsSubTitle}>Environmental Impact</Text>
          <View style={styles.metricsRow}>
            <MetricCard
              icon="co2"
              value={`${fmt(results.monthlyCO2)} kg`}
              label="CO₂ Saved/Month"
              color={Colors.primary}
            />
            <MetricCard
              icon="eco"
              value={`${fmt(results.annualCO2)} kg`}
              label="CO₂ Saved/Year"
              color={Colors.primary}
            />
            <MetricCard
              icon="park"
              value={`${fmt(results.trees)}`}
              label="Trees Equivalent"
              color="#16A34A"
            />
          </View>

          <View style={styles.divider} />

          {/* Pellet Details */}
          <Text style={styles.resultsSubTitle}>Biomass Pellets Required</Text>
          <ResultRow label="Pellets Needed"     value={`${fmt(results.pelletNeeded)} kg/month`} />
          <ResultRow label="Pellet CO₂ Emitted" value={`${results.pelletCO2.toFixed(1)} kg/month`} />
          <ResultRow label={`${selectedFuel.label} CO₂ Emitted`} value={`${results.currentCO2.toFixed(1)} kg/month`} />

          {/* Quote CTA */}
          {results.positive ? (
            <Pressable onPress={handleGetQuote} style={styles.quoteCta}>
              <MaterialIcons name="request-quote" size={18} color={Colors.white} />
              <Text style={styles.quoteCtaText}>Request a Custom Quote</Text>
            </Pressable>
          ) : null}

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            * Estimates based on standard calorific values. Actual savings may vary with delivery location and market prices.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    overflow: 'hidden',
  },

  // Compact teaser
  compactTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: Spacing.md,
    gap: 12,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactEmoji: { fontSize: 28 },
  compactTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  compactSub: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginTop: 2,
  },
  compactChevron: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 20,
    padding: 4,
  },

  // Header
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryBorder,
  },
  calcTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  calcEmoji: { fontSize: 28 },
  calcTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  calcSub: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    marginTop: 2,
    lineHeight: 16,
  },

  // Steps
  stepLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Fuel Grid
  fuelGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingBottom: Spacing.md,
  },
  fuelCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgLight,
  },
  fuelCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  fuelEmoji: { fontSize: 20, marginBottom: 4 },
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

  // Moisture Slider
  sliderBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGray,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  sliderValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  stepBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  stepText: {
    fontSize: FontSize.xs,
    color: Colors.textMedium,
    fontWeight: FontWeight.semibold,
  },
  stepTextActive: { color: Colors.white },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // Inputs
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  inputBox: {
    width: '47.5%',
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginBottom: 5,
  },
  numInput: {
    height: 42,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textDark,
    backgroundColor: Colors.white,
  },
  readOnly: {
    backgroundColor: Colors.bgLight,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: FontSize.body,
    color: Colors.textMedium,
    fontWeight: FontWeight.medium,
  },

  // Calculate Button
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.sm,
    paddingVertical: 13,
  },
  calcBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },

  // Results
  resultsBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderGray,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  savingsMain: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    lineHeight: 24,
  },
  savingsSub: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    marginTop: 3,
  },
  resultsSubTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderGray,
  },
  resultLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMedium,
    flex: 1,
  },
  resultValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  resultHighlight: {
    color: Colors.primary,
    fontSize: FontSize.body,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderGray,
    marginVertical: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  metricValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textMedium,
    textAlign: 'center',
  },
  quoteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.sm,
    paddingVertical: 13,
    marginTop: Spacing.lg,
  },
  quoteCtaText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  disclaimer: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: Spacing.md,
    lineHeight: 15,
    textAlign: 'center',
  },
});
