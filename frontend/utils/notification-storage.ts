import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const AUTH_KEY = '@finovert_auth';
const LEGACY_STORAGE_KEY = '@finovert_notifications';

/** Build AsyncStorage key for one sign-in Gmail account. */
export function notificationsStorageKey(email: string | null | undefined): string | null {
  const normalized = String(email || '')
    .toLowerCase()
    .trim();
  if (!normalized || !normalized.includes('@')) return null;
  const safe = normalized.replace(/[^a-z0-9@._-]/g, '_');
  return `@finovert_notifications_${safe}`;
}

export async function readSignedInEmail(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    const email = parsed?.email?.toLowerCase()?.trim();
    return email && email.includes('@') ? email : null;
  } catch {
    return null;
  }
}

export async function loadNotificationsForEmail(email: string | null): Promise<NotificationItem[]> {
  const key = notificationsStorageKey(email);
  if (!key) return [];
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNotificationsForEmail(
  email: string | null,
  items: NotificationItem[],
): Promise<void> {
  const key = notificationsStorageKey(email);
  if (!key) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** One-time: move old shared inbox into the current account. */
export async function migrateLegacyNotificationsIfNeeded(email: string | null): Promise<void> {
  const key = notificationsStorageKey(email);
  if (!key) return;
  try {
    const existing = await AsyncStorage.getItem(key);
    if (existing) return;
    const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) await AsyncStorage.setItem(key, legacy);
  } catch {
    /* ignore */
  }
}
