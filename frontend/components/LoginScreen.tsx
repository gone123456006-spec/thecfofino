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
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';

import { HeaderLogo } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { useScalers } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

let GoogleSignin: any = null;
let isNativeGoogleSignInAvailable = false;
let googleStatusCodes: any = null;

try {
  // Expo Go can't use this native module reliably; use AuthSession there.
  if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
    const gs = require('@react-native-google-signin/google-signin');
    GoogleSignin = gs.GoogleSignin;
    googleStatusCodes = gs.statusCodes;
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    });
    isNativeGoogleSignInAvailable = true;
  }
} catch (error) {
  isNativeGoogleSignInAvailable = false;
}

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const scalers = useScalers();
  const { sh, sw, ms, height } = scalers;
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.min(height * 0.30, 200);

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
  const isExpoGo = Constants.appOwnership === 'expo';

  // Use Auth Code + PKCE (Google policy compliant).
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const redirectUri =
    Platform.OS === 'web'
      ? makeRedirectUri({ scheme: 'finovert' })
      : 'https://auth.expo.io/@shyamhero/finovert';

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: webClientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { prompt: 'select_account' },
    },
    discovery,
  );

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

  const openWebGoogleAuth = useCallback(async () => {
    if (!webClientId || !webClientId.trim()) {
      Alert.alert('Google Sign-In not configured', 'Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB in frontend/.env');
      return;
    }
    if (!googleRequest) {
      Alert.alert('Error', 'Google sign-in is not ready yet. Please try again.');
      return;
    }
    const result = await googlePromptAsync();
    if (result.type !== 'success') return;
  }, [webClientId, googleRequest, googlePromptAsync]);

  const handleGooglePress = useCallback(async () => {
    setLoading(true);
    try {
      if (!isExpoGo && Platform.OS !== 'web' && isNativeGoogleSignInAvailable) {
        // Native Google Sign-In
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        
        if (tokens.idToken) {
          await handleGoogleSignIn(tokens.idToken);
        } else {
          Alert.alert('Error', 'Missing ID token from Google Sign In');
        }
      } else {
        await openWebGoogleAuth();
      }
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        // user cancelled the login flow
      } else if (error.code === 'IN_PROGRESS') {
        // operation (e.g. sign in) is in progress already
      } else if (googleStatusCodes && error.code === googleStatusCodes.DEVELOPER_ERROR) {
        // Wrong native client setup; fall back instead of hard-failing user login.
        await openWebGoogleAuth();
      } else {
        Alert.alert('Error', error?.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  }, [handleGoogleSignIn, isExpoGo, openWebGoogleAuth]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!googleResponse || googleResponse.type !== 'success') return;
      const code = googleResponse.params?.code;
      if (!code || !discovery) {
        Alert.alert('Error', 'Google sign-in failed (missing auth code).');
        return;
      }
      try {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: webClientId || '',
            code,
            redirectUri,
            extraParams: {
              code_verifier: googleRequest?.codeVerifier || '',
            },
          },
          discovery,
        );
        if (cancelled) return;
        if (tokenRes.idToken) {
          await handleGoogleSignIn(tokenRes.idToken);
        } else {
          Alert.alert('Error', 'Google sign-in failed (missing ID token).');
        }
      } catch (e: any) {
        if (cancelled) return;
        Alert.alert('Error', e?.message || 'Google sign-in failed.');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [googleResponse, discovery, webClientId, redirectUri, googleRequest?.codeVerifier, handleGoogleSignIn]);

  // ── Email sign-in / sign-up (Gmail + password) ────────────────────────────
  const handleEmailAuth = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    const normEmail = email.toLowerCase().trim();
    const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
    if (!gmailOk) {
      Alert.alert('Error', 'Use a Gmail address (@gmail.com)');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) {
        Alert.alert('Error', 'Enter a valid 10-digit mobile number');
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signupWithEmail(name, mobile, email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      Alert.alert(
        mode === 'signup' ? 'Sign-up failed' : 'Sign-in failed',
        error?.message || (mode === 'signup' ? 'Could not create account' : 'Failed to sign in'),
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, name, mobile, loginWithEmail, signupWithEmail]);

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
            {mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
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

          {mode === 'signup' ? (
            <>
              <View style={{ marginBottom: sh(14) }}>
                <Text style={authStyles.loginLabel}>Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                  style={authStyles.loginInput}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
              <View style={{ marginBottom: sh(14) }}>
                <Text style={authStyles.loginLabel}>Mobile number</Text>
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="10-digit mobile"
                  placeholderTextColor={Colors.textMuted}
                  style={authStyles.loginInput}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </>
          ) : null}

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

          {/* Sign In / Sign up */}
          <Pressable
            onPress={handleEmailAuth}
            disabled={loading}
            style={({ pressed }) => [
              authStyles.loginSubmitButton,
              { opacity: loading ? 0.65 : pressed ? 0.85 : 1 },
            ]}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Text style={authStyles.loginSubmitText}>
                {mode === 'signup' ? 'Create account' : 'Sign In'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMode(m => (m === 'signin' ? 'signup' : 'signin'))}
            disabled={loading}
            style={{ marginTop: sh(14), alignSelf: 'center' }}>
            <Text style={{ fontSize: ms(14), color: Colors.primary, fontWeight: '600' }}>
              {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </Text>
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
