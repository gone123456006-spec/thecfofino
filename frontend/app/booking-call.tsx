import { Ionicons } from '@expo/vector-icons';
import { submitBookingToBackend } from '@/api/booking';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Colors } from '@/constants/theme';
import { bookingStyles } from '@/styles/booking.styles';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export default function BookingCallScreen() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [purpose, setPurpose] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Green tick animation when booking succeeds
  const tickScale = useSharedValue(0);
  const tickOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (!success) {
      tickScale.value = 0;
      tickOpacity.value = 0;
      ringScale.value = 0.5;
      ringOpacity.value = 0.6;
      return;
    }
    ringScale.value = withSequence(
      withSpring(1.2, { damping: 12, stiffness: 120 }),
      withSpring(1, { damping: 14 })
    );
    ringOpacity.value = withSequence(
      withTiming(0.4, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 }))
    );
    tickScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 140 }));
    tickOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));
  }, [success]);

  const tickAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tickScale.value }],
    opacity: tickOpacity.value,
  }));
  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  // Auto-fill from profile
  useEffect(() => {
    if (user) {
      setName(user.name);
      setMobile(user.mobile);
    }
  }, [user]);

  const handleBookCall = useCallback(async () => {
    setError('');
    setSuccess('');
    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    const trimmedPurpose = purpose.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (!trimmedMobile) {
      setError('Please enter your mobile number.');
      return;
    }
    setLoading(true);
    try {
      await submitBookingToBackend({
        name: trimmedName,
        mobile: trimmedMobile,
        purpose: trimmedPurpose || 'General enquiry',
        details: details.trim(),
      });
      setSuccess('Your call has been booked. A confirmation will be sent to your mobile and shown in notifications.');
      setPurpose('');
      setDetails('');

      addNotification({
        title: 'Call booked',
        body: 'Your call has been booked. We will contact you shortly. A confirmation message has been sent to your mobile.',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to book call. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [name, mobile, purpose, details]);

  return (
    <KeyboardAvoidingView
      style={bookingStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        style={bookingStyles.container}
        contentContainerStyle={bookingStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={bookingStyles.title}>Book Your Call</Text>
        <Text style={bookingStyles.subtitle}>
          Fill in the details below. Name and mobile are pre-filled from your profile.
        </Text>

        <Text style={bookingStyles.label}>Name</Text>
        <TextInput
          style={bookingStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          editable={!loading}
        />

        <Text style={bookingStyles.label}>Mobile</Text>
        <TextInput
          style={bookingStyles.input}
          value={mobile}
          onChangeText={setMobile}
          placeholder="10-digit mobile number"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          editable={!loading}
        />

        <Text style={bookingStyles.label}>Purpose of call</Text>
        <TextInput
          style={bookingStyles.input}
          value={purpose}
          onChangeText={setPurpose}
          placeholder="e.g. GST filing, Tax consultation, Compliance"
          placeholderTextColor={Colors.textMuted}
          editable={!loading}
        />

        <Text style={bookingStyles.label}>Other details (optional)</Text>
        <TextInput
          style={[bookingStyles.input, bookingStyles.inputMultiline]}
          value={details}
          onChangeText={setDetails}
          placeholder="Any specific questions or preferred time..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          editable={!loading}
        />

        {error ? <Text style={bookingStyles.error}>{error}</Text> : null}
        {success ? (
          <View style={bookingStyles.successWrap}>
            <Animated.View style={[bookingStyles.tickRing, ringAnimatedStyle]} />
            <Animated.View style={[bookingStyles.tickIconWrap, tickAnimatedStyle]}>
              <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
            </Animated.View>
            <Text style={bookingStyles.success}>Your call has been booked and is now in the dashboard.</Text>
            <Text style={bookingStyles.successSub}>We will contact you shortly.</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleBookCall}
          disabled={loading}
          style={[bookingStyles.button, loading && bookingStyles.buttonDisabled]}>
          {loading ? (
            <ActivityIndicator color={Colors.textOnPrimary} />
          ) : (
            <Text style={bookingStyles.buttonText}>Book Call</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
