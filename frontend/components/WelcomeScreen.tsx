import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { useAuth } from '@/contexts/AuthContext';
import { useScalers } from '@/utils/responsive';

const WELCOME_IMAGES = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
];

const AUTO_SLIDE_INTERVAL_MS = 3500;

export function WelcomeScreen() {
  const { setHasSeenWelcome } = useAuth();
  const scalers = useScalers();
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % WELCOME_IMAGES.length;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex >= 0 && newIndex < WELCOME_IMAGES.length) setIndex(newIndex);
  };

  const handleContinue = async () => {
    await setHasSeenWelcome();
  };

  return (
    <View style={authStyles.welcomeContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={onScroll}
        onScrollEndDrag={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ flex: 1 }}>
        {WELCOME_IMAGES.map((uri, i) => (
          <View key={i} style={{ width, flex: 1 }}>
            <Image
              source={{ uri }}
              style={{ width, flex: 1 }}
              resizeMode="cover"
              accessibilityLabel={`Welcome slide ${i + 1}`}
            />
            <View style={authStyles.welcomeGradient} />
          </View>
        ))}
      </ScrollView>

      <View style={[authStyles.welcomeContentCard, { paddingBottom: insets.bottom + 28 }]}>
        <View style={authStyles.welcomeDots}>
          {WELCOME_IMAGES.map((_, i) => (
            <View
              key={i}
              style={[
                authStyles.welcomeDot,
                index === i && authStyles.welcomeDotActive,
                { width: index === i ? 24 : 8 },
              ]}
            />
          ))}
        </View>

        <Text style={authStyles.welcomeTitle}>Your Digital CFO</Text>
        <Text style={authStyles.welcomeSubtitle}>
          Smart insights for your business. Plan, track, and grow with confidence.
        </Text>

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            authStyles.welcomeButton,
            { opacity: pressed ? 0.92 : 1 },
          ]}>
          <Text style={authStyles.welcomeButtonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
