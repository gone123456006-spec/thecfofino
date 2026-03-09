import { useNotifications } from '@/contexts/NotificationsContext';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '@/styles/notifications.styles';

export default function NotificationsScreen() {
  const { items, markAsRead } = useNotifications();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}>
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="notifications-off-outline" size={48} color="#b0b8c4" />
          <Text style={styles.emptyText}>No notifications yet</Text>
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
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
