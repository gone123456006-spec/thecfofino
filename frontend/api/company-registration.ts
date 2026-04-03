import { Platform } from 'react-native';

export type CompanyDirectorPayload = {
  name: string;
  pan: string;
  aadhaar: string;
  shareholding: string;
  panFileUri: string | null;
  aadhaarFrontFileUri: string | null;
  aadhaarBackFileUri: string | null;
};

export type CompanyRegistrationPayload = {
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
  directors: CompanyDirectorPayload[];
};

/**
 * API base must end with `/api` (Express mounts routes under `/api/*`).
 * If EXPO_PUBLIC_API_URL is set without `/api`, we append it — otherwise verify/payments return HTML 404 and JSON.parse throws.
 */
export function getApiBase(): string {
  const fallback = 'https://finovert-backend.onrender.com/api';
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return fallback;
  let base = raw.replace(/\/+$/, '');
  if (!/\/api$/i.test(base)) {
    base = `${base}/api`;
  }
  return base;
}

/** Parse JSON from fetch; if server returns HTML (wrong URL / 502 page), throw a clear message. */
export async function parseApiJson<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        `${context}: server returned a web page instead of JSON (HTTP ${res.status}). ` +
          'Check EXPO_PUBLIC_API_URL — it must end with /api (example: https://your-host.com/api).',
      );
    }
    throw new Error(
      `${context}: bad response (HTTP ${res.status}) — ${text.replace(/\s+/g, ' ').slice(0, 140)}`,
    );
  }
}

/** Absolute URL for Finovert logo served by API (Razorpay checkout `image`). */
export function checkoutLogoFromApiBase(apiBase: string): string {
  const origin = apiBase.replace(/\/?api\/?$/i, '');
  return `${origin}/api/branding/finovert-logo.png`;
}

const getCompanyRegistrationApiUrl = (): string => {
  const override = process.env.EXPO_PUBLIC_COMPANY_REGISTRATION_API_URL?.trim();
  if (override) return override;
  return getApiBase() + '/registrations';
};

export type MyRegistrationItem = {
  _id: string;
  status: string;
  paymentStatus: string;
  paymentAmount?: number;
  caseId?: string;
  proposedName1?: string;
  businessType?: string;
  createdAt: string;
  paidAt?: string;
  paymentReference?: string;
  paymentMethod?: string;
  updatedAt?: string;
  directors?: any[];
};

export async function submitCompanyRegistrationToBackend(
  payload: CompanyRegistrationPayload,
  token?: string | null,
): Promise<{ caseId?: string; id?: string }> {
  const url = getCompanyRegistrationApiUrl();
  if (url.includes('docs.google.com/spreadsheets')) {
    throw new Error(
      'Use Google Apps Script Web App URL, not Google Sheet URL, in EXPO_PUBLIC_COMPANY_REGISTRATION_API_URL.',
    );
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && token.trim()) headers['Authorization'] = `Bearer ${token.trim()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  try {
    const json = JSON.parse(text) as { ok?: boolean; error?: string; caseId?: string; id?: string };
    if (json.ok === false) throw new Error(json.error || 'Submission failed');
    return { caseId: json.caseId, id: json.id };
  } catch (e) {
    if (e instanceof SyntaxError) return {};
    throw e;
  }
}

export async function updateCompanyRegistrationInBackend(
  id: string,
  payload: CompanyRegistrationPayload,
  token?: string | null,
): Promise<{ caseId?: string; id?: string }> {
  const base = getCompanyRegistrationApiUrl();
  const url = `${base}/${id}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && token.trim()) headers['Authorization'] = `Bearer ${token.trim()}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);

  try {
    const json = JSON.parse(text) as { ok?: boolean; error?: string; caseId?: string; id?: string };
    if (json.ok === false) throw new Error(json.error || 'Update failed');
    return { caseId: json.caseId, id: json.id };
  } catch (e) {
    if (e instanceof SyntaxError) return {};
    throw e;
  }
}

export async function fetchMyRegistrations(token: string): Promise<MyRegistrationItem[]> {
  const base = getApiBase();
  const url = base + '/registrations/my?t=' + Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  const json = JSON.parse(text) as { ok?: boolean; registrations?: MyRegistrationItem[] };
  if (!json.ok || !Array.isArray(json.registrations)) return [];
  return json.registrations;
}

/**
 * Same as fetchMyRegistrations but omits director document payloads (for payment history / lighter lists).
 */
export async function fetchMyRegistrationsSummary(token: string): Promise<MyRegistrationItem[]> {
  const base = getApiBase();
  const url = base + '/registrations/my?summary=1&limit=50&t=' + Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
  const json = JSON.parse(text) as { ok?: boolean; registrations?: MyRegistrationItem[] };
  if (!json.ok || !Array.isArray(json.registrations)) return [];
  return json.registrations;
}

export type PaymentPublicConfig = {
  ok: boolean;
  companyRegistrationAmountINR: number;
  productTitle: string;
  productDescription: string;
  currency: string;
  razorpayConfigured: boolean;
  checkoutLogoUrl?: string;
  error?: string;
};

/** Razorpay / company-reg fee config from backend (dashboard-managed). */
export async function fetchPaymentPublicConfig(): Promise<PaymentPublicConfig> {
  const base = getApiBase();
  const fallback = (msg: string): PaymentPublicConfig => ({
    ok: false,
    companyRegistrationAmountINR: 1,
    productTitle: 'Company Registration',
    productDescription: '',
    currency: 'INR',
    razorpayConfigured: false,
    checkoutLogoUrl: checkoutLogoFromApiBase(base),
    error: msg,
  });
  try {
    const res = await fetch(`${base}/payments/public-config`, { cache: 'no-store' });
    let json: PaymentPublicConfig;
    try {
      json = await parseApiJson<PaymentPublicConfig>(res, 'Payment settings');
    } catch {
      return fallback('Invalid response from server. Ensure EXPO_PUBLIC_API_URL ends with /api.');
    }
    if (!res.ok || !json.ok) {
      return fallback(json.error || 'Could not load payment settings');
    }
    if (!json.checkoutLogoUrl) {
      json.checkoutLogoUrl = checkoutLogoFromApiBase(getApiBase());
    }
    return json;
  } catch {
    return fallback('Network error loading payment settings.');
  }
}

/** After Razorpay success + /payments/verify, persist paid status on the registration (server). */
export async function completeCompanyRegistrationPaymentApi(
  token: string,
  registrationId: string,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
): Promise<{ ok: boolean; paymentAmount?: number; error?: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/payments/complete-company-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      registrationId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  });
  try {
    const json = await parseApiJson<{ ok?: boolean; paymentAmount?: number; error?: string }>(
      res,
      'Save payment on server',
    );
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || `Request failed (${res.status})` };
    }
    return { ok: true, paymentAmount: json.paymentAmount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Request failed' };
  }
}
