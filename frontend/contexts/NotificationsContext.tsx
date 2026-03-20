import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@finovert_notifications';

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

const DEMO_ITEMS: NotificationItem[] = [
  { id: '1', title: 'GST Filing Reminder', body: 'Your GST return for Q4 is due in 3 days.', time: '2h ago', read: false },
  { id: '2', title: 'Payment Received', body: 'Payment of ₹25,000 received from client.', time: '5h ago', read: false },
  { id: '3', title: 'ITR Filing Complete', body: 'Your ITR for FY 2025-26 has been filed successfully.', time: '1d ago', read: true },
  { id: '4', title: 'New Service Available', body: 'TDS Filing service is now available. Check it out!', time: '2d ago', read: true },
];

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>(DEMO_ITEMS);

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

  const persist = useCallback(async (next: NotificationItem[]) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const addNotification = useCallback(
    (notification: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
      const newItem: NotificationItem = {
        ...notification,
        id: `n-${Date.now()}`,
        time: 'Just now',
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
      setItems((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const markAllAsRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
