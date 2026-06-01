import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function RegisterScreen({ navigation }: Props) {
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);

  const canSubmit = alias.trim() && email.trim() && password.length >= 8;

  const handleRegister = async () => {
    if (!canSubmit) return;
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

  return (
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
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit || loading}
        >
          {loading ? <ActivityIndicator color="#080808" /> : <Text style={styles.btnText}>Crear cuenta</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  btn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#080808', fontSize: 15, fontWeight: '600' },
  loginLink: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  loginLinkBold: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
