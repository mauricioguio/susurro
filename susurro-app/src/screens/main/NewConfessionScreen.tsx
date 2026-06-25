import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { confessionsApi, API_BASE } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { TAGS } from '../../components/ConfessionCard';

const MAX_CHARS = 500;
const MAX_RECORD_SECS = 60;
const { width: W } = Dimensions.get('window');

type InputMode = 'text' | 'voice';
type Expiry = null | '24h' | '7d' | '30d';

const EXPIRY_LABELS: Record<NonNullable<Expiry>, string> = {
  '24h': '24 horas',
  '7d':  '7 días',
  '30d': '30 días',
};

function expiryDate(e: NonNullable<Expiry>): string {
  const ms = e === '24h' ? 86400000 : e === '7d' ? 7 * 86400000 : 30 * 86400000;
  return new Date(Date.now() + ms).toISOString();
}

export default function NewConfessionScreen({ navigation, route }: any) {
  const parentId: string | undefined = route.params?.parentId;
  const parentPreview: string | undefined = route.params?.parentPreview;

  const [mode, setMode] = useState<InputMode>('text');
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<Expiry>(null);
  const [hasPoll, setHasPoll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const user = useAuthStore(s => s.user);

  // Voice
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meteringRef = useRef<number[]>([]);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pickedMime, setPickedMime] = useState('audio/m4a');
  const [pickedName, setPickedName] = useState('audio.m4a');

  useEffect(() => () => {
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    soundRef.current?.unloadAsync().catch(() => {});
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        android: { extension: '.m4a', outputFormat: 2 /* MPEG_4 */, audioEncoder: 3 /* AAC */, sampleRate: 16000, numberOfChannels: 1, bitRate: 16000 },
        ios: { extension: '.m4a', outputFormat: 'aac ' as any, audioQuality: 32 /* LOW */, sampleRate: 16000, numberOfChannels: 1, bitRate: 16000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
        web: { mimeType: 'audio/webm', bitsPerSecond: 16000 },
      });
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSecs(0);
      setAudioUri(null);
      meteringRef.current = [];
      meteringIntervalRef.current = setInterval(async () => {
        try {
          const status = await recordingRef.current?.getStatusAsync();
          if (status?.isRecording && status.metering !== undefined) {
            const normalized = Math.max(0, Math.min(1, (status.metering + 45) / 40));
            meteringRef.current.push(normalized);
          }
        } catch {}
      }, 200);
      timerRef.current = setInterval(() => {
        setRecordSecs(s => {
          if (s >= MAX_RECORD_SECS - 1) { stopRecording(); return MAX_RECORD_SECS; }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (meteringIntervalRef.current) { clearInterval(meteringIntervalRef.current); meteringIntervalRef.current = null; }
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri ?? null);
      setWaveform([...meteringRef.current]);
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
      if (asset.size && asset.size > MAX_BYTES) {
        Alert.alert('Archivo muy grande', 'El audio no puede superar los 50 MB.');
        return;
      }

      // Obtener duración real del archivo
      let durationSecs = 0;
      try {
        const { sound, status } = await Audio.Sound.createAsync({ uri: asset.uri }, { shouldPlay: false });
        if (status.isLoaded && status.durationMillis) {
          durationSecs = Math.round(status.durationMillis / 1000);
        }
        await sound.unloadAsync();
      } catch {}

      setAudioUri(asset.uri);
      setRecordSecs(durationSecs);
      setPickedMime(asset.mimeType ?? 'audio/m4a');
      setPickedName(asset.name ?? 'audio.m4a');
      // Waveform plana — no tenemos datos de metering del archivo
      setWaveform(Array.from({ length: 40 }, () => 0.3 + Math.random() * 0.4));
    } catch {
      Alert.alert('Error', 'No se pudo cargar el archivo de audio.');
    }
  };

  const playPreview = async () => {
    if (!audioUri) return;
    if (playing && soundRef.current) {
      await soundRef.current.stopAsync();
      setPlaying(false);
      return;
    }
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) setPlaying(false);
      });
      await sound.playAsync();
      setPlaying(true);
    } catch { Alert.alert('Error', 'No se pudo reproducir'); }
  };

  const handlePublish = async () => {
    const hasContent = mode === 'text' ? text.trim().length > 0 : audioUri !== null;
    if (!hasContent) return;
    setLoading(true);
    try {
      let audioUrl: string | undefined;
      if (mode === 'voice' && audioUri) {
        try {
          const { url } = await confessionsApi.uploadAudio(audioUri, pickedMime, pickedName);
          audioUrl = url;
        } catch (e: any) {
          Alert.alert('Error subiendo audio', e?.response?.data?.message ?? e?.message ?? 'upload failed');
          setLoading(false);
          return;
        }
      }
      await confessionsApi.create({
        text: mode === 'text' ? text.trim() : undefined,
        audioUrl,
        waveform: mode === 'voice' ? waveform : undefined,
        tags: selectedTags,
        expiresAt: expiry ? expiryDate(expiry) : undefined,
        pollQuestion: hasPoll ? '¿A alguien más le pasa?' : undefined,
        parentId,
      });
      navigation.navigate('Main', { screen: 'Feed' });
    } catch (e: any) {
      Alert.alert('Error creando confesión', e?.response?.data?.message ?? e?.message ?? 'create failed');
    } finally { setLoading(false); }
  };

  const canPublish = mode === 'text' ? text.trim().length > 0 : audioUri !== null;
  const remaining = MAX_CHARS - text.length;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{parentId ? 'Susurro encadenado' : 'Nueva confesión'}</Text>
        <TouchableOpacity
          style={[styles.publishBtn, (!canPublish || loading) && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={!canPublish || loading}
        >
          {loading ? <ActivityIndicator color="#080808" size="small" /> : <Text style={styles.publishText}>Publicar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Respondiendo a banner */}
        {parentId && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerLabel}>Respondiendo a una confesión anónima</Text>
            {parentPreview && (
              <Text style={styles.replyBannerPreview} numberOfLines={2}>"{parentPreview}"</Text>
            )}
          </View>
        )}

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          {(['text', 'voice'] as InputMode[]).map(m => (
            <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
              <Text style={[styles.modeTxt, mode === m && styles.modeTxtActive]}>
                {m === 'text' ? 'Texto' : 'Voz'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alias */}
        <View style={styles.aliasRow}>
          <View style={styles.dot} />
          <Text style={styles.alias}>{user?.alias ?? 'tú'}</Text>
          <View style={styles.anonBadge}>
            <Ionicons name="lock-closed-outline" size={10} color="rgba(255,255,255,0.4)" />
            <Text style={styles.anonText}> Anónimo</Text>
          </View>
        </View>

        {/* Input area */}
        {mode === 'text' ? (
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
        ) : (
          <View style={styles.voiceArea}>
            {!audioUri ? (
              <View style={styles.voiceCenter}>
                <TouchableOpacity
                  style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Ionicons name={isRecording ? 'stop' : 'mic-outline'} size={32} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.recordLabel}>
                  {isRecording ? `${recordSecs}s / ${MAX_RECORD_SECS}s` : 'Toca para grabar'}
                </Text>
                {isRecording && (
                  <View style={styles.recordingBar}>
                    <View style={[styles.recordingFill, { width: `${(recordSecs / MAX_RECORD_SECS) * 100}%` as any }]} />
                  </View>
                )}
                {!isRecording && (
                  <TouchableOpacity style={styles.uploadAudioBtn} onPress={pickAudio}>
                    <Ionicons name="folder-open-outline" size={16} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.uploadAudioTxt}>Cargar audio del celular</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.voicePreview}>
                <TouchableOpacity style={styles.playBtn} onPress={playPreview}>
                  <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#080808" />
                </TouchableOpacity>
                <View style={styles.previewBar}>
                  <View style={styles.previewFill} />
                </View>
                <Text style={styles.previewSecs}>{recordSecs}s</Text>
                <TouchableOpacity onPress={() => { setAudioUri(null); setRecordSecs(0); setPickedMime('audio/m4a'); setPickedName('audio.m4a'); }}>
                  <Text style={styles.reRecord}>Re-grabar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Etiquetas <Text style={styles.sectionHint}>(máx 3)</Text></Text>
          <View style={styles.tagsGrid}>
            {TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagTxt, selectedTags.includes(tag) && styles.tagTxtActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
            {/* Tags personalizados ya agregados */}
            {selectedTags.filter(t => !TAGS.includes(t)).map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagTxt, styles.tagTxtActive]}>{tag} ×</Text>
              </TouchableOpacity>
            ))}
            {/* Botón agregar tag custom */}
            {selectedTags.length < 3 && !showCustomInput && (
              <TouchableOpacity style={styles.tagChipAdd} onPress={() => setShowCustomInput(true)}>
                <Text style={styles.tagTxtAdd}>+ Otro</Text>
              </TouchableOpacity>
            )}
          </View>
          {showCustomInput && (
            <View style={styles.customTagRow}>
              <Text style={styles.hashSymbol}>#</Text>
              <TextInput
                style={styles.customTagInput}
                placeholder="tu etiqueta"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={customTag}
                onChangeText={v => setCustomTag(v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, ''))}
                autoFocus
                maxLength={20}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => {
                  const t = `#${customTag.trim()}`;
                  if (customTag.trim() && !selectedTags.includes(t) && selectedTags.length < 3) {
                    setSelectedTags(prev => [...prev, t]);
                  }
                  setCustomTag('');
                  setShowCustomInput(false);
                }}
              />
              <TouchableOpacity onPress={() => { setCustomTag(''); setShowCustomInput(false); }}>
                <Text style={styles.customTagCancel}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Expiry */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Expiración</Text>
          <View style={styles.expiryRow}>
            <TouchableOpacity style={[styles.expiryBtn, expiry === null && styles.expiryBtnActive]} onPress={() => setExpiry(null)}>
              <Text style={[styles.expiryTxt, expiry === null && styles.expiryTxtActive]}>Sin límite</Text>
            </TouchableOpacity>
            {(Object.keys(EXPIRY_LABELS) as NonNullable<Expiry>[]).map(e => (
              <TouchableOpacity key={e} style={[styles.expiryBtn, expiry === e && styles.expiryBtnActive]} onPress={() => setExpiry(e)}>
                <Text style={[styles.expiryTxt, expiry === e && styles.expiryTxtActive]}>{EXPIRY_LABELS[e]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Poll */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.pollToggle} onPress={() => setHasPoll(p => !p)}>
            <View style={[styles.toggle, hasPoll && styles.toggleActive]}>
              <View style={[styles.toggleThumb, hasPoll && styles.toggleThumbActive]} />
            </View>
            <View style={styles.pollInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="bar-chart-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.sectionLabel}>Encuesta anónima</Text>
              </View>
              <Text style={styles.pollHint}>Pregunta "¿A alguien más le pasa?" con Sí / No</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {mode === 'text' && (
        <View style={styles.footer}>
          <Text style={[styles.counter, remaining < 50 && styles.counterWarn]}>{remaining}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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

  body: { flex: 1, paddingHorizontal: 20 },

  modeRow: { flexDirection: 'row', gap: 8, paddingVertical: 16 },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  modeBtnActive: { backgroundColor: '#fff' },
  modeTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  modeTxtActive: { color: '#080808', fontWeight: '600' },

  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  alias: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  anonBadge: { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  anonText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  input: { color: '#fff', fontSize: 17, lineHeight: 28, textAlignVertical: 'top', minHeight: 140, marginBottom: 8 },

  // Voice
  voiceArea: { minHeight: 160, justifyContent: 'center', marginBottom: 8 },
  voiceCenter: { alignItems: 'center', gap: 14, paddingVertical: 24 },
  recordBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  recordBtnActive: { backgroundColor: 'rgba(255,80,80,0.2)', borderColor: 'rgba(255,80,80,0.6)' },
  recordIcon: { fontSize: 32 },
  recordLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  recordingBar: { width: W - 80, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  recordingFill: { height: '100%', backgroundColor: 'rgba(255,80,80,0.7)', borderRadius: 2 },
  voicePreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#080808', fontSize: 18 },
  previewBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  previewFill: { width: '30%', height: '100%', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 },
  previewSecs: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  reRecord: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecorationLine: 'underline' },
  uploadAudioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  uploadAudioTxt: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },

  // Sections
  section: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 12 },
  sectionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  sectionHint: { color: 'rgba(255,255,255,0.25)', fontWeight: '400' },

  // Tags
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tagChipActive: { backgroundColor: '#fff' },
  tagTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  tagTxtActive: { color: '#080808', fontWeight: '600' },
  tagChipAdd: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed',
  },
  tagTxtAdd: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  customTagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  hashSymbol: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  customTagInput: { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 0 },
  customTagCancel: { color: 'rgba(255,255,255,0.3)', fontSize: 16, paddingLeft: 4 },

  // Expiry
  expiryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expiryBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  expiryBtnActive: { backgroundColor: 'rgba(255,200,100,0.15)', borderColor: 'rgba(255,200,100,0.3)' },
  expiryTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  expiryTxtActive: { color: 'rgba(255,200,100,0.9)' },

  // Poll toggle
  pollToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 3 },
  toggleActive: { backgroundColor: '#fff' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  toggleThumbActive: { backgroundColor: '#080808', marginLeft: 18 },
  pollInfo: { flex: 1, gap: 3 },
  pollHint: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },

  replyBanner: {
    backgroundColor: 'rgba(150,200,255,0.07)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(150,200,255,0.15)', gap: 4, marginTop: 12, marginBottom: 4,
  },
  replyBannerLabel: { color: 'rgba(150,200,255,0.7)', fontSize: 12, fontWeight: '600' },
  replyBannerPreview: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 32 },
  counter: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
  counterWarn: { color: '#f87171' },
});
