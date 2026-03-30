import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SplashIcon } from '@/constants/assets';

interface SplashScreenProps {
  onFinish?: () => void;
  /** Called once after the splash view has laid out — hide the native splash then. */
  onPainted?: () => void;
  /** Total time on screen before onFinish (ms) */
  duration?: number;
}

export function SplashScreen({ onFinish, onPainted, duration = 2400 }: SplashScreenProps) {
  const paintedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleLayout = (_e: LayoutChangeEvent) => {
    if (paintedRef.current) return;
    paintedRef.current = true;
    onPainted?.();
  };

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseDelay = setTimeout(() => pulse.start(), 400);

    const end = setTimeout(() => onFinish?.(), duration);

    return () => {
      clearTimeout(pulseDelay);
      clearTimeout(end);
      pulse.stop();
    };
  }, [duration, pulseAnim, onFinish]);

  return (
    <LinearGradient
      colors={['#dbeafe', '#e3f2fd', '#ffffff', '#e1f5fe']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.28, 0.58, 1]}
      style={styles.container}
      onLayout={handleLayout}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Image
          source={SplashIcon}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Finovert Logo"
        />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 260,
    height: 260,
  },
});
