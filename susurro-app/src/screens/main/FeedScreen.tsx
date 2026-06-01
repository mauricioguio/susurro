import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { confessionsApi } from '../../services/api';

type Reaction = { type: string };
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

const REACTION_TYPES = ['🤍', '🔥', '💫'];

export default function FeedScreen({ navigation, route }: any) {
  const explore = route?.name === 'Explore';
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = explore ? await confessionsApi.getExplore() : await confessionsApi.getFeed();
      setConfessions(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      </View>

      <FlatList
        data={confessions}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="rgba(255,255,255,0.3)"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no hay confesiones. ¡Sé el primero!</Text>
        }
        renderItem={({ item }) => {
          const reactionCounts = item.reactions.reduce((acc: Record<string, number>, r) => {
            acc[r.type] = (acc[r.type] || 0) + 1;
            return acc;
          }, {});

          return (
            <View style={styles.card}>
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

              <Text style={styles.text}>{item.text}</Text>

              <View style={styles.cardBottom}>
                <View style={styles.reactions}>
                  {REACTION_TYPES.map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reaction}
                      onPress={() => handleReact(item.id, emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {(reactionCounts[emoji] ?? 0) > 0 && (
                        <Text style={styles.reactionCount}>{reactionCounts[emoji]}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.commentBtn}
                  onPress={() => navigation.navigate('Comments', { confessionId: item.id, confessionText: item.text })}
                >
                  <Text style={styles.commentText}>💬 {item._count.comments}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
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
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: 60, fontSize: 14 },
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
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reactions: { flexDirection: 'row', gap: 8 },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
