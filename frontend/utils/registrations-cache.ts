import type { MyRegistrationItem } from '@/api/company-registration';

let cachedUserKey = '';
let cachedList: MyRegistrationItem[] = [];

export function registrationsCacheUserKey(user?: {
  id?: string;
  email?: string;
} | null): string {
  if (user?.id) return String(user.id);
  if (user?.email) return String(user.email).toLowerCase().trim();
  return '';
}

export function getCachedRegistrations(userKey: string): MyRegistrationItem[] {
  if (!userKey || userKey !== cachedUserKey) return [];
  return cachedList;
}

export function setCachedRegistrations(userKey: string, list: MyRegistrationItem[]): void {
  if (!userKey) return;
  cachedUserKey = userKey;
  cachedList = list;
}

export function clearRegistrationsCache(): void {
  cachedUserKey = '';
  cachedList = [];
}

export function getCachedPaidRegistrations(userKey: string): MyRegistrationItem[] {
  return getCachedRegistrations(userKey).filter(
    (r) => r.paymentStatus === 'paid' || r.paymentStatus === 'partial',
  );
}
