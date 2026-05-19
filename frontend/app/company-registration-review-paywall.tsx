import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  checkoutLogoFromApiBase,
  completeCompanyRegistrationPaymentApi,
  fetchMyRegistrations,
  fetchPaymentPublicConfig,
  getApiBase,
  parseApiJson,
} from '@/api/company-registration';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
  type CompanyRegistrationDraft,
  getCompanyRegistrationDraft,
  loadCompanyRegistrationState,
  resetLocalCompanyRegistrationAfterPaymentSuccess,
  saveCompanyRegistrationState,
  setCompanyRegistrationDraft,
} from '@/utils/company-registration-draft';
import {
  computeCompanyRegistrationPayment,
  formatINR,
} from '@/utils/company-registration-payment';
import {
  sanitizeAadhaarInput,
  sanitizeIndianMobileInput,
  sanitizePanInput,
  validateAadhaar,
  validateCompanyMobile,
  validatePan,
} from '@/utils/company-registration-validation';
import {
  buildRazorpayHtml,
  type RazorpayPayload,
} from '@/utils/razorpay-webview';
import { GoogleOutlinedField } from '@/components/GoogleOutlinedField';
import { RazorpayBrandIcon } from '@/components/RazorpayBrandIcon';
import { Colors } from '@/constants/theme';
import {
  reviewEditStyles,
  reviewPaywallStyles as s,
  reviewRzpStyles,
  reviewTableStyles as tableStyles,
  reviewThumbStyles as thumbStyles,
} from '@/styles/company-registration-review-paywall.styles';

// ─── Types ───────────────────────────────────────────────────────────────────

const LOCKED_UNTIL_PAYMENT: {
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Filing process', desc: 'MCA submission workflow', icon: 'folder-open-outline' },
  { label: 'Document upload', desc: 'PAN, Aadhaar & supporting files', icon: 'cloud-upload-outline' },
  { label: 'Case ID generation', desc: 'Official registration reference', icon: 'key-outline' },
  { label: 'Status tracking', desc: 'Live updates on your application', icon: 'pulse-outline' },
];

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
        {!isLocked ? (
          <Pressable onPress={onEdit} hitSlop={8} style={tableStyles.editBtn} accessibilityLabel={`Edit ${label}`}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </Pressable>
        ) : (
          <Ionicons name="lock-closed-outline" size={16} color="#80868b" />
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
  const { getToken } = useAuth();
  const [draft, setDraft] = useState<CompanyRegistrationDraft | null>(getCompanyRegistrationDraft());
  const [paying, setPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [basePriceINR, setBasePriceINR] = useState(1);
  const [gstPercent, setGstPercent] = useState(0);
  const [gstAmountINR, setGstAmountINR] = useState(0);
  /** Total payable (base + GST) — charged via Razorpay. */
  const [paymentAmountINR, setPaymentAmountINR] = useState(1);
  const [productTitle, setProductTitle] = useState('Company Registration');
  const [productDescription, setProductDescription] = useState(
    'Secure payment via Razorpay. Unlocks document upload and MCA filing.',
  );
  /** Server says keys exist — for warning banner only; Pay is never hard-disabled from this. */
  const [razorpayConfiguredOnServer, setRazorpayConfiguredOnServer] = useState(true);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
  const [checkoutLogoUrl, setCheckoutLogoUrl] = useState('');

  // Razorpay WebView modal
  const [razorpayHtml, setRazorpayHtml] = useState<string | null>(null);
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const webViewRef = useRef(null);

  // Edit modal state
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadPaymentConfig = useCallback(async () => {
    setPaymentConfigLoading(true);
    try {
      const cfg = await fetchPaymentPublicConfig();
      const base =
        cfg.companyRegistrationBasePriceINR ?? cfg.companyRegistrationAmountINR ?? 1;
      const gst = cfg.companyRegistrationGstPercent ?? 0;
      const pricing = computeCompanyRegistrationPayment(base, gst);
      setBasePriceINR(pricing.basePriceINR);
      setGstPercent(pricing.gstPercent);
      setGstAmountINR(cfg.companyRegistrationGstAmountINR ?? pricing.gstAmountINR);
      setPaymentAmountINR(cfg.companyRegistrationTotalPayableINR ?? pricing.totalPayableINR);
      if (cfg.productTitle) setProductTitle(cfg.productTitle);
      if (cfg.productDescription) setProductDescription(cfg.productDescription);
      setRazorpayConfiguredOnServer(cfg.razorpayConfigured !== false);
      setCheckoutLogoUrl(cfg.checkoutLogoUrl?.trim() || checkoutLogoFromApiBase(getApiBase()));
    } catch {
      setRazorpayConfiguredOnServer(false);
      setCheckoutLogoUrl(checkoutLogoFromApiBase(getApiBase()));
    } finally {
      setPaymentConfigLoading(false);
    }
  }, []);

  /** If submit saved draft without _id (older builds), recover Mongo id from /registrations/my. */
  const syncRegistrationIdFromServer = useCallback(async () => {
    const state = await loadCompanyRegistrationState();
    const d = state.draft;
    if (!d || d._id) return;
    try {
      const token = await getToken();
      if (!token) return;
      const list = await fetchMyRegistrations(token);
      const latest = list?.[0];
      if (latest?._id) {
        const merged: CompanyRegistrationDraft = {
          ...d,
          _id: latest._id,
          ...(latest.caseId && !d.caseId ? { caseId: latest.caseId } : {}),
        };
        setDraft(merged);
        setCompanyRegistrationDraft(merged);
        await saveCompanyRegistrationState({ draft: merged });
      }
    } catch {
      /* ignore */
    }
  }, [getToken]);

  const refreshState = useCallback(async () => {
    const state = await loadCompanyRegistrationState();
    if (state.draft) setDraft(state.draft);
    let paid = state.paymentStatus === 'paid';
    if (state.status === 'submitted') {
      await saveCompanyRegistrationState({ status: 'payment_pending' });
    }
    await syncRegistrationIdFromServer();
    try {
      const token = await getToken();
      if (token) {
        const list = await fetchMyRegistrations(token);
        const latest = list?.[0];
        if (latest?.paymentStatus === 'paid') paid = true;
      }
    } catch {
      /* ignore */
    }
    setIsPaid(paid);
  }, [syncRegistrationIdFromServer, getToken]);

  useEffect(() => {
    void loadPaymentConfig();
  }, [loadPaymentConfig]);

  useFocusEffect(
    useCallback(() => {
      void refreshState();
      void loadPaymentConfig();
    }, [refreshState, loadPaymentConfig]),
  );

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const openEdit = (field: EditField) => {
    setEditField(field);
    setEditValue(field.currentValue);
    setEditModalVisible(true);
  };

  const COMPANY_KEYS_LOCKED_WITH_CASE = new Set([
    'businessType',
    'proposedName1',
    'proposedName2',
    'proposedName3',
    'companyMobile',
    'companyEmail',
    'businessActivity',
    'registeredAddress',
    'capitalStructure',
  ]);

  const saveEdit = () => {
    if (!editField || !draft) return;
    if (draft.caseId && editField.section === 'company' && COMPANY_KEYS_LOCKED_WITH_CASE.has(editField.key)) {
      Alert.alert('Cannot edit', 'Company details are locked after your Case ID was generated.');
      setEditModalVisible(false);
      return;
    }

    let value = editValue.trim();
    if (editField.key === 'companyMobile') {
      value = sanitizeIndianMobileInput(value);
      const err = validateCompanyMobile(value);
      if (err) {
        Alert.alert('Invalid mobile', err);
        return;
      }
    }
    if (editField.key === 'pan') {
      value = sanitizePanInput(value);
      const err = validatePan(value);
      if (err) {
        Alert.alert('Invalid PAN', err);
        return;
      }
    }
    if (editField.key === 'aadhaar') {
      value = sanitizeAadhaarInput(value);
      const err = validateAadhaar(value);
      if (err) {
        Alert.alert('Invalid Aadhaar', err);
        return;
      }
    }

    let updated: CompanyRegistrationDraft = { ...draft };

    if (editField.section === 'director' && editField.directorIndex !== undefined) {
      const dirs = [...(draft.directors || [])];
      dirs[editField.directorIndex] = {
        ...dirs[editField.directorIndex],
        [editField.key]: value,
      };
      updated = { ...updated, directors: dirs };
    } else {
      updated = { ...updated, [editField.key]: value };
    }

    setDraft(updated);
    setCompanyRegistrationDraft(updated);
    void saveCompanyRegistrationState({ draft: updated, status: 'payment_pending' });
    setEditModalVisible(false);
  };

  // ── Payment ───────────────────────────────────────────────────────────────

  const handlePayAndInitiate = async () => {
    if (paying) return;
    if (isPaid) {
      const rid = draft?._id;
      if (rid) router.push(`/company-registration-tracking/${rid}` as any);
      else router.push('/company-registration-upload-tracking');
      return;
    }
    if (!draft?._id) {
      Alert.alert(
        'Registration not synced',
        'Your application ID is missing. Go back one step and submit the form again, then return here to pay.',
      );
      return;
    }

    setPaying(true);
    setRazorpayModalVisible(true);
    setRazorpayHtml(null);
    try {
      const api = getApiBase();
      const receipt = (draft?.caseId || draft?._id || `company_reg_${Date.now()}`).toString().slice(0, 40);
      const res = await fetch(`${api}/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'company_registration',
          currency: 'INR',
          receipt,
        }),
      });
      const order = await parseApiJson<{
        ok: boolean;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        error?: string;
      }>(res, 'Create payment order');

      if (!order.ok || !order.orderId) {
        throw new Error(order.error ?? 'Could not create payment order');
      }

      // 2. Build WebView HTML and open it
      const checkoutDesc = [productTitle, productDescription].filter(Boolean).join(' · ').slice(0, 240);
      const logo = checkoutLogoUrl.trim() || checkoutLogoFromApiBase(getApiBase());
      const html = buildRazorpayHtml({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        name: 'Finovert',
        description: checkoutDesc || productTitle,
        logoUrl: logo,
        themeColor: '#3395ff',
      });
      setRazorpayHtml(html);
    } catch (err: unknown) {
      setRazorpayModalVisible(false);
      setRazorpayHtml(null);
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
        const api = getApiBase();
        const vRes = await fetch(`${api}/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: payload.razorpay_order_id,
            razorpay_payment_id: payload.razorpay_payment_id,
            razorpay_signature: payload.razorpay_signature,
          }),
        });
        const vData = await parseApiJson<{ ok: boolean; error?: string }>(vRes, 'Payment verify');

        if (!vData.ok) throw new Error(vData.error ?? 'Signature verification failed');

        const token = await getToken();
        const regId = draft?._id;
        if (!token) {
          throw new Error('Your session expired. Sign in again, then return to this screen.');
        }
        if (!regId) {
          throw new Error('Registration id missing. Submit the form again from the previous step.');
        }
        const done = await completeCompanyRegistrationPaymentApi(
          token,
          regId,
          payload.razorpay_order_id,
          payload.razorpay_payment_id,
          payload.razorpay_signature,
        );
        if (!done.ok) {
          throw new Error(done.error ?? 'Could not save payment on server');
        }

        await resetLocalCompanyRegistrationAfterPaymentSuccess();
        setDraft(null);
        setIsPaid(false);
        addNotification({
          title: 'Payment Successful',
          body: 'Payment received. Track progress in Status; you can start another company registration anytime.',
        });
        if (regId) router.push(`/company-registration-tracking/${regId}` as any);
        else router.push('/company-registration-upload-tracking');
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
        <View style={reviewRzpStyles.container}>
          <View style={reviewRzpStyles.header}>
            <View style={reviewRzpStyles.headerLeft}>
              <Text style={reviewRzpStyles.headerTitle}>Checkout</Text>
              <Text style={reviewRzpStyles.headerSub}>Razorpay · Finovert</Text>
            </View>
            <Pressable
              style={reviewRzpStyles.closeBtn}
              onPress={() => {
                setRazorpayModalVisible(false);
                Alert.alert('Payment Cancelled', 'You can try again anytime.');
              }}>
              <Ionicons name="close" size={22} color="#5f6368" />
            </Pressable>
          </View>
          <View style={reviewRzpStyles.secureBar}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.primary} />
            <Text style={reviewRzpStyles.secureText}>
              Encrypted checkout — UPI & wallets via Razorpay
            </Text>
          </View>
          {razorpayHtml ? (
            <WebView
              ref={webViewRef}
              source={{ html: razorpayHtml }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              cacheEnabled
              allowsBackForwardNavigationGestures={false}
              originWhitelist={['*']}
              renderLoading={() => (
                <View style={reviewRzpStyles.loading}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={reviewRzpStyles.loadingText}>Loading checkout…</Text>
                </View>
              )}
              onError={() => {
                setRazorpayModalVisible(false);
                Alert.alert(
                  'Checkout unavailable',
                  'Could not load the payment page. Check your connection and try again.',
                );
              }}
              onHttpError={(e) => {
                const code = e.nativeEvent.statusCode;
                if (code >= 400) {
                  setRazorpayModalVisible(false);
                  Alert.alert('Checkout error', `Payment page failed to load (${code}). Please try again.`);
                }
              }}
              style={reviewRzpStyles.webview}
            />
          ) : (
            <View style={reviewRzpStyles.loading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={reviewRzpStyles.loadingText}>Preparing payment…</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={reviewEditStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditModalVisible(false)} />
          <View style={reviewEditStyles.sheet}>
            <View style={reviewEditStyles.handle} />
            <Text style={reviewEditStyles.title}>Edit {editField?.label}</Text>
            {editField ? (
              <GoogleOutlinedField
                label={editField.label}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter ${editField.label}`}
                multiline={['businessActivity', 'registeredAddress'].includes(editField.key)}
                numberOfLines={['businessActivity', 'registeredAddress'].includes(editField.key) ? 3 : 1}
              />
            ) : null}
            <Pressable style={reviewEditStyles.saveBtn} onPress={saveEdit}>
              <Text style={reviewEditStyles.saveText}>Save</Text>
            </Pressable>
            <Pressable style={reviewEditStyles.cancelBtn} onPress={() => setEditModalVisible(false)}>
              <Text style={reviewEditStyles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={s.screen}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerCenterCol}>
            <View style={s.headerBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#188038" />
              <Text style={s.headerBadgeText}>Submitted</Text>
            </View>
            {draft?.caseId ? (
              <View style={s.caseIdInline}>
                <Text style={s.caseIdInlineLabel}>Case ID</Text>
                <Text style={s.caseIdInlineSep}>·</Text>
                <Text style={s.caseIdInlineValue} selectable numberOfLines={1}>
                  {draft.caseId}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={s.headerSub}>
            {draft?.caseId
              ? 'Company information is locked after your Case ID was generated.'
              : 'Please review your details below. Tap the edit icon on any row to update them before you complete payment.'}
          </Text>
        </View>

        {/* ── Summary Table ── */}
        {draft ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Company details</Text>
              {!draft.caseId ? <Text style={s.cardHint}>Editable</Text> : null}
            </View>

            <View>
              <TableRow label="Business Type" value={draft.businessType || ''} onEdit={() => openEdit({ section: 'company', key: 'businessType', label: 'Business Type', currentValue: draft.businessType || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Name 1 (Primary)" value={draft.proposedName1 || ''} onEdit={() => openEdit({ section: 'company', key: 'proposedName1', label: 'Proposed Name 1', currentValue: draft.proposedName1 || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Name 2" value={draft.proposedName2 || '—'} onEdit={() => openEdit({ section: 'company', key: 'proposedName2', label: 'Proposed Name 2', currentValue: draft.proposedName2 || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Name 3" value={draft.proposedName3 || '—'} onEdit={() => openEdit({ section: 'company', key: 'proposedName3', label: 'Proposed Name 3', currentValue: draft.proposedName3 || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Mobile" value={draft.companyMobile || ''} onEdit={() => openEdit({ section: 'company', key: 'companyMobile', label: 'Company Mobile', currentValue: draft.companyMobile || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Email" value={draft.companyEmail || ''} onEdit={() => openEdit({ section: 'company', key: 'companyEmail', label: 'Company Email', currentValue: draft.companyEmail || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Business Activity" value={draft.businessActivity || ''} onEdit={() => openEdit({ section: 'company', key: 'businessActivity', label: 'Business Activity', currentValue: draft.businessActivity || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Registered Address" value={draft.registeredAddress || ''} onEdit={() => openEdit({ section: 'company', key: 'registeredAddress', label: 'Registered Address', currentValue: draft.registeredAddress || '' })} isLocked={!!draft.caseId} />
              <TableRow label="Capital Structure" value={draft.capitalStructure || ''} onEdit={() => openEdit({ section: 'company', key: 'capitalStructure', label: 'Capital Structure', currentValue: draft.capitalStructure || '' })} isLocked={!!draft.caseId} />
            </View>
          </View>
        ) : null}

        {/* ── Director Cards ── */}
        {(draft?.directors || []).map((dir, i) => (
          <View key={`dir-${i}`} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Director {i + 1}</Text>
              <Text style={s.cardHint}>Editable</Text>
            </View>

            <View>
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

        {/* ── Timeline & Policy ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Timeline & policy</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
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

        {/* ── Locked until payment (Google list) ── */}
        <View style={s.card}>
          <View style={s.lockCardIntro}>
            <View style={s.lockIntroIconWrap}>
              <Ionicons name="lock-closed" size={20} color="#5f6368" />
            </View>
            <View style={s.lockIntroText}>
              <Text style={s.cardTitle}>Locked until payment</Text>
              <Text style={s.lockCardSub}>
                Complete payment below to unlock the next steps in your registration.
              </Text>
            </View>
          </View>
          <View style={s.lockList}>
            {LOCKED_UNTIL_PAYMENT.map((item, index) => (
              <View key={item.label}>
                <View style={s.lockListRow}>
                  <View style={s.lockFeatureIconWrap}>
                    <Ionicons name={item.icon} size={20} color="#1a73e8" />
                  </View>
                  <View style={s.lockListContent}>
                    <Text style={s.lockListLabel}>{item.label}</Text>
                    <Text style={s.lockListDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={18} color="#dadce0" />
                </View>
                {index < LOCKED_UNTIL_PAYMENT.length - 1 ? <View style={s.lockListDivider} /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* ── Payment ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Payment</Text>
          </View>
          <View style={s.paySummaryBody}>
            {paymentConfigLoading ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={Colors.primary} />
            ) : (
              <View style={s.payBreakdown}>
                <View style={s.payBreakdownRow}>
                  <Text style={s.payBreakdownLabel}>Base price</Text>
                  <Text style={s.payBreakdownValue}>{formatINR(basePriceINR)}</Text>
                </View>
                <View style={s.payBreakdownRow}>
                  <Text style={s.payBreakdownLabel}>GST ({gstPercent}%)</Text>
                  <Text style={s.payBreakdownValue}>
                    {gstPercent > 0 ? formatINR(gstAmountINR) : formatINR(0)}
                  </Text>
                </View>
                <View style={[s.payBreakdownRow, s.payBreakdownTotalRow]}>
                  <Text style={s.payBreakdownTotalLabel}>Total payable</Text>
                  <Text style={s.payBreakdownTotalValue}>{formatINR(paymentAmountINR)}</Text>
                </View>
              </View>
            )}
            {!razorpayConfiguredOnServer && !paymentConfigLoading ? (
              <View style={s.gatewayWarn}>
                <Ionicons name="warning-outline" size={16} color="#b45309" />
                <Text style={s.gatewayWarnText}>
                  We could not confirm Razorpay keys on the server (or the config endpoint failed). You can still tap Pay — if
                  checkout fails, update server .env and deploy, or use EXPO_PUBLIC_API_URL to point at the correct API.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

      </ScrollView>

      <View style={s.footer}>
        {paymentConfigLoading ? (
          <ActivityIndicator style={{ marginBottom: 12 }} color={Colors.primary} />
        ) : null}
        <Pressable
          style={[s.payBtn, paying && s.payBtnDisabled]}
          onPress={handlePayAndInitiate}
          disabled={paying || paymentConfigLoading}>
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isPaid ? 'checkmark-circle' : 'lock-open-outline'} size={20} color="#fff" />
              <Text style={s.payBtnText}>
                {isPaid ? 'Continue' : 'Pay'}
              </Text>
            </>
          )}
        </Pressable>
        <View style={s.secureFooter}>
          <Text style={s.secureNote}>
            Your payment is encrypted and secure. All payments are fully secure and powered by Razorpay.
          </Text>
          <View style={s.rzpPoweredRow}>
            <RazorpayBrandIcon size={16} />
            <Text style={s.rzpPoweredText}>Razorpay</Text>
          </View>
        </View>
      </View>
      </View>
    </>
  );
}