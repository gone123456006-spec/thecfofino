import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { LogoImage } from '@/constants/assets';
import { Colors } from '@/constants/theme';
import { profileStyles as styles } from '../../styles/profile.styles';
import { Ionicons } from '@expo/vector-icons';
import { pickVisualMediaFromLibrary } from '@/utils/pick-visual-media';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAY_STORE_LISTING_URL } from '@/constants/publishing';

const LEGACY_PROFILE_IMAGE_KEY = '@finovert_auth_profile_image';
import {
  getProfileImageForUser,
  saveProfileImageForUser,
} from '@/utils/profile-image-storage';
import { UpdateAvailableBanner } from '@/components/UpdateAvailableBanner';

const CONTACT_EMAIL = 'support@finovert.com';

interface EditModalProps {
  visible: boolean;
  initialName: string;
  initialMobile: string;
  onClose: () => void;
  onSave: (name: string, mobile: string) => Promise<void>;
}

function EditProfileModal({ visible, initialName, initialMobile, onClose, onSave }: EditModalProps) {
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(initialName);
    setMobile(initialMobile);
  }, [visible, initialName, initialMobile]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }
    setLoading(true);
    try {
      await onSave(name, mobile);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name*</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
              autoFocus
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          
          <View style={styles.modalActions}>
            <Pressable 
              style={[styles.modalActionBtn, styles.cancelBtn]} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalActionBtn, styles.saveBtn, { opacity: loading ? 0.7 : 1 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const appVersion = Constants.expoConfig?.version ?? '—';
const androidVersionCode =
  Platform.OS === 'android'
    ? (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode
    : undefined;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, sessionGeneration } = useAuth();
  const { unreadCount } = useNotifications();
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [profileImageVersion, setProfileImageVersion] = useState(0);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? '?';

  const loadProfileImage = useCallback(async () => {
    let uri = await getProfileImageForUser(user?.id, user?.email);
    if (!uri && (user?.id || user?.email)) {
      try {
        const legacy = await AsyncStorage.getItem(LEGACY_PROFILE_IMAGE_KEY);
        if (legacy) {
          uri = await saveProfileImageForUser(legacy, user.id, user.email);
          await AsyncStorage.removeItem(LEGACY_PROFILE_IMAGE_KEY);
        }
      } catch {
        /* ignore */
      }
    }
    setProfileImageUri(uri);
    if (uri) setProfileImageVersion(v => v + 1);
  }, [user?.id, user?.email]);

  useEffect(() => {
    void loadProfileImage();
  }, [loadProfileImage, sessionGeneration]);

  const pickImage = useCallback(async () => {
    if (!user?.id && !user?.email) {
      Alert.alert('Sign in required', 'Complete your profile before adding a photo.');
      return;
    }
    try {
      const result = await pickVisualMediaFromLibrary({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        if (asset.type === 'video') {
          Alert.alert('Images only', 'Please choose a photo (not a video) for your profile picture.');
          return;
        }
        const saved = await saveProfileImageForUser(asset.uri, user.id, user.email);
        if (saved) {
          setProfileImageUri(saved);
          setProfileImageVersion(v => v + 1);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not pick image. Try again.');
    }
  }, [user?.id, user?.email]);

  const handleProfileUpdate = async (name: string, mobile: string) => {
    await updateProfile({ name, mobile });
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const openTerms = () => router.push('/terms');
  const openPrivacy = () => router.push('/privacy');
  const openPolicies = () => router.push('/policies');
  const openAbout = () => router.push('/about');
  const openHelp = () => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Finovert%20support`).catch(() => {});
  const openPlayStore = () => Linking.openURL(PLAY_STORE_LISTING_URL).catch(() => {});

  return (
    <>
      <View style={styles.container}>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
        {/* ── User section: avatar left, name + details right ─────────────── */}
        <View style={styles.userSection}>
          <Pressable onPress={pickImage} style={styles.avatar}>
            {profileImageUri ? (
              <Image
                key={`avatar-${user?.id ?? user?.email ?? 'u'}-${profileImageVersion}`}
                source={{ uri: profileImageUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
            <View style={styles.avatarAddBadge}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </Pressable>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
            <Text style={styles.clientId}>{user?.mobile ? `+91 ${user.mobile}` : '—'}</Text>
          </View>
          
          <Pressable 
            onPress={() => setIsEditModalVisible(true)}
            style={{ position: 'absolute', top: 20, right: 20 }}
          >
            <Ionicons name="create-outline" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* ── Account Details Section ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 4 }}>Name*</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textPrimary }}>{user?.name ?? '—'}</Text>
            </View>
            <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 4 }}>Mobile No.</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textPrimary }}>{user?.mobile ? `+91 ${user.mobile}` : '—'}</Text>
            </View>
            <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 4 }}>Email ID</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.textPrimary }}>{user?.email ?? '—'}</Text>
            </View>
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
            <UpdateAvailableBanner variant="row" />
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
            <Pressable style={styles.listRow} onPress={openPolicies}>
              <View style={styles.listRowIcon}>
                <Ionicons name="reader-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.listRowContent}>
                <Text style={styles.listRowTitle}>Policies</Text>
                <Text style={styles.listRowSubtitle}>Terms, privacy, and legal documents</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.listRowChevron} />
            </Pressable>
            <Pressable style={styles.listRow} onPress={openHelp}>
              <View style={styles.listRowIcon}>
                <Ionicons name="help-circle-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.listRowContent}>
                <Text style={styles.listRowTitle}>Help & support</Text>
                <Text style={styles.listRowSubtitle}>Email our team</Text>
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

        {/* ── Contact Footer (Call Us + WhatsApp) ────── */}
        <View style={styles.contactRow}>
          <Pressable
            style={styles.contactBtn}
            onPress={() => Linking.openURL('tel:+919153832948')}>
            <View style={styles.contactBtnIconWrap}>
              <Ionicons name="call" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.contactBtnText}>Call Us</Text>
          </Pressable>
          <Pressable
            style={styles.contactBtnWhatsapp}
            onPress={() => Linking.openURL('https://wa.me/919153832948?text=Hi%2C%20I%20need%20more%20details%20about%20your%20services')}>
            <View style={styles.contactBtnIconWrap}>
              <Ionicons name="logo-whatsapp" size={22} color={Colors.white} />
            </View>
            <Text style={styles.contactBtnWhatsappText}>WhatsApp</Text>
          </Pressable>
        </View>

        {/* ── Log out ──────────────────────────────────────────────────────── */}
        <Pressable
          onPress={() => {
            setProfileImageUri(null);
            void logout();
          }}
          style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <View style={[styles.logoWrap, { alignItems: 'center', marginTop: 20, marginBottom: 40 }]}>
          <Image
            source={require('@/assets/images/logogogw.png')}
            style={{ width: 64, height: 64, marginBottom: -14 }}
            resizeMode="contain"
          />
          <Text style={styles.version}>
            Version {appVersion}
            {androidVersionCode != null ? ` · Build ${androidVersionCode}` : ''}
          </Text>
        </View>
        </ScrollView>
      </View>

      <EditProfileModal 
        visible={isEditModalVisible}
        initialName={user?.name || ''}
        initialMobile={user?.mobile || ''}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleProfileUpdate}
      />
    </>
  );
}
