import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';

const T = {
  bg: '#FAFAFA',
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
  border: '#F0F0F0',
};

type FilterStatus = 'all' | 'completed' | 'cancelled';

const RideHistoryScreen = () => {
  const navigation = useNavigation();
  const { user, isDriverMode } = useAuth();

  const [rides, setRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const loadHistory = useCallback(
    async (refresh = false) => {
      if (!user?.id) return;
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setHasError(false);
      try {
        const res: any = await ridesService.getRideHistory(user.id);
        const data: any[] = res?.rides ?? res?.data ?? [];
        setRides(Array.isArray(data) ? data : []);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered = rides.filter(r =>
    filter === 'all' ? true : r.status === filter,
  );

  const count = (s: string) => rides.filter(r => r.status === s).length;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const time = d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (diff === 0) return `Hoy · ${time}`;
    if (diff === 1) return `Ayer · ${time}`;
    return (
      d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) +
      ` · ${time}`
    );
  };

  const fmtDist = (m?: number) => {
    if (!m) return '—';
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  };

  const statusConfig = (status: string) => {
    if (status === 'completed')
      return { label: 'Completado', color: T.success, bg: T.successSoft };
    if (status === 'cancelled')
      return { label: 'Cancelado', color: T.danger, bg: T.dangerSoft };
    return { label: status, color: T.inkMid, bg: T.border };
  };

  // ── Card ─────────────────────────────────────────────────────────────────

  const renderCard = ({ item }: { item: any }) => {
    const sc = statusConfig(item.status);
    const counterpart = isDriverMode
      ? item.passenger?.name ?? 'Pasajero'
      : item.driver?.user?.name ??
        item.driver?.User?.name ??
        'Sin conductor asignado';
    const fareLabel = isDriverMode ? 'Ganado' : 'Pagado';
    const fare = parseFloat(item.finalFare ?? item.final_fare ?? 0);

    return (
      <View style={s.card}>
        {/* Estado + fecha */}
        <View style={s.cardTop}>
          <View style={[s.badge, { backgroundColor: sc.bg }]}>
            <Text style={[s.badgeText, { color: sc.color }]}>{sc.label}</Text>
          </View>
          <Text style={s.date}>{fmtDate(item.createdAt)}</Text>
        </View>

        {/* Nombre contraparte */}
        <Text style={s.counterpart}>{counterpart}</Text>

        {/* Ruta */}
        <View style={s.routeRow}>
          <View style={s.routeDotGray} />
          <Text style={s.routeAddr} numberOfLines={1}>
            {item.pickup_address ?? '—'}
          </Text>
        </View>
        <View style={s.routeConnector} />
        <View style={s.routeRow}>
          <View style={s.routeDotPurple} />
          <Text style={s.routeAddr} numberOfLines={1}>
            {item.dropoff_address ?? '—'}
          </Text>
        </View>

        {/* Stats */}
        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.statLabel}>Distancia</Text>
            <Text style={s.statVal}>{fmtDist(item.distance)}</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.stat}>
            <Text style={s.statLabel}>{fareLabel}</Text>
            <Text
              style={[s.statVal, { color: isDriverMode ? T.success : T.ink }]}
            >
              Bs {fare.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Mis Viajes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filtros */}
      <View style={s.filters}>
        {(['all', 'completed', 'cancelled'] as FilterStatus[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f === 'all'
                ? `Todos (${rides.length})`
                : f === 'completed'
                ? `Completados (${count('completed')})`
                : `Cancelados (${count('cancelled')})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenido */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={s.centerText}>Cargando viajes...</Text>
        </View>
      ) : hasError ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={s.emptyTitle}>No se pudo cargar el historial</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => loadHistory()}
            activeOpacity={0.8}
          >
            <Text style={s.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadHistory(true)}
              colors={[T.accent]}
              tintColor={T.accent}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyTitle}>Sin viajes</Text>
              <Text style={s.emptySub}>
                {filter === 'all'
                  ? 'Los viajes que realices aparecerán aquí'
                  : filter === 'completed'
                  ? 'No hay viajes completados aún'
                  : 'No hay viajes cancelados'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: T.white,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backArrow: { fontSize: 26, color: T.accent, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: T.ink },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.white,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: T.white,
  },
  chipActive: { backgroundColor: T.accent, borderColor: T.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: T.inkMid },
  chipTextActive: { color: T.white },
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
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 12, color: T.inkLight },
  counterpart: {
    fontSize: 16,
    fontWeight: '700',
    color: T.ink,
    marginBottom: 12,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDotGray: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.inkLight,
  },
  routeDotPurple: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.accent,
  },
  routeAddr: {
    flex: 1,
    fontSize: 13,
    color: T.inkMid,
    fontWeight: '500',
  },
  routeConnector: {
    width: 1,
    height: 10,
    backgroundColor: T.border,
    marginLeft: 3.5,
    marginVertical: 2,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: T.border,
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
    gap: 12,
  },
  centerText: { fontSize: 14, color: T.inkMid, marginTop: 8 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.ink },
  emptySub: {
    fontSize: 13,
    color: T.inkLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: T.accent,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: T.white },
});

export default RideHistoryScreen;
