import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { PLAY_STORE_LISTING_URL } from '@/constants/publishing';
import { useAppUpdateCheck } from '@/hooks/useAppUpdateCheck';
import { ms, sh, sw } from '@/utils/responsive';

type Props = {
  /** Compact row for profile list; default banner for home. */
  variant?: 'banner' | 'row';
};

export function UpdateAvailableBanner({ variant = 'banner' }: Props) {
  const { updateAvailable, forceUpdate, latestVersion, installedVersion, loading } = useAppUpdateCheck();

  if (loading || (!updateAvailable && !forceUpdate)) return null;

  const openStore = () => Linking.openURL(PLAY_STORE_LISTING_URL).catch(() => {});

  if (variant === 'row') {
    return (
      <Pressable style={styles.row} onPress={openStore}>
        <View style={styles.rowIcon}>
          <Ionicons name="cloud-download-outline" size={22} color={Colors.white} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>
            {forceUpdate ? 'Update required' : 'Update available'}
          </Text>
          <Text style={styles.rowSubtitle}>
            v{installedVersion} → v{latestVersion} on Play Store
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NEW</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.banner, forceUpdate && styles.bannerForce]} onPress={openStore}>
      <View style={styles.bannerIcon}>
        <Ionicons name="arrow-up-circle" size={28} color={Colors.white} />
      </View>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>
          {forceUpdate ? 'Please update Finovert' : 'New version available'}
        </Text>
        <Text style={styles.bannerSubtitle}>
          Version {latestVersion} is on Play Store (you have {installedVersion})
        </Text>
      </View>
      <Text style={styles.bannerAction}>Update</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: sw(16),
    marginBottom: sh(12),
    padding: sw(14),
    borderRadius: sw(12),
    backgroundColor: Colors.primary,
    gap: sw(10),
  },
  bannerForce: {
    backgroundColor: '#c62828',
  },
  bannerIcon: {
    width: sw(36),
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    color: Colors.white,
  },
  bannerSubtitle: {
    fontSize: ms(12),
    color: 'rgba(255,255,255,0.9)',
    marginTop: sh(2),
  },
  bannerAction: {
    fontSize: ms(14),
    fontWeight: '700',
    color: Colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sh(14),
    paddingHorizontal: sw(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: '#E8F4FD',
  },
  rowIcon: {
    width: sw(40),
    height: sw(40),
    borderRadius: sw(20),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sw(12),
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: ms(15),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: ms(12),
    color: Colors.textMuted,
    marginTop: sh(2),
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: sw(8),
    paddingVertical: sh(4),
    borderRadius: sw(6),
    marginRight: sw(8),
  },
  badgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: Colors.white,
  },
});
