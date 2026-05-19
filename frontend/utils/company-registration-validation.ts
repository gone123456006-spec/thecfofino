import { isValidIndianMobile, sanitizeIndianMobileInput } from '@/utils/indian-mobile';

/** Indian PAN: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F). */
export const PAN_FORMAT_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

export const PAN_FORMAT_HINT = 'ABCDE1234F (5 letters, 4 digits, 1 letter)';

export function sanitizePanInput(text: string): string {
  return text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
}

export function isValidPan(value: string): boolean {
  return PAN_FORMAT_RE.test(sanitizePanInput(value));
}

export function sanitizeAadhaarInput(text: string): string {
  return text.replace(/\D/g, '').slice(0, 12);
}

export function isValidAadhaar(value: string): boolean {
  return /^\d{12}$/.test(sanitizeAadhaarInput(value));
}

export { isValidIndianMobile, sanitizeIndianMobileInput };

export function validateCompanyMobile(value: string): string | null {
  const digits = sanitizeIndianMobileInput(value);
  if (!digits) return 'Required';
  if (!isValidIndianMobile(digits)) return 'Enter a valid 10-digit mobile (starts with 6–9)';
  return null;
}

export function validatePan(value: string): string | null {
  const pan = sanitizePanInput(value);
  if (!pan) return 'Required';
  if (!isValidPan(pan)) return `Invalid PAN. Use format ${PAN_FORMAT_HINT}`;
  return null;
}

export function validateAadhaar(value: string): string | null {
  const aadhaar = sanitizeAadhaarInput(value);
  if (!aadhaar) return 'Required';
  if (!isValidAadhaar(aadhaar)) return 'Aadhaar must be exactly 12 digits';
  return null;
}
