import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const TERMS_CONTENT = `These Terms and Conditions ("Terms") govern your access to and use of the services provided by the Company ("Company," "we," "our," or "us"). By accessing our website, application, or financial services, you agree to comply with these Terms and all applicable laws and regulations. If you do not agree, you must discontinue use of the services.

Users must be at least 18 years old and legally capable of entering into binding agreements. You agree to provide accurate, complete, and up-to-date information when registering or using our services. The Company reserves the right to suspend or terminate access if false or misleading information is detected.

The Company may offer financial consultations, credit-related support, compliance services, or other finance-related tools. These services are provided for informational and assistance purposes only and do not constitute legal, tax, or investment advice. The Company does not guarantee approval of loans, financial results, or third-party service outcomes.

Fees, charges, and payment terms will be disclosed prior to service engagement. Users agree to pay all applicable fees on time. Late or missed payments may result in penalties, interest charges, suspension of services, or recovery actions as permitted by applicable law.

Users are responsible for safeguarding login credentials and must notify the Company immediately of any unauthorized use. The Company is not liable for losses arising from user negligence or unauthorized account access.

All materials, content, branding, and intellectual property provided by the Company remain its exclusive property and may not be copied, modified, or distributed without prior written consent.

To the maximum extent permitted by law, the Company shall not be liable for indirect, incidental, or consequential damages resulting from the use of services. Services are provided "as is" without warranties of uninterrupted availability.

The Company reserves the right to update or modify these Terms at any time. Continued use of services constitutes acceptance of revised Terms. These Terms shall be governed by the laws applicable in the Company's jurisdiction.`;

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
