import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { MyRegistrationItem } from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { effectiveRegistrationStatus } from '@/utils/company-registration-status';
import { TRACKER_STEPS, resolveStepsDone } from '@/utils/registration-tracker-steps';

export { TRACKER_STEPS } from '@/utils/registration-tracker-steps';

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft: { label: 'Draft', color: '#5f6368', bg: '#f1f3f4', icon: 'create-outline' },
  payment_pending: { label: 'Payment pending', color: '#b06000', bg: '#fef7e0', icon: 'time-outline' },
  paid: { label: 'Paid', color: '#188038', bg: '#e6f4ea', icon: 'checkmark-circle-outline' },
  submitted: { label: 'Submitted', color: '#1967d2', bg: '#e8f0fe', icon: 'send-outline' },
  initiated: { label: 'Initiated', color: '#1967d2', bg: '#e8f0fe', icon: 'play-circle-outline' },
  filed: { label: 'Filed', color: '#1967d2', bg: '#e8f0fe', icon: 'document-attach-outline' },
  approved: { label: 'Approved', color: '#188038', bg: '#e6f4ea', icon: 'ribbon-outline' },
  completed: { label: 'Completed', color: '#188038', bg: '#e6f4ea', icon: 'checkmark-done-circle-outline' },
  rejected: { label: 'Rejected', color: '#c5221f', bg: '#fce8e6', icon: 'close-circle-outline' },
  pending: { label: 'Pending', color: '#5f6368', bg: '#f1f3f4', icon: 'time-outline' },
};

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
        <Ionicons name="document-outline" size={24} color={Colors.border} />
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
          <Ionicons name="download-outline" size={18} color="#1a73e8" />
        </Pressable>
      </View>
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

export function RegistrationDocumentsSection({
  item,
  onDownload,
}: {
  item: MyRegistrationItem;
  onDownload: (dataUrl: string, fileName: string) => void;
}) {
  const directors = item.directors || [];
  if (directors.length === 0) return null;
  return (
    <View style={T.card}>
      <View style={T.cardHeader}>
        <View style={T.cardHeaderIcon}>
          <Ionicons name="folder-open-outline" size={20} color="#1a73e8" />
        </View>
        <Text style={T.cardTitle}>Uploaded documents</Text>
      </View>
      {directors.map((director: any, di: number) => (
        <View key={`dir-${item._id}-${di}`} style={ds.directorBlock}>
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
            <View style={[ds.docThird, { paddingRight: 6 }]}>
              <DocCard uri={director.panFileUri} label="PAN Card" directorIndex={di} docType="PAN" onDownload={onDownload} />
            </View>
            <View style={[ds.docThird, { paddingHorizontal: 3 }]}>
              <DocCard
                uri={director.aadhaarFrontFileUri}
                label="Aadhaar Front"
                directorIndex={di}
                docType="AadhaarFront"
                onDownload={onDownload}
              />
            </View>
            <View style={[ds.docThird, { paddingLeft: 6 }]}>
              <DocCard
                uri={director.aadhaarBackFileUri}
                label="Aadhaar Back"
                directorIndex={di}
                docType="AadhaarBack"
                onDownload={onDownload}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function EndedRegistrationPanel({ item }: { item: MyRegistrationItem }) {
  const eff = effectiveRegistrationStatus(item);
  const isRejected = eff === 'rejected';
  const statusDisplay = STATUS_DISPLAY[eff] ?? STATUS_DISPLAY.approved;
  const statusTint = isRejected ? '#c5221f' : '#188038';
  return (
    <View style={T.endedCard}>
      <View style={T.endedTop}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <Text style={T.endedCoName}>{item.proposedName1?.trim() || 'Company registration'}</Text>
          <Text style={T.endedCaseId}>{item.caseId ? `Case ${item.caseId}` : 'Case ID pending'}</Text>
        </View>
        <View style={T.endedStatusChip}>
          <Ionicons name={statusDisplay.icon as any} size={15} color={statusTint} />
          <Text style={[T.endedStatusChipText, { color: statusTint }]}>{statusDisplay.label}</Text>
        </View>
      </View>
      <View style={T.endedDivider} />
      <View style={T.endedMessageRow}>
        <Ionicons
          name={isRejected ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          size={20}
          color={statusTint}
          style={T.endedMessageIcon}
        />
        <Text style={[T.endedMessageText, isRejected && T.endedMessageTextReject]}>
          {isRejected
            ? 'This application is closed. Contact support if you need to re-apply.'
            : 'Incorporation complete. Tracking for this case is finished — it stays here for your records.'}
        </Text>
      </View>
      <View style={T.endedProgressRow}>
        <Text style={T.endedProgressLabel}>Progress</Text>
        <Text style={[T.endedProgressVal, isRejected && T.endedProgressValMuted]}>{isRejected ? '—' : '100%'}</Text>
      </View>
      {!isRejected && (
        <View style={T.progressTrackLight}>
          <View style={[T.progressFillLight, { width: '100%' as const }]} />
        </View>
      )}
    </View>
  );
}

type ActivePanelProps = {
  item: MyRegistrationItem;
  isLivePolling: boolean;
  onDownload: (dataUrl: string, fileName: string) => void;
};

export function ActiveRegistrationPanel({ item, isLivePolling, onDownload }: ActivePanelProps) {
  const router = useRouter();
  const eff = effectiveRegistrationStatus(item);
  const stepsDone = resolveStepsDone(eff);
  const statusDisplay = STATUS_DISPLAY[eff] ?? STATUS_DISPLAY.draft;
  const completedCount = Object.values(stepsDone).filter(Boolean).length;
  const progressPct = Math.round((completedCount / TRACKER_STEPS.length) * 100);

  return (
    <View style={T.registrationBlock}>
      <View style={T.headerCard}>
        <View style={T.headerTop}>
          <View style={T.headerIcon}>
            <Ionicons name="document-text-outline" size={22} color="#1a73e8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.headerEyebrow}>In progress</Text>
            <Text style={T.headerSubName} numberOfLines={2}>
              {item.proposedName1?.trim() || 'New application'}
            </Text>
            {item.caseId ? <Text style={T.caseId}>Case ID: {item.caseId}</Text> : null}
          </View>
          <View style={[T.liveBadge, !isLivePolling && T.liveBadgeOff]}>
            <View style={[T.liveDot, !isLivePolling && T.liveDotOff]} />
            <Text style={[T.liveText, !isLivePolling && T.liveTextOff]}>
              {isLivePolling ? 'Live updates' : 'Paused'}
            </Text>
          </View>
        </View>

        <View style={T.statusBadge}>
          <Ionicons name={statusDisplay.icon as any} size={15} color={statusDisplay.color} />
          <Text style={[T.statusBadgeText, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
        </View>

        <View style={T.progressTrack}>
          <View style={[T.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <View style={T.progressRow}>
          <Text style={T.progressLabel}>
            {completedCount} of {TRACKER_STEPS.length} steps completed
          </Text>
          <Text style={T.progressPct}>{progressPct}%</Text>
        </View>
      </View>

      {(item.paymentAmount !== undefined && item.paymentAmount !== null) || item.paymentStatus ? (
        <View style={T.card}>
          <View style={T.cardHeader}>
            <View style={T.cardHeaderIcon}>
              <Ionicons name="card-outline" size={20} color="#1a73e8" />
            </View>
            <Text style={T.cardTitle}>Review & payment</Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
            <View style={ps.row}>
              <Text style={ps.label}>Company Name</Text>
              <Text style={ps.value}>{item.proposedName1 || '—'}</Text>
            </View>
            <View style={ps.row}>
              <Text style={ps.label}>Service</Text>
              <Text style={ps.value}>{item.businessType || 'Company Registration'}</Text>
            </View>
            <View style={[ps.row, { borderBottomWidth: 0, marginBottom: 12 }]}>
              <Text style={ps.label}>Total Fee</Text>
              <Text style={ps.amount}>₹{(item.paymentAmount ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={[ps.statusBox, item.paymentStatus === 'paid' ? ps.statusPaid : ps.statusUnpaid]}>
              <Text style={[ps.statusText, item.paymentStatus === 'paid' ? ps.statusTextPaid : ps.statusTextUnpaid]}>
                {item.paymentStatus === 'paid'
                  ? 'Payment Received'
                  : item.paymentStatus === 'partial'
                    ? 'Partial Payment Received'
                    : 'Payment Pending'}
              </Text>
            </View>
            {item.paymentStatus !== 'paid' && (
              <Pressable style={ps.payBtn} onPress={() => router.push('/company-registration-review-paywall')}>
                <Text style={ps.payBtnText}>Pay with Razorpay</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      <View style={T.card}>
        <View style={T.cardHeader}>
          <View style={T.cardHeaderIcon}>
            <Ionicons name="list-outline" size={20} color="#1a73e8" />
          </View>
          <Text style={T.cardTitle}>Filing progress</Text>
        </View>
        {TRACKER_STEPS.map((step, index) => {
          const done = stepsDone[step.key];
          const prevKey = index > 0 ? TRACKER_STEPS[index - 1].key : null;
          const prevDone = prevKey ? stepsDone[prevKey] : true;
          const isCurrent = !done && prevDone;
          const isLast = index === TRACKER_STEPS.length - 1;
          return (
            <View key={step.key} style={ts.stepRow}>
              <View style={ts.leftCol}>
                <View style={ts.circleWrap}>
                  {isCurrent && <PulseCircle />}
                  <View style={[ts.circle, done && ts.circleDone, isCurrent && ts.circleCurrent]}>
                    {done ? (
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
              <View style={[ts.contentCol, isLast && { paddingBottom: 0 }]}>
                <View style={ts.labelRow}>
                  <Text style={[ts.label, done && ts.labelDone, isCurrent && ts.labelCurrent]}>{step.label}</Text>
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

      <RegistrationDocumentsSection item={item} onDownload={onDownload} />
    </View>
  );
}

/** Share document download between hub + detail screens. */
export async function downloadRegistrationDocument(base64DataUrl: string, fileName: string): Promise<void> {
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
}

const HAIRLINE = StyleSheet.hairlineWidth;

const T = StyleSheet.create({
  registrationBlock: { marginBottom: 4 },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 11, fontWeight: '600', color: '#80868b', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerSubName: { fontSize: 18, fontWeight: '500', color: '#202124', marginTop: 4 },
  caseId: { fontSize: 12, fontWeight: '400', color: '#5f6368', marginTop: 4 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#e8f0fe',
  },
  liveBadgeOff: { backgroundColor: '#f1f3f4' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1a73e8' },
  liveDotOff: { backgroundColor: '#80868b' },
  liveText: { fontSize: 12, fontWeight: '600', color: '#1967d2' },
  liveTextOff: { color: '#5f6368' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 0,
    marginBottom: 12,
  },
  statusBadgeText: { fontSize: 14, fontWeight: '500' },
  progressTrack: { height: 4, backgroundColor: '#e8eaed', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#1a73e8', borderRadius: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontWeight: '400', color: '#5f6368' },
  progressPct: { fontSize: 12, fontWeight: '600', color: '#1a73e8' },

  endedCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
    overflow: 'hidden',
  },
  endedTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  endedCoName: { fontSize: 18, fontWeight: '500', color: '#202124' },
  endedCaseId: { fontSize: 12, fontWeight: '400', color: '#5f6368', marginTop: 4, lineHeight: 18 },
  endedStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  endedStatusChipText: { fontSize: 14, fontWeight: '500' },
  endedDivider: {
    height: HAIRLINE,
    backgroundColor: '#e8eaed',
    marginHorizontal: 16,
    marginTop: 12,
  },
  endedMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  endedMessageIcon: { marginTop: 2 },
  endedMessageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#5f6368',
  },
  endedMessageTextReject: { color: '#5f6368' },
  endedProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  endedProgressLabel: { fontSize: 12, color: '#5f6368', fontWeight: '400' },
  endedProgressVal: { fontSize: 14, fontWeight: '600', color: '#188038' },
  endedProgressValMuted: { color: '#80868b', fontWeight: '500' },
  progressTrackLight: {
    height: 4,
    backgroundColor: '#e8eaed',
    borderRadius: 2,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFillLight: { height: '100%', backgroundColor: '#188038', borderRadius: 2 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: '#e8eaed',
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#202124' },
});

const ts = StyleSheet.create({
  stepRow: { flexDirection: 'row', paddingHorizontal: 16 },
  leftCol: { alignItems: 'center', marginRight: 12, width: 32 },
  circleWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  pulseRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(26, 115, 232, 0.22)' },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#dadce0',
  },
  circleDone: { backgroundColor: '#188038', borderColor: '#188038' },
  circleCurrent: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  line: { width: 2, flex: 1, minHeight: 24, backgroundColor: '#dadce0', marginTop: 2, marginBottom: 2 },
  lineDone: { backgroundColor: '#188038' },
  stepNum: { fontSize: 11, fontWeight: '600', color: '#80868b' },
  contentCol: { flex: 1, paddingTop: 12, paddingBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 14, fontWeight: '400', color: '#80868b' },
  labelDone: { color: '#202124', fontWeight: '500' },
  labelCurrent: { color: '#1a73e8', fontWeight: '500' },
  sublabel: { fontSize: 12, fontWeight: '400', color: '#5f6368', marginTop: 4, lineHeight: 16 },
  doneBadge: { backgroundColor: '#e6f4ea', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  doneBadgeText: { fontSize: 11, fontWeight: '600', color: '#188038' },
  inProgressBadge: { backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  inProgressText: { fontSize: 11, fontWeight: '600', color: '#1967d2' },
});

const ds = StyleSheet.create({
  directorBlock: { borderTopWidth: HAIRLINE, borderTopColor: '#e8eaed', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  directorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  directorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorAvatarText: { fontSize: 14, fontWeight: '600', color: '#1967d2' },
  directorName: { fontSize: 14, fontWeight: '500', color: '#202124' },
  directorMeta: { fontSize: 12, fontWeight: '400', color: '#5f6368', marginTop: 2 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between' },
  docThird: { flex: 1 },
  card: { borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.white, borderWidth: 1, borderColor: '#e8eaed' },
  previewArea: { height: 100, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  img: { width: '100%', height: '100%' },
  expandHint: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 6, padding: 3 },
  pdfPlaceholder: { alignItems: 'center', gap: 4 },
  pdfText: { fontSize: 11, fontWeight: '600', color: '#c5221f' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  footerLabel: { fontSize: 12, fontWeight: '500', color: '#202124' },
  footerSub: { fontSize: 11, fontWeight: '400', color: '#5f6368' },
  dlBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#dadce0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  missingText: { fontSize: 12, fontWeight: '400', color: '#80868b' },
  lightboxBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  lightboxImg: { width: '92%', height: '75%' },
  lightboxClose: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 20 },
});

const ps = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: '#e8eaed',
  },
  label: { fontSize: 14, fontWeight: '400', color: '#5f6368' },
  value: { fontSize: 14, fontWeight: '500', color: '#202124', flex: 1, textAlign: 'right', marginLeft: 12 },
  amount: { fontSize: 20, fontWeight: '500', color: '#202124' },
  statusBox: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  statusUnpaid: { backgroundColor: '#fef7e0' },
  statusPaid: { backgroundColor: '#e6f4ea' },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusTextUnpaid: { color: '#b06000' },
  statusTextPaid: { color: '#188038' },
  payBtn: {
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
