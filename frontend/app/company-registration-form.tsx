import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
  generateCaseId,
  loadCompanyRegistrationState,
  saveCompanyRegistrationState,
  setCompanyRegistrationDraft,
} from '@/utils/company-registration-draft';
import { ms, sh, sw } from '@/utils/responsive';

export default function CompanyRegistrationFormScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { addNotification } = useNotifications();
  const { businessType } = useLocalSearchParams<{ businessType?: string }>();
  const [resolvedBusinessType, setResolvedBusinessType] = useState(businessType || '');
  const [activeSection, setActiveSection] = useState<'company' | 'director'>('company');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [mongoId, setMongoId] = useState<string | null>(null);

  // Section A - Company Details
  const [proposedName1, setProposedName1] = useState('');
  const [proposedName2, setProposedName2] = useState('');
  const [proposedName3, setProposedName3] = useState('');
  const [businessActivity, setBusinessActivity] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [capitalStructure, setCapitalStructure] = useState('');
  const [companyMobile, setCompanyMobile] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  // Section B - Director Details (multiple directors)
  type Director = {
    id: string;
    name: string;
    pan: string;
    aadhaar: string;
    shareholding: string;
    panFileUri: string | null;
    aadhaarFileUri: string | null;
  };
  const [directors, setDirectors] = useState<Director[]>([
    { id: '1', name: '', pan: '', aadhaar: '', shareholding: '', panFileUri: null, aadhaarFileUri: null },
  ]);

  // Upload options modal
  const [uploadModal, setUploadModal] = useState<{
    visible: boolean;
    title: string;
    onResult: (uri: string) => void;
  }>({ visible: false, title: '', onResult: () => { } });

  const addDirector = () => {
    setDirectors((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: '',
        pan: '',
        aadhaar: '',
        shareholding: '',
        panFileUri: null,
        aadhaarFileUri: null,
      },
    ]);
  };

  const showUploadOptions = (title: string, onResult: (uri: string) => void) => {
    setUploadModal({ visible: true, title, onResult });
  };

  const closeUploadModal = () => setUploadModal((p) => ({ ...p, visible: false }));

  const handleUploadOption = async (type: 'camera' | 'gallery' | 'pdf') => {
    const callback = uploadModal.onResult;
    closeUploadModal();
    if (type === 'pdf') await pickDocument(callback);
    else await pickImage(type, callback);
  };

  const pickImage = async (source: 'camera' | 'gallery', onResult: (uri: string) => void) => {
    const { status } = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to camera/photos.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) onResult(result.assets[0].uri);
  };

  const pickDocument = async (onResult: (uri: string) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    const uri = !result.canceled && result.assets?.[0]?.uri ? result.assets[0].uri : null;
    if (uri) onResult(uri);
  };

  const setDirectorFile = (id: string, field: 'panFileUri' | 'aadhaarFileUri', uri: string | null) => {
    setDirectors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: uri } : d)),
    );
    if (uri) clearError(directorErrorKey(id, field));
  };

  const removeDirector = (id: string) => {
    if (directors.length <= 1) return;
    setDirectors((prev) => prev.filter((d) => d.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`director.${id}.`)) delete next[key];
      });
      return next;
    });
  };

  const updateDirector = (id: string, field: 'name' | 'pan' | 'aadhaar' | 'shareholding', value: string) => {
    setDirectors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
    clearError(directorErrorKey(id, field));
  };

  const [confirmedDisclaimer, setConfirmedDisclaimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const directorErrorKey = (
    id: string,
    field: 'name' | 'pan' | 'aadhaar' | 'shareholding' | 'panFileUri' | 'aadhaarFileUri',
  ) => `director.${id}.${field}`;

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!proposedName1.trim()) next.proposedName1 = 'Required';
    if (!businessActivity.trim()) next.businessActivity = 'Required';
    if (!registeredAddress.trim()) next.registeredAddress = 'Required';
    if (!capitalStructure.trim()) next.capitalStructure = 'Required';
    if (!companyMobile.trim()) next.companyMobile = 'Required';
    if (!companyEmail.trim()) next.companyEmail = 'Required';

    directors.forEach((director) => {
      if (!director.name.trim()) next[directorErrorKey(director.id, 'name')] = 'Required';
      if (!director.pan.trim()) next[directorErrorKey(director.id, 'pan')] = 'Required';
      if (!director.aadhaar.trim()) next[directorErrorKey(director.id, 'aadhaar')] = 'Required';
      if (!director.shareholding.trim()) next[directorErrorKey(director.id, 'shareholding')] = 'Required';
      if (!director.panFileUri) next[directorErrorKey(director.id, 'panFileUri')] = 'Required';
      if (!director.aadhaarFileUri) next[directorErrorKey(director.id, 'aadhaarFileUri')] = 'Required';
    });

    if (!confirmedDisclaimer) next.disclaimer = 'Required';
    return next;
  };

  useEffect(() => {
    (async () => {
      const state = await loadCompanyRegistrationState();
      if (state.draft) {
        if (state.draft.caseId) setCaseId(state.draft.caseId);
        if (state.draft._id) setMongoId(state.draft._id);
        setResolvedBusinessType(state.draft.businessType || businessType || '');
        setProposedName1(state.draft.proposedName1 || '');
        setProposedName2(state.draft.proposedName2 || '');
        setProposedName3(state.draft.proposedName3 || '');
        setBusinessActivity(state.draft.businessActivity || '');
        setRegisteredAddress(state.draft.registeredAddress || '');
        setCapitalStructure(state.draft.capitalStructure || '');
        setCompanyMobile(state.draft.companyMobile || '');
        setCompanyEmail(state.draft.companyEmail || '');
        if (state.draft.directors?.length) {
          setDirectors(
            state.draft.directors.map((d, idx) => ({
              id: `${idx + 1}-${Date.now()}-${idx}`,
              ...d,
            })),
          );
        }
      }

      if (
        state.status === 'submitted' ||
        state.status === 'payment_pending' ||
        state.status === 'paid' ||
        state.status === 'upload_in_progress' ||
        state.status === 'completed'
      ) {
        setAlreadySubmitted(true);
      }
      setIsHydrated(true);
    })();
  }, [businessType]);

  useEffect(() => {
    if (businessType) setResolvedBusinessType(businessType);
  }, [businessType]);

  useEffect(() => {
    if (!isHydrated || alreadySubmitted) return;
    const draftPayload = {
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
        name: d.name.trim(),
        pan: d.pan.trim(),
        aadhaar: d.aadhaar.trim(),
        shareholding: d.shareholding.trim(),
        panFileUri: d.panFileUri,
        aadhaarFileUri: d.aadhaarFileUri,
      })),
    };
    setCompanyRegistrationDraft(draftPayload);
    void saveCompanyRegistrationState({
      draft: draftPayload,
      status: 'draft',
    });
  }, [
    isHydrated,
    alreadySubmitted,
    caseId,
    mongoId,
    businessType,
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
  ]);

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

  /** Convert local file URI to base64 data URL so dashboard can show/download. */
  const uriToDataUrl = async (uri: string | null): Promise<string | null> => {
    if (!uri || typeof uri !== 'string') return null;
    if (uri.startsWith('data:')) return uri;

    const getMime = (u: string) => {
      const lower = u.toLowerCase();
      if (lower.endsWith('.pdf')) return 'application/pdf';
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
      // Default to jpeg if no extension or unknown
      return 'image/jpeg';
    };

    const tryRead = async (readUri: string): Promise<string | null> => {
      try {
        const base64 = await FileSystem.readAsStringAsync(readUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mime = getMime(uri);
        console.log(`[uriToDataUrl] Read successful. URI: ${readUri.slice(-30)}, Mime: ${mime}, Len: ${base64.length}`);
        return `data:${mime};base64,${base64}`;
      } catch (err) {
        console.warn('[uriToDataUrl] read error:', err, 'for uri:', readUri);
        return null;
      }
    };

    // Try direct read
    let result = await tryRead(uri);
    if (result) return result;

    // Fallback: try copying to document directory first
    try {
      const filename = (uri.split('/').pop() || `doc_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const dest = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ''}${filename}`;
      console.log(`[uriToDataUrl] Attempting copy fallback. Dest: ${dest.slice(-30)}`);
      await FileSystem.copyAsync({ from: uri, to: dest });
      result = await tryRead(dest);
    } catch (err) {
      console.warn('[uriToDataUrl] copy fallback error:', err);
    }
    return result;
  };

  const handleNext = async () => {
    const sectionAErrors = validateSectionA();
    setErrors(sectionAErrors);
    if (Object.keys(sectionAErrors).length > 0) {
      Alert.alert('Complete company details', 'Please fill all company fields (names, activity, address, capital, mobile, email) before continuing.');
      return;
    }
    setIsSubmitting(true);
    try {
      const draftPayload = {
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
          name: d.name.trim(),
          pan: d.pan.trim(),
          aadhaar: d.aadhaar.trim(),
          shareholding: d.shareholding.trim(),
          panFileUri: d.panFileUri,
          aadhaarFileUri: d.aadhaarFileUri,
        })),
      };
      const token = await getToken();
      let result;
      if (mongoId) {
        result = await updateCompanyRegistrationInBackend(mongoId, draftPayload, token);
      } else {
        result = await submitCompanyRegistrationToBackend(draftPayload, token);
        if (result.id) setMongoId(result.id);
      }
      const generatedCaseId = result.caseId || caseId;
      if (generatedCaseId) setCaseId(generatedCaseId);

      const fullDraftPayload = {
        ...draftPayload,
        caseId: generatedCaseId || undefined,
        _id: result.id || mongoId || undefined,
      };
      setCompanyRegistrationDraft(fullDraftPayload);
      void saveCompanyRegistrationState({ draft: fullDraftPayload, status: 'draft' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save section A';
      Alert.alert('Error', message);
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (alreadySubmitted) {
      Alert.alert(
        'Already submitted',
        'You already submitted your data. Please continue to payment to proceed.',
      );
      router.push('/company-registration-review-paywall');
      return;
    }

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      Alert.alert('Missing details', 'Please fill all red-highlighted fields before submit.');
      return;
    }
    if (!caseId) {
      Alert.alert('Continue first', 'Please tap Next after filling company details to get your Case ID, then complete director details and submit.');
      return;
    }

    setIsSubmitting(true);
    setSubmitDone(false);
    try {
      const directorsWithBase64 = await Promise.all(
        directors.map(async (d) => ({
          name: d.name.trim(),
          pan: d.pan.trim(),
          aadhaar: d.aadhaar.trim(),
          shareholding: d.shareholding.trim(),
          panFileUri: await uriToDataUrl(d.panFileUri),
          aadhaarFileUri: await uriToDataUrl(d.aadhaarFileUri),
        })),
      );
      const payload = {
        ...(caseId ? { caseId } : {}),
        businessType: resolvedBusinessType,
        proposedName1: proposedName1.trim(),
        proposedName2: proposedName2.trim(),
        proposedName3: proposedName3.trim(),
        businessActivity: businessActivity.trim(),
        registeredAddress: registeredAddress.trim(),
        capitalStructure: capitalStructure.trim(),
        companyMobile: companyMobile.trim(),
        companyEmail: companyEmail.trim(),
        directors: directorsWithBase64,
      };
      const token = await getToken();
      let result;
      if (mongoId) {
        result = await updateCompanyRegistrationInBackend(mongoId, payload, token);
      } else {
        result = await submitCompanyRegistrationToBackend(payload, token);
      }
      const generatedCaseId = result.caseId || caseId;
      setCaseId(generatedCaseId);

      const finalPayload = { ...payload, caseId: generatedCaseId };
      setCompanyRegistrationDraft(finalPayload);
      await saveCompanyRegistrationState({
        draft: finalPayload,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        paymentStatus: 'unpaid',
      });
      setAlreadySubmitted(true);
      addNotification({
        title: 'Company Registration Submitted',
        body: 'Your details are submitted successfully. Complete payment to continue filing.',
      });
      setSubmitDone(true);
      setTimeout(() => {
        setIsSubmitting(false);
        router.push('/company-registration-review-paywall');
      }, 1200);
    } catch (e) {
      setIsSubmitting(false);
      const message = e instanceof Error ? e.message : 'Submission failed. Please try again.';
      Alert.alert('Submission failed', message);
    }
  };

  return (
    <>
      {/* Submit animation modal */}
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
                <Text style={companyRegistrationFormStyles.submitModalTitle}>
                  Your document is submitting...
                </Text>
                <Text style={companyRegistrationFormStyles.submitModalSubtitle}>
                  Please wait while we save your details.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Upload Options Modal */}
      <Modal
        visible={uploadModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeUploadModal}>
        <Pressable style={companyRegistrationFormStyles.uploadModalOverlay} onPress={closeUploadModal}>
          <Pressable style={companyRegistrationFormStyles.uploadModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={companyRegistrationFormStyles.uploadModalHeader}>
              <Text style={companyRegistrationFormStyles.uploadModalTitle}>{uploadModal.title}</Text>
              <Text style={companyRegistrationFormStyles.uploadModalSubtitle}>
                Choose file type (JPEG, PNG or PDF)
              </Text>
            </View>

            <Pressable
              style={companyRegistrationFormStyles.uploadModalOption}
              onPress={() => handleUploadOption('camera')}>
              <View style={companyRegistrationFormStyles.uploadModalIconWrap}>
                <Ionicons name="camera" size={26} color={Colors.primary} />
              </View>
              <View style={companyRegistrationFormStyles.uploadModalOptionText}>
                <Text style={companyRegistrationFormStyles.uploadModalOptionTitle}>Take Photo</Text>
                <Text style={companyRegistrationFormStyles.uploadModalOptionDesc}>
                  Use camera to capture
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>

            <Pressable
              style={companyRegistrationFormStyles.uploadModalOption}
              onPress={() => handleUploadOption('gallery')}>
              <View style={companyRegistrationFormStyles.uploadModalIconWrap}>
                <Ionicons name="images" size={26} color={Colors.primary} />
              </View>
              <View style={companyRegistrationFormStyles.uploadModalOptionText}>
                <Text style={companyRegistrationFormStyles.uploadModalOptionTitle}>Gallery</Text>
                <Text style={companyRegistrationFormStyles.uploadModalOptionDesc}>
                  JPEG or PNG from photos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>

            <Pressable
              style={companyRegistrationFormStyles.uploadModalOption}
              onPress={() => handleUploadOption('pdf')}>
              <View style={companyRegistrationFormStyles.uploadModalIconWrap}>
                <Ionicons name="document-text" size={26} color={Colors.primary} />
              </View>
              <View style={companyRegistrationFormStyles.uploadModalOptionText}>
                <Text style={companyRegistrationFormStyles.uploadModalOptionTitle}>PDF Document</Text>
                <Text style={companyRegistrationFormStyles.uploadModalOptionDesc}>
                  Select PDF file
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>

            <Pressable style={companyRegistrationFormStyles.uploadModalCancelBtn} onPress={closeUploadModal}>
              <Ionicons name="close-circle-outline" size={22} color={Colors.textMuted} />
              <Text style={companyRegistrationFormStyles.uploadModalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView
        style={companyRegistrationFormStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          style={companyRegistrationFormStyles.container}
          contentContainerStyle={companyRegistrationFormStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Step progress bar */}
          <View style={companyRegistrationFormStyles.progressBar}>
            <View
              style={[
                companyRegistrationFormStyles.progressStep,
                activeSection === 'company' ? companyRegistrationFormStyles.progressStepActive : companyRegistrationFormStyles.progressStepDone,
              ]}
            />
            <View
              style={[
                companyRegistrationFormStyles.progressStep,
                activeSection === 'director' ? companyRegistrationFormStyles.progressStepActive : activeSection === 'company' ? undefined : companyRegistrationFormStyles.progressStepDone,
              ]}
            />
          </View>

          {Object.keys(errors).length > 0 ? (
            <Text style={companyRegistrationFormStyles.validationHint}>
              Missing details in red fields. Please complete them.
            </Text>
          ) : null}

          {resolvedBusinessType ? (
            <Text style={{ fontSize: ms(14), color: Colors.textMuted, marginBottom: sh(16) }}>
              Business type: {resolvedBusinessType}
            </Text>
          ) : null}

          {/* Section A – Company Details */}
          <View style={companyRegistrationFormStyles.section}>
            <Text style={companyRegistrationFormStyles.sectionTitle}>Section A – Company Details</Text>

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Proposed Names (3)</Text>
            <TextInput
              style={[
                companyRegistrationFormStyles.input,
                companyRegistrationFormStyles.inputNoOutline,
                errors.proposedName1 && companyRegistrationFormStyles.inputError,
              ]}
              value={proposedName1}
              onChangeText={(v) => {
                setProposedName1(v);
                clearError('proposedName1');
              }}
              placeholder="Proposed name 1"
              placeholderTextColor={Colors.textMuted}
              onFocus={() => setActiveSection('company')}
            />
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline]}
              value={proposedName2}
              onChangeText={setProposedName2}
              placeholder="Proposed name 2"
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              style={[companyRegistrationFormStyles.input, companyRegistrationFormStyles.inputNoOutline]}
              value={proposedName3}
              onChangeText={setProposedName3}
              placeholder="Proposed name 3"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Business Activity</Text>
            <TextInput
              style={[
                companyRegistrationFormStyles.input,
                companyRegistrationFormStyles.inputMultiline,
                companyRegistrationFormStyles.inputNoOutline,
                errors.businessActivity && companyRegistrationFormStyles.inputError,
              ]}
              value={businessActivity}
              onChangeText={(v) => {
                setBusinessActivity(v);
                clearError('businessActivity');
              }}
              placeholder="Describe your business activity"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Registered Address</Text>
            <TextInput
              style={[
                companyRegistrationFormStyles.input,
                companyRegistrationFormStyles.inputMultiline,
                companyRegistrationFormStyles.inputNoOutline,
                errors.registeredAddress && companyRegistrationFormStyles.inputError,
              ]}
              value={registeredAddress}
              onChangeText={(v) => {
                setRegisteredAddress(v);
                clearError('registeredAddress');
              }}
              placeholder="Full registered office address"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Company Mobile Number</Text>
            <TextInput
              style={[
                companyRegistrationFormStyles.input,
                companyRegistrationFormStyles.inputNoOutline,
                errors.companyMobile && companyRegistrationFormStyles.inputError,
              ]}
              value={companyMobile}
              onChangeText={(v) => {
                setCompanyMobile(v);
                clearError('companyMobile');
              }}
              placeholder="e.g. 9876543210"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Company Email (Gmail ID)</Text>
            <TextInput
              style={[
                companyRegistrationFormStyles.input,
                companyRegistrationFormStyles.inputNoOutline,
                errors.companyEmail && companyRegistrationFormStyles.inputError,
              ]}
              value={companyEmail}
              onChangeText={(v) => {
                setCompanyEmail(v);
                clearError('companyEmail');
              }}
              placeholder="e.g. company@gmail.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={companyRegistrationFormStyles.sectionSubtitle}>Capital Structure</Text>
            <TextInput
              style={[
                companyRegistrationFormStyles.input,
                companyRegistrationFormStyles.inputNoOutline,
                errors.capitalStructure && companyRegistrationFormStyles.inputError,
              ]}
              value={capitalStructure}
              onChangeText={(v) => {
                setCapitalStructure(v);
                clearError('capitalStructure');
              }}
              placeholder="e.g. ₹1,00,000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            {!caseId ? (
              <Pressable
                style={companyRegistrationFormStyles.nextButton}
                onPress={handleNext}
                disabled={isSubmitting || alreadySubmitted}>
                <Text style={companyRegistrationFormStyles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>

          {/* Case ID only (shown after Next) */}
          {caseId ? (
            <View style={companyRegistrationFormStyles.caseCard}>
              <Text style={companyRegistrationFormStyles.caseCardTitle}>Your Case ID</Text>
              <Text style={companyRegistrationFormStyles.caseIdText} selectable>{caseId}</Text>
              <Text style={companyRegistrationFormStyles.caseCardHint}>Complete director details below and submit. This case will appear in the dashboard.</Text>
            </View>
          ) : null}

          {/* Section B – Director Details (multiple) */}
          <View style={companyRegistrationFormStyles.section}>
            <View style={companyRegistrationFormStyles.sectionHeaderRow}>
              <Text style={[companyRegistrationFormStyles.sectionTitle, companyRegistrationFormStyles.sectionTitleCompact]}>Section B – Director Details</Text>
              <Pressable style={companyRegistrationFormStyles.addDirectorBtn} onPress={addDirector}>
                <Ionicons name="add-circle" size={24} color={Colors.primary} />
                <Text style={companyRegistrationFormStyles.addDirectorBtnText}>Add Director</Text>
              </Pressable>
            </View>

            {directors.map((director, index) => (
              <View key={director.id} style={companyRegistrationFormStyles.directorCard}>
                <View style={companyRegistrationFormStyles.directorCardHeader}>
                  <Text style={companyRegistrationFormStyles.directorCardTitle}>
                    Director {index + 1}
                  </Text>
                  {directors.length > 1 && (
                    <Pressable
                      onPress={() => removeDirector(director.id)}
                      hitSlop={8}
                      style={companyRegistrationFormStyles.removeDirectorBtn}>
                      <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                <Text style={companyRegistrationFormStyles.label}>Name</Text>
                <TextInput
                  style={[
                    companyRegistrationFormStyles.input,
                    errors[directorErrorKey(director.id, 'name')] &&
                    companyRegistrationFormStyles.inputError,
                  ]}
                  value={director.name}
                  onChangeText={(v) => updateDirector(director.id, 'name', v)}
                  placeholder="Director full name"
                  placeholderTextColor={Colors.textMuted}
                  onFocus={() => setActiveSection('director')}
                />

                <Text style={companyRegistrationFormStyles.label}>PAN</Text>
                <TextInput
                  style={[
                    companyRegistrationFormStyles.input,
                    errors[directorErrorKey(director.id, 'pan')] &&
                    companyRegistrationFormStyles.inputError,
                  ]}
                  value={director.pan}
                  onChangeText={(v) => updateDirector(director.id, 'pan', v)}
                  placeholder="PAN number"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <Pressable
                  style={[
                    companyRegistrationFormStyles.uploadBtn,
                    errors[directorErrorKey(director.id, 'panFileUri')] &&
                    companyRegistrationFormStyles.uploadBtnError,
                    director.panFileUri && companyRegistrationFormStyles.uploadBtnSuccess,
                  ]}
                  onPress={() =>
                    showUploadOptions('Upload PAN Card', (uri) =>
                      setDirectorFile(director.id, 'panFileUri', uri),
                    )
                  }>
                  <Ionicons
                    name={director.panFileUri ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={22}
                    color={director.panFileUri ? '#fff' : Colors.primary}
                  />
                  <Text
                    style={[
                      companyRegistrationFormStyles.uploadBtnText,
                      director.panFileUri && companyRegistrationFormStyles.uploadBtnTextSuccess,
                    ]}>
                    {director.panFileUri ? 'PAN uploaded' : 'Upload PAN (JPEG / PDF)'}
                  </Text>
                </Pressable>

                <Text style={companyRegistrationFormStyles.label}>Aadhaar</Text>
                <TextInput
                  style={[
                    companyRegistrationFormStyles.input,
                    errors[directorErrorKey(director.id, 'aadhaar')] &&
                    companyRegistrationFormStyles.inputError,
                  ]}
                  value={director.aadhaar}
                  onChangeText={(v) => updateDirector(director.id, 'aadhaar', v)}
                  placeholder="Aadhaar number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={12}
                />
                <Pressable
                  style={[
                    companyRegistrationFormStyles.uploadBtn,
                    errors[directorErrorKey(director.id, 'aadhaarFileUri')] &&
                    companyRegistrationFormStyles.uploadBtnError,
                    director.aadhaarFileUri && companyRegistrationFormStyles.uploadBtnSuccess,
                  ]}
                  onPress={() =>
                    showUploadOptions('Upload Aadhaar Card', (uri) =>
                      setDirectorFile(director.id, 'aadhaarFileUri', uri),
                    )
                  }>
                  <Ionicons
                    name={director.aadhaarFileUri ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={22}
                    color={director.aadhaarFileUri ? '#fff' : Colors.primary}
                  />
                  <Text
                    style={[
                      companyRegistrationFormStyles.uploadBtnText,
                      director.aadhaarFileUri && companyRegistrationFormStyles.uploadBtnTextSuccess,
                    ]}>
                    {director.aadhaarFileUri ? 'Aadhaar uploaded' : 'Upload Aadhaar (JPEG / PDF)'}
                  </Text>
                </Pressable>

                <Text style={companyRegistrationFormStyles.label}>Shareholding %</Text>
                <TextInput
                  style={[
                    companyRegistrationFormStyles.input,
                    errors[directorErrorKey(director.id, 'shareholding')] &&
                    companyRegistrationFormStyles.inputError,
                  ]}
                  value={director.shareholding}
                  onChangeText={(v) => updateDirector(director.id, 'shareholding', v)}
                  placeholder="e.g. 50"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          {/* Disclaimer & confirmation */}
          <View style={companyRegistrationFormStyles.disclaimerBlock}>
            <Text style={companyRegistrationFormStyles.disclaimerText}>
              By submitting this form, you confirm that all information and documents provided (including company details, director details, PAN & Aadhaar) are correct, accurate and genuine. Finovert reserves the right to verify the submitted documents. Finovert does not take any risk for false or fraudulent documents submitted by the applicant.
            </Text>
            <Pressable
              style={[
                companyRegistrationFormStyles.checkboxRow,
                errors.disclaimer && companyRegistrationFormStyles.checkboxRowError,
              ]}
              onPress={() => {
                setConfirmedDisclaimer((v) => !v);
                clearError('disclaimer');
              }}>
              <Ionicons
                name={confirmedDisclaimer ? 'checkbox' : 'checkbox-outline'}
                size={24}
                color={
                  confirmedDisclaimer ? Colors.primary : errors.disclaimer ? '#ef4444' : Colors.textMuted
                }
              />
              <Text style={companyRegistrationFormStyles.checkboxLabel}>
                I confirm that all documents and information are correct and verified
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              companyRegistrationFormStyles.ctaButton,
              (!caseId || !confirmedDisclaimer || isSubmitting || alreadySubmitted) &&
              companyRegistrationFormStyles.ctaButtonDisabled,
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
