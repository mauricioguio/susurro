import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Dimensions, TouchableOpacity, Alert, Share, Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { confessionsApi, notificationsApi } from '../../services/api';
import { Confession, REACTIONS, timeAgo, expiresIn, PollResult } from '../../components/ConfessionCard';
import CommentsModal from './CommentsModal';

const { width: W } = Dimensions.get('window');
type FeedMode = 'parati' | 'siguiendo';

// ── AudioPlayer ───────────────────────────────────────────────────────────────
function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(s => {
          if (s.isLoaded && s.didJustFinish) {
            setPlaying(false);
            soundRef.current?.unloadAsync();
            soundRef.current = null;
          }
        });
      }
      await soundRef.current.playAsync();
      setPlaying(true);
    } catch {
      Alert.alert('Error', 'No se pudo reproducir el audio');
    } finally { setLoading(false); }
  };

  return (
    <TouchableOpacity style={styles.audioPlayer} onPress={toggle} activeOpacity={0.7}>
      {loading
        ? <ActivityIndicator color="rgba(255,255,255,0.5)" />
        : <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
      }
      <View style={styles.audioBar}>
        <View style={[styles.audioFill, playing && { width: '60%' }]} />
      </View>
      <Ionicons name="mic-outline" size={14} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );
}

// ── PollSection ───────────────────────────────────────────────────────────────
function PollSection({ pollQuestion, pollResult: initialPollResult, confessionId }: {
  pollQuestion: string;
  pollResult: PollResult | null;
  confessionId: string;
}) {
  const [pollResult, setPollResult] = useState<PollResult | null>(initialPollResult);
  const [voting, setVoting] = useState(false);
  const total = (pollResult?.yes ?? 0) + (pollResult?.no ?? 0);
  const hasVoted = pollResult !== null && total > 0 && pollResult.userVote !== null;

  const vote = async (v: boolean) => {
    if (voting) return;
    setVoting(true);
    try {
      await confessionsApi.votePoll(confessionId, v);
      setPollResult(prev => {
        const base = prev ?? { yes: 0, no: 0, userVote: null };
        const wasYes = base.userVote === true;
        const wasNo  = base.userVote === false;
        const same   = base.userVote === v;
        return {
          yes: base.yes + (v && !wasYes ? 1 : 0) - (wasYes && (same || !v) ? 1 : 0),
          no:  base.no  + (!v && !wasNo  ? 1 : 0) - (wasNo  && (same || v) ? 1 : 0),
          userVote: same ? null : v,
        };
      });
    } catch {} finally { setVoting(false); }
  };

  const t = (pollResult?.yes ?? 0) + (pollResult?.no ?? 0);

  return (
    <View style={styles.poll}>
      <Text style={styles.pollQ}>📊 {pollQuestion}</Text>
      {!hasVoted && t === 0 ? (
        <View style={styles.pollBtns}>
          {[{ label: '✓ Sí', v: true }, { label: '✗ No', v: false }].map(({ label, v }) => (
            <TouchableOpacity
              key={label} disabled={voting}
              style={[styles.pollBtn, !v && styles.pollBtnNo]}
              onPress={() => vote(v)}
            >
              <Text style={[styles.pollBtnTxt, !v && styles.pollBtnTxtNo]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.pollBars}>
          {[
            { label: '✓ Sí', count: pollResult?.yes ?? 0, v: true },
            { label: '✗ No', count: pollResult?.no  ?? 0, v: false },
          ].map(({ label, count, v }) => {
            const pct    = t > 0 ? Math.round((count / t) * 100) : 0;
            const active = pollResult?.userVote === v;
            return (
              <TouchableOpacity key={label} style={styles.pollBarRow} onPress={() => vote(v)} disabled={voting}>
                <Text style={[styles.pollBarLabel, active && { color: '#fff' }]}>{label}</Text>
                <View style={styles.pollTrack}>
                  <View style={[styles.pollFill, { width: `${pct}%` as any }, active && { backgroundColor: '#fff' }]} />
                </View>
                <Text style={styles.pollPct}>{pct}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── TikTokCard ────────────────────────────────────────────────────────────────
function TikTokCard({ item, height, navigation, onReact, onOpenComments }: {
  item: Confession;
  height: number;
  navigation: any;
  onReact: (id: string, type: string) => void;
  onOpenComments: (item: Confession) => void;
}) {
  const [bookmarked, setBookmarked]         = useState(item.bookmarked);
  const [userReactions, setUserReactions]   = useState<string[]>(item.reactions.map(r => r.type));
  const [totalReactions, setTotalReactions] = useState(item._count.reactions);

  const reactionAnims = useRef<Record<string, Animated.Value>>(
    Object.fromEntries(REACTIONS.map(r => [r.type, new Animated.Value(1)])),
  ).current;

  const handleBookmark = async () => {
    try {
      const res = await confessionsApi.toggleBookmark(item.id);
      setBookmarked(res.bookmarked);
    } catch {}
  };

  const handleReact = async (type: string) => {
    const hasIt = userReactions.includes(type);

    if (!hasIt) {
      // Pop: escala arriba y rebota de regreso
      Animated.sequence([
        Animated.timing(reactionAnims[type], { toValue: 1.55, duration: 110, useNativeDriver: true }),
        Animated.spring(reactionAnims[type], { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 22 }),
      ]).start();
    } else {
      // Deflate: encoge y vuelve
      Animated.sequence([
        Animated.timing(reactionAnims[type], { toValue: 0.7, duration: 80, useNativeDriver: true }),
        Animated.timing(reactionAnims[type], { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }

    setUserReactions(prev => hasIt ? prev.filter(t => t !== type) : [...prev, type]);
    setTotalReactions(prev => hasIt ? Math.max(0, prev - 1) : prev + 1);
    try { await onReact(item.id, type); } catch {}
  };

  const handleReport = () => {
    Alert.alert(
      'Reportar confesión',
      '¿Por qué quieres reportar esto?',
      [
        { text: 'Contenido inapropiado', onPress: () => confessionsApi.report(item.id, 'inapropiado').catch(() => {}) },
        { text: 'Spam o engaño',         onPress: () => confessionsApi.report(item.id, 'spam').catch(() => {}) },
        { text: 'Acoso u odio',          onPress: () => confessionsApi.report(item.id, 'acoso').catch(() => {}) },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const handleShare = async () => {
    const lines: string[] = ['💬 Alguien en Susurro confiesa:'];
    if (item.audioUrl) lines.push('\n🎙️ [Confesión de voz]');
    else if (item.text) lines.push(`\n"${item.text}"`);
    if (item.tags?.length > 0) lines.push(`\n${item.tags.join('  ')}`);
    lines.push(`\n🔗 susurro://confession/${item.id}`);
    lines.push('\n— Susurro, confesiones anónimas 🤫');
    try { await Share.share({ message: lines.join('\n') }); } catch {}
  };

  return (
    <View style={[styles.card, { width: W, height }]}>

      {/* ── Content centered ── */}
      <View style={styles.contentArea}>
        {item.audioUrl
          ? <AudioPlayer audioUrl={item.audioUrl} />
          : <Text style={styles.confessionText}>{item.text}</Text>
        }
        {item.pollQuestion && (
          <PollSection
            pollQuestion={item.pollQuestion}
            pollResult={item.pollResult}
            confessionId={item.id}
          />
        )}
      </View>

      {/* ── Bottom-left info ── */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { alias: item.user.alias })}>
          <View style={styles.aliasRow}>
            <View style={styles.aliasDot} />
            <Text style={styles.alias}>{item.user.alias}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
        {item.expiresAt && <Text style={styles.expiry}>{expiresIn(item.expiresAt)}</Text>}
        {item.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map(t => <Text key={t} style={styles.tag}>{t}</Text>)}
          </View>
        )}
        {(item.replyCount ?? 0) > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Replies', { confessionId: item.id })}>
            <Text style={styles.chainLink}>↳ {item.replyCount} encadenadas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Right sidebar ── */}
      <View style={styles.sidebar}>
        {REACTIONS.map(({ type }) => {
          const active = userReactions.includes(type);
          return (
            <TouchableOpacity key={type} style={styles.sideAction} onPress={() => handleReact(type)} activeOpacity={0.8}>
              <Animated.View style={{ transform: [{ scale: reactionAnims[type] }] }}>
                <Text style={[styles.sideEmoji, !active && styles.sideEmojiDim]}>{type}</Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
        {totalReactions > 0 && (
          <Text style={styles.totalReactions}>{totalReactions}</Text>
        )}

        <View style={styles.sideSep} />

        <TouchableOpacity style={styles.sideAction} onPress={() => onOpenComments(item)}>
          <Ionicons name="chatbubble-outline" size={24} color="rgba(255,255,255,0.75)" />
          {item._count.comments > 0 && <Text style={styles.sideCount}>{item._count.comments}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={handleBookmark}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={bookmarked ? '#fff' : 'rgba(255,255,255,0.35)'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={handleShare}>
          <View style={styles.shareCircle}>
            <Ionicons name="arrow-redo" size={18} color="rgba(255,255,255,0.75)" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={handleReport}>
          <Ionicons name="flag-outline" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── FeedScreen ────────────────────────────────────────────────────────────────
export default function FeedScreen({ navigation }: any) {
  const [confessions, setConfessions]   = useState<Confession[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [mode, setMode]                 = useState<FeedMode>('parati');
  const [modalConfession, setModalConfession] = useState<Confession | null>(null);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [cardHeight, setCardHeight]     = useState(0);

  const flatListRef    = useRef<FlatList>(null);
  const pageRef        = useRef(1);
  const hasMoreRef     = useRef(true);
  const loadingMoreRef = useRef(false);
  const modeRef        = useRef<FeedMode>('parati');

  const fetchPage = useCallback(async (pageNum: number, currentMode: FeedMode, append: boolean) => {
    try {
      const data = currentMode === 'siguiendo'
        ? await confessionsApi.getFeed(pageNum)
        : await confessionsApi.getExplore(undefined, pageNum);
      if (append) {
        setConfessions(prev => [...prev, ...data]);
      } else {
        setConfessions(data);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
      const more = data.length === 20;
      hasMoreRef.current = more;
      pageRef.current    = pageNum;
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => {
    modeRef.current      = mode;
    hasMoreRef.current   = true;
    pageRef.current      = 1;
    setLoading(true);
    fetchPage(1, mode, false);
    notificationsApi.getUnreadCount().then(r => setUnreadCount(r.count)).catch(() => {});
  }, [mode, fetchPage]));

  const handleEndReached = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchPage(pageRef.current + 1, modeRef.current, true);
  }, [fetchPage]);

  const handleReact = async (id: string, type: string) => {
    try { await confessionsApi.react(id, type); } catch {}
  };

  const handleModeChange = (m: FeedMode) => {
    if (m === mode) return;
    setMode(m);
    modeRef.current = m;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.3)" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Floating header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.85)" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.modeTabs}>
          {(['parati', 'siguiendo'] as FeedMode[]).map(m => (
            <TouchableOpacity key={m} style={styles.modeTabBtn} onPress={() => handleModeChange(m)}>
              <Text style={[styles.modeTab, mode === m && styles.modeTabActive]}>
                {m === 'parati' ? 'Para ti' : 'Siguiendo'}
              </Text>
              {mode === m && <View style={styles.modeTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('NewConfession')}
          style={styles.composeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      {/* ── TikTok vertical feed ── */}
      <View
        style={{ flex: 1 }}
        onLayout={e => setCardHeight(e.nativeEvent.layout.height)}
      >
        {cardHeight > 0 && (
          <FlatList
            ref={flatListRef}
            data={confessions}
            keyExtractor={i => i.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            bounces={false}
            getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? (
              <View style={{ height: cardHeight, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <ActivityIndicator color="rgba(255,255,255,0.3)" />
                <Text style={styles.loadingMoreText}>Cargando más susurros…</Text>
              </View>
            ) : null}
            ListEmptyComponent={
              <View style={{ height: cardHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
                <Text style={styles.emptyIcon}>🤫</Text>
                <Text style={styles.empty}>
                  {mode === 'siguiendo'
                    ? 'Sigue a alguien para ver\nsus confesiones aquí.'
                    : 'Aún no hay confesiones.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TikTokCard
                item={item}
                height={cardHeight}
                navigation={navigation}
                onReact={handleReact}
                onOpenComments={setModalConfession}
              />
            )}
          />
        )}
      </View>

      <CommentsModal
        visible={modalConfession !== null}
        confession={modalConfession}
        onClose={() => setModalConfession(null)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10,
    backgroundColor: 'rgba(8,8,8,0.95)',
  },
  modeTabs: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  modeTabBtn: { alignItems: 'center', paddingBottom: 2 },
  modeTab: { color: 'rgba(255,255,255,0.35)', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  modeTabActive: { color: '#fff', fontWeight: '700' },
  modeTabUnderline: { marginTop: 4, width: '80%', height: 2, borderRadius: 1, backgroundColor: '#fff' },
  bellBtn: { position: 'relative', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 20 },
  composeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  composeIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#080808', fontSize: 9, fontWeight: '700' },

  // TikTok card
  card: {
    backgroundColor: '#080808',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },

  // Content (centered, leaves room for sidebar)
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingRight: 80,
    paddingVertical: 24,
  },
  confessionText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 36,
    fontWeight: '300',
    letterSpacing: 0.3,
  },

  // Bottom-left info
  bottomInfo: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingRight: 80,
    gap: 5,
  },
  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aliasDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  alias: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  cardTime: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  expiry: { color: 'rgba(255,200,100,0.55)', fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10,
  },
  chainLink: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },

  // Right sidebar
  sidebar: {
    position: 'absolute',
    right: 14,
    bottom: 32,
    alignItems: 'center',
    gap: 2,
  },
  sideAction: { alignItems: 'center', paddingVertical: 4, gap: 2 },
  sideEmoji: { fontSize: 24 },
  sideEmojiDim: { opacity: 0.3 },
  sideCount: { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' },
  totalReactions: { color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginTop: 2 },
  sideSep: { width: 22, height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  shareCircle: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Audio player
  audioPlayer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  audioIcon: { color: '#fff', fontSize: 22 },
  audioBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  audioFill: { width: '25%', height: '100%', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2 },
  audioLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },

  // Poll
  poll: {
    gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginTop: 20,
  },
  pollQ: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  pollBtns: { flexDirection: 'row', gap: 10 },
  pollBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(150,255,150,0.3)', backgroundColor: 'rgba(150,255,150,0.05)',
  },
  pollBtnNo: { borderColor: 'rgba(255,150,150,0.3)', backgroundColor: 'rgba(255,150,150,0.05)' },
  pollBtnTxt: { color: 'rgba(150,255,150,0.9)', fontSize: 14, fontWeight: '500' },
  pollBtnTxtNo: { color: 'rgba(255,150,150,0.9)' },
  pollBars: { gap: 8 },
  pollBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollBarLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 13, width: 36 },
  pollTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
  pollFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  pollPct: { color: 'rgba(255,255,255,0.4)', fontSize: 12, width: 34, textAlign: 'right' },

  // Empty / loading
  emptyIcon: { fontSize: 48, marginBottom: 16, textAlign: 'center' },
  empty: { color: 'rgba(255,255,255,0.22)', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  loadingMoreText: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
});
