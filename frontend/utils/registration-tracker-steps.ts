/**
 * Shared tracker step definitions (company registration filing workflow).
 * Used by the tracker UI and client-side auto-notifications.
 */
export const TRACKER_STEPS = [
  {
    key: 'document_submitted',
    label: 'Documents Submitted',
    sublabel: 'We have received your documents',
    icon: 'cloud-upload-outline',
  },
  {
    key: 'submitted',
    label: 'Application Submitted',
    sublabel: 'Application submitted to authority',
    icon: 'send-outline',
  },
  {
    key: 'initiated',
    label: 'Process Initiated',
    sublabel: 'Filing process has begun',
    icon: 'play-circle-outline',
  },
  {
    key: 'filed',
    label: 'Filed with MCA',
    sublabel: 'Name filed with Ministry of Corporate Affairs',
    icon: 'document-attach-outline',
  },
  {
    key: 'approved',
    label: 'Approved',
    sublabel: 'Application approved — incorporation complete!',
    icon: 'ribbon-outline',
  },
] as const;

export type TrackerStepKey = (typeof TRACKER_STEPS)[number]['key'];

const STATUS_MAP: Record<string, TrackerStepKey[]> = {
  draft: [],
  payment_pending: [],
  paid: ['document_submitted'],
  upload_in_progress: ['document_submitted'],
  submitted: ['document_submitted', 'submitted'],
  initiated: ['document_submitted', 'submitted', 'initiated'],
  filed: ['document_submitted', 'submitted', 'initiated', 'filed'],
  approved: ['document_submitted', 'submitted', 'initiated', 'filed', 'approved'],
  completed: ['document_submitted', 'submitted', 'initiated', 'filed', 'approved'],
  rejected: ['document_submitted'],
  pending: [],
};

export function resolveStepsDone(status: string | null): Record<TrackerStepKey, boolean> {
  const key = (status || '').toLowerCase();
  const done = STATUS_MAP[key] || [];
  return {
    document_submitted: done.includes('document_submitted'),
    submitted: done.includes('submitted'),
    initiated: done.includes('initiated'),
    filed: done.includes('filed'),
    approved: done.includes('approved'),
  };
}
