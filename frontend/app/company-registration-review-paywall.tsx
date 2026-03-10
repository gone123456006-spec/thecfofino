import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Colors } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
  type CompanyRegistrationDraft,
  type CompanyRegistrationPaymentMethod,
  getCompanyRegistrationDraft,
  loadCompanyRegistrationState,
  saveCompanyRegistrationState,
  setCompanyRegistrationDraft,
} from '@/utils/company-registration-draft';
import {
  buildRazorpayHtml,
  type RazorpayPayload,
} from '@/utils/razorpay-webview';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:4000/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Director = {
  name: string;
  pan: string;
  aadhaar: string;
  shareholding: string;
  panFileUri: string | null;
  aadhaarFrontFileUri: string | null;
  aadhaarBackFileUri: string | null;
};

type EditField = {
  section: 'company' | 'director';
  key: string;
  label: string;
  directorIndex?: number;
  currentValue: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Tappable row in the summary table */
function TableRow({
  label,
  value,
  onEdit,
  isLocked,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  isLocked?: boolean;
}) {
  return (
    <View style={tableStyles.row}>
      <Text style={tableStyles.rowLabel}>{label}</Text>
      <View style={tableStyles.rowValueWrap}>
        <Text style={tableStyles.rowValue} numberOfLines={2}>{value || '—'}</Text>
        {!isLocked && (
          <Pressable onPress={onEdit} hitSlop={8} style={tableStyles.editBtn}>
            <Ionicons name="pencil" size={13} color="#6366f1" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Image preview thumbnail with expand-on-tap */
function DocThumb({ uri, label }: { uri: string | null; label: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!uri) {
    return (
      <View style={thumbStyles.missing}>
        <Ionicons name="document-outline" size={20} color="#9ca3af" />
        <Text style={thumbStyles.missingText}>No file</Text>
      </View>
    );
  }
  const isPdf = uri.toLowerCase().includes('.pdf') || uri.startsWith('data:application/pdf');
  return (
    <>
      <Pressable style={thumbStyles.wrap} onPress={() => !isPdf && setExpanded(true)}>
        {isPdf ? (
          <View style={thumbStyles.pdfBadge}>
            <Ionicons name="document-text" size={22} color="#ef4444" />
            <Text style={thumbStyles.pdfText}>PDF</Text>
          </View>
        ) : (
          <>
            <Image source={{ uri }} style={thumbStyles.img} resizeMode="cover" />
            <View style={thumbStyles.overlay}>
              <Ionicons name="expand-outline" size={14} color="#fff" />
            </View>
          </>
        )}
        <Text style={thumbStyles.label} numberOfLines={1}>{label}</Text>
      </Pressable>

      {/* Full-screen image viewer */}
      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable style={thumbStyles.lightboxBg} onPress={() => setExpanded(false)}>
          <Image source={{ uri }} style={thumbStyles.lightboxImg} resizeMode="contain" />
          <Pressable style={thumbStyles.lightboxClose} onPress={() => setExpanded(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CompanyRegistrationReviewPaywallScreen() {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [draft, setDraft] = useState<CompanyRegistrationDraft | null>(getCompanyRegistrationDraft());
  const [paying, setPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Razorpay WebView modal
  const [razorpayHtml, setRazorpayHtml] = useState<string | null>(null);
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const webViewRef = useRef(null);

  // Edit modal state
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  const totalCost = 4999 + 2000 + 499; // ₹7,498

  const refreshState = useCallback(async () => {
    const state = await loadCompanyRegistrationState();
    if (state.draft) setDraft(state.draft);
    setIsPaid(state.paymentStatus === 'paid');
    if (state.status === 'submitted') {
      await saveCompanyRegistrationState({ status: 'payment_pending' });
    }
  }, []);

  useFocusEffect(useCallback(() => { void refreshState(); }, [refreshState]));

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const openEdit = (field: EditField) => {
    setEditField(field);
    setEditValue(field.currentValue);
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    if (!editField || !draft) return;
    let updated: CompanyRegistrationDraft = { ...draft };

    if (editField.section === 'director' && editField.directorIndex !== undefined) {
      const dirs = [...(draft.directors || [])];
      dirs[editField.directorIndex] = {
        ...dirs[editField.directorIndex],
        [editField.key]: editValue.trim(),
      };
      updated = { ...updated, directors: dirs };
    } else {
      updated = { ...updated, [editField.key]: editValue.trim() };
    }

    setDraft(updated);
    setCompanyRegistrationDraft(updated);
    void saveCompanyRegistrationState({ draft: updated, status: 'payment_pending' });
    setEditModalVisible(false);
  };

  // ── Payment ───────────────────────────────────────────────────────────────

  const handlePayAndInitiate = async () => {
    if (paying) return;
    if (isPaid) { router.push('/company-registration-upload-tracking'); return; }

    setPaying(true);
    try {
      // 1. Create Razorpay order on backend
      const res = await fetch(`${API_BASE}/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalCost, currency: 'INR', receipt: 'company_reg' }),
      });
      const order = await res.json() as {
        ok: boolean; orderId: string; amount: number; currency: string; keyId: string; error?: string;
      };

      if (!order.ok || !order.orderId) {
        throw new Error(order.error ?? 'Could not create payment order');
      }

      // 2. Build WebView HTML and open it
      const html = buildRazorpayHtml({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        name: 'Finovert',
        description: 'Company Registration Filing',
        themeColor: '#6366f1',
      });
      setRazorpayHtml(html);
      setRazorpayModalVisible(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Payment Error', msg);
    } finally {
      setPaying(false);
    }
  };

  // Called when Razorpay WebView posts a message back
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    let payload: RazorpayPayload;
    try {
      payload = JSON.parse(event.nativeEvent.data) as RazorpayPayload;
    } catch {
      return;
    }

    if (payload.success) {
      // Close modal first for better UX
      setRazorpayModalVisible(false);
      setPaying(true);

      try {
        // 3. Verify payment signature on backend
        const vRes = await fetch(`${API_BASE}/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: payload.razorpay_order_id,
            razorpay_payment_id: payload.razorpay_payment_id,
            razorpay_signature: payload.razorpay_signature,
          }),
        });
        const vData = await vRes.json() as { ok: boolean; error?: string };

        if (!vData.ok) throw new Error(vData.error ?? 'Signature verification failed');

        // 4. Mark as paid and navigate
        await saveCompanyRegistrationState({
          status: 'paid',
          paymentStatus: 'paid',
          paymentMethod: 'upi',
          paidAt: new Date().toISOString(),
        });
        addNotification({
          title: 'Payment Successful',
          body: 'Payment received. Upload and filing process is now unlocked.',
        });
        setIsPaid(true);
        router.push('/company-registration-upload-tracking');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Verification failed';
        Alert.alert('Payment Verification Failed', msg);
      } finally {
        setPaying(false);
      }
    } else {
      // Cancelled or failed
      setRazorpayModalVisible(false);
      if (payload.error && payload.error !== 'Payment cancelled by user') {
        Alert.alert('Payment Failed', payload.error);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Razorpay WebView Modal ── */}
      <Modal
        visible={razorpayModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setRazorpayModalVisible(false);
          Alert.alert('Payment Cancelled', 'You can try again anytime.');
        }}>
        <View style={rzpStyles.container}>
          <View style={rzpStyles.header}>
            <Text style={rzpStyles.headerTitle}>Secure Payment</Text>
            <Pressable
              style={rzpStyles.closeBtn}
              onPress={() => {
                setRazorpayModalVisible(false);
                Alert.alert('Payment Cancelled', 'You can try again anytime.');
              }}>
              <Ionicons name="close" size={22} color="#374151" />
            </Pressable>
          </View>
          <View style={rzpStyles.secureBar}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#22c55e" />
            <Text style={rzpStyles.secureText}>256-bit SSL encrypted · Secured by Razorpay</Text>
          </View>
          {razorpayHtml ? (
            <WebView
              ref={webViewRef}
              source={{ html: razorpayHtml }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={rzpStyles.loading}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={rzpStyles.loadingText}>Loading payment…</Text>
                </View>
              )}
              style={rzpStyles.webview}
            />
          ) : null}
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}>
        <Pressable style={editStyles.overlay} onPress={() => setEditModalVisible(false)}>
          <Pressable style={editStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={editStyles.handle} />
            <Text style={editStyles.title}>Edit {editField?.label}</Text>
            <TextInput
              style={editStyles.input}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              multiline={['businessActivity', 'registeredAddress'].includes(editField?.key ?? '')}
              numberOfLines={['businessActivity', 'registeredAddress'].includes(editField?.key ?? '') ? 3 : 1}
              placeholder={`Enter ${editField?.label}`}
              placeholderTextColor="#9ca3af"
            />
            <View style={editStyles.btnRow}>
              <Pressable style={editStyles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={editStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={editStyles.saveBtn} onPress={saveEdit}>
                <Text style={editStyles.saveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerBadge}>
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            <Text style={s.headerBadgeText}>Submitted</Text>
          </View>
          <Text style={s.headerTitle}>Review & Pay</Text>
          <Text style={s.headerSub}>Verify your details below. Tap{' '}
            <Ionicons name="pencil" size={12} color="#6366f1" /> to edit any field before paying.
          </Text>
        </View>

        {/* ── Summary Table ── */}
        {draft ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="business-outline" size={18} color="#6366f1" />
              <Text style={s.cardTitle}>Company Details</Text>
              <Text style={s.cardHint}>Tap pencil to edit</Text>
            </View>

            <View style={tableStyles.table}>
              {draft.caseId ? (
                <TableRow label="Case ID" value={draft.caseId} onEdit={() => { }} isLocked />
              ) : null}
              <TableRow label="Business Type" value={draft.businessType || ''} onEdit={() => openEdit({ section: 'company', key: 'businessType', label: 'Business Type', currentValue: draft.businessType || '' })} />
              <TableRow label="Name 1 (Primary)" value={draft.proposedName1 || ''} onEdit={() => openEdit({ section: 'company', key: 'proposedName1', label: 'Proposed Name 1', currentValue: draft.proposedName1 || '' })} />
              <TableRow label="Name 2" value={draft.proposedName2 || ''} onEdit={() => openEdit({ section: 'company', key: 'proposedName2', label: 'Proposed Name 2', currentValue: draft.proposedName2 || '' })} />
              <TableRow label="Name 3" value={draft.proposedName3 || ''} onEdit={() => openEdit({ section: 'company', key: 'proposedName3', label: 'Proposed Name 3', currentValue: draft.proposedName3 || '' })} />
              <TableRow label="Mobile" value={draft.companyMobile || ''} onEdit={() => openEdit({ section: 'company', key: 'companyMobile', label: 'Company Mobile', currentValue: draft.companyMobile || '' })} />
              <TableRow label="Email" value={draft.companyEmail || ''} onEdit={() => openEdit({ section: 'company', key: 'companyEmail', label: 'Company Email', currentValue: draft.companyEmail || '' })} />
              <TableRow label="Business Activity" value={draft.businessActivity || ''} onEdit={() => openEdit({ section: 'company', key: 'businessActivity', label: 'Business Activity', currentValue: draft.businessActivity || '' })} />
              <TableRow label="Registered Address" value={draft.registeredAddress || ''} onEdit={() => openEdit({ section: 'company', key: 'registeredAddress', label: 'Registered Address', currentValue: draft.registeredAddress || '' })} />
              <TableRow label="Capital Structure" value={draft.capitalStructure || ''} onEdit={() => openEdit({ section: 'company', key: 'capitalStructure', label: 'Capital Structure', currentValue: draft.capitalStructure || '' })} />
            </View>
          </View>
        ) : null}

        {/* ── Director Cards ── */}
        {(draft?.directors || []).map((dir, i) => (
          <View key={`dir-${i}`} style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="person-circle-outline" size={18} color="#6366f1" />
              <Text style={s.cardTitle}>Director {i + 1}</Text>
              <Text style={s.cardHint}>Tap pencil to edit</Text>
            </View>

            <View style={tableStyles.table}>
              <TableRow label="Full Name" value={dir.name} onEdit={() => openEdit({ section: 'director', key: 'name', label: 'Director Name', directorIndex: i, currentValue: dir.name })} />
              <TableRow label="PAN" value={dir.pan} onEdit={() => openEdit({ section: 'director', key: 'pan', label: 'PAN Number', directorIndex: i, currentValue: dir.pan })} />
              <TableRow label="Aadhaar" value={dir.aadhaar} onEdit={() => openEdit({ section: 'director', key: 'aadhaar', label: 'Aadhaar Number', directorIndex: i, currentValue: dir.aadhaar })} />
              <TableRow label="Shareholding %" value={dir.shareholding} onEdit={() => openEdit({ section: 'director', key: 'shareholding', label: 'Shareholding %', directorIndex: i, currentValue: dir.shareholding })} />
            </View>

            {/* Document Previews */}
            <View style={s.docsRow}>
              <View style={s.docItem}>
                <Text style={s.docLabel}>PAN Card</Text>
                <DocThumb uri={dir.panFileUri} label="PAN" />
              </View>
              <View style={s.docItem}>
                <Text style={s.docLabel}>Aadhaar Card</Text>
                {dir.aadhaarFrontFileUri ? (
                  <DocThumb uri={dir.aadhaarFrontFileUri} label="Aadhaar Front" />
                ) : null}
                {dir.aadhaarBackFileUri ? (
                  <DocThumb uri={dir.aadhaarBackFileUri} label="Aadhaar Back" />
                ) : null}
              </View>
            </View>

            {/* Upload status strip */}
            <View style={s.uploadStatus}>
              <View style={[s.uploadDot, dir.panFileUri ? s.uploadDotGreen : s.uploadDotRed]} />
              <Text style={s.uploadStatusText}>PAN: {dir.panFileUri ? 'Uploaded' : 'Missing'}</Text>
              <View style={[s.uploadDot, (dir.aadhaarFrontFileUri && dir.aadhaarBackFileUri) ? s.uploadDotGreen : s.uploadDotRed, { marginLeft: 16 }]} />
              <Text style={s.uploadStatusText}>Aadhaar: {(dir.aadhaarFrontFileUri && dir.aadhaarBackFileUri) ? 'Uploaded' : 'Missing Front/Back'}</Text>
            </View>
          </View>
        ))}

        {!draft && (
          <View style={s.card}>
            <Text style={s.emptyText}>
              Your submission has been received. Complete payment below to continue with document upload and filing.
            </Text>
          </View>
        )}

        {/* ── Cost Breakdown ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="receipt-outline" size={18} color="#6366f1" />
            <Text style={s.cardTitle}>Cost Breakdown</Text>
          </View>
          <View style={tableStyles.table}>
            <TableRow label="Professional Fees" value="₹4,999" onEdit={() => { }} isLocked />
            <TableRow label="Government Fees" value="₹2,000" onEdit={() => { }} isLocked />
            <TableRow label="Convenience Charges" value="₹499" onEdit={() => { }} isLocked />
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalValue}>₹{totalCost.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ── Timeline & Policy ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="time-outline" size={18} color="#6366f1" />
            <Text style={s.cardTitle}>Timeline & Policy</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6366f1" />
            <Text style={s.infoText}>7–15 working days (subject to document verification)</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
            <Text style={s.infoText}>Refund not applicable after filing is initiated.</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
            <Text style={s.infoText}>Partial refund may apply if filing is not yet initiated.</Text>
          </View>
        </View>

        {/* ── Locked Features ── */}
        <View style={[s.card, s.lockCard]}>
          <View style={s.cardHeader}>
            <Ionicons name="lock-closed" size={18} color="#f59e0b" />
            <Text style={[s.cardTitle, { color: '#92400e' }]}>Locked Until Payment</Text>
          </View>
          <View style={s.lockedGrid}>
            {['Filing process', 'Document upload', 'Case ID generation', 'Status tracking'].map((item) => (
              <View key={item} style={s.lockedChip}>
                <Ionicons name="lock-closed-outline" size={13} color="#b45309" />
                <Text style={s.lockedChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Razorpay CTA ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="card-outline" size={18} color="#6366f1" />
            <Text style={s.cardTitle}>Payment</Text>
          </View>
          <View style={s.rzpInfoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#22c55e" />
            <Text style={s.rzpInfoText}>All payment methods accepted — UPI, Cards, Net Banking, Wallets</Text>
          </View>
          <View style={s.rzpMethodRow}>
            {['UPI', 'Cards', 'Net Banking', 'EMI'].map((m) => (
              <View key={m} style={s.rzpMethodChip}>
                <Text style={s.rzpMethodText}>{m}</Text>
              </View>
            ))}
          </View>
          <View style={s.rzpBadgeRow}>
            <View style={s.rzpBadge}>
              <Ionicons name="lock-closed" size={11} color="#6366f1" />
              <Text style={s.rzpBadgeText}>Secured by Razorpay</Text>
            </View>
          </View>
        </View>

        {/* ── Pay CTA ── */}
        <Pressable
          style={[s.payBtn, paying && s.payBtnDisabled]}
          onPress={handlePayAndInitiate}
          disabled={paying}>
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isPaid ? 'checkmark-circle' : 'lock-open-outline'} size={20} color="#fff" />
              <Text style={s.payBtnText}>
                {isPaid ? 'Payment Done — Continue' : `Pay ₹${totalCost.toLocaleString('en-IN')} & Initiate Filing`}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={s.secureNote}>
          <Ionicons name="shield-checkmark-outline" size={12} color="#6b7280" /> 256-bit SSL encrypted & secure · Powered by Razorpay
        </Text>
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INDIGO = '#6366f1';
const CARD_BG = '#ffffff';
const PAGE_BG = '#f5f5f7';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

  // Header
  header: { paddingVertical: 20, alignItems: 'center', marginBottom: 4 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  headerBadgeText: { fontSize: 13, fontWeight: '600', color: '#15803d' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 },

  // Card
  card: { backgroundColor: CARD_BG, borderRadius: 16, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  cardHint: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },

  emptyText: { padding: 16, fontSize: 14, color: '#6b7280', lineHeight: 21 },

  // Docs row
  docsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  docItem: { flex: 1 },
  docLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },

  // Upload status
  uploadStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  uploadDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  uploadDotGreen: { backgroundColor: '#22c55e' },
  uploadDotRed: { backgroundColor: '#ef4444' },
  uploadStatusText: { fontSize: 12, color: '#6b7280' },

  // Total
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#eef2ff', marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1e1b4b' },
  totalValue: { fontSize: 18, fontWeight: '800', color: INDIGO },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 7 },
  infoText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 19 },

  // Lock card
  lockCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  lockedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  lockedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  lockedChipText: { fontSize: 12, color: '#92400e', fontWeight: '500' },

  // Razorpay payment card
  rzpInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  rzpInfoText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 19 },
  rzpMethodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
  rzpMethodChip: { backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  rzpMethodText: { fontSize: 12, color: '#4338ca', fontWeight: '600' },
  rzpBadgeRow: { paddingHorizontal: 16, paddingBottom: 14 },
  rzpBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#e0e7ff' },
  rzpBadgeText: { fontSize: 11, color: '#6366f1', fontWeight: '600' },

  // CTA
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: INDIGO, paddingVertical: 17, borderRadius: 16, marginBottom: 12, shadowColor: INDIGO, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  payBtnDisabled: { backgroundColor: '#c7d2fe', shadowOpacity: 0 },
  payBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  secureNote: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 8 },
});

// Table
const tableStyles = StyleSheet.create({
  table: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', width: 120, flexShrink: 0 },
  rowValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  editBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
});

// Doc thumbnail
const thumbStyles = StyleSheet.create({
  wrap: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  img: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: 3 },
  pdfBadge: { alignItems: 'center', gap: 4 },
  pdfText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  label: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center', paddingVertical: 3 },
  missing: { alignItems: 'center', gap: 4, padding: 16, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d1d5db', backgroundColor: '#f9fafb', aspectRatio: 1, justifyContent: 'center' },
  missingText: { fontSize: 10, color: '#9ca3af' },
  // Lightbox
  lightboxBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  lightboxImg: { width: '92%', height: '75%' },
  lightboxClose: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 20 },
});

// Edit modal
const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16, textAlignVertical: 'top' },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: INDIGO },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// Razorpay WebView modal
const rzpStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  secureBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#dcfce7' },
  secureText: { fontSize: 12, color: '#15803d', fontWeight: '500' },
  webview: { flex: 1 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
});