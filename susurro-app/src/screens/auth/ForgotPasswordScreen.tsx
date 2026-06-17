import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { authApi } from '../../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep]           = useState<'email' | 'code'>('email');
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading]     = useState(false);

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('code');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el código. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (!code.trim() || !newPassword) return;
    if (newPassword.length < 6) {
      Alert.alert('Contraseña muy corta', 'Mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('¡Listo!', 'Tu contraseña fue cambiada.', [
        { text: 'Iniciar sesión', onPress: () => navigation.replace('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Código incorrecto o expirado.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      {step === 'email' ? (
        <>
          <Text style={styles.title}>¿Olvidaste tu{'\n'}contraseña?</Text>
          <Text style={styles.subtitle}>Te enviaremos un código de 6 dígitos a tu correo.</Text>

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
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
            onPress={sendCode}
            disabled={!email.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#080808" />
              : <Text style={styles.btnText}>Enviar código</Text>
            }
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Revisa tu{'\n'}correo</Text>
          <Text style={styles.subtitle}>Ingresa el código que enviamos a {email}</Text>

          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.label}>Código de 6 dígitos</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, (code.length < 6 || !newPassword || loading) && styles.btnDisabled]}
            onPress={resetPassword}
            disabled={code.length < 6 || !newPassword || loading}
          >
            {loading
              ? <ActivityIndicator color="#080808" />
              : <Text style={styles.btnText}>Cambiar contraseña</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={sendCode} disabled={loading}>
            <Text style={styles.resend}>¿No llegó? Reenviar código</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  back: { marginBottom: 40 },
  backText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  title: { fontSize: 30, fontWeight: '300', color: '#fff', letterSpacing: -0.5, fontStyle: 'italic', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 36, lineHeight: 22 },
  fields: { gap: 20, marginBottom: 28 },
  field: { gap: 6, marginBottom: 20 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '600' },
  btn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#080808', fontSize: 15, fontWeight: '600' },
  resend: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 4 },
});
