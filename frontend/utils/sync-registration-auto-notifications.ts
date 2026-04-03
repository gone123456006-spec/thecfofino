import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MyRegistrationItem } from '@/api/company-registration';
import { effectiveRegistrationStatus } from '@/utils/company-registration-status';
import { TRACKER_STEPS, resolveStepsDone } from '@/utils/registration-tracker-steps';

const SNAPSHOT_KEY = '@finovert_reg_auto_notify_snapshot';

type RegSnapshot = {
  eff: string;
  payment: string;
};

export type AddNotificationFn = (input: {
  title: string;
  body: string;
  read?: boolean;
  id?: string;
}) => void;

function filingLabel(reg: MyRegistrationItem): string {
  const name = reg.proposedName1?.trim() || 'Your filing';
  return reg.caseId ? `${name} · ${reg.caseId}` : name;
}

export async function syncRegistrationAutoNotifications(
  registrations: MyRegistrationItem[],
  addNotification: AddNotificationFn,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    const snapshot: Record<string, RegSnapshot> = raw ? (JSON.parse(raw) as Record<string, RegSnapshot>) : {};

    for (const reg of registrations) {
      const regId = String(reg._id);
      const eff = effectiveRegistrationStatus(reg);
      const newSteps = resolveStepsDone(eff);
      const payment = reg.paymentStatus || 'unpaid';
      const prev = snapshot[regId];

      if (!prev) {
        snapshot[regId] = { eff, payment };
        continue;
      }

      const oldSteps = resolveStepsDone(prev.eff);
      for (const step of TRACKER_STEPS) {
        const key = step.key;
        if (!oldSteps[key] && newSteps[key]) {
          addNotification({
            id: `n-auto-track-${regId}-${key}`,
            title: `${step.label} complete`,
            body: `${step.sublabel} — ${filingLabel(reg)}.`,
          });
        }
      }

      const prevPay = prev.payment || 'unpaid';
      if (prevPay !== payment) {
        if (payment === 'paid') {
          const amt =
            reg.paymentAmount != null && reg.paymentAmount > 0
              ? `₹${reg.paymentAmount.toLocaleString('en-IN')}`
              : '';
          addNotification({
            id: `n-auto-pay-${regId}-paid`,
            title: 'Payment received',
            body: amt
              ? `We received ${amt} for company registration — ${filingLabel(reg)}.`
              : `Your payment for company registration was recorded — ${filingLabel(reg)}.`,
          });
        } else if (payment === 'partial') {
          addNotification({
            id: `n-auto-pay-${regId}-partial`,
            title: 'Partial payment recorded',
            body: `A partial payment was recorded for ${filingLabel(reg)}.`,
          });
        }
      }

      snapshot[regId] = { eff, payment };
    }

    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}
