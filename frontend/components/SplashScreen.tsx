import React, { useEffect, useRef } from 'react';
import { Animated, Image, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import { HeaderLogo } from '@/constants/assets';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 1800 }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current; // Start smaller for pop effect

  useEffect(() => {
    // Premium logo reveal: Fade in with a springy scale-up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, duration, onFinish]);

  return (
    <LinearGradient
      colors={['#e3f2fd', '#ffffff', '#e1f5fe']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.5, 1]}
      style={styles.container}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}>
        <Image
          source={HeaderLogo}
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
    width: 200,
    height: 100,
  },
});
