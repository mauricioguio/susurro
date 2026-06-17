import { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🤫',
    title: 'susurro',
    subtitle: 'Confiesa lo que no puedes\ndecir en voz alta.',
    detail: 'Un espacio seguro para tus pensamientos más honestos.',
  },
  {
    emoji: '👤',
    title: 'Siempre anónimo',
    subtitle: 'Tu alias te protege.\nNadie sabe quién eres.',
    detail: 'Sin nombre real, sin foto, sin rastro. Solo tus palabras.',
  },
  {
    emoji: '🤍',
    title: 'La comunidad escucha',
    subtitle: 'Reacciona, comenta y conecta\nsin revelar tu identidad.',
    detail: 'Miles de personas compartiendo lo que nadie más se atreve a decir.',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    navigation.replace('Welcome');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={styles.container}>
      {/* Skip */}
      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Saltar</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [0.25, 1, 0.25],
            extrapolate: 'clamp',
          });
          const width = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [6, 20, 6],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { opacity, width }]} />
          );
        })}
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>
            {index === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },

  skip: {
    position: 'absolute', top: 52, right: 24, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  skipText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },

  slide: {
    width: W, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 16,
    paddingTop: 80,
  },
  emoji: { fontSize: 72, marginBottom: 8 },
  title: {
    fontSize: 36, fontWeight: '300', color: '#fff',
    letterSpacing: -0.5, fontStyle: 'italic', textAlign: 'center',
  },
  subtitle: {
    fontSize: 20, color: 'rgba(255,255,255,0.75)',
    lineHeight: 30, textAlign: 'center', fontWeight: '300',
  },
  detail: {
    fontSize: 14, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', lineHeight: 22, marginTop: 4,
  },

  dots: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, marginBottom: 24,
  },
  dot: { height: 6, borderRadius: 3, backgroundColor: '#fff' },

  footer: { paddingHorizontal: 28, paddingBottom: 48 },
  btn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#080808', fontSize: 15, fontWeight: '600' },
});
