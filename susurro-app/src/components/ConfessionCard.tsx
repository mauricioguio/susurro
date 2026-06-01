import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, Keyboard,
} from 'react-native';
import { confessionsApi } from '../services/api';

export type Reaction = { type: string };
export type Comment = { id: string; text: string; createdAt: string; user: { alias: string } };
export type Confession = {
  id: string;
  text: string;
  createdAt: string;
  user: { alias: string };
  _count: { reactions: number; comments: number };
  reactions: Reaction[];
};

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export const REACTIONS = [
  { type: '🤍', label: 'Te entiendo' },
  { type: '🔥', label: 'Intenso' },
  { type: '💫', label: 'Me llegó' },
];

export function ConfessionCard({ item, index = 0, navigation, onReact, onCommentOpen }: {
  item: Confession;
  index?: number;
  navigation: any;
  onReact: (id: string, type: string) => void;
  onCommentOpen?: (index: number) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentCount, setCommentCount] = useState(item._count.comments);

  const reactionCounts = item.reactions.reduce((acc: Record<string, number>, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const toggleComments = async () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      setInputOpen(false);
      Keyboard.dismiss();
      return;
    }
    setCommentsOpen(true);
    setLoadingComments(true);
    onCommentOpen?.(index);
    try {
      const data = await confessionsApi.getComments(item.id);
      setComments(data);
    } catch {}
    finally { setLoadingComments(false); }
  };

  const openInput = (prefill = '') => {
    setCommentText(prefill);
    setInputOpen(true);
    setTimeout(() => onCommentOpen?.(index), 150);
  };

  const handleReply = (alias: string) => {
    openInput(`@${alias} `);
  };

  const handleSend = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const newComment = await confessionsApi.addComment(item.id, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      setCommentCount(n => n + 1);
      setInputOpen(false);
      Keyboard.dismiss();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Alias + tiempo */}
      <View style={styles.cardTop}>
        <TouchableOpacity
          style={styles.aliasRow}
          onPress={() => navigation.navigate('UserProfile', { alias: item.user.alias })}
        >
          <View style={styles.dot} />
          <Text style={styles.alias}>{item.user.alias}</Text>
        </TouchableOpacity>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>

      {/* Texto */}
      <Text style={styles.text}>{item.text}</Text>

      {/* Reacciones */}
      <View style={styles.reactionsRow}>
        {REACTIONS.map(({ type, label }) => (
          <TouchableOpacity key={type} style={styles.reaction} onPress={() => onReact(item.id, type)}>
            <Text style={styles.reactionEmoji}>{type}</Text>
            <Text style={styles.reactionLabel}>{label}</Text>
            {(reactionCounts[type] ?? 0) > 0 && (
              <Text style={styles.reactionCount}>{reactionCounts[type]}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Botón ver comentarios */}
      <TouchableOpacity style={styles.commentBtn} onPress={toggleComments}>
        <Text style={styles.commentBtnText}>
          💬 {commentCount} comentario{commentCount !== 1 ? 's' : ''} {commentsOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Sección de comentarios */}
      {commentsOpen && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginVertical: 8 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>Sin comentarios aún.</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentDot} />
                  <Text style={styles.commentAlias}>{c.user.alias}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                  <TouchableOpacity onPress={() => handleReply(c.user.alias)}>
                    <Text style={styles.replyBtn}>Responder</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          )}

          {/* Input comentario */}
          {!inputOpen ? (
            <TouchableOpacity style={styles.addCommentBtn} onPress={() => openInput()}>
              <Text style={styles.addCommentText}>＋ Agregar comentario</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Escribe un comentario..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={300}
                autoFocus
                onFocus={() => onCommentOpen?.(index)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!commentText.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
                  : <Text style={styles.sendIcon}>➤</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  alias: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  time: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  text: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 24 },
  reactionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 20,
  },
  reactionEmoji: { fontSize: 13 },
  reactionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  reactionCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  commentBtn: { alignSelf: 'flex-start' },
  commentBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  commentsSection: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12, gap: 10,
  },
  noComments: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  comment: { gap: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  commentAlias: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500' },
  commentTime: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
  replyBtn: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' },
  commentText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, paddingLeft: 10 },
  addCommentBtn: { paddingVertical: 8, alignSelf: 'flex-start' },
  addCommentText: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 21,
    minHeight: 40, maxHeight: 100, textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.2 },
  sendIcon: { color: '#080808', fontSize: 18 },
});
