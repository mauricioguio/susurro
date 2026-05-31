import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const MOCK_CONFESSIONS = [
  { id: '1', text: 'Hay días que finjo estar bien solo para no preocupar a los que quiero.', time: '1d', reactions: 34, comments: 9 },
  { id: '2', text: 'Le perdoné algo que nunca debí perdonar. Y lo sigo haciendo todos los días.', time: '3d', reactions: 78, comments: 22 },
];

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.aliasTitle}>tu_alias</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>2</Text>
          <Text style={styles.statLabel}>confesiones</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNumber}>14</Text>
          <Text style={styles.statLabel}>siguiendo</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNumber}>31</Text>
          <Text style={styles.statLabel}>seguidores</Text>
        </View>
      </View>

      <View style={styles.privacyBadge}>
        <Text style={styles.privacyText}>🔒 Tu nombre y correo son completamente privados</Text>
      </View>

      <FlatList
        data={MOCK_CONFESSIONS}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardText}>{item.text}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>🤍 {item.reactions} · 💬 {item.comments}</Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  aliasTitle: { fontSize: 22, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 20 },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { color: '#fff', fontSize: 22, fontWeight: '600' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  privacyBadge: {
    margin: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  privacyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },
  cardText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  cardTime: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
});
