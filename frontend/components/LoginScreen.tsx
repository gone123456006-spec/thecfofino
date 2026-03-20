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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { HeaderLogo } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { useScalers } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const scalers = useScalers();
  const { sh, sw, ms, height } = scalers;
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.min(height * 0.32, 220);

  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'options' | 'email' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google Auth Session - Manually handled to force Expo Proxy behavior
  const handleGoogleSignIn = React.useCallback(async (idToken: string | undefined) => {
    if (!idToken) {
      Alert.alert('Error', 'Failed to get ID token from Google');
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Sign-In Failed', error?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, router]);

  const handleGooglePress = React.useCallback(async () => {
    setLoading(true);
    try {
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
      const proxyRedirectUri = 'https://auth.expo.io/@shyamhero/finovert';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(proxyRedirectUri)}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&nonce=${Math.random().toString(36).substring(7)}` +
        `&prompt=select_account`;

      console.log('[Google Auth] Starting manual WebBrowser session:', authUrl);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, proxyRedirectUri);

      if (result.type === 'success' && result.url) {
        // Extract id_token from the result URL
        const hash = result.url.split('#')[1];
        const params = new URLSearchParams(hash || '');
        const idToken = params.get('id_token');

        if (idToken) {
          await handleGoogleSignIn(idToken);
        } else {
          Alert.alert('Error', 'No ID token found in Google response.');
        }
      }
    } catch (error: any) {
      console.error('Manual Google Auth Error:', error);
      Alert.alert('Error', error?.message || 'Failed to finish Google sign-in');
    } finally {
      setLoading(false);
    }
  }, [handleGoogleSignIn]);

  const handleEmailSignIn = React.useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
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
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Email Sign-In Error:', error);
      Alert.alert('Sign-In Failed', error?.message || 'Failed to sign in with email');
    } finally {
      setLoading(false);
    }
  }, [email, password, loginWithEmail, router]);

  const handleSignUpWithDetails = React.useCallback(async () => {
    if (!name.trim() || !mobile.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate name
    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    // Validate mobile (10 digits)
    const mobileDigits = mobile.replace(/\D/g, '');
    if (mobileDigits.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Create account with email, password, name, and mobile
      await loginWithEmail(email, password, name, mobile);

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Sign-Up Error:', error);
      Alert.alert('Sign-Up Failed', error?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }, [name, mobile, email, password, loginWithEmail, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.gradientDark }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <ScrollView
        contentContainerStyle={[
          authStyles.loginScrollContent,
          { paddingBottom: insets.bottom + sh(40) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
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
              {
                fontSize: ms(14),
                fontWeight: '600',
                opacity: 0.9,
                marginTop: sh(4),
              },
            ]}>
            Sign in to continue
          </Text>
        </View>

        {/* Form Card */}
        <View style={authStyles.loginFormCard}>
          <View style={authStyles.loginLogoWrap}>
            <Image
              source={HeaderLogo}
              style={authStyles.loginLogoImage}
              resizeMode="contain"
              accessibilityLabel="Finovert"
            />
          </View>

          {authMode === 'options' ? (
            <>
              {/* Google Sign-In Button */}
              <View style={{ marginTop: sh(24) }}>
                <Pressable
                  onPress={handleGooglePress}
                  disabled={loading}
                  style={{
                    backgroundColor: Colors.primary,
                    paddingVertical: sh(14),
                    borderRadius: sw(12),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: sw(10),
                    opacity: loading ? 0.6 : 1,
                  }}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="logo-google"
                        size={ms(20)}
                        color={Colors.textOnPrimary}
                      />
                      <Text
                        style={{
                          fontSize: ms(16),
                          fontWeight: '600',
                          color: Colors.textOnPrimary,
                        }}>
                        Sign in with Google
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: sh(20), gap: sw(10) }}>
                <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
                <Text style={{ fontSize: ms(13), color: Colors.textMuted }}>OR</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
              </View>

              {/* Email Sign-In Button */}
              <View>
                <Pressable
                  onPress={() => setAuthMode('signup')}
                  disabled={loading}
                  style={({ pressed }) => [
                    {
                      backgroundColor: Colors.surface,
                      paddingVertical: sh(14),
                      borderRadius: sw(12),
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: sw(10),
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      opacity: loading ? 0.6 : pressed ? 0.9 : 1,
                    },
                  ]}>
                  <Ionicons
                    name="mail"
                    size={ms(20)}
                    color={Colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: ms(16),
                      fontWeight: '600',
                      color: Colors.primary,
                    }}>
                    Sign in with Email
                  </Text>
                </Pressable>
              </View>

              {/* Info Banner */}
              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: sw(12),
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.primary,
                  paddingVertical: sh(12),
                  paddingHorizontal: sw(14),
                  marginTop: sh(20),
                  flexDirection: 'row',
                  gap: sw(10),
                }}>
                <Ionicons
                  name="information-circle"
                  size={ms(20)}
                  color={Colors.primary}
                  style={{ marginTop: sh(2) }}
                />
                <Text
                  style={{
                    fontSize: ms(13),
                    color: Colors.textSecondary,
                    flex: 1,
                    lineHeight: ms(18),
                  }}>
                  Fast & secure sign-in. Your data is never shared.
                </Text>
              </View>
            </>
          ) : authMode === 'signup' ? (
            <>
              {/* Signup Form Title */}
              <Text style={{ fontSize: ms(24), fontWeight: '700', textAlign: 'center', marginBottom: sh(24), marginTop: sh(12), color: Colors.textPrimary }}>
                Create Account
              </Text>

              {/* Name Input */}
              <View style={{ marginBottom: sh(4) }}>
                <Text style={{ fontSize: ms(13), color: Colors.textSecondary, marginBottom: sh(6) }}>
                  Name <Text style={{ color: '#FF3B30' }}>*</Text>
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.textMuted}
                  style={[authStyles.loginInput, { marginBottom: 0 }]}
                  editable={!loading}
                />
              </View>

              {/* Mobile Input */}
              <View style={{ marginBottom: sh(14) }}>
                <Text style={{ fontSize: ms(13), color: Colors.textSecondary, marginBottom: sh(6) }}>
                  Mobile <Text style={{ color: '#FF3B30' }}>*</Text>
                </Text>
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={Colors.textMuted}
                  style={[authStyles.loginInput, { marginBottom: 0 }]}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              {/* Email Input */}
              <View style={{ marginBottom: sh(14) }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.textMuted}
                  style={[authStyles.loginInput, { marginBottom: 0 }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: sh(20), position: 'relative' }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  style={[authStyles.loginInput, { marginBottom: 0 }]}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: sw(12), top: sh(12) }}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={ms(20)}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>

              {/* Create Account Button */}
              <View style={{ marginBottom: sh(16) }}>
                <Pressable
                  onPress={handleSignUpWithDetails}
                  disabled={loading}
                  style={({ pressed }) => [
                    authStyles.loginSubmitButton,
                    { opacity: loading ? 0.6 : pressed ? 0.9 : 1 },
                  ]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={authStyles.loginSubmitText}>Create Account</Text>
                  )}
                </Pressable>
              </View>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: sh(18), gap: sw(10) }}>
                <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
                <Text style={{ fontSize: ms(13), color: Colors.textMuted }}>Or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: Colors.borderLight }} />
              </View>

              {/* Google Sign-In Button in Signup */}
              <View style={{ marginBottom: sh(16) }}>
                <Pressable
                  onPress={handleGooglePress}
                  disabled={loading}
                  style={{
                    backgroundColor: Colors.surface,
                    paddingVertical: sh(14),
                    borderRadius: sw(12),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: sw(10),
                    borderWidth: 1,
                    borderColor: '#e0e0e0',
                    opacity: loading ? 0.6 : 1,
                  }}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name="logo-google"
                        size={ms(20)}
                        color="#4285F4"
                      />
                      <Text
                        style={{
                          fontSize: ms(15),
                          fontWeight: '500',
                          color: Colors.textSecondary,
                        }}>
                        Sign in with Google
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Back Button */}
              <Pressable
                onPress={() => {
                  setAuthMode('options');
                  setName('');
                  setMobile('');
                  setEmail('');
                  setPassword('');
                  setShowPassword(false);
                }}
                disabled={loading}
                style={authStyles.loginToggleWrap}>
                <Text style={authStyles.loginToggleText}>
                  <Ionicons name="arrow-back" size={ms(14)} color={Colors.primary} /> Back to options
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Email Sign-In Mode (for existing users) */}

              {/* Email Input */}
              <View style={{ marginBottom: sh(16), marginTop: sh(16) }}>
                <Text style={authStyles.loginLabel}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.textMuted}
                  style={authStyles.loginInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: sh(20) }}>
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
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: sw(12), top: sh(12) }}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={ms(20)}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Sign In Button */}
              <View style={{ marginBottom: sh(12) }}>
                <Pressable
                  onPress={handleEmailSignIn}
                  disabled={loading}
                  style={({ pressed }) => [
                    authStyles.loginSubmitButton,
                    { opacity: loading ? 0.6 : pressed ? 0.9 : 1 },
                  ]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={authStyles.loginSubmitText}>Sign In</Text>
                  )}
                </Pressable>
              </View>

              {/* Back Button */}
              <Pressable
                onPress={() => {
                  setAuthMode('options');
                  setEmail('');
                  setPassword('');
                  setShowPassword(false);
                }}
                disabled={loading}
                style={authStyles.loginToggleWrap}>
                <Text style={authStyles.loginToggleText}>
                  <Ionicons name="arrow-back" size={ms(14)} color={Colors.primary} /> Back to options
                </Text>
              </Pressable>
            </>
          )}

          <Text
            style={[
              authStyles.loginSecureNote,
              { marginTop: sh(24) },
            ]}>
            Secure sign in. We never share your data.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
