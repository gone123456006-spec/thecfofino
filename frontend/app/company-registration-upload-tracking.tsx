import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { fetchMyRegistrations } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { loadCompanyRegistrationState } from '@/utils/company-registration-draft';

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 15_000; // re-fetch from server every 15 s

const TRACKER_STEPS = [
  {
    key: 'document_submitted',
    label: 'Documents Submitted',
    sublabel: 'We have received your documents',
    icon: 'cloud-upload-outline',
  },
  {
    key: 'submitted',
    label: 'Application Submitted',
    sublabel: 'Application submitted to authority',
    icon: 'send-outline',
  },
  {
    key: 'initiated',
    label: 'Process Initiated',
    sublabel: 'Filing process has begun',
    icon: 'play-circle-outline',
  },
  {
    key: 'filed',
    label: 'Filed with MCA',
    sublabel: 'Name filed with Ministry of Corporate Affairs',
    icon: 'document-attach-outline',
  },
  {
    key: 'approved',
    label: 'Approved',
    sublabel: 'Application approved — incorporation complete!',
    icon: 'ribbon-outline',
  },
] as const;

type StepKey = (typeof TRACKER_STEPS)[number]['key'];

// Maps every known dashboard status string → which steps are complete
const STATUS_MAP: Record<string, StepKey[]> = {
  // local states
  draft: [],
  payment_pending: [],
  paid: ['document_submitted'],
  upload_in_progress: ['document_submitted'],
  // server states
  submitted: ['document_submitted', 'submitted'],
  initiated: ['document_submitted', 'submitted', 'initiated'],
  filed: ['document_submitted', 'submitted', 'initiated', 'filed'],
  approved: ['document_submitted', 'submitted', 'initiated', 'filed', 'approved'],
  completed: ['document_submitted', 'submitted', 'initiated', 'filed', 'approved'],
  rejected: ['document_submitted'],
};

function resolveStepsDone(status: string | null): Record<StepKey, boolean> {
  const key = (status || '').toLowerCase();
  const done = STATUS_MAP[key] || [];
  return {
    document_submitted: done.includes('document_submitted'),
    submitted: done.includes('submitted'),
    initiated: done.includes('initiated'),
    filed: done.includes('filed'),
    approved: done.includes('approved'),
  };
}

// Status badge display config
const STATUS_DISPLAY: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  draft: { label: 'Draft', color: '#92400e', bg: '#fef3c7', icon: 'create-outline' },
  payment_pending: { label: 'Payment Pending', color: '#92400e', bg: '#fef3c7', icon: 'time-outline' },
  paid: { label: 'Paid', color: '#065f46', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  submitted: { label: 'Submitted', color: '#1e40af', bg: '#dbeafe', icon: 'send-outline' },
  initiated: { label: 'Initiated', color: '#5b21b6', bg: '#ede9fe', icon: 'play-circle-outline' },
  filed: { label: 'Filed', color: '#1e3a8a', bg: '#dbeafe', icon: 'document-attach-outline' },
  approved: { label: 'Approved ✓', color: '#065f46', bg: '#d1fae5', icon: 'ribbon-outline' },
  completed: { label: 'Completed ✓', color: '#065f46', bg: '#d1fae5', icon: 'checkmark-done-circle-outline' },
  rejected: { label: 'Rejected', color: '#991b1b', bg: '#fee2e2', icon: 'close-circle-outline' },
};

// ─── Pulse animation for "current" step ──────────────────────────────────────

function PulseCircle() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.35, duration: 800, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.ease, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        ts.pulseRing,
        { transform: [{ scale: anim }], opacity: anim.interpolate({ inputRange: [1, 1.35], outputRange: [0.45, 0] }) },
      ]}
    />
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocCard({
  uri,
  label,
  directorIndex,
  docType,
  onDownload,
}: {
  uri: string | null;
  label: string;
  directorIndex: number;
  docType: string;
  onDownload: (uri: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!uri) {
    return (
      <View style={ds.missing}>
        <Ionicons name="document-outline" size={24} color="#d1d5db" />
        <Text style={ds.missingText}>Not uploaded</Text>
      </View>
    );
  }
  const isPdf = uri.includes('application/pdf') || uri.toLowerCase().endsWith('.pdf');
  return (
    <View style={ds.card}>
      <Pressable style={ds.previewArea} onPress={() => !isPdf && setExpanded(true)}>
        {isPdf ? (
          <View style={ds.pdfPlaceholder}>
            <Ionicons name="document-text" size={36} color="#ef4444" />
            <Text style={ds.pdfText}>PDF</Text>
          </View>
        ) : (
          <>
            <Image source={{ uri }} style={ds.img} resizeMode="cover" />
            <View style={ds.expandHint}>
              <Ionicons name="expand-outline" size={13} color="#fff" />
            </View>
          </>
        )}
      </Pressable>
      <View style={ds.footer}>
        <View>
          <Text style={ds.footerLabel}>{label}</Text>
          <Text style={ds.footerSub}>{isPdf ? 'PDF document' : 'Image file'}</Text>
        </View>
        <Pressable
          style={ds.dlBtn}
          onPress={() => onDownload(uri, `Director_${directorIndex + 1}_${docType}`)}>
          <Ionicons name="download-outline" size={15} color="#6366f1" />
        </Pressable>
      </View>

      {/* Lightbox */}
      {expanded && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
          <Pressable style={ds.lightboxBg} onPress={() => setExpanded(false)}>
            <Image source={{ uri }} style={ds.lightboxImg} resizeMode="contain" />
            <Pressable style={ds.lightboxClose} onPress={() => setExpanded(false)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompanyRegistrationUploadTrackingScreen() {
  const { getToken } = useAuth();

  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string>('draft');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [directors, setDirectors] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [proposedName1, setProposedName1] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLivePolling, setIsLivePolling] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);

        // 1. Always read local state first (instant)
        const state = await loadCompanyRegistrationState();
        setLocalStatus(state.status ?? 'draft');
        if (state.draft?.caseId) setCaseId(state.draft.caseId);
        if (state.draft?.directors) setDirectors(state.draft.directors);

        // 2. Then hit server for latest status
        const token = await getToken();
        if (token) {
          const list = await fetchMyRegistrations(token);
          const latest = list?.[0];
          if (latest?.status) setServerStatus(latest.status.toLowerCase());
          if (latest?.caseId && !caseId) setCaseId(latest.caseId);
          if (latest?.paymentAmount !== undefined) setPaymentAmount(latest.paymentAmount);
          if (latest?.paymentStatus) setPaymentStatus(latest.paymentStatus);
          if (latest?.businessType) setBusinessType(latest.businessType);
          if (latest?.proposedName1) setProposedName1(latest.proposedName1);
          // Merge latest director docs if server has them
          if (latest?.directors?.length) setDirectors(latest.directors);
        }

        setLastUpdated(new Date());
      } catch (_) {
        // silently ignore — show stale data
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, caseId],
  );

  // ── Auto-polling ───────────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setIsLivePolling(true);
    pollRef.current = setInterval(() => {
      void fetchStatus(true); // silent refresh
    }, POLL_INTERVAL_MS);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsLivePolling(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchStatus();
      startPolling();
      return () => stopPolling();
    }, [fetchStatus, startPolling, stopPolling]),
  );

  // Stop polling once approved / rejected
  useEffect(() => {
    const s = (serverStatus ?? '').toLowerCase();
    if (s === 'approved' || s === 'completed' || s === 'rejected') {
      stopPolling();
    }
  }, [serverStatus, stopPolling]);

  // ── Derived state ─────────────────────────────────────────────────────────

  // Prefer server status when available, else use local
  const effectiveStatus = serverStatus ?? localStatus;
  const stepsDone = resolveStepsDone(effectiveStatus);
  const isRejected = effectiveStatus === 'rejected';
  const isApproved = effectiveStatus === 'approved' || effectiveStatus === 'completed';
  const statusDisplay = STATUS_DISPLAY[effectiveStatus] ?? STATUS_DISPLAY['draft'];

  const completedCount = Object.values(stepsDone).filter(Boolean).length;
  const progressPct = Math.round((completedCount / TRACKER_STEPS.length) * 100);

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async (base64DataUrl: string, fileName: string) => {
    if (!base64DataUrl?.startsWith('data:')) {
      Alert.alert('Error', 'Invalid document format.');
      return;
    }
    try {
      const parts = base64DataUrl.split(',');
      const meta = parts[0];
      const base64Content = parts[1];
      let ext = '.jpg';
      if (meta.includes('application/pdf')) ext = '.pdf';
      else if (meta.includes('image/png')) ext = '.png';
      else if (meta.includes('image/jpeg')) ext = '.jpg';

      const fileUri = (FileSystem.documentDirectory ?? '') + fileName + ext;
      await FileSystem.writeAsStringAsync(fileUri, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Saved', 'File saved to app documents.');
      }
    } catch {
      Alert.alert('Error', 'Failed to save or share the document.');
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading && !serverStatus && !localStatus) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Loading status…</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void fetchStatus(); }}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }>

      {/* ── Header ── */}
      <View style={s.headerCard}>
        <View style={s.headerTop}>
          <View style={s.headerIcon}>
            <Ionicons name="analytics-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Filing Tracker</Text>
            {caseId ? <Text style={s.caseId}>Case ID: {caseId}</Text> : null}
          </View>
          {/* Live badge */}
          <View style={[s.liveBadge, !isLivePolling && s.liveBadgeOff]}>
            <View style={[s.liveDot, !isLivePolling && s.liveDotOff]} />
            <Text style={[s.liveText, !isLivePolling && s.liveTextOff]}>
              {isLivePolling ? 'LIVE' : 'PAUSED'}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={[s.statusBadge, { backgroundColor: statusDisplay.bg }]}>
          <Ionicons name={statusDisplay.icon as any} size={15} color={statusDisplay.color} />
          <Text style={[s.statusBadgeText, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>{completedCount} of {TRACKER_STEPS.length} steps completed</Text>
          <Text style={s.progressPct}>{progressPct}%</Text>
        </View>

        {lastUpdated ? (
          <Text style={s.lastUpdated}>
            Last synced: {lastUpdated.toLocaleTimeString()} · auto-refreshes every 15s
          </Text>
        ) : null}
      </View>

      {/* ── Rejected banner ── */}
      {isRejected && (
        <View style={s.rejectedBanner}>
          <Ionicons name="alert-circle" size={20} color="#991b1b" />
          <Text style={s.rejectedText}>
            Application rejected. Please contact support or re-submit with corrected documents.
          </Text>
        </View>
      )}

      {/* ── Approved banner ── */}
      {isApproved && (
        <View style={s.approvedBanner}>
          <Ionicons name="ribbon" size={20} color="#065f46" />
          <Text style={s.approvedText}>
            🎉 Congratulations! Your company incorporation is approved and complete.
          </Text>
        </View>
      )}

      {/* ── Review & Payment ── */}
      {(paymentAmount !== null || paymentStatus) && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="card-outline" size={17} color="#6366f1" />
            <Text style={s.cardTitle}>Review & Payment</Text>
          </View>
          <View style={{ padding: 16 }}>
            <View style={ps.row}>
              <Text style={ps.label}>Company Name</Text>
              <Text style={ps.value}>{proposedName1 || '—'}</Text>
            </View>
            <View style={ps.row}>
              <Text style={ps.label}>Service</Text>
              <Text style={ps.value}>{businessType || 'Company Registration'}</Text>
            </View>
            <View style={[ps.row, { borderBottomWidth: 0, marginBottom: 12 }]}>
              <Text style={ps.label}>Total Fee</Text>
              <Text style={ps.amount}>₹{(paymentAmount ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            
            <View style={[ps.statusBox, paymentStatus === 'paid' ? ps.statusPaid : ps.statusUnpaid]}>
               <Text style={[ps.statusText, paymentStatus === 'paid' ? ps.statusTextPaid : ps.statusTextUnpaid]}>
                 {paymentStatus === 'paid' ? 'Payment Received' : paymentStatus === 'partial' ? 'Partial Payment Received' : 'Payment Pending'}
               </Text>
            </View>

            {paymentStatus !== 'paid' && (
              <Pressable style={ps.payBtn} onPress={() => Alert.alert('Payment Details', 'Account Name: Finovert Services\nBank: HDFC Bank\nIFSC: HDFC0001234\n\nPlease share the payment screenshot with your Case ID on support.')}>
                <Text style={ps.payBtnText}>PROCEED TO PAYMENT</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── Timeline ── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Ionicons name="git-branch-outline" size={17} color="#6366f1" />
          <Text style={s.cardTitle}>Step-by-Step Progress</Text>
        </View>

        {TRACKER_STEPS.map((step, index) => {
          const done = stepsDone[step.key];
          const prevKey = index > 0 ? TRACKER_STEPS[index - 1].key : null;
          const prevDone = prevKey ? stepsDone[prevKey] : true;
          const isCurrent = !done && prevDone && !isRejected;
          const isLast = index === TRACKER_STEPS.length - 1;

          return (
            <View key={step.key} style={ts.stepRow}>
              {/* Left column: circle + line */}
              <View style={ts.leftCol}>
                <View style={ts.circleWrap}>
                  {isCurrent && <PulseCircle />}
                  <View style={[ts.circle, done && ts.circleDone, isCurrent && ts.circleCurrent, isRejected && index === 0 && ts.circleDone]}>
                    {done || (isRejected && index === 0) ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : isCurrent ? (
                      <Ionicons name={step.icon as any} size={14} color="#fff" />
                    ) : (
                      <Text style={ts.stepNum}>{index + 1}</Text>
                    )}
                  </View>
                </View>
                {!isLast && <View style={[ts.line, done && ts.lineDone]} />}
              </View>

              {/* Right column: text */}
              <View style={[ts.contentCol, isLast && { paddingBottom: 0 }]}>
                <View style={ts.labelRow}>
                  <Text style={[ts.label, done && ts.labelDone, isCurrent && ts.labelCurrent]}>
                    {step.label}
                  </Text>
                  {done && (
                    <View style={ts.doneBadge}>
                      <Text style={ts.doneBadgeText}>Done</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={ts.inProgressBadge}>
                      <Text style={ts.inProgressText}>In Progress</Text>
                    </View>
                  )}
                </View>
                <Text style={ts.sublabel}>{step.sublabel}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Uploaded Documents ── */}
      {directors.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="folder-open-outline" size={17} color="#6366f1" />
            <Text style={s.cardTitle}>Uploaded Documents</Text>
          </View>

          {directors.map((director, di) => (
            <View key={`dir-${di}`} style={ds.directorBlock}>
              <View style={ds.directorHeader}>
                <View style={ds.directorAvatar}>
                  <Text style={ds.directorAvatarText}>{(director.name?.[0] ?? 'D').toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={ds.directorName}>{director.name || `Director ${di + 1}`}</Text>
                  <Text style={ds.directorMeta}>
                    PAN: {director.pan || '—'} · {director.shareholding || '—'}% shares
                  </Text>
                </View>
              </View>

              <View style={ds.docRow}>
                {/* 1/3: PAN */}
                <View style={[ds.docThird, { paddingRight: 6 }]}>
                  <DocCard
                    uri={director.panFileUri}
                    label="PAN Card"
                    directorIndex={di}
                    docType="PAN"
                    onDownload={handleDownload}
                  />
                </View>
                {/* 1/3: Aadhaar Front */}
                <View style={[ds.docThird, { paddingHorizontal: 3 }]}>
                  <DocCard
                    uri={director.aadhaarFrontFileUri}
                    label="Aadhaar Front"
                    directorIndex={di}
                    docType="AadhaarFront"
                    onDownload={handleDownload}
                  />
                </View>
                {/* 1/3: Aadhaar Back */}
                <View style={[ds.docThird, { paddingLeft: 6 }]}>
                  <DocCard
                    uri={director.aadhaarBackFileUri}
                    label="Aadhaar Back"
                    directorIndex={di}
                    docType="AadhaarBack"
                    onDownload={handleDownload}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Help / info ── */}
      <View style={[s.card, s.infoCard]}>
        <Ionicons name="information-circle-outline" size={18} color="#6366f1" />
        <Text style={s.infoText}>
          This tracker updates automatically every 15 seconds. When your agent changes the status in the Finovert dashboard, it will reflect here in real time. Pull down to force-refresh instantly.
        </Text>
      </View>

      {/* ── Refresh button ── */}
      <Pressable
        style={[s.refreshBtn, refreshing && s.refreshBtnDisabled]}
        onPress={() => { setRefreshing(true); void fetchStatus(); }}
        disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.refreshBtnText}>Force Refresh</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const INDIGO = '#6366f1';
const PAGE_BG = '#f5f5f7';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6b7280' },

  // Header card
  headerCard: { backgroundColor: '#1e1b4b', borderRadius: 18, padding: 18, marginBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  caseId: { fontSize: 11, color: '#a5b4fc', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.2)' },
  liveBadgeOff: { backgroundColor: 'rgba(156,163,175,0.2)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  liveDotOff: { backgroundColor: '#9ca3af' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#22c55e', letterSpacing: 1 },
  liveTextOff: { color: '#9ca3af' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 14 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },

  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: '#a5b4fc' },
  progressPct: { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  lastUpdated: { fontSize: 11, color: 'rgba(165,180,252,0.7)', marginTop: 8 },

  // Banners
  rejectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fee2e2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fca5a5' },
  rejectedText: { flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 18 },
  approvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#d1fae5', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#6ee7b7' },
  approvedText: { flex: 1, fontSize: 13, color: '#065f46', lineHeight: 18, fontWeight: '600' },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  // Info card
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: '#4b5563', lineHeight: 19 },

  // Refresh
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: INDIGO, paddingVertical: 15, borderRadius: 14, shadowColor: INDIGO, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  refreshBtnDisabled: { backgroundColor: '#c7d2fe' },
  refreshBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// Timeline styles
const ts = StyleSheet.create({
  stepRow: { flexDirection: 'row', paddingHorizontal: 16 },
  leftCol: { alignItems: 'center', marginRight: 14 },
  circleWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  pulseRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: INDIGO },
  circle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  circleDone: { backgroundColor: '#22c55e' },
  circleCurrent: { backgroundColor: INDIGO },
  line: { width: 2, flex: 1, minHeight: 24, backgroundColor: '#e5e7eb', marginTop: 2, marginBottom: 2 },
  lineDone: { backgroundColor: '#22c55e' },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  contentCol: { flex: 1, paddingTop: 12, paddingBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  labelDone: { color: '#111827' },
  labelCurrent: { color: INDIGO },
  sublabel: { fontSize: 12, color: '#9ca3af', marginTop: 3, lineHeight: 17 },
  doneBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  inProgressBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  inProgressText: { fontSize: 10, fontWeight: '700', color: INDIGO },
});

// Document styles
const ds = StyleSheet.create({
  directorBlock: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  directorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  directorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  directorAvatarText: { fontSize: 15, fontWeight: '800', color: INDIGO },
  directorName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  directorMeta: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between' },
  docThird: { flex: 1 },
  card: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  previewArea: { height: 100, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  img: { width: '100%', height: '100%' },
  expandHint: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 3 },
  pdfPlaceholder: { alignItems: 'center', gap: 4 },
  pdfText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  footerLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  footerSub: { fontSize: 10, color: '#9ca3af' },
  dlBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  missing: { height: 130, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d1d5db', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', gap: 6 },
  missingText: { fontSize: 11, color: '#9ca3af' },
  lightboxBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  lightboxImg: { width: '92%', height: '75%' },
  lightboxClose: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 20 },
});

const ps = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 13, color: '#6b7280' },
  value: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 12 },
  amount: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statusBox: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  statusUnpaid: { backgroundColor: '#fef3c7' },
  statusPaid: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextUnpaid: { color: '#92400e' },
  statusTextPaid: { color: '#065f46' },
  payBtn: { backgroundColor: INDIGO, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});
