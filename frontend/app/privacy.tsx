import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';
import { ScrollView, StyleSheet, Text } from 'react-native';

const PRIVACY_CONTENT = `This Privacy Policy explains how the Company ("Company," "we," "our," or "us") collects, uses, stores, and protects your personal information when you access our website, mobile application, or financial services. By using our services, you consent to the practices described in this Policy.

We may collect personal information such as your name, contact details, identification information, financial data, transaction history, and device or usage data. This information is collected when you register, apply for services, communicate with us, or interact with our platform. We collect data only to the extent necessary to deliver services, comply with legal obligations, and improve user experience.

Your information is used to verify identity, process service requests, provide customer support, enhance security, detect fraud, and comply with regulatory or legal requirements. We may also use aggregated or anonymized data for analytics and service improvement.

We do not sell your personal information. Data may be shared with trusted third-party partners, financial institutions, or regulatory authorities when required for service delivery, compliance, or legal enforcement. All partners are expected to maintain appropriate confidentiality and data protection standards.

The Company implements reasonable administrative, technical, and physical safeguards to protect your data against unauthorized access, disclosure, or misuse. However, no digital platform can guarantee absolute security, and users share information at their own risk.

You have the right to review, update, or request deletion of your personal information, subject to legal and regulatory requirements. Requests may be submitted through official support channels.

We may update this Privacy Policy periodically. Continued use of services after updates indicates acceptance of revised terms. This Policy is governed by applicable data protection laws within the relevant jurisdiction.`;

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
});

export default function PrivacyScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.body}>{PRIVACY_CONTENT}</Text>
    </ScrollView>
  );
}
