import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { notificationsApi, AppNotification } from '../../services/api';
import { timeAgo } from '../../components/ConfessionCard';

const TYPE_ICON: Record<string, string> = {
  comment: '💬',
  reaction: '🤍',
  follow: '👤',
  reply: '🔗',
};

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
      await notificationsApi.markAllRead();
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePress = (n: AppNotification) => {
    if (n.confessionId) {
      navigation.navigate('ConfessionDetail', { confessionId: n.confessionId });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
        <Text style={styles.subtitle}>Notificaciones</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="rgba(255,255,255,0.3)" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.empty}>No tienes notificaciones aún.</Text>
              <Text style={styles.emptySub}>Aquí verás reacciones, comentarios y nuevos seguidores.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, !item.read && styles.itemUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={item.confessionId ? 0.7 : 1}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.content}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {item.confessionId && <Text style={styles.arrow}>›</Text>}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: { fontSize: 24, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 36 },
  empty: { color: 'rgba(255,255,255,0.3)', fontSize: 15 },
  emptySub: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  list: { paddingVertical: 8, paddingBottom: 60 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemUnread: { backgroundColor: 'rgba(255,255,255,0.03)' },
  iconWrap: { position: 'relative', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  unreadDot: {
    position: 'absolute', top: 0, right: 0,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff',
  },
  content: { flex: 1, gap: 3 },
  message: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  time: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  arrow: { color: 'rgba(255,255,255,0.2)', fontSize: 20 },
});
