import { StyleSheet, View, type ViewStyle } from 'react-native';

/** Razorpay brand blue */
export const RAZORPAY_BRAND_BLUE = '#3395FF';

type Props = {
  size?: number;
  style?: ViewStyle;
};

/** Razorpay glyph-style mark in brand colour (no network image). */
export function RazorpayBrandIcon({ size = 20, style }: Props) {
  const barW = Math.max(3, Math.round(size * 0.22));
  const barH = Math.round(size * 0.88);
  const gap = Math.max(2, Math.round(size * 0.1));

  return (
    <View
      style={[styles.wrap, { height: size, gap }, style]}
      accessibilityLabel="Razorpay"
      accessibilityRole="image">
      <View style={[styles.bar, { width: barW, height: barH, opacity: 1 }]} />
      <View style={[styles.bar, { width: barW, height: barH, opacity: 0.72 }]} />
      <View style={[styles.bar, { width: barW, height: barH, opacity: 0.44 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    backgroundColor: RAZORPAY_BRAND_BLUE,
    borderRadius: 2,
    transform: [{ skewX: '-14deg' }],
  },
});
