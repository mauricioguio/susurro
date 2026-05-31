import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { height } = Dimensions.get('window');

type Props = { navigation: NativeStackNavigationProp<any> };

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.logo}>susurro</Text>
        <Text style={styles.tagline}>Comparte lo que no puedes decir en voz alta.</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnSecondaryText}>Ya tengo cuenta</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Al continuar aceptas que tu identidad real nunca será visible para otros usuarios.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    fontSize: 52,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: -1,
    fontStyle: 'italic',
  },
  tagline: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 26,
    maxWidth: 260,
  },
  bottom: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#080808',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnSecondaryText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '500',
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
  },
});
