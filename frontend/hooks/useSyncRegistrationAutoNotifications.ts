import { useCallback } from 'react';

import type { MyRegistrationItem } from '@/api/company-registration';
import { useNotifications } from '@/contexts/NotificationsContext';
import { syncRegistrationAutoNotifications } from '@/utils/sync-registration-auto-notifications';

/**
 * Runs client-side auto-notifications when filing status or payment changes (vs last snapshot).
 * No backend — compares current registration list to AsyncStorage snapshot.
 */
export function useSyncRegistrationAutoNotifications() {
  const { addNotification } = useNotifications();
  return useCallback(
    (registrations: MyRegistrationItem[]) => {
      void syncRegistrationAutoNotifications(registrations, addNotification);
    },
    [addNotification],
  );
}
