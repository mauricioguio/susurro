import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Props = { navigation: NativeStackNavigationProp<any> };

const LEGAL_TEXT = `TÉRMINOS DE SERVICIO

1. ACEPTACIÓN
Al usar Susurro aceptas estos términos. Si no los aceptas, no uses la app.

2. CONTENIDO PROHIBIDO
Queda estrictamente prohibido publicar:
• Contenido sexual que involucre menores de edad
• Amenazas o incitación a la violencia contra personas reales
• Información personal de terceros sin su consentimiento (doxing)
• Contenido que viole leyes locales o internacionales
• Acoso, bullying o persecución hacia personas identificables

3. MODERACIÓN
Las confesiones con 5 o más reportes se ocultan automáticamente. Nos reservamos el derecho de eliminar cualquier contenido sin previo aviso.

4. ANONIMATO
Tu alias es público. Tu correo electrónico nunca se comparte con otros usuarios. Podemos estar obligados a compartir información con autoridades ante requerimientos legales válidos.

5. LIMITACIÓN DE RESPONSABILIDAD
Susurro no se hace responsable por el contenido publicado por usuarios. El uso de la plataforma es bajo tu propio riesgo.

──────────────────────────

POLÍTICA DE PRIVACIDAD

1. INFORMACIÓN QUE RECOPILAMOS
• Correo electrónico (solo para autenticación)
• Alias elegido por ti (público)
• Contenido que publicas
• Token de notificaciones push

2. LO QUE NO RECOPILAMOS
• Tu nombre real
• Número de teléfono
• Ubicación geográfica
• Contactos del dispositivo

3. CÓMO USAMOS TU INFORMACIÓN
Tu correo solo se usa para login y recuperación de contraseña. Nunca se muestra a otros usuarios.

4. COMPARTIR CON TERCEROS
No vendemos tu información. Solo podemos compartirla con autoridades legales ante requerimientos judiciales válidos.

5. ELIMINACIÓN DE DATOS
Al eliminar tu cuenta, todos tus datos se borran permanentemente de nuestra base de datos.

6. MENORES DE EDAD
Susurro no está dirigido a menores de 13 años.

7. CONTACTO
legal@susurro.app`;

export default function RegisterScreen({ navigation }: Props) {
  const [alias, setAlias]       = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const login = useAuthStore(s => s.login);

  const formValid = alias.trim() && email.trim() && password.length >= 8;

  const handleSubmit = () => {
    if (!formValid) return;
    setScrolledToBottom(false);
    setShowTerms(true);
  };

  const handleAccept = async () => {
    setShowTerms(false);
    setLoading(true);
    try {
      const data = await authApi.register({ alias: alias.trim(), email: email.trim(), password });
      await login(data.token, { id: data.id, alias: data.alias });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 32;
    if (isAtBottom) setScrolledToBottom(true);
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crea tu perfil</Text>
          <Text style={styles.subtitle}>Tu identidad real nunca será visible.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Tu alias público</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: sombra_azul, viento_frío..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={alias}
                onChangeText={setAlias}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Este es el único dato que verán los demás.</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Privado. Solo para recuperar tu cuenta.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, (!formValid || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!formValid || loading}
          >
            {loading
              ? <ActivityIndicator color="#080808" />
              : <Text style={styles.btnText}>Crear cuenta</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms modal */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Términos y privacidad</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {!scrolledToBottom && (
              <View style={styles.scrollHint}>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.3)" />
                <Text style={styles.scrollHintText}>Lee hasta el final para aceptar</Text>
              </View>
            )}

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.legalText}>{LEGAL_TEXT}</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.acceptBtn, !scrolledToBottom && styles.acceptBtnDisabled]}
                onPress={handleAccept}
                disabled={!scrolledToBottom}
              >
                <Text style={styles.acceptBtnText}>
                  {scrolledToBottom ? 'Acepto y crear cuenta' : 'Lee los términos completos ↑'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  back: { marginBottom: 32 },
  backText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  title: { fontSize: 30, fontWeight: '300', color: '#fff', letterSpacing: -0.5, fontStyle: 'italic' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 8, marginBottom: 36 },
  form: { gap: 20, marginBottom: 28 },
  field: { gap: 6 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  btn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#080808', fontSize: 15, fontWeight: '600' },
  loginLink: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  loginLinkBold: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '85%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  scrollHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  scrollHintText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 20, paddingBottom: 8 },
  legalText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 22 },
  modalFooter: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  acceptBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  acceptBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  acceptBtnText: { color: '#080808', fontSize: 15, fontWeight: '600' },
});
