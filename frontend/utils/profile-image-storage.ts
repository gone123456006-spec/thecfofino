import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

const STORAGE_PREFIX = '@finovert_profile_image_uri_';

/** Stable key: email when available (same across logins), else user id. */
function canonicalUserKey(userId?: string | null, email?: string | null): string | null {
  const norm = email?.toLowerCase().trim();
  if (norm) return norm;
  if (userId) return String(userId);
  return null;
}

function storageKeyFor(userKey: string): string {
  return `${STORAGE_PREFIX}${userKey}`;
}

/** All keys that may hold this user's image (canonical + legacy id-only). */
function allStorageKeys(userId?: string | null, email?: string | null): string[] {
  const keys = new Set<string>();
  const canonical = canonicalUserKey(userId, email);
  if (canonical) keys.add(storageKeyFor(canonical));
  if (userId) {
    const idOnly = String(userId);
    const emailNorm = email?.toLowerCase().trim();
    if (!emailNorm || idOnly !== emailNorm) {
      keys.add(storageKeyFor(idOnly));
    }
  }
  return [...keys];
}

function profileFile(userKey: string): File {
  const safe = userKey.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new File(Paths.document, `profile_${safe}.jpg`);
}

async function readUriFromKey(key: string): Promise<string | null> {
  const uri = await AsyncStorage.getItem(key);
  if (!uri) return null;
  const file = new File(uri);
  if (!file.exists) {
    await AsyncStorage.removeItem(key);
    return null;
  }
  return file.uri;
}

/**
 * Copy picked image to app documents (stable path) and remember URI per user.
 */
export async function saveProfileImageForUser(
  tempUri: string,
  userId?: string | null,
  email?: string | null,
): Promise<string | null> {
  const userKey = canonicalUserKey(userId, email);
  if (!userKey) return null;

  const dest = profileFile(userKey);
  let savedUri = dest.uri;

  try {
    if (dest.exists) {
      dest.delete();
    }
    const source = new File(tempUri);
    source.copy(dest);
    savedUri = dest.uri;
  } catch {
    savedUri = tempUri;
  }

  const keys = allStorageKeys(userId, email);
  await Promise.all(keys.map(k => AsyncStorage.setItem(k, savedUri)));
  return savedUri;
}

export async function getProfileImageForUser(
  userId?: string | null,
  email?: string | null,
): Promise<string | null> {
  const keys = allStorageKeys(userId, email);
  for (const key of keys) {
    const uri = await readUriFromKey(key);
    if (uri) {
      const canonical = canonicalUserKey(userId, email);
      if (canonical && key !== storageKeyFor(canonical)) {
        await AsyncStorage.setItem(storageKeyFor(canonical), uri);
      }
      return uri;
    }
  }
  return null;
}

/** Only use when the user explicitly removes their photo — not on logout. */
export async function removeProfileImageForUser(
  userId?: string | null,
  email?: string | null,
): Promise<void> {
  const keys = allStorageKeys(userId, email);
  const uris = new Set<string>();

  for (const key of keys) {
    try {
      const uri = await AsyncStorage.getItem(key);
      if (uri) uris.add(uri);
    } catch {
      /* ignore */
    }
    await AsyncStorage.removeItem(key);
  }

  const userKey = canonicalUserKey(userId, email);
  if (userKey) {
    try {
      const dest = profileFile(userKey);
      if (dest.exists) dest.delete();
    } catch {
      /* ignore */
    }
  }

  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      /* ignore */
    }
  }
}
