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

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) return process.env.EXPO_PUBLIC_API_URL.trim();
  return 'https://finovert-backend.onrender.com/api';
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
