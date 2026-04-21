// src/screens/AdminRidesScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import api from '../services/api.client';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary:     '#7514C5',
  primaryLight:'#F3E8FF',
  bg:          '#FAFAFA',
  white:       '#FFFFFF',
  border:      '#E5E7EB',
  text:        '#1F2937',
  textMuted:   '#6B7280',
  surface:     '#F9FAFB',
  completed:   '#10B981',
  inProgress:  '#3B82F6',
  cancelled:   '#6B7280',
  requested:   '#F59E0B',
  error:       '#EF4444',
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AdminRides'>;
interface Props { navigation: NavProp; }

type RideStatus = 'all' | 'completed' | 'in_progress' | 'cancelled' | 'requested' | 'accepted';

interface RideFromAPI {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  finalFare: number;
  distance: number;
  duration: number;
  createdAt: string;
  passenger?: { id: string; name: string; phone: string };
  driver?:    { id: string; name: string; phone: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) => {
  switch (s) {
    case 'completed':   return C.completed;
    case 'in_progress':
    case 'accepted':
    case 'arrived':     return C.inProgress;
    case 'requested':   return C.requested;
    case 'cancelled':
    case 'expired':     return C.cancelled;
    default:            return C.textMuted;
  }
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    completed:   'Completado',
    in_progress: 'En curso',
    accepted:    'Aceptado',
    arrived:     'Conductor llegó',
    requested:   'Solicitado',
    cancelled:   'Cancelado',
    expired:     'Expirado',
  };
  return map[s] || s;
};

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const fmtDuration = (secs: number) => {
  if (!secs) return '—';
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

// ─── Filters config ───────────────────────────────────────────────────────────
const FILTERS: { label: string; value: RideStatus }[] = [
  { label: 'Todos',      value: 'all' },
  { label: 'Completado', value: 'completed' },
  { label: 'En curso',   value: 'in_progress' },
  { label: 'Aceptado',   value: 'accepted' },
  { label: 'Solicitado', value: 'requested' },
  { label: 'Cancelado',  value: 'cancelled' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdminRidesScreen: React.FC<Props> = ({ navigation }) => {
  const [rides, setRides]             = useState<RideFromAPI[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [searchText, setSearchText]   = useState('');
  const [statusFilter, setStatusFilter] = useState<RideStatus>('all');

  const [selectedRide, setSelectedRide] = useState<RideFromAPI | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const LIMIT = 20;

  const fetchRides = useCallback(async (opts: {
    reset?: boolean; isRefresh?: boolean; status?: RideStatus; offset?: number;
  } = {}) => {
    const { reset = false, isRefresh = false, status = statusFilter, offset = 0 } = opts;

    if (isRefresh) { setRefreshing(true); }
    else if (offset === 0) { setLoading(true); }
    else { setLoadingMore(true); }
    setError(null);

    try {
      const params: Record<string, string | number> = { limit: LIMIT, offset };
      if (status !== 'all') { params.status = status; }

      const data = await api.get<{ rides: RideFromAPI[]; total: number }>('/admin/rides', { params });

      if (reset || offset === 0) {
        setRides(data.rides || []);
      } else {
        setRides(prev => [...prev, ...(data.rides || [])]);
      }
      setTotal(data.total || 0);
      setPage(offset / LIMIT);
    } catch (err: any) {
      const detail = err?.data?.error || err?.data?.message || err?.statusText || 'Error de conexión';
      setError(`${err?.status ?? ''} ${detail}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRides({ reset: true }); }, [fetchRides]);

  const handleStatusFilter = (s: RideStatus) => {
    setStatusFilter(s);
    fetchRides({ reset: true, status: s, offset: 0 });
  };

  const handleLoadMore = () => {
    if (loadingMore || rides.length >= total) return;
    const nextOffset = (page + 1) * LIMIT;
    fetchRides({ offset: nextOffset });
  };

  // Client-side search on loaded rides
  const displayed = rides.filter(r => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      (r.passenger?.name || '').toLowerCase().includes(q) ||
      (r.driver?.name || '').toLowerCase().includes(q) ||
      (r.pickup_address || '').toLowerCase().includes(q) ||
      (r.dropoff_address || '').toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gestión de viajes</Text>
        <Text style={s.totalBadge}>{total}</Text>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por ID, pasajero, conductor o dirección…"
          placeholderTextColor={C.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* ── Status filters ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterBtn, statusFilter === f.value && s.filterBtnActive]}
            onPress={() => handleStatusFilter(f.value)}
          >
            <Text style={[s.filterTxt, statusFilter === f.value && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Error ── */}
      {error && (
        <TouchableOpacity style={s.errorBanner} onPress={() => fetchRides({ reset: true })}>
          <Text style={s.errorTxt}>{error} — Toca para reintentar</Text>
        </TouchableOpacity>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Cargando viajes…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRides({ reset: true, isRefresh: true })}
              colors={[C.primary]}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
            if (nearBottom) handleLoadMore();
          }}
          scrollEventThrottle={400}
        >
          <Text style={s.resultCount}>{displayed.length} de {total} viajes</Text>

          {displayed.length === 0 && !error && (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>No hay viajes con este filtro.</Text>
            </View>
          )}

          {displayed.map(ride => (
            <TouchableOpacity
              key={ride.id}
              style={s.card}
              onPress={() => { setSelectedRide(ride); setModalVisible(true); }}
              activeOpacity={0.75}
            >
              {/* Card header */}
              <View style={s.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardId} numberOfLines={1}>#{ride.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={s.cardDate}>{fmtDate(ride.createdAt)}</Text>
                </View>
                <View style={[s.statusChip, { backgroundColor: statusColor(ride.status) + '20' }]}>
                  <View style={[s.statusDot, { backgroundColor: statusColor(ride.status) }]} />
                  <Text style={[s.statusTxt, { color: statusColor(ride.status) }]}>{statusLabel(ride.status)}</Text>
                </View>
              </View>

              {/* Route */}
              <View style={s.cardBody}>
                <View style={s.routeRow}>
                  <View style={s.routeDot} />
                  <Text style={s.routeTxt} numberOfLines={1}>{ride.pickup_address || '—'}</Text>
                </View>
                <View style={s.routeLine} />
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: C.primary }]} />
                  <Text style={s.routeTxt} numberOfLines={1}>{ride.dropoff_address || '—'}</Text>
                </View>
              </View>

              {/* Participants + fare */}
              <View style={s.cardFoot}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.participantTxt}>👤 {ride.passenger?.name || 'Sin pasajero'}</Text>
                  <Text style={s.participantTxt}>🚗 {ride.driver?.name || 'Sin conductor'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={s.fare}>Bs {(ride.finalFare ?? 0).toFixed(2)}</Text>
                  <Text style={s.metaTxt}>{(ride.distance ?? 0).toFixed(1)} km · {fmtDuration(ride.duration)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {loadingMore && (
            <View style={s.loadMoreWrap}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Detail Modal ── */}
      {selectedRide && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              {/* Modal header */}
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={s.backBtn}>
                  <Text style={s.backTxt}>‹</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Detalle del viaje</Text>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Status banner */}
                <View style={[s.modalStatusBanner, { backgroundColor: statusColor(selectedRide.status) }]}>
                  <Text style={s.modalStatusTxt}>{statusLabel(selectedRide.status).toUpperCase()}</Text>
                </View>

                {/* Info rows */}
                <View style={s.infoCard}>
                  <InfoRow icon="🆔" label="ID del viaje" value={selectedRide.id} />
                  <InfoRow icon="🕐" label="Fecha / Hora"  value={fmtDate(selectedRide.createdAt)} />
                  <InfoRow icon="👤" label="Pasajero"      value={selectedRide.passenger?.name || '—'} />
                  <InfoRow icon="📞" label="Teléfono pasajero" value={selectedRide.passenger?.phone || '—'} />
                  <InfoRow icon="🚗" label="Conductora"    value={selectedRide.driver?.name || 'No asignada'} />
                  <InfoRow icon="📞" label="Teléfono conductora" value={selectedRide.driver?.phone || '—'} />
                  <InfoRow icon="📍" label="Recogida"      value={selectedRide.pickup_address || '—'} />
                  <InfoRow icon="🎯" label="Destino"       value={selectedRide.dropoff_address || '—'} last />
                </View>

                {/* Metrics */}
                <View style={s.metricsRow}>
                  <MetricBox label="Distancia" value={`${(selectedRide.distance ?? 0).toFixed(1)} km`} />
                  <MetricBox label="Duración"  value={fmtDuration(selectedRide.duration)} />
                  <MetricBox label="Tarifa"    value={`Bs ${(selectedRide.finalFare ?? 0).toFixed(2)}`} highlight />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) => (
  <View style={[ir.row, !last && ir.border]}>
    <Text style={ir.icon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  </View>
);
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11 },
  border:{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  icon:  { fontSize: 16, marginRight: 12, marginTop: 1 },
  label: { fontSize: 11, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
  value: { fontSize: 13, color: C.text, fontWeight: '600' },
});

const MetricBox = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={[mb.box, highlight && mb.highlight]}>
    <Text style={mb.label}>{label}</Text>
    <Text style={[mb.value, highlight && mb.highlightTxt]}>{value}</Text>
  </View>
);
const mb = StyleSheet.create({
  box:          { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  highlight:    { backgroundColor: C.primaryLight, borderColor: C.primary },
  label:        { fontSize: 10, color: C.textMuted, fontWeight: '600', marginBottom: 4 },
  value:        { fontSize: 15, fontWeight: '800', color: C.text },
  highlightTxt: { color: C.primary },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header:      { backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 10 },
  backBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backTxt:     { fontSize: 28, color: C.white, fontWeight: '700', lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.white },
  totalBadge:  { fontSize: 12, fontWeight: '700', color: C.primary, backgroundColor: C.white, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },

  searchWrap:  { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  searchInput: { backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: C.text, borderWidth: 1, borderColor: C.border },

  filtersScroll:   { flexGrow: 0 },
  filtersContent:  { paddingHorizontal: 14, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  filterBtn:       { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterTxt:       { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  filterTxtActive: { color: C.white },

  errorBanner: { margin: 14, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt:    { fontSize: 13, color: C.error, fontWeight: '600' },

  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:  { fontSize: 14, color: C.textMuted },

  list:        { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 24 },
  resultCount: { fontSize: 11, color: C.textMuted, fontWeight: '600', marginBottom: 10 },

  empty:       { paddingVertical: 40, alignItems: 'center' },
  emptyTxt:    { fontSize: 14, color: C.textMuted },

  card:        { backgroundColor: C.white, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardHead:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cardId:      { fontSize: 13, fontWeight: '700', color: C.text },
  cardDate:    { fontSize: 11, color: C.textMuted, marginTop: 2 },
  statusChip:  { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, gap: 5 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },

  cardBody:    { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  routeRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textMuted },
  routeTxt:    { flex: 1, fontSize: 12, color: C.text },
  routeLine:   { width: 1.5, height: 10, backgroundColor: C.border, marginLeft: 3, marginVertical: 3 },

  cardFoot:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F9FAFB' },
  participantTxt: { fontSize: 11, color: C.textMuted },
  fare:        { fontSize: 15, fontWeight: '800', color: C.primary },
  metaTxt:     { fontSize: 10, color: C.textMuted },

  loadMoreWrap: { paddingVertical: 16, alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader:  { backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalBody:    { padding: 16 },
  modalStatusBanner: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  modalStatusTxt:    { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: 1 },
  infoCard:    { backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  metricsRow:  { flexDirection: 'row', gap: 10 },
});

export default AdminRidesScreen;
