import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';

const ABOUT_CONTENT = `
Finovert: Empowering Your Business Journey

Welcome to Finovert—your comprehensive partner in financial excellence and legal compliance. In today's rapidly evolving economic landscape, navigating the complex web of business registrations, taxation laws, and strategic financial management can be an overwhelming task. Finovert was founded with a singular, powerful mission: to simplify these critical processes and empower entrepreneurs to focus on what they do best—building and scaling their vision.

Our Story & Vision
Finovert began as a vision to democratize professional financial services. We recognized that small and medium-sized enterprises (SMEs) and growing startups often lacked access to the high-level financial expertise typically reserved for large corporations. By blending state-of-the-art technology with deep-rooted industry expertise, we have created a platform that brings premium "Virtual CFO" services and compliance support directly to the palm of your hand. Our goal is to be the silent engine behind your success, ensuring that your legal and financial foundations are unshakeable.

Our Comprehensive Services

1. Company Registration & Licensing: Every great success story starts with a solid legal foundation. Whether you are launching a Private Limited company, an LLP, or an OPC, our team manages the entire incorporation process. We guide you through the intricacies of naming, documentation, and government filings, ensuring your business is ready for investment and growth from day one.

2. Expert GST Filing: Tax compliance is the hallmark of a professional business. Our automated yet expert-driven GST services ensure that your GSTR-1, 3B, and other filings are accurate and timely. We help you manage Input Tax Credit (ITC) reconciliation with precision, protecting your business from penalties while optimizing your tax position for better cash flow.

3. Seamless ITR Filing: Tax season shouldn't be a source of stress. Our personalized Income Tax Return services are designed for both individuals and corporate entities. We analyze your financial data to ensure every eligible deduction is maximized, providing you with peace of mind and full compliance with the latest tax regulations.

4. Strategic Virtual CFO Services: Every scaling business needs the guidance of a senior financial leader. Our Virtual CFO services provide you with strategic leadership, detailed risk assessment, and long-term financial planning without the overhead of a full-time executive hire. We act as your strategic advisors, helping you make data-driven decisions that propel your business forward.

5. Accurate TDS Filing: Managing Tax Deducted at Source (TDS) requires meticulous attention to detail. We handle the entire cycle—from calculations to the generation of certificates and quarterly filings. Our system ensures your business remains 100% compliant, shielding you from unnecessary interest charges and compliance notices.

6. Flexible Invoice Financing: Cash flow is the heartbeat of any thriving operation. We understand the challenges of delayed payments. Our Invoice Financing solutions allow you to unlock immediate working capital from your unpaid invoices, providing you with the liquidity needed to fund daily operations, pay vendors on time, and seize new growth opportunities.

The Finovert Difference
What sets us apart is our commitment to transparency, speed, and personalized support. Through this application, you can track your compliance status in real-time, book consultations with our experts, and access a suite of financial calculators designed to give you instant clarity.

At Finovert, we believe that when business owners are freed from the burden of complex paperwork, they create jobs, innovate, and drive the economy. We are more than just a service provider; we are your growth partners. Let us handle the complexities of the numbers so you can dedicated your energy to leading the future.
`.trim();

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: Colors.white }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + sh(4) }]}>
        <Pressable 
          style={styles.backBtn} 
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={ms(24)} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + sh(40) }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Content Section */}
        <Text style={styles.aboutText}>{ABOUT_CONTENT}</Text>

        {/* Clover Logo at the End */}
        <View style={styles.brandingSection}>
          <Image
            source={require('@/assets/images/logogogw.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sw(16),
    paddingBottom: sh(16),
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: ms(18),
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: sw(24),
    paddingTop: sh(10),
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: sh(30),
    paddingTop: sh(10),
  },
  logo: {
    width: sw(90),
    height: sw(90),
    marginBottom: sh(14),
  },
  appName: {
    fontSize: ms(24),
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: ms(14),
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: sh(4),
  },
  aboutText: {
    fontSize: ms(15),
    lineHeight: ms(25),
    color: Colors.textSecondary,
    textAlign: 'left',
  },
});
