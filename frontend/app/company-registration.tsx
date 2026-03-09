import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';

import { Colors } from '@/constants/theme';
import { companyRegistrationStyles } from '@/styles/company-registration.styles';
import { loadCompanyRegistrationState, saveCompanyRegistrationState } from '@/utils/company-registration-draft';
import { sh, sw } from '@/utils/responsive';

const BUSINESS_TYPES = [
  'Private Limited',
  'LLP',
  'One Person Company',
  'Partnership',
  'Sole Proprietorship',
] as const;

// Data sourced from MCA, Cleartax, ComplianceCalendar, and other official resources
type BusinessType = (typeof BUSINESS_TYPES)[number];

type BusinessTypeData = {
  documents: string[];
  benefits: string[];
};

const BUSINESS_TYPE_DATA: Record<BusinessType, BusinessTypeData> = {
  'Private Limited': {
    documents: [
      'PAN & Aadhaar of directors',
      'Passport-size photos',
      'Digital Signature Certificate (DSC)',
      'Director Identification Number (DIN)',
      'Memorandum of Association (MoA)',
      'Articles of Association (AoA)',
      'Registered office proof (rental/NOC)',
      'Address proof (utility bill, bank statement)',
    ],
    benefits: [
      'Limited liability – personal assets protected',
      'Separate legal entity – can own assets & contracts',
      'Perpetual succession – survives owner changes',
      'Easy capital raising – equity, loans, VC',
      'Credibility – MCA registered',
      'Easy share transfer',
      'No minimum capital required',
    ],
  },
  LLP: {
    documents: [
      'PAN card of all partners',
      'Address proof (Aadhaar, voter ID, passport)',
      'Passport-size photo on white background',
      'Digital Signature Certificate (at least one partner)',
      'Registered office proof (rental + landlord NOC)',
      'Utility bill (not older than 2 months)',
    ],
    benefits: [
      'Limited liability – partners protected beyond contribution',
      'Separate legal entity – sue/be sued in own name',
      'Low cost & compliance – only 2 annual filings',
      'Flexible operations – partnership + company protection',
      'Perpetual succession',
      'Min. 2 partners, no upper limit',
    ],
  },
  'One Person Company': {
    documents: [
      'PAN & Aadhaar of director',
      'Passport-size photograph',
      'Address proof (bank statement / electricity bill)',
      'Nominee consent (INC-3)',
      'Registered office proof',
      'Digital Signature Certificate',
      'Director Identification Number (DIN)',
    ],
    benefits: [
      'Limited liability protection',
      'Separate legal entity status',
      'Easy access to funds & bank loans',
      'Reduced compliance vs private company',
      'Single decision-maker – quick decisions',
      'Perpetual succession via nominee',
    ],
  },
  Partnership: {
    documents: [
      'Partnership deed (on stamp paper)',
      'PAN card of firm',
      'PAN & address proof of each partner',
      'Passport-size photos of partners',
      'Registered office proof (rental + NOC)',
      'Utility bill (not older than 2 months)',
    ],
    benefits: [
      'Right to sue and be sued against third parties',
      'Enforceable contracts in court',
      'Access to business loans & current accounts',
      'Eligibility for government tenders',
      'Legal credibility with vendors & clients',
      'Enhanced dispute resolution',
    ],
  },
  'Sole Proprietorship': {
    documents: [
      'PAN Card',
      'Aadhaar Card (linked with PAN)',
      'Bank account (current or savings)',
      'Registered office proof',
      'Rental agreement + landlord NOC (if rented)',
      'Utility bill (if owned premises)',
    ],
    benefits: [
      'Simple setup – no separate legal entity',
      'Low cost – minimal startup costs',
      'Full control – complete decision-making',
      'All profits retained by owner',
      'Minimal compliance – fewer filings',
      'Ideal for freelancers & small businesses',
    ],
  },
};

// Registration Overview – local video
const REGISTRATION_OVERVIEW_VIDEO = require('@/assets/vidoes/video of Registration .mp4');
const REGISTRATION_OVERVIEW_THUMB = require('@/assets/images/registration-overview-thumb.jpg');

const SKIP_SECONDS = 10;

function formatVideoTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function RegistrationOverviewVideo({ customStyle }: { customStyle?: any } = {}) {
  const [overviewPlaying, setOverviewPlaying] = useState(false);
  const [overviewMuted, setOverviewMuted] = useState(true);
  const [overviewControlsVisible, setOverviewControlsVisible] = useState(true);
  const overviewVideoRef = useRef<Video>(null);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onOverviewPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setOverviewPlaying(status.isPlaying);
    setOverviewMuted(status.isMuted ?? false);
    if (status.isPlaying) {
      if (controlsHideTimeoutRef.current) clearTimeout(controlsHideTimeoutRef.current);
      controlsHideTimeoutRef.current = setTimeout(() => setOverviewControlsVisible(false), 2000);
    } else {
      if (controlsHideTimeoutRef.current) {
        clearTimeout(controlsHideTimeoutRef.current);
        controlsHideTimeoutRef.current = null;
      }
      setOverviewControlsVisible(true);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsHideTimeoutRef.current) clearTimeout(controlsHideTimeoutRef.current);
    };
  }, []);

  const toggleOverviewPlayPause = async () => {
    try {
      if (overviewPlaying) {
        await overviewVideoRef.current?.pauseAsync();
      } else {
        await overviewVideoRef.current?.playAsync();
      }
    } catch (_) { }
  };

  const toggleOverviewMute = async () => {
    try {
      await overviewVideoRef.current?.setIsMutedAsync(!overviewMuted);
      setOverviewMuted((m) => !m);
    } catch (_) { }
  };

  const toggleOverviewControls = () => {
    setOverviewControlsVisible((v) => !v);
  };

  // Play button pulse animation
  const playScale = useSharedValue(1);
  useEffect(() => {
    playScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, [playScale]);

  const playAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  return (
    <View style={[companyRegistrationStyles.videoWrap, customStyle]}>
      <Video
        ref={overviewVideoRef}
        source={REGISTRATION_OVERVIEW_VIDEO}
        style={companyRegistrationStyles.videoThumbnail}
        useNativeControls={false}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted={overviewMuted}
        usePoster={true}
        posterSource={REGISTRATION_OVERVIEW_THUMB}
        posterStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        progressUpdateIntervalMillis={500}
        onPlaybackStatusUpdate={onOverviewPlaybackStatusUpdate}
      />

      {/* Persistent Mute Button */}
      <Pressable
        style={{
          position: 'absolute',
          bottom: sh(10),
          right: sw(10),
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: sw(3),
          borderRadius: sw(20),
          zIndex: 10,
        }}
        onPress={toggleOverviewMute}
        hitSlop={10}>
        <Ionicons
          name={overviewMuted ? 'volume-mute' : 'volume-high'}
          size={sw(12)}
          color="#fff"
        />
      </Pressable>

      {overviewControlsVisible ? (
        <View
          style={(companyRegistrationStyles as Record<string, ViewStyle>).videoControlsOverlayFull}
          pointerEvents="box-none">
          <Pressable
            style={(companyRegistrationStyles as Record<string, ViewStyle>).videoControlsTapArea}
            onPress={toggleOverviewControls}>
            <View style={(companyRegistrationStyles as Record<string, ViewStyle>).videoCentreControlsRow}>
              <Pressable onPress={toggleOverviewPlayPause} hitSlop={6}>
                <Animated.View style={[companyRegistrationStyles.videoCentrePlayBtn, playAnimatedStyle]}>
                  <Ionicons
                    name={overviewPlaying ? 'pause-circle' : 'play-circle'}
                    size={sw(40)}
                    color="#e0e0e0"
                  />
                </Animated.View>
              </Pressable>
            </View>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={(companyRegistrationStyles as Record<string, ViewStyle>).videoControlsOverlayFull}
          onPress={() => setOverviewControlsVisible(true)}
        />
      )}
    </View>
  );
}

export default function CompanyRegistrationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);

  const typeData = selectedType ? BUSINESS_TYPE_DATA[selectedType] : null;

  // Play button pulse animation
  const playScale = useSharedValue(1);
  useEffect(() => {
    playScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, [playScale]);

  useEffect(() => {
    (async () => {
      const state = await loadCompanyRegistrationState();
      const savedType = state.draft?.businessType as BusinessType | undefined;
      if (savedType && BUSINESS_TYPES.includes(savedType)) {
        setSelectedType(savedType);
      }
    })();
  }, []);
  const playAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  const handleNext = () => {
    router.push({
      pathname: '/company-registration-form',
      params: selectedType ? { businessType: selectedType } : {},
    });
  };

  return (
    <ScrollView
      style={companyRegistrationStyles.container}
      contentContainerStyle={companyRegistrationStyles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* ── Step 1: Registration Overview (video plays inline) ── */}
      <View style={companyRegistrationStyles.section}>
        <Text style={companyRegistrationStyles.sectionTitle}>Registration Overview</Text>
        <Text style={companyRegistrationStyles.sectionDesc}>
          See how Finovert works – our offer and process
        </Text>
        <RegistrationOverviewVideo customStyle={{ height: sh(188) }} />
      </View>

      {/* ── Step 2: Business Type Selection ── */}
      <View style={companyRegistrationStyles.section}>
        <Text style={companyRegistrationStyles.sectionTitle}>1. Choose Business Type</Text>
        <View style={companyRegistrationStyles.typeRow}>
          {BUSINESS_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <Pressable
                key={type}
                style={[
                  companyRegistrationStyles.typeChip,
                  isSelected && companyRegistrationStyles.typeChipSelected,
                ]}
                onPress={() => {
                  setSelectedType(type);
                  void (async () => {
                    const state = await loadCompanyRegistrationState();
                    await saveCompanyRegistrationState({
                      status: 'draft',
                      draft: {
                        businessType: type,
                        proposedName1: state.draft?.proposedName1 || '',
                        proposedName2: state.draft?.proposedName2 || '',
                        proposedName3: state.draft?.proposedName3 || '',
                        businessActivity: state.draft?.businessActivity || '',
                        registeredAddress: state.draft?.registeredAddress || '',
                        capitalStructure: state.draft?.capitalStructure || '',
                        companyMobile: state.draft?.companyMobile || '',
                        companyEmail: state.draft?.companyEmail || '',
                        directors: state.draft?.directors || [],
                      },
                    });
                  })();
                }}>
                <Text style={[companyRegistrationStyles.typeChipText, isSelected && companyRegistrationStyles.typeChipTextSelected]}>{type}</Text>
              </Pressable>
            );
          })}
        </View>
        {!selectedType && (
          <Text style={companyRegistrationStyles.hint}>
            Select a type to see video, documents & benefits
          </Text>
        )}
      </View>

      {/* ── Selected Type Details (card) ── */}
      {typeData && (
        <View style={companyRegistrationStyles.detailsCard}>
          <View style={companyRegistrationStyles.selectedTypeHeader}>
            <Text style={companyRegistrationStyles.selectedTypeLabel}>{selectedType}</Text>
          </View>

          {/* Type-specific video */}
          {/* Registration Overview Video */}
          <Text style={companyRegistrationStyles.subSectionTitle}>1. How to register {selectedType}</Text>
          <RegistrationOverviewVideo />

          {/* Documents */}
          <Text style={companyRegistrationStyles.subSectionTitle}>2. Documents Required</Text>
          <View style={companyRegistrationStyles.docList}>
            {(typeData.documents ?? []).map((doc) => (
              <View key={doc} style={companyRegistrationStyles.docItem}>
                <View style={companyRegistrationStyles.docBullet} />
                <Text style={companyRegistrationStyles.docText}>{doc}</Text>
              </View>
            ))}
          </View>

          {/* Benefits */}
          <Text style={companyRegistrationStyles.subSectionTitle}>3. Benefits</Text>
          {(typeData.benefits ?? []).map((benefit) => (
            <View key={benefit} style={companyRegistrationStyles.benefitItem}>
              <View style={companyRegistrationStyles.benefitIcon}>
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              </View>
              <Text style={companyRegistrationStyles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── CTA ── */}
      <Pressable
        style={[companyRegistrationStyles.ctaButton, !selectedType && { opacity: 0.5 }]}
        onPress={handleNext}
        disabled={!selectedType}>
        <Text style={companyRegistrationStyles.ctaButtonText}>NEXT</Text>
      </Pressable>
    </ScrollView>
  );
}
