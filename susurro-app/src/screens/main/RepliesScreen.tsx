import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

export default function RepliesScreen({ route, navigation }: any) {
  const { confessionId } = route.params as { confessionId: string };
  const [parent, setParent] = useState<Confession | null>(null);
  const [replies, setReplies] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await confessionsApi.getReplies(confessionId);
      setParent(data.parent);
      setReplies(data.replies);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [confessionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleReact = async (id: string, type: string) => {
    try { await confessionsApi.react(id, type); load(true); } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Susurros encadenados</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <FlatList
          data={replies}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="rgba(255,255,255,0.3)" />
          }
          ListHeaderComponent={
            parent ? (
              <View>
                {/* Confesión original */}
                <Text style={styles.sectionLabel}>Confesión original</Text>
                <ConfessionCard
                  item={parent}
                  navigation={navigation}
                  onReact={handleReact}
                  onCommentOpen={() => {}}
                  onBookmark={() => {}}
                />
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{replies.length} encadenado{replies.length !== 1 ? 's' : ''}</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔗</Text>
              <Text style={styles.empty}>Sin susurros encadenados aún.</Text>
              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => navigation.navigate('NewConfession', {
                  parentId: confessionId,
                  parentPreview: parent?.text,
                })}
              >
                <Text style={styles.replyBtnText}>Ser el primero en susurrar</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.replyWrapper}>
              <View style={styles.replyConnector} />
              <View style={styles.replyCard}>
                <ConfessionCard
                  item={item}
                  index={index}
                  navigation={navigation}
                  onReact={handleReact}
                  onCommentOpen={() => {}}
                  onBookmark={() => {}}
                />
              </View>
            </View>
          )}
          ListFooterComponent={
            replies.length > 0 ? (
              <TouchableOpacity
                style={styles.addReplyBtn}
                onPress={() => navigation.navigate('NewConfession', {
                  parentId: confessionId,
                  parentPreview: parent?.text,
                })}
              >
                <Text style={styles.addReplyText}>🔗 Agregar tu susurro a la cadena</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.6)', fontSize: 22 },
  title: { color: '#fff', fontSize: 15, fontWeight: '500' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 36 },
  empty: { color: 'rgba(255,255,255,0.3)', fontSize: 15 },

  list: { padding: 16, gap: 0, paddingBottom: 100 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerText: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },

  replyWrapper: { flexDirection: 'row', marginBottom: 12 },
  replyConnector: {
    width: 2, backgroundColor: 'rgba(150,200,255,0.15)',
    borderRadius: 1, marginLeft: 16, marginRight: 10, marginTop: 8,
  },
  replyCard: { flex: 1 },

  replyBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, marginTop: 4,
  },
  replyBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  addReplyBtn: {
    marginTop: 8, alignSelf: 'center',
    backgroundColor: 'rgba(150,200,255,0.08)', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(150,200,255,0.15)',
  },
  addReplyText: { color: 'rgba(150,200,255,0.7)', fontSize: 14 },
});
