// src/screens/AdminDashboardScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Users,
  Car,
  MapPin,
  BarChart2,
  CreditCard,
  ClipboardList,
  ChevronRight,
  LogOut,
  Bell,
  ArrowUpRight,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api.client';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceHigh: '#F3F3F3',
  border: '#EBEBEB',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#ADADAD',
  success: '#16A34A',
  successLight: '#DCFCE7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  white: '#FFFFFF',
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;
interface Props { navigation: NavProp; }

interface DashboardStats {
  totalUsers: number;
  totalRides: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingApprovals: number;
}

// ─── StatItem ─────────────────────────────────────────────────────────────────
function StatItem({
  label,
  value,
  icon: Icon,
  format = 'number',
  last = false,
  loading = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<any>;
  format?: 'number' | 'currency';
  last?: boolean;
  loading?: boolean;
}) {
  const display =
    format === 'currency'
      ? `BOB ${value.toLocaleString()}`
      : value.toLocaleString();
  return (
    <View style={[si.wrap, !last && si.divider]}>
      <View style={si.row}>
        <Icon size={13} color={C.primary} strokeWidth={2} />
        <Text style={si.label}>{label}</Text>
      </View>
      {loading ? <View style={si.skeleton} /> : <Text style={si.value}>{display}</Text>}
    </View>
  );
}
const si = StyleSheet.create({
  wrap: { flex: 1, paddingVertical: 20, paddingHorizontal: 20, gap: 8 },
  divider: { borderRightWidth: 1, borderRightColor: C.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  value: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -1 },
  skeleton: { width: 60, height: 26, borderRadius: 6, backgroundColor: C.surfaceHigh },
});

// ─── NavRow ───────────────────────────────────────────────────────────────────
function NavRow({
  label, description, icon: Icon, onPress, badge,
}: {
  label: string; description: string; icon: React.ComponentType<any>;
  onPress: () => void; badge?: number;
}) {
  return (
    <TouchableOpacity style={nr.row} onPress={onPress} activeOpacity={0.7}>
      <View style={nr.iconWrap}>
        <Icon size={17} color={C.primary} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={nr.label}>{label}</Text>
        <Text style={nr.desc}>{description}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={nr.badge}><Text style={nr.badgeTxt}>{badge}</Text></View>
      )}
      <ChevronRight size={15} color={C.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
}
const nr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: C.border },
  iconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  desc: { fontSize: 12, color: C.textMuted },
  badge: { backgroundColor: C.errorLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, minWidth: 24, alignItems: 'center', marginRight: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: C.error },
});

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginBottom: 12 }}>
      {text}
    </Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { logout } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRides: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError(null);

    try {
      const [analyticsData, pendingData] = await Promise.all([
        api.get<{ analytics: any }>('/admin/analytics'),
        api.get<{ total: number }>('/admin/drivers/pending?limit=1'),
      ]);

      const a = analyticsData?.analytics || {};
      setStats({
        totalUsers: Number(a.totalUsers ?? 0),
        totalRides: Number(a.totalRides ?? 0),
        totalRevenue: Number(a.totalRevenue ?? 0),
        activeDrivers: Number(a.totalDrivers ?? 0),
        pendingApprovals: Number(pendingData?.total ?? 0),
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      // api.client throws plain objects: { status, statusText, data }
      // NOT Error instances, so err.message may be undefined
      const status = err?.status;
      const detail = err?.data?.error || err?.data?.message || err?.statusText || err?.message;
      console.error('[AdminDashboard] fetch error — status:', status, '| detail:', detail);
      console.error('[AdminDashboard] full error object:', JSON.stringify(err));

      if (status === 403) {
        setError('Sin permisos de administrador. Vuelve a iniciar sesión.');
      } else if (status === 401) {
        setError('Sesión expirada. Vuelve a iniciar sesión.');
      } else {
        setError(`Error ${status ?? ''}: ${detail ?? 'No se pudieron cargar los datos'}. Toca para reintentar.`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => { try { await logout(); } catch (e) { console.error(e); } },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>Panel de administración</Text>
          <Text style={s.title}>Gestión Línea Lila</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn}>
            <Bell size={17} color={C.text} strokeWidth={1.8} />
            {stats.pendingApprovals > 0 && <View style={s.dot} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleLogout}>
            <LogOut size={17} color={C.error} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            colors={['#7514C5']}
          />
        }
      >
        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && (
          <TouchableOpacity style={s.banner} onPress={() => fetchStats()} activeOpacity={0.8}>
            <View style={s.bannerDot} />
            <Text style={s.bannerTxt}>{error}</Text>
            <ChevronRight size={13} color={C.error} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* ── Pending banner ───────────────────────────────────────────── */}
        {!error && stats.pendingApprovals > 0 && (
          <TouchableOpacity
            style={s.banner}
            onPress={() => navigation.navigate('AdminDriverRegistration')}
            activeOpacity={0.8}
          >
            <View style={s.bannerDot} />
            <Text style={s.bannerTxt}>
              {stats.pendingApprovals} solicitudes de conductores pendientes
            </Text>
            <ChevronRight size={13} color={C.error} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* ── Resumen General ──────────────────────────────────────────── */}
        <SectionLabel text="RESUMEN GENERAL" />
        <View style={s.statsBlock}>
          <View style={s.statsRow}>
            <StatItem label="Usuarios" value={stats.totalUsers} icon={Users} loading={loading} />
            <StatItem label="Conductores" value={stats.activeDrivers} icon={Car} loading={loading} last />
          </View>
          <View style={s.statsDivider} />
          <View style={s.statsRow}>
            <StatItem label="Viajes totales" value={stats.totalRides} icon={MapPin} loading={loading} />
            <StatItem label="Pendientes" value={stats.pendingApprovals} icon={ClipboardList} loading={loading} last />
          </View>
        </View>

        {/* ── Ingresos ─────────────────────────────────────────────────── */}
        <View style={{ height: 20 }} />
        <SectionLabel text="INGRESOS" />
        <View style={s.revenueBlock}>
          <View style={s.revenueItem}>
            <Text style={s.revenueLabel}>Total acumulado</Text>
            {loading
              ? <View style={s.revenueSkeleton} />
              : <Text style={s.revenueValue}>BOB {stats.totalRevenue.toLocaleString()}</Text>
            }
          </View>
          <View style={s.revenueSep} />
          <View style={s.revenueItem}>
            <Text style={s.revenueLabel}>Viajes completados</Text>
            {loading
              ? <View style={s.revenueSkeleton} />
              : <Text style={s.revenueValue}>{stats.totalRides.toLocaleString()}</Text>
            }
          </View>
          <TouchableOpacity style={s.revenueBtn} onPress={() => navigation.navigate('AdminPayments')} activeOpacity={0.7}>
            <ArrowUpRight size={14} color={C.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {lastUpdated && !loading && (
          <Text style={s.updatedAt}>Actualizado a las {lastUpdated}</Text>
        )}

        {/* ── Gestión ──────────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <SectionLabel text="GESTIÓN" />
        <NavRow label="Solicitudes de conductores" description="Revisar y aprobar solicitudes" icon={ClipboardList} badge={stats.pendingApprovals} onPress={() => navigation.navigate('AdminDriverRegistration')} />
        <NavRow label="Gestión de usuarios" description="Ver, editar y administrar usuarios" icon={Users} onPress={() => navigation.navigate('AdminUsers')} />
        <NavRow label="Gestión de viajes" description="Monitorear viajes y disputas" icon={MapPin} onPress={() => navigation.navigate('AdminRides')} />
        <NavRow label="Pagos e ingresos" description="Ver transacciones y pagos" icon={CreditCard} onPress={() => navigation.navigate('AdminPayments')} />
        <NavRow label="Análisis y reportes" description="Ver estadísticas detalladas" icon={BarChart2} onPress={() => navigation.navigate('AdminAnalytics')} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  greeting: { fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 0.4, marginBottom: 3 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  dot: {
    position: 'absolute', top: 7, right: 7,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.error, borderWidth: 1.5, borderColor: C.white,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.errorLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    gap: 10, marginBottom: 20,
    borderWidth: 1, borderColor: '#FECACA',
  },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.error },
  bannerTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: C.error },

  statsBlock: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  statsRow: { flexDirection: 'row' },
  statsDivider: { height: 1, backgroundColor: C.border },

  revenueBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 20, paddingVertical: 20,
  },
  revenueItem: { flex: 1 },
  revenueLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3, marginBottom: 6 },
  revenueValue: { fontSize: 22, fontWeight: '800', color: C.primary, letterSpacing: -0.8 },
  revenueSkeleton: { width: 80, height: 22, borderRadius: 6, backgroundColor: C.surfaceHigh },
  revenueSep: { width: 1, height: 32, backgroundColor: C.border, marginHorizontal: 20 },
  revenueBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: 16,
  },

  updatedAt: { fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 8 },
});

export default AdminDashboardScreen;
