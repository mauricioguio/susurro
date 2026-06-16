import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

const TAG_COLORS = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#DB2777', '#0891B2', '#65A30D'];

interface TagInfo { tag: string; count: number; }

export default function ExploreScreen({ navigation }: any) {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingConf, setLoadingConf] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const loadTags = useCallback(async () => {
    try {
      const data = await confessionsApi.getTags();
      setTags(data);
    } catch {}
    finally { setLoadingTags(false); }
  }, []);

  const loadConfessions = useCallback(async (tag: string) => {
    setLoadingConf(true);
    try {
      const data = await confessionsApi.getExplore(tag);
      setConfessions(data);
    } catch {}
    finally { setLoadingConf(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadTags(); }, [loadTags]));

  const selectTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
      setConfessions([]);
    } else {
      setSelectedTag(tag);
      loadConfessions(tag);
    }
    flatRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTags();
    if (selectedTag) await loadConfessions(selectedTag);
    setRefreshing(false);
  };

  const handleReact = async (id: string, type: string) => {
    try {
      await confessionsApi.react(id, type);
      if (selectedTag) loadConfessions(selectedTag);
    } catch {}
  };

  const filteredTags = search
    ? tags.filter(t => t.tag.toLowerCase().includes(search.toLowerCase()))
    : tags;

  const Header = (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar tag..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.sectionTitle}>Tags populares</Text>

      {loadingTags ? (
        <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginVertical: 24 }} />
      ) : filteredTags.length === 0 ? (
        <Text style={styles.noTags}>No hay tags aún. ¡Publica una confesión con tags!</Text>
      ) : (
        <View style={styles.tagsGrid}>
          {filteredTags.map(({ tag, count }, idx) => {
            const color = TAG_COLORS[idx % TAG_COLORS.length];
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagChip,
                  { borderColor: color, backgroundColor: isSelected ? color : 'rgba(255,255,255,0.03)' },
                ]}
                onPress={() => selectTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagHash, { color: isSelected ? 'rgba(255,255,255,0.7)' : color }]}>#</Text>
                <Text style={[styles.tagText, { color: isSelected ? '#fff' : color }]}>{tag}</Text>
                <View style={[styles.tagBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)' }]}>
                  <Text style={styles.tagCount}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedTag && (
        <View style={styles.selectedHeader}>
          <Text style={styles.selectedTitle}>#{selectedTag}</Text>
          {loadingConf && <ActivityIndicator color="rgba(255,255,255,0.4)" size="small" />}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
        <Text style={styles.subtitle}>Explorar</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={selectedTag && !loadingConf ? confessions : []}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="rgba(255,255,255,0.3)" />
        }
        ListHeaderComponent={Header}
        ListEmptyComponent={
          selectedTag && !loadingConf ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No hay confesiones con #{selectedTag} aún.</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <ConfessionCard
            item={item}
            index={index}
            navigation={navigation}
            onReact={handleReact}
            onCommentOpen={() => {}}
            onBookmark={() => {}}
          />
        )}
      />
    </View>
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

  searchRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  sectionTitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  noTags: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagHash: { fontSize: 13, fontWeight: '700' },
  tagText: { fontSize: 14, fontWeight: '600', marginRight: 4 },
  tagBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagCount: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },

  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    marginTop: 8,
  },
  selectedTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  list: { paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 32, gap: 10 },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
