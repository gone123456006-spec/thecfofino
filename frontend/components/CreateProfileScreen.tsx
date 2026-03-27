import React, { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { authStyles as createAuthStyles } from '@/styles/auth.styles';
import { useScalers } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';

export function CreateProfileScreen() {
  const scalers = useScalers();
  const { sh, sw, ms } = scalers;
  const authStyles = useMemo(() => createAuthStyles(scalers), [scalers]);
  const { updateProfile, user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.mobile ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), mobile: digits });
      // _layout will automatically navigate to tabs once user has name + mobile
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, phone, updateProfile]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.gradientDark }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + sh(40) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + sh(32),
            paddingBottom: sh(36),
            paddingHorizontal: sw(24),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {/* Avatar circle */}
          <View
            style={{
              width: sw(80),
              height: sw(80),
              borderRadius: sw(40),
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: sh(16),
            }}>
            <Ionicons name="person" size={ms(38)} color="#fff" />
          </View>

          <Text
            style={{
              fontSize: ms(26),
              fontWeight: '800',
              color: '#fff',
              letterSpacing: -0.5,
              textAlign: 'center',
            }}>
            Create Your Profile
          </Text>
          <Text
            style={{
              fontSize: ms(14),
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              marginTop: sh(8),
              lineHeight: ms(20),
            }}>
            Just a bit more info and you're all set
          </Text>
        </View>

        {/* Form Card */}
        <View
          style={[
            authStyles.loginFormCard,
            { paddingTop: sh(32) },
          ]}>

          {/* Name Field */}
          <View style={{ marginBottom: sh(18) }}>
            <Text style={authStyles.loginLabel}>
              Full Name <Text style={{ color: '#FF3B30' }}>*</Text>
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textMuted}
                style={[authStyles.loginInput, { paddingLeft: sw(44) }]}
                autoCapitalize="words"
                editable={!loading}
              />
              <Ionicons
                name="person-outline"
                size={ms(18)}
                color={Colors.textMuted}
                style={{ position: 'absolute', left: sw(14), top: sh(14) }}
              />
            </View>
          </View>

          {/* Phone Number Field */}
          <View style={{ marginBottom: sh(32) }}>
            <Text style={authStyles.loginLabel}>
              Phone Number <Text style={{ color: '#FF3B30' }}>*</Text>
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.textMuted}
                style={[authStyles.loginInput, { paddingLeft: sw(44) }]}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
              />
              <Ionicons
                name="call-outline"
                size={ms(18)}
                color={Colors.textMuted}
                style={{ position: 'absolute', left: sw(14), top: sh(14) }}
              />
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [
              authStyles.loginSubmitButton,
              { opacity: loading ? 0.65 : pressed ? 0.85 : 1 },
            ]}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Text style={authStyles.loginSubmitText}>Continue</Text>
            )}
          </Pressable>

          {/* Sign out link */}
          <Pressable
            onPress={logout}
            disabled={loading}
            style={{ marginTop: sh(24), alignItems: 'center', paddingVertical: sh(10) }}>
            <Text style={{ fontSize: ms(14), color: Colors.textMuted }}>
              Sign out and use a different account
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
