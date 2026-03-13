import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import {
  submitCompanyRegistrationToBackend,
  updateCompanyRegistrationInBackend,
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
import { ms, sh, sw } from '@/utils/responsive';

// ─── Types ───────────────────────────────────────────────────────────────────

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

type UploadTarget = {
  directorId: string;
  field: 'panFileUri' | 'aadhaarFrontFileUri' | 'aadhaarBackFileUri';
  title: string;
} | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const directorErrorKey = (
  id: string,
  field: 'name' | 'pan' | 'aadhaar' | 'shareholding' | 'panFileUri' | 'aadhaarFrontFileUri' | 'aadhaarBackFileUri',
) => `director.${id}.${field}`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanyRegistrationFormScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { addNotification } = useNotifications();
  const { businessType } = useLocalSearchParams<{ businessType?: string }>();
  const [resolvedBusinessType, setResolvedBusinessType] = useState(businessType || '');
  const [activeSection, setActiveSection] = useState<'company' | 'director'>('company');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [mongoId, setMongoId] = useState<string | null>(null);

  // Section A
  const [proposedName1, setProposedName1] = useState('');
  const [proposedName2, setProposedName2] = useState('');
  const [proposedName3, setProposedName3] = useState('');
  const [businessActivity, setBusinessActivity] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [capitalStructure, setCapitalStructure] = useState('');
  const [companyMobile, setCompanyMobile] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  // Section B
  const [directors, setDirectors] = useState<Director[]>([
    { id: '1', name: '', pan: '', aadhaar: '', shareholding: '', panFileUri: null, aadhaarFrontFileUri: null, aadhaarBackFileUri: null },
  ]);

  // Upload modal — stores WHAT to upload; picker fires AFTER modal fully hides
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const pendingPickTypeRef = useRef<'camera' | 'gallery' | 'pdf' | null>(null);
  const isPickingRef = useRef(false);

  const [confirmedDisclaimer, setConfirmedDisclaimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Upload flow ────────────────────────────────────────────────────────────

  /** Step 1 – open the choice modal */
  const openUploadModal = useCallback((target: UploadTarget) => {
    pendingPickTypeRef.current = null;
    setUploadTarget(target);
    setUploadModalVisible(true);
  }, []);

  /** Step 2 – user picks an option; close modal and remember choice */
  const handleUploadOption = useCallback((type: 'camera' | 'gallery' | 'pdf') => {
    pendingPickTypeRef.current = type;
    setUploadModalVisible(false); // onDismiss / onRequestClose will fire the picker
  }, []);

  /** Step 3 – modal is fully gone; now open the native picker safely */
  const onUploadModalDismiss = useCallback(async () => {
    const type = pendingPickTypeRef.current;
    const target = uploadTarget;
    pendingPickTypeRef.current = null;

    if (!type || !target || isPickingRef.current) return;
    isPickingRef.current = true;

    try {
      let uri: string | null = null;

      if (type === 'pdf') {
        uri = await launchDocumentPicker();
      } else {
        uri = await launchImagePicker(type);
      }

      if (uri) {
        setDirectors((prev) =>
          prev.map((d) => (d.id === target.directorId ? { ...d, [target.field]: uri } : d)),
        );
        clearError(directorErrorKey(target.directorId, target.field));
      }
    } finally {
      isPickingRef.current = false;
    }
  }, [uploadTarget]);

  useEffect(() => {
    if (!uploadModalVisible && pendingPickTypeRef.current && uploadTarget) {
      if (Platform.OS === 'android') {
        const timer = setTimeout(() => onUploadModalDismiss(), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [uploadModalVisible, uploadTarget, onUploadModalDismiss]);

  const launchImagePicker = async (source: 'camera' | 'gallery'): Promise<string | null> => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'We need access to your camera to take photos of documents. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return null;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
          base64: false,
        });
        return result.canceled ? null : (result.assets?.[0]?.uri ?? null);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Gallery Permission Required',
            'We need access to your photos to upload documents. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return null;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
          base64: false,
        });
        return result.canceled ? null : (result.assets?.[0]?.uri ?? null);
      }
    } catch (error) {
      console.error('[launchImagePicker] Error:', error);
      Alert.alert('Error', 'An unexpected error occurred while opening the camera or gallery.');
      return null;
    }
  };

  const launchDocumentPicker = async (): Promise<string | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return null;
      return result.assets?.[0]?.uri ?? null;
    } catch (e) {
      console.warn('[launchDocumentPicker]', e);
      Alert.alert('Error', 'Could not open document picker. Please try again.');
      return null;
    }
  };

  // ── Directors helpers ──────────────────────────────────────────────────────

  const addDirector = () =>
    setDirectors((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', pan: '', aadhaar: '', shareholding: '', panFileUri: null, aadhaarFrontFileUri: null, aadhaarBackFileUri: null },
    ]);

  const removeDirector = (id: string) => {
    if (directors.length <= 1) return;
    setDirectors((prev) => prev.filter((d) => d.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(`director.${id}.`)) delete next[k]; });
      return next;
    });
  };

  const updateDirector = (id: string, field: 'name' | 'pan' | 'aadhaar' | 'shareholding', value: string) => {
    setDirectors((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
    clearError(directorErrorKey(id, field));
  };

  const clearError = (key: string) =>
    setErrors((prev) => { if (!prev[key]) return prev; const n = { ...prev }; delete n[key]; return n; });

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateSectionA = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!proposedName1.trim()) next.proposedName1 = 'Required';
    if (!businessActivity.trim()) next.businessActivity = 'Required';
    if (!registeredAddress.trim()) next.registeredAddress = 'Required';
    if (!capitalStructure.trim()) next.capitalStructure = 'Required';
    if (!companyMobile.trim()) next.companyMobile = 'Required';
    if (!companyEmail.trim()) next.companyEmail = 'Required';
    return next;
  };

  const validateForm = () => {
    const next = validateSectionA();
    directors.forEach((d) => {
      if (!d.name.trim()) next[directorErrorKey(d.id, 'name')] = 'Required';
      if (!d.pan.trim()) next[directorErrorKey(d.id, 'pan')] = 'Required';
      if (!d.aadhaar.trim()) next[directorErrorKey(d.id, 'aadhaar')] = 'Required';
      if (!d.shareholding.trim()) next[directorErrorKey(d.id, 'shareholding')] = 'Required';
      if (!d.panFileUri) next[directorErrorKey(d.id, 'panFileUri')] = 'Required';
      if (!d.aadhaarFrontFileUri) next[directorErrorKey(d.id, 'aadhaarFrontFileUri')] = 'Required';
      if (!d.aadhaarBackFileUri) next[directorErrorKey(d.id, 'aadhaarBackFileUri')] = 'Required';
    });
    if (!confirmedDisclaimer) next.disclaimer = 'Required';
    return next;
  };

  // ── Hydration / draft persistence ─────────────────────────────────────────

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
            id: `${idx + 1}-${Date.now()}-${idx}`,
            ...dir,
          })));
        }
      }
      if (['submitted', 'payment_pending', 'paid', 'upload_in_progress', 'completed'].includes(state.status)) {
        setAlreadySubmitted(true);
      }
      setIsHydrated(true);
    })();
  }, [businessType]);

  useEffect(() => { if (businessType) setResolvedBusinessType(businessType); }, [businessType]);

  useEffect(() => {
    if (!isHydrated || alreadySubmitted) return;
    const draft = {
      ...(caseId ? { caseId } : {}),
      ...(mongoId ? { _id: mongoId } : {}),
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
        name: d.name.trim(), pan: d.pan.trim(), aadhaar: d.aadhaar.trim(),
        shareholding: d.shareholding.trim(), panFileUri: d.panFileUri, aadhaarFrontFileUri: d.aadhaarFrontFileUri, aadhaarBackFileUri: d.aadhaarBackFileUri,
      })),
    };
    setCompanyRegistrationDraft(draft);
    void saveCompanyRegistrationState({ draft, status: 'draft' });
  }, [isHydrated, alreadySubmitted, caseId, mongoId, businessType, resolvedBusinessType,
    proposedName1, proposedName2, proposedName3, businessActivity, registeredAddress,
    capitalStructure, companyMobile, companyEmail, directors]);

  // ── File → base64 ─────────────────────────────────────────────────────────

  const uriToDataUrl = async (uri: string | null): Promise<string | null> => {
    if (!uri) return null;
    if (uri.startsWith('data:')) return uri;
    const getMime = (u: string) => {
      const l = u.toLowerCase();
      if (l.endsWith('.pdf')) return 'application/pdf';
      if (l.endsWith('.png')) return 'image/png';
      if (l.endsWith('.webp')) return 'image/webp';
      return 'image/jpeg';
    };
    const tryRead = async (u: string) => {
      try {
        const b64 = await FileSystem.readAsStringAsync(u, { encoding: FileSystem.EncodingType.Base64 });
        return `data:${getMime(uri)};base64,${b64}`;
      } catch { return null; }
    };
    const direct = await tryRead(uri);
    if (direct) return direct;
    try {
      const filename = (uri.split('/').pop() || `doc_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const dest = `${FileSystem.documentDirectory || ''}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return tryRead(dest);
    } catch { return null; }
  };

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handleNext = async () => {
    const errs = validateSectionA();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('Complete company details', 'Please fill all required company fields before continuing.');
      return;
    }
    setIsSubmitting(true);
    try {
      const draft = {
        businessType: resolvedBusinessType,
        proposedName1: proposedName1.trim(), proposedName2: proposedName2.trim(),
        proposedName3: proposedName3.trim(), businessActivity: businessActivity.trim(),
        registeredAddress: registeredAddress.trim(), capitalStructure: capitalStructure.trim(),
        companyMobile: companyMobile.trim(), companyEmail: companyEmail.trim(),
        directors: directors.map((d) => ({
          name: d.name.trim(), pan: d.pan.trim(), aadhaar: d.aadhaar.trim(),
          shareholding: d.shareholding.trim(), panFileUri: d.panFileUri, aadhaarFrontFileUri: d.aadhaarFrontFileUri, aadhaarBackFileUri: d.aadhaarBackFileUri,
        })),
      };
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
      const full = { ...draft, caseId: genCaseId || undefined, _id: result.id || mongoId || undefined };
      setCompanyRegistrationDraft(full);
      void saveCompanyRegistrationState({ draft: full, status: 'draft' });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save section A');
    }
    setIsSubmitting(false);
  };

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
      const directorsWithB64 = await Promise.all(
        directors.map(async (d) => ({
          name: d.name.trim(), pan: d.pan.trim(), aadhaar: d.aadhaar.trim(),
          shareholding: d.shareholding.trim(),
          panFileUri: await uriToDataUrl(d.panFileUri),
          aadhaarFrontFileUri: await uriToDataUrl(d.aadhaarFrontFileUri),
          aadhaarBackFileUri: await uriToDataUrl(d.aadhaarBackFileUri),
        })),
      );
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
      setCaseId(genCaseId);
      const final = { ...payload, caseId: genCaseId };
      setCompanyRegistrationDraft(final);
      await saveCompanyRegistrationState({
        draft: final, status: 'submitted',
        submittedAt: new Date().toISOString(), paymentStatus: 'unpaid',
      });
      setAlreadySubmitted(true);
      addNotification({
        title: 'Company Registration Submitted',
        body: 'Your details are submitted successfully. Complete payment to continue filing.',
      });
      setSubmitDone(true);
      setTimeout(() => { setIsSubmitting(false); router.push('/company-registration-review-paywall'); }, 1200);
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('Submission failed', e instanceof Error ? e.message : 'Submission failed. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Submit modal */}
      <Modal visible={isSubmitting} transparent animationType="fade">
        <View style={companyRegistrationFormStyles.submitModalOverlay}>
          <View style={companyRegistrationFormStyles.submitModalCard}>
            {submitDone ? (
              <>
                <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
                <Text style={companyRegistrationFormStyles.submitModalTitle}>Done!</Text>
                <Text style={companyRegistrationFormStyles.submitModalSubtitle}>
                  Your details have been submitted successfully.
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={companyRegistrationFormStyles.submitModalTitle}>Submitting your document…</Text>
                <Text style={companyRegistrationFormStyles.submitModalSubtitle}>
                  Please wait while we save your details.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Upload Options Modal ── */}
      {/* KEY FIX: onDismiss fires AFTER the modal is fully gone on both iOS & Android.
          We then open the native picker from there — no setTimeout hacks needed. */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { pendingPickTypeRef.current = null; setUploadModalVisible(false); }}
        onDismiss={onUploadModalDismiss}   // iOS: fires after animation ends
      >
        <Pressable style={uploadStyles.overlay} onPress={() => { pendingPickTypeRef.current = null; setUploadModalVisible(false); }}>
          <Pressable style={uploadStyles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={uploadStyles.handle} />

            <Text style={uploadStyles.title}>{uploadTarget?.title ?? 'Upload Document'}</Text>
            <Text style={uploadStyles.subtitle}>Choose file type (JPEG, PNG or PDF)</Text>

            {/* Take Photo */}
            <Pressable
              style={({ pressed }) => [uploadStyles.option, pressed && uploadStyles.optionPressed]}
              onPress={() => handleUploadOption('camera')}>
              <View style={uploadStyles.iconWrap}>
                <Ionicons name="camera" size={26} color={Colors.primary} />
              </View>
              <View style={uploadStyles.optionText}>
                <Text style={uploadStyles.optionTitle}>Take Photo</Text>
                <Text style={uploadStyles.optionDesc}>Use camera to capture</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            {/* Gallery */}
            <Pressable
              style={({ pressed }) => [uploadStyles.option, pressed && uploadStyles.optionPressed]}
              onPress={() => handleUploadOption('gallery')}>
              <View style={uploadStyles.iconWrap}>
                <Ionicons name="images" size={26} color={Colors.primary} />
              </View>
              <View style={uploadStyles.optionText}>
                <Text style={uploadStyles.optionTitle}>Gallery</Text>
                <Text style={uploadStyles.optionDesc}>JPEG or PNG from photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            {/* PDF */}
            <Pressable
              style={({ pressed }) => [uploadStyles.option, pressed && uploadStyles.optionPressed]}
              onPress={() => handleUploadOption('pdf')}>
              <View style={uploadStyles.iconWrap}>
                <Ionicons name="document-text" size={26} color={Colors.primary} />
              </View>
              <View style={uploadStyles.optionText}>
                <Text style={uploadStyles.optionTitle}>PDF Document</Text>
                <Text style={uploadStyles.optionDesc}>Select PDF file</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            {/* Cancel */}
            <Pressable
              style={uploadStyles.cancelBtn}
              onPress={() => { pendingPickTypeRef.current = null; setUploadModalVisible(false); }}>
              <Text style={uploadStyles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Main Form ── */}
      <KeyboardAvoidingView
        style={companyRegistrationFormStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          style={companyRegistrationFormStyles.container}
          contentContainerStyle={companyRegistrationFormStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Progress bar */}
          <View style={companyRegistrationFormStyles.progressBar}>
            <View style={[companyRegistrationFormStyles.progressStep, activeSection === 'company' ? companyRegistrationFormStyles.progressStepActive : companyRegistrationFormStyles.progressStepDone]} />
            <View style={[companyRegistrationFormStyles.progressStep, activeSection === 'director' ? companyRegistrationFormStyles.progressStepActive : activeSection === 'company' ? undefined : companyRegistrationFormStyles.progressStepDone]} />
          </View>

          {Object.keys(errors).length > 0 && (
            <Text style={companyRegistrationFormStyles.validationHint}>
              Missing details in red fields. Please complete them.
            </Text>
          )}

          {!!resolvedBusinessType && (
            <Text style={{ fontSize: ms(14), color: Colors.textMuted, marginBottom: sh(16) }}>
              Business type: {resolvedBusinessType}
            </Text>
          )}

          {/* ── Section A ── */}
          <View style={companyRegistrationFormStyles.section}>
            <Text style={companyRegistrationFormStyles.sectionTitle}>Section A – Company Details</Text>

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Proposed Names (3)</Text>
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline, errors.proposedName1 && companyRegistrationFormStyles.inputError]}
              value={proposedName1}
              onChangeText={(v) => { setProposedName1(v); clearError('proposedName1'); }}
              placeholder="Proposed name 1"
              placeholderTextColor={Colors.textMuted}
              onFocus={() => setActiveSection('company')}
            />
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline]}
              value={proposedName2} onChangeText={setProposedName2}
              placeholder="Proposed name 2" placeholderTextColor={Colors.textMuted} />
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline]}
              value={proposedName3} onChangeText={setProposedName3}
              placeholder="Proposed name 3" placeholderTextColor={Colors.textMuted} />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Business Activity</Text>
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputMultiline, companyRegistrationFormStyles.inputNoOutline, errors.businessActivity && companyRegistrationFormStyles.inputError]}
              value={businessActivity}
              onChangeText={(v) => { setBusinessActivity(v); clearError('businessActivity'); }}
              placeholder="Describe your business activity" placeholderTextColor={Colors.textMuted} multiline />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Registered Address</Text>
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputMultiline, companyRegistrationFormStyles.inputNoOutline, errors.registeredAddress && companyRegistrationFormStyles.inputError]}
              value={registeredAddress}
              onChangeText={(v) => { setRegisteredAddress(v); clearError('registeredAddress'); }}
              placeholder="Full registered office address" placeholderTextColor={Colors.textMuted} multiline />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Company Mobile Number</Text>
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline, errors.companyMobile && companyRegistrationFormStyles.inputError]}
              value={companyMobile}
              onChangeText={(v) => { setCompanyMobile(v); clearError('companyMobile'); }}
              placeholder="e.g. 9876543210" placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad" maxLength={10} />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Company Email (Gmail ID)</Text>
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline, errors.companyEmail && companyRegistrationFormStyles.inputError]}
              value={companyEmail}
              onChangeText={(v) => { setCompanyEmail(v); clearError('companyEmail'); }}
              placeholder="e.g. company@gmail.com" placeholderTextColor={Colors.textMuted}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Capital Structure</Text>
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline, errors.capitalStructure && companyRegistrationFormStyles.inputError]}
              value={capitalStructure}
              onChangeText={(v) => { setCapitalStructure(v); clearError('capitalStructure'); }}
              placeholder="e.g. ₹1,00,000" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />

            {!caseId && (
              <Pressable
                style={companyRegistrationFormStyles.nextButton}
                onPress={handleNext}
                disabled={isSubmitting || alreadySubmitted}>
                <Text style={companyRegistrationFormStyles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          {caseId && (
            <View style={companyRegistrationFormStyles.caseCard}>
              <Text style={companyRegistrationFormStyles.caseCardTitle}>Your Case ID</Text>
              <Text style={companyRegistrationFormStyles.caseIdText} selectable>{caseId}</Text>
              <Text style={companyRegistrationFormStyles.caseCardHint}>
                Complete director details below and submit. This case will appear in the dashboard.
              </Text>
            </View>
          )}

          {/* ── Section B ── */}
          <View style={companyRegistrationFormStyles.section}>
            <View style={companyRegistrationFormStyles.sectionHeaderRow}>
              <Text style={[companyRegistrationFormStyles.sectionTitle, companyRegistrationFormStyles.sectionTitleCompact]}>
                Section B – Director Details
              </Text>
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

                <Text style={companyRegistrationFormStyles.label}>Name</Text>
                <TextInput
                  style={[companyRegistrationFormStyles.input, errors[directorErrorKey(director.id, 'name')] && companyRegistrationFormStyles.inputError]}
                  value={director.name}
                  onChangeText={(v) => updateDirector(director.id, 'name', v)}
                  placeholder="Director full name" placeholderTextColor={Colors.textMuted}
                  onFocus={() => setActiveSection('director')} />

                <Text style={companyRegistrationFormStyles.label}>PAN</Text>
                <TextInput
                  style={[companyRegistrationFormStyles.input, errors[directorErrorKey(director.id, 'pan')] && companyRegistrationFormStyles.inputError]}
                  value={director.pan}
                  onChangeText={(v) => updateDirector(director.id, 'pan', v)}
                  placeholder="PAN number" placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters" maxLength={10} />

                {/* PAN upload */}
                <Pressable
                  style={[
                    uploadStyles.uploadBtn,
                    errors[directorErrorKey(director.id, 'panFileUri')] && uploadStyles.uploadBtnError,
                    director.panFileUri && uploadStyles.uploadBtnSuccess,
                  ]}
                  onPress={() => openUploadModal({ directorId: director.id, field: 'panFileUri', title: 'Upload PAN Card' })}>
                  <Ionicons name={director.panFileUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={director.panFileUri ? '#fff' : Colors.primary} />
                  <Text style={[uploadStyles.uploadBtnText, director.panFileUri && uploadStyles.uploadBtnTextSuccess]}>
                    {director.panFileUri ? 'PAN uploaded ✓' : 'Upload PAN (JPEG / PDF)'}
                  </Text>
                </Pressable>
                {director.panFileUri && (
                  <Text style={uploadStyles.savedTag}>✔ Document saved </Text>
                )}
                <Text style={companyRegistrationFormStyles.label}>Aadhaar</Text>
                <TextInput
                  style={[companyRegistrationFormStyles.input, errors[directorErrorKey(director.id, 'aadhaar')] && companyRegistrationFormStyles.inputError]}
                  value={director.aadhaar}
                  onChangeText={(v) => updateDirector(director.id, 'aadhaar', v)}
                  placeholder="Aadhaar number" placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad" maxLength={12} />

                {/* Aadhaar Front upload */}
                <Pressable
                  style={[
                    uploadStyles.uploadBtn,
                    errors[directorErrorKey(director.id, 'aadhaarFrontFileUri')] && uploadStyles.uploadBtnError,
                    director.aadhaarFrontFileUri && uploadStyles.uploadBtnSuccess,
                  ]}
                  onPress={() => openUploadModal({ directorId: director.id, field: 'aadhaarFrontFileUri', title: 'Upload Aadhaar (Front)' })}>
                  <Ionicons name={director.aadhaarFrontFileUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={director.aadhaarFrontFileUri ? '#fff' : Colors.primary} />
                  <Text style={[uploadStyles.uploadBtnText, director.aadhaarFrontFileUri && uploadStyles.uploadBtnTextSuccess]}>
                    {director.aadhaarFrontFileUri ? 'Aadhaar (Front) uploaded ✓' : 'Upload Aadhaar Front (JPEG / PDF)'}
                  </Text>
                </Pressable>

                {/* Aadhaar Back upload */}
                <Pressable
                  style={[
                    uploadStyles.uploadBtn,
                    errors[directorErrorKey(director.id, 'aadhaarBackFileUri')] && uploadStyles.uploadBtnError,
                    director.aadhaarBackFileUri && uploadStyles.uploadBtnSuccess,
                    { marginTop: sh(8) },
                  ]}
                  onPress={() => openUploadModal({ directorId: director.id, field: 'aadhaarBackFileUri', title: 'Upload Aadhaar (Back)' })}>
                  <Ionicons name={director.aadhaarBackFileUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={22} color={director.aadhaarBackFileUri ? '#fff' : Colors.primary} />
                  <Text style={[uploadStyles.uploadBtnText, director.aadhaarBackFileUri && uploadStyles.uploadBtnTextSuccess]}>
                    {director.aadhaarBackFileUri ? 'Aadhaar (Back) uploaded ✓' : 'Upload Aadhaar Back (JPEG / PDF)'}
                  </Text>
                </Pressable>

                {(director.aadhaarFrontFileUri || director.aadhaarBackFileUri) && (
                  <Text style={uploadStyles.savedTag}>✔ Documents saved locally</Text>
                )}

                <Text style={companyRegistrationFormStyles.label}>Shareholding %</Text>
                <TextInput
                  style={[companyRegistrationFormStyles.input, errors[directorErrorKey(director.id, 'shareholding')] && companyRegistrationFormStyles.inputError]}
                  value={director.shareholding}
                  onChangeText={(v) => updateDirector(director.id, 'shareholding', v)}
                  placeholder="e.g. 50" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <View style={companyRegistrationFormStyles.disclaimerBlock}>
            <Text style={companyRegistrationFormStyles.disclaimerText}>
              By submitting this form, you confirm that all information and documents provided (including company details, director details, PAN & Aadhaar) are correct, accurate and genuine. Finovert reserves the right to verify the submitted documents. Finovert does not take any risk for false or fraudulent documents submitted by the applicant.
            </Text>
            <Pressable
              style={[companyRegistrationFormStyles.checkboxRow, errors.disclaimer && companyRegistrationFormStyles.checkboxRowError]}
              onPress={() => { setConfirmedDisclaimer((v) => !v); clearError('disclaimer'); }}>
              <Ionicons
                name={confirmedDisclaimer ? 'checkbox' : 'checkbox-outline'}
                size={24}
                color={confirmedDisclaimer ? Colors.primary : errors.disclaimer ? '#ef4444' : Colors.textMuted} />
              <Text style={companyRegistrationFormStyles.checkboxLabel}>
                I confirm that all documents and information are correct and verified
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              companyRegistrationFormStyles.ctaButton,
              (!caseId || !confirmedDisclaimer || isSubmitting || alreadySubmitted) && companyRegistrationFormStyles.ctaButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!caseId || !confirmedDisclaimer || isSubmitting || alreadySubmitted}>
            <Text style={companyRegistrationFormStyles.ctaButtonText}>
              {alreadySubmitted ? 'ALREADY SUBMITTED' : caseId ? 'SUBMIT TO DASHBOARD' : 'SUBMIT'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Upload modal styles (self-contained, no external dependency) ─────────────

const uploadStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  optionPressed: {
    backgroundColor: '#f3f4f6',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  // Upload button inside director card
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    backgroundColor: '#eff6ff',
  },
  uploadBtnError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  uploadBtnSuccess: {
    borderStyle: 'solid',
    borderColor: '#22c55e',
    backgroundColor: '#22c55e',
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  uploadBtnTextSuccess: {
    color: '#fff',
  },
  savedTag: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 2,
    marginBottom: 8,
    marginLeft: 4,
  },
});
