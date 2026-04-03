import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useSyncRegistrationAutoNotifications } from '@/hooks/useSyncRegistrationAutoNotifications';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { fetchMyRegistrationsSummary, type MyRegistrationItem } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

const HAIR = StyleSheet.hairlineWidth;

function formatMethod(method?: string): string {
  if (!method?.trim()) return 'Online';
  const m = method.toLowerCase();
  if (m === 'razorpay') return 'Razorpay';
  return method.replace(/_/g, ' ');
}

function paidTimestamp(item: MyRegistrationItem): number {
  if (item.paidAt) return new Date(item.paidAt).getTime();
  if (item.updatedAt) return new Date(item.updatedAt).getTime();
  return new Date(item.createdAt).getTime();
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function paymentMessage(item: MyRegistrationItem): { title: string; body: string } {
  const name = item.proposedName1?.trim() || 'Your application';
  const caseLine = item.caseId ? `Case ${item.caseId}` : null;
  const amt = item.paymentAmount != null && item.paymentAmount > 0 ? item.paymentAmount : null;
  const amountDisplay = amt != null ? `₹${amt.toLocaleString('en-IN')}` : null;
  const method = formatMethod(item.paymentMethod);
  const when = formatWhen(item.paidAt || item.updatedAt || item.createdAt);

  if (item.paymentStatus === 'partial') {
    return {
      title: 'Partial payment received',
      body:
        `${amountDisplay ? `${amountDisplay} recorded ` : 'A payment was recorded '}for company registration (${name}).` +
        (caseLine ? ` ${caseLine}.` : '') +
        (when ? ` ${when}.` : '') +
        ` Via ${method}.`,
    };
  }

  return {
    title: 'Payment received',
    body:
      `Thank you — we received ${amountDisplay ? `${amountDisplay} ` : 'your payment '}for company registration: ${name}.` +
      (caseLine ? ` ${caseLine}.` : '') +
      (when ? ` ${when}.` : '') +
      ` Paid via ${method}.`,
  };
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const syncRegistrationAutoNotifications = useSyncRegistrationAutoNotifications();
  const [rows, setRows] = useState<MyRegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) {
          setRows([]);
          return;
        }
        const list = await fetchMyRegistrationsSummary(token);
        syncRegistrationAutoNotifications(list);
        const paid = list
          .filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'partial')
          .sort((a, b) => paidTimestamp(b) - paidTimestamp(a));
        setRows(paid);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load transactions.');
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, syncRegistrationAutoNotifications],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const emptyHint = useMemo(
    () =>
      'When you complete a payment (for example company registration), a confirmation message will appear here.',
    [],
  );

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(true);
          }}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }>
      <Text style={styles.title}>Payment activity</Text>
      <Text style={styles.subtitle}>Confirmations for payments made in the app.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length === 0 && !error ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No payments yet</Text>
          <Text style={styles.emptyBody}>{emptyHint}</Text>
        </View>
      ) : null}

      {rows.map((item) => {
        const { title, body } = paymentMessage(item);
        return (
          <View key={item._id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconWrap}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardBody}>{body}</Text>
              </View>
            </View>
            {item.paymentReference ? (
              <Text style={styles.ref}>Reference: {item.paymentReference}</Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.72 }]}
              onPress={() => router.push(`/company-registration-tracking/${item._id}` as any)}>
              <Text style={styles.linkText}>View filing</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.surface },
  muted: { fontSize: 15, color: Colors.textMuted },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, fontWeight: '400', color: Colors.textMuted, lineHeight: 20, marginBottom: 20 },
  error: { fontSize: 14, color: '#b42318', marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 10, paddingHorizontal: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyBody: { fontSize: 14, fontWeight: '400', color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: HAIR,
    borderColor: Colors.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.2, marginBottom: 6 },
  cardBody: { fontSize: 15, fontWeight: '400', color: Colors.textSecondary, lineHeight: 22 },
  ref: { fontSize: 12, fontWeight: '400', color: Colors.textMuted, marginTop: 12 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: HAIR,
    borderTopColor: Colors.divider,
  },
  linkText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
