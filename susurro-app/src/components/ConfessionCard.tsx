import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, Keyboard, Share,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { confessionsApi } from '../services/api';

export type PollResult = { yes: number; no: number; userVote: boolean | null };

export type Reaction = { type: string };

export type Confession = {
  id: string;
  text: string | null;
  audioUrl: string | null;
  tags: string[];
  expiresAt: string | null;
  pollQuestion: string | null;
  bookmarked: boolean;
  pollResult: PollResult | null;
  replyCount: number;
  parentId: string | null;
  createdAt: string;
  user: { alias: string };
  _count: { reactions: number; comments: number; replies: number };
  reactions: Reaction[];
};

export type Comment = { id: string; text: string; createdAt: string; user: { alias: string } };

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function expiresIn(dateStr: string): string | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.ceil(diff / 3600000);
  if (hours <= 24) return '⏱ hoy';
  return `⏱ ${Math.ceil(diff / 86400000)}d`;
}

export const REACTIONS = [
  { type: '🤍', label: 'Te entiendo' },
  { type: '😈', label: 'Diablito'    },
  { type: '🔥', label: 'Intenso'     },
  { type: '😭', label: 'Me lloré'    },
  { type: '💀', label: 'Me mataste'  },
];

export const TAGS = ['#amor', '#trabajo', '#familia', '#amistad', '#vida', '#secreto', '#miedo', '#felicidad'];

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function MiniAudioPlayer({ audioUrl }: { audioUrl: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = async () => {
    if (loading) return;
    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false },
          (s) => {
            if (!s.isLoaded) return;
            setPosition(s.positionMillis ?? 0);
            setDuration(s.durationMillis ?? 0);
            if (s.didJustFinish) {
              setPlaying(false);
              setPosition(0);
              soundRef.current?.unloadAsync();
              soundRef.current = null;
            }
          },
          true,
        );
        soundRef.current = sound;
        const status = await sound.getStatusAsync();
        if (status.isLoaded) setDuration(status.durationMillis ?? 0);
      }
      await soundRef.current.playAsync();
      setPlaying(true);
    } catch (e: any) {
      Alert.alert('Error de audio', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <TouchableOpacity style={audioStyles.player} onPress={toggle} activeOpacity={0.7}>
      {loading
        ? <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
        : <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#fff" />
      }
      <View style={audioStyles.barWrap}>
        <View style={audioStyles.bar}>
          <View style={[audioStyles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={audioStyles.times}>
          <Text style={audioStyles.timeText}>{fmtTime(position)}</Text>
          <Text style={audioStyles.timeText}>{duration > 0 ? fmtTime(duration) : '--:--'}</Text>
        </View>
      </View>
      <Ionicons name="mic-outline" size={14} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );
}

const audioStyles = StyleSheet.create({
  player: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  barWrap: { flex: 1, gap: 4 },
  bar: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  label: { fontSize: 14 },
});

export function ConfessionCard({ item, index = 0, navigation, onReact, onCommentOpen, onBookmark }: {
  item: Confession;
  index?: number;
  navigation: any;
  onReact: (id: string, type: string) => void;
  onCommentOpen?: (index: number) => void;
  onBookmark?: (id: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentCount, setCommentCount] = useState(item._count.comments);
  const [bookmarked, setBookmarked] = useState(item.bookmarked);
  const [pollResult, setPollResult] = useState<PollResult | null>(item.pollResult);
  const [votingPoll, setVotingPoll] = useState(false);

  const reactionCounts = item.reactions.reduce((acc: Record<string, number>, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const shareConfession = async () => {
    const url = `https://susurro-production.up.railway.app/c/${item.id}`;
    const lines: string[] = [];
    if (item.audioUrl) {
      lines.push('🎙️ Escucha esta confesión anónima en Susurro');
    } else if (item.text) {
      const preview = item.text.length > 100 ? item.text.slice(0, 97) + '…' : item.text;
      lines.push(`"${preview}"`);
    }
    lines.push(url);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {}
  };

  const toggleBookmark = async () => {
    try {
      const res = await confessionsApi.toggleBookmark(item.id);
      setBookmarked(res.bookmarked);
      onBookmark?.(item.id);
    } catch {}
  };

  const handlePollVote = async (vote: boolean) => {
    if (votingPoll) return;
    setVotingPoll(true);
    try {
      await confessionsApi.votePoll(item.id, vote);
      setPollResult(prev => {
        if (!prev) return { yes: vote ? 1 : 0, no: vote ? 0 : 1, userVote: vote };
        const wasYes = prev.userVote === true;
        const wasNo = prev.userVote === false;
        const sameVote = prev.userVote === vote;
        return {
          yes: prev.yes + (vote && !wasYes ? 1 : 0) - (vote && sameVote ? 1 : wasYes && !vote ? 1 : 0),
          no: prev.no + (!vote && !wasNo ? 1 : 0) - (!vote && sameVote ? 1 : wasNo && vote ? 1 : 0),
          userVote: sameVote ? null : vote,
        };
      });
    } catch {}
    finally { setVotingPoll(false); }
  };

  const toggleComments = async () => {
    if (commentsOpen) { setCommentsOpen(false); setInputOpen(false); Keyboard.dismiss(); return; }
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
    } finally { setSending(false); }
  };

  const totalPoll = (pollResult?.yes ?? 0) + (pollResult?.no ?? 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardTop}>
        <TouchableOpacity style={styles.aliasRow} onPress={() => navigation.navigate('UserProfile', { alias: item.user.alias })}>
          <View style={styles.dot} />
          <Text style={styles.alias}>{item.user.alias}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </TouchableOpacity>
        <View style={styles.badges}>
          {item.expiresAt && <Text style={styles.expiry}>{expiresIn(item.expiresAt)}</Text>}
          <TouchableOpacity onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? '#fff' : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tags */}
      {item.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map(t => <Text key={t} style={styles.tag}>{t}</Text>)}
        </View>
      )}

      {/* Content */}
      {item.audioUrl
        ? <MiniAudioPlayer audioUrl={item.audioUrl} />
        : <Text style={styles.text}>{item.text}</Text>
      }

      {/* Poll */}
      {item.pollQuestion && (
        <View style={styles.poll}>
          <Text style={styles.pollQ}>📊 {item.pollQuestion}</Text>
          {pollResult === null || totalPoll === 0 ? (
            <View style={styles.pollBtns}>
              <TouchableOpacity style={styles.pollBtn} onPress={() => handlePollVote(true)} disabled={votingPoll}>
                <Text style={styles.pollBtnText}>✓ Sí</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pollBtn, { borderColor: 'rgba(255,100,100,0.3)' }]} onPress={() => handlePollVote(false)} disabled={votingPoll}>
                <Text style={[styles.pollBtnText, { color: 'rgba(255,150,150,0.8)' }]}>✗ No</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pollResults}>
              {[{ label: '✓ Sí', count: pollResult.yes, active: pollResult.userVote === true, vote: true },
                { label: '✗ No', count: pollResult.no, active: pollResult.userVote === false, vote: false }]
                .map(({ label, count, active, vote }) => {
                  const pct = totalPoll > 0 ? Math.round((count / totalPoll) * 100) : 0;
                  return (
                    <TouchableOpacity key={label} style={styles.pollRow} onPress={() => handlePollVote(vote)} disabled={votingPoll}>
                      <Text style={[styles.pollRowLabel, active && styles.pollRowLabelActive]}>{label}</Text>
                      <View style={styles.pollBarBg}>
                        <View style={[styles.pollBarFill, { width: `${pct}%` as any }, active && styles.pollBarActive]} />
                      </View>
                      <Text style={styles.pollPct}>{pct}%</Text>
                    </TouchableOpacity>
                  );
                })
              }
            </View>
          )}
        </View>
      )}

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {REACTIONS.map(({ type, label }) => (
          <TouchableOpacity key={type} style={styles.reaction} onPress={() => onReact(item.id, type)}>
            <Text style={styles.reactionEmoji}>{type}</Text>
            <Text style={styles.reactionLabel}>{label}</Text>
            {(reactionCounts[type] ?? 0) > 0 && <Text style={styles.reactionCount}>{reactionCounts[type]}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.commentBtn} onPress={toggleComments}>
          <Ionicons name="chatbubble-outline" size={14} color="rgba(255,255,255,0.3)" />
          <Text style={styles.commentBtnText}> {commentCount} {commentsOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chainBtn}
          onPress={() => navigation.navigate('NewConfession', { parentId: item.id, parentPreview: item.text })}
        >
          <Ionicons name="link-outline" size={13} color="rgba(255,255,255,0.35)" />
          <Text style={styles.chainBtnText}> susurrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chainBtn} onPress={shareConfession}>
          <Ionicons name="arrow-redo-outline" size={13} color="rgba(255,255,255,0.35)" />
          <Text style={styles.chainBtnText}> compartir</Text>
        </TouchableOpacity>
        {item.replyCount > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Replies', { confessionId: item.id })}>
            <Text style={styles.repliesLink}>↳ {item.replyCount} encadenado{item.replyCount !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        )}
      </View>

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
                  <TouchableOpacity onPress={() => openInput(`@${c.user.alias} `)}>
                    <Text style={styles.replyBtn}>Responder</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          )}
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
                {sending ? <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" /> : <Ionicons name="arrow-forward" size={18} color="#080808" />}
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
  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  alias: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  time: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiry: { color: 'rgba(255,200,100,0.6)', fontSize: 11 },
  bookmark: { fontSize: 16, opacity: 0.4 },
  bookmarkActive: { opacity: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  text: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 24 },
  poll: { gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  pollQ: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  pollBtns: { flexDirection: 'row', gap: 8 },
  pollBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(150,255,150,0.3)',
  },
  pollBtnText: { color: 'rgba(150,255,150,0.8)', fontSize: 13, fontWeight: '500' },
  pollResults: { gap: 8 },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollRowLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12, width: 32 },
  pollRowLabelActive: { color: '#fff' },
  pollBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
  pollBarFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  pollBarActive: { backgroundColor: '#fff' },
  pollPct: { color: 'rgba(255,255,255,0.4)', fontSize: 11, width: 30, textAlign: 'right' },
  reactionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  reactionEmoji: { fontSize: 13 },
  reactionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  reactionCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  commentBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  commentBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  chainBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chainBtnText: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  repliesLink: { color: 'rgba(150,200,255,0.6)', fontSize: 12 },
  commentsSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12, gap: 10 },
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
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 21, minHeight: 40, maxHeight: 100,
    textAlignVertical: 'top', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { opacity: 0.2 },
  sendIcon: { color: '#080808', fontSize: 18 },
});
