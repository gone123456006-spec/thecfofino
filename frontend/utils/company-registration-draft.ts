import AsyncStorage from '@react-native-async-storage/async-storage';

export type DirectorDraft = {
  name: string;
  pan: string;
  aadhaar: string;
  shareholding: string;
  panFileUri: string | null;
  aadhaarFrontFileUri: string | null;
  aadhaarBackFileUri: string | null;
};

export type CompanyRegistrationDraft = {
  _id?: string;
  caseId?: string;
  businessType: string;
  proposedName1: string;
  proposedName2: string;
  proposedName3: string;
  businessActivity: string;
  registeredAddress: string;
  capitalStructure: string;
  companyMobile: string;
  companyEmail: string;
  directors: DirectorDraft[];
};

export const COMPANY_REGISTRATION_CASE_ID = '';

export function generateCaseId(): string {
  // Empty so the backend auto-generates a real sequential one
  return '';
}

export type CompanyRegistrationStatus =
  | 'not_started'
  | 'draft'
  | 'submitted'
  | 'payment_pending'
  | 'paid'
  | 'upload_in_progress'
  | 'completed';

export type CompanyRegistrationPaymentMethod = 'upi' | 'qr' | 'card' | null;

export type CompanyRegistrationProcessState = {
  draft: CompanyRegistrationDraft | null;
  status: CompanyRegistrationStatus;
  submittedAt: string | null;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod: CompanyRegistrationPaymentMethod;
  paidAt: string | null;
  uploadMap: Record<string, boolean>;
  statusIndex: number;
  updatedAt: string;
};

const STORAGE_KEY = '@finoverts_company_registration_state';
const defaultUploadMap: Record<string, boolean> = {
  pan: false,
  aadhaar: false,
  addressProof: false,
  photo: false,
};

const defaultState: CompanyRegistrationProcessState = {
  draft: null,
  status: 'not_started',
  submittedAt: null,
  paymentStatus: 'unpaid',
  paymentMethod: null,
  paidAt: null,
  uploadMap: defaultUploadMap,
  statusIndex: 0,
  updatedAt: new Date().toISOString(),
};

let currentDraft: CompanyRegistrationDraft | null = null;
let currentState: CompanyRegistrationProcessState = defaultState;

const normalizeState = (
  maybeState: Partial<CompanyRegistrationProcessState> | null | undefined,
): CompanyRegistrationProcessState => {
  if (!maybeState || typeof maybeState !== 'object') return defaultState;
  return {
    ...defaultState,
    ...maybeState,
    uploadMap: { ...defaultUploadMap, ...(maybeState.uploadMap || {}) },
    updatedAt: maybeState.updatedAt || new Date().toISOString(),
  };
};

export async function loadCompanyRegistrationState(): Promise<CompanyRegistrationProcessState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      currentState = defaultState;
      currentDraft = null;
      return currentState;
    }
    const parsed = JSON.parse(raw) as Partial<CompanyRegistrationProcessState>;
    currentState = normalizeState(parsed);
    currentDraft = currentState.draft;
    return currentState;
  } catch {
    currentState = defaultState;
    currentDraft = null;
    return currentState;
  }
};

export async function saveCompanyRegistrationState(
  updates: Partial<CompanyRegistrationProcessState>,
): Promise<CompanyRegistrationProcessState> {
  const next = normalizeState({
    ...currentState,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  currentState = next;
  currentDraft = next.draft;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export async function clearCompanyRegistrationState(): Promise<void> {
  currentDraft = null;
  currentState = defaultState;
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function setCompanyRegistrationDraft(draft: CompanyRegistrationDraft) {
  currentDraft = draft;
  currentState = {
    ...currentState,
    draft,
    status: currentState.status === 'not_started' ? 'draft' : currentState.status,
    updatedAt: new Date().toISOString(),
  };
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
}

export function getCompanyRegistrationDraft(): CompanyRegistrationDraft | null {
  return currentDraft;
}

export function getCompanyRegistrationProcessState(): CompanyRegistrationProcessState {
  return currentState;
}

