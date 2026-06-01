import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert, Keyboard,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { confessionsApi } from '../../services/api';

type Reaction = { type: string };
type Comment = { id: string; text: string; createdAt: string; user: { alias: string } };
type Confession = {
  id: string;
  text: string;
  createdAt: string;
  user: { alias: string };
  _count: { reactions: number; comments: number };
  reactions: Reaction[];
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const REACTIONS = [
  { type: '🤍', label: 'Te entiendo' },
  { type: '🔥', label: 'Intenso' },
  { type: '💫', label: 'Me llegó' },
];

function ConfessionCard({ item, index, navigation, onReact, onCommentOpen }: {
  item: Confession;
  index: number;
  navigation: any;
  onReact: (id: string, type: string) => void;
  onCommentOpen: (index: number) => void;
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
    onCommentOpen(index);
    try {
      const data = await confessionsApi.getComments(item.id);
      setComments(data);
    } catch {}
    finally { setLoadingComments(false); }
  };

  const openInput = () => {
    setInputOpen(true);
    setTimeout(() => onCommentOpen(index), 150);
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
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          )}

          {/* Agregar comentario */}
          {!inputOpen ? (
            <TouchableOpacity style={styles.addCommentBtn} onPress={openInput}>
              <Text style={styles.addCommentText}>＋ Agregar comentario</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="Escribe tu comentario..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={300}
                autoFocus
                onFocus={() => onCommentOpen(index)}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity onPress={() => { setInputOpen(false); Keyboard.dismiss(); }}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!commentText.trim() || sending}
                >
                  {sending
                    ? <ActivityIndicator color="#080808" size="small" />
                    : <Text style={styles.sendText}>Enviar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function FeedScreen({ navigation, route }: any) {
  const explore = route?.name === 'Explore';
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = explore ? await confessionsApi.getExplore() : await confessionsApi.getFeed();
      setConfessions(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [explore]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const handleReact = async (id: string, type: string) => {
    try {
      await confessionsApi.react(id, type);
      load(true);
    } catch {}
  };

  const scrollToCard = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 });
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.3)" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={confessions}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        onScrollToIndexFailed={() => {}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="rgba(255,255,255,0.3)"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {explore ? 'Aún no hay confesiones. ¡Sé el primero!' : 'Sigue a alguien para ver su feed.'}
          </Text>
        }
        renderItem={({ item, index }) => (
          <ConfessionCard
            item={item}
            index={index}
            navigation={navigation}
            onReact={handleReact}
            onCommentOpen={scrollToCard}
          />
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: { fontSize: 24, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: 60, fontSize: 14, lineHeight: 22 },
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
  commentTime: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginLeft: 'auto' },
  commentText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, paddingLeft: 10 },
  addCommentBtn: {
    paddingVertical: 8, alignSelf: 'flex-start',
  },
  addCommentText: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  inputBox: { gap: 8 },
  input: {
    color: '#fff', fontSize: 14, lineHeight: 21,
    minHeight: 70, textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  inputActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  cancelText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  sendBtn: {
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendText: { color: '#080808', fontSize: 14, fontWeight: '600' },
});
