// src/screens/AdminPaymentsScreen.tsx
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
  pending:     '#F59E0B',
  failed:      '#EF4444',
  refunded:    '#8B5CF6',
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AdminPayments'>;
interface Props { navigation: NavProp; }

type PayStatus = 'all' | 'completed' | 'pending' | 'failed' | 'refunded';

interface PaymentFromAPI {
  id: string;
  rideId: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  paid_at: string | null;
  createdAt: string;
  passenger?: { id: string; name: string; phone: string };
  ride?:      { id: string; pickup_address: string; dropoff_address: string; finalFare: number };
}

interface Summary {
  completedRevenue: number;
  pendingAmount: number;
  pendingCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) => {
  switch (s) {
    case 'completed': return C.completed;
    case 'pending':   return C.pending;
    case 'failed':    return C.failed;
    case 'refunded':  return C.refunded;
    default:          return C.textMuted;
  }
};

const statusLabel = (s: string) => {
  const m: Record<string, string> = {
    completed: 'Completado', pending: 'Pendiente', failed: 'Fallido', refunded: 'Reembolsado',
  };
  return m[s] || s;
};

const methodLabel = (m: string) => (m === 'cash' ? 'Efectivo' : m === 'qr' ? 'QR' : m);

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const FILTERS: { label: string; value: PayStatus }[] = [
  { label: 'Todos',       value: 'all' },
  { label: 'Completado',  value: 'completed' },
  { label: 'Pendiente',   value: 'pending' },
  { label: 'Fallido',     value: 'failed' },
  { label: 'Reembolso',   value: 'refunded' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdminPaymentsScreen: React.FC<Props> = ({ navigation }) => {
  const [payments, setPayments]       = useState<PaymentFromAPI[]>([]);
  const [total, setTotal]             = useState(0);
  const [summary, setSummary]         = useState<Summary>({ completedRevenue: 0, pendingAmount: 0, pendingCount: 0 });
  const [page, setPage]               = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [searchText, setSearchText]     = useState('');
  const [statusFilter, setStatusFilter] = useState<PayStatus>('all');

  const [selected, setSelected]       = useState<PaymentFromAPI | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const LIMIT = 20;

  const fetchPayments = useCallback(async (opts: {
    reset?: boolean; isRefresh?: boolean; status?: PayStatus; offset?: number;
  } = {}) => {
    const { reset = false, isRefresh = false, status = statusFilter, offset = 0 } = opts;

    if (isRefresh) setRefreshing(true);
    else if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params: Record<string, string | number> = { limit: LIMIT, offset };
      if (status !== 'all') params.status = status;

      const data = await api.get<{ payments: PaymentFromAPI[]; total: number; summary: Summary }>('/admin/payments', { params });

      if (reset || offset === 0) setPayments(data.payments || []);
      else setPayments(prev => [...prev, ...(data.payments || [])]);

      setTotal(data.total || 0);
      setSummary(data.summary || { completedRevenue: 0, pendingAmount: 0, pendingCount: 0 });
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

  useEffect(() => { fetchPayments({ reset: true }); }, [fetchPayments]);

  const handleFilter = (s: PayStatus) => {
    setStatusFilter(s);
    fetchPayments({ reset: true, status: s, offset: 0 });
  };

  const handleLoadMore = () => {
    if (loadingMore || payments.length >= total) return;
    fetchPayments({ offset: (page + 1) * LIMIT });
  };

  const displayed = payments.filter(p => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      (p.passenger?.name || '').toLowerCase().includes(q) ||
      (p.transaction_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pagos e ingresos</Text>
        <Text style={s.totalBadge}>{total}</Text>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderLeftColor: C.completed }]}>
          <Text style={s.sumLabel}>Ingresos completados</Text>
          <Text style={[s.sumValue, { color: C.completed }]}>Bs {summary.completedRevenue.toFixed(2)}</Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: C.pending }]}>
          <Text style={s.sumLabel}>Pendiente</Text>
          <Text style={[s.sumValue, { color: C.pending }]}>Bs {summary.pendingAmount.toFixed(2)}</Text>
          <Text style={s.sumMeta}>{summary.pendingCount} pagos</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por ID, pasajero o transacción…"
          placeholderTextColor={C.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterBtn, statusFilter === f.value && s.filterBtnActive]}
            onPress={() => handleFilter(f.value)}
          >
            <Text style={[s.filterTxt, statusFilter === f.value && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error */}
      {error && (
        <TouchableOpacity style={s.errorBanner} onPress={() => fetchPayments({ reset: true })}>
          <Text style={s.errorTxt}>{error} — Toca para reintentar</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Cargando pagos…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments({ reset: true, isRefresh: true })} colors={[C.primary]} />}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 60) handleLoadMore();
          }}
          scrollEventThrottle={400}
        >
          <Text style={s.resultCount}>{displayed.length} de {total} pagos</Text>

          {displayed.length === 0 && !error && (
            <View style={s.empty}><Text style={s.emptyTxt}>No hay pagos con este filtro.</Text></View>
          )}

          {displayed.map(p => (
            <TouchableOpacity
              key={p.id}
              style={s.card}
              onPress={() => { setSelected(p); setModalVisible(true); }}
              activeOpacity={0.75}
            >
              <View style={s.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardId} numberOfLines={1}>#{p.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={s.cardDate}>{fmtDate(p.createdAt)}</Text>
                </View>
                <Text style={[s.cardAmount, { color: statusColor(p.payment_status) }]}>
                  Bs {Number(p.amount).toFixed(2)}
                </Text>
              </View>

              <View style={s.cardBody}>
                <Text style={s.participantTxt}>👤 {p.passenger?.name || 'Sin pasajero'}</Text>
                <Text style={s.participantTxt}>💳 {methodLabel(p.payment_method)}</Text>
              </View>

              <View style={s.cardFoot}>
                <Text style={s.metaTxt}>{fmtDate(p.createdAt)}</Text>
                <View style={[s.statusChip, { backgroundColor: statusColor(p.payment_status) }]}>
                  <Text style={s.statusChipTxt}>{statusLabel(p.payment_status)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {loadingMore && (
            <View style={s.loadMoreWrap}><ActivityIndicator size="small" color={C.primary} /></View>
          )}
        </ScrollView>
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={s.backBtn}>
                  <Text style={s.backTxt}>‹</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Detalle del pago</Text>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Status + amount banner */}
                <View style={[s.statusBanner, { backgroundColor: statusColor(selected.payment_status) }]}>
                  <Text style={s.statusBannerLabel}>{statusLabel(selected.payment_status).toUpperCase()}</Text>
                  <Text style={s.statusBannerAmount}>Bs {Number(selected.amount).toFixed(2)}</Text>
                </View>

                <View style={s.infoCard}>
                  <InfoRow icon="🆔" label="ID Pago"       value={selected.id} />
                  <InfoRow icon="🗺️" label="ID Viaje"      value={selected.rideId || '—'} />
                  <InfoRow icon="🔐" label="Transacción"    value={selected.transaction_id || 'Sin transacción'} />
                  <InfoRow icon="👤" label="Pasajero"       value={selected.passenger?.name || '—'} />
                  <InfoRow icon="📞" label="Teléfono"       value={selected.passenger?.phone || '—'} />
                  <InfoRow icon="💳" label="Método"         value={methodLabel(selected.payment_method)} />
                  <InfoRow icon="💰" label="Moneda"         value={selected.currency || 'BOB'} />
                  <InfoRow icon="🕐" label="Creado"         value={fmtDate(selected.createdAt)} />
                  <InfoRow icon="✅" label="Pagado"         value={selected.paid_at ? fmtDate(selected.paid_at) : 'No pagado'} last />
                </View>

                {selected.ride && (
                  <View style={s.infoCard}>
                    <Text style={s.infoCardTitle}>Información del viaje</Text>
                    <InfoRow icon="📍" label="Recogida" value={selected.ride.pickup_address || '—'} />
                    <InfoRow icon="🎯" label="Destino"  value={selected.ride.dropoff_address || '—'} />
                    <InfoRow icon="💵" label="Tarifa viaje" value={`Bs ${Number(selected.ride.finalFare ?? 0).toFixed(2)}`} last />
                  </View>
                )}
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
  row:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11 },
  border: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  icon:   { fontSize: 16, marginRight: 12, marginTop: 1 },
  label:  { fontSize: 11, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
  value:  { fontSize: 13, color: C.text, fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header:      { backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 10 },
  backBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backTxt:     { fontSize: 28, color: C.white, fontWeight: '700', lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.white },
  totalBadge:  { fontSize: 12, fontWeight: '700', color: C.primary, backgroundColor: C.white, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },

  summaryRow:  { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  summaryCard: { flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 14, borderLeftWidth: 4 },
  sumLabel:    { fontSize: 11, color: C.textMuted, fontWeight: '500' },
  sumValue:    { fontSize: 17, fontWeight: '800', marginVertical: 4 },
  sumMeta:     { fontSize: 10, color: '#9CA3AF' },

  searchWrap:  { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  searchInput: { backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: C.text, borderWidth: 1, borderColor: C.border },

  filtersScroll:   { flexGrow: 0 },
  filtersContent:  { paddingHorizontal: 14, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  filterBtn:       { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  filterBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterTxt:       { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  filterTxtActive: { color: C.white },

  errorBanner: { margin: 14, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt:    { fontSize: 13, color: C.failed, fontWeight: '600' },

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
  cardAmount:  { fontSize: 16, fontWeight: '800' },

  cardBody:    { paddingHorizontal: 14, paddingVertical: 10, gap: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  participantTxt: { fontSize: 12, color: C.textMuted },

  cardFoot:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F9FAFB' },
  metaTxt:     { fontSize: 11, color: C.textMuted },
  statusChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusChipTxt: { fontSize: 11, fontWeight: '600', color: C.white },

  loadMoreWrap: { paddingVertical: 16, alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader:  { backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalBody:    { padding: 16 },
  statusBanner: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  statusBannerLabel: { fontSize: 14, fontWeight: '700', color: C.white },
  statusBannerAmount: { fontSize: 28, fontWeight: '800', color: C.white, marginTop: 6 },
  infoCard:     { backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  infoCardTitle: { fontSize: 13, fontWeight: '700', color: C.text, paddingTop: 14, paddingBottom: 4 },
});

export default AdminPaymentsScreen;
