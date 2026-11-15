import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, ChevronRight, History, SlidersHorizontal, TriangleAlert, X } from 'lucide-react-native';
import { DestinoIndicadorIcono, ParadaMapaIcono, PasajeroMapaIcono } from '../components/MapUbicacionIcons';
import { usarAjustes } from '../context/AjustesContexto';
import { usarAutenticacion } from '../hooks/usarAutenticacion';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { viajesServicio } from '../services/viajes.servicio';

type Viaje = {
  id: string;
  status: 'completado' | 'cancelado';
  createdAt?: string;
  passengerId: string;
  driverId?: string | null;
  passenger?: { name?: string } | null;
  driver?: { user?: { name?: string } | null; User?: { name?: string } | null } | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  waypoints?: Array<{ sequence: number; address: string }> | null;
  distance?: number | null;
  finalFare?: number | string | null;
  final_fare?: number | string | null;
};

const filtros = [
  { valor: 'all', nombre: 'Todos', vacio: 'Todavía no tienes viajes' },
  { valor: 'completado', nombre: 'Completados', vacio: 'No hay viajes completados' },
  { valor: 'cancelado', nombre: 'Cancelados', vacio: 'No hay viajes cancelados' }
] as const;
type Filtro = typeof filtros[number]['valor'];

const principal = '#7514C5';
const formatoDia = new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' });
const formatoHora = new Intl.DateTimeFormat('es-BO', { timeStyle: 'short', timeZone: 'America/La_Paz' });
const formatoTarifa = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function distancia(metros?: number | null) {
  if (metros == null || !Number.isFinite(metros)) return '—';
  return metros >= 1000 ? (metros / 1000).toFixed(1) + ' km' : Math.round(metros) + ' m';
}

export default function ViajeHistorialPantalla() {
  const navegacion = useNavigation<NativeStackNavigationProp<RaizPilaParametroLista>>();
  const { top } = useSafeAreaInsets();
  const { user: usuario } = usarAutenticacion();
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const [viajes, establecerViajes] = useState<Viaje[]>([]);
  const [cargando, establecerCargando] = useState(true);
  const [renovando, establecerRenovando] = useState(false);
  const [error, establecerError] = useState(false);
  const [filtro, establecerFiltro] = useState<Filtro>('all');
  const [menuVisible, establecerMenuVisible] = useState(false);

  const acento = oscuro ? '#D5A6FF' : principal;
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };
  const verde = oscuro ? '#81DBAB' : '#167348';
  const rojo = oscuro ? '#FCA5A5' : '#B91C1C';
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];

  const cargarHistorial = useCallback(async (renovar = false) => {
    if (!usuario?.id) return;
    if (renovar) establecerRenovando(true);
    else establecerCargando(true);
    establecerError(false);
    try {
      const respuesta = await viajesServicio.obtenerHistorialViajes(usuario.id, 1, 10, { propagarError: true });
      const datos = respuesta?.rides ?? respuesta?.data;
      establecerViajes(Array.isArray(datos) ? datos : []);
    } catch {
      establecerError(true);
    } finally {
      establecerCargando(false);
      establecerRenovando(false);
    }
  }, [usuario?.id]);

  useEffect(() => { void cargarHistorial(); }, [cargarHistorial]);

  const porDia = new Map<string, Viaje[]>();
  const hoy = formatoDia.format(new Date());
  for (const viaje of viajes) {
    if (filtro !== 'all' && viaje.status !== filtro) continue;
    const fecha = new Date(viaje.createdAt ?? '');
    const dia = Number.isFinite(fecha.getTime()) ? formatoDia.format(fecha) : 'Sin fecha';
    const grupo = porDia.get(dia) ?? [];
    grupo.push(viaje);
    porDia.set(dia, grupo);
  }
  const secciones = Array.from(porDia, ([dia, data]) => ({ key: dia, titulo: dia === hoy ? 'Hoy' : dia, data }));

  const representarTarjeta = ({ item: viaje }: { item: Viaje }) => {
    const comoConductor = viaje.passengerId !== usuario?.id;
    const otraPersona = comoConductor ? viaje.passenger?.name || 'Pasajero' :
      viaje.driver?.user?.name || viaje.driver?.User?.name || (viaje.driverId ? 'Conductor' : 'Sin conductor asignado');
    const cancelado = viaje.status === 'cancelado';
    const estado = cancelado ? 'Cancelado' : 'Completado';
    const fecha = new Date(viaje.createdAt ?? '');
    const hora = Number.isFinite(fecha.getTime()) ? formatoHora.format(fecha) : '';
    const valorTarifa = viaje.finalFare ?? viaje.final_fare;
    const tarifa = valorTarifa != null && Number.isFinite(Number(valorTarifa))
      ? 'Bs ' + formatoTarifa.format(Number(valorTarifa)) : '—';
    const paradas = [...(viaje.waypoints ?? [])].sort((a, b) => a.sequence - b.sequence);

    return (
      <Pressable style={tarjeta} onPress={() => navegacion.navigate('ClientRideDetails', { rideId: viaje.id })}
        accessibilityRole="button" accessibilityHint="Abre los detalles y el recorrido del viaje">
        <View style={s.cabeceraTarjeta}>
          <View style={s.datos}>
            <Text style={[s.nombre, texto]}>{otraPersona}</Text>
            <View style={s.metadatos}>
              <Text style={[s.estado, { color: cancelado ? rojo : verde }]}>{estado}</Text>
              {!!hora && <Text style={[s.secundario, secundario]}>{hora}</Text>}
            </View>
          </View>
          <ChevronRight size={22} color={acento} strokeWidth={2.5} />
        </View>

        <View style={s.trayecto}>
          <View style={s.filaRuta}>
            <PasajeroMapaIcono size={25} bare color={texto.color} />
            <Text style={[s.direccion, texto]} numberOfLines={2}>{viaje.pickup_address || 'Sin dirección de origen'}</Text>
          </View>
          {paradas.map((parada, indice) => (
            <View style={s.filaRuta} key={parada.sequence + '-' + indice}>
              <View style={s.iconoParada}><ParadaMapaIcono number={indice + 1} size={22} /></View>
              <Text style={[s.direccion, texto]} numberOfLines={2}>{parada.address || 'Sin dirección'}</Text>
            </View>
          ))}
          <View style={s.filaRuta}>
            <DestinoIndicadorIcono size={25} bare color={texto.color} />
            <Text style={[s.direccion, texto]} numberOfLines={2}>{viaje.dropoff_address || 'Sin dirección de destino'}</Text>
          </View>
        </View>

        <View style={[s.estadisticas, oscuro && s.divisorOscuro]}>
          <View style={s.datos}>
            <Text style={[s.secundario, secundario]}>Distancia</Text>
            <Text style={[s.valor, texto]}>{distancia(viaje.distance)}</Text>
          </View>
          <View style={s.datos}>
            <Text style={[s.secundario, secundario]}>{cancelado ? 'Tarifa' : comoConductor ? 'Ganado' : 'Pagado'}</Text>
            <Text style={[s.valor, texto, comoConductor && !cancelado && { color: verde }]}>{tarifa}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <Pressable style={s.control} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </Pressable>
        <Text style={[s.titulo, texto]} accessibilityRole="header">Mis viajes</Text>
        <Pressable style={s.control} onPress={() => establecerMenuVisible(true)} accessibilityRole="button"
          accessibilityLabel="Filtrar viajes" accessibilityState={{ expanded: menuVisible }}>
          <SlidersHorizontal size={23} color={filtro === 'all' ? texto.color : acento} strokeWidth={2.5} />
        </Pressable>
      </View>

      {cargando ? (
        <View style={s.cargando}><ActivityIndicator size="large" color={acento} accessibilityLabel="Cargando viajes" /></View>
      ) : (
        <SectionList sections={secciones} keyExtractor={viaje => viaje.id} renderItem={representarTarjeta}
          stickySectionHeadersEnabled={false} contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <Text style={[s.fecha, texto]} accessibilityRole="header">{section.titulo}</Text>
          )}
          refreshControl={<RefreshControl refreshing={renovando} onRefresh={() => cargarHistorial(true)} colors={[principal]} tintColor={acento} />}
          ListHeaderComponent={error ? (
            <View style={[tarjeta, s.vacio]}>
              <TriangleAlert size={30} color={rojo} strokeWidth={2.5} />
              <Text style={[s.nombre, texto]} accessibilityRole="alert">No se pudo cargar el historial</Text>
              <Pressable style={s.reintentar} onPress={() => cargarHistorial()} accessibilityRole="button">
                <Text style={[s.enlace, { color: acento }]}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}
          ListEmptyComponent={error ? null : (
            <View style={[tarjeta, s.vacio]}>
              <History size={32} color={acento} strokeWidth={2.5} />
              <Text style={[s.nombre, texto]}>{filtros.find(opcion => opcion.valor === filtro)?.vacio}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={menuVisible} transparent animationType="fade" statusBarTranslucent
        onRequestClose={() => establecerMenuVisible(false)}>
        <View style={[s.fondoMenu, { paddingTop: top + 62 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => establecerMenuVisible(false)}
            accessibilityRole="button" accessibilityLabel="Cerrar filtros" />
          <View style={[s.menu, oscuro && s.tarjetaOscura]} accessibilityViewIsModal>
            <Text style={[s.tituloMenu, secundario]} accessibilityRole="header">Mostrar viajes</Text>
            {filtros.map(({ valor, nombre }) => {
              const activo = filtro === valor;
              const cantidad = valor === 'all' ? viajes.length : viajes.filter(viaje => viaje.status === valor).length;
              return (
                <Pressable style={s.opcion} key={valor} onPress={() => { establecerFiltro(valor); establecerMenuVisible(false); }}
                  accessibilityRole="radio" accessibilityState={{ checked: activo }}>
                  <Text style={[s.opcionTexto, activo ? { color: acento } : texto]}>{nombre} ({cantidad})</Text>
                  {activo && <Check size={19} color={acento} strokeWidth={2.8} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  fecha: { fontSize: 17, fontWeight: '700', marginTop: 10, marginBottom: 10 },
  tarjeta: { borderRadius: 16, borderWidth: 1, borderColor: '#EAEAF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 12 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  cabeceraTarjeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datos: { flex: 1, gap: 4 },
  nombre: { fontSize: 16, fontWeight: '700' },
  metadatos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  estado: { fontSize: 13, fontWeight: '700' },
  secundario: { fontSize: 13 },
  trayecto: { marginTop: 12, gap: 5 },
  filaRuta: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  iconoParada: { width: 25, alignItems: 'center' },
  direccion: { flex: 1, fontSize: 14, lineHeight: 20 },
  estadisticas: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  divisorOscuro: { borderTopColor: '#4A4A4A' },
  valor: { fontSize: 15, fontWeight: '700' },
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacio: { alignItems: 'center', gap: 12, padding: 24 },
  reintentar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  enlace: { fontSize: 14, fontWeight: '700' },
  fondoMenu: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.25)' },
  menu: { width: 230, maxWidth: '100%', borderRadius: 16, borderWidth: 1, borderColor: '#EAEAF0', backgroundColor: '#FFFFFF', padding: 12 },
  tituloMenu: { fontSize: 13, fontWeight: '600', padding: 10 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, minHeight: 48 },
  opcionTexto: { flex: 1, fontSize: 15, fontWeight: '600' }
});
