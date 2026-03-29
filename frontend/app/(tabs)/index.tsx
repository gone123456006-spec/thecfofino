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
  type ServiceItem,
  type ToolItem,
} from '../../data/home.data';
import { NavbarLogo } from '@/constants/assets';
import { useNotifications } from '@/contexts/NotificationsContext';
import { createHomeStyles } from '../../styles/home.styles';
import { useScalers } from '@/utils/responsive';
import { fetchMyRegistrations } from '@/api/company-registration';
import { useAuth } from '@/contexts/AuthContext';
import {
  type CompanyRegistrationStatus,
  loadCompanyRegistrationState,
} from '@/utils/company-registration-draft';

const HERO_IMAGES = [
  require('../../assets/images/hero-1.png'),
  require('../../assets/images/hero-2.png'),
  require('../../assets/images/hero-3.png'),
  require('../../assets/images/hero-4.png'),
];


export default function HomeScreen() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { getToken } = useAuth();
  const scalers = useScalers();
  const { sw, sh } = scalers;
  const insets = useSafeAreaInsets();
  const [activeSegment, setActiveSegment] = useState<Segment>('Overview');
  const [registrationStatus, setRegistrationStatus] =
    useState<CompanyRegistrationStatus>('not_started');
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroScrollRef = useRef<ScrollView>(null);
  const { styles, sizes, width } = useMemo(
    () => createHomeStyles(scalers),
    [scalers],
  );
  const heroLeftWidth = sizes.heroLeftWidth ?? width * 0.58;

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

  const refreshRegistration = useCallback(async () => {
    const state = await loadCompanyRegistrationState();
    setRegistrationStatus(state.status);
    setServerStatus(null);
    try {
      const token = await getToken();
      if (token) {
        const list = await fetchMyRegistrations(token);
        const latest = list[0];
        if (latest?.status) setServerStatus(latest.status);
      }
    } catch (_) { }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      void refreshRegistration();
    }, [refreshRegistration]),
  );

  const getRegistrationStatusLabel = () => {
    if (serverStatus) {
      const labels: Record<string, string> = {
        pending: 'Submitted - pending',
        in_progress: 'In progress',
        documents_verified: 'Documents verified',
        filed: 'Filed',
        completed: 'Completed',
        rejected: 'Rejected',
      };
      if (labels[serverStatus]) return labels[serverStatus];
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
                </Pressable>
              );
            })}
          </View>

          {/* ── Segment content: Status = Company Registration card; else Our Services + Tools ─ */}
          {activeSegment === 'Status' ? (
            <View style={styles.segmentContent}>
              <View style={styles.statusCardWrap}>
                <Text style={styles.statusCardTitle}>Company Registration Process</Text>
                <Text style={styles.statusCardSubtitle}>
                  {registrationStatus === 'paid' || registrationStatus === 'upload_in_progress' || registrationStatus === 'completed'
                    ? 'Track your submission and filing progress.'
                    : 'Track submission, payment and filing progress from one place.'}
                </Text>
                <View style={styles.statusCardRow}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <Text style={styles.statusCardText}>{getRegistrationStatusLabel()}</Text>
                </View>
                <Pressable style={styles.statusCardBtn} onPress={openRegistrationFlow}>
                  <Text style={styles.statusCardBtnText}>
                    {registrationStatus === 'paid' || registrationStatus === 'upload_in_progress' || registrationStatus === 'completed'
                      ? 'View tracking'
                      : 'Open Process'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
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
                          <Image
                            source={service.image}
                            style={{
                              width: sizes.cardIcon * (service.id === 'gst-filing' ? 3.05 : service.id === 'company-registration' ? 2.25 : service.id === 'itr-filing' ? 1.9 : service.id === 'tds-filing' ? 1.65 : service.id === 'cfo-services' ? 1.9 : service.id === 'invoice-financing' ? 1.75 : 2.0),
                              height: sizes.cardIcon * (service.id === 'gst-filing' ? 3.05 : service.id === 'company-registration' ? 2.25 : service.id === 'itr-filing' ? 1.9 : service.id === 'tds-filing' ? 1.65 : service.id === 'cfo-services' ? 1.9 : service.id === 'invoice-financing' ? 1.75 : 2.0),
                            }}
                            resizeMode="contain"
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
            </>
          )}
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


