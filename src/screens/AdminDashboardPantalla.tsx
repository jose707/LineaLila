// src/screens/AdminDashboardPantalla.tsx
import React, { useState as usarEstado, useCallback as usarFuncionRetorno, useEffect as usarEfecto } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  StatusBar as EstadoBar,
  Alert,
  RefreshControl as RenovarControl } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import {
  Users as Usuarios,
  Car,
  MapPin as MapaPin,
  BarChart2,
  CreditCard,
  ClipboardList as ClipboardLista,
  ChevronRight as ChevronDerecha,
  LogOut as RegistroOut,
  TriangleAlert,
  ArrowUpRight as ArrowUpDerecha } from
'lucide-react-native';
import { NativeStackNavigationProp as NativoPilaNavegacionProp } from '@react-navigation/native-stack';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import api from "../services/api.cliente";
import ResplandorEmergencia from '../components/ResplandorEmergencia';
import { usarAlertasEmergencia } from '../components/CentralEmergencias';

const obtenerHoraBolivia = () => Number(new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  hour: 'numeric',
  hourCycle: 'h23'
}).format(new Date()));

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  bg: '#FFFFFF',
  surface: '#F7F7F9',
  surfaceHigh: '#F3F3F3',
  border: '#EBEBEB',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#777777',
  success: '#16A34A',
  successLight: '#DCFCE7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  white: '#FFFFFF'
};

type NavPropiedad = NativoPilaNavegacionProp<RaizPilaParametroLista, 'AdminDashboard'>;
interface Propiedades {navigation: NavPropiedad;}

interface DashboardEstadisticas {
  totalUsers: number;
  totalRides: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingApprovals: number;
}

// ─── StatItem ─────────────────────────────────────────────────────────────────
function StatElemento({
  label: etiqueta,
  value: valor,
  icon: Icono,
  format: formatear = 'number',
  last: ultimo = false,
  loading: cargando = false







}: {label: string;value: number;icon: React.ComponentType<any>;format?: 'number' | 'currency';last?: boolean;loading?: boolean;}) {
  const mostrar =
  formatear === 'currency' ?
  `BOB ${valor.toLocaleString()}` :
  valor.toLocaleString();
  return (
    <Vista style={[si.wrap, !ultimo && si.divider]}>
      <Vista style={si.row}>
        <Icono size={13} color={C.primary} strokeWidth={2} />
        <Texto style={si.label}>{etiqueta}</Texto>
      </Vista>
      {cargando ? <Vista style={si.skeleton} /> : <Texto style={si.value}>{mostrar}</Texto>}
    </Vista>);

}
const si = EstiloHoja.create({
  wrap: { flex: 1, paddingVertical: 18, paddingHorizontal: 17, gap: 8 },
  divider: { borderRightWidth: 1, borderRightColor: C.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  value: { fontSize: 27, fontWeight: '700', color: C.text, letterSpacing: -0.8 },
  skeleton: { width: 60, height: 26, borderRadius: 6, backgroundColor: C.surfaceHigh }
});

// ─── NavRow ───────────────────────────────────────────────────────────────────
function NavFila({
  label: etiqueta, description: descripcion, icon: Icono, onPress: alPulsar, badge: insignia



}: {label: string;description: string;icon: React.ComponentType<any>;onPress: () => void;badge?: number;}) {
  return (
    <PulsableOpacidad style={nr.row} onPress={alPulsar} activeOpacity={0.7}>
      <Vista style={nr.iconWrap}>
        <Icono size={25} color={C.primary} strokeWidth={2} />
      </Vista>
      <Vista style={{ flex: 1 }}>
        <Texto style={nr.label}>{etiqueta}</Texto>
        <Texto style={nr.desc}>{descripcion}</Texto>
      </Vista>
      {insignia !== undefined && insignia > 0 &&
      <Vista style={nr.badge}><Texto style={nr.badgeTxt}>{insignia}</Texto></Vista>
      }
      <ChevronDerecha size={15} color={C.textMuted} strokeWidth={2} />
    </PulsableOpacidad>);

}
const nr = EstiloHoja.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 9, gap: 13 },
  iconWrap: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 3 },
  desc: { fontSize: 12, color: C.textSub },
  badge: { backgroundColor: C.errorLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, minWidth: 24, alignItems: 'center', marginRight: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: C.error }
});

function SeccionEtiqueta({ text: texto }: {text: string;}) {
  return (
    <Texto style={{ fontSize: 13, fontWeight: '600', color: C.textSub, letterSpacing: 0.5, marginBottom: 12 }}>
      {texto}
    </Texto>);

}

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdministradorPanelPantalla: React.FC<Propiedades> = ({ navigation: navegacion }) => {
  const { logout: salir, user: administrador } = usarAutenticacion();
  const emergencias = usarAlertasEmergencia();
  const hayEmergencia = emergencias.consultada && emergencias.alertas.length > 0;
  const [horaSaludo, establecerHoraSaludo] = usarEstado(obtenerHoraBolivia);
  const saludo = horaSaludo < 12 ? 'Buenos días' : horaSaludo < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombreAdministrador = administrador?.nombre?.trim();

  usarEfecto(() => {
    const reloj = setInterval(() => establecerHoraSaludo(obtenerHoraBolivia()), 60_000);
    return () => clearInterval(reloj);
  }, []);

  const [estadisticas, establecerEstadisticas] = usarEstado<DashboardEstadisticas>({
    totalUsers: 0,
    totalRides: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    pendingApprovals: 0
  });
  const [cargando, establecerCargando] = usarEstado(true);
  const [renovando, establecerRenovando] = usarEstado(false);
  const [error, establecerError] = usarEstado<string | null>(null);
  const [ultimoActualizado, establecerUltimoActualizado] = usarEstado<string | null>(null);

  const consultarEstadisticas = usarFuncionRetorno(async (esRenovar = false) => {
    if (esRenovar) {establecerRenovando(true);} else {establecerCargando(true);}
    establecerError(null);

    try {
      const [analiticaDatos, pendienteDatos] = await Promise.all([
      api.obtener<{analytics: any;}>('/administracion/analitica'),
      api.obtener<{total: number;}>('/administracion/conductores/pendientes?limit=1')]
      );

      const primero = analiticaDatos?.analytics || {};
      establecerEstadisticas({
        totalUsers: Number(primero.totalUsers ?? 0),
        totalRides: Number(primero.totalRides ?? 0),
        totalRevenue: Number(primero.totalRevenue ?? 0),
        activeDrivers: Number(primero.totalDrivers ?? 0),
        pendingApprovals: Number(pendienteDatos?.total ?? 0)
      });
      establecerUltimoActualizado(new Date().toLocaleTimeString());
    } catch (err: any) {
      // api.client throws plain objects: { status, statusText, data }
      // NOT Error instances, so err.message may be undefined
      const estado = err?.status;
      const detalle = err?.data?.error || err?.data?.message || err?.statusText || err?.message;
      console.error('[AdminDashboard] fetch error — status:', estado, '| detail:', detalle);
      console.error('[AdminDashboard] full error object:', JSON.stringify(err));

      if (estado === 403) {
        establecerError('Sin permisos de administrador. Vuelve a iniciar sesión.');
      } else if (estado === 401) {
        establecerError('Sesión expirada. Vuelve a iniciar sesión.');
      } else {
        establecerError(`Error ${estado ?? ''}: ${detalle ?? 'No se pudieron cargar los datos'}. Toca para reintentar.`);
      }
    } finally {
      establecerCargando(false);
      establecerRenovando(false);
    }
  }, []);

  usarEfecto(() => {consultarEstadisticas();}, [consultarEstadisticas]);

  const manejarSalir = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Cerrar sesión',
      style: 'destructive',
      onPress: async () => {try {await salir();} catch (e) {console.error(e);}}
    }]
    );
  };

  return (
    <SeguraZonaVista style={s.container}>
      <EstadoBar barStyle="dark-content" backgroundColor={C.bg} />
      {hayEmergencia && <ResplandorEmergencia />}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Vista style={s.header}>
        <Vista style={{ flex: 1 }}>
          <Texto style={s.greeting}>{nombreAdministrador ? `${saludo}, ${nombreAdministrador}` : saludo}</Texto>
          <Texto style={s.title}>Panel de administración</Texto>
        </Vista>
        <Vista style={s.headerActions}>
          <PulsableOpacidad style={s.iconBtn} onPress={manejarSalir}>
            <RegistroOut size={17} color={C.error} strokeWidth={1.8} />
          </PulsableOpacidad>
        </Vista>
      </Vista>

      {hayEmergencia && (
        <PulsableOpacidad style={s.bannerEmergencia} accessibilityRole="button" accessibilityLiveRegion="polite"
          accessibilityHint="Abre los detalles de la emergencia" onPress={() => navegacion.navigate('AdminEmergencias')}>
          <TriangleAlert size={23} color="#FFFFFF" />
          <Texto style={s.textoEmergencia}>Se ha recibido un aviso de emergencia</Texto>
          <ChevronDerecha size={20} color="#FFFFFF" />
        </PulsableOpacidad>
      )}

      <DesplazableVista
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
        <RenovarControl
          refreshing={renovando}
          onRefresh={() => consultarEstadisticas(true)}
          colors={['#7514C5']} />

        }>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error &&
        <PulsableOpacidad style={[s.banner, s.errorBanner]} onPress={() => consultarEstadisticas()} activeOpacity={0.8}>
            <Vista style={[s.bannerDot, s.errorDot]} />
            <Texto style={[s.bannerTxt, s.errorTxt]}>{error}</Texto>
            <ChevronDerecha size={17} color={C.error} strokeWidth={2} />
          </PulsableOpacidad>
        }

        {/* ── Pending banner ───────────────────────────────────────────── */}
        {!error && estadisticas.pendingApprovals > 0 &&
        <PulsableOpacidad
          style={s.banner}
          onPress={() => navegacion.navigate('AdminDriverRegistration')}
          activeOpacity={0.8}>

            <Vista style={s.bannerDot} />
            <Texto style={s.bannerTxt}>
              {estadisticas.pendingApprovals} solicitudes de conductores pendientes
            </Texto>
            <ChevronDerecha size={17} color={C.primary} strokeWidth={2} />
          </PulsableOpacidad>
        }

        {/* ── Resumen General ──────────────────────────────────────────── */}
        <SeccionEtiqueta text="RESUMEN GENERAL" />
        <Vista style={s.statsBlock}>
          <Vista style={s.statsRow}>
            <StatElemento label="Usuarios" value={estadisticas.totalUsers} icon={Usuarios} loading={cargando} />
            <StatElemento label="Conductores" value={estadisticas.activeDrivers} icon={Car} loading={cargando} last />
          </Vista>
          <Vista style={s.statsDivider} />
          <Vista style={s.statsRow}>
            <StatElemento label="Viajes totales" value={estadisticas.totalRides} icon={MapaPin} loading={cargando} />
            <StatElemento label="Pendientes" value={estadisticas.pendingApprovals} icon={ClipboardLista} loading={cargando} last />
          </Vista>
        </Vista>

        {/* ── Ingresos ─────────────────────────────────────────────────── */}
        <Vista style={{ height: 24 }} />
        <SeccionEtiqueta text="INGRESOS" />
        <Vista style={s.revenueBlock}>
          <Vista style={s.revenueItem}>
            <Texto style={s.revenueLabel}>Total acumulado</Texto>
            {cargando ?
            <Vista style={s.revenueSkeleton} /> :
            <Texto style={s.revenueValue}>BOB {estadisticas.totalRevenue.toLocaleString()}</Texto>
            }
          </Vista>
          <Vista style={s.revenueSep} />
          <Vista style={s.revenueItem}>
            <Texto style={s.revenueLabel}>Viajes completados</Texto>
            {cargando ?
            <Vista style={s.revenueSkeleton} /> :
            <Texto style={s.revenueValue}>{estadisticas.totalRides.toLocaleString()}</Texto>
            }
          </Vista>
          <PulsableOpacidad style={s.revenueBtn} onPress={() => navegacion.navigate('AdminPayments')} activeOpacity={0.7}>
            <ArrowUpDerecha size={14} color={C.primary} strokeWidth={2.2} />
          </PulsableOpacidad>
        </Vista>

        {ultimoActualizado && !cargando &&
        <Texto style={s.updatedAt}>Actualizado a las {ultimoActualizado}</Texto>
        }

        {/* ── Gestión ──────────────────────────────────────────────────── */}
        <Vista style={{ height: 28 }} />
        <SeccionEtiqueta text="GESTIÓN" />
        <NavFila label="Solicitudes de conductores" description="Revisar y aprobar solicitudes" icon={ClipboardLista} badge={estadisticas.pendingApprovals} onPress={() => navegacion.navigate('AdminDriverRegistration')} />
        <NavFila label="Gestión de usuarios" description="Ver, editar y administrar usuarios" icon={Usuarios} onPress={() => navegacion.navigate('AdminUsers')} />
        <NavFila label="Gestión de conductores" description="Consultar permisos, vehículos y comisiones" icon={Car} onPress={() => navegacion.navigate('AdminDrivers')} />
        <NavFila label="Gestión de viajes" description="Monitorear viajes y disputas" icon={MapaPin} onPress={() => navegacion.navigate('AdminRides')} />
        <NavFila label="Pagos e ingresos" description="Ver transacciones y pagos" icon={CreditCard} onPress={() => navegacion.navigate('AdminPayments')} />
        <NavFila label="Análisis y reportes" description="Ver estadísticas detalladas" icon={BarChart2} onPress={() => navegacion.navigate('AdminAnalytics')} />
      </DesplazableVista>
    </SeguraZonaVista>);

};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = EstiloHoja.create({
  container: { flex: 1, backgroundColor: C.bg },
  bannerEmergencia: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, borderRadius: 12, padding: 14, backgroundColor: '#B91C1C' },
  textoEmergencia: { flex: 1, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18
  },
  greeting: { fontSize: 11, color: C.primary, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4, textTransform: 'uppercase' },
  title: { fontSize: 23, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    position: 'absolute', top: 7, right: 7,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.error, borderWidth: 1.5, borderColor: C.white
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primaryLight, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    gap: 10, marginBottom: 20,
    borderWidth: 0
  },
  bannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  bannerTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  errorBanner: { backgroundColor: C.errorLight },
  errorDot: { backgroundColor: C.error },
  errorTxt: { color: C.error },

  statsBlock: {
    backgroundColor: C.surface, borderRadius: 18,
    overflow: 'hidden'
  },
  statsRow: { flexDirection: 'row' },
  statsDivider: { height: 1, backgroundColor: C.border },

  revenueBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 18,
    paddingHorizontal: 17, paddingVertical: 20
  },
  revenueItem: { flex: 1 },
  revenueLabel: { fontSize: 12, color: C.textSub, fontWeight: '500', marginBottom: 7 },
  revenueValue: { fontSize: 22, fontWeight: '700', color: C.primary, letterSpacing: -0.8 },
  revenueSkeleton: { width: 80, height: 22, borderRadius: 6, backgroundColor: C.surfaceHigh },
  revenueSep: { width: 1, height: 34, backgroundColor: C.border, marginHorizontal: 12 },
  revenueBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: 16
  },

  updatedAt: { fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 8 }
});

export default AdministradorPanelPantalla;
