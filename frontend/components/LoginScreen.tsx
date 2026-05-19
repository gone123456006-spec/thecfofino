import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
  type KeyboardEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HeaderLogo } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { AuthLegalModal, type AuthLegalPage } from '@/components/AuthLegalModal';
import { normalizeIndianMobile, sanitizeIndianMobileInput } from '@/utils/indian-mobile';
import { useScalers } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';

const RESEND_SECONDS = 60;
const OTP_LEN = 6;
const { height: SCREEN_H } = Dimensions.get('window');

function OutlinedField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
  autoCapitalize,
  maxLength,
  styles,
  noBottomMargin,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  maxLength?: number;
  styles: ReturnType<typeof createAuthStyles>;
  noBottomMargin?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const [focused, setFocused] = useState(false);
  const localRef = useRef<TextInput>(null);
  const ref = inputRef ?? localRef;

  return (
    <View style={[styles.loginFieldWrap, noBottomMargin && { marginBottom: 0 }]}>
      <Text style={styles.loginFieldLabel}>{label}</Text>
      <View style={[styles.loginInputOutlined, focused && editable && styles.loginInputOutlinedFocused]}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          style={[styles.loginInputInner, { paddingLeft: 0 }]}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          showSoftInputOnFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

function OtpInput({
  value,
  onChange,
  editable,
  styles,
  sh,
}: {
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  styles: ReturnType<typeof createAuthStyles>;
  sh: (n: number) => number;
}) {
  const hiddenRef = useRef<TextInput>(null);
  const digits = value.padEnd(OTP_LEN, ' ').slice(0, OTP_LEN).split('');

  return (
    <View style={{ marginBottom: sh(4) }}>
      <Pressable onPress={() => editable && hiddenRef.current?.focus()} style={styles.loginOtpRow}>
        {digits.map((d, i) => (
          <View key={i} style={[styles.loginOtpBox, d.trim() !== '' && styles.loginOtpBoxFilled]}>
            <Text style={styles.loginOtpBoxText}>{d.trim()}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={hiddenRef}
        value={value}
        onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, OTP_LEN))}
        keyboardType="number-pad"
        maxLength={OTP_LEN}
        editable={editable}
        showSoftInputOnFocus
        style={styles.loginOtpHiddenInput}
        caretHidden
      />
    </View>
  );
}

function NextButton({
  label,
  onPress,
  disabled,
  loading,
  styles,
  buttonStyle,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  styles: ReturnType<typeof createAuthStyles>;
  buttonStyle?: object;
}) {
  const off = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.loginPrimaryButton,
        buttonStyle,
        off && styles.loginPrimaryButtonDisabled,
        pressed && !off && { opacity: 0.9 },
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors.textOnPrimary} size="small" />
      ) : (
        <Text style={[styles.loginPrimaryButtonText, off && styles.loginPrimaryButtonTextDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function LoginScreen() {
  const scalers = useScalers();
  const { sh } = scalers;
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const { sendEmailOtp, verifyEmailOtpCode, completeEmailLogin } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const emailInputRef = useRef<TextInput>(null);
  const [legalPage, setLegalPage] = useState<AuthLegalPage | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardOpen = keyboardHeight > 0;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    };
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const validateGmail = useCallback((value: string) => {
    return /@(gmail|googlemail)\.com$/i.test(value.toLowerCase().trim());
  }, []);

  const backFromProfile = useCallback(() => {
    setEmailVerified(false);
    setName('');
    setMobile('');
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!email.trim() || !validateGmail(email)) {
      Alert.alert('Enter Gmail', 'Use a valid @gmail.com address');
      return;
    }
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setOtpSent(true);
      setOtp('');
      setResendIn(RESEND_SECONDS);
    } catch (error: unknown) {
      Alert.alert('Could not send code', error instanceof Error ? error.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }, [email, validateGmail, sendEmailOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== OTP_LEN) return;
    setLoading(true);
    try {
      const result = await verifyEmailOtpCode(email, otp);
      if (result.profileComplete) {
        setOtpSent(false);
        setOtp('');
        setEmailVerified(false);
        setVerificationToken('');
        return;
      }
      setVerificationToken(result.verificationToken);
      setEmailVerified(true);
    } catch (error: unknown) {
      Alert.alert('Wrong code', error instanceof Error ? error.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }, [email, otp, verifyEmailOtpCode]);

  const handleMobileChange = useCallback((text: string) => {
    setMobile(sanitizeIndianMobileInput(text));
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter your full name');
      return;
    }
    const mobileDigits = normalizeIndianMobile(mobile);
    if (!mobileDigits) {
      Alert.alert(
        'Invalid mobile',
        'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).',
      );
      return;
    }
    setLoading(true);
    try {
      await completeEmailLogin(email, verificationToken, name.trim(), mobileDigits);
    } catch (error: unknown) {
      Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }, [email, verificationToken, name, mobile, completeEmailLogin]);

  const sheetMinHeight = SCREEN_H * 0.72;

  const heading = emailVerified ? 'Create your profile' : otpSent ? "Verify it's you" : 'Sign in';
  const subheading = emailVerified
    ? 'to continue to Finovert'
    : otpSent
      ? 'Enter the code from your email'
      : 'to continue to Finovert';

  const formBody = (
    <>
      {!keyboardOpen &&
        (emailVerified ? (
          <View style={authStyles.loginTopBar}>
            <Pressable
              onPress={backFromProfile}
              disabled={loading}
              style={authStyles.loginBackButtonTop}
              accessibilityLabel="Go back"
              hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </Pressable>
            <View style={authStyles.loginLogoWrapInBar}>
              <Image source={HeaderLogo} style={authStyles.loginLogoImage} resizeMode="contain" accessibilityLabel="Finovert" />
            </View>
          </View>
        ) : (
          <View style={authStyles.loginLogoWrap}>
            <Image source={HeaderLogo} style={authStyles.loginLogoImage} resizeMode="contain" accessibilityLabel="Finovert" />
          </View>
        ))}

      <Text style={authStyles.loginGoogleTitle}>{heading}</Text>
      <Text style={[authStyles.loginGoogleSubtitle, keyboardOpen && authStyles.loginGoogleSubtitleCompact]}>
        {subheading}
      </Text>

      <View style={authStyles.loginFormBlock}>
              {!emailVerified ? (
                otpSent ? (
                  <>
                    <Text style={authStyles.loginFieldLabel}>Enter code</Text>
                    <OtpInput value={otp} onChange={setOtp} editable={!loading} styles={authStyles} sh={sh} />

                    <View style={authStyles.loginOtpActionsRow}>
                      <Pressable
                        onPress={handleSendOtp}
                        disabled={loading || resendIn > 0}
                        style={authStyles.loginTextButton}>
                        <Text style={[authStyles.loginTextButtonLabel, resendIn > 0 && { opacity: 0.5 }]}>
                          {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setOtpSent(false);
                          setOtp('');
                          setResendIn(0);
                        }}
                        style={authStyles.loginTextButton}>
                        <Text style={authStyles.loginTextButtonLabel}>Forgot email?</Text>
                      </Pressable>
                    </View>

                    <NextButton
                      label="Next"
                      onPress={handleVerifyOtp}
                      disabled={otp.length !== OTP_LEN}
                      loading={loading}
                      styles={authStyles}
                    />
                  </>
                ) : (
                  <View style={authStyles.loginFieldButtonGroup}>
                    <OutlinedField
                      label="Email or phone"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your Gmail"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                      styles={authStyles}
                      noBottomMargin
                      inputRef={emailInputRef}
                    />
                    <NextButton
                      label="Next"
                      onPress={handleSendOtp}
                      loading={loading}
                      styles={authStyles}
                      buttonStyle={{ marginTop: sh(16) }}
                    />
                  </View>
                )
              ) : (
                <>
                  <OutlinedField
                    label="Full name"
                    value={name}
                    onChangeText={setName}
                    placeholder="First and last name"
                    autoCapitalize="words"
                    editable={!loading}
                    styles={authStyles}
                  />
                  <OutlinedField
                    label="Mobile number"
                    value={mobile}
                    onChangeText={handleMobileChange}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!loading}
                    styles={authStyles}
                  />

                  <NextButton label="Next" onPress={handleSignIn} loading={loading} styles={authStyles} />
                </>
              )}
      </View>

      {!keyboardOpen && (
        <View style={authStyles.loginFooterLinks}>
          <Text style={authStyles.loginFooterLink}>English (US)</Text>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setLegalPage('help');
            }}
            hitSlop={8}>
            <Text style={authStyles.loginFooterLink}>Help</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setLegalPage('privacy');
            }}
            hitSlop={8}>
            <Text style={authStyles.loginFooterLink}>Privacy</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setLegalPage('terms');
            }}
            hitSlop={8}>
            <Text style={authStyles.loginFooterLink}>Terms</Text>
          </Pressable>
        </View>
      )}
    </>
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <Pressable style={authStyles.loginPage} onPress={dismissKeyboard}>
      <AuthLegalModal page={legalPage} onClose={() => setLegalPage(null)} />
      <StatusBar style="light" backgroundColor={Colors.gradientDark} />

      <View
        style={[
          authStyles.loginSheet,
          keyboardOpen
            ? [
                authStyles.loginSheetAboveKeyboard,
                {
                  bottom: keyboardHeight,
                  paddingBottom: sh(16),
                },
              ]
            : {
                minHeight: sheetMinHeight,
                paddingBottom: insets.bottom + sh(16),
              },
        ]}>
        <ScrollView
          contentContainerStyle={authStyles.loginSheetInner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {formBody}
        </ScrollView>
      </View>
    </Pressable>
  );
}
