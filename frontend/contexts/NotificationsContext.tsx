import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { getApiBase } from '@/constants/api';
import {
  loadNotificationsForEmail,
  migrateLegacyNotificationsIfNeeded,
  readSignedInEmail,
  saveNotificationsForEmail,
  type NotificationItem,
} from '@/utils/notification-storage';

export type { NotificationItem };

const TOKEN_KEY = '@finovert_token';

export type AddNotificationInput = {
  title: string;
  body: string;
  read?: boolean;
  autoMarkReadAfterMs?: number;
  id?: string;
};

type NotificationsContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: AddNotificationInput) => void;
  removeNotificationsByPrefix: (prefix: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const accountEmailRef = useRef<string | null>(null);

  const persistForCurrentAccount = useCallback(async (next: NotificationItem[]) => {
    const email = accountEmailRef.current;
    setItems(next);
    await saveNotificationsForEmail(email, next);
  }, []);

  const switchToAccount = useCallback(
    async (email: string | null) => {
      if (email === accountEmailRef.current) return;
      accountEmailRef.current = email;
      if (!email) {
        setItems([]);
        return;
      }
      await migrateLegacyNotificationsIfNeeded(email);
      const stored = await loadNotificationsForEmail(email);
      setItems(stored);
    },
    [],
  );

  const refreshActiveAccount = useCallback(async () => {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    const email = await readSignedInEmail();
    if (!t || !email) {
      await switchToAccount(null);
      setToken(null);
      return;
    }
    await switchToAccount(email);
    setToken(t);
  }, [switchToAccount]);

  useEffect(() => {
    void refreshActiveAccount();
  }, [refreshActiveAccount]);

  useEffect(() => {
    // Keep watching auth storage even after login so account switches
    // on the same device swap notification scope immediately.
    const id = setInterval(() => {
      void refreshActiveAccount();
    }, 2000);
    return () => clearInterval(id);
  }, [refreshActiveAccount]);

  const syncFromServer = useCallback(
    async (tkn: string, email: string) => {
      const res = await fetch(`${getApiBase()}/notifications/my`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tkn}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        if (res.status === 401) setToken(null);
        return;
      }
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        notifications?: NotificationItem[];
      };

      const notifications = json?.notifications;
      if (!Array.isArray(notifications)) return;

      const normalized: NotificationItem[] = notifications
        .filter(Boolean)
        .map((n: NotificationItem & { _id?: string; createdAt?: string }) => ({
          id: String(n.id ?? n._id ?? ''),
          title: String(n.title ?? ''),
          body: String(n.body ?? ''),
          time: String(n.time ?? n.createdAt ?? new Date().toISOString()),
          read: Boolean(n.read),
        }))
        .filter((n) => Boolean(n.id));

      const prev = await loadNotificationsForEmail(email);
      const serverIds = new Set(normalized.map((n) => n.id));
      const localOnly = prev.filter((n) => n.id.startsWith('n-') && !serverIds.has(n.id));
      const merged = [...normalized, ...localOnly].sort((a, b) => {
        const ta = Date.parse(a.time) || 0;
        const tb = Date.parse(b.time) || 0;
        return tb - ta;
      });
      await persistForCurrentAccount(merged);
    },
    [persistForCurrentAccount],
  );

  useEffect(() => {
    const email = accountEmailRef.current;
    if (!token || !email) return;

    let mounted = true;
    void (async () => {
      if (!mounted) return;
      try {
        await syncFromServer(token, email);
      } catch {
        /* keep local */
      }
    })();

    const pollId = setInterval(() => {
      const em = accountEmailRef.current;
      if (token && em) void syncFromServer(token, em).catch(() => {});
    }, 10_000);

    return () => {
      mounted = false;
      clearInterval(pollId);
    };
  }, [token, syncFromServer]);

  const removeNotificationsByPrefix = useCallback(
    (prefix: string) => {
      if (!prefix || !accountEmailRef.current) return;
      setItems((prev) => {
        const next = prev.filter((n) => !n.id.startsWith(prefix));
        if (next.length === prev.length) return prev;
        void saveNotificationsForEmail(accountEmailRef.current, next);
        return next;
      });
    },
    [],
  );

  const addNotification = useCallback(
    (notification: AddNotificationInput) => {
      void (async () => {
        let email = accountEmailRef.current;
        if (!email) {
          email = await readSignedInEmail();
          if (email) await switchToAccount(email);
        }
        if (!email) return;

        const id = notification.id ?? `n-${Date.now()}`;
        setItems((prev) => {
          if (prev.some((n) => n.id === id)) return prev;
          const newItem: NotificationItem = {
            title: notification.title,
            body: notification.body,
            id,
            time: new Date().toISOString(),
            read: Boolean(notification.read),
          };
          const next = [newItem, ...prev];
          void saveNotificationsForEmail(email, next);

          if (
            !newItem.read &&
            typeof notification.autoMarkReadAfterMs === 'number' &&
            notification.autoMarkReadAfterMs > 0
          ) {
            const delay = notification.autoMarkReadAfterMs;
            const readId = id;
            setTimeout(() => {
              setItems((p) => {
                const merged = p.map((n) => (n.id === readId ? { ...n, read: true } : n));
                void saveNotificationsForEmail(accountEmailRef.current, merged);
                return merged;
              });
            }, delay);
          }

          return next;
        });
      })();
    },
    [switchToAccount],
  );

  const markAsRead = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        void saveNotificationsForEmail(accountEmailRef.current, next);
        return next;
      });

      void (async () => {
        try {
          if (id.startsWith('n-')) return;

          const email = accountEmailRef.current;
          if (token && email) {
            await fetch(`${getApiBase()}/notifications/my/mark-read`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ id }),
            }).catch(() => null);
            await syncFromServer(token, email).catch(() => null);
          }
        } catch {
          /* ignore */
        }
      })();
    },
    [syncFromServer, token],
  );

  const markAllAsRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      void saveNotificationsForEmail(accountEmailRef.current, next);
      return next;
    });

    void (async () => {
      try {
        const email = accountEmailRef.current;
        if (token && email) {
          await fetch(`${getApiBase()}/notifications/my/mark-read`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }).catch(() => null);
          await syncFromServer(token, email).catch(() => null);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [syncFromServer, token]);

  const clearNotifications = useCallback(() => {
    const email = accountEmailRef.current;
    setItems([]);
    void saveNotificationsForEmail(email, []);
  }, []);

  const value: NotificationsContextValue = {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    addNotification,
    removeNotificationsByPrefix,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
