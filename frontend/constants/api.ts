import Constants from 'expo-constants';

/** Production API — used in Play Store / release builds. */
export const PRODUCTION_API_BASE = 'https://thecfofino-3.onrender.com/api';

function normalizeApiBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, '');
  if (!/\/api$/i.test(base)) {
    base = `${base}/api`;
  }
  return base;
}

/**
 * API base URL for all app requests.
 * Release builds use `extra.apiBaseUrl` from app.config (production HTTPS).
 * Dev: set EXPO_USE_LOCAL_API=1 and EXPO_PUBLIC_API_URL=http://YOUR_IP:4000/api in .env
 */
export function getApiBase(): string {
  const extra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (extra && String(extra).trim()) {
    return normalizeApiBase(String(extra));
  }
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (env) {
    return normalizeApiBase(env);
  }
  return PRODUCTION_API_BASE;
}
