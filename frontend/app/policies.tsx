import { Colors } from '@/constants/theme';
import { ms, sh, sw } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PoliciesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Finovert policies and legal documents are available in the app. Tap below to read each document in full.
        </Text>

        <Pressable style={styles.row} onPress={() => router.push('/terms')}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Terms & Conditions</Text>
            <Text style={styles.rowSub}>Service terms and user obligations</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/privacy')}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Privacy Policy</Text>
            <Text style={styles.rowSub}>How we collect, use, and protect your data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    padding: sw(24),
    paddingBottom: sh(40),
  },
  lead: {
    fontSize: ms(15),
    lineHeight: ms(24),
    color: Colors.textSecondary,
    marginBottom: sh(24),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: Colors.background,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: ms(15), fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  rowSub: { fontSize: ms(12), color: Colors.textMuted },
});
