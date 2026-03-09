import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { LoginScreen } from '@/components/LoginScreen';
import { WelcomeScreen } from '@/components/WelcomeScreen';
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

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
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
