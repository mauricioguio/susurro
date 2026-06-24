import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { usersApi, confessionsApi, api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { ConfessionCard, Confession } from '../../components/ConfessionCard';

export default function UserProfileScreen({ route, navigation }: any) {
  const { alias } = route.params;
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const currentUser = useAuthStore(s => s.user);
  const flatListRef = useRef<FlatList>(null);

  const isOwnProfile = currentUser?.alias === alias;

  useEffect(() => {
    const load = async () => {
      try {
        const [profile, confs] = await Promise.all([
          usersApi.getProfile(alias),
          confessionsApi.getByUser(alias),
        ]);
        setFollowing(profile.isFollowing ?? false);
        setConfessions(confs);
        if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
      } catch {
        Alert.alert('Error', 'No se pudo cargar el perfil');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [alias]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const result = await usersApi.follow(alias);
      setFollowing(result.following);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo seguir');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleReact = async (id: string, type: string) => {
    try {
      await confessionsApi.react(id, type);
      const confs = await confessionsApi.getByUser(alias);
      setConfessions(confs);
    } catch {}
  };

  const scrollToCard = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>
        {!isOwnProfile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={async () => {
                try {
                  const { data } = await api.post('/messages/conversations', { alias });
                  navigation.navigate('Chat', { conversationId: data.id, alias });
                } catch {}
              }}
            >
              <Text style={styles.msgBtnText}>Mensaje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading
                ? <ActivityIndicator color={following ? '#fff' : '#080808'} size="small" />
                : <Text style={[styles.followText, following && styles.followingText]}>
                    {following ? 'Siguiendo' : 'Seguir'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.aliasRow}>
        <View style={styles.avatarCircle}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            : <Text style={styles.avatarPlaceholder}>{alias?.[0]?.toUpperCase() ?? '?'}</Text>
          }
        </View>
        <Text style={styles.alias}>{alias}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginTop: 40 }} />
      ) : (
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
          ListEmptyComponent={<Text style={styles.empty}>Sin confesiones aún.</Text>}
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
  },
  back: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  followBtn: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, minWidth: 90, alignItems: 'center',
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  followText: { color: '#080808', fontSize: 14, fontWeight: '600' },
  followingText: { color: 'rgba(255,255,255,0.5)' },
  msgBtn: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(110,142,251,0.5)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignItems: 'center',
  },
  msgBtnText: { color: '#6e8efb', fontSize: 14, fontWeight: '600' },
  aliasRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '300' },
  alias: { fontSize: 22, fontWeight: '300', color: '#fff', fontStyle: 'italic', letterSpacing: -0.5 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', marginTop: 40, fontSize: 14 },
  list: { padding: 16, gap: 12 },
});
