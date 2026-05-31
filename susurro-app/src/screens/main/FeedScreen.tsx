import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const MOCK_FEED = [
  { id: '1', alias: 'luna_rota', text: 'A veces me pregunto si alguien me extrañaría si desaparezco un día. No de esa manera, solo... desaparecer.', time: '2h', reactions: { '🤍': 24, '🔥': 8 }, comments: 12 },
  { id: '2', alias: 'viento_frío', text: 'Le dije a todos que estoy bien. Llevo 3 meses sin estarlo. Es raro lo fácil que es mentir cuando la gente no quiere escuchar la verdad.', time: '5h', reactions: { '🤍': 61, '💫': 19 }, comments: 28 },
  { id: '3', alias: 'eco_perdido', text: 'Me enamoré de mi mejor amigo. Él no sabe. Lleva 2 años sin saber. Y yo sigo aquí.', time: '8h', reactions: { '🤍': 103, '🔥': 14, '💫': 31 }, comments: 45 },
];

export default function FeedScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>susurro</Text>
      </View>

      <FlatList
        data={MOCK_FEED}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Confession', { id: item.id })}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={styles.aliasRow}>
                <View style={styles.dot} />
                <Text style={styles.alias}>{item.alias}</Text>
              </View>
              <Text style={styles.time}>{item.time}</Text>
            </View>

            <Text style={styles.text}>{item.text}</Text>

            <View style={styles.cardBottom}>
              <View style={styles.reactions}>
                {Object.entries(item.reactions).map(([emoji, count]) => (
                  <TouchableOpacity key={emoji} style={styles.reaction}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.commentBtn}>
                <Text style={styles.commentText}>💬 {item.comments}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: { fontSize: 24, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
