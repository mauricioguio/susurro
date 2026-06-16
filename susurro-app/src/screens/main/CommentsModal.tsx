import { useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard,
  StyleSheet, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { confessionsApi } from '../../services/api';
import { Confession, timeAgo } from '../../components/ConfessionCard';

const { height: H } = Dimensions.get('window');

type Comment = { id: string; text: string; createdAt: string; user: { alias: string } };

export default function CommentsModal({ visible, confession, onClose }: {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => { load(); setText(''); }}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
      <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handle} />
        <Text style={styles.title}>💬 {count} comentario{count !== 1 ? 's' : ''}</Text>

        {loading ? (
          <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 24 }} />
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {comments.length === 0 && <Text style={styles.empty}>Sin comentarios aún. ¡Sé el primero!</Text>}
            {comments.map(c => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <View style={styles.dot} />
                  <Text style={styles.alias}>{c.user.alias}</Text>
                  <Text style={styles.time}>{timeAgo(c.createdAt)}</Text>
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32, maxHeight: H * 0.75,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  title: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 },
  list: { maxHeight: H * 0.45 },
  empty: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  comment: { gap: 4, marginBottom: 14 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  alias: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500' },
  time: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
  replyBtn: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' },
  commentText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, paddingLeft: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 8,
  },
  input: {
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 21, minHeight: 40, maxHeight: 100,
    textAlignVertical: 'top', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnOff: { opacity: 0.2 },
  sendIcon: { color: '#080808', fontSize: 18 },
});
