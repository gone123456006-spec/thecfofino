import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSyncRegistrationAutoNotifications } from '@/hooks/useSyncRegistrationAutoNotifications';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { fetchMyRegistrationsSummary, type MyRegistrationItem } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { createTransactionsStyles } from '@/styles/transactions.styles';
import { useScalers } from '@/utils/responsive';
import {
  clearRegistrationsCache,
  getCachedPaidRegistrations,
  registrationsCacheUserKey,
  setCachedRegistrations,
} from '@/utils/registrations-cache';

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

function paidIso(item: MyRegistrationItem): string {
  return item.paidAt || item.updatedAt || item.createdAt;
}

function formatActivityTime(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function activityGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function activityTitle(item: MyRegistrationItem): string {
  if (item.paymentStatus === 'partial') return 'Partial payment';
  return 'Payment received';
}

function activitySubtitle(item: MyRegistrationItem): string {
  const name = item.proposedName1?.trim() || 'Company registration';
  const caseLine = item.caseId ? ` · ${item.caseId}` : '';
  return `${name}${caseLine} · ${formatMethod(item.paymentMethod)}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const scalers = useScalers();
  const styles = useMemo(() => createTransactionsStyles(scalers), [scalers]);
  const { getToken, sessionGeneration, user } = useAuth();
  const syncRegistrationAutoNotifications = useSyncRegistrationAutoNotifications();
  const regUserKey = registrationsCacheUserKey(user);
  const [rows, setRows] = useState<MyRegistrationItem[]>(() => getCachedPaidRegistrations(regUserKey));
  const [loading, setLoading] = useState(() => getCachedPaidRegistrations(regUserKey).length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        const userKey = registrationsCacheUserKey(user);
        if (!silent && getCachedPaidRegistrations(userKey).length === 0) setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) {
          if (!silent) setRows([]);
          return;
        }
        const list = await fetchMyRegistrationsSummary(token);
        setCachedRegistrations(userKey, list);
        syncRegistrationAutoNotifications(list);
        const paid = list
          .filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'partial')
          .sort((a, b) => paidTimestamp(b) - paidTimestamp(a));
        setRows(paid);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load transactions.');
        if (!silent) {
          setRows((prev) => (prev.length > 0 ? prev : []));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, syncRegistrationAutoNotifications, user?.email, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      const userKey = registrationsCacheUserKey(user);
      const cachedPaid = getCachedPaidRegistrations(userKey);
      if (cachedPaid.length > 0) {
        setRows(cachedPaid);
        setLoading(false);
      }
      void load(cachedPaid.length > 0);
    }, [load, user?.id, user?.email]),
  );

  useEffect(() => {
    clearRegistrationsCache();
    const cachedPaid = getCachedPaidRegistrations(registrationsCacheUserKey(user));
    setRows(cachedPaid);
    setLoading(cachedPaid.length === 0);
    setError(null);
    void load(cachedPaid.length > 0);
  }, [sessionGeneration, user?.email]);

  const grouped = useMemo(() => {
    const map = new Map<string, MyRegistrationItem[]>();
    for (const item of rows) {
      const label = activityGroupLabel(paidIso(item));
      const list = map.get(label) ?? [];
      list.push(item);
      map.set(label, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.muted}>Loading activity…</Text>
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
          colors={['#1a73e8']}
          tintColor="#1a73e8"
        />
      }>
      <Text style={styles.pageSub}>Confirmations for payments made in the app.</Text>

      {rows.length > 0 ? (
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipText}>
            {rows.length} payment{rows.length === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length === 0 && !error ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={28} color="#5f6368" />
          </View>
          <Text style={styles.emptyTitle}>No payment activity</Text>
          <Text style={styles.emptyBody}>
            When you complete a payment for company registration, it will show here — like your
            Google account activity.
          </Text>
        </View>
      ) : (
        <View style={styles.googleCard}>
          {grouped.map(([label, items], groupIndex) => (
            <View key={label}>
              {groupIndex > 0 ? <View style={styles.dividerFull} /> : null}
              <Text style={[styles.sectionLabel, groupIndex === 0 && styles.sectionLabelFirst]}>
                {label.toUpperCase()}
              </Text>
              {items.map((item, index) => {
                const amt =
                  item.paymentAmount != null && item.paymentAmount > 0
                    ? item.paymentAmount
                    : null;
                const isPartial = item.paymentStatus === 'partial';
                return (
                  <View key={item._id}>
                    {index > 0 ? <View style={styles.dividerInset} /> : null}
                    <Pressable
                      style={({ pressed }) => [
                        styles.activityRow,
                        pressed && styles.activityRowPressed,
                      ]}
                      onPress={() =>
                        router.push(`/company-registration-tracking/${item._id}` as any)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${activityTitle(item)}, ${activitySubtitle(item)}`}>
                      <View style={isPartial ? styles.iconWrapPartial : styles.iconWrapSuccess}>
                        <Ionicons
                          name={isPartial ? 'ellipse-outline' : 'checkmark-circle'}
                          size={22}
                          color={isPartial ? '#b06000' : '#188038'}
                        />
                      </View>
                      <View style={styles.activityBody}>
                        <Text style={styles.activityTitle}>{activityTitle(item)}</Text>
                        <Text style={styles.activityMeta} numberOfLines={2}>
                          {activitySubtitle(item)}
                        </Text>
                        <Text style={styles.activityTime}>
                          {formatActivityTime(paidIso(item))}
                          {item.paymentReference
                            ? ` · Ref ${item.paymentReference.slice(0, 12)}${item.paymentReference.length > 12 ? '…' : ''}`
                            : ''}
                        </Text>
                      </View>
                      {amt != null ? (
                        <View style={styles.amountCol}>
                          <Text style={[styles.amountText, isPartial && styles.amountPartial]}>
                            ₹{amt.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
