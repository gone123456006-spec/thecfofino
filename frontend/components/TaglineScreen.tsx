import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface TaglineScreenProps {
  onFinish?: () => void;
  typingSpeed?: number;
}

export function TaglineScreen({ onFinish, typingSpeed = 70 }: TaglineScreenProps) {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'Your Virtual CFO';

  useEffect(() => {
    let index = 0;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        finishTimer = setTimeout(() => onFinish?.(), 1200);
      }
    }, typingSpeed);

    return () => {
      clearInterval(interval);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [onFinish, typingSpeed]);

  return (
    <LinearGradient
      colors={['#dbeafe', '#e3f2fd', '#ffffff', '#e1f5fe']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.28, 0.58, 1]}
      style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.tagline}>
          {displayedText}
          {displayedText.length < fullText.length && (
            <Text style={styles.cursor}>|</Text>
          )}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: ms(24),
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cursor: {
    color: Colors.accent,
    fontWeight: '400',
    opacity: 0.8,
  },
});
