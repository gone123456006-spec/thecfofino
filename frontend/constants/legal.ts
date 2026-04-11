import Constants from 'expo-constants';

/**
 * Public HTTPS privacy policy URL for the **Play Store listing** (required by Google).
 * Set `EXPO_PUBLIC_PRIVACY_POLICY_URL` in `.env` / EAS secrets to your hosted policy.
 * In-app policy text remains at route `/privacy`.
 */
export function getPrivacyPolicyPublicUrl(): string | undefined {
  const extra = Constants.expoConfig?.extra as { privacyPolicyUrl?: string } | undefined;
  const fromExtra = extra?.privacyPolicyUrl?.trim();
  if (fromExtra) return fromExtra;
  const fromEnv = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
  return fromEnv || undefined;
}
