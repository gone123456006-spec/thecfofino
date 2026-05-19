import { PRIVACY_CONTENT } from '@/constants/legal-content';
import { getPrivacyPolicyPublicUrl } from '@/constants/legal';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    padding: sw(24),
    paddingBottom: sh(40),
  },
  title: {
    fontSize: ms(20),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sh(16),
  },
  body: {
    fontSize: ms(15),
    lineHeight: ms(24),
    color: Colors.textSecondary,
  },
  brandingSection: {
    alignItems: 'center',
    marginVertical: sh(40),
  },
  logo: {
    width: sw(90),
    height: sw(90),
  },
  publicLinkWrap: {
    marginTop: sh(16),
    marginBottom: sh(8),
  },
  publicLink: {
    fontSize: ms(15),
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});

export default function PrivacyScreen() {
  const publicPrivacyUrl = getPrivacyPolicyPublicUrl();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.body}>{PRIVACY_CONTENT}</Text>

      {publicPrivacyUrl ? (
        <Pressable
          onPress={() => Linking.openURL(publicPrivacyUrl).catch(() => {})}
          style={styles.publicLinkWrap}>
          <Text style={styles.publicLink}>Open official privacy policy (web)</Text>
        </Pressable>
      ) : null}

      {/* Clover Logo at the End */}
      <View style={styles.brandingSection}>
        <Image
          source={require('@/assets/images/logogogw.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
  );
}
