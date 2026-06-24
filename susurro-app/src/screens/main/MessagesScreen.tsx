import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socketService';

interface Conversation {
  id: string;
  updatedAt: string;
  other: { alias: string; avatarUrl: string | null } | undefined;
  lastMessage: { text: string; senderId: string; createdAt: string } | null;
}

export default function MessagesScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlias, setNewAlias] = useState('');
  const [starting, setStarting] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    loadConversations();
  }, [loadConversations]));

  useEffect(() => {
    let mounted = true;
    connectSocket().then(sock => {
      if (!mounted) return;
      // Refresh list when a new message arrives to update lastMessage
      sock.on('newMessage', () => {
        if (mounted) loadConversations();
      });
    }).catch(() => {});
    return () => {
      mounted = false;
      getSocket()?.off('newMessage');
    };
  }, [loadConversations]);

  const handleStart = async () => {
    if (!newAlias.trim()) return;
    setStarting(true);
    try {
      const { data } = await api.post('/messages/conversations', { alias: newAlias.trim() });
      setNewAlias('');
      navigation.navigate('Chat', { conversationId: data.id, alias: newAlias.trim() });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Usuario no encontrado';
      alert(msg);
    } finally {
      setStarting(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'ahora';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.title}>Mensajes</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* New conversation input */}
      <View style={styles.newRow}>
        <TextInput
          style={styles.aliasInput}
          placeholder="Enviar mensaje a @usuario..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={newAlias}
          onChangeText={setNewAlias}
          autoCapitalize="none"
          returnKeyType="send"
          onSubmitEditing={handleStart}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newAlias.trim() && { opacity: 0.3 }]}
          onPress={handleStart}
          disabled={!newAlias.trim() || starting}
        >
          {starting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.08)" />
          <Text style={styles.emptyText}>Aún no tienes mensajes</Text>
          <Text style={styles.emptyHint}>Busca un usuario arriba para empezar</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convoRow}
              onPress={() => navigation.navigate('Chat', {
                conversationId: item.id,
                alias: item.other?.alias ?? '',
              })}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.other?.alias?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alias}>@{item.other?.alias ?? '—'}</Text>
                {item.lastMessage && (
                  <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage.text}</Text>
                )}
              </View>
              {item.lastMessage && (
                <Text style={styles.time}>{formatTime(item.lastMessage.createdAt)}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },

  newRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  aliasInput: {
    flex: 1, color: '#fff', fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(110,142,251,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },

  convoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(110,142,251,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(110,142,251,0.25)',
  },
  avatarText: { color: '#6e8efb', fontSize: 18, fontWeight: '700' },
  alias: { color: '#fff', fontWeight: '600', fontSize: 15 },
  lastMsg: { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 },
  time: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '500' },
  emptyHint: { color: 'rgba(255,255,255,0.15)', fontSize: 13 },
});
