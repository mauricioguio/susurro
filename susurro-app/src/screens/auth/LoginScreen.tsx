import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Props = { navigation: NativeStackNavigationProp<any> };

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      await login(data.token, { id: data.id, alias: data.alias });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Bienvenido de vuelta</Text>
      <Text style={styles.subtitle}>Tu identidad sigue siendo tuya.</Text>

      <View style={styles.form}>
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
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu contraseña"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, (!email.trim() || !password || loading) && styles.btnDisabled]}
        onPress={handleLogin}
        disabled={!email.trim() || !password || loading}
      >
        {loading ? <ActivityIndicator color="#080808" /> : <Text style={styles.btnText}>Iniciar sesión</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 48 },
  back: { marginBottom: 40 },
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
  btn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#080808', fontSize: 15, fontWeight: '600' },
  link: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  linkBold: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
