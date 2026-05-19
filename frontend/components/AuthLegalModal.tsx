import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getPrivacyPolicyPublicUrl } from '@/constants/legal';
import { HELP_CONTENT, PRIVACY_CONTENT, SUPPORT_EMAIL, TERMS_CONTENT } from '@/constants/legal-content';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

export type AuthLegalPage = 'help' | 'privacy' | 'terms';

const TITLES: Record<AuthLegalPage, string> = {
  help: 'Help',
  privacy: 'Privacy',
  terms: 'Terms',
};

const BODIES: Record<AuthLegalPage, string> = {
  help: HELP_CONTENT,
  privacy: PRIVACY_CONTENT,
  terms: TERMS_CONTENT,
};

type Props = {
  page: AuthLegalPage | null;
  onClose: () => void;
};

export function AuthLegalModal({ page, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const publicPrivacyUrl = page === 'privacy' ? getPrivacyPolicyPublicUrl() : undefined;

  if (!page) return null;

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Finovert%20support`).catch(() => {});
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{TITLES[page]}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + sh(24) }]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.body}>{BODIES[page]}</Text>

          {page === 'help' ? (
            <Pressable onPress={openEmail} style={styles.actionBtn}>
              <Ionicons name="mail-outline" size={20} color={Colors.textOnPrimary} />
              <Text style={styles.actionBtnText}>Email {SUPPORT_EMAIL}</Text>
            </Pressable>
          ) : null}

          {page === 'privacy' && publicPrivacyUrl ? (
            <Pressable
              onPress={() => Linking.openURL(publicPrivacyUrl).catch(() => {})}
              style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>Open official privacy policy (web)</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sw(16),
    paddingVertical: sh(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    padding: sw(4),
  },
  headerTitle: {
    flex: 1,
    fontSize: ms(18),
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: sw(34),
  },
  scroll: {
    paddingHorizontal: sw(24),
    paddingTop: sh(20),
  },
  body: {
    fontSize: ms(15),
    lineHeight: ms(24),
    color: Colors.textSecondary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sw(8),
    marginTop: sh(24),
    backgroundColor: Colors.primary,
    paddingVertical: sh(14),
    borderRadius: sw(12),
  },
  actionBtnText: {
    fontSize: ms(15),
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  linkBtn: {
    marginTop: sh(20),
  },
  linkBtnText: {
    fontSize: ms(15),
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
