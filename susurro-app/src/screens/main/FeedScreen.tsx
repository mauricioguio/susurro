import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
});
