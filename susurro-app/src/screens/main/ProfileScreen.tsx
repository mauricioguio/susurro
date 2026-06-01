import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { confessionsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Confession = {
  id: string;
  text: string;
  createdAt: string;
  _count: { reactions: number; comments: number };
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ProfileScreen() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await confessionsApi.getByUser(user.alias);
      setConfessions(data);
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.aliasTitle}>{user?.alias ?? ''}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{confessions.length}</Text>
          <Text style={styles.statLabel}>confesiones</Text>
        </View>
      </View>

      <View style={styles.privacyBadge}>
        <Text style={styles.privacyText}>🔒 Tu nombre y correo son completamente privados</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={confessions}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Aún no tienes confesiones.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardText}>{item.text}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>🤍 {item._count.reactions} · 💬 {item._count.comments}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
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
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
  },
  aliasTitle: { fontSize: 22, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  logoutBtn: { padding: 4 },
  logoutText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  stats: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 20,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { color: '#fff', fontSize: 22, fontWeight: '600' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  privacyBadge: {
    margin: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  privacyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: 40, fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 12,
  },
  cardText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  cardTime: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
});
