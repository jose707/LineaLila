import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import CentralEmergencias, { usarAlertasEmergencia } from '../components/CentralEmergencias';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';

type Props = NativeStackScreenProps<RaizPilaParametroLista, 'AdminEmergencias'>;

export default function AdminEmergenciasPantalla({ navigation }: Props) {
  const emergencias = usarAlertasEmergencia();

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={estilos.cabecera}>
        <Pressable style={estilos.control} onPress={() => navigation.goBack()}
          accessibilityRole="button" accessibilityLabel="Cerrar detalles de emergencia">
          <X size={24} color="#111118" strokeWidth={2.8} />
        </Pressable>
        <Text style={estilos.titulo} accessibilityRole="header">Detalles de emergencia</Text>
        <View style={estilos.control} />
      </View>
      <ScrollView contentContainerStyle={estilos.contenido}>
        {emergencias.alertas.length > 0 ? <CentralEmergencias {...emergencias} />
          : !emergencias.consultada ? <ActivityIndicator color="#B91C1C" accessibilityLabel="Cargando emergencias" />
          : <Text style={estilos.mensaje} accessibilityRole={emergencias.error ? 'alert' : undefined}>
              {emergencias.error || 'No hay emergencias activas.'}
            </Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#B91C1C' },
  contenido: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  mensaje: { textAlign: 'center', fontSize: 15, color: '#55555F', paddingVertical: 20 }
});
