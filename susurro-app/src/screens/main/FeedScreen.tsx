import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
  Dimensions, TouchableOpacity, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { Confession, REACTIONS, timeAgo } from '../../components/ConfessionCard';

const { width: W, height: H } = Dimensions.get('window');

type Comment = { id: string; text: string; createdAt: string; user: { alias: string } };

function CommentsModal({ visible, confession, onClose }: {
  visible: boolean;
  confession: Confession | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(0);

  useFocusEffect(useCallback(() => {}, []));

  const load = useCallback(async () => {
    if (!confession) return;
    setLoading(true);
    try {
      const data = await confessionsApi.getComments(confession.id);
      setComments(data);
      setCount(data.length);
    } catch {}
    finally { setLoading(false); }
  }, [confession?.id]);

  // load when modal opens
  useState(() => { if (visible && confession) load(); });

  const handleReply = (alias: string) => setText(`@${alias} `);

  const handleSend = async () => {
    if (!text.trim() || !confession) return;
    setSending(true);
    try {
      const c = await confessionsApi.addComment(confession.id, text.trim());
      setComments(p => [...p, c]);
      setCount(n => n + 1);
      setText('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar');
    } finally { setSending(false); }
  };

  const handleShow = () => { load(); setText(''); };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
      <KeyboardAvoidingView
        style={styles.modalSheet}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>💬 {count} comentario{count !== 1 ? 's' : ''}</Text>

        {loading ? (
          <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 24 }} />
        ) : (
          <ScrollView
            style={styles.commentsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 && (
              <Text style={styles.noComments}>Sin comentarios aún. ¡Sé el primero!</Text>
            )}
            {comments.map(c => (
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
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
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
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
              : <Text style={styles.sendIcon}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CarouselCard({ item, navigation, onReact, onOpenComments }: {
  item: Confession;
  navigation: any;
  onReact: (id: string, type: string) => void;
  onOpenComments: (item: Confession) => void;
}) {
  const reactionCounts = item.reactions.reduce((acc: Record<string, number>, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.aliasRow}
        onPress={() => navigation.navigate('UserProfile', { alias: item.user.alias })}
      >
        <View style={styles.aliasDot} />
        <Text style={styles.alias}>{item.user.alias}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </TouchableOpacity>

      <Text style={styles.confessionText}>{item.text}</Text>

      <View style={styles.actions}>
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
        <TouchableOpacity style={styles.commentBtn} onPress={() => onOpenComments(item)}>
          <Text style={styles.commentBtnText}>💬 {item._count.comments}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen({ navigation, route }: any) {
  const explore = route?.name === 'Explore';
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalConfession, setModalConfession] = useState<Confession | null>(null);
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.3)" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
        <Text style={styles.counter}>
          {confessions.length > 0 ? `${currentIndex + 1} / ${confessions.length}` : ''}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={confessions}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        onMomentumScrollEnd={e => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="rgba(255,255,255,0.3)"
          />
        }
        ListEmptyComponent={
          <View style={{ width: W, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <Text style={styles.empty}>
              {explore ? 'Aún no hay confesiones.' : 'Sigue a alguien para ver su feed.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CarouselCard
            item={item}
            navigation={navigation}
            onReact={handleReact}
            onOpenComments={setModalConfession}
          />
        )}
      />

      {/* Indicadores de posición */}
      {confessions.length > 1 && (
        <View style={styles.dots}>
          {confessions.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      <CommentsModal
        visible={modalConfession !== null}
        confession={modalConfession}
        onClose={() => setModalConfession(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: { fontSize: 24, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  counter: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 22 },

  // Carousel card
  card: {
    width: W,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aliasDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  alias: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  time: { color: 'rgba(255,255,255,0.2)', fontSize: 12, marginLeft: 'auto' },
  confessionText: {
    color: '#fff', fontSize: 20, lineHeight: 34, fontWeight: '300',
    letterSpacing: 0.2, flex: 1, textAlignVertical: 'center',
    paddingVertical: 32,
  },
  actions: { gap: 16 },
  reactionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20,
  },
  reactionEmoji: { fontSize: 14 },
  reactionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  reactionCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  commentBtn: { alignSelf: 'flex-start' },
  commentBtnText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: '#fff', width: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32, maxHeight: H * 0.75,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 },
  commentsList: { maxHeight: H * 0.45 },
  noComments: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  comment: { gap: 4, marginBottom: 14 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  commentAlias: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500' },
  commentTime: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
  replyBtn: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' },
  commentText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, paddingLeft: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 8,
  },
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
  sendBtnOff: { opacity: 0.2 },
  sendIcon: { color: '#080808', fontSize: 18 },
});
