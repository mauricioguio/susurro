import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confessionsApi } from '../../services/api';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

interface TagInfo { tag: string; count: number; }

export default function ExploreScreen({ navigation }: any) {
  const [query, setQuery]           = useState('');
  const [tags, setTags]             = useState<TagInfo[]>([]);
  const [results, setResults]       = useState<Confession[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [searching, setSearching]   = useState(false);
  const [searched, setSearched]     = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTags = useCallback(async () => {
    try {
      const data = await confessionsApi.getTags();
      setTags(data);
    } catch {}
    finally { setLoadingTags(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadTags(); }, [loadTags]));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await confessionsApi.search(query.trim());
        setResults(data);
        setSearched(true);
      } catch {}
      finally { setSearching(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleTagPress = (tag: string) => {
    setQuery(tag);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const handleReact = async (id: string, type: string) => {
    try { await confessionsApi.react(id, type); } catch {}
  };

  const hasQuery = query.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
        <Text style={styles.subtitle}>Buscar</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Buscar confesiones o #etiqueta..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {hasQuery && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {!hasQuery ? (
        /* Tags state */
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={null}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>Etiquetas populares</Text>
              {loadingTags ? (
                <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 24 }} />
              ) : tags.length === 0 ? (
                <Text style={styles.emptyText}>Aún no hay etiquetas.</Text>
              ) : (
                <View style={styles.tagsGrid}>
                  {tags.map(({ tag, count }) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.tagChip}
                      onPress={() => handleTagPress(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                      <Text style={styles.tagCount}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          }
        />
      ) : (
        /* Results state */
        <FlatList
          data={results}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            searching ? (
              <View style={styles.searchingRow}>
                <ActivityIndicator color="rgba(255,255,255,0.3)" size="small" />
                <Text style={styles.searchingText}>Buscando...</Text>
              </View>
            ) : searched ? (
              <Text style={styles.resultsLabel}>
                {results.length === 0
                  ? 'Sin resultados'
                  : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            !searching && searched ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptyText}>No hay confesiones que contengan "{query}"</Text>
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo:     { fontSize: 24, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },

  searchRow: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 0 },

  tagsSection: { paddingHorizontal: 16, paddingTop: 8 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  tagText:  { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  tagCount: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },

  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  searchingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  resultsLabel: {
    color: 'rgba(255,255,255,0.25)', fontSize: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },

  list: { paddingBottom: 100, gap: 12, paddingHorizontal: 16, paddingTop: 4 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  emptyText:  { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
