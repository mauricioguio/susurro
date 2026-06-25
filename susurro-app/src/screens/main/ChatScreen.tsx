import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  read: boolean;
  sender: { alias: string };
}

type TickStatus = 'sending' | 'delivered' | 'read';

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, alias } = route.params as { conversationId: string; alias: string };
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);

  // Android: track keyboard visibility to adjust input row padding and avoid gap
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/conversations/${conversationId}`);
      setMessages(data);
      scrollToBottom(false);
    } catch {}
    finally { setLoading(false); }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    loadMessages();
    let mounted = true;

    connectSocket().then(sock => {
      if (!mounted) return;

      sock.emit('enterConversation', { conversationId });

      // After loading messages, notify sender their messages were read
      sock.emit('markRead', { conversationId });

      sock.on('newMessage', (msg: Message) => {
        if (!mounted) return;
        if (msg.senderId !== user?.id) {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
          // Auto-mark as read since we're viewing the chat
          sock.emit('markRead', { conversationId });
        }
      });

      sock.on('messageSent', (msg: Message) => {
        if (!mounted) return;
        // Replace the first pending optimistic message
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id.startsWith('tmp-') && m.senderId === user?.id);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = msg;
          return updated;
        });
      });

      sock.on('partnerStatus', ({ conversationId: cid, isOnline }: { conversationId: string; isOnline: boolean }) => {
        if (mounted && cid === conversationId) setIsPartnerOnline(isOnline);
      });

      sock.on('partnerTyping', ({ conversationId: cid, isTyping }: { conversationId: string; isTyping: boolean }) => {
        if (!mounted || cid !== conversationId) return;
        setIsPartnerTyping(isTyping);
        if (isTyping) scrollToBottom();
      });

      sock.on('messagesRead', ({ conversationId: cid }: { conversationId: string }) => {
        if (!mounted || cid !== conversationId) return;
        setMessages(prev => prev.map(m =>
          m.senderId === user?.id ? { ...m, read: true } : m
        ));
      });
    }).catch(() => {});

    return () => {
      mounted = false;
      const sock = getSocket();
      if (sock) {
        sock.emit('leaveConversation', { conversationId });
        sock.emit('typing', { conversationId, isTyping: false });
        sock.off('newMessage');
        sock.off('messageSent');
        sock.off('partnerStatus');
        sock.off('partnerTyping');
        sock.off('messagesRead');
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user?.id, loadMessages, scrollToBottom]);

  const handleTextChange = (val: string) => {
    setText(val);
    const sock = getSocket();
    if (!sock) return;

    const now = Date.now();
    // Throttle typing events to at most 1 per second
    if (now - lastTypingEmit.current > 1000) {
      sock.emit('typing', { conversationId, isTyping: true });
      lastTypingEmit.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sock.emit('typing', { conversationId, isTyping: false });
    }, 2000);
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;

    setText('');
    // Stop typing indicator
    getSocket()?.emit('typing', { conversationId, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      text: content,
      senderId: user?.id ?? '',
      createdAt: new Date().toISOString(),
      read: false,
      sender: { alias: user?.alias ?? '' },
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    getSocket()?.emit('sendMessage', { conversationId, text: content });
  };

  const isMine = (msg: Message) => msg.senderId === user?.id;

  const getTickStatus = (msg: Message): TickStatus | null => {
    if (!isMine(msg)) return null;
    if (msg.id.startsWith('tmp-')) return 'sending';
    if (msg.read) return 'read';
    return 'delivered';
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  // Cuando el teclado está visible en Android, quitamos el padding de nav bar
  // para evitar el gap que queda entre el input y el borde del teclado.
  const inputBottomPad = {
    paddingBottom: Platform.OS === 'android' && keyboardVisible ? 8 : Math.max(insets.bottom, 12),
  };

  const content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>@{alias}</Text>
          {isPartnerOnline && !isPartnerTyping && (
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>en línea</Text>
            </View>
          )}
          {isPartnerTyping && (
            <Text style={styles.typingText}>escribiendo...</Text>
          )}
        </View>
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
          renderItem={({ item }) => {
            const mine = isMine(item);
            const tick = getTickStatus(item);
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={styles.bubbleText}>{item.text}</Text>
                <View style={styles.bubbleMeta}>
                  <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
                  {tick && (
                    <Ionicons
                      name={tick === 'sending' ? 'checkmark' : 'checkmark-done'}
                      size={13}
                      color={tick === 'read' ? '#4fc96d' : 'rgba(255,255,255,0.35)'}
                      style={{ marginLeft: 3 }}
                    />
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Di hola 👋</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputRow, inputBottomPad]}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && { opacity: 0.3 }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {content}
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
  headerCenter: { alignItems: 'center', gap: 2 },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4fc96d' },
  onlineText: { color: '#4fc96d', fontSize: 11 },
  typingText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontStyle: 'italic' },

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
  bubbleMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: 4, gap: 2,
  },
  bubbleTime: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
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
