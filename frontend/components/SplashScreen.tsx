import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';

import { NavbarLogo } from '@/constants/assets';
import { useScalers } from '@/utils/responsive';

interface SplashScreenProps {
  onFinish?: () => void;
  /** Called once after the splash view has laid out — hide the native splash then. */
  onPainted?: () => void;
  /** Total time on screen before onFinish (ms) */
  duration?: number;
}

/** Instagram / Amazon style: white screen, centered logo, “from” + wordmark at bottom. */
export function SplashScreen({ onFinish, onPainted, duration = 2600 }: SplashScreenProps) {
  const paintedRef = useRef(false);
  const { sw, width } = useScalers();

  const wordmarkFade = useRef(new Animated.Value(0)).current;
  const wordmarkScale = useRef(new Animated.Value(1)).current;
  const zoomPulse = useRef(new Animated.Value(1)).current;

  const wordmarkWidth = Math.min(width * 0.58, sw(220));
  const wordmarkHeight = Math.round(wordmarkWidth * 0.22);

  const handleLayout = (_e: LayoutChangeEvent) => {
    if (paintedRef.current) return;
    paintedRef.current = true;
    onPainted?.();
  };

  useEffect(() => {
    const wordmarkAnim = Animated.parallel([
      Animated.timing(wordmarkFade, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkScale, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    wordmarkAnim.start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(zoomPulse, {
          toValue: 1.02,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(zoomPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseDelay = setTimeout(() => pulse.start(), 220);

    const end = setTimeout(() => onFinish?.(), duration);

    return () => {
      clearTimeout(pulseDelay);
      clearTimeout(end);
      wordmarkAnim.stop();
      pulse.stop();
    };
  }, [duration, onFinish, wordmarkFade, wordmarkScale, zoomPulse]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.centerStage}>
        <Animated.View
          style={[
            styles.wordmarkWrap,
            {
              opacity: wordmarkFade,
              transform: [{ scale: Animated.multiply(wordmarkScale, zoomPulse) }],
            },
          ]}>
          <Image
            source={NavbarLogo}
            style={{ width: wordmarkWidth, height: wordmarkHeight }}
            contentFit="contain"
            accessibilityLabel="Finovert logo"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmarkWrap: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
