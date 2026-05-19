import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import {
  segmentLabels,
  services,
  tools,
  type Segment,
  type ServiceId,
  type ServiceItem,
  type ToolItem,
} from '../../data/home.data';
import { NavbarLogo } from '@/constants/assets';
import { useNotifications } from '@/contexts/NotificationsContext';
import { createHomeStyles } from '../../styles/home.styles';
import { useScalers } from '@/utils/responsive';
import { fetchMyRegistrations, type MyRegistrationItem } from '@/api/company-registration';
import { useAuth } from '@/contexts/AuthContext';
import {
  type CompanyRegistrationStatus,
  loadCompanyRegistrationState,
} from '@/utils/company-registration-draft';
import {
  effectiveRegistrationStatus,
  isRegistrationTrackingEnded,
  registrationStatusLabel,
} from '@/utils/company-registration-status';

type StatusChipTone = 'progress' | 'success' | 'neutral' | 'warning' | 'error';

function registrationStatusTone(reg: MyRegistrationItem): StatusChipTone {
  const key = effectiveRegistrationStatus(reg);
  if (key === 'completed' || key === 'approved') return 'success';
  if (key === 'rejected') return 'error';
  if (key === 'pending' || key === 'submitted' || key === 'draft') return 'warning';
  return 'progress';
}
import { useSyncRegistrationAutoNotifications } from '@/hooks/useSyncRegistrationAutoNotifications';
import { UpdateAvailableBanner } from '@/components/UpdateAvailableBanner';
import {
  clearRegistrationsCache,
  getCachedRegistrations,
  registrationsCacheUserKey,
  setCachedRegistrations,
} from '@/utils/registrations-cache';
import { preloadServiceImages } from '@/utils/preload-service-images';

const HERO_IMAGES = [
  require('../../assets/images/hero-1.png'),
  require('../../assets/images/hero-2.png'),
  require('../../assets/images/hero-3.png'),
  require('../../assets/images/hero-4.png'),
];

const SERVICE_IMAGE_SCALE: Record<ServiceId, number> = {
  'gst-filing': 3.05,
  'company-registration': 2.25,
  'itr-filing': 1.9,
  'tds-filing': 1.65,
  'cfo-services': 1.9,
  'invoice-financing': 1.75,
};


export default function HomeScreen() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { getToken, user, sessionGeneration } = useAuth();
  const scalers = useScalers();
  const { sw, sh } = scalers;
  const insets = useSafeAreaInsets();
  const [activeSegment, setActiveSegment] = useState<Segment>('Overview');
  const [registrationStatus, setRegistrationStatus] =
    useState<CompanyRegistrationStatus>('not_started');
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [serverPaymentStatus, setServerPaymentStatus] = useState<string | null>(null);
  const regUserKey = registrationsCacheUserKey(user);
  const [myRegistrations, setMyRegistrations] = useState<MyRegistrationItem[]>(() =>
    getCachedRegistrations(regUserKey),
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const heroScrollRef = useRef<ScrollView>(null);
  const { styles, sizes, width } = useMemo(
    () => createHomeStyles(scalers),
    [scalers],
  );
  const heroLeftWidth = sizes.heroLeftWidth ?? width * 0.58;

  const renderStatusIndicator = (label: string, tone: StatusChipTone) => {
    const dotStyle =
      tone === 'success'
        ? styles.statusDotSuccess
        : tone === 'warning'
          ? styles.statusDotWarning
          : tone === 'error'
            ? styles.statusDotError
            : tone === 'neutral'
              ? null
              : styles.statusDotActive;
    const textStyle =
      tone === 'success'
        ? styles.statusIndicatorTextSuccess
        : tone === 'warning'
          ? styles.statusIndicatorTextWarning
          : tone === 'error'
            ? styles.statusIndicatorTextError
            : tone === 'neutral'
              ? styles.statusIndicatorTextMuted
              : styles.statusIndicatorText;
    return (
      <View style={styles.statusIndicatorRow}>
        <View style={[styles.statusDot, dotStyle]} />
        <Text style={[styles.statusIndicatorText, textStyle]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    void preloadServiceImages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void preloadServiceImages();
    }, []),
  );

  // Auto-advance hero carousel every 3.5s
  useEffect(() => {
    const id = setInterval(() => {
      setHeroIndex((i) => {
        const next = (i + 1) % HERO_IMAGES.length;
        heroScrollRef.current?.scrollTo({ x: next * heroLeftWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, [heroLeftWidth]);

  const refreshRegistration = useCallback(
    async (silent = false) => {
      const userKey = registrationsCacheUserKey(user);
      const state = await loadCompanyRegistrationState();
      let nextStatus: CompanyRegistrationStatus = state.status;

      try {
        const token = await getToken();
        if (token) {
          const list = await fetchMyRegistrations(token);
          setMyRegistrations(list);
          setCachedRegistrations(userKey, list);
          const latest = list[0];
          if (latest?.status) setServerStatus(latest.status);
          if (latest?.paymentStatus) setServerPaymentStatus(latest.paymentStatus);

          const paid = latest?.paymentStatus === 'paid';
          const hasLocalDraft = Boolean(state.draft);
          if (paid && !hasLocalDraft && (state.status === 'not_started' || state.status === 'draft')) {
            nextStatus = 'paid';
          }
        } else if (!silent) {
          setMyRegistrations([]);
          setServerStatus(null);
          setServerPaymentStatus(null);
        }
      } catch {
        /* keep last cached list on screen */
      }

      setRegistrationStatus(nextStatus);
    },
    [getToken, user?.email, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      const userKey = registrationsCacheUserKey(user);
      const cached = getCachedRegistrations(userKey);
      if (cached.length > 0) {
        setMyRegistrations(cached);
        const latest = cached[0];
        if (latest?.status) setServerStatus(latest.status);
        if (latest?.paymentStatus) setServerPaymentStatus(latest.paymentStatus);
      }
      void refreshRegistration(true);
    }, [refreshRegistration, user?.id, user?.email]),
  );

  useEffect(() => {
    clearRegistrationsCache();
    const userKey = registrationsCacheUserKey(user);
    setMyRegistrations(getCachedRegistrations(userKey));
    setServerStatus(null);
    setServerPaymentStatus(null);
    setRegistrationStatus('not_started');
    void refreshRegistration(true);
  }, [sessionGeneration, user?.email, refreshRegistration]);

  const syncRegistrationAutoNotifications = useSyncRegistrationAutoNotifications();
  useEffect(() => {
    syncRegistrationAutoNotifications(myRegistrations);
  }, [myRegistrations, syncRegistrationAutoNotifications]);

  const { activeHomeRegs, endedHomeRegs } = useMemo(() => {
    const sorted = [...myRegistrations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      activeHomeRegs: sorted.filter((r) => !isRegistrationTrackingEnded(r)),
      endedHomeRegs: sorted.filter((r) => isRegistrationTrackingEnded(r)),
    };
  }, [myRegistrations]);

  const paymentTransactions = useMemo(() => {
    return [...myRegistrations]
      .filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'partial')
      .sort((a, b) => {
        const ta = a.paidAt
          ? new Date(a.paidAt).getTime()
          : new Date(a.updatedAt || a.createdAt).getTime();
        const tb = b.paidAt
          ? new Date(b.paidAt).getTime()
          : new Date(b.updatedAt || b.createdAt).getTime();
        return tb - ta;
      });
  }, [myRegistrations]);

  const getRegistrationStatusLabel = () => {
    if (serverStatus) {
      const key = serverStatus.toLowerCase();
      const labels: Record<string, string> = {
        pending: 'Submitted — pending review',
        submitted: 'Application submitted',
        initiated: 'Process initiated',
        filed: 'Filed with MCA',
        approved: 'Approved',
        in_progress: 'In progress',
        documents_verified: 'Documents verified',
        completed: 'Completed',
        rejected: 'Rejected',
      };
      if (labels[key]) {
        if (serverPaymentStatus === 'paid' && (key === 'pending' || key === 'submitted')) {
          return `${labels[key]} · payment received`;
        }
        return labels[key];
      }
    }
    switch (registrationStatus) {
      case 'draft':
        return 'Draft saved';
      case 'submitted':
      case 'payment_pending':
        return 'Submitted - payment pending';
      case 'paid':
        return 'Payment completed';
      case 'upload_in_progress':
        return 'Upload & filing in progress';
      case 'completed':
        return 'Completed';
      default:
        return 'Not started';
    }
  };

  const openRegistrationFlow = () => {
    if (registrationStatus === 'not_started') {
      router.push('/company-registration');
      return;
    }
    if (registrationStatus === 'draft') {
      router.push('/company-registration-form');
      return;
    }
    if (registrationStatus === 'submitted' || registrationStatus === 'payment_pending') {
      router.push('/company-registration-review-paywall');
      return;
    }
    const firstActive = myRegistrations.find((r) => !isRegistrationTrackingEnded(r));
    if (firstActive) {
      router.push(`/company-registration-tracking/${firstActive._id}` as any);
      return;
    }
    router.push('/company-registration-upload-tracking');
  };

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / heroLeftWidth);
    if (index >= 0 && index < HERO_IMAGES.length) setHeroIndex(index);
  };

  // Topics: heading (100% visible) + floating icons animation
  const topicsHeadingOpacity = useSharedValue(1);
  const topicsHeadingTranslateY = useSharedValue(0);
  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);
  const float3 = useSharedValue(0);
  const float4 = useSharedValue(0);
  useEffect(() => {
    const loop = (dur: number) =>
      withRepeat(
        withSequence(withTiming(1, { duration: dur }), withTiming(0, { duration: dur })),
        -1,
        true,
      );
    float1.value = loop(2500);
    float2.value = loop(2800);
    float3.value = loop(2400);
    float4.value = loop(2600);
  }, []);

  const topicsHeadingStyle = useAnimatedStyle(() => ({
    opacity: topicsHeadingOpacity.value,
    transform: [{ translateY: topicsHeadingTranslateY.value }],
  }));

  // Constrained float (±6px) so icons don't overlap or overflow
  const floatStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float1.value, [0, 1], [-6, 6]) },
      { scale: interpolate(float1.value, [0, 0.5, 1], [0.96, 1.04, 0.96]) },
    ],
    opacity: interpolate(float1.value, [0, 1], [0.35, 0.55]),
  }));
  const floatStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float2.value, [0, 1], [6, -6]) },
      { scale: interpolate(float2.value, [0, 0.5, 1], [0.96, 1.04, 0.96]) },
    ],
    opacity: interpolate(float2.value, [0, 1], [0.32, 0.52]),
  }));
  const floatStyle3 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float3.value, [0, 1], [-6, 6]) },
      { scale: interpolate(float3.value, [0, 0.5, 1], [0.96, 1.04, 0.96]) },
    ],
    opacity: interpolate(float3.value, [0, 1], [0.33, 0.54]),
  }));
  const floatStyle4 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float4.value, [0, 1], [6, -6]) },
      { scale: interpolate(float4.value, [0, 0.5, 1], [0.96, 1.04, 0.96]) },
    ],
    opacity: interpolate(float4.value, [0, 1], [0.32, 0.52]),
  }));

  // Call icon: gentle pulse like "calling"
  const callIconScale = useSharedValue(1);
  useEffect(() => {
    callIconScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, []);
  const callIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: callIconScale.value }],
  }));

  // "Virtual" AI-style subtle pulse (black text)
  const virtualPulse = useSharedValue(1);
  useEffect(() => {
    virtualPulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      true,
    );
  }, []);
  const virtualEffectStyle = useAnimatedStyle(() => ({
    opacity: interpolate(virtualPulse.value, [1, 1.03], [1, 0.88]),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.fullScreenContainer}>

        {/* ── Navbar (with bg) ────────────────────────────────────────────── */}
        <View style={[styles.headerWrap, { paddingTop: insets.top + sh(0) }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLogoWrap}>
              <Image
                source={NavbarLogo}
                style={[styles.headerLogo, { backgroundColor: 'transparent' }]}
                resizeMode="contain"
                accessibilityLabel="Finovert"
              />
            </View>
            <View style={styles.headerSpacer} />
            <Pressable
              style={styles.notificationBtn}
              accessibilityLabel="Notifications"
              onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={sizes.notificationIcon} color={Colors.textPrimary} />
              {unreadCount > 0 ? (
                <View style={localStyles.badge}>
                  <Text style={localStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}>

          <UpdateAvailableBanner />

          {/* ── Topics (below navbar & Your Virtual CFO) ─────────────────── */}
          <View style={styles.topicsSection}>
            <View style={styles.topicsBgWrap} pointerEvents="none">
              <Animated.View style={[styles.topicsFloatingIcon, { top: -2, left: 12 }, floatStyle1]}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color="#000000" />
              </Animated.View>
              <Animated.View style={[styles.topicsFloatingIcon, { top: 30, left: 28 }, floatStyle3]}>
                <MaterialCommunityIcons name="currency-inr" size={20} color="#000000" />
              </Animated.View>
              <Animated.View style={[styles.topicsFloatingIcon, { top: 14, right: 16 }, floatStyle2]}>
                <MaterialCommunityIcons name="chart-line-variant" size={22} color="#000000" />
              </Animated.View>
              <Animated.View style={[styles.topicsFloatingIcon, { top: 32, right: 18 }, floatStyle4]}>
                <MaterialCommunityIcons name="wallet-outline" size={20} color="#000000" />
              </Animated.View>
            </View>
            <Animated.View style={[styles.topicsHeadingWrap, topicsHeadingStyle]}>
              <Text style={styles.topicsHeading}>
                Your <Animated.Text style={[styles.topicsHeadingVirtual, virtualEffectStyle]}>Virtual</Animated.Text> CFO
              </Text>
            </Animated.View>
          </View>

          {/* ── Hero (blur + transparent shine) ─────────────────────────── */}
          <View style={styles.heroRow}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(255,255,255,0.12)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }} />
            </View>
            <View style={styles.heroLeft}>
              <ScrollView
                ref={heroScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onHeroScroll}
                onScrollEndDrag={onHeroScroll}
                scrollEventThrottle={16}
                style={styles.heroCarousel}
                decelerationRate="fast">
                {HERO_IMAGES.map((source, i) => (
                  <View key={i} style={styles.heroSlide}>
                    <Image
                      source={source}
                      style={styles.heroImage}
                      resizeMode="cover"
                      accessibilityLabel={`Promotional offer ${i + 1} of ${HERO_IMAGES.length}`}
                    />
                  </View>
                ))}
              </ScrollView>
              <View style={styles.heroPagination}>
                {HERO_IMAGES.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.heroDot, heroIndex === i && styles.heroDotActive]}
                  />
                ))}
              </View>
            </View>
            <Pressable
              style={styles.heroRight}
              onPress={() => router.push('/booking-call')}
              accessibilityLabel="Book your call">
              <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                <View style={{ alignItems: 'center', marginRight: 32 }}>
                  <Animated.View style={[styles.heroCtaIconWrap, callIconAnimatedStyle]}>
                    <Ionicons name="call" size={sizes.cardIcon} color="#fff" style={styles.heroCtaIcon} />
                  </Animated.View>
                </View>
                <Text style={[styles.heroCtaText, { alignSelf: 'flex-start', paddingLeft: 12 }]}>Book Call</Text>
              </View>
            </Pressable>
          </View>









          {/* ── Segment Tabs (blur + shine) ─────────────────────────────── */}
          <View style={styles.segmentWrap}>
            {segmentLabels.map((label: Segment) => {
              const isActive = label === activeSegment;
              const statusBadgeCount = label === 'Status' ? activeHomeRegs.length : 0;
              return (
                <Pressable
                  key={label}
                  onPress={() => setActiveSegment(label)}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    isActive && styles.segmentItemActive,
                    pressed && styles.segmentPressed,
                  ]}>
                  <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                    {label}
                  </Text>
                  {statusBadgeCount > 0 ? (
                    <View style={styles.segmentNotifyBadge}>
                      <Text style={styles.segmentNotifyBadgeText}>
                        {statusBadgeCount > 99 ? '99+' : statusBadgeCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* ── Segment panels stay mounted so service images stay cached ─ */}
          <View
            style={[
              styles.segmentContent,
              activeSegment !== 'Status' && styles.segmentHidden,
            ]}>
              <Text style={styles.statusSectionTitle}>Filings</Text>
              <Text style={styles.statusSectionSub}>Add a new company or open an existing filing.</Text>

              <View style={styles.googleCard}>
                <Pressable
                  style={({ pressed }) => [styles.googleListRow, pressed && styles.segmentPressed]}
                  onPress={() => router.push('/company-registration')}
                  accessibilityLabel="Start new company registration">
                  <View style={styles.googleIconWrapBlue}>
                    <Ionicons name="add" size={22} color="#1a73e8" />
                  </View>
                  <View style={styles.googleListBody}>
                    <Text style={styles.googleListTitle}>New registration</Text>
                    <Text style={styles.googleListSub}>Starts a separate application</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#80868b" />
                </Pressable>

                {myRegistrations.length > 0 ? (
                  <>
                    {activeHomeRegs.length > 0 ? (
                      <>
                        <View style={styles.googleListDivider} />
                        <Text style={styles.googleSectionLabel}>ACTIVE</Text>
                        {activeHomeRegs.map((reg, index) => (
                          <View key={reg._id}>
                            {index > 0 ? <View style={styles.googleListDividerInset} /> : null}
                            <Pressable
                              style={({ pressed }) => [
                                styles.googleListRow,
                                styles.googleListRowUnread,
                                pressed && styles.segmentPressed,
                              ]}
                              onPress={() =>
                                router.push(`/company-registration-tracking/${reg._id}` as any)
                              }>
                              <View style={styles.googleIconWrapBlue}>
                                <Ionicons name="business-outline" size={20} color="#1a73e8" />
                              </View>
                              <View style={styles.googleListBody}>
                                <Text style={styles.googleListTitle} numberOfLines={2}>
                                  {reg.proposedName1?.trim() || 'Company registration'}
                                </Text>
                                {reg.caseId ? (
                                  <Text style={styles.googleListSub} numberOfLines={1}>
                                    {reg.caseId}
                                  </Text>
                                ) : null}
                                {renderStatusIndicator(
                                  registrationStatusLabel(reg),
                                  registrationStatusTone(reg),
                                )}
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#80868b" />
                            </Pressable>
                          </View>
                        ))}
                      </>
                    ) : null}
                    {endedHomeRegs.length > 0 ? (
                      <>
                        <View style={styles.googleListDivider} />
                        <Text
                          style={[
                            styles.googleSectionLabel,
                            activeHomeRegs.length > 0 && styles.googleSectionLabelSpaced,
                          ]}>
                          COMPLETED
                        </Text>
                        {endedHomeRegs.map((reg, index) => (
                          <View key={reg._id}>
                            {index > 0 ? <View style={styles.googleListDividerInset} /> : null}
                            <Pressable
                              style={({ pressed }) => [styles.googleListRow, pressed && styles.segmentPressed]}
                              onPress={() =>
                                router.push(`/company-registration-tracking/${reg._id}` as any)
                              }>
                              <View style={styles.googleIconWrapGreen}>
                                <Ionicons name="checkmark-circle" size={20} color="#188038" />
                              </View>
                              <View style={styles.googleListBody}>
                                <Text style={styles.googleListTitle} numberOfLines={1}>
                                  {reg.proposedName1?.trim() || 'Company registration'}
                                </Text>
                                {reg.caseId ? (
                                  <Text style={styles.googleListSub} numberOfLines={1}>
                                    {reg.caseId}
                                  </Text>
                                ) : null}
                                {renderStatusIndicator(
                                  registrationStatusLabel(reg),
                                  registrationStatusTone(reg),
                                )}
                              </View>
                              <Ionicons name="chevron-forward" size={20} color="#80868b" />
                            </Pressable>
                          </View>
                        ))}
                      </>
                    ) : null}
                    <View style={styles.googleListDivider} />
                    <Pressable
                      style={({ pressed }) => [styles.googleTextBtn, pressed && styles.segmentPressed]}
                      onPress={() => router.push('/company-registration-upload-tracking')}>
                      <Text style={styles.googleTextBtnLabel}>View all filings</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.googleListDivider} />
                    <View style={styles.googleEmptyBlock}>
                      <View style={styles.googleIconWrapGrey}>
                        <Ionicons name="document-text-outline" size={22} color="#5f6368" />
                      </View>
                      <Text style={styles.googleEmptyText}>{getRegistrationStatusLabel()}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.googlePrimaryBtn, pressed && styles.segmentPressed]}
                      onPress={openRegistrationFlow}>
                      <Text style={styles.googlePrimaryBtnText}>
                        {registrationStatus === 'paid' ||
                        registrationStatus === 'upload_in_progress' ||
                        registrationStatus === 'completed'
                          ? 'View tracking'
                          : 'Continue registration'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
          </View>

          <View
            style={[
              styles.segmentContent,
              activeSegment !== 'Transaction' && styles.segmentHidden,
            ]}>
              <Text style={styles.statusSectionTitle}>Transactions</Text>
              <Text style={styles.statusSectionSub}>
                Payment confirmations when you complete checkout in the app.
              </Text>
              <View style={styles.googleCard}>
                <Pressable
                  style={({ pressed }) => [styles.googleListRow, pressed && styles.segmentPressed]}
                  onPress={() => router.push('/transactions')}
                  accessibilityLabel="Open payment messages">
                  <View style={styles.googleIconWrapGrey}>
                    <Ionicons name="receipt-outline" size={22} color="#5f6368" />
                  </View>
                  <View style={styles.googleListBody}>
                    <Text style={styles.googleListTitle}>Payment messages</Text>
                    <Text style={styles.googleListSub}>
                      {paymentTransactions.length > 0
                        ? `${paymentTransactions.length} confirmation${paymentTransactions.length === 1 ? '' : 's'}`
                        : 'Appears after you complete payment'}
                    </Text>
                    {paymentTransactions.length > 0
                      ? renderStatusIndicator('Payments recorded', 'success')
                      : renderStatusIndicator('No payments yet', 'neutral')}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#80868b" />
                </Pressable>
              </View>
          </View>

          <View style={activeSegment !== 'Overview' ? styles.segmentHidden : undefined}>
              {/* ── Our Services (blur + shine) ─────────────────────────────── */}
             <View style={styles.servicesSectionWrap}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>Our Services</Text>
                  <View style={styles.sectionDivider} />
                </View>

                <View style={styles.grid}>
                  {services.map((service: ServiceItem) => (
                    <Pressable
                      key={service.id}
                      onPress={() => {
                        if (service.id === 'company-registration') {
                          router.push('/company-registration');
                        } else {
                          router.push({
                            pathname: '/service/[id]',
                            params: { id: service.id }
                          });
                        }
                      }}
                      style={({ pressed }) => [
                        styles.card,
                        pressed && styles.cardPressed,
                      ]}>
                      <View style={[styles.cardIconWrap, service.image ? { backgroundColor: 'transparent' } : null]}>
                        {service.image ? (
                          <ExpoImage
                            source={service.image}
                            style={{
                              width: sizes.cardIcon * SERVICE_IMAGE_SCALE[service.id],
                              height: sizes.cardIcon * SERVICE_IMAGE_SCALE[service.id],
                            }}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={0}
                            recyclingKey={`service-${service.id}`}
                            accessibilityLabel={service.title}
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name={service.icon}
                            size={sizes.cardIcon}
                            color={Colors.cardIconColor}
                          />
                        )}
                      </View>
                      <Text style={styles.cardTitle}>{service.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>



              {/* ── Tools (no section bg) ──────────────────────────────────────── */}
              <View style={styles.toolsSectionWrap}>
                <View style={styles.toolsSectionHeader}>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.toolsSectionTitle}>Tools</Text>
                  <View style={styles.sectionDivider} />
                </View>
                <View style={styles.toolsRow}>
                  {tools.map((tool: ToolItem) => (
                    <Pressable
                      key={`${tool.line1}-${tool.line2}`}
                      style={({ pressed }) => [
                        styles.toolCard,
                        pressed && styles.toolCardPressed,
                      ]}
                      accessibilityLabel={`${tool.line1} ${tool.line2}`}>
                      <View style={styles.toolIconWrap}>
                        <MaterialCommunityIcons
                          name={tool.icon}
                          size={sizes.toolIcon}
                          color={Colors.primary}
                        />
                      </View>
                      <Text style={styles.toolLabel}>{tool.line1}{'\n'}{tool.line2}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});


