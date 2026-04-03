import type { MyRegistrationItem } from '@/api/company-registration';

/** Normalized workflow status for tracker / labels (matches upload-tracking). */
export function effectiveRegistrationStatus(item: MyRegistrationItem): string {
  const st = (item.status || 'pending').toLowerCase();
  if (st === 'pending' && item.paymentStatus === 'paid') return 'paid';
  return st;
}

/** Approved, completed, or rejected — show as closed / not in "Processing". */
export function isRegistrationTrackingEnded(item: MyRegistrationItem): boolean {
  const s = effectiveRegistrationStatus(item);
  return s === 'approved' || s === 'completed' || s === 'rejected';
}

export function registrationStatusLabel(item: MyRegistrationItem): string {
  const key = effectiveRegistrationStatus(item);
  const labels: Record<string, string> = {
    pending: 'Pending review',
    paid: 'Paid — documents',
    submitted: 'Application submitted',
    initiated: 'Process initiated',
    filed: 'Filed with MCA',
    approved: 'Approved',
    completed: 'Completed',
    rejected: 'Rejected',
    draft: 'Draft',
  };
  return labels[key] || item.status || 'In progress';
}
