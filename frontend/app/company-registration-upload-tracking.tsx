import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { fetchMyRegistrations } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { companyRegistrationUploadTrackingStyles as styles } from '@/styles/company-registration-upload-tracking.styles';
import { loadCompanyRegistrationState } from '@/utils/company-registration-draft';

const TRACKER_STEPS = [
  { key: 'document_submitted', label: 'Your Document Submitted', sublabel: 'We have received your documents' },
  { key: 'submitted', label: 'Submitted', sublabel: 'Application submitted to authority' },
  { key: 'initiated', label: 'Initiated', sublabel: 'Process initiated' },
  { key: 'filed', label: 'Filed', sublabel: 'Name filed with MCA' },
  { key: 'approved', label: 'Approved', sublabel: 'Application approved' },
] as const;

function getStepDone(serverStatus: string | null, hasSubmitted: boolean): Record<string, boolean> {
  const s = (serverStatus || '').toLowerCase();
  return {
    document_submitted: (hasSubmitted && s !== 'rejected') || (!!serverStatus && s !== 'rejected'),
    submitted: ['submitted', 'initiated', 'filed', 'approved'].includes(s),
    initiated: ['initiated', 'filed', 'approved'].includes(s),
    filed: ['filed', 'approved'].includes(s),
    approved: s === 'approved',
  };
}

export default function CompanyRegistrationUploadTrackingScreen() {
  const { getToken } = useAuth();
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const state = await loadCompanyRegistrationState();
      setHasSubmitted(state.status !== 'not_started' && state.status !== 'draft');
      const token = await getToken();
      if (!token) {
        setServerStatus(null);
        return;
      }
      const list = await fetchMyRegistrations(token);
      const latest = list[0];
      setServerStatus(latest?.status ?? null);
    } catch (_) {
      setServerStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void fetchStatus();
    }, [fetchStatus]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchStatus();
  };

  const stepDone = getStepDone(serverStatus, hasSubmitted);
  const isRejected = serverStatus?.toLowerCase() === 'rejected';

  if (loading && !serverStatus) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading status…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }>
      <View style={styles.headerCard}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="document-text" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Real-time Status Tracker</Text>
        <Text style={styles.headerSubtitle}>
          Status is updated from the dashboard. Pull down or tap Refresh to see the latest.
        </Text>
      </View>

      {isRejected && (
        <View style={styles.rejectedBanner}>
          <Ionicons name="alert-circle" size={22} color="#b91c1c" />
          <Text style={styles.rejectedText}>Application rejected. Contact support for details.</Text>
        </View>
      )}

      <View style={styles.timelineCard}>
        {TRACKER_STEPS.map((step, index) => {
          const done = hasSubmitted && stepDone[step.key];
          const prevDone = index > 0 ? stepDone[TRACKER_STEPS[index - 1].key] : true;
          const current = hasSubmitted && !done && (index === 0 || prevDone);
          const isLast = index === TRACKER_STEPS.length - 1;

          return (
            <View key={step.key} style={styles.stepWrap}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepCircle, done && styles.stepCircleDone, current && styles.stepCircleCurrent]}>
                  {done ? (
                    <Ionicons name="checkmark" size={20} color={Colors.white} />
                  ) : (
                    <Text style={[styles.stepNumber, current && { color: Colors.white }]}>{index + 1}</Text>
                  )}
                </View>
                {!isLast && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, !done && styles.stepLabelPending]}>{step.label}</Text>
                <Text style={styles.stepSublabel}>{step.sublabel}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color={Colors.textOnPrimary} />
        ) : (
          <>
            <Ionicons name="refresh" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.refreshBtnText}>Refresh status</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
