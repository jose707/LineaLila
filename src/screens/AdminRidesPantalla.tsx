// src/screens/AdminRidesPantalla.tsx
import React, { useState as usarEstado, useCallback as usarFuncionRetorno, useEffect as usarEfecto } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  StatusBar as EstadoBar,
  TextInput as TextoEntrada,
  Modal,
  ActivityIndicator as ActividadIndicador,
  RefreshControl as RenovarControl } from
'react-native';
import { Car, Check, Menu, Search, User, X } from 'lucide-react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { DestinoIndicadorIcono, PasajeroMapaIcono } from '../components/MapUbicacionIcons';
import api from "../services/api.cliente";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  bg: '#FFFFFF',
  white: '#FFFFFF',
  border: '#E5E5EA',
  text: '#111118',
  textMuted: '#666675',
  completado: '#167245',
  inProgress: '#7514C5',
  error: '#EF4444'
};

type Propiedades = NativeStackScreenProps<RaizPilaParametroLista, 'AdminRides'>;

interface ViajeDesdeApi {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  finalFare: number | string | null;
  distance: number | string | null;
  duration: number | null;
  createdAt: string;
  passenger?: {id: string;name: string;phone: string;};
  driver?: {id: string;name: string;phone: string;};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const estadoColor = (s: string) => {
  switch (s) {
    case 'completado':return C.completado;
    case 'en_curso':
    case 'aceptado':
    case 'llegado':return C.inProgress;
    default:return C.textMuted;
  }
};

const estadoEtiqueta = (s: string) => {
  const mapa: Record<string, string> = {
    completado: 'Completado',
    en_curso: 'En curso',
    aceptado: 'Aceptado',
    llegado: 'Conductor llegó',
    solicitado: 'Solicitado',
    ofertado: 'Con ofertas',
    cancelado: 'Cancelado',
    vencido: 'Vencido'
  };
  return mapa[s] || s;
};

const formatoFecha = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  } catch {return iso;}
};

const formatoDuracion = (secs: number | null) => {
  if (!secs) return '—';
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

const formatoTarifa = (valor: ViajeDesdeApi['finalFare']) =>
  valor != null && Number.isFinite(Number(valor)) ? `Bs ${Number(valor).toFixed(2)}` : '—';

const formatoDistancia = (valor: ViajeDesdeApi['distance']) =>
  valor != null && Number.isFinite(Number(valor)) ? `${(Number(valor) / 1000).toFixed(1)} km` : '—';

// ─── Filters config ───────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Completado', value: 'completado' },
  { label: 'En curso', value: 'en_curso' },
  { label: 'Cancelado', value: 'cancelado' },
] as const;

type ViajeEstado = typeof FILTERS[number]['value'];


// ─── Screen ───────────────────────────────────────────────────────────────────
const AdministradorViajesPantalla: React.FC<Propiedades> = ({ navigation: navegacion, route }) => {
  const { passengerId, driverId } = route.params ?? {};
  const [viajes, establecerViajes] = usarEstado<ViajeDesdeApi[]>([]);
  const [total, establecerTotal] = usarEstado(0);
  const [pagina, establecerPagina] = usarEstado(0);
  const [cargando, establecerCargando] = usarEstado(true);
  const [cargandoMas, establecerCargandoMas] = usarEstado(false);
  const [renovando, establecerRenovando] = usarEstado(false);
  const [error, establecerError] = usarEstado<string | null>(null);

  const [buscarTexto, establecerBuscarTexto] = usarEstado('');
  const [busquedaVisible, establecerBusquedaVisible] = usarEstado(false);
  const [filtrosVisibles, establecerFiltrosVisibles] = usarEstado(false);
  const [estadoFiltro, establecerEstadoFiltro] = usarEstado<ViajeEstado>('all');


  const Limite = 20;

  const consultarViajes = usarFuncionRetorno(async (opciones: {
    reset?: boolean;isRefresh?: boolean;offset?: number;
  } = {}) => {
    const { reset: restablecer = false, isRefresh: esRenovar = false, offset: desplazamiento = 0 } = opciones;

    if (esRenovar) {establecerRenovando(true);} else
    if (desplazamiento === 0) {establecerCargando(true);} else
    {establecerCargandoMas(true);}
    establecerError(null);

    try {
      const parametros: Record<string, string | number> = { limit: Limite, offset: desplazamiento };
      if (estadoFiltro !== 'all') {parametros.status = estadoFiltro;}
      if (passengerId) parametros.passengerId = passengerId;
      if (driverId) parametros.driverId = driverId;

      const datos = await api.obtener<{rides: ViajeDesdeApi[];total: number;}>('/administracion/viajes', { params: parametros });

      if (restablecer || desplazamiento === 0) {
        establecerViajes(datos.rides || []);
      } else {
        establecerViajes((anterior) => [...anterior, ...(datos.rides || [])]);
      }
      establecerTotal(datos.total || 0);
      establecerPagina(desplazamiento / Limite);
    } catch (err: any) {
      const detalle = err?.data?.error || err?.data?.message || err?.statusText || 'Error de conexión';
      establecerError(`${err?.status ?? ''} ${detalle}`);
    } finally {
      establecerCargando(false);
      establecerRenovando(false);
      establecerCargandoMas(false);
    }
  }, [estadoFiltro, passengerId, driverId]);

  usarEfecto(() => {consultarViajes({ reset: true });}, [consultarViajes]);

  const manejarEstadoFiltro = (estado: ViajeEstado) => {
    if (estado === estadoFiltro) return;
    establecerCargando(true);
    establecerViajes([]);
    establecerTotal(0);
    establecerEstadoFiltro(estado);
  };

  const manejarCargarMas = () => {
    if (cargando || renovando || cargandoMas || viajes.length >= total) return;
    const siguienteDesplazamiento = (pagina + 1) * Limite;
    consultarViajes({ offset: siguienteDesplazamiento });
  };

  // Client-side search on loaded rides
  const mostrado = viajes.filter((r) => {
    if (!buscarTexto.trim()) return true;
    const q = buscarTexto.trim().toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      (r.passenger?.name || '').toLowerCase().includes(q) ||
      (r.driver?.name || '').toLowerCase().includes(q) ||
      (r.pickup_address || '').toLowerCase().includes(q) ||
      (r.dropoff_address || '').toLowerCase().includes(q));

  });

  return (
    <SeguraZonaVista style={s.container}>
      <EstadoBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ── Header ── */}
      <Vista style={s.header}>
        <PulsableOpacidad onPress={() => navegacion.goBack()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Cerrar gestión de viajes">
          <X size={24} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={s.headerTitle} numberOfLines={1}>
          {driverId ? 'Viajes del conductor' : passengerId ? 'Viajes del pasajero' : 'Gestión de viajes'}
        </Texto>
        <PulsableOpacidad
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel={busquedaVisible ? 'Cerrar búsqueda' : 'Buscar viajes'}
          accessibilityState={{ expanded: busquedaVisible }}
          onPress={() => {
            if (busquedaVisible) establecerBuscarTexto('');
            establecerBusquedaVisible(!busquedaVisible);
          }}>
          <Search size={20} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <PulsableOpacidad
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Filtrar viajes"
          accessibilityState={{ expanded: filtrosVisibles, disabled: cargando || cargandoMas || renovando }}
          disabled={cargando || cargandoMas || renovando}
          onPress={() => establecerFiltrosVisibles(true)}>
          <Menu size={22} color={estadoFiltro === 'all' ? C.text : C.primary} strokeWidth={2.8} />
        </PulsableOpacidad>
      </Vista>

      {/* ── Search ── */}
      {busquedaVisible && <Vista style={s.searchWrap}>
        <Search size={15} color={C.textMuted} />
        <TextoEntrada
          style={s.searchInput}
          placeholder="Buscar viajes cargados"
          accessibilityLabel="Buscar viajes cargados por ID, pasajero, conductor o dirección"
          autoFocus
          returnKeyType="search"
          placeholderTextColor={C.textMuted}
          value={buscarTexto}
          onChangeText={establecerBuscarTexto} />
        {!!buscarTexto && (
          <PulsableOpacidad style={s.backBtn} onPress={() => establecerBuscarTexto('')}
            accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
            <X size={25} color={C.primary} />
          </PulsableOpacidad>
        )}

      </Vista>}

      <Modal visible={filtrosVisibles} transparent animationType="fade" onRequestClose={() => establecerFiltrosVisibles(false)}>
        <Vista style={s.filterOverlay}>
          <PulsableOpacidad style={EstiloHoja.absoluteFill} onPress={() => establecerFiltrosVisibles(false)}
            accessibilityRole="button" accessibilityLabel="Cerrar filtros" />
          <Vista style={s.filterMenu}>
            <Texto style={s.filterTitle}>Mostrar viajes</Texto>
            <DesplazableVista>
              {FILTERS.map(f => (
                <PulsableOpacidad key={f.value} style={s.filterBtn} accessibilityRole="button"
                  accessibilityState={{ selected: estadoFiltro === f.value }}
                  onPress={() => {
                    establecerFiltrosVisibles(false);
                    manejarEstadoFiltro(f.value);
                  }}>
                  <Texto style={s.filterTxt}>{f.label}</Texto>
                  {estadoFiltro === f.value && <Check size={18} color={C.primary} />}
                </PulsableOpacidad>
              ))}
            </DesplazableVista>
          </Vista>
        </Vista>
      </Modal>

      {/* ── Error ── */}
      {error &&
      <PulsableOpacidad style={s.errorBanner} onPress={() => consultarViajes({ reset: true })} accessibilityRole="button">
          <Texto style={s.errorTxt}>{error} — Toca para reintentar</Texto>
        </PulsableOpacidad>
      }

      {/* ── List ── */}
      {cargando ?
      <Vista style={s.centered}>
          <ActividadIndicador size="large" color={C.primary} />
          <Texto style={s.loadingTxt}>Cargando viajes…</Texto>
        </Vista> :

      <DesplazableVista
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
        <RenovarControl
          refreshing={renovando}
          onRefresh={() => consultarViajes({ reset: true, isRefresh: true })}
          colors={[C.primary]} />

        }
        keyboardShouldPersistTaps="handled">

          {!error && (
            <Texto style={s.resultCount}>
              {buscarTexto.trim() ? `${mostrado.length} coincidencias en ${viajes.length} viajes cargados` : `${total} ${total === 1 ? 'viaje' : 'viajes'}`}
              {estadoFiltro !== 'all' ? ` · ${estadoEtiqueta(estadoFiltro)}` : ''}
            </Texto>
          )}

          {mostrado.length === 0 && !error &&
        <Vista style={s.empty}>
              <Texto style={s.emptyTxt}>No hay viajes con este filtro.</Texto>
            </Vista>
        }

          {mostrado.map((viaje) =>
        <PulsableOpacidad
          key={viaje.id}
          style={s.card}
          onPress={() => navegacion.navigate('AdminRideDetails', { rideId: viaje.id })}
          activeOpacity={0.75} accessibilityRole="button">

              {/* Card header */}
              <Vista style={s.cardHead}>
                <Vista style={s.cardMeta}>
                  <Texto style={s.cardId} numberOfLines={1}>#{viaje.id.slice(0, 8).toUpperCase()}</Texto>
                  <Texto style={s.cardDate}>{formatoFecha(viaje.createdAt)}</Texto>
                </Vista>
                <Vista style={s.statusChip}>
                  <Vista style={[s.statusDot, { backgroundColor: estadoColor(viaje.status) }]} />
                  <Texto style={[s.statusTxt, { color: estadoColor(viaje.status) }]}>{estadoEtiqueta(viaje.status)}</Texto>
                </Vista>
              </Vista>

              {/* Route */}
              <Vista style={s.cardBody}>
                <Vista style={s.routeRow}>
                  <PasajeroMapaIcono size={25} bare />
                  <Texto style={s.routeTxt} numberOfLines={1}>{viaje.pickup_address || '—'}</Texto>
                </Vista>
                <Vista style={s.routeLine} />
                <Vista style={s.routeRow}>
                  <DestinoIndicadorIcono size={25} bare />
                  <Texto style={s.routeTxt} numberOfLines={1}>{viaje.dropoff_address || '—'}</Texto>
                </Vista>
              </Vista>

              {/* Participants + fare */}
              <Vista style={s.cardFoot}>
                <Vista style={{ flex: 1, gap: 2 }}>
                  <Vista style={s.personRow}><User size={25} color={C.primary} /><Texto style={s.participantTxt} numberOfLines={1}>{viaje.passenger?.name || 'Sin pasajero'}</Texto></Vista>
                  <Vista style={s.personRow}><Car size={25} color={C.primary} /><Texto style={s.participantTxt} numberOfLines={1}>{viaje.driver?.name || 'Sin conductor'}</Texto></Vista>
                </Vista>
                <Vista style={{ alignItems: 'flex-end', gap: 2, maxWidth: '43%' }}>
                  <Texto style={s.fare}>{formatoTarifa(viaje.finalFare)}</Texto>
                  <Texto style={s.metaTxt}>{formatoDistancia(viaje.distance)} · {formatoDuracion(viaje.duration)}</Texto>
                </Vista>
              </Vista>
            </PulsableOpacidad>
        )}

          {!error && viajes.length < total && (
            <PulsableOpacidad style={s.loadMoreWrap} onPress={manejarCargarMas} disabled={cargandoMas || renovando}
              accessibilityRole="button" accessibilityLabel="Cargar más viajes">
              {cargandoMas ? <ActividadIndicador size="small" color={C.primary} />
                : <Texto style={s.loadMoreText}>Cargar más viajes</Texto>}
            </PulsableOpacidad>
          )}
        </DesplazableVista>
      }

    </SeguraZonaVista>);

};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = EstiloHoja.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingLeft: 14, paddingRight: 4, minHeight: 48, borderRadius: 24, backgroundColor: '#F5F5F7' },
  searchInput: { flex: 1, minHeight: 48, paddingVertical: 8, fontSize: 15, color: C.text },

  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'flex-end', paddingTop: 65, paddingRight: 20 },
  filterMenu: { width: 245, maxHeight: '85%', backgroundColor: C.white, borderRadius: 18, padding: 12, elevation: 8 },
  filterTitle: { fontSize: 13, fontWeight: '600', color: C.textMuted, paddingHorizontal: 12, paddingVertical: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 44 },
  filterTxt: { fontSize: 15, color: C.text, fontWeight: '500' },

  errorBanner: { margin: 14, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt: { fontSize: 13, color: C.error, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: C.textMuted },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  resultCount: { fontSize: 13, color: C.textMuted, marginBottom: 12 },

  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: C.textMuted },

  card: { backgroundColor: C.white, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cardMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cardId: { alignSelf: 'flex-start', overflow: 'hidden', backgroundColor: '#000000', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 15, fontWeight: '600', color: C.white },
  cardDate: { fontSize: 13, color: C.textMuted, flexShrink: 1 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 13, fontWeight: '600' },

  cardBody: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeTxt: { flex: 1, fontSize: 15, color: C.text },
  routeLine: { width: 1, height: 10, backgroundColor: C.border, marginLeft: 12 },

  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantTxt: { flex: 1, fontSize: 15, color: C.text },
  fare: { fontSize: 16, fontWeight: '600', color: C.text },
  metaTxt: { fontSize: 12, color: C.textMuted, textAlign: 'right' },

  loadMoreText: { fontSize: 15, color: C.text, fontWeight: '500' },
  loadMoreWrap: { minHeight: 48, borderRadius: 24, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' },

});

export default AdministradorViajesPantalla;


