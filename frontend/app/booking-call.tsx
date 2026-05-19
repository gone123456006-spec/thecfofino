import { Ionicons } from '@expo/vector-icons';
import { submitBookingToBackend } from '@/api/booking';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { bookingStyles as s } from '@/styles/booking.styles';
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

const PURPOSE_CHIPS = [
  'Company registration',
  'GST & compliance',
  'Tax consultation',
  'Accounting',
  'General enquiry',
] as const;

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
      withSpring(1, { damping: 14 }),
    );
    ringOpacity.value = withSequence(
      withTiming(0.4, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 })),
    );
    tickScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 140 }));
    tickOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));
  }, [success, ringOpacity, ringScale, tickOpacity, tickScale]);

  const tickAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tickScale.value }],
    opacity: tickOpacity.value,
  }));
  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

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
      setSuccess('booked');
      setPurpose('');
      setDetails('');

      addNotification({
        title: 'Call booked',
        body: 'Your call has been booked. We will contact you shortly on your mobile.',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to book call. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [name, mobile, purpose, details, addNotification]);

  const booked = Boolean(success);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={s.heroRow}>
          <View style={s.heroIconWrap}>
            <Ionicons name="call-outline" size={26} color="#1a73e8" />
          </View>
          <View style={s.heroText}>
            <Text style={s.title}>Book a call</Text>
            <Text style={s.subtitle}>
              Schedule a free consultation with our team. We will call you on the number below.
            </Text>
          </View>
        </View>

        {!booked ? (
          <>
            <View style={s.infoBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#1967d2" />
              <Text style={s.infoBannerText}>
                Name and mobile are filled from your profile. You can edit them before booking.
              </Text>
            </View>

            <View style={s.googleCard}>
              <Text style={s.sectionLabel}>CONTACT</Text>
              <View style={s.listRow}>
                <View style={s.listIconWrap}>
                  <Ionicons name="person-outline" size={20} color="#1a73e8" />
                </View>
                <View style={s.listBody}>
                  <Text style={s.listTitle}>Your name</Text>
                  <TextInput
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full name"
                    placeholderTextColor="#80868b"
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>
              <View style={s.dividerInset} />
              <View style={s.listRow}>
                <View style={s.listIconWrap}>
                  <Ionicons name="call-outline" size={20} color="#1a73e8" />
                </View>
                <View style={s.listBody}>
                  <Text style={s.listTitle}>Mobile number</Text>
                  <TextInput
                    style={s.input}
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="10-digit mobile"
                    placeholderTextColor="#80868b"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={s.divider} />
              <Text style={s.sectionLabel}>ABOUT YOUR CALL</Text>
              <View style={s.chipRow}>
                {PURPOSE_CHIPS.map((chip) => {
                  const selected = purpose === chip;
                  return (
                    <Pressable
                      key={chip}
                      style={[s.chip, selected && s.chipSelected]}
                      onPress={() => setPurpose(chip)}
                      disabled={loading}>
                      <Text style={[s.chipText, selected && s.chipTextSelected]}>{chip}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Purpose</Text>
                <TextInput
                  style={s.input}
                  value={purpose}
                  onChangeText={setPurpose}
                  placeholder="What would you like to discuss?"
                  placeholderTextColor="#80868b"
                  editable={!loading}
                />
              </View>
              <View style={s.dividerInset} />
              <View style={s.fieldBlock}>
                <Text style={s.fieldLabel}>Additional details (optional)</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Preferred time, questions, or context…"
                  placeholderTextColor="#80868b"
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>
            </View>

            {error ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color="#c5221f" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleBookCall}
              disabled={loading}
              style={({ pressed }) => [
                s.primaryBtn,
                loading && s.primaryBtnDisabled,
                pressed && !loading && s.primaryBtnPressed,
              ]}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.primaryBtnText}>Request call</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={s.successCard}>
              <Animated.View style={[s.tickRing, ringAnimatedStyle]} />
              <Animated.View style={[s.tickIconWrap, tickAnimatedStyle]}>
                <Ionicons name="checkmark-circle" size={72} color="#188038" />
              </Animated.View>
              <Text style={s.successTitle}>Call requested</Text>
              <Text style={s.successSub}>
                Your request is saved. We will call you on {mobile.trim() || 'your mobile'} shortly.
                A confirmation also appears in Notifications.
              </Text>
            </View>
            <View style={s.googleCard}>
              <View style={s.listRow}>
                <View style={[s.listIconWrap, s.listIconWrapGreen]}>
                  <Ionicons name="calendar-outline" size={20} color="#188038" />
                </View>
                <View style={s.listBody}>
                  <Text style={s.listTitle}>Status</Text>
                  <Text style={s.listSub}>Pending — our team will reach out soon</Text>
                </View>
              </View>
              <View style={s.dividerInset} />
              <View style={s.listRow}>
                <View style={s.listIconWrap}>
                  <Ionicons name="person-outline" size={20} color="#1a73e8" />
                </View>
                <View style={s.listBody}>
                  <Text style={s.listTitle}>{name.trim() || '—'}</Text>
                  <Text style={s.listSub}>{mobile.trim() || '—'}</Text>
                </View>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [s.secondaryBtn, pressed && s.primaryBtnPressed]}
              onPress={() => {
                setSuccess('');
                setError('');
              }}>
              <Text style={s.secondaryBtnText}>Book another call</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
