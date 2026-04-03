import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchMyRegistrations, type MyRegistrationItem } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { isRegistrationTrackingEnded, registrationStatusLabel } from '@/utils/company-registration-status';
import { useSyncRegistrationAutoNotifications } from '@/hooks/useSyncRegistrationAutoNotifications';

const POLL_INTERVAL_MS = 15_000;
const HAIR = StyleSheet.hairlineWidth;

function sortByNewest(a: MyRegistrationItem, b: MyRegistrationItem): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function CompanyRegistrationUploadTrackingScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [registrations, setRegistrations] = useState<MyRegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLivePolling, setIsLivePolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRegistrationAutoNotifications = useSyncRegistrationAutoNotifications();

  const fetchList = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const token = await getToken();
        if (!token) {
          setRegistrations([]);
          return;
        }
        const list = await fetchMyRegistrations(token);
        setRegistrations(list);
        setLastUpdated(new Date());
      } catch (_) {
        /* keep */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken],
  );

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setIsLivePolling(true);
    pollRef.current = setInterval(() => {
      void fetchList(true);
    }, POLL_INTERVAL_MS);
  }, [fetchList]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsLivePolling(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchList();
      startPolling();
      return () => stopPolling();
    }, [fetchList, startPolling, stopPolling]),
  );

  const { activeRegs, endedRegs } = useMemo(() => {
    const active = registrations.filter((r) => !isRegistrationTrackingEnded(r)).sort(sortByNewest);
    const ended = registrations.filter((r) => isRegistrationTrackingEnded(r)).sort(sortByNewest);
    return { activeRegs: active, endedRegs: ended };
  }, [registrations]);

  const hasActive = activeRegs.length > 0;

  useEffect(() => {
    if (registrations.length === 0) return;
    if (registrations.every(isRegistrationTrackingEnded)) stopPolling();
  }, [registrations, stopPolling]);

  useEffect(() => {
    syncRegistrationAutoNotifications(registrations);
  }, [registrations, syncRegistrationAutoNotifications]);

  const openTracking = (reg: MyRegistrationItem) => {
    router.push(`/company-registration-tracking/${reg._id}` as any);
  };

  if (loading && registrations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void fetchList();
          }}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }>
      <Text style={styles.pageTitle}>Filings</Text>
      <Text style={styles.pageSub}>Add a new company or open an existing filing.</Text>

      <Pressable
        style={({ pressed }) => [styles.newRow, pressed && styles.pressed]}
        onPress={() => router.push('/company-registration')}
        accessibilityLabel="Start new company registration">
        <View style={styles.newIconCircle}>
          <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
        </View>
        <View style={styles.newTextCol}>
          <Text style={styles.newTitle}>New registration</Text>
          <Text style={styles.newCaption}>Starts a separate application</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </Pressable>

      {registrations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No filings yet</Text>
          <Text style={styles.emptySub}>Use New registration above.</Text>
        </View>
      ) : null}

      {activeRegs.length > 0 ? (
        <>
          <Text style={styles.section}>Active</Text>
          {activeRegs.map((reg) => (
            <Pressable
              key={reg._id}
              style={({ pressed }) => [styles.listCard, styles.listCardActive, pressed && styles.pressed]}
              onPress={() => openTracking(reg)}>
              <View style={styles.listCardTop}>
                <Text style={styles.listTitle} numberOfLines={2}>
                  {reg.proposedName1?.trim() || 'Company'}
                </Text>
                <View style={[styles.pill, !isLivePolling && styles.pillMuted]}>
                  <View style={[styles.pillDot, !isLivePolling && styles.pillDotMuted]} />
                  <Text style={[styles.pillLabel, !isLivePolling && styles.pillLabelMuted]}>
                    {hasActive && isLivePolling ? 'Updating' : 'Idle'}
                  </Text>
                </View>
              </View>
              <Text style={styles.listMeta}>
                {reg.caseId ? `${reg.caseId} · ` : ''}
                {registrationStatusLabel(reg)}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {endedRegs.length > 0 ? (
        <>
          <Text style={[styles.section, activeRegs.length > 0 && styles.sectionSpaced]}>Completed</Text>
          {endedRegs.map((reg) => (
            <Pressable
              key={reg._id}
              style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}
              onPress={() => openTracking(reg)}>
              <View style={styles.listCardTop}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {reg.proposedName1?.trim() || 'Company'}
                </Text>
                <Ionicons name="checkmark-circle-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.listMeta}>
                {reg.caseId ? `${reg.caseId} · ` : ''}
                {registrationStatusLabel(reg)}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {lastUpdated ? (
        <Text style={styles.synced}>
          {lastUpdated.toLocaleTimeString()}
          {hasActive && isLivePolling ? ' · syncs periodically' : ''}
        </Text>
      ) : null}

      <Pressable
        style={[styles.refreshBtn, refreshing && styles.refreshBtnDisabled]}
        onPress={() => {
          setRefreshing(true);
          void fetchList();
        }}
        disabled={refreshing}>
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 15, fontWeight: '400', color: Colors.textMuted },
  pageTitle: { fontSize: 28, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.6, marginBottom: 6 },
  pageSub: { fontSize: 15, fontWeight: '400', color: Colors.textMuted, lineHeight: 20, marginBottom: 24 },
  section: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionSpaced: { marginTop: 22 },
  pressed: { opacity: 0.72 },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: HAIR,
    borderColor: Colors.borderLight,
    marginBottom: 24,
  },
  newIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTextCol: { flex: 1 },
  newTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.2 },
  newCaption: { fontSize: 13, fontWeight: '400', color: Colors.textMuted, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptySub: { fontSize: 14, fontWeight: '400', color: Colors.textMuted },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: HAIR,
    borderColor: Colors.borderLight,
  },
  listCardActive: {
    borderColor: Colors.border,
  },
  listCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  listTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.2 },
  listMeta: { fontSize: 14, fontWeight: '400', color: Colors.textMuted, lineHeight: 19 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: Colors.surfaceLight,
  },
  pillMuted: { backgroundColor: Colors.surface },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.whatsapp },
  pillDotMuted: { backgroundColor: Colors.textMuted },
  pillLabel: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  pillLabelMuted: { color: Colors.textMuted },
  synced: { fontSize: 12, fontWeight: '400', color: Colors.textMuted, textAlign: 'center', marginTop: 16, marginBottom: 12 },
  refreshBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    borderWidth: HAIR,
    borderColor: Colors.borderLight,
  },
  refreshBtnDisabled: { opacity: 0.55 },
  refreshBtnText: { fontSize: 17, fontWeight: '600', color: Colors.primary },
});
