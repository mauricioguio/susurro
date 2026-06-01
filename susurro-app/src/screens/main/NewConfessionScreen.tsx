import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { confessionsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const MAX_CHARS = 500;

export default function NewConfessionScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useAuthStore(s => s.user);
  const remaining = MAX_CHARS - text.length;

  const handlePublish = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await confessionsApi.create(text.trim());
      navigation.navigate('Main', { screen: 'Explore' });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo publicar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nueva confesión</Text>
        <TouchableOpacity
          style={[styles.publishBtn, (!text.trim() || loading) && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={!text.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color="#080808" size="small" />
            : <Text style={styles.publishText}>Publicar</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.aliasRow}>
          <View style={styles.dot} />
          <Text style={styles.alias}>{user?.alias ?? 'tú'}</Text>
          <View style={styles.anonBadge}>
            <Text style={styles.anonText}>🔒 Anónimo</Text>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="¿Qué llevas cargando que no has podido decir?..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          multiline
          maxLength={MAX_CHARS}
          value={text}
          onChangeText={setText}
          autoFocus
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.counter, remaining < 50 && styles.counterWarn]}>{remaining}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  cancel: { color: 'rgba(255,255,255,0.4)', fontSize: 15 },
  title: { color: '#fff', fontSize: 15, fontWeight: '500' },
  publishBtn: { backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  publishBtnDisabled: { opacity: 0.3 },
  publishText: { color: '#080808', fontSize: 14, fontWeight: '600' },
  body: { flex: 1, padding: 20, gap: 16 },
  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  alias: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  anonBadge: { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  anonText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  input: { flex: 1, color: '#fff', fontSize: 17, lineHeight: 28, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 32 },
  counter: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
  counterWarn: { color: '#f87171' },
});
