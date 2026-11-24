import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import type { Usuario } from '../types/modelos';

export default function RecordatorioIdentidad({ usuario, onVerificar, oscuro = false }: {
  usuario: Usuario | null;
  onVerificar: () => void;
  oscuro?: boolean;
}) {
  if (!usuario || usuario.estadoVerificacionIdentidad === 'verificado' ||
    (!usuario.recordarVerificacionIdentidad && !usuario.verificacionIdentidadRequerida)) return null;

  const lila = oscuro ? '#D5A6FF' : '#7514C5';

  return (
    <TouchableOpacity style={[s.tarjeta, oscuro && s.tarjetaOscura]} onPress={onVerificar}
      activeOpacity={0.85} accessibilityRole="button">
      <View style={s.icono}>
        <ShieldCheck size={23} strokeWidth={2.3} color="#FFFFFF" />
      </View>
      <View style={s.textos}>
        <Text style={[s.titulo, oscuro && s.textoClaro]}>Disfruta de viajes más fáciles y seguros</Text>
        <Text style={[s.enlace, { color: lila }]}>Verificar identidad</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#EAEAF0', borderRadius: 14, padding: 12, gap: 10 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  icono: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#7514C5', alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  titulo: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#111118' },
  textoClaro: { color: '#FFFFFF' },
  enlace: { fontSize: 14, lineHeight: 19, fontWeight: '700' }
});
