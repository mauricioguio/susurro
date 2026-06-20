import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TERMS = `TÉRMINOS DE SERVICIO — SUSURRO

Última actualización: junio 2026

1. ACEPTACIÓN
Al usar Susurro aceptas estos términos. Si no los aceptas, no uses la app.

2. DESCRIPCIÓN DEL SERVICIO
Susurro es una plataforma de confesiones anónimas. Puedes publicar texto, audio y etiquetas de forma anónima bajo un alias.

3. CONTENIDO PROHIBIDO
Queda estrictamente prohibido publicar:
• Contenido sexual que involucre menores de edad (CSAM)
• Amenazas o incitación a la violencia contra personas reales
• Información personal de terceros sin su consentimiento (doxing)
• Contenido que viole leyes locales o internacionales
• Acoso, bullying o persecución hacia personas identificables

4. MODERACIÓN
Susurro usa sistemas automáticos y reportes de usuarios para detectar contenido prohibido. Las confesiones con 5 o más reportes se ocultan automáticamente. Nos reservamos el derecho de eliminar cualquier contenido sin previo aviso.

5. ANONIMATO
Tu alias es público. Tu correo electrónico nunca se comparte con otros usuarios. Sin embargo, podemos estar obligados a compartir información con autoridades competentes ante requerimientos legales válidos.

6. CONTENIDO EFÍMERO
Las confesiones con fecha de expiración se eliminan automáticamente al vencer. Las confesiones sin expiración pueden permanecer indefinidamente.

7. PROPIEDAD INTELECTUAL
Conservas los derechos sobre el contenido que publicas. Al publicarlo, nos otorgas una licencia para mostrarlo dentro de la plataforma.

8. LIMITACIÓN DE RESPONSABILIDAD
Susurro no se hace responsable por el contenido publicado por usuarios. El uso de la plataforma es bajo tu propio riesgo.

9. CAMBIOS
Podemos modificar estos términos en cualquier momento. El uso continuado de la app implica aceptación de los cambios.

10. CONTACTO
Para reportar contenido o hacer preguntas legales: legal@susurro.app`;

const PRIVACY = `POLÍTICA DE PRIVACIDAD — SUSURRO

Última actualización: junio 2026

1. INFORMACIÓN QUE RECOPILAMOS
• Correo electrónico (solo para autenticación y recuperación de contraseña)
• Alias elegido por ti (público)
• Contenido que publicas (confesiones, comentarios, reacciones)
• Token de notificaciones push (para enviarte notificaciones)
• Foto de perfil si decides agregarla (almacenada en nuestra base de datos)

2. LO QUE NO RECOPILAMOS
• Tu nombre real
• Número de teléfono
• Ubicación geográfica
• Contactos del dispositivo
• Historial de navegación externo

3. CÓMO USAMOS TU INFORMACIÓN
• Tu correo: solo para login y recuperación de contraseña. Nunca se muestra a otros usuarios.
• Tu alias: identifica tu contenido en la plataforma de forma anónima.
• Notificaciones: para avisarte de reacciones y comentarios en tus confesiones.

4. COMPARTIR CON TERCEROS
No vendemos tu información. Solo podemos compartirla con:
• Autoridades legales ante requerimientos judiciales válidos
• Proveedores de infraestructura (Railway, Neon DB) bajo sus propias políticas de privacidad

5. RETENCIÓN DE DATOS
Tu información se conserva mientras tu cuenta esté activa. Al eliminar tu cuenta, todos tus datos se borran permanentemente de nuestra base de datos.

6. TUS DERECHOS
Tienes derecho a:
• Acceder a tu información
• Eliminar tu cuenta y todos tus datos (disponible en la app)
• Rectificar tu alias o bio

7. SEGURIDAD
Usamos conexiones cifradas (HTTPS/TLS) para todas las comunicaciones. Las contraseñas se almacenan con hash bcrypt.

8. MENORES DE EDAD
Susurro no está dirigido a menores de 13 años. Si eres menor de 13, no uses esta app.

9. CAMBIOS A ESTA POLÍTICA
Te notificaremos en la app si hacemos cambios importantes.

10. CONTACTO
Para ejercer tus derechos de privacidad: privacidad@susurro.app`;

export default function LegalScreen({ route, navigation }: any) {
  const type: 'terms' | 'privacy' = route.params?.type ?? 'terms';
  const content = type === 'terms' ? TERMS : PRIVACY;
  const title = type === 'terms' ? 'Términos de servicio' : 'Política de privacidad';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.text}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '500' },
  content: { padding: 20, paddingBottom: 60 },
  text: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 22 },
});
