import '@/lib/splash-hold';

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as SplashScreenNative from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import React, { useState, useCallback, useRef, useEffect } from 'react';

import { LoginScreen } from '@/components/LoginScreen';
import { CreateProfileScreen } from '@/components/CreateProfileScreen';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { SplashScreen } from '@/components/SplashScreen';
import { TaglineScreen } from '@/components/TaglineScreen';
import { Colors } from '@/constants/theme';
import { ms, sw } from '@/utils/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { preloadServiceImages } from '@/utils/preload-service-images';

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
  const { user, hasSeenWelcome } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showTagline, setShowTagline] = useState(false);
  const nativeSplashHiddenRef = useRef(false);

  const hideNativeSplash = useCallback(async () => {
    if (nativeSplashHiddenRef.current) return;
    nativeSplashHiddenRef.current = true;
    // SplashScreen.setOptions is not supported in Expo Go (would log a warning).
    if (Constants.appOwnership !== 'expo') {
      try {
        SplashScreenNative.setOptions({
          fade: true,
          duration: 220,
          backgroundColor: '#ffffff',
        });
      } catch {
        /* older native module */
      }
    }
    await SplashScreenNative.hideAsync();
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    const fallback = setTimeout(() => void hideNativeSplash(), 4000);
    return () => clearTimeout(fallback);
  }, [showSplash, hideNativeSplash]);

  if (showSplash) {
    return (
      <>
        <SplashScreen
          duration={2800}
          onPainted={() => {
            void hideNativeSplash();
          }}
          onFinish={() => {
            setShowSplash(false);
            setShowTagline(true);
          }}
        />
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

  const mobileDigits = user.mobile?.replace(/\D/g, '').slice(-10) ?? '';
  const needsProfile = !user.name?.trim() || !/^[6-9]\d{9}$/.test(mobileDigits);
  if (needsProfile) {
    return (
      <>
        <CreateProfileScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
            title: 'Book a call',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#f8f9fa' },
            headerTitleStyle: { fontWeight: '500', fontSize: ms(18), color: '#202124' },
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
          name="policies"
          options={{
            title: 'Policies',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerBackTitle: 'Back',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: false,
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
            title: 'Review & payment',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="transactions"
          options={{
            title: 'Payment activity',
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
            title: 'My filings',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen
          name="company-registration-tracking/[id]"
          options={{
            title: 'Filing tracker',
            headerTitleAlign: 'left',
            headerLeft: () => <NotificationsHeaderLeft />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            headerTitleStyle: { fontWeight: '700', fontSize: ms(18), color: Colors.textPrimary },
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void preloadServiceImages();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NotificationsProvider>
          <AuthProvider>
            <RootLayoutContent />
          </AuthProvider>
        </NotificationsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
