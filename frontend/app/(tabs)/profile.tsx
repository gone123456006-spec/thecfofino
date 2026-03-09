import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { LogoImage } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { profileStyles as styles } from '../../styles/profile.styles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_IMAGE_KEY = '@finoverts_profile_image';

const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';
const POLICIES_URL = 'https://example.com/policies';
const ABOUT_URL = 'https://example.com/about';
const HELP_URL = 'https://example.com/help';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.finoverts.app';
const CONTACT_EMAIL = 'support@finoverts.com';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? '?';
  const clientId = user?.mobile ? `Mobile: ${user.mobile}` : '—';

  useEffect(() => {
    (async () => {
      try {
        const uri = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
        if (uri) setProfileImageUri(uri);
      } catch {
        // ignore
      }
    })();
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to your photos to set a profile image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setProfileImageUri(uri);
        await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick image. Try again.');
    }
  }, []);

  const openTerms = () => router.push('/terms');
  const openPrivacy = () => router.push('/privacy');
  const openPolicies = () => Linking.openURL(POLICIES_URL).catch(() => { });
  const openAbout = () => Linking.openURL(ABOUT_URL).catch(() => { });
  const openHelp = () => Linking.openURL(HELP_URL).catch(() => { });
  const openPlayStore = () => Linking.openURL(PLAY_STORE_URL).catch(() => { });
  const openContact = () => Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => { });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* ── App bar: Profile title + notification (below camera/notch) ───── */}
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 4) + 8 }]}>
        <Text style={styles.appBarTitle}>Profile</Text>
        <View style={styles.appBarSpacer} />
        <Pressable
          style={styles.notificationCircle}
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* ── User section: avatar left, name + mobile ──────────────────────── */}
      <View style={styles.userSection}>
        <Pressable onPress={pickImage} style={styles.avatar}>
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
          <View style={styles.avatarAddBadge}>
            <Ionicons name="camera" size={14} color={Colors.white} />
          </View>
        </Pressable>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
          <Text style={styles.clientId}>{clientId}</Text>
        </View>
      </View>

      {/* ── Banner: Book Your Call ───────────────────────────────────────── */}
      <Pressable style={styles.banner} onPress={() => router.push('/booking-call')}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTitle}>Book Your Call</Text>
          <Text style={styles.bannerSubtitle}>Schedule a free consultation with our team</Text>
        </View>
        <View style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>BOOK</Text>
        </View>
      </Pressable>

      {/* ── Legal & Support list ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal & Support</Text>
        <Text style={styles.sectionSubtitle}>Terms, privacy, contact and feedback</Text>
        <View style={styles.card}>
          <Pressable style={styles.listRow} onPress={openTerms}>
            <View style={styles.listRowIcon}>
              <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>Terms & Conditions</Text>
              <Text style={styles.listRowSubtitle}>Read our terms of service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
          <Pressable style={styles.listRow} onPress={openPrivacy}>
            <View style={styles.listRowIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>Privacy Policy</Text>
              <Text style={styles.listRowSubtitle}>How we use your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
          <Pressable style={styles.listRow} onPress={openPolicies}>
            <View style={styles.listRowIcon}>
              <Ionicons name="folder-open-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>Policies</Text>
              <Text style={styles.listRowSubtitle}>View all our policies</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
          <Pressable style={styles.listRow} onPress={openAbout}>
            <View style={styles.listRowIcon}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>About Us</Text>
              <Text style={styles.listRowSubtitle}>Learn more about Your Virtual CFO</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
          <Pressable style={styles.listRow} onPress={openHelp}>
            <View style={styles.listRowIcon}>
              <Ionicons name="help-circle-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>Help</Text>
              <Text style={styles.listRowSubtitle}>FAQs and support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
          <Pressable style={styles.listRow} onPress={openContact}>
            <View style={styles.listRowIcon}>
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>Contact Us</Text>
              <Text style={styles.listRowSubtitle}>Get in touch with support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
          <Pressable style={[styles.listRow, styles.listRowLast]} onPress={openPlayStore}>
            <View style={styles.listRowIcon}>
              <Ionicons name="star-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.listRowContent}>
              <Text style={styles.listRowTitle}>Rate Us on Play Store</Text>
              <Text style={styles.listRowSubtitle}>Share your feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
          </Pressable>
        </View>
      </View>

      {/* ── Contact Footer (Call Us + WhatsApp) – same as Tools cards ────── */}
      <View style={styles.contactRow}>
        <Pressable
          style={styles.contactBtn}
          onPress={() => Linking.openURL('tel:9153832945')}>
          <View style={styles.contactBtnIconWrap}>
            <Ionicons name="call" size={22} color={Colors.primary} />
          </View>
          <Text style={styles.contactBtnText}>Call Us</Text>
        </Pressable>
        <Pressable
          style={styles.contactBtnWhatsapp}
          onPress={() => Linking.openURL('https://wa.me/9153832945?text=Hi%2C%20I%20need%20more%20details%20about%20your%20services')}>
          <View style={styles.contactBtnIconWrap}>
            <Ionicons name="logo-whatsapp" size={22} color={Colors.white} />
          </View>
          <Text style={styles.contactBtnWhatsappText}>WhatsApp</Text>
        </Pressable>
      </View>

      {/* ── Log out ──────────────────────────────────────────────────────── */}
      <Pressable
        onPress={async () => {
          await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
          setProfileImageUri(null);
          logout();
        }}
        style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <View style={styles.logoWrap}>
        <Image
          source={LogoImage}
          style={[styles.logoImage, { backgroundColor: 'transparent' }]}
          resizeMode="contain"
          accessibilityLabel="Finovert"
        />
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}
