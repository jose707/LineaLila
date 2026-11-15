import React, { useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldX } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';

export default function CuentaDesactivadaPantalla({ titulo = 'Cuenta desactivada', mensaje, alVolver }:
  { titulo?: string; mensaje: string; alVolver: () => void }) {
  const { settings: { darkMode: oscuro } } = usarAjustes();

  useEffect(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      alVolver();
      return true;
    });
    return () => suscripcion.remove();
  }, [alVolver]);

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
        <View style={s.aviso} accessibilityLiveRegion="polite">
          <ShieldX size={58} color={oscuro ? '#D5A6FF' : '#7514C5'} strokeWidth={2.3} />
          <Text style={[s.titulo, oscuro && s.tituloOscuro]} accessibilityRole="header">{titulo}</Text>
          <Text style={[s.mensaje, oscuro && s.mensajeOscuro]}>{mensaje}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#121212' },
  contenido: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  aviso: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 32 },
  titulo: { color: '#111118', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  tituloOscuro: { color: '#FFFFFF' },
  mensaje: { color: '#666675', fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 360 },
  mensajeOscuro: { color: '#BDBDC7' }
});
