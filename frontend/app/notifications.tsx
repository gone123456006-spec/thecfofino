import { useNotifications } from '@/contexts/NotificationsContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '@/styles/notifications.styles';

function formatTimeAgo(time: string, nowMs: number): string {
  if (!time) return '';
  if (time === 'Just now') return 'Just now';

  const t = Date.parse(time);
  if (Number.isNaN(t)) return time;

  const diffMs = nowMs - t;
  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec} sec ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
}

export default function NotificationsScreen() {
  const { items, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
          style={({ pressed }) => [
            styles.markAllBtn,
            unreadCount === 0 && styles.markAllBtnDisabled,
            pressed && unreadCount !== 0 && { opacity: 0.8 },
          ]}>
          <Text style={[styles.markAllBtnText, unreadCount === 0 && styles.markAllBtnTextDisabled]}>
            Mark all as read
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap} accessibilityLabel="No notifications">
          <Ionicons name="notifications-off-outline" size={48} color="#b0b8c4" />
        </View>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => markAsRead(item.id)}>
            <View style={[styles.dot, !item.read && styles.dotActive]} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardTime}>{formatTimeAgo(item.time, nowMs)}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
