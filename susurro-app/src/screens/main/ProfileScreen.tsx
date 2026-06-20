import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confessionsApi, usersApi } from '../../services/api';
import { MiniAudioPlayer } from '../../components/ConfessionCard';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';

type Confession = {
  id: string;
  text: string | null;
  audioUrl: string | null;
  createdAt: string;
  _count: { reactions: number; comments: number };
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ProfileScreen({ navigation }: any) {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [data, profile] = await Promise.all([
        confessionsApi.getByUser(user.alias),
        usersApi.getProfile(user.alias),
      ]);
      setConfessions(data);
      if (profile.avatarUrl) setAvatarUri(profile.avatarUrl);
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [deleteInput, setDeleteInput]       = useState('');
  const [deleting, setDeleting]             = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteInput !== user?.alias) return;
    setDeleting(true);
    try {
      await usersApi.deleteAccount();
      logout();
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo.');
      setDeleting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar confesión', '¿Seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await confessionsApi.delete(id);
            setConfessions(prev => prev.filter(c => c.id !== id));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la confesión.');
          }
        },
      },
    ]);
  };

  const uploadImage = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0].base64) return;
    const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploadingAvatar(true);
    try {
      await usersApi.updateAvatar(base64);
      setAvatarUri(base64);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickAvatar = () => {
    Alert.alert('Foto de perfil', '', [
      {
        text: '📷 Tomar foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true,
          });
          uploadImage(result);
        },
      },
      {
        text: '🖼 Elegir de galería',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true,
          });
          uploadImage(result);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.aliasTitle}>{user?.alias ?? ''}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarSection} onPress={handlePickAvatar} disabled={uploadingAvatar}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              : <Text style={styles.avatarPlaceholder}>{user?.alias?.[0]?.toUpperCase() ?? '?'}</Text>
            }
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            )}
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={10} color="#080808" />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{confessions.length}</Text>
          <Text style={styles.statLabel}>confesiones</Text>
        </View>
      </View>

      <View style={styles.privacyBadge}>
        <Text style={styles.privacyText}>🔒 Tu nombre y correo son completamente privados</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={confessions}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>Aún no tienes confesiones.</Text>
          }
          ListFooterComponent={
            <View style={styles.dangerZone}>
              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
                  <Text style={styles.legalText}>Términos de servicio</Text>
                </TouchableOpacity>
                <Text style={styles.legalSep}>·</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
                  <Text style={styles.legalText}>Privacidad</Text>
                </TouchableOpacity>
              </View>
              {!showDeleteZone ? (
                <TouchableOpacity
                  style={styles.dangerTrigger}
                  onPress={() => setShowDeleteZone(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={14} color="rgba(255,60,60,0.5)" />
                  <Text style={styles.dangerTriggerText}>Eliminar cuenta</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.dangerExpanded}>
                  <Ionicons name="warning-outline" size={20} color="rgba(255,60,60,0.6)" />
                  <Text style={styles.dangerTitle}>Zona de peligro</Text>
                  <Text style={styles.dangerDesc}>
                    Esta acción es irreversible. Se eliminarán tu cuenta, confesiones, comentarios y todos tus datos.
                  </Text>
                  <Text style={styles.dangerHint}>
                    Escribe <Text style={styles.dangerAlias}>{user?.alias}</Text> para confirmar
                  </Text>
                  <TextInput
                    style={[
                      styles.dangerInput,
                      deleteInput === user?.alias && styles.dangerInputActive,
                    ]}
                    value={deleteInput}
                    onChangeText={setDeleteInput}
                    placeholder={user?.alias ?? ''}
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.dangerButtons}>
                    <TouchableOpacity
                      style={styles.dangerCancel}
                      onPress={() => { setShowDeleteZone(false); setDeleteInput(''); }}
                    >
                      <Text style={styles.dangerCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dangerConfirm,
                        deleteInput !== user?.alias && styles.dangerConfirmDisabled,
                      ]}
                      onPress={handleDeleteAccount}
                      disabled={deleteInput !== user?.alias || deleting}
                    >
                      {deleting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.dangerConfirmText}>Eliminar cuenta</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.audioUrl
                ? <MiniAudioPlayer audioUrl={item.audioUrl} />
                : <Text style={styles.cardText}>{item.text}</Text>
              }
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>🤍 {item._count.reactions} · 💬 {item._count.comments}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  aliasTitle: { fontSize: 22, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  logoutBtn: { padding: 4 },
  logoutText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  avatarSection: { alignItems: 'center', paddingVertical: 16 },
  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { color: 'rgba(255,255,255,0.5)', fontSize: 26, fontWeight: '300' },
  avatarOverlay: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#080808',
  },
  editIcon: { fontSize: 11 },
  stats: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { color: '#fff', fontSize: 22, fontWeight: '600' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  privacyBadge: {
    margin: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  privacyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: 40, fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 12,
  },
  cardText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22 },
  audioLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  cardTime: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  deleteBtn: { fontSize: 16, opacity: 0.5 },

  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 8 },
  legalText: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  legalSep: { color: 'rgba(255,255,255,0.1)', fontSize: 12 },

  dangerZone: { marginTop: 24, marginHorizontal: 0, paddingBottom: 60 },
  dangerTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12,
  },
  dangerTriggerText: { color: 'rgba(255,60,60,0.4)', fontSize: 13 },

  dangerExpanded: {
    backgroundColor: 'rgba(255,40,40,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,60,60,0.15)',
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 12,
  },
  dangerTitle: { color: 'rgba(255,80,80,0.7)', fontSize: 15, fontWeight: '600' },
  dangerDesc: {
    color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20,
  },
  dangerHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  dangerAlias: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  dangerInput: {
    width: '100%', borderWidth: 1, borderColor: 'rgba(255,60,60,0.2)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dangerInputActive: { borderColor: 'rgba(255,80,80,0.5)' },

  dangerButtons: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  dangerCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  dangerCancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  dangerConfirm: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(200,0,0,0.7)',
  },
  dangerConfirmDisabled: { backgroundColor: 'rgba(150,0,0,0.25)' },
  dangerConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
