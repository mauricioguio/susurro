import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  sender: { alias: string };
}

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, alias } = route.params as { conversationId: string; alias: string };
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/conversations/${conversationId}`);
      setMessages(data);
    } catch {}
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();

    let mounted = true;
    connectSocket().then(sock => {
      if (!mounted) return;
      sock.on('newMessage', (msg: Message) => {
        if (msg.senderId !== user?.id && mounted) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
      });
    }).catch(() => {});

    return () => {
      mounted = false;
      getSocket()?.off('newMessage');
    };
  }, [loadMessages, user?.id]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic add
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      text: content,
      senderId: user?.id ?? '',
      createdAt: new Date().toISOString(),
      sender: { alias: user?.alias ?? '' },
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const sock = getSocket();
      if (sock?.connected) {
        sock.emit('sendMessage', { conversationId, text: content }, (response: any) => {
          if (response?.data) {
            setMessages(prev => prev.map(m => m.id === optimistic.id ? response.data : m));
          }
          setSending(false);
        });
      } else {
        setSending(false);
      }
    } catch {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const isMine = (msg: Message) => msg.senderId === user?.id;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.title}>@{alias}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.bubble, isMine(item) ? styles.mine : styles.theirs]}>
              <Text style={styles.bubbleText}>{item.text}</Text>
              <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Di hola 👋</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.3 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },

  bubble: {
    maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, marginVertical: 2,
  },
  mine: {
    backgroundColor: 'rgba(110,142,251,0.25)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderWidth: 1, borderColor: 'rgba(110,142,251,0.3)',
  },
  theirs: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleTime: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  input: {
    flex: 1, color: '#fff', fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(110,142,251,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },
});
