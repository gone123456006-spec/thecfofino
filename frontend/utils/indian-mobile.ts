/** Indian mobile: exactly 10 digits, first digit 6–9. */
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export const INDIAN_MOBILE_LENGTH = 10;

export function sanitizeIndianMobileInput(text: string): string {
  return text.replace(/\D/g, '').slice(0, INDIAN_MOBILE_LENGTH);
}

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_RE.test(sanitizeIndianMobileInput(value));
}

export function normalizeIndianMobile(value: string): string | null {
  const digits = sanitizeIndianMobileInput(value);
  return isValidIndianMobile(digits) ? digits : null;
}
