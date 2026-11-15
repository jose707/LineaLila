import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, CheckCheck, ChevronDown, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';
import api from '../services/api.cliente';
import { alPrimerPlanoNotificacion } from '../services/firebase.servicio';

const principal = '#7514C5';
type Notificacion = { id: string; title: string; body: string; created_at: string; is_read: boolean };
type Bandeja = { data: Notificacion[]; unread_count: number; hayMas: boolean };

const formatoFecha = new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' });
const formatoHora = new Intl.DateTimeFormat('es-BO', { timeStyle: 'short', timeZone: 'America/La_Paz' });

export default function NotificacionesPantalla() {
  const navegacion = useNavigation();
  const { settings } = usarAjustes();
  const oscuro = settings.darkMode;
  const acento = oscuro ? '#D5A6FF' : principal;
  const [notificaciones, establecerNotificaciones] = useState<Notificacion[]>([]);
  const [sinLeer, establecerSinLeer] = useState(0);
  const [hayMas, establecerHayMas] = useState(false);
  const [cargando, establecerCargando] = useState(false);
  const [marcando, establecerMarcando] = useState(false);
  const [error, establecerError] = useState('');
  const ocupado = useRef(false);
  const revisionConsulta = useRef(0);

  const cargar = useCallback(async (offset = 0) => {
    if (ocupado.current) return;
    ocupado.current = true;
    const revision = ++revisionConsulta.current;
    establecerError('');
    establecerCargando(true);
    try {
      const datos = await api.obtener<Bandeja>('/notificaciones', { params: { offset } });
      if (revision !== revisionConsulta.current) return;
      establecerNotificaciones(anterior => offset
        ? [...new Map([...anterior, ...datos.data].map(aviso => [aviso.id, aviso])).values()]
        : datos.data);
      establecerSinLeer(datos.unread_count);
      establecerHayMas(datos.hayMas);
    } catch {
      if (revision === revisionConsulta.current) establecerError('No se pudieron cargar tus notificaciones.');
    } finally {
      if (revision === revisionConsulta.current) {
        ocupado.current = false;
        establecerCargando(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    establecerMarcando(false);
    void cargar();
    const dejarDeEscuchar = alPrimerPlanoNotificacion(() => { void cargar(); });
    return () => {
      dejarDeEscuchar();
      revisionConsulta.current += 1;
      ocupado.current = false;
    };
  }, [cargar]));

  const marcarLeidas = async (id?: string) => {
    if (ocupado.current) return;
    ocupado.current = true;
    const revision = ++revisionConsulta.current;
    establecerMarcando(true);
    establecerError('');
    try {
      const ruta = id ? `/notificaciones/${encodeURIComponent(id)}/leer` : '/notificaciones/leer-todas';
      const datos = await api.patch<{ unread_count: number }>(ruta);
      if (revision !== revisionConsulta.current) return;
      establecerNotificaciones(anterior => anterior.map(aviso =>
        !id || aviso.id === id ? { ...aviso, is_read: true } : aviso));
      establecerSinLeer(datos.unread_count);
    } catch {
      if (revision === revisionConsulta.current) establecerError('No se pudo marcar la notificación como leída.');
    } finally {
      if (revision === revisionConsulta.current) {
        ocupado.current = false;
        establecerMarcando(false);
      }
    }
  };

  const hoy = formatoFecha.format(new Date());
  const porFecha = new Map<string, Array<{ notificacion: Notificacion; hora: string }>>();
  for (const notificacion of notificaciones) {
    const fecha = new Date(notificacion.created_at);
    const fechaValida = Number.isFinite(fecha.getTime());
    const dia = fechaValida ? formatoFecha.format(fecha) : 'Sin fecha';
    const hora = fechaValida ? formatoHora.format(fecha) : '';
    const grupo = porFecha.get(dia) ?? [];
    grupo.push({ notificacion, hora });
    porFecha.set(dia, grupo);
  }

  const accionMarcarLeidas = sinLeer > 0 ? (
    <TouchableOpacity style={estilos.marcar} disabled={marcando || cargando}
      onPress={() => marcarLeidas()} accessibilityRole="button" accessibilityLabel="Marcar todas como leídas">
      <CheckCheck size={19} color={acento} strokeWidth={2.5} />
      <Text style={[estilos.marcarTexto, { color: acento }]}>Marcar leídas</Text>
    </TouchableOpacity>
  ) : null;

  return <SafeAreaView style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
    <View style={estilos.cabecera}>
      <TouchableOpacity style={estilos.cerrar} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
        <X size={24} color={oscuro ? '#FFFFFF' : '#0D0D0D'} strokeWidth={2.8} />
      </TouchableOpacity>
      <Text style={[estilos.tituloCabecera, oscuro && estilos.textoClaro]} numberOfLines={1}>Notificaciones</Text>
      <View style={estilos.espacio} />
    </View>

    <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => cargar()} tintColor={principal} colors={[principal]} />}>
      {accionMarcarLeidas && porFecha.size === 0 && <View style={estilos.accionesSinFecha}>
        {accionMarcarLeidas}
      </View>}

      {!!error && <View style={[estilos.vacio, oscuro && estilos.tarjetaOscura]}>
        <Text style={[estilos.vacioTexto, oscuro && estilos.secundarioOscuro]}>{error}</Text>
        <TouchableOpacity style={estilos.marcar} onPress={() => cargar()} accessibilityRole="button">
          <Text style={[estilos.marcarTexto, { color: acento }]}>Actualizar</Text>
        </TouchableOpacity>
      </View>}
      {cargando && !notificaciones.length && <ActivityIndicator color={principal} />}
      {!cargando && !error && !notificaciones.length && <View style={[estilos.vacio, oscuro && estilos.tarjetaOscura]}>
        <Bell size={32} color={acento} strokeWidth={2.5} />
        <Text style={[estilos.vacioTitulo, oscuro && estilos.textoClaro]}>No tienes notificaciones</Text>
      </View>}
      {Array.from(porFecha, ([dia, grupo], indiceGrupo) => <View key={dia} style={estilos.grupoFecha}>
        <View style={estilos.seccionCabecera}>
          <Text accessibilityRole="header" style={[estilos.titulo, oscuro && estilos.textoClaro]}>
            {dia === hoy ? 'Hoy' : dia}
          </Text>
          {indiceGrupo === 0 && accionMarcarLeidas}
        </View>
        <View style={[estilos.tarjeta, oscuro && estilos.tarjetaOscura]}>
          {grupo.map(({ notificacion, hora }, indice) => <TouchableOpacity
            key={notificacion.id}
            style={[estilos.fila, indice > 0 && estilos.separador, indice > 0 && oscuro && estilos.separadorOscuro]}
            onPress={() => marcarLeidas(notificacion.id)}
            disabled={notificacion.is_read || marcando || cargando}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={[notificacion.title, notificacion.body, hora, notificacion.is_read ? 'Leída' : 'Sin leer'].filter(Boolean).join('. ')}>
            <Bell size={23} color={notificacion.is_read ? '#828290' : acento} strokeWidth={2.5} />
            <View style={estilos.datos}>
              <View style={estilos.filaTitulo}>
                <Text style={[estilos.nombre, oscuro && estilos.textoClaro, !notificacion.is_read && estilos.nombreSinLeer]}>
                  {notificacion.title}
                </Text>
                {!notificacion.is_read && <View style={[estilos.punto, { backgroundColor: acento }]} />}
              </View>
              <Text style={[estilos.mensaje, oscuro && estilos.secundarioOscuro]}>{notificacion.body}</Text>
              {!!hora && <Text style={[estilos.tiempo, oscuro && estilos.secundarioOscuro]}>{hora}</Text>}
            </View>
          </TouchableOpacity>)}
        </View>
      </View>)}
      {hayMas && <TouchableOpacity style={[estilos.anteriores, oscuro && estilos.tarjetaOscura]} disabled={cargando || marcando} onPress={() => cargar(notificaciones.length)} accessibilityRole="button">
        <Text style={[estilos.marcarTexto, { color: acento }]}>Ver notificaciones anteriores</Text>
        <ChevronDown size={18} color={acento} strokeWidth={2.5} />
      </TouchableOpacity>}
    </ScrollView>
  </SafeAreaView>;
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' }, pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, espacio: { width: 42 },
  tituloCabecera: { flex: 1, textAlign: 'center', color: '#0D0D0D', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  accionesSinFecha: { alignItems: 'flex-end' },
  grupoFecha: { gap: 10 },
  titulo: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111118' },
  marcar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  marcarTexto: { fontSize: 14, fontWeight: '700' },
  tarjeta: { paddingHorizontal: 14, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 14, backgroundColor: '#FFFFFF' },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#DADAE3' },
  separadorOscuro: { borderColor: '#4A4A4A' },
  datos: { flex: 1 },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nombre: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#111118' },
  nombreSinLeer: { fontWeight: '700' },
  mensaje: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#666675' },
  tiempo: { marginTop: 6, fontSize: 12, color: '#666675' },
  punto: { width: 8, height: 8, marginTop: 7, borderRadius: 4 },
  anteriores: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, minHeight: 48, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 12 },
  vacio: { alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16 }, vacioTitulo: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#111118' }, vacioTexto: { marginTop: 5, fontSize: 13, color: '#7A7A8A', textAlign: 'center' }, textoClaro: { color: '#FFFFFF' }, secundarioOscuro: { color: '#BDBDC7' }
});

