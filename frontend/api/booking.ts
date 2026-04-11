/**
 * Submit booking call data to backend.
 * Uses EXPO_PUBLIC_API_URL (same as rest of app) so booking works on physical device.
 * Override with EXPO_PUBLIC_BOOKING_API_URL if you need a different URL for bookings.
 */

import { Platform } from 'react-native';

export type BookingPayload = {
  name: string;
  mobile: string;
  purpose: string;
  details: string;
};

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) return process.env.EXPO_PUBLIC_API_URL.trim();
  return 'https://finovert-backend.onrender.com/api';
}

const getBookingApiUrl = (): string => {
  const override = process.env.EXPO_PUBLIC_BOOKING_API_URL?.trim();
  if (override) return override;
  return getApiBase() + '/bookings';
};

export async function submitBookingToBackend(payload: BookingPayload): Promise<void> {
  const url = getBookingApiUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  try {
    const json = JSON.parse(text) as { ok?: boolean; error?: string };
    if (json.ok === false) throw new Error(json.error || 'Submission failed');
  } catch (e) {
    if (e instanceof SyntaxError) return; // non-JSON success response
    throw e;
  }
}