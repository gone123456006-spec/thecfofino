import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMemo } from 'react';
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
import { services, type ServiceItem } from '@/data/home.data';
import { useScalers } from '@/utils/responsive';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scalers = useScalers();
  const { sw, sh, ms } = scalers;

  const service = useMemo(() => 
    services.find((s) => s.id === id), 
  [id]);

  if (!service) {
    return (
      <View style={styles.errorContainer}>
        <Text>Service not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, marginTop: 10 }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const gradientColors = ['#5BC8C6', '#3A9BC8', '#5A9FD8'] as const;

  return (
    <View style={[styles.container, { backgroundColor: '#D9EFFF' }]}>
      {/* Hide native header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + sh(4) }]}>
        <Pressable 
          style={styles.backBtn} 
          onPress={() => router.back()}
          accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={ms(24)} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{service.title}</Text>
        <View style={{ width: sw(44) }} /> 
      </View>
 
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + sh(100) }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroMainCard}>
            <View style={styles.iconContainer}>
              {service.image ? (
                <Image 
                  source={service.image} 
                  style={styles.serviceImage} 
                  resizeMode="contain" 
                />
              ) : (
                <MaterialCommunityIcons name={service.icon} size={sw(60)} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.descriptionText}>{service.description}</Text>
          </View>
        </View>
 
        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Key Features & Benefits</Text>
          <View style={styles.featuresList}>
            {service.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkIconWrap}>
                  <Ionicons name="checkmark" size={ms(14)} color={Colors.white} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
 
        {/* Support Section */}
        <View style={styles.whySection}>
          <View style={styles.whyMainCard}>
            <MaterialCommunityIcons name="headset" size={ms(24)} color={Colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.whyTitle}>Expert Assistance</Text>
              <Text style={styles.whyText}>Connect with our financial experts to get personalized guidance for your requirements.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
 
      {/* Sticky Bottom CTA */}
      <View style={[styles.ctaFooter, { paddingBottom: insets.bottom + sh(16) }]}>
        <LinearGradient
          colors={[Colors.primary, '#3A9BC8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}>
          <Pressable 
            style={styles.ctaBtn}
            onPress={() => router.push('/booking-call')}>
            <Ionicons name="call" size={ms(20)} color={Colors.white} />
            <Text style={styles.ctaBtnText}>BOOK CALL</Text>
          </Pressable>
        </LinearGradient>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.6)', // Lighter and cleaner
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,128,193,0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  heroSection: {
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  heroMainCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F2F4F7', // Matches card theme
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  serviceImage: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(0,0,0,0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F2F4F7', // Unified light gray
    padding: 14,
    borderRadius: 16,
  },
  checkIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  whySection: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  whyMainCard: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
    alignItems: 'center',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  whyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  whyText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 18,
    fontWeight: '500',
  },
  ctaFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaGradient: {
    borderRadius: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaBtn: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
