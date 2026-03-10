import React, { useState, useEffect, useRef, useMemo } from 'react';
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

import { HeaderLogo } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { useScalers } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export function LoginScreen() {
  const scalers = useScalers();
  const { sh, sw, ms, height } = scalers;
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const { sendOtpWithDev, verifyWithDev } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.min(height * 0.32, 220);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [reqId, setReqId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const digits = mobile.replace(/\D/g, '').slice(-10);
  const canSubmitMobile = digits.length === 10;
  const canSubmitOtp = otpCode.length >= 4;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOtpTimer(60);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!canSubmitMobile) return;
    setLoading(true);
    try {
      await sendOtpWithDev(digits);
      setShowOtpInput(true);
      startTimer();
    } catch (error: any) {
      console.warn('Send OTP Error:', error);
      Alert.alert('Error', error?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!canSubmitOtp) return;
    setLoading(true);
    try {
      await verifyWithDev(name || 'User', digits, otpCode);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.warn('Verify OTP Error:', error);
      Alert.alert('Error', error?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={[authStyles.loginHeaderTitle, { fontSize: ms(14), fontWeight: '600', opacity: 0.9, marginTop: sh(4) }]}>
            Sign in to continue
          </Text>
        </View>

        {/* Form card */}
        <View style={authStyles.loginFormCard}>
          <View style={authStyles.loginLogoWrap}>
            <Image
              source={HeaderLogo}
              style={authStyles.loginLogoImage}
              resizeMode="contain"
              accessibilityLabel="Finovert"
            />
          </View>

          {/* Mobile Form */}
          <React.Fragment>
            <View style={{ marginBottom: sh(16) }}>
              <Text style={authStyles.loginLabel}>Enter your name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={Colors.textMuted}
                style={authStyles.loginInput}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={{ marginBottom: sh(16) }}>
              <Text style={authStyles.loginLabel}>Mobile number</Text>
              <TextInput
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                placeholderTextColor={Colors.textMuted}
                style={authStyles.loginInput}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
              />
            </View>
            {!showOtpInput ? (
              <React.Fragment>
                <View style={{ marginTop: sh(16) }}>
                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading || !canSubmitMobile}
                    style={({ pressed }) => [
                      authStyles.loginSubmitButton,
                      { opacity: loading || !canSubmitMobile ? 0.6 : pressed ? 0.9 : 1 },
                    ]}>
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                    ) : (
                      <Text style={authStyles.loginSubmitText}>
                        Send OTP via SMS
                      </Text>
                    )}
                  </Pressable>
                </View>
              </React.Fragment>
            ) : (
              <React.Fragment>
                {/* OTP Countdown Banner */}
                <View style={{
                  backgroundColor: otpTimer > 0 ? '#e8f5e9' : '#fce4ec',
                  borderRadius: 8,
                  paddingVertical: sh(8),
                  paddingHorizontal: sw(12),
                  marginBottom: sh(12),
                  marginTop: sh(4),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: sw(8),
                }}>
                  <Ionicons
                    name={otpTimer > 0 ? 'checkmark-circle' : 'time'}
                    size={ms(18)}
                    color={otpTimer > 0 ? '#2e7d32' : '#c62828'}
                  />
                  <Text style={{
                    fontSize: ms(13),
                    color: otpTimer > 0 ? '#2e7d32' : '#c62828',
                    fontWeight: '500',
                    flex: 1,
                  }}>
                    {otpTimer > 0
                      ? `OTP sent! Valid for ${otpTimer}s`
                      : 'OTP expired. Please go back and resend.'}
                  </Text>
                </View>

                <View style={{ marginBottom: sh(16), marginTop: sh(4) }}>
                  <Text style={authStyles.loginLabel}>Enter OTP</Text>
                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="Enter OTP"
                    placeholderTextColor={Colors.textMuted}
                    style={authStyles.loginInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />
                </View>

                <View style={{ marginTop: sh(16) }}>
                  <Pressable
                    onPress={handleVerifyOtp}
                    disabled={loading || !canSubmitOtp}
                    style={({ pressed }) => [
                      authStyles.loginSubmitButton,
                      { opacity: loading || !canSubmitOtp ? 0.6 : pressed ? 0.9 : 1 },
                    ]}>
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                    ) : (
                      <Text style={authStyles.loginSubmitText}>
                        Verify & Sign In
                      </Text>
                    )}
                  </Pressable>
                </View>

                <Pressable onPress={() => { setShowOtpInput(false); setOtpCode(''); if (timerRef.current) clearInterval(timerRef.current); setOtpTimer(60); }} style={authStyles.loginToggleWrap} disabled={loading}>
                  <Text style={authStyles.loginToggleText}>
                    Wrong number? <Text style={authStyles.loginToggleLink}>Change it</Text>
                  </Text>
                </Pressable>
              </React.Fragment>
            )}
          </React.Fragment>

          <Text style={[authStyles.loginSecureNote, { marginTop: sh(8) }]}>
            Secure sign in. We never share your data.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
