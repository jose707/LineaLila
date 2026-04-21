// src/screens/AdminAnalyticsScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Share,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MapPin,
  DollarSign,
  Users,
  Car,
  BarChart3,
  Activity,
  AlertTriangle,
  Download,
  Route,
  Zap,
  Target,
  PieChart,
  Wallet,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import api from '../services/api.client';

const C = {
  primary: '#7514C5', primaryLight: '#F3E8FF', bg: '#F5F5F7',
  white: '#FFFFFF', border: '#EBEBEB', text: '#0D0D0D',
  textSub: '#555555', textMuted: '#ADADAD',
  success: '#16A34A', successLight: '#DCFCE7',
  error: '#DC2626', errorLight: '#FEE2E2',
  warning: '#F59E0B', warningLight: '#FEF3C7',
  blue: '#3B82F6', blueLight: '#DBEAFE',
};

const W = Dimensions.get('window').width - 64;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'AdminAnalytics'>;
type Range = 'week' | 'month' | 'year';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ExtendedData {
  current: { rides: number; completed: number; cancelled: number; revenue: number; users: number; avgFare: number; completionRate: number; cancellationRate: number };
  deltas: { rides: number; revenue: number; users: number; completed: number };
  totals: { totalUsers: number; totalDrivers: number; activeDrivers: number };
}
interface DayData { day: string; count?: number; revenue?: number; rides?: number }
interface FunnelStage { stage: string; count: number }
interface Segmentation { byRole: { passengers: number; drivers: number; admins: number }; byStatus: { active: number; inactive: number }; byVerification: { verified: number; unverified: number } }
interface UnitEco { revenuePerUser: number; revenuePerDriver: number; revenuePerRide: number; ridesPerUser: number; totalRevenue: number; completedRides: number; totalUsers: number; totalDrivers: number; activeRiders: number }
interface RouteItem { pickup_address: string; dropoff_address: string; count: number; avg_fare: number }

// ─── Custom SVG Charts ────────────────────────────────────────────────────────
const BarChart = ({ data, height = 140 }: { data: DayData[]; height?: number }) => {
  if (!data.length) return <Text style={cs.empty}>Sin datos</Text>;
  const max = Math.max(...data.map(d => d.count || 0), 1);
  const barW = Math.max(Math.floor(W / data.length) - 4, 6);
  const labels = data.length > 10 ? data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) : data;

  return (
    <Svg width={W} height={height + 28}>
      <Defs>
        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity="0.9" />
          <Stop offset="1" stopColor={C.primary} stopOpacity="0.4" />
        </LinearGradient>
      </Defs>
      {data.map((d, i) => {
        const h = ((d.count || 0) / max) * (height - 10);
        const x = i * (barW + 4) + 2;
        return <Rect key={i} x={x} y={height - h} width={barW} height={h} rx={3} fill="url(#barGrad)" />;
      })}
      <Line x1={0} y1={height} x2={W} y2={height} stroke={C.border} strokeWidth={1} />
      {labels.map((d) => {
        const idx = data.indexOf(d);
        const x = idx * (barW + 4) + barW / 2;
        const label = d.day?.slice(5) || '';
        return <SvgText key={idx} x={x} y={height + 16} fontSize={9} fill={C.textMuted} textAnchor="middle">{label}</SvgText>;
      })}
    </Svg>
  );
};

const LineChart = ({ data, height = 140 }: { data: DayData[]; height?: number }) => {
  if (!data.length) return <Text style={cs.empty}>Sin datos</Text>;
  const max = Math.max(...data.map(d => d.revenue || 0), 1);
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = height - 10 - ((d.revenue || 0) / max) * (height - 20);
    return `${x},${y}`;
  }).join(' ');
  const labels = data.length > 10 ? data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) : data;

  return (
    <Svg width={W} height={height + 28}>
      <Defs>
        <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.success} stopOpacity="0.15" />
          <Stop offset="1" stopColor={C.success} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polyline points={pts} fill="none" stroke={C.success} strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * W;
        const y = height - 10 - ((d.revenue || 0) / max) * (height - 20);
        return <Circle key={i} cx={x} cy={y} r={2.5} fill={C.success} />;
      })}
      <Line x1={0} y1={height} x2={W} y2={height} stroke={C.border} strokeWidth={1} />
      {labels.map((d) => {
        const idx = data.indexOf(d);
        const x = (idx / Math.max(data.length - 1, 1)) * W;
        return <SvgText key={idx} x={x} y={height + 16} fontSize={9} fill={C.textMuted} textAnchor="middle">{d.day?.slice(5) || ''}</SvgText>;
      })}
    </Svg>
  );
};

const DonutChart = ({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={14} />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const o = offset;
          offset += dash;
          return <Circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={14} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-o} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        })}
        <SvgText x={size / 2} y={size / 2 + 5} fontSize={16} fontWeight="bold" fill={C.text} textAnchor="middle">{total}</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
            <Text style={{ fontSize: 10, color: C.textSub }}>{seg.label} ({seg.value})</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const cs = StyleSheet.create({ empty: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 30 } });

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdminAnalyticsScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const [range, setRange] = useState<Range>('month');
  const [extended, setExtended] = useState<ExtendedData | null>(null);
  const [ridesByDay, setRidesByDay] = useState<DayData[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<DayData[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [segmentation, setSegmentation] = useState<Segmentation | null>(null);
  const [unitEco, setUnitEco] = useState<UnitEco | null>(null);
  const [topRoutes, setTopRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysCfg: Record<Range, number> = { week: 7, month: 30, year: 90 };

  const fetchAll = useCallback(async (r: Range = range, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const days = daysCfg[r];
      const [ext, rbd, rvd, fun, seg, ue, tr] = await Promise.all([
        api.get<ExtendedData>('/admin/analytics/extended', { params: { range: r } }),
        api.get<{ days: DayData[] }>('/admin/analytics/rides-by-day', { params: { days } }),
        api.get<{ days: DayData[] }>('/admin/analytics/revenue-by-day', { params: { days } }),
        api.get<{ funnel: FunnelStage[] }>('/admin/analytics/funnel', { params: { range: r } }),
        api.get<Segmentation>('/admin/analytics/segmentation'),
        api.get<UnitEco>('/admin/analytics/unit-economics'),
        api.get<{ routes: RouteItem[] }>('/admin/analytics/top-routes', { params: { limit: 5 } }),
      ]);
      setExtended(ext);
      setRidesByDay(rbd.days || []);
      setRevenueByDay(rvd.days || []);
      setFunnel(fun.funnel || []);
      setSegmentation(seg);
      setUnitEco(ue);
      setTopRoutes(tr.routes || []);
    } catch (err: any) {
      const d = err?.data?.error || err?.statusText || err?.message || 'Error';
      setError(`${err?.status ?? ''} ${d}`);
    } finally { setLoading(false); setRefreshing(false); }
  }, [range]);

  useEffect(() => { fetchAll(range); }, [range]);

  const handleRange = (r: Range) => { setRange(r); fetchAll(r); };

  const handleExport = async () => {
    if (!extended) return;
    const c = extended.current;
    const csv = [
      'Métrica,Valor',
      `Viajes,${c.rides}`, `Completados,${c.completed}`, `Cancelados,${c.cancelled}`,
      `Ingresos (Bs),${c.revenue}`, `Tarifa promedio (Bs),${c.avgFare}`,
      `Tasa completado,${c.completionRate}%`, `Usuarios nuevos,${c.users}`,
      `Usuarios totales,${extended.totals.totalUsers}`, `Conductoras,${extended.totals.totalDrivers}`,
    ].join('\n');
    try {
      await Share.share({ message: csv, title: `Reporte Línea Lila - ${range}` });
    } catch {}
  };

  // Auto insights
  const insights: string[] = [];
  if (extended) {
    const d = extended.deltas;
    const c = extended.current;
    if (d.revenue > 0) insights.push(`📈 Los ingresos subieron ${d.revenue}% respecto al periodo anterior`);
    else if (d.revenue < 0) insights.push(`📉 Los ingresos bajaron ${Math.abs(d.revenue)}% respecto al periodo anterior`);
    if (d.rides > 0) insights.push(`🚀 Los viajes aumentaron ${d.rides}%`);
    if (c.cancellationRate > 20) insights.push(`⚠️ Tasa de cancelación alta: ${c.cancellationRate}%`);
    if (c.completionRate > 85) insights.push(`✅ Excelente tasa de completado: ${c.completionRate}%`);
    if (d.users > 0) insights.push(`👥 ${d.users}% más usuarios nuevos que el periodo anterior`);
  }

  // Alerts
  const alerts: { msg: string; type: 'warning' | 'error' }[] = [];
  if (extended) {
    if (extended.current.cancellationRate > 25) alerts.push({ msg: `Tasa de cancelación muy alta: ${extended.current.cancellationRate}%`, type: 'error' });
    if (extended.current.completionRate < 60) alerts.push({ msg: `Tasa de completado baja: ${extended.current.completionRate}%`, type: 'warning' });
    if (extended.deltas.revenue < -20) alerts.push({ msg: `Ingresos bajaron ${Math.abs(extended.deltas.revenue)}% vs anterior`, type: 'warning' });
  }

  const rangeLabel: Record<Range, string> = { week: 'Semana', month: 'Mes', year: 'Año' };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <HBar navigation={navigation} />
        <View style={s.centered}><ActivityIndicator size="large" color={C.primary} /><Text style={s.loadTxt}>Cargando analíticas…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <HBar navigation={navigation} />

      {/* Range tabs */}
      <View style={s.tabRow}>
        {(['week', 'month', 'year'] as Range[]).map(r => (
          <TouchableOpacity key={r} style={[s.tab, range === r && s.tabActive]} onPress={() => handleRange(r)}>
            <Text style={[s.tabTxt, range === r && s.tabTxtActive]}>{rangeLabel[r]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(range, true)} colors={[C.primary]} />}
      >
        {error && <TouchableOpacity style={s.errBanner} onPress={() => fetchAll(range)}><Text style={s.errTxt}>{error} — Reintentar</Text></TouchableOpacity>}

        {/* ── Alerts ── */}
        {alerts.map((a, i) => (
          <View key={i} style={[s.alertCard, a.type === 'error' ? s.alertError : s.alertWarn]}>
            <AlertTriangle size={14} color={a.type === 'error' ? C.error : C.warning} strokeWidth={2} />
            <Text style={[s.alertTxt, { color: a.type === 'error' ? C.error : '#92400E' }]}>{a.msg}</Text>
          </View>
        ))}

        {/* ── KPI Cards ── */}
        {extended && (
          <>
            <SLabel text="MÉTRICAS CLAVE" />
            <View style={s.kpiGrid}>
              <KPI icon={MapPin} label="Viajes" value={extended.current.rides} delta={extended.deltas.rides} color={C.primary} />
              <KPI icon={DollarSign} label="Ingresos" value={`Bs ${extended.current.revenue.toLocaleString()}`} delta={extended.deltas.revenue} color={C.success} />
              <KPI icon={Wallet} label="Tarifa prom." value={`Bs ${extended.current.avgFare}`} color={C.blue} />
              <KPI icon={Users} label="Nuevos usuarios" value={extended.current.users} delta={extended.deltas.users} color={C.warning} />
            </View>
          </>
        )}

        {/* ── Bar chart: rides/day ── */}
        <SLabel text="VIAJES POR DÍA" />
        <View style={s.chartCard}>
          <BarChart data={ridesByDay} />
        </View>

        {/* ── Line chart: revenue/day ── */}
        <SLabel text="INGRESOS POR DÍA (Bs)" />
        <View style={s.chartCard}>
          <LineChart data={revenueByDay} />
        </View>

        {/* ── Funnel ── */}
        <SLabel text="FUNNEL DE VIAJES" />
        <View style={s.funnelCard}>
          {funnel.map((f, i) => {
            const maxC = funnel[0]?.count || 1;
            const pct = (f.count / maxC) * 100;
            return (
              <View key={i} style={s.funnelRow}>
                <Text style={s.funnelLabel}>{f.stage}</Text>
                <View style={s.funnelTrack}><View style={[s.funnelFill, { width: `${pct}%` }]} /></View>
                <Text style={s.funnelCount}>{f.count}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Segmentation ── */}
        {segmentation && (
          <>
            <SLabel text="SEGMENTACIÓN DE USUARIOS" />
            <View style={s.chartCard}>
              <DonutChart segments={[
                { value: segmentation.byRole.passengers, color: C.primary, label: 'Pasajeros' },
                { value: segmentation.byRole.drivers, color: C.success, label: 'Conductoras' },
                { value: segmentation.byRole.admins, color: C.warning, label: 'Admin' },
              ]} />
              <View style={s.segRow}>
                <SegStat label="Activos" value={segmentation.byStatus.active} total={segmentation.byStatus.active + segmentation.byStatus.inactive} color={C.success} />
                <SegStat label="Verificados" value={segmentation.byVerification.verified} total={segmentation.byVerification.verified + segmentation.byVerification.unverified} color={C.blue} />
              </View>
            </View>
          </>
        )}

        {/* ── Unit Economics ── */}
        {unitEco && (
          <>
            <SLabel text="UNIT ECONOMICS" />
            <View style={s.ecoCard}>
              <EcoRow icon={DollarSign} label="Ingreso / usuario" value={`Bs ${unitEco.revenuePerUser}`} />
              <EcoRow icon={Car} label="Ingreso / conductora" value={`Bs ${unitEco.revenuePerDriver}`} />
              <EcoRow icon={MapPin} label="Ingreso / viaje" value={`Bs ${unitEco.revenuePerRide}`} />
              <EcoRow icon={Activity} label="Viajes / pasajero activo" value={`${unitEco.ridesPerUser}`} />
              <EcoRow icon={Users} label="Pasajeros activos" value={`${unitEco.activeRiders}`} last />
            </View>
          </>
        )}

        {/* ── Top routes ── */}
        {topRoutes.length > 0 && (
          <>
            <SLabel text="RUTAS MÁS POPULARES" />
            <View style={s.routesCard}>
              {topRoutes.map((r, i) => (
                <View key={i} style={[s.routeRow, i < topRoutes.length - 1 && s.routeBorder]}>
                  <View style={s.routeRank}><Text style={s.routeRankTxt}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.routeAddr} numberOfLines={1}>📍 {r.pickup_address}</Text>
                    <Text style={s.routeAddr} numberOfLines={1}>🎯 {r.dropoff_address}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.routeCount}>{r.count} viajes</Text>
                    <Text style={s.routeFare}>Bs {r.avg_fare.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Insights ── */}
        {insights.length > 0 && (
          <>
            <SLabel text="🧠 INSIGHTS AUTOMÁTICOS" />
            <View style={s.insightsCard}>
              {insights.map((ins, i) => <Text key={i} style={s.insightTxt}>{ins}</Text>)}
            </View>
          </>
        )}

        {/* ── Export ── */}
        <TouchableOpacity style={s.exportBtn} onPress={handleExport} activeOpacity={0.7}>
          <Download size={16} color={C.primary} strokeWidth={2} />
          <Text style={s.exportTxt}>Exportar reporte CSV</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const HBar = ({ navigation }: { navigation: any }) => (
  <View style={s.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><ArrowLeft size={20} color={C.white} strokeWidth={2} /></TouchableOpacity>
    <Text style={s.headerTitle}>Análisis y reportes</Text>
    <BarChart3 size={18} color={C.white} strokeWidth={1.8} />
  </View>
);

const SLabel = ({ text }: { text: string }) => <Text style={s.sLabel}>{text}</Text>;

const KPI = ({ icon: Icon, label, value, delta, color }: { icon: any; label: string; value: string | number; delta?: number; color: string }) => (
  <View style={s.kpiCard}>
    <View style={[s.kpiIcon, { backgroundColor: color + '18' }]}><Icon size={15} color={color} strokeWidth={2} /></View>
    <Text style={s.kpiValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
    <Text style={s.kpiLabel}>{label}</Text>
    {delta !== undefined && (
      <View style={[s.deltaBadge, { backgroundColor: delta >= 0 ? C.successLight : C.errorLight }]}>
        {delta >= 0 ? <TrendingUp size={10} color={C.success} strokeWidth={2.5} /> : <TrendingDown size={10} color={C.error} strokeWidth={2.5} />}
        <Text style={[s.deltaTxt, { color: delta >= 0 ? C.success : C.error }]}>{delta >= 0 ? '+' : ''}{delta}%</Text>
      </View>
    )}
  </View>
);

const SegStat = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{value} <Text style={{ fontSize: 11, color: C.textMuted }}>({pct}%)</Text></Text>
      <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 4 }}>
        <View style={{ height: 4, backgroundColor: color, borderRadius: 2, width: `${pct}%` }} />
      </View>
    </View>
  );
};

const EcoRow = ({ icon: Icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) => (
  <View style={[s.ecoRow, !last && { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
    <Icon size={14} color={C.primary} strokeWidth={2} />
    <Text style={s.ecoLabel}>{label}</Text>
    <Text style={s.ecoValue}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadTxt: { fontSize: 14, color: C.textMuted },

  tabRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  tabTxtActive: { color: C.white },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },

  errBanner: { backgroundColor: C.errorLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA', marginBottom: 12 },
  errTxt: { fontSize: 13, color: C.error, fontWeight: '600' },

  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 8 },
  alertError: { backgroundColor: C.errorLight, borderWidth: 1, borderColor: '#FECACA' },
  alertWarn: { backgroundColor: C.warningLight, borderWidth: 1, borderColor: '#FDE68A' },
  alertTxt: { flex: 1, fontSize: 12, fontWeight: '600' },

  sLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginTop: 20, marginBottom: 10 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47.5%', backgroundColor: C.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  kpiLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2 },
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  deltaTxt: { fontSize: 10, fontWeight: '700' },

  chartCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },

  funnelCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 10 },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funnelLabel: { width: 90, fontSize: 11, fontWeight: '600', color: C.textSub },
  funnelTrack: { flex: 1, height: 14, backgroundColor: C.primaryLight, borderRadius: 7, overflow: 'hidden' },
  funnelFill: { height: 14, backgroundColor: C.primary, borderRadius: 7 },
  funnelCount: { width: 40, fontSize: 13, fontWeight: '800', color: C.text, textAlign: 'right' },

  segRow: { flexDirection: 'row', gap: 16, marginTop: 16 },

  ecoCard: { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  ecoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  ecoLabel: { flex: 1, fontSize: 13, color: C.text, fontWeight: '500' },
  ecoValue: { fontSize: 14, fontWeight: '800', color: C.primary },

  routesCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  routeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  routeBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  routeRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  routeRankTxt: { fontSize: 11, fontWeight: '800', color: C.primary },
  routeAddr: { fontSize: 11, color: C.textSub },
  routeCount: { fontSize: 12, fontWeight: '700', color: C.text },
  routeFare: { fontSize: 10, color: C.textMuted },

  insightsCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 8 },
  insightTxt: { fontSize: 12, color: C.textSub, fontWeight: '500', lineHeight: 18 },

  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primaryLight, borderRadius: 12, padding: 14, marginTop: 20, borderWidth: 1, borderColor: C.primary },
  exportTxt: { fontSize: 13, fontWeight: '700', color: C.primary },
});

export default AdminAnalyticsScreen;
