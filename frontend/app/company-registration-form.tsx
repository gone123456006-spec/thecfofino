import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { pickVisualMediaFromLibrary } from '@/utils/pick-visual-media';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const WINDOW_H = Dimensions.get('window').height;
/** Fixed height so ScrollView always scrolls when content overflows. */
const RECHECK_LIST_HEIGHT = Math.round(Math.min(WINDOW_H * 0.36, 280));

import {
  submitCompanyRegistrationToBackend,
  updateCompanyRegistrationInBackend,
  fetchMyRegistrations,
} from '@/api/company-registration';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { companyRegistrationFormStyles } from '@/styles/company-registration-form.styles';
import {
  loadCompanyRegistrationState,
  saveCompanyRegistrationState,
  setCompanyRegistrationDraft,
} from '@/utils/company-registration-draft';
import { GoogleOutlinedField } from '@/components/GoogleOutlinedField';
import { ms, sh } from '@/utils/responsive';
import {
  PAN_FORMAT_HINT,
  sanitizeAadhaarInput,
  sanitizeIndianMobileInput,
  sanitizePanInput,
  validateAadhaar,
  validateCompanyMobile,
  validatePan,
} from '@/utils/company-registration-validation';

type Director = {
  id: string;
  name: string;
  pan: string;
  aadhaar: string;
  shareholding: string;
  panFileUri: string | null;
  aadhaarFrontFileUri: string | null;
  aadhaarBackFileUri: string | null;
};

type UploadField = 'panFileUri' | 'aadhaarFrontFileUri' | 'aadhaarBackFileUri';

type UploadTarget = {
  directorId: string;
  field: UploadField;
  title: string;
} | null;

type PickType = 'camera' | 'gallery' | 'pdf';

const directorErrorKey = (
  id: string,
  field: 'name' | 'pan' | 'aadhaar' | 'shareholding' | UploadField,
) => `director.${id}.${field}`;

const getMime = (uri: string): string => {
  const l = uri.toLowerCase().split('?')[0];
  if (l.endsWith('.pdf')) return 'application/pdf';
  if (l.endsWith('.png')) return 'image/png';
  if (l.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

// ── Standalone pickers (outside component — no stale-closure risk) ────────────

// FIX #1: Use string literal 'images' — MediaTypeOptions is deprecated and
// silently breaks picker launch on some Android builds.
async function pickFromCamera(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take photos of your documents.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: true,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch (err) {
    console.error('[pickFromCamera]', err);
    Alert.alert('Camera Error', 'Could not open camera. Please try again.');
    return null;
  }
}

async function pickFromGallery(): Promise<string | null> {
  try {
    const result = await pickVisualMediaFromLibrary({
      quality: 0.7,
      allowsEditing: true,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    if (asset.type === 'video') {
      Alert.alert('Images or PDF only', 'Please choose a photo or use PDF for this document.');
      return null;
    }
    return asset.uri;
  } catch (err) {
    if (__DEV__) console.error('[pickFromGallery]', err);
    Alert.alert('Gallery Error', 'Could not open gallery. Please try again.');
    return null;
  }
}

async function pickPdf(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch (err) {
    console.error('[pickPdf]', err);
    Alert.alert('Document Error', 'Could not open document picker. Please try again.');
    return null;
  }
}

// FIX #2: Android ImagePicker returns content:// URIs. expo-file-system cannot
// read content:// directly — it needs a file:// URI. Copy to cache first, then read.
// This is the #1 silent failure cause on Android APKs.
async function uriToBase64(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('data:')) return uri;

  const mime = getMime(uri);
  const isImage = mime.startsWith('image/');

  let localUri = uri;
  let tempDest: string | null = null;

  try {
    // Android fix for content:// URIs
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      const ext = uri.split('.').pop()?.split('?')[0] ?? (isImage ? 'jpg' : 'pdf');
      tempDest = `${FileSystem.cacheDirectory}tmp_upload_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: tempDest });
      localUri = tempDest;
    }

    if (isImage) {
      try {
        const manip = await manipulateAsync(
          localUri,
          [{ resize: { width: 1200 } }],
          { compress: 0.6, format: SaveFormat.JPEG }
        );
        localUri = manip.uri;
        // If we created a tempDest for the content:// copy, we can delete it now as manip has its own temp file
        if (tempDest) {
          FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(() => {});
          tempDest = null;
        }
        tempDest = manip.uri; // track this for cleanup
      } catch (e) {
        console.warn('[uriToBase64] Resize failed, using original', e);
      }
    }

    const info = await FileSystem.getInfoAsync(localUri);
    if ('size' in info && typeof info.size === 'number' && info.size > 8 * 1024 * 1024) {
      throw new Error('Selected file is too large. Please choose a file smaller than 8 MB.');
    }

    const b64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Cleanup
    if (tempDest) {
      FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(() => {});
    }

    return b64 ? `data:${mime};base64,${b64}` : null;
  } catch (err) {
    console.error('[uriToBase64] failed:', err);
    if (err instanceof Error && err.message.includes('too large')) {
      Alert.alert('File too large', err.message);
    }
    if (tempDest) FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(() => {});
    return null;
  }
}

export default function CompanyRegistrationFormScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { addNotification } = useNotifications();
  const { businessType } = useLocalSearchParams<{ businessType?: string }>();

  const [resolvedBusinessType, setResolvedBusinessType] = useState(businessType ?? '');
  const [activeSection, setActiveSection] = useState<'company' | 'director'>('company');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [mongoId, setMongoId] = useState<string | null>(null);

  const [proposedName1, setProposedName1] = useState('');
  const [proposedName2, setProposedName2] = useState('');
  const [proposedName3, setProposedName3] = useState('');
  const [businessActivity, setBusinessActivity] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [capitalStructure, setCapitalStructure] = useState('');
  const [companyMobile, setCompanyMobile] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  const [directors, setDirectors] = useState<Director[]>([
    { id: 'dir-1', name: '', pan: '', aadhaar: '', shareholding: '', panFileUri: null, aadhaarFrontFileUri: null, aadhaarBackFileUri: null },
  ]);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // FIX #3: Store target and pick type in refs only — never depend on React
  // state inside async picker callbacks. State is async/batched; refs are instant.
  const uploadTargetRef = useRef<UploadTarget>(null);
  const pendingPickTypeRef = useRef<PickType | null>(null);
  const isPickingRef = useRef(false);
  const androidPickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [confirmedDisclaimer, setConfirmedDisclaimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [recheckVisible, setRecheckVisible] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('draft');
  const [serverStatus, setServerStatus] = useState<string | null>(null);

  const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    draft: { label: 'Draft Saved', color: '#92400e', bg: '#fef3c7', icon: 'create-outline' },
    submitted: { label: 'Submitted', color: '#1e40af', bg: '#dbeafe', icon: 'send-outline' },
    payment_pending: { label: 'Payment Pending', color: '#92400e', bg: '#fef3c7', icon: 'time-outline' },
    paid: { label: 'Paid', color: '#065f46', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
    upload_in_progress: { label: 'Processing', color: '#5b21b6', bg: '#ede9fe', icon: 'sync-outline' },
    completed: { label: 'Completed', color: '#065f46', bg: '#d1fae5', icon: 'checkmark-done-circle-outline' },
  };

  const getStatusDisplay = () => {
    const s = (serverStatus || currentStatus).toLowerCase();
    return STATUS_DISPLAY[s] || STATUS_DISPLAY['draft'];
  };

  /** Company fields frozen after Case ID is generated (proposed names → capital structure). */
  const companyDetailsLocked = Boolean(caseId);

  const openUploadModal = useCallback((target: UploadTarget) => {
    if (isPickingRef.current) return;
    uploadTargetRef.current = target;
    pendingPickTypeRef.current = null;
    setUploadModalVisible(true);
  }, []);

  const launchPendingPicker = useCallback(async () => {
    const pickType = pendingPickTypeRef.current;
    const target = uploadTargetRef.current;
    pendingPickTypeRef.current = null;

    if (!pickType || !target || isPickingRef.current) return;
    isPickingRef.current = true;

    try {
      let uri: string | null = null;
      if (pickType === 'camera') uri = await pickFromCamera();
      else if (pickType === 'gallery') uri = await pickFromGallery();
      else uri = await pickPdf();

      if (uri) {
        setDirectors((prev) =>
          prev.map((d) => (d.id === target.directorId ? { ...d, [target.field]: uri } : d)),
        );
        setErrors((prev) => {
          const key = directorErrorKey(target.directorId, target.field);
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    } finally {
      isPickingRef.current = false;
    }
  }, []);

  const handleUploadOption = useCallback((pickType: PickType) => {
    if (!uploadTargetRef.current || isPickingRef.current) return;
    pendingPickTypeRef.current = pickType;
    setUploadModalVisible(false);

    // Android APK fix: Modal.onDismiss is not reliable. Launch picker after modal closes.
    if (Platform.OS === 'android') {
      if (androidPickerTimerRef.current) {
        clearTimeout(androidPickerTimerRef.current);
      }
      androidPickerTimerRef.current = setTimeout(() => {
        androidPickerTimerRef.current = null;
        void launchPendingPicker();
      }, 120);
    }
  }, [launchPendingPicker]);

  const handleModalDismiss = useCallback(() => {
    if (Platform.OS === 'ios') {
      void launchPendingPicker();
    }
  }, [launchPendingPicker]);

  const addDirector = useCallback(() => {
    setDirectors((prev) => [
      ...prev,
      { id: `dir-${Date.now()}`, name: '', pan: '', aadhaar: '', shareholding: '', panFileUri: null, aadhaarFrontFileUri: null, aadhaarBackFileUri: null },
    ]);
  }, []);

  const removeDirector = useCallback((id: string) => {
    setDirectors((prev) => prev.length <= 1 ? prev : prev.filter((d) => d.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(`director.${id}.`)) delete next[k]; });
      return next;
    });
  }, []);

  const updateDirector = useCallback((id: string, field: 'name' | 'pan' | 'aadhaar' | 'shareholding', value: string) => {
    setDirectors((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
    setErrors((prev) => {
      const key = directorErrorKey(id, field);
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateSectionA = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!proposedName1.trim()) next.proposedName1 = 'Required';
    if (!businessActivity.trim()) next.businessActivity = 'Required';
    if (!registeredAddress.trim()) next.registeredAddress = 'Required';
    if (!capitalStructure.trim()) next.capitalStructure = 'Required';
    const mobileErr = validateCompanyMobile(companyMobile);
    if (mobileErr) next.companyMobile = mobileErr;
    if (!companyEmail.trim()) next.companyEmail = 'Required';
    return next;
  };

  const validateForm = () => {
    const next = validateSectionA();
    directors.forEach((d) => {
      if (!d.name.trim()) next[directorErrorKey(d.id, 'name')] = 'Required';
      const panErr = validatePan(d.pan);
      if (panErr) next[directorErrorKey(d.id, 'pan')] = panErr;
      const aadhaarErr = validateAadhaar(d.aadhaar);
      if (aadhaarErr) next[directorErrorKey(d.id, 'aadhaar')] = aadhaarErr;
      if (!d.shareholding.trim()) next[directorErrorKey(d.id, 'shareholding')] = 'Required';
      if (!d.panFileUri) next[directorErrorKey(d.id, 'panFileUri')] = 'Required';
      if (!d.aadhaarFrontFileUri) next[directorErrorKey(d.id, 'aadhaarFrontFileUri')] = 'Required';
      if (!d.aadhaarBackFileUri) next[directorErrorKey(d.id, 'aadhaarBackFileUri')] = 'Required';
    });
    if (!confirmedDisclaimer) next.disclaimer = 'Required';
    return next;
  };

  useEffect(() => {
    // Proactive permissions handled within pickers themselves for APK stability
  }, []);

  useEffect(() => {
    return () => {
      if (androidPickerTimerRef.current) {
        clearTimeout(androidPickerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      const state = await loadCompanyRegistrationState();
      if (state.draft) {
        const d = state.draft;
        if (d.caseId) setCaseId(d.caseId);
        if (d._id) setMongoId(d._id);
        setResolvedBusinessType(d.businessType || businessType || '');
        setProposedName1(d.proposedName1 || '');
        setProposedName2(d.proposedName2 || '');
        setProposedName3(d.proposedName3 || '');
        setBusinessActivity(d.businessActivity || '');
        setRegisteredAddress(d.registeredAddress || '');
        setCapitalStructure(d.capitalStructure || '');
        setCompanyMobile(d.companyMobile || '');
        setCompanyEmail(d.companyEmail || '');
        if (d.directors?.length) {
          setDirectors(d.directors.map((dir: any, idx: number) => ({
            id: dir.id ?? `dir-${idx}-${Date.now()}`,
            name: dir.name ?? '',
            pan: dir.pan ?? '',
            aadhaar: dir.aadhaar ?? '',
            shareholding: dir.shareholding ?? '',
            panFileUri: dir.panFileUri ?? null,
            aadhaarFrontFileUri: dir.aadhaarFrontFileUri ?? null,
            aadhaarBackFileUri: dir.aadhaarBackFileUri ?? null,
          })));
        }
      }
      if (state.status) {
        setCurrentStatus(state.status);
      }
      if (['submitted', 'payment_pending', 'paid', 'upload_in_progress', 'completed'].includes(state.status)) {
        setAlreadySubmitted(true);
      }
      
      // Fetch server status for accuracy
      try {
        const token = await getToken();
        if (token) {
          const list = await fetchMyRegistrations(token);
          if (list?.[0]?.status) setServerStatus(list[0].status);
        }
      } catch (_) {}

      setIsHydrated(true);
    })();
  }, []);

  useEffect(() => { if (businessType) setResolvedBusinessType(businessType); }, [businessType]);

  useEffect(() => {
    if (!isHydrated || alreadySubmitted) return;
    const timer = setTimeout(() => {
      const draft = {
        ...(caseId ? { caseId } : {}),
        ...(mongoId ? { _id: mongoId } : {}),
        businessType: resolvedBusinessType,
        proposedName1: proposedName1.trim(), proposedName2: proposedName2.trim(),
        proposedName3: proposedName3.trim(), businessActivity: businessActivity.trim(),
        registeredAddress: registeredAddress.trim(), capitalStructure: capitalStructure.trim(),
        companyMobile: companyMobile.trim(), companyEmail: companyEmail.trim(),
        directors: directors.map((d) => ({
          id: d.id, name: d.name.trim(), pan: d.pan.trim(), aadhaar: d.aadhaar.trim(),
          shareholding: d.shareholding.trim(), panFileUri: d.panFileUri,
          aadhaarFrontFileUri: d.aadhaarFrontFileUri, aadhaarBackFileUri: d.aadhaarBackFileUri,
        })),
      };
      setCompanyRegistrationDraft(draft);
      void saveCompanyRegistrationState({ draft, status: 'draft' });
    }, 800);
    return () => clearTimeout(timer);
  }, [isHydrated, alreadySubmitted, caseId, mongoId, resolvedBusinessType,
    proposedName1, proposedName2, proposedName3, businessActivity,
    registeredAddress, capitalStructure, companyMobile, companyEmail, directors]);

  const buildSectionADraft = useCallback(
    () => ({
      businessType: resolvedBusinessType,
      proposedName1: proposedName1.trim(),
      proposedName2: proposedName2.trim(),
      proposedName3: proposedName3.trim(),
      businessActivity: businessActivity.trim(),
      registeredAddress: registeredAddress.trim(),
      capitalStructure: capitalStructure.trim(),
      companyMobile: companyMobile.trim(),
      companyEmail: companyEmail.trim(),
      directors: directors.map((d) => ({
        id: d.id,
        name: d.name.trim(),
        pan: d.pan.trim(),
        aadhaar: d.aadhaar.trim(),
        shareholding: d.shareholding.trim(),
        panFileUri: d.panFileUri,
        aadhaarFrontFileUri: d.aadhaarFrontFileUri,
        aadhaarBackFileUri: d.aadhaarBackFileUri,
      })),
    }),
    [
      resolvedBusinessType,
      proposedName1,
      proposedName2,
      proposedName3,
      businessActivity,
      registeredAddress,
      capitalStructure,
      companyMobile,
      companyEmail,
      directors,
    ],
  );

  const handleReviewNext = () => {
    const errs = validateSectionA();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('Complete company details', 'Please fill all required company fields before continuing.');
      return;
    }
    setRecheckVisible(true);
  };

  const handleConfirmRecheck = async () => {
    setIsSubmitting(true);
    try {
      const draft = buildSectionADraft();
      const token = await getToken();
      let result;
      if (mongoId) {
        result = await updateCompanyRegistrationInBackend(mongoId, draft, token);
      } else {
        result = await submitCompanyRegistrationToBackend(draft, token);
        if (result.id) setMongoId(result.id);
      }
      const genCaseId = result.caseId || caseId;
      if (genCaseId) setCaseId(genCaseId);
      const full = { ...draft, caseId: genCaseId ?? undefined, _id: (result.id || mongoId) ?? undefined };
      setCompanyRegistrationDraft(full);
      void saveCompanyRegistrationState({ draft: full, status: 'draft' });
      setRecheckVisible(false);
      setActiveSection('director');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not generate Case ID. Try again.');
    }
    setIsSubmitting(false);
  };

  const recheckRows = [
    { label: 'Business type', value: resolvedBusinessType || '—' },
    { label: 'Proposed name 1', value: proposedName1.trim() || '—' },
    { label: 'Proposed name 2', value: proposedName2.trim() || '—' },
    { label: 'Proposed name 3', value: proposedName3.trim() || '—' },
    { label: 'Business activity', value: businessActivity.trim() || '—' },
    { label: 'Registered address', value: registeredAddress.trim() || '—' },
    { label: 'Company mobile', value: companyMobile.trim() ? `+91 ${companyMobile.trim()}` : '—' },
    { label: 'Company email', value: companyEmail.trim() || '—' },
    { label: 'Capital structure', value: capitalStructure.trim() || '—' },
  ];

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (alreadySubmitted) {
      Alert.alert('Already submitted', 'You already submitted your data. Please continue to payment.');
      router.push('/company-registration-review-paywall');
      return;
    }
    const errs = validateForm();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('Missing details', 'Please fill all highlighted fields before submitting.');
      return;
    }
    if (!caseId) {
      Alert.alert('Continue first', 'Please tap Next after filling company details to get your Case ID.');
      return;
    }
    setIsSubmitting(true);
    setSubmitDone(false);
    try {
      // FIX #5: Sequential base64 conversion — not parallel Promise.all.
      // On low-RAM Android, simultaneous large file reads exhaust the JS heap silently.
      const directorsWithB64: any[] = [];
      for (const d of directors) {
        directorsWithB64.push({
          name: d.name.trim(), pan: d.pan.trim(), aadhaar: d.aadhaar.trim(),
          shareholding: d.shareholding.trim(),
          panFileUri: await uriToBase64(d.panFileUri),
          aadhaarFrontFileUri: await uriToBase64(d.aadhaarFrontFileUri),
          aadhaarBackFileUri: await uriToBase64(d.aadhaarBackFileUri),
        });
      }
      const payload = {
        ...(caseId ? { caseId } : {}),
        businessType: resolvedBusinessType,
        proposedName1: proposedName1.trim(), proposedName2: proposedName2.trim(),
        proposedName3: proposedName3.trim(), businessActivity: businessActivity.trim(),
        registeredAddress: registeredAddress.trim(), capitalStructure: capitalStructure.trim(),
        companyMobile: companyMobile.trim(), companyEmail: companyEmail.trim(),
        directors: directorsWithB64,
      };
      const token = await getToken();
      const result = mongoId
        ? await updateCompanyRegistrationInBackend(mongoId, payload, token)
        : await submitCompanyRegistrationToBackend(payload, token);
      const genCaseId = result.caseId || caseId;
      const regMongoId = result.id || mongoId || undefined;
      if (result.id && !mongoId) setMongoId(result.id);
      setCaseId(genCaseId);
      const final = {
        ...payload,
        caseId: genCaseId,
        ...(regMongoId ? { _id: regMongoId } : {}),
      };
      setCompanyRegistrationDraft(final);
      await saveCompanyRegistrationState({
        draft: final, status: 'submitted',
        submittedAt: new Date().toISOString(), paymentStatus: 'unpaid',
      });
      setAlreadySubmitted(true);
      addNotification({ title: 'Company Registration Submitted', body: 'Your details are submitted successfully. Complete payment to continue filing.' });
      setSubmitDone(true);
      setTimeout(() => { setIsSubmitting(false); router.push('/company-registration-review-paywall'); }, 1200);
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('Submission failed', e instanceof Error ? e.message : 'Submission failed. Please try again.');
    }
  };

  return (
    <>
      <Modal visible={isSubmitting} transparent animationType="fade">
        <View style={companyRegistrationFormStyles.submitModalOverlay}>
          <View style={companyRegistrationFormStyles.submitModalCard}>
            {submitDone ? (
              <>
                <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
                <Text style={companyRegistrationFormStyles.submitModalTitle}>Done!</Text>
                <Text style={companyRegistrationFormStyles.submitModalSubtitle}>Your details have been submitted successfully.</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={companyRegistrationFormStyles.submitModalTitle}>Submitting your document…</Text>
                <Text style={companyRegistrationFormStyles.submitModalSubtitle}>Please wait while we save your details.</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onDismiss={handleModalDismiss}
        onRequestClose={() => {
          pendingPickTypeRef.current = null;
          setUploadModalVisible(false);
        }}
      >
        <Pressable
          style={uploadStyles.overlay}
          onPress={() => { pendingPickTypeRef.current = null; setUploadModalVisible(false); }}
        >
          <Pressable style={uploadStyles.sheet} onPress={() => { }}>
            <View style={uploadStyles.handle} />
            <Text style={uploadStyles.title}>{uploadTargetRef.current?.title ?? 'Upload Document'}</Text>
            <Text style={uploadStyles.subtitle}>Choose file type (JPEG, PNG or PDF)</Text>

            <Pressable style={({ pressed }) => [uploadStyles.option, pressed && uploadStyles.optionPressed]} onPress={() => handleUploadOption('camera')}>
              <View style={uploadStyles.iconWrap}><Ionicons name="camera" size={26} color={Colors.primary} /></View>
              <View style={uploadStyles.optionText}>
                <Text style={uploadStyles.optionTitle}>Take Photo</Text>
                <Text style={uploadStyles.optionDesc}>Use camera to capture document</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable style={({ pressed }) => [uploadStyles.option, pressed && uploadStyles.optionPressed]} onPress={() => handleUploadOption('gallery')}>
              <View style={uploadStyles.iconWrap}><Ionicons name="images" size={26} color={Colors.primary} /></View>
              <View style={uploadStyles.optionText}>
                <Text style={uploadStyles.optionTitle}>Gallery</Text>
                <Text style={uploadStyles.optionDesc}>JPEG or PNG from photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable style={({ pressed }) => [uploadStyles.option, pressed && uploadStyles.optionPressed]} onPress={() => handleUploadOption('pdf')}>
              <View style={uploadStyles.iconWrap}><Ionicons name="document-text" size={26} color={Colors.primary} /></View>
              <View style={uploadStyles.optionText}>
                <Text style={uploadStyles.optionTitle}>PDF Document</Text>
                <Text style={uploadStyles.optionDesc}>Select PDF file from storage</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable style={uploadStyles.cancelBtn} onPress={() => { pendingPickTypeRef.current = null; setUploadModalVisible(false); }}>
              <Text style={uploadStyles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={recheckVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => !isSubmitting && setRecheckVisible(false)}
      >
        <View style={companyRegistrationFormStyles.recheckOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !isSubmitting && setRecheckVisible(false)}
            accessibilityLabel="Close review"
          />
          <View style={companyRegistrationFormStyles.recheckSheet}>
            <View style={companyRegistrationFormStyles.recheckHandle} />
            <View style={companyRegistrationFormStyles.recheckHeader}>
              <Text style={companyRegistrationFormStyles.recheckTitle}>Review company details</Text>
              <Text style={companyRegistrationFormStyles.recheckSubtitle}>
                Check everything below. Your Case ID is created only after you confirm.
              </Text>
              <Text style={companyRegistrationFormStyles.recheckScrollHint}>
                Swipe up or down to see all fields
              </Text>
            </View>
            <ScrollView
              style={[companyRegistrationFormStyles.recheckScroll, { height: RECHECK_LIST_HEIGHT }]}
              contentContainerStyle={companyRegistrationFormStyles.recheckScrollContent}
              showsVerticalScrollIndicator
              persistentScrollbar={Platform.OS === 'android'}
              nestedScrollEnabled
              scrollEventThrottle={16}
              bounces
              alwaysBounceVertical
              keyboardShouldPersistTaps="handled"
            >
              {recheckRows.map((row) => (
                <View key={row.label} style={companyRegistrationFormStyles.recheckRow}>
                  <Text style={companyRegistrationFormStyles.recheckRowLabel}>{row.label}</Text>
                  <Text style={companyRegistrationFormStyles.recheckRowValue}>{row.value}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={companyRegistrationFormStyles.recheckActions}>
              <Pressable
                style={[companyRegistrationFormStyles.nextButton, isSubmitting && companyRegistrationFormStyles.ctaButtonDisabled]}
                onPress={handleConfirmRecheck}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={companyRegistrationFormStyles.nextButtonText}>Confirm & generate Case ID</Text>
                )}
              </Pressable>
              <Pressable
                style={companyRegistrationFormStyles.recheckBackBtn}
                onPress={() => setRecheckVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={companyRegistrationFormStyles.recheckBackText}>Go back and edit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={companyRegistrationFormStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={companyRegistrationFormStyles.container}
          contentContainerStyle={companyRegistrationFormStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={companyRegistrationFormStyles.progressBar}>
            <View style={[companyRegistrationFormStyles.progressStep, activeSection === 'company' ? companyRegistrationFormStyles.progressStepActive : companyRegistrationFormStyles.progressStepDone]} />
            <View style={[companyRegistrationFormStyles.progressStep, activeSection === 'director' ? companyRegistrationFormStyles.progressStepActive : activeSection === 'company' ? undefined : companyRegistrationFormStyles.progressStepDone]} />
          </View>

          {Object.keys(errors).length > 0 && (
            <Text style={companyRegistrationFormStyles.validationHint}>Missing details in red fields. Please complete them.</Text>
          )}
          {!!resolvedBusinessType && (
            <Text style={{ fontSize: ms(14), color: Colors.textMuted, marginBottom: sh(16) }}>Business type: {resolvedBusinessType}</Text>
          )}

          <View style={companyRegistrationFormStyles.section}>
            <Text style={companyRegistrationFormStyles.sectionTitle}>Company details</Text>
            <Text style={companyRegistrationFormStyles.sectionLead}>
              {companyDetailsLocked
                ? 'Company details below are locked to your Case ID. You can still add director information.'
                : 'Enter your company information. Fields marked optional can be left blank.'}
            </Text>

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Proposed names</Text>
            <GoogleOutlinedField
              label="Proposed name 1"
              value={proposedName1}
              onChangeText={(v) => { setProposedName1(v); clearError('proposedName1'); }}
              placeholder="Enter first choice name"
              error={errors.proposedName1}
              locked={companyDetailsLocked}
              onFocus={() => setActiveSection('company')}
            />
            <GoogleOutlinedField
              label="Proposed name 2"
              value={proposedName2}
              onChangeText={setProposedName2}
              placeholder="Second choice (if any)"
              optional={!companyDetailsLocked}
              locked={companyDetailsLocked}
            />
            <GoogleOutlinedField
              label="Proposed name 3"
              value={proposedName3}
              onChangeText={setProposedName3}
              placeholder="Third choice (if any)"
              optional={!companyDetailsLocked}
              locked={companyDetailsLocked}
            />

            <GoogleOutlinedField
              label="Business activity"
              value={businessActivity}
              onChangeText={(v) => { setBusinessActivity(v); clearError('businessActivity'); }}
              placeholder="Describe your business activity"
              error={errors.businessActivity}
              locked={companyDetailsLocked}
              multiline
              numberOfLines={3}
            />

            <GoogleOutlinedField
              label="Registered address"
              value={registeredAddress}
              onChangeText={(v) => { setRegisteredAddress(v); clearError('registeredAddress'); }}
              placeholder="Full registered office address"
              error={errors.registeredAddress}
              locked={companyDetailsLocked}
              multiline
              numberOfLines={3}
            />

            <GoogleOutlinedField
              label="Company mobile number"
              value={companyMobile}
              onChangeText={(v) => { setCompanyMobile(sanitizeIndianMobileInput(v)); clearError('companyMobile'); }}
              placeholder="10-digit mobile (starts with 6–9)"
              error={errors.companyMobile}
              locked={companyDetailsLocked}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <GoogleOutlinedField
              label="Company email"
              value={companyEmail}
              onChangeText={(v) => { setCompanyEmail(v); clearError('companyEmail'); }}
              placeholder="e.g. company@gmail.com"
              error={errors.companyEmail}
              locked={companyDetailsLocked}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <GoogleOutlinedField
              label="Capital structure"
              value={capitalStructure}
              onChangeText={(v) => { setCapitalStructure(v); clearError('capitalStructure'); }}
              placeholder="e.g. ₹1,00,000"
              error={errors.capitalStructure}
              locked={companyDetailsLocked}
              keyboardType="numeric"
            />

            {!caseId && (
              <Pressable
                style={companyRegistrationFormStyles.nextButton}
                onPress={handleReviewNext}
                disabled={isSubmitting || alreadySubmitted}
              >
                <Text style={companyRegistrationFormStyles.nextButtonText}>Review & continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          {caseId && (
            <View style={companyRegistrationFormStyles.caseCard}>
              <View style={companyRegistrationFormStyles.caseCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={companyRegistrationFormStyles.caseCardTitle}>Case ID</Text>
                  <Text style={companyRegistrationFormStyles.caseIdText} selectable>
                    {caseId}
                  </Text>
                </View>
                <View
                  style={[
                    companyRegistrationFormStyles.caseStatusChip,
                    { backgroundColor: getStatusDisplay().bg },
                  ]}>
                  <Ionicons name={getStatusDisplay().icon as any} size={12} color={getStatusDisplay().color} />
                  <Text
                    style={[
                      companyRegistrationFormStyles.caseStatusChipText,
                      { color: getStatusDisplay().color },
                    ]}>
                    {getStatusDisplay().label}
                  </Text>
                </View>
              </View>
              <Text style={companyRegistrationFormStyles.caseCardHint}>
                Add director details below, then submit.
              </Text>
            </View>
          )}

          <View style={companyRegistrationFormStyles.section}>
            <View style={companyRegistrationFormStyles.sectionHeaderRow}>
              <Text style={[companyRegistrationFormStyles.sectionTitle, companyRegistrationFormStyles.sectionTitleCompact]}>Director details</Text>
              <Pressable style={companyRegistrationFormStyles.addDirectorBtn} onPress={addDirector}>
                <Ionicons name="add-circle" size={24} color={Colors.primary} />
                <Text style={companyRegistrationFormStyles.addDirectorBtnText}>Add Director</Text>
              </Pressable>
            </View>

            {directors.map((director, index) => (
              <View key={director.id} style={companyRegistrationFormStyles.directorCard}>
                <View style={companyRegistrationFormStyles.directorCardHeader}>
                  <Text style={companyRegistrationFormStyles.directorCardTitle}>Director {index + 1}</Text>
                  {directors.length > 1 && (
                    <Pressable onPress={() => removeDirector(director.id)} hitSlop={8} style={companyRegistrationFormStyles.removeDirectorBtn}>
                      <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                <GoogleOutlinedField
                  label="Director name"
                  value={director.name}
                  onChangeText={(v) => updateDirector(director.id, 'name', v)}
                  placeholder="Full name as on PAN"
                  error={errors[directorErrorKey(director.id, 'name')]}
                  onFocus={() => setActiveSection('director')}
                  autoCapitalize="words"
                />

                <GoogleOutlinedField
                  label="PAN number"
                  value={director.pan}
                  onChangeText={(v) => updateDirector(director.id, 'pan', sanitizePanInput(v))}
                  placeholder={PAN_FORMAT_HINT}
                  error={errors[directorErrorKey(director.id, 'pan')]}
                  autoCapitalize="characters"
                  maxLength={10}
                />

                <Pressable style={[uploadStyles.uploadBtn, errors[directorErrorKey(director.id, 'panFileUri')] && uploadStyles.uploadBtnError, director.panFileUri ? uploadStyles.uploadBtnSuccess : null]} onPress={() => openUploadModal({ directorId: director.id, field: 'panFileUri', title: 'Upload PAN Card' })}>
                  <Ionicons name={director.panFileUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={director.panFileUri ? '#188038' : Colors.primary} />
                  <Text style={[uploadStyles.uploadBtnText, director.panFileUri ? uploadStyles.uploadBtnTextSuccess : null]}>{director.panFileUri ? 'PAN uploaded ✓' : 'Upload PAN (JPEG / PDF)'}</Text>
                </Pressable>
                {director.panFileUri && <Text style={uploadStyles.savedTag}>✔ Document saved</Text>}

                <GoogleOutlinedField
                  label="Aadhaar number"
                  value={director.aadhaar}
                  onChangeText={(v) => updateDirector(director.id, 'aadhaar', sanitizeAadhaarInput(v))}
                  placeholder="12-digit Aadhaar number"
                  error={errors[directorErrorKey(director.id, 'aadhaar')]}
                  keyboardType="number-pad"
                  maxLength={12}
                />

                <Pressable style={[uploadStyles.uploadBtn, errors[directorErrorKey(director.id, 'aadhaarFrontFileUri')] && uploadStyles.uploadBtnError, director.aadhaarFrontFileUri ? uploadStyles.uploadBtnSuccess : null]} onPress={() => openUploadModal({ directorId: director.id, field: 'aadhaarFrontFileUri', title: 'Upload Aadhaar (Front)' })}>
                  <Ionicons name={director.aadhaarFrontFileUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={director.aadhaarFrontFileUri ? '#188038' : Colors.primary} />
                  <Text style={[uploadStyles.uploadBtnText, director.aadhaarFrontFileUri ? uploadStyles.uploadBtnTextSuccess : null]}>{director.aadhaarFrontFileUri ? 'Aadhaar (Front) uploaded ✓' : 'Upload Aadhaar Front (JPEG / PDF)'}</Text>
                </Pressable>

                <Pressable style={[uploadStyles.uploadBtn, errors[directorErrorKey(director.id, 'aadhaarBackFileUri')] && uploadStyles.uploadBtnError, director.aadhaarBackFileUri ? uploadStyles.uploadBtnSuccess : null, { marginTop: sh(8) }]} onPress={() => openUploadModal({ directorId: director.id, field: 'aadhaarBackFileUri', title: 'Upload Aadhaar (Back)' })}>
                  <Ionicons name={director.aadhaarBackFileUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={director.aadhaarBackFileUri ? '#188038' : Colors.primary} />
                  <Text style={[uploadStyles.uploadBtnText, director.aadhaarBackFileUri ? uploadStyles.uploadBtnTextSuccess : null]}>{director.aadhaarBackFileUri ? 'Aadhaar (Back) uploaded ✓' : 'Upload Aadhaar Back (JPEG / PDF)'}</Text>
                </Pressable>

                {(director.aadhaarFrontFileUri || director.aadhaarBackFileUri) && (
                  <Text style={uploadStyles.savedTag}>✔ Documents saved locally</Text>
                )}

                <GoogleOutlinedField
                  label="Shareholding %"
                  value={director.shareholding}
                  onChangeText={(v) => updateDirector(director.id, 'shareholding', v)}
                  placeholder="e.g. 50"
                  error={errors[directorErrorKey(director.id, 'shareholding')]}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          <View style={companyRegistrationFormStyles.disclaimerBlock}>
            <Text style={companyRegistrationFormStyles.disclaimerText}>
              By submitting this form, you confirm that all information and documents provided (including company details, director details, PAN & Aadhaar) are correct, accurate and genuine. Finovert reserves the right to verify the submitted documents. Finovert does not take any risk for false or fraudulent documents submitted by the applicant.
            </Text>
            <Pressable style={[companyRegistrationFormStyles.checkboxRow, errors.disclaimer && companyRegistrationFormStyles.checkboxRowError]} onPress={() => { setConfirmedDisclaimer((v) => !v); clearError('disclaimer'); }}>
              <Ionicons name={confirmedDisclaimer ? 'checkbox' : 'checkbox-outline'} size={24} color={confirmedDisclaimer ? Colors.primary : errors.disclaimer ? '#ef4444' : Colors.textMuted} />
              <Text style={companyRegistrationFormStyles.checkboxLabel}>I confirm that all documents and information are correct and verified</Text>
            </Pressable>
          </View>

          <Pressable
            style={[companyRegistrationFormStyles.ctaButton, (!caseId || !confirmedDisclaimer || isSubmitting || alreadySubmitted) && companyRegistrationFormStyles.ctaButtonDisabled]}
            onPress={handleSubmit}
            disabled={!caseId || !confirmedDisclaimer || isSubmitting || alreadySubmitted}
          >
            <Text style={companyRegistrationFormStyles.ctaButtonText}>
              {alreadySubmitted ? 'Already submitted' : caseId ? 'Submit your details' : 'Submit'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const uploadStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 10, backgroundColor: '#f9fafb' },
  optionPressed: { backgroundColor: '#f3f4f6' },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  optionDesc: { fontSize: 12, color: '#6b7280' },
  cancelBtn: { marginTop: 6, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#B8D4E8', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 6, backgroundColor: '#F5F7FA', minHeight: 52 },
  uploadBtnError: { borderColor: '#d93025', backgroundColor: '#FEF7F7' },
  uploadBtnSuccess: { borderColor: '#188038', backgroundColor: '#e6f4ea' },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  uploadBtnTextSuccess: { color: '#188038' },
  savedTag: { fontSize: 12, color: '#22c55e', marginTop: 2, marginBottom: 8, marginLeft: 4 },
});
