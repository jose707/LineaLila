import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Siren, X } from 'lucide-react-native';

type Props = {
  confirmar: boolean;
  resultado: { titulo: string; mensaje: string } | null;
  oscuro: boolean;
  colorEmergencia: string;
  enviando: boolean;
  error: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  onCerrarResultado: () => void;
};

export default function AyudaEmergenciaModal({
  confirmar, resultado, oscuro, colorEmergencia, enviando, error, onConfirmar, onCancelar, onCerrarResultado
}: Props) {
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };
  const cancelar = () => { if (!enviando) onCancelar(); };

  if (resultado) {
    return (
      <Modal key="resultado" animationType="fade" presentationStyle="fullScreen" statusBarTranslucent
        navigationBarTranslucent onRequestClose={onCerrarResultado}>
        <StatusBar barStyle={oscuro ? 'light-content' : 'dark-content'} />
        <SafeAreaProvider style={[s.pantalla, oscuro && s.fondoOscuro]}>
          <SafeAreaView style={s.contenidoSeguro}>
            <Pressable style={s.cerrar} onPress={onCerrarResultado}
              accessibilityRole="button" accessibilityLabel="Cerrar estado de emergencia">
              <X size={24} color={texto.color} strokeWidth={2.8} />
            </Pressable>
            <ScrollView contentContainerStyle={s.resultado}>
              <View style={s.iconoEstado} accessible={false}>
                <Siren size={56} color={oscuro ? '#FCA5A5' : colorEmergencia} strokeWidth={2.4} />
              </View>
              <Text style={[s.tituloResultado, texto]} accessibilityRole="header">{resultado.titulo}</Text>
              <Text style={[s.mensajeResultado, secundario]}>{resultado.mensaje}</Text>
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    );
  }

  if (!confirmar) return null;

  return (
    <Modal key="confirmacion" transparent animationType="fade" statusBarTranslucent onRequestClose={cancelar}>
      <SafeAreaView style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancelar} accessible={false} />
        <View style={[s.tarjeta, oscuro && s.fondoOscuro]} accessibilityViewIsModal>
          <ScrollView bounces={false} contentContainerStyle={s.confirmacion}>
            <Text style={[s.titulo, texto]} accessibilityRole="header">¿Solicitar ayuda de emergencia?</Text>
            <Text style={[s.mensaje, secundario]}>
              Usa esta opción en situaciones de riesgo para tu salud o seguridad. La central de Línea Lila registrará tu alerta junto con tu ubicación actual, si está disponible.
            </Text>
            {!!error && <Text accessibilityRole="alert" style={[s.error, oscuro && s.errorOscuro]}>{error}</Text>}
            <Pressable style={[s.boton, s.principal, { backgroundColor: colorEmergencia }, enviando && s.ocupado]} onPress={onConfirmar}
              disabled={enviando} accessibilityRole="button" accessibilityLabel={enviando ? 'Enviando alerta' : 'Continuar'}
              accessibilityState={{ disabled: enviando, busy: enviando }}>
              {enviando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[s.botonTexto, s.blanco]}>Continuar</Text>}
            </Pressable>
            <Pressable style={[s.boton, s.secundario, oscuro && s.secundarioOscuro, enviando && s.ocupado]}
              onPress={cancelar} disabled={enviando} accessibilityRole="button" accessibilityState={{ disabled: enviando }}>
              <Text style={[s.botonTexto, texto]}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  tarjeta: { width: '100%', maxWidth: 420, maxHeight: '94%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden' },
  confirmacion: { padding: 20, gap: 12 },
  titulo: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  mensaje: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  error: { color: '#B91C1C', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  errorOscuro: { color: '#FCA5A5' },
  boton: { minHeight: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  principal: { marginTop: 6 },
  secundario: { backgroundColor: '#F2F2F5' },
  secundarioOscuro: { backgroundColor: '#303036' },
  ocupado: { opacity: 0.7 },
  botonTexto: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  blanco: { color: '#FFFFFF' },
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  contenidoSeguro: { flex: 1 },
  fondoOscuro: { backgroundColor: '#1A1A1A' },
  cerrar: { width: 44, height: 44, marginStart: 16, alignItems: 'center', justifyContent: 'center' },
  resultado: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 64, gap: 14 },
  iconoEstado: { marginBottom: 4 },
  tituloResultado: { fontSize: 26, lineHeight: 32, fontWeight: '700', textAlign: 'center', maxWidth: 360 },
  mensajeResultado: { fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 360 }
});
