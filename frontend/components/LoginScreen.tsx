import React, { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { HeaderLogo } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { useScalers } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

let GoogleSignin: any = null;
let isNativeGoogleSignInAvailable = false;

try {
  if (Platform.OS !== 'web') {
    // Dynamically require to prevent top-level import crashes in Expo Go
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    });
    isNativeGoogleSignInAvailable = true;
  }
} catch (error) {
  console.warn('Native Google Sign-In module is not available. Falling back to Web Browser Auth.');
}

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const scalers = useScalers();
  const { sh, sw, ms, height } = scalers;
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.min(height * 0.30, 200);

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async (idToken: string | undefined) => {
    if (!idToken) {
      Alert.alert('Error', 'Failed to get ID token from Google');
      return;
    }
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      // Navigation handled by _layout once user state updates
    } catch (error: any) {
      Alert.alert('Sign-In Failed', error?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle]);

  const handleGooglePress = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS !== 'web' && isNativeGoogleSignInAvailable) {
        // Native Google Sign-In
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        
        if (tokens.idToken) {
          await handleGoogleSignIn(tokens.idToken);
        } else {
          Alert.alert('Error', 'Missing ID token from Google Sign In');
        }
      } else {
        // WebBrowser Fallback (Web, iOS Expo Go, Android Expo Go)
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
        const proxyRedirectUri = Platform.OS === 'web'
          ? makeRedirectUri({ scheme: 'finovert' })
          : 'https://auth.expo.io/@shyamhero/finovert';

        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(proxyRedirectUri)}` +
          `&response_type=id_token` +
          `&scope=${encodeURIComponent('openid profile email')}` +
          `&nonce=${Math.random().toString(36).substring(7)}` +
          `&prompt=select_account`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, proxyRedirectUri);

        if (result.type === 'success' && result.url) {
          const hash = result.url.split('#')[1];
          const params = new URLSearchParams(hash || '');
          const idToken = params.get('id_token');
          if (idToken) {
            await handleGoogleSignIn(idToken);
          } else {
            Alert.alert('Error', 'No ID token found in Google response.');
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        // user cancelled the login flow
      } else if (error.code === 'IN_PROGRESS') {
        // operation (e.g. sign in) is in progress already
      } else {
        Alert.alert('Error', error?.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  }, [handleGoogleSignIn]);

  // ── Email Sign-In ───────────────────────────────────────────────────────────
  const handleEmailSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      // Navigation is driven by _layout
    } catch (error: any) {
      Alert.alert('Sign-In Failed', error?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }, [email, password, loginWithEmail]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.gradientDark }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          authStyles.loginScrollContent,
          { paddingBottom: insets.bottom + sh(40) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header Band */}
        <View
          style={[
            authStyles.loginHeaderBand,
            {
              paddingTop: insets.top + sh(20),
              minHeight: headerHeight,
              justifyContent: 'center',
            },
          ]}>
          <Text style={authStyles.loginHeaderTitle}>Your Virtual CFO</Text>
          <Text
            style={[
              authStyles.loginHeaderTitle,
              { fontSize: ms(14), fontWeight: '600', opacity: 0.85, marginTop: sh(6) },
            ]}>
            Sign in to continue
          </Text>
        </View>

        {/* Form Card */}
        <View style={authStyles.loginFormCard}>
          {/* Logo */}
          <View style={authStyles.loginLogoWrap}>
            <Image
              source={HeaderLogo}
              style={authStyles.loginLogoImage}
              resizeMode="contain"
              accessibilityLabel="Finovert"
            />
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: sh(14) }}>
            <Text style={authStyles.loginLabel}>Gmail Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your Gmail"
              placeholderTextColor={Colors.textMuted}
              style={authStyles.loginInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: sh(24) }}>
            <Text style={authStyles.loginLabel}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                style={authStyles.loginInput}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: sw(12), top: sh(14) }}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={ms(20)}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Sign In Button */}
          <Pressable
            onPress={handleEmailSignIn}
            disabled={loading}
            style={({ pressed }) => [
              authStyles.loginSubmitButton,
              { opacity: loading ? 0.65 : pressed ? 0.85 : 1 },
            ]}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Text style={authStyles.loginSubmitText}>Sign In</Text>
            )}
          </Pressable>

          {/* OR Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: sh(22), gap: sw(10) }}>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
            <Text style={{ fontSize: ms(13), color: Colors.textMuted }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
          </View>

          {/* Sign in with Google */}
          <Pressable
            onPress={handleGooglePress}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: Colors.surface,
              paddingVertical: sh(14),
              borderRadius: sw(12),
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: sw(10),
              borderWidth: 1.5,
              borderColor: '#e0e0e0',
              opacity: loading ? 0.6 : pressed ? 0.85 : 1,
            })}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={ms(20)} color="#4285F4" />
                <Text style={{ fontSize: ms(15), fontWeight: '600', color: Colors.textSecondary }}>
                  Sign in with Google
                </Text>
              </>
            )}
          </Pressable>

          <Text style={[authStyles.loginSecureNote, { marginTop: sh(28) }]}>
            Secure sign in · We never share your data
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
