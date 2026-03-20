import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface SplashScreen2Props {
  onFinish?: () => void;
  duration?: number;
}

export function SplashScreen2({ onFinish, duration = 2500 }: SplashScreen2Props) {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'Your Virtual CFO';

  useEffect(() => {
    // Text typing animation
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 80);

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onFinish]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
      }}>
      {/* Typing animation text */}
      <Text
        style={{
          fontSize: 24,
          color: Colors.primary,
          textAlign: 'center',
          fontWeight: '600',
          letterSpacing: 0.5,
          minHeight: 32,
          paddingHorizontal: 20,
        }}>
        {displayedText}
        {displayedText.length < fullText.length && (
          <Text style={{ opacity: 0.7 }}>|</Text>
        )}
      </Text>
    </View>
  );
}
