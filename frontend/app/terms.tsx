import { TERMS_CONTENT } from '@/constants/legal-content';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: sw(20),
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
});

export default function TermsScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Terms and Conditions</Text>
      <Text style={styles.body}>{TERMS_CONTENT}</Text>
      
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
