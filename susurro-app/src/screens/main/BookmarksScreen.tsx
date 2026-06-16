import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

export default function BookmarksScreen({ navigation }: any) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await confessionsApi.getBookmarks();
      setConfessions(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const handleReact = async (id: string, type: string) => {
    try { await confessionsApi.react(id, type); load(true); } catch {}
  };

  const handleBookmarkRemoved = (id: string) => {
    setConfessions(prev => prev.filter(c => c.id !== id));
  };

  const scrollToCard = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
        <Text style={styles.subtitle}>Guardados</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={confessions}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollToIndexFailed={() => {}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="rgba(255,255,255,0.3)" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔖</Text>
              <Text style={styles.empty}>No tienes confesiones guardadas aún.</Text>
              <Text style={styles.emptySub}>Toca 🏷️ en cualquier confesión para guardarla.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ConfessionCard
              item={item}
              index={index}
              navigation={navigation}
              onReact={handleReact}
              onCommentOpen={scrollToCard}
              onBookmark={(id) => handleBookmarkRemoved(id)}
            />
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: { fontSize: 24, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 36 },
  empty: { color: 'rgba(255,255,255,0.3)', fontSize: 15, textAlign: 'center' },
  emptySub: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  list: { padding: 16, gap: 12 },
});
