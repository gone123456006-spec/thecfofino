import { Ionicons } from '@expo/vector-icons';
import * as SplashScreenNative from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';

import { LoginScreen } from '@/components/LoginScreen';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { SplashScreen } from '@/components/SplashScreen';
import { TaglineScreen } from '@/components/TaglineScreen';
import { Colors } from '@/constants/theme';
import { ms, sw } from '@/utils/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

function NotificationsHeaderLeft() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      style={{ padding: sw(8), marginLeft: sw(4) }}
      hitSlop={{ top: sw(12), bottom: sw(12), left: sw(12), right: sw(12) }}
      accessibilityLabel="Go back">
      <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
    </Pressable>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, isReady, hasSeenWelcome } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    // Hide the native splash screen as soon as this component mounts
    SplashScreenNative.hideAsync().catch(() => {});

    if (isReady && showSplash) {
      // Small delay for the initial logo animation to breathe
      const timer = setTimeout(() => {
        setShowSplash(false);
        setShowTagline(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isReady, showSplash]);

  if (showSplash) {
    return (
      <>
        <SplashScreen onFinish={() => {
          if (isReady) {
            setShowSplash(false);
            setShowTagline(true);
          }
        }} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (showTagline) {
    return (
      <>
        <TaglineScreen onFinish={() => setShowTagline(false)} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (!hasSeenWelcome) {
    return (
      <>
        <WelcomeScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NotificationsProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen
          name="booking-call"
          options={{
            title: 'Book Your Call',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            title: 'Terms and Conditions',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            title: 'Privacy Policy',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="company-registration"
          options={{
            title: 'Company Registration',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="company-registration-form"
          options={{
            title: 'Company Details',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="company-registration-review-paywall"
          options={{
            title: 'Review & Payment',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="company-registration-upload-tracking"
          options={{
            title: 'Upload & Tracking',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      </NotificationsProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
