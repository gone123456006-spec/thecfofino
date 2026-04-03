import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import {
  ActiveRegistrationPanel,
  EndedRegistrationPanel,
  RegistrationDocumentsSection,
  downloadRegistrationDocument,
} from '@/components/company-registration/RegistrationTrackerPanels';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { isRegistrationTrackingEnded } from '@/utils/company-registration-status';
import { useSyncRegistrationAutoNotifications } from '@/hooks/useSyncRegistrationAutoNotifications';

const POLL_INTERVAL_MS = 15_000;

export default function CompanyRegistrationTrackingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [item, setItem] = useState<MyRegistrationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isLivePolling, setIsLivePolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRegistrationAutoNotifications = useSyncRegistrationAutoNotifications();

  const regId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const load = useCallback(
    async (silent = false) => {
      if (!regId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        const token = await getToken();
        if (!token) {
          setItem(null);
          setNotFound(true);
          return;
        }
        const list = await fetchMyRegistrations(token);
        const found = list.find((r) => String(r._id) === regId) ?? null;
        setItem(found);
        setNotFound(!found);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, regId],
  );

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setIsLivePolling(true);
    pollRef.current = setInterval(() => {
      void load(true);
    }, POLL_INTERVAL_MS);
  }, [load]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsLivePolling(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => stopPolling();
    }, [load, stopPolling]),
  );

  const ended = useMemo(() => (item ? isRegistrationTrackingEnded(item) : false), [item]);

  useEffect(() => {
    if (!item || ended) {
      stopPolling();
      return;
    }
    startPolling();
    return () => stopPolling();
  }, [item, ended, startPolling, stopPolling]);

  useEffect(() => {
    if (item) syncRegistrationAutoNotifications([item]);
  }, [item, syncRegistrationAutoNotifications]);

  if (loading && !item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.muted}>Loading filing…</Text>
      </View>
    );
  }

  if (notFound || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Filing not found</Text>
        <Text style={styles.muted}>It may have been removed or you may need to sign in again.</Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/company-registration-upload-tracking')}>
          <Text style={styles.btnText}>Back to my filings</Text>
        </Pressable>
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
            void load(true);
          }}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }>
      {ended ? (
        <>
          <EndedRegistrationPanel item={item} />
          <RegistrationDocumentsSection item={item} onDownload={downloadRegistrationDocument} />
        </>
      ) : (
        <ActiveRegistrationPanel
          item={item}
          isLivePolling={isLivePolling && !ended}
          onDownload={downloadRegistrationDocument}
        />
      )}
      <Pressable style={styles.linkRow} onPress={() => router.push('/company-registration-upload-tracking')}>
        <Text style={styles.linkText}>All filings</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.3 },
  muted: { fontSize: 15, fontWeight: '400', color: Colors.textMuted, textAlign: 'center', lineHeight: 21 },
  btn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: Colors.textOnPrimary, fontWeight: '600', fontSize: 17 },
  linkRow: { marginTop: 20, alignSelf: 'center', paddingVertical: 8 },
  linkText: { fontSize: 17, fontWeight: '500', color: Colors.primary },
});
