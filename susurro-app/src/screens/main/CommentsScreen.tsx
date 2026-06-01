import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  user: { alias: string };
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function CommentsScreen({ route, navigation }: any) {
  const { confessionId, confessionText } = route.params;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    confessionsApi.getComments(confessionId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [confessionId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const newComment = await confessionsApi.addComment(confessionId, text.trim());
      setComments(prev => [...prev, newComment]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Comentarios</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.confession}>
        <Text style={styles.confessionText} numberOfLines={3}>{confessionText}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Sé el primero en comentar.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <View style={styles.commentHeader}>
                <View style={styles.dot} />
                <Text style={styles.commentAlias}>{item.user.alias}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          )}
        />
      )}

      <View style={styles.inputRow}>
        <View style={styles.dot} />
        <Text style={styles.inputAlias}>{user?.alias}</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe un comentario..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#080808" size="small" />
            : <Text style={styles.sendText}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  back: { color: 'rgba(255,255,255,0.4)', fontSize: 14, width: 60 },
  title: { color: '#fff', fontSize: 15, fontWeight: '500' },
  confession: {
    margin: 16, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  confessionText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 },
  list: { paddingHorizontal: 16, paddingBottom: 8, gap: 2 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: 40, fontSize: 14 },
  comment: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  commentAlias: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' },
  commentTime: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginLeft: 'auto' },
  commentText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 21 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#080808',
  },
  inputAlias: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 10 },
  input: {
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendText: { color: '#080808', fontSize: 16, fontWeight: '700' },
});
