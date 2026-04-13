import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { PRODUCTS } from '@/constants/products';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = SW * 0.65;
const CARD_GAP = 12;

export function ProductCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % PRODUCTS.length;
        scrollRef.current?.scrollTo({ x: next * (CARD_WIDTH + CARD_GAP), animated: true });
        return next;
      });
    }, 3000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, []);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CARD_WIDTH + CARD_GAP));
    setActiveIdx(Math.max(0, Math.min(idx, PRODUCTS.length - 1)));
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={stopTimer}
        onScrollEndDrag={() => { stopTimer(); startTimer(); }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        contentContainerStyle={styles.scrollContent}
      >
        {PRODUCTS.map(product => (
          <View key={product.id} style={styles.card}>
            <Image
              source={product.image}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.price}>₹{product.price}/kg</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {PRODUCTS.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIdx && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: CARD_GAP,
    paddingVertical: 4,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGray,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  productName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    marginBottom: 8,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    width: 18,
  },
});
