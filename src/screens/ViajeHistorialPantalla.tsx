import React, { useCallback as usarFuncionRetorno, useEffect as usarEfecto, useState as usarEstado } from 'react';
import {
  ActivityIndicator as ActividadIndicador,
  FlatList as FlatLista,
  RefreshControl as RenovarControl,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion } from '@react-navigation/native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { viajesServicio } from "../services/viajes.servicio";
import { Menu, X } from 'lucide-react-native';
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";

const T = {
  bg: '#FFFFFF',
  white: '#FFFFFF',
  ink: '#2D2D2D',
  inkMid: '#666666',
  inkLight: '#999999',
  accent: '#7C3AED',
  accentSoft: '#F8F5FF',
  success: '#10B981',
  successSoft: '#ECFDF5',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  border: '#F0F0F0'
};

type FiltrarEstado = 'all' | 'completado' | 'cancelado';

const ViajeHistorialPantalla = () => {
  const navegacion = usarNavegacion();
  const { user: usuario, isDriverMode: esConductorModo } = usarAutenticacion();

  const [viajes, establecerViajes] = usarEstado<any[]>([]);
  const [esCargando, establecerEsCargando] = usarEstado(true);
  const [esRenovando, establecerEsRenovando] = usarEstado(false);
  const [tieneError, establecerTieneError] = usarEstado(false);
  const [filtro, establecerFiltro] = usarEstado<FiltrarEstado>('all');
  const [menuVisible, establecerMenuVisible] = usarEstado(false);

  const cargarHistorial = usarFuncionRetorno(
    async (renovar = false) => {
      if (!usuario?.id) return;
      renovar ? establecerEsRenovando(true) : establecerEsCargando(true);
      establecerTieneError(false);
      try {
        const respuesta: any = await viajesServicio.obtenerHistorialViajes(usuario.id);
        const datos: any[] = respuesta?.rides ?? respuesta?.data ?? [];
        establecerViajes(Array.isArray(datos) ? datos : []);
      } catch {
        establecerTieneError(true);
      } finally {
        establecerEsCargando(false);
        establecerEsRenovando(false);
      }
    },
    [usuario?.id]
  );

  usarEfecto(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const filtrado = viajes.filter((r) =>
  filtro === 'all' ? true : r.status === filtro
  );

  const cantidad = (s: string) => viajes.filter((r) => r.status === s).length;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatoFecha = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const ahora = new Date();
    const diferencia = Math.floor((ahora.getTime() - d.getTime()) / 86400000);
    const tiempo = d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit'
    });
    if (diferencia === 0) return `Hoy · ${tiempo}`;
    if (diferencia === 1) return `Ayer · ${tiempo}`;
    return (
      d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) +
      ` · ${tiempo}`);

  };

  const formatoDistancia = (m?: number) => {
    if (!m) return '—';
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  };

  const estadoConfiguracion = (estado: string) => {
    if (estado === 'completado')
    return { label: 'Completado', color: T.success, bg: T.successSoft };
    if (estado === 'cancelado')
    return { label: 'Cancelado', color: T.danger, bg: T.dangerSoft };
    return { label: estado, color: T.inkMid, bg: T.border };
  };

  // ── Card ─────────────────────────────────────────────────────────────────

  const representarTarjeta = ({ item: elemento }: {item: any;}) => {
    const sc = estadoConfiguracion(elemento.status);
    const counterpart = esConductorModo ?
    elemento.passenger?.name ?? 'Pasajero' :
    elemento.driver?.user?.name ??
    elemento.driver?.User?.name ??
    'Sin conductor asignado';
    const tarifaEtiqueta = esConductorModo ? 'Ganado' : 'Pagado';
    const tarifa = parseFloat(elemento.finalFare ?? elemento.final_fare ?? 0);

    return (
      <Vista style={s.card}>
        {/* Estado + fecha */}
        <Vista style={s.cardTop}>
          <Vista style={[s.badge, { backgroundColor: sc.bg }]}>
            <Texto style={[s.badgeText, { color: sc.color }]}>{sc.label}</Texto>
          </Vista>
          <Texto style={s.date}>{formatoFecha(elemento.createdAt)}</Texto>
        </Vista>

        {/* Nombre contraparte */}
        <Texto style={s.counterpart}>{counterpart}</Texto>

        {/* Ruta */}
        <Vista style={s.routeRow}>
          <PasajeroMapaIcono size={28} bare />
          <Texto style={s.routeAddr} numberOfLines={1}>
            {elemento.pickup_address ?? '—'}
          </Texto>
        </Vista>
        <Vista style={s.routeConnector} />
        {[...(elemento.waypoints ?? [])].
        sort((primero, segundo) => primero.sequence - segundo.sequence).
        map((parada, indice) =>
        <React.Fragment key={`${parada.sequence}-${indice}`}>
              <Vista style={s.routeRow}>
                <ParadaMapaIcon number={indice + 1} size={28} />
                <Texto style={s.routeAddr} numberOfLines={1}>{parada.address}</Texto>
              </Vista>
              <Vista style={s.routeConnector} />
            </React.Fragment>
        )}
        <Vista style={s.routeRow}>
          <DestinoIndicadorIcon size={28} bare />
          <Texto style={s.routeAddr} numberOfLines={1}>
            {elemento.dropoff_address ?? '—'}
          </Texto>
        </Vista>

        {/* Stats */}
        <Vista style={s.stats}>
          <Vista style={s.stat}>
            <Texto style={s.statLabel}>Distancia</Texto>
            <Texto style={s.statVal}>{formatoDistancia(elemento.distance)}</Texto>
          </Vista>
          <Vista style={s.statSep} />
          <Vista style={s.stat}>
            <Texto style={s.statLabel}>{tarifaEtiqueta}</Texto>
            <Texto
              style={[s.statVal, { color: esConductorModo ? T.success : T.ink }]}>

              Bs {tarifa.toFixed(2)}
            </Texto>
          </Vista>
        </Vista>
      </Vista>);

  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SeguraZonaVista style={s.root} edges={['top']}>
      {/* Header */}
      <Vista style={s.header}>
        <PulsableOpacidad
          style={s.backBtn}
          onPress={() => navegacion.goBack()}
          activeOpacity={0.7}>

          <X size={24} color={T.accent} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={s.title}>Mis Viajes</Texto>
        <PulsableOpacidad
          style={s.menuBtn}
          onPress={() => establecerMenuVisible(!menuVisible)}
          activeOpacity={0.7}>

          <Menu size={24} color={T.accent} strokeWidth={2.8} />
        </PulsableOpacidad>
      </Vista>

      {/* Menu Hamburguesa Desplegable (Filtros) */}
      {menuVisible &&
      <PulsableOpacidad
        style={s.overlay}
        activeOpacity={1}
        onPress={() => establecerMenuVisible(false)}>

          <Vista style={s.dropdown}>
            {(['all', 'completado', 'cancelado'] as FiltrarEstado[]).map((f) =>
          <PulsableOpacidad
            key={f}
            style={[s.dropdownItem, filtro === f && s.dropdownItemActive]}
            onPress={() => {
              establecerFiltro(f);
              establecerMenuVisible(false);
            }}
            activeOpacity={0.7}>

                <Texto style={[s.dropdownText, filtro === f && s.dropdownTextActive]}>
                  {f === 'all' ?
              `Todos (${viajes.length})` :
              f === 'completado' ?
              `Completados (${cantidad('completado')})` :
              `Cancelados (${cantidad('cancelado')})`}
                </Texto>
              </PulsableOpacidad>
          )}
          </Vista>
        </PulsableOpacidad>
      }

      {/* Contenido */}
      {esCargando ?
      <Vista style={s.center}>
          <ActividadIndicador size="large" color={T.accent} />
          <Texto style={s.centerText}>Cargando viajes...</Texto>
        </Vista> :
      tieneError ?
      <Vista style={s.center}>
          <Texto style={s.emptyIcon}>⚠️</Texto>
          <Texto style={s.emptyTitle}>No se pudo cargar el historial</Texto>
          <PulsableOpacidad
          style={s.retryBtn}
          onPress={() => cargarHistorial()}
          activeOpacity={0.8}>

            <Texto style={s.retryText}>Reintentar</Texto>
          </PulsableOpacidad>
        </Vista> :

      <FlatLista
        data={filtrado}
        keyExtractor={(elemento) => elemento.id}
        renderItem={representarTarjeta}
        contentContainerStyle={s.list}
        refreshControl={
        <RenovarControl
          refreshing={esRenovando}
          onRefresh={() => cargarHistorial(true)}
          colors={[T.accent]}
          tintColor={T.accent} />

        }
        ListEmptyComponent={
        <Vista style={s.center}>
              <Texto style={s.emptyIcon}>📭</Texto>
              <Texto style={s.emptyTitle}>Sin viajes</Texto>
              <Texto style={s.emptySub}>
                {filtro === 'all' ?
            'Los viajes que realices aparecerán aquí' :
            filtro === 'completado' ?
            'No hay viajes completados aún' :
            'No hay viajes cancelados'}
              </Texto>
            </Vista>
        } />

      }
    </SeguraZonaVista>);

};

const s = EstiloHoja.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: T.white
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '700', color: T.ink },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 6,
    width: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  dropdownItemActive: {
    backgroundColor: T.accentSoft
  },
  dropdownText: {
    fontSize: 14,
    color: T.ink,
    fontWeight: '500'
  },
  dropdownTextActive: {
    color: T.accent,
    fontWeight: '600'
  },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: T.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 12, color: T.inkLight },
  counterpart: {
    fontSize: 16,
    fontWeight: '700',
    color: T.ink,
    marginBottom: 12
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeAddr: {
    flex: 1,
    fontSize: 13,
    color: T.inkMid,
    fontWeight: '500'
  },
  routeConnector: {
    width: 1,
    height: 10,
    backgroundColor: T.border,
    marginLeft: 13.5,
    marginVertical: 2
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: T.border
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: T.inkLight, marginBottom: 3 },
  statVal: { fontSize: 15, fontWeight: '700', color: T.ink },
  statSep: { width: 1, height: 32, backgroundColor: T.border },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12
  },
  centerText: { fontSize: 14, color: T.inkMid, marginTop: 8 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.ink },
  emptySub: {
    fontSize: 13,
    color: T.inkLight,
    textAlign: 'center',
    paddingHorizontal: 32
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: T.accent
  },
  retryText: { fontSize: 14, fontWeight: '700', color: T.white }
});

export default ViajeHistorialPantalla;
