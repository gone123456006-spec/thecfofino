import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Constants from 'expo-constants';

const STORAGE_KEY = '@finovert_notifications';
const TOKEN_KEY = '@finovert_token';
const FALLBACK_API_BASE = 'https://finovert-backend.onrender.com/api';

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (fromExtra) return fromExtra;
  return FALLBACK_API_BASE;
}

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

type NotificationsContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const DEMO_ITEMS: NotificationItem[] = [];

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>(DEMO_ITEMS);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as NotificationItem[];
          if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
        }
      } catch {
        // keep demo items
      }
    })();
  }, []);

  useEffect(() => {
    // Load token once so we can sync notifications from the backend.
    void (async () => {
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(t);
      } catch {
        setToken(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (token) return;
    // If token is written after initial mount (login flow), poll AsyncStorage until it appears.
    const id = setInterval(() => {
      void (async () => {
        try {
          const t = await AsyncStorage.getItem(TOKEN_KEY);
          if (t) setToken(t);
        } catch {
          // ignore
        }
      })();
    }, 3000);
    return () => clearInterval(id);
  }, [token]);

  const persist = useCallback(async (next: NotificationItem[]) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const syncFromServer = useCallback(
    async (tkn: string) => {
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
      const json = (await res.json().catch(() => ({}))) as
        | { ok?: boolean; notifications?: NotificationItem[] }
        | { error?: string };

      const notifications = (json as any)?.notifications;
      if (!Array.isArray(notifications)) return;

      // Normalize payload shape to our NotificationItem type.
      const normalized: NotificationItem[] = notifications
        .filter(Boolean)
        .map((n: any) => ({
          id: String(n.id ?? n._id ?? ''),
          title: String(n.title ?? ''),
          body: String(n.body ?? ''),
          time: String(n.time ?? n.createdAt ?? new Date().toISOString()),
          read: Boolean(n.read),
        }))
        .filter((n: NotificationItem) => Boolean(n.id));

      await persist(normalized);
    },
    [persist],
  );

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    // Initial sync
    void (async () => {
      if (!mounted) return;
      try {
        await syncFromServer(token);
      } catch {
        // ignore: keep local fallback
      }
    })();

    // Poll for "real time" updates (new notifications pushed from dashboard).
    const id = setInterval(() => {
      void syncFromServer(token).catch(() => {});
    }, 10_000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [token, syncFromServer]);

  const addNotification = useCallback(
    (notification: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
      const newItem: NotificationItem = {
        ...notification,
        id: `n-${Date.now()}`,
        time: new Date().toISOString(),
        read: false,
      };
      setItems((prev) => {
        const next = [newItem, ...prev];
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const markAsRead = useCallback(
    (id: string) => {
      // Optimistic UI update
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

      void (async () => {
        try {
          if (token) {
            await fetch(`${getApiBase()}/notifications/my/mark-read`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ id }),
            }).catch(() => null);
            await syncFromServer(token).catch(() => null);
            return;
          }

          // No token: persist locally only.
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw) as NotificationItem[];
          const next = parsed.map((n) => (n.id === id ? { ...n, read: true } : n));
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      })();
    },
    [syncFromServer, token],
  );

  const markAllAsRead = useCallback(() => {
    // Optimistic UI update
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    void (async () => {
      try {
        if (token) {
          await fetch(`${getApiBase()}/notifications/my/mark-read`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }).catch(() => null);
          await syncFromServer(token).catch(() => null);
          return;
        }

        // No token: persist locally only.
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as NotificationItem[];
        const next = parsed.map((n) => ({ ...n, read: true }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    })();
  }, [syncFromServer, token]);

  const value: NotificationsContextValue = {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    addNotification,
    markAsRead,
    markAllAsRead,
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
