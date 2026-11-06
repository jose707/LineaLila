import React from 'react';
import { ActivityIndicator, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

export function CargaEnvioSolicitud({ visible }: { visible: boolean }) {
  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={() => {}}>
      <View style={[s.centro, s.capa]} accessibilityViewIsModal>
        <ActivityIndicator size="large" color="#FFFFFF" accessibilityLabel="Enviando solicitud" />
      </View>
    </Modal>
  );
}

export function ConfirmacionEnvioSolicitud() {
  return (
    <SafeAreaView style={[s.centro, s.pantalla]} accessibilityLiveRegion="polite">
      <StatusBar barStyle="dark-content" />
      <View style={[s.centro, s.icono]}><Check size={46} color="#7514C5" strokeWidth={2.5} /></View>
      <Text style={s.titulo} accessibilityRole="header">Solicitud enviada</Text>
      <Text style={s.mensaje}>Un administrador revisará tus documentos en 24–48 horas.</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
  capa: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  pantalla: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28 },
  icono: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#7514C5', marginBottom: 24 },
  titulo: { fontSize: 28, fontWeight: '800', color: '#0D0D0D', textAlign: 'center' },
  mensaje: { marginTop: 8, fontSize: 16, lineHeight: 23, color: '#555555', textAlign: 'center', maxWidth: 320 }
});
