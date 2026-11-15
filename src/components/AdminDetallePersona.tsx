import React, { useState, type ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ChevronRight, CircleX, X } from 'lucide-react-native';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

export const coloresDetalle = {
  texto: '#111118', secundario: '#666675', lila: '#7514C5', rojo: '#B91C1C', verde: '#167348'
};

const formatoFecha = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'America/La_Paz' });
const formatoFechaHora = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz'
});

export function fechaDetalle(valor?: string | null, conHora = false) {
  if (!valor) return 'Sin registrar';
  const texto = valor.trim();
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
  const iso = local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : texto;
  const esDia = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const fecha = new Date(esDia ? iso + 'T12:00:00Z' : iso);
  if (esDia && Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) !== iso) return 'Sin registrar';
  return Number.isFinite(fecha.getTime()) ? (conHora ? formatoFechaHora : formatoFecha).format(fecha) : 'Sin registrar';
}

export function MarcoDetallePersona({ titulo, cerrar, ocupado, children }: {
  titulo: string; cerrar: () => void; ocupado: boolean; children: ReactNode;
}) {
  return (
    <SafeAreaView style={s.pantalla}>
      <View style={s.cabecera}>
        <Pressable style={s.control} onPress={cerrar} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Cerrar detalle">
          <X size={24} color={coloresDetalle.texto} strokeWidth={2.8} />
        </Pressable>
        <Text style={s.titulo} accessibilityRole="header">{titulo}</Text>
        <View style={s.control} />
      </View>
      <KeyboardAvoidingView style={s.cuerpo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ResumenDetallePersona({ nombre, foto, estado, disponible }: {
  nombre: string; foto: string | null; estado: 'Verificado' | 'Desactivado' | 'Suspendido';
  disponible?: boolean;
}) {
  const [fotoFallida, setFotoFallida] = useState<string | null>(null);
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte.charAt(0)).join('').toUpperCase();
  const verificado = estado === 'Verificado';
  const color = verificado ? coloresDetalle.verde : coloresDetalle.rojo;
  return (
    <View style={s.perfil}>
      <View style={s.avatar}>
        {foto && foto !== fotoFallida ? <Image source={privadoImagenOrigen(foto)} style={s.foto}
          onError={() => setFotoFallida(foto)} /> : <Text style={s.iniciales}>{iniciales || '?'}</Text>}
      </View>
      <View style={s.datos}>
        <Text style={s.nombre}>{nombre}</Text>
        <View style={s.filaEstado}>
          {verificado ? <CheckCircle size={16} color={color} strokeWidth={2.5} /> : <CircleX size={18} color={color} strokeWidth={2.5} />}
          <Text style={[s.estado, { color }]}>{estado}</Text>
          {disponible !== undefined && (
            <Text style={s.secundario}>· {disponible ? 'En servicio' : 'No disponible'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export function SeccionDetallePersona({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={s.seccion}>
      <Text style={s.tituloSeccion} accessibilityRole="header">{titulo}</Text>
      <View style={s.tarjeta}>{children}</View>
    </View>
  );
}

export function DatoDetallePersona({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <View style={s.fila}>
      <Text style={s.secundario}>{etiqueta}</Text>
      <Text style={s.valor}>{valor || 'Sin registrar'}</Text>
    </View>
  );
}

export function EnlaceDetallePersona({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  return (
    <Pressable style={[s.fila, s.enlace]} accessibilityRole="button" onPress={onPress}>
      <Text style={[s.enlaceTexto, s.datos]}>{etiqueta}</Text>
      <ChevronRight size={18} color={coloresDetalle.lila} strokeWidth={2.5} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  cuerpo: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: coloresDetalle.texto },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  avatar: { width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3EAFC' },
  foto: { width: '100%', height: '100%' },
  iniciales: { color: coloresDetalle.lila, fontSize: 21, fontWeight: '700' },
  datos: { flex: 1 },
  nombre: { color: coloresDetalle.texto, fontSize: 21, fontWeight: '700' },
  filaEstado: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 4 },
  estado: { fontSize: 13, fontWeight: '700' },
  seccion: { gap: 8 },
  tituloSeccion: { color: coloresDetalle.texto, fontSize: 17, fontWeight: '700' },
  tarjeta: { borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, paddingHorizontal: 14 },
  fila: { paddingVertical: 11, gap: 4 },
  secundario: { color: coloresDetalle.secundario, fontSize: 13, lineHeight: 18 },
  valor: { color: coloresDetalle.texto, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  enlaceTexto: { color: coloresDetalle.lila, fontSize: 14, fontWeight: '700' },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  motivo: { color: coloresDetalle.texto, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 13, minHeight: 76,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top' },
  accion: { minHeight: 54, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: coloresDetalle.lila },
  accionSecundaria: { borderWidth: 1, borderColor: '#EAEAF0', backgroundColor: '#FFFFFF' },
  accionTexto: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', fontWeight: '700' },
  accionTextoSecundario: { color: coloresDetalle.texto },
  atenuado: { opacity: 0.5 },
  aviso: { paddingVertical: 14, alignItems: 'center', gap: 8 },
  exito: { color: coloresDetalle.verde, fontSize: 14, fontWeight: '600' },
  error: { color: coloresDetalle.rojo, fontSize: 14, fontWeight: '600' }
});

export { s as estilosDetallePersona };
