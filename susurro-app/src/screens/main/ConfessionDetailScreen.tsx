import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView,
} from 'react-native';
import { confessionsApi } from '../../services/api';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

export default function ConfessionDetailScreen({ route, navigation }: any) {
  const { confessionId } = route.params as { confessionId: string };
  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(false);
    confessionsApi.getById(confessionId)
      .then(data => { if (active) { setConfession(data); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [confessionId]));

  const handleReact = async (id: string, type: string) => {
    try {
      await confessionsApi.react(id, type);
      const updated = await confessionsApi.getById(confessionId);
      setConfession(updated);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Confesión</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="rgba(255,255,255,0.3)" />
        </View>
      ) : error || !confession ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>🌫️</Text>
          <Text style={styles.errorText}>Esta confesión ya no existe o expiró.</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ConfessionCard
            item={confession}
            navigation={navigation}
            onReact={handleReact}
            onCommentOpen={() => {}}
            onBookmark={() => {}}
          />
        </ScrollView>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorIcon: { fontSize: 40 },
  errorText: { color: 'rgba(255,255,255,0.3)', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  goBackBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  goBackText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  content: { padding: 16, paddingBottom: 60 },
});
