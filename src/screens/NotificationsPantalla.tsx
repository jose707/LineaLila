import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Bell, CheckCheck, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';

const principal = '#7514C5';

export default function NotificacionesPantalla() {
  const navegacion = useNavigation();
  const { settings } = usarAjustes();
  const oscuro = settings.darkMode;
  const [notificaciones, establecerNotificaciones] = useState([
    { id: '1', title: 'Viaje completado', message: 'Tu viaje a Plaza Murillo ha sido completado exitosamente.', time: 'Hace 2 horas', read: false },
    { id: '2', title: 'Nuevo conductor disponible', message: 'Conductores disponibles cerca de tu ubicación.', time: 'Hace 5 horas', read: false },
    { id: '3', title: 'Recordatorio de viaje', message: 'Puedes consultar tus viajes recientes en el historial.', time: 'Ayer', read: true },
    { id: '4', title: 'Viaje cancelado', message: 'El conductor canceló el viaje. Busca otro conductor.', time: 'Ayer', read: true },
    { id: '5', title: 'Bienvenido a LineaLila', message: 'Gracias por registrarte. Comienza a viajar seguro.', time: 'Hace 3 días', read: true }
  ]);
  const sinLeer = notificaciones.filter(notificacion => !notificacion.read).length;

  return <SafeAreaView style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
    <View style={estilos.cabecera}>
      <TouchableOpacity style={estilos.cerrar} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
        <X size={24} color={oscuro ? '#FFFFFF' : '#0D0D0D'} strokeWidth={2.8} />
      </TouchableOpacity>
      <Text style={[estilos.tituloCabecera, oscuro && estilos.textoClaro]} numberOfLines={1}>Notificaciones</Text>
      <View style={estilos.espacio} />
    </View>

    <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
      <View style={estilos.seccionCabecera}>
        <View style={estilos.seccionTexto}>
          <Text style={[estilos.titulo, oscuro && estilos.textoClaro]}>Recientes</Text>
          <Text style={[estilos.subtitulo, oscuro && estilos.secundarioOscuro]}>{sinLeer ? `${sinLeer} sin leer` : 'Estás al día'}</Text>
        </View>
        {sinLeer > 0 && <TouchableOpacity style={estilos.marcar} onPress={() => establecerNotificaciones(anterior => anterior.map(item => ({ ...item, read: true })))} accessibilityRole="button" accessibilityLabel="Marcar todas como leídas">
          <CheckCheck size={19} color={principal} strokeWidth={2.5} />
          <Text style={estilos.marcarTexto}>Marcar leídas</Text>
        </TouchableOpacity>}
      </View>

      {notificaciones.length === 0 ? <View style={[estilos.vacio, oscuro && estilos.tarjetaOscura]}>
        <Bell size={30} color={principal} strokeWidth={2.5} />
        <Text style={[estilos.vacioTitulo, oscuro && estilos.textoClaro]}>No tienes notificaciones</Text>
        <Text style={[estilos.vacioTexto, oscuro && estilos.secundarioOscuro]}>Aquí aparecerán tus novedades.</Text>
      </View> : notificaciones.map(notificacion => <TouchableOpacity
        key={notificacion.id}
        style={[estilos.tarjeta, oscuro && estilos.tarjetaOscura]}
        onPress={() => establecerNotificaciones(anterior => anterior.map(item => item.id === notificacion.id ? { ...item, read: true } : item))}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${notificacion.title}. ${notificacion.message}. ${notificacion.time}. ${notificacion.read ? 'Leída' : 'Sin leer'}`}>
        <View style={estilos.icono}><Bell size={26} color={notificacion.read ? '#AFAFBF' : principal} strokeWidth={2.5} /></View>
        <View style={estilos.datos}>
          <Text style={[estilos.nombre, oscuro && estilos.textoClaro]}>{notificacion.title}</Text>
          <Text style={[estilos.mensaje, oscuro && estilos.secundarioOscuro]}>{notificacion.message}</Text>
          <Text style={[estilos.tiempo, oscuro && estilos.secundarioOscuro]}>{notificacion.time}</Text>
        </View>
        {!notificacion.read && <View style={estilos.punto} />}
      </TouchableOpacity>)}
    </ScrollView>
  </SafeAreaView>;
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' }, pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, espacio: { width: 42 },
  tituloCabecera: { flex: 1, textAlign: 'center', color: '#0D0D0D', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  seccionTexto: { flex: 1 }, titulo: { fontSize: 18, fontWeight: '700', color: '#111118' }, subtitulo: { marginTop: 4, fontSize: 13, color: '#7A7A8A' },
  marcar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingLeft: 8 }, marcarTexto: { fontSize: 13, fontWeight: '700', color: principal },
  tarjeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 14, backgroundColor: '#FFFFFF' }, tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  icono: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, datos: { flex: 1 }, nombre: { fontSize: 16, fontWeight: '700', color: '#111118' }, mensaje: { marginTop: 5, fontSize: 14, lineHeight: 20, color: '#7A7A8A' }, tiempo: { marginTop: 8, fontSize: 12, color: '#AFAFBF' }, punto: { width: 8, height: 8, marginTop: 5, borderRadius: 4, backgroundColor: principal },
  vacio: { alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16 }, vacioTitulo: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#111118' }, vacioTexto: { marginTop: 5, fontSize: 13, color: '#7A7A8A', textAlign: 'center' }, textoClaro: { color: '#FFFFFF' }, secundarioOscuro: { color: '#BDBDC7' }
});

