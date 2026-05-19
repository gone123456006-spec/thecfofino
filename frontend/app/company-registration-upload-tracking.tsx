import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { fetchMyRegistrations, type MyRegistrationItem } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { companyRegistrationUploadTrackingStyles as styles } from '@/styles/company-registration-upload-tracking.styles';
import {
  effectiveRegistrationStatus,
  isRegistrationTrackingEnded,
  registrationStatusLabel,
} from '@/utils/company-registration-status';
import { useSyncRegistrationAutoNotifications } from '@/hooks/useSyncRegistrationAutoNotifications';
import {
  getCachedRegistrations,
  registrationsCacheUserKey,
  setCachedRegistrations,
} from '@/utils/registrations-cache';

const POLL_INTERVAL_MS = 15_000;

function sortByNewest(a: MyRegistrationItem, b: MyRegistrationItem): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function statusChipStyle(reg: MyRegistrationItem) {
  const key = effectiveRegistrationStatus(reg);
  if (key === 'completed' || key === 'approved') {
    return { chip: styles.chipSuccess, text: styles.chipSuccessText };
  }
  if (key === 'rejected') return { chip: styles.chipWarning, text: styles.chipWarningText };
  if (key === 'pending' || key === 'submitted') {
    return { chip: styles.chipWarning, text: styles.chipWarningText };
  }
  return { chip: styles.chipProgress, text: styles.chipProgressText };
}

export default function CompanyRegistrationUploadTrackingScreen() {
  const router = useRouter();
  const { getToken, user } = useAuth();
  const regUserKey = registrationsCacheUserKey(user);
  const [registrations, setRegistrations] = useState<MyRegistrationItem[]>(() =>
    getCachedRegistrations(regUserKey),
  );
  const [loading, setLoading] = useState(
    () => getCachedRegistrations(regUserKey).length === 0,
  );
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
        setCachedRegistrations(registrationsCacheUserKey(user), list);
        setLastUpdated(new Date());
      } catch {
        /* keep */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, user?.email, user?.id],
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
      const userKey = registrationsCacheUserKey(user);
      const cached = getCachedRegistrations(userKey);
      if (cached.length > 0) {
        setRegistrations(cached);
        setLoading(false);
      }
      void fetchList(cached.length > 0);
      startPolling();
      return () => stopPolling();
    }, [fetchList, startPolling, stopPolling, user?.id, user?.email]),
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

  const renderFilingRow = (reg: MyRegistrationItem, ended: boolean) => {
    const chip = statusChipStyle(reg);
    return (
      <Pressable
        key={reg._id}
        style={({ pressed }) => [styles.googleListRow, pressed && styles.pressed]}
        onPress={() => openTracking(reg)}
        accessibilityRole="button">
        <View style={ended ? styles.googleIconWrapGreen : styles.googleIconWrapBlue}>
          <Ionicons
            name={ended ? 'checkmark-circle' : 'business-outline'}
            size={20}
            color={ended ? '#188038' : '#1a73e8'}
          />
        </View>
        <View style={styles.googleListBody}>
          <Text style={styles.googleListTitle} numberOfLines={2}>
            {reg.proposedName1?.trim() || 'Company registration'}
          </Text>
          {reg.caseId ? (
            <Text style={styles.googleListSub} numberOfLines={1}>
              {reg.caseId}
            </Text>
          ) : null}
          <View style={[styles.statusChip, chip.chip]}>
            <Text style={[styles.statusChipText, chip.text]}>{registrationStatusLabel(reg)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#80868b" />
      </Pressable>
    );
  };

  if (loading && registrations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading filings…</Text>
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
          colors={['#1a73e8']}
          tintColor="#1a73e8"
        />
      }>
      <Text style={styles.pageSub}>Add a new company or open an existing filing.</Text>

      {hasActive ? (
        <View style={[styles.liveChip, !isLivePolling && styles.liveChipOff]}>
          <View style={[styles.liveDot, !isLivePolling && styles.liveDotOff]} />
          <Text style={[styles.liveChipText, !isLivePolling && styles.liveChipTextOff]}>
            {isLivePolling ? 'Live updates on' : 'Updates paused'}
          </Text>
        </View>
      ) : null}

      <View style={styles.googleCard}>
        <Pressable
          style={({ pressed }) => [styles.googleListRow, pressed && styles.pressed]}
          onPress={() => router.push('/company-registration')}
          accessibilityLabel="Start new company registration">
          <View style={styles.googleIconWrapBlue}>
            <Ionicons name="add" size={22} color="#1a73e8" />
          </View>
          <View style={styles.googleListBody}>
            <Text style={styles.googleListTitle}>New registration</Text>
            <Text style={styles.googleListSub}>Starts a separate application</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#80868b" />
        </Pressable>

        {registrations.length === 0 ? (
          <>
            <View style={styles.googleListDivider} />
            <View style={styles.emptyInline}>
              <Ionicons name="folder-open-outline" size={32} color="#80868b" />
              <Text style={styles.emptyTitle}>No filings yet</Text>
              <Text style={styles.emptySub}>Tap New registration above to get started.</Text>
            </View>
          </>
        ) : (
          <>
            {activeRegs.length > 0 ? (
              <>
                <View style={styles.googleListDivider} />
                <Text style={styles.googleSectionLabel}>IN PROGRESS</Text>
                {activeRegs.map((reg, index) => (
                  <View key={reg._id}>
                    {index > 0 ? <View style={styles.googleListDividerInset} /> : null}
                    {renderFilingRow(reg, false)}
                  </View>
                ))}
              </>
            ) : null}
            {endedRegs.length > 0 ? (
              <>
                <View style={styles.googleListDivider} />
                <Text style={styles.googleSectionLabel}>COMPLETED</Text>
                {endedRegs.map((reg, index) => (
                  <View key={reg._id}>
                    {index > 0 ? <View style={styles.googleListDividerInset} /> : null}
                    {renderFilingRow(reg, true)}
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </View>

      {lastUpdated ? (
        <Text style={styles.footerNote}>
          Last updated {lastUpdated.toLocaleTimeString()}
          {hasActive && isLivePolling ? ' · refreshes automatically' : ''}
        </Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.googleTextBtn, pressed && styles.pressed]}
        onPress={() => {
          setRefreshing(true);
          void fetchList();
        }}
        disabled={refreshing}>
        <Text style={styles.googleTextBtnLabel}>{refreshing ? 'Refreshing…' : 'Refresh now'}</Text>
      </Pressable>
    </ScrollView>
  );
}
