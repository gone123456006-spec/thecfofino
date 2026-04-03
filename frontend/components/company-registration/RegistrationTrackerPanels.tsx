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
  draft: { label: 'Draft', color: Colors.textSecondary, bg: Colors.surfaceLight, icon: 'create-outline' },
  payment_pending: { label: 'Payment pending', color: Colors.primaryDark, bg: Colors.surfaceAccent, icon: 'time-outline' },
  paid: { label: 'Paid', color: Colors.primary, bg: Colors.surfaceAccent, icon: 'checkmark-circle-outline' },
  submitted: { label: 'Submitted', color: Colors.primary, bg: Colors.surfaceLight, icon: 'send-outline' },
  initiated: { label: 'Initiated', color: Colors.primary, bg: Colors.surfaceLight, icon: 'play-circle-outline' },
  filed: { label: 'Filed', color: Colors.primaryDark, bg: Colors.surfaceLight, icon: 'document-attach-outline' },
  approved: { label: 'Approved', color: Colors.primaryDark, bg: Colors.surfaceAccent, icon: 'ribbon-outline' },
  completed: { label: 'Completed', color: Colors.primaryDark, bg: Colors.surfaceAccent, icon: 'checkmark-done-circle-outline' },
  rejected: { label: 'Rejected', color: '#b42318', bg: '#fef3f2', icon: 'close-circle-outline' },
  pending: { label: 'Pending', color: Colors.textSecondary, bg: Colors.surfaceLight, icon: 'time-outline' },
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
          <Ionicons name="download-outline" size={18} color={Colors.primary} />
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
          <Ionicons name="folder-open-outline" size={20} color={Colors.primary} />
        <Text style={T.cardTitle}>Uploaded Documents</Text>
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
  const statusTint = isRejected ? '#b42318' : Colors.primary;
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
            <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
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
            <Ionicons name="card-outline" size={20} color={Colors.primary} />
            <Text style={T.cardTitle}>Review & Payment</Text>
          </View>
          <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 }}>
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
          <Ionicons name="list-outline" size={20} color={Colors.primary} />
          <Text style={T.cardTitle}>Step-by-Step Progress</Text>
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
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    borderWidth: HAIRLINE,
    borderColor: Colors.borderLight,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  headerSubName: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary, marginTop: 4, letterSpacing: -0.35 },
  caseId: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary, marginTop: 6 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: HAIRLINE,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  liveBadgeOff: { backgroundColor: Colors.surface },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.whatsapp },
  liveDotOff: { backgroundColor: Colors.textMuted },
  liveText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  liveTextOff: { color: Colors.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 0,
    marginBottom: 16,
  },
  statusBadgeText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  progressTrack: { height: 4, backgroundColor: Colors.divider, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontWeight: '400', color: Colors.textMuted },
  progressPct: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  endedCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: HAIRLINE,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  endedTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 4,
  },
  endedCoName: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.35 },
  endedCaseId: { fontSize: 15, fontWeight: '400', color: Colors.textMuted, marginTop: 4, lineHeight: 20 },
  endedStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  endedStatusChipText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  endedDivider: {
    height: HAIRLINE,
    backgroundColor: Colors.divider,
    marginHorizontal: 18,
    marginTop: 14,
  },
  endedMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
  },
  endedMessageIcon: { marginTop: 2 },
  endedMessageText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  endedMessageTextReject: { color: Colors.textSecondary },
  endedProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
  },
  endedProgressLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '400' },
  endedProgressVal: { fontSize: 15, fontWeight: '600', color: Colors.primary, letterSpacing: -0.2 },
  endedProgressValMuted: { color: Colors.textMuted, fontWeight: '500' },
  progressTrackLight: {
    height: 2,
    backgroundColor: Colors.divider,
    borderRadius: 1,
    marginHorizontal: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  progressFillLight: { height: '100%', backgroundColor: Colors.primary, borderRadius: 1 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: HAIRLINE,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: HAIRLINE,
    borderBottomColor: Colors.borderLight,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.2 },
});

const ts = StyleSheet.create({
  stepRow: { flexDirection: 'row', paddingHorizontal: 18 },
  leftCol: { alignItems: 'center', marginRight: 12 },
  circleWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  pulseRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 128, 193, 0.22)' },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: HAIRLINE,
    borderColor: Colors.border,
  },
  circleDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  circleCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  line: { width: 1.5, flex: 1, minHeight: 20, backgroundColor: Colors.divider, marginTop: 2, marginBottom: 2 },
  lineDone: { backgroundColor: Colors.primaryLight },
  stepNum: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  contentCol: { flex: 1, paddingTop: 10, paddingBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 15, fontWeight: '500', color: Colors.textMuted },
  labelDone: { color: Colors.textPrimary, fontWeight: '600' },
  labelCurrent: { color: Colors.primary, fontWeight: '600' },
  sublabel: { fontSize: 13, fontWeight: '400', color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  doneBadge: { backgroundColor: Colors.surfaceAccent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  doneBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primaryDark },
  inProgressBadge: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  inProgressText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
});

const ds = StyleSheet.create({
  directorBlock: { borderTopWidth: HAIRLINE, borderTopColor: Colors.borderLight, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 },
  directorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  directorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directorAvatarText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  directorName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  directorMeta: { fontSize: 12, fontWeight: '400', color: Colors.textMuted, marginTop: 2 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between' },
  docThird: { flex: 1 },
  card: { borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: HAIRLINE, borderColor: Colors.borderLight },
  previewArea: { height: 100, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  img: { width: '100%', height: '100%' },
  expandHint: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 6, padding: 3 },
  pdfPlaceholder: { alignItems: 'center', gap: 4 },
  pdfText: { fontSize: 11, fontWeight: '600', color: Colors.primaryDark },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  footerLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  footerSub: { fontSize: 11, fontWeight: '400', color: Colors.textMuted },
  dlBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    height: 120,
    borderRadius: 12,
    borderWidth: HAIRLINE,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  missingText: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
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
    borderBottomColor: Colors.borderLight,
  },
  label: { fontSize: 15, fontWeight: '400', color: Colors.textMuted },
  value: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: 12 },
  amount: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.5 },
  statusBox: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  statusUnpaid: { backgroundColor: Colors.surfaceAccent },
  statusPaid: { backgroundColor: Colors.surfaceLight },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusTextUnpaid: { color: Colors.primaryDark },
  statusTextPaid: { color: Colors.primary },
  payBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  payBtnText: { color: Colors.textOnPrimary, fontSize: 17, fontWeight: '600' },
});
