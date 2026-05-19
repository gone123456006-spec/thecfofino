import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearCompanyRegistrationState } from '@/utils/company-registration-draft';

/** Cleared on logout — notifications are kept so they reappear after sign-in. */
export const USER_SESSION_STORAGE_KEYS = [
  '@finovert_auth',
  '@finovert_token',
  '@finovert_company_registration_state',
  '@finovert_reg_auto_notify_snapshot',
] as const;

/**
 * Wipes local user session data and in-memory registration draft.
 * Does not clear welcome-onboarding flag.
 */
export async function clearUserSessionStorage(): Promise<void> {
  await clearCompanyRegistrationState();
  await AsyncStorage.multiRemove([...USER_SESSION_STORAGE_KEYS]);
}
