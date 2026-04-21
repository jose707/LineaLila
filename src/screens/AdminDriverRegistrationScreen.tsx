// src/screens/AdminDriverRegistrationScreen.tsx
import React, { useState, useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  X,
  Clock,
  Car,
  FileText,
  User,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as AdminService from '../services/admin.service';
import { API_HOST } from '../config/constants';
import { vehicleTypeLabel } from '../utils/vehicleTypes';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  primaryBorder: '#E9D5FF',
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceHigh: '#F3F3F3',
  border: '#EBEBEB',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#ADADAD',
  success: '#16A34A',
  successLight: '#DCFCE7',
  successBorder: '#BBF7D0',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorBorder: '#FECACA',
  white: '#FFFFFF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDriverRegistration'
>;
interface Props {
  navigation: NavProp;
}

interface DriverApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePassengerCapacity?: number;
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  backgroundCheckDate: string;
  applicationDate: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  verificationNotes: string;
  photo?: string;
  currentRequest?: {
    id: string;
    version: number;
    status: string;
    rejectionReason?: string;
    files: Record<
      string,
      { filename: string; url?: string; status: string; uploadedAt: string }
    >;
    createdAt: string;
    updatedAt: string;
  };
  approvedDocuments?: Record<string, boolean>;
  documentStatus?: Record<string, 'pending' | 'approved'>;
  documents?: Record<string, string | undefined>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusMeta = (status: string) => {
  switch (status) {
    case 'approved':
      return {
        color: C.success,
        bg: C.successLight,
        border: C.successBorder,
        label: 'Aprobado',
      };
    case 'rejected':
      return {
        color: C.error,
        bg: C.errorLight,
        border: C.errorBorder,
        label: 'Rechazado',
      };
    default:
      return {
        color: C.warning,
        bg: C.warningLight,
        border: C.warningBorder,
        label: 'Pendiente',
      };
  }
};

const docKeys: Array<{ key: string; label: string; optional?: boolean }> = [
  { key: 'profilePhoto', label: 'Foto perfil' },
  { key: 'ciFront', label: 'CI frente' },
  { key: 'ciBack', label: 'CI dorso' },
  { key: 'licenseFront', label: 'Licencia frente' },
  { key: 'licenseBack', label: 'Licencia dorso' },
  { key: 'antecedentsPhoto', label: 'Antecedentes' },
  { key: 'carFront', label: 'Auto frente' },
  { key: 'carBack', label: 'Auto dorso' },
  { key: 'carLeft', label: 'Auto izq.' },
  { key: 'carRight', label: 'Auto der.' },
  { key: 'soatPhoto', label: 'SOAT' },
  { key: 'ruatPhoto', label: 'RUAT', optional: true },
];

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const m = statusMeta(status);
  const Icon =
    status === 'approved' ? Check : status === 'rejected' ? X : Clock;
  return (
    <View
      style={[
        sb.wrap,
        { backgroundColor: m.bg, borderColor: m.border },
        small && sb.small,
      ]}
    >
      <Icon size={small ? 10 : 12} color={m.color} strokeWidth={2.5} />
      <Text style={[sb.txt, { color: m.color }, small && sb.txtSmall]}>
        {m.label}
      </Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  small: { paddingHorizontal: 8, paddingVertical: 3 },
  txt: { fontSize: 12, fontWeight: '700' },
  txtSmall: { fontSize: 10 },
});

// ─── InitialsAvatar ───────────────────────────────────────────────────────────
function InitialsAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={[ia.wrap, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[ia.txt, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}
const ia = StyleSheet.create({
  wrap: {
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  txt: { color: C.primary, fontWeight: '800', letterSpacing: -0.5 },
});

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        color: C.textMuted,
        letterSpacing: 1.2,
        marginBottom: 10,
      }}
    >
      {text}
    </Text>
  );
}

// ─── DetailRow ────────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={dr.row}>
      <Text style={dr.label}>{label}</Text>
      <Text style={dr.value}>{value || '—'}</Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  label: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  value: {
    fontSize: 13,
    color: C.text,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

// ─── DocButton ────────────────────────────────────────────────────────────────
function DocButton({
  label,
  docKey,
  app,
  docStatus,
  locked,
  optional,
  onPress,
}: {
  label: string;
  docKey: string;
  app: DriverApplication;
  docStatus: Record<string, 'pending' | 'approved' | 'rejected'>;
  locked: boolean;
  optional?: boolean;
  onPress: (url: string, key: string) => void;
}) {
  const fileData = app.currentRequest?.files?.[docKey] as any;
  const exists = !!fileData;
  const url = exists
    ? fileData.url || `${API_HOST}/uploads/drivers/${fileData.filename}`
    : '';
  const status = docStatus[docKey] || 'pending';
  const m = statusMeta(status);

  // Badge visual para el estado del documento
  const badgeBg = !exists ? (optional ? '#F3F4F6' : C.surface) : m.bg;
  const badgeColor = !exists ? (optional ? C.textMuted : C.textMuted) : m.color;
  const badgeLabel = !exists
    ? optional
      ? 'Opcional'
      : 'Sin enviar'
    : status === 'approved'
    ? locked
      ? '✓ Pre-aprobado'
      : 'Aprobado'
    : status === 'rejected'
    ? 'Rechazado'
    : 'Pendiente';

  return (
    <TouchableOpacity
      style={[
        db.btn,
        exists
          ? { borderColor: m.border }
          : optional
          ? db.btnOptional
          : db.btnMissing,
        locked && db.btnLocked,
      ]}
      onPress={() => exists && onPress(url, docKey)}
      disabled={!exists}
      activeOpacity={0.7}
    >
      <FileText
        size={16}
        color={exists ? m.color : optional ? C.textMuted : C.textMuted}
        strokeWidth={1.8}
      />
      <View style={{ flex: 1 }}>
        <Text style={[db.label, { color: exists ? C.text : C.textMuted }]}>
          {label}
        </Text>
        {optional && <Text style={db.optionalHint}>Documento opcional</Text>}
      </View>
      <View style={[db.badge, { backgroundColor: badgeBg }]}>
        <Text style={[db.badgeTxt, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}
const db = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnMissing: { borderColor: C.border, backgroundColor: C.surface },
  btnOptional: {
    borderColor: C.border,
    backgroundColor: C.surface,
    borderStyle: 'dashed' as const,
  },
  btnLocked: { opacity: 0.75 },
  label: { fontSize: 13, fontWeight: '600' as const },
  optionalHint: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 10, fontWeight: '700' as const },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdminDriverRegistrationScreen: React.FC<Props> = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docImageUrl, setDocImageUrl] = useState<string | null>(null);
  const [docImageModal, setDocImageModal] = useState(false);
  const [currentDocKey, setCurrentDocKey] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState<
    Record<string, 'pending' | 'approved' | 'rejected'>
  >({});
  const [lockedDocs, setLockedDocs] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<DriverApplication[]>([]);

  useEffect(() => {
    loadDriverApplications();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      loadDriverApplications();
    }, []),
  );

  const loadDriverApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await AdminService.getAllDrivers(50, 0);
      if (res?.data?.length > 0) {
        const data = res.data as DriverApplication[];
        setApplications(data);
        if (selectedApp) {
          const updated = data.find(a => a.id === selectedApp.id);
          if (updated) setSelectedApp(updated);
        }
      } else {
        setApplications([]);
      }
    } catch {
      setError('Error al cargar los conductores');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = applications.filter(app => {
    const q = searchText.toLowerCase();
    const matchSearch =
      app.name.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.licenseNumber.toLowerCase().includes(q);
    const matchStatus =
      selectedStatus === 'all' || app.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const initDocStatus = (app: DriverApplication) => {
    const s: Record<string, 'pending' | 'approved' | 'rejected'> = {};
    const locked = new Set<string>();
    docKeys.forEach(d => {
      s[d.key] = 'pending';
    });
    if (app.currentRequest?.files) {
      Object.entries(app.currentRequest.files).forEach(
        ([k, v]: [string, any]) => {
          s[k] = v.status;
          // Documentos aprobados en versiones anteriores (reenvíos) quedan bloqueados:
          // solo se bloquean si la solicitud es un reenvío (version > 1) y el doc
          // ya venía aprobado desde la BD (no es un archivo recién enviado).
          if (
            v.status === 'approved' &&
            (app.currentRequest?.version ?? 1) > 1
          ) {
            locked.add(k);
          }
        },
      );
    }
    setDocStatus(s);
    setLockedDocs(locked);
  };

  const openApp = (app: DriverApplication) => {
    setSelectedApp(app);
    initDocStatus(app);
    setModalVisible(true);
  };

  const approvedDocs = Object.entries(docStatus)
    .filter(([, v]) => v === 'approved')
    .map(([k]) => docKeys.find(d => d.key === k)?.label || k);
  const rejectedDocs = Object.entries(docStatus)
    .filter(([, v]) => v === 'rejected')
    .map(([k]) => docKeys.find(d => d.key === k)?.label || k);
  // Docs con archivo subido (para distinguir opcionales sin enviar)
  const docsWithFiles = new Set(
    Object.keys(selectedApp?.currentRequest?.files || {}),
  );

  const pendingReviewDocs = Object.entries(docStatus).filter(([k, v]) => {
    if (v !== 'pending') return false;
    if (lockedDocs.has(k)) return false;
    const docDef = docKeys.find(d => d.key === k);
    // Documentos opcionales que el conductor no envió no bloquean la aprobación
    if (docDef?.optional && !docsWithFiles.has(k)) return false;
    return true;
  });

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (rejectedDocs.length > 0) {
      Alert.alert(
        'Documentos rechazados',
        'No se puede aprobar. Hay documentos rechazados pendientes.',
      );
      return;
    }
    if (pendingReviewDocs.length > 0) {
      const pendingLabels = pendingReviewDocs
        .map(([k]) => docKeys.find(d => d.key === k)?.label || k)
        .join(', ');
      Alert.alert(
        'Documentos sin revisar',
        `Debes revisar estos documentos antes de aprobar:\n\n${pendingLabels}`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await AdminService.approveDriver(
        selectedApp.currentRequest?.id || selectedApp.id,
      );
      setApplications(prev =>
        prev.map(a =>
          a.id === selectedApp.id ? { ...a, status: 'approved' } : a,
        ),
      );
      Alert.alert(
        'Aprobado',
        `${selectedApp.name} ha sido aprobado como conductor.`,
      );
      setDocStatus({});
      setLockedDocs(new Set());
      setModalVisible(false);
      setSelectedApp(null);
      loadDriverApplications();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Error al aprobar conductor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      Alert.alert('Requerido', 'Ingresa una razón de rechazo');
      return;
    }
    const docMap: Record<string, string> = {};
    docKeys.forEach(d => {
      docMap[d.key] = d.label;
    });
    const rejectedList = Object.entries(docStatus)
      .filter(([, v]) => v === 'rejected')
      .map(([k]) => docMap[k] || k)
      .join(', ');
    const fullReason =
      rejectionReason.trim() +
      (rejectedList ? `\n\nDocumentos a reenviar: ${rejectedList}` : '');

    setIsSubmitting(true);
    try {
      await AdminService.rejectDriver(
        selectedApp.currentRequest?.id || selectedApp.id,
        fullReason,
      );
      setApplications(prev =>
        prev.map(a =>
          a.id === selectedApp.id
            ? { ...a, status: 'rejected', rejectionReason: fullReason }
            : a,
        ),
      );
      Alert.alert(
        'Rechazado',
        `Se notificó a ${selectedApp.name} sobre los documentos a corregir.`,
      );
      setRejectionReason('');
      setDocStatus({});
      setLockedDocs(new Set());
      setRejectModalVisible(false);
      setModalVisible(false);
      setSelectedApp(null);
      loadDriverApplications();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Error al rechazar conductor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ChevronLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Solicitudes de conductores</Text>
        <TouchableOpacity onPress={loadDriverApplications} style={s.backBtn}>
          <RefreshCw size={16} color={C.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { label: 'Pendientes', count: counts.pending, color: C.warning },
          { label: 'Aprobados', count: counts.approved, color: C.success },
          { label: 'Rechazados', count: counts.rejected, color: C.error },
        ].map(st => (
          <View key={st.label} style={s.statItem}>
            <Text style={[s.statNum, { color: st.color }]}>{st.count}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Search size={15} color={C.textMuted} strokeWidth={2} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por nombre, email o licencia..."
          placeholderTextColor={C.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <X size={15} color={C.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {(
          [
            { key: 'all', label: 'Todos' },
            { key: 'pending', label: `Pendientes (${counts.pending})` },
            { key: 'approved', label: `Aprobados (${counts.approved})` },
            { key: 'rejected', label: `Rechazados (${counts.rejected})` },
          ] as const
        ).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, selectedStatus === f.key && s.chipActive]}
            onPress={() => setSelectedStatus(f.key)}
          >
            <Text
              style={[s.chipTxt, selectedStatus === f.key && s.chipTxtActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading / Error */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingTxt}>Cargando solicitudes...</Text>
          </View>
        )}
        {error && !isLoading && (
          <View style={s.errorBanner}>
            <AlertCircle size={14} color={C.error} strokeWidth={2} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        )}

        {/* Result count */}
        {!isLoading && (
          <Text style={s.resultCount}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <View style={s.center}>
            <User size={32} color={C.textMuted} strokeWidth={1.5} />
            <Text style={s.emptyTxt}>Sin solicitudes</Text>
          </View>
        )}

        {/* List */}
        {filtered.map(app => {
          const m = statusMeta(app.status);
          return (
            <TouchableOpacity
              key={app.id}
              style={s.card}
              onPress={() => openApp(app)}
              activeOpacity={0.7}
            >
              <View style={s.cardTop}>
                <InitialsAvatar name={app.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{app.name}</Text>
                  <Text style={s.cardEmail}>{app.email}</Text>
                  <View style={s.cardMeta}>
                    <Car size={11} color={C.primary} strokeWidth={2} />
                    <Text style={s.cardMetaTxt}>
                      {vehicleTypeLabel(app.vehicleType)}
                    </Text>
                    <Text style={s.cardMetaDot}>·</Text>
                    <Text style={s.cardMetaTxt}>{app.vehiclePlate}</Text>
                  </View>
                </View>
                <StatusBadge status={app.status} small />
              </View>

              {/* Verification pills */}
              <View style={s.cardBottom}>
                <View style={[s.pill, app.documentsVerified && s.pillOk]}>
                  {app.documentsVerified ? (
                    <Check size={10} color={C.success} strokeWidth={2.5} />
                  ) : (
                    <Clock size={10} color={C.textMuted} strokeWidth={2} />
                  )}
                  <Text
                    style={[s.pillTxt, app.documentsVerified && s.pillTxtOk]}
                  >
                    Documentos
                  </Text>
                </View>
                <View style={[s.pill, app.backgroundCheckPassed && s.pillOk]}>
                  {app.backgroundCheckPassed ? (
                    <Check size={10} color={C.success} strokeWidth={2.5} />
                  ) : (
                    <Clock size={10} color={C.textMuted} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      s.pillTxt,
                      app.backgroundCheckPassed && s.pillTxtOk,
                    ]}
                  >
                    Antecedentes
                  </Text>
                </View>
                <ChevronRight
                  size={14}
                  color={C.textMuted}
                  strokeWidth={2}
                  style={{ marginLeft: 'auto' }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {selectedApp && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={s.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

            {/* Modal header */}
            <View style={s.header}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedApp(null);
                }}
                style={s.backBtn}
              >
                <ChevronLeft size={20} color={C.text} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Revisión de solicitud</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView
              contentContainerStyle={s.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Identity */}
              <View style={s.modalHero}>
                <InitialsAvatar name={selectedApp.name} size={64} />
                <Text style={s.heroName}>{selectedApp.name}</Text>
                <StatusBadge status={selectedApp.status} />
              </View>

              {/* Resubmission notice */}
              {selectedApp.currentRequest &&
                selectedApp.currentRequest.version > 1 && (
                  <View style={s.resubBanner}>
                    <RefreshCw size={13} color={C.warning} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.resubTitle}>
                        Reenvío v{selectedApp.currentRequest.version} — Revisión
                        parcial
                      </Text>
                      <Text style={s.resubSub}>
                        {lockedDocs.size > 0
                          ? `${lockedDocs.size} doc${
                              lockedDocs.size !== 1 ? 's' : ''
                            } ya aprobado${
                              lockedDocs.size !== 1 ? 's' : ''
                            } · ${pendingReviewDocs.length} pendiente${
                              pendingReviewDocs.length !== 1 ? 's' : ''
                            } de revisión`
                          : 'Revisa solo los documentos marcados como Pendiente'}
                      </Text>
                    </View>
                  </View>
                )}

              {/* Info sections */}
              <View style={s.section}>
                <SectionLabel text="INFORMACIÓN PERSONAL" />
                <DetailRow label="Email" value={selectedApp.email} />
                <DetailRow label="Teléfono" value={selectedApp.phone} />
                <DetailRow
                  label="Fecha de solicitud"
                  value={selectedApp.applicationDate}
                />
              </View>

              <View style={s.section}>
                <SectionLabel text="LICENCIA" />
                <DetailRow label="Número" value={selectedApp.licenseNumber} />
                <DetailRow
                  label="Vencimiento"
                  value={selectedApp.licenseExpiryDate}
                />
              </View>

              <View style={s.section}>
                <SectionLabel text="VEHÍCULO" />
                <DetailRow
                  label="Marca"
                  value={selectedApp.vehicleBrand || '—'}
                />
                <DetailRow
                  label="Modelo"
                  value={selectedApp.vehicleModel || '—'}
                />
                <DetailRow
                  label="Tipo"
                  value={vehicleTypeLabel(selectedApp.vehicleType)}
                />
                <DetailRow label="Placa" value={selectedApp.vehiclePlate} />
                <DetailRow
                  label="Año"
                  value={selectedApp.vehicleYear?.toString()}
                />
                <DetailRow
                  label="Color"
                  value={selectedApp.vehicleColor || ''}
                />
                <DetailRow
                  label="Capacidad pasajeros"
                  value={
                    selectedApp.vehiclePassengerCapacity
                      ? String(selectedApp.vehiclePassengerCapacity)
                      : ''
                  }
                />
              </View>

              {/* Documents */}
              {selectedApp.currentRequest && (
                <View style={s.section}>
                  <SectionLabel
                    text={`DOCUMENTOS — VERSIÓN ${selectedApp.currentRequest.version}`}
                  />
                  {docKeys.map(d => (
                    <DocButton
                      key={d.key}
                      label={d.label}
                      docKey={d.key}
                      app={selectedApp}
                      docStatus={docStatus}
                      locked={lockedDocs.has(d.key)}
                      optional={d.optional}
                      onPress={(url, key) => {
                        setDocImageUrl(url);
                        setCurrentDocKey(key);
                        setDocImageModal(true);
                      }}
                    />
                  ))}
                </View>
              )}

              {/* Summary */}
              {(approvedDocs.length > 0 || rejectedDocs.length > 0) && (
                <View style={s.section}>
                  <SectionLabel text="RESUMEN DE REVISIÓN" />
                  {approvedDocs.length > 0 && (
                    <View
                      style={[
                        s.summaryBox,
                        {
                          borderColor: C.successBorder,
                          backgroundColor: C.successLight,
                        },
                      ]}
                    >
                      <Text style={[s.summaryTitle, { color: C.success }]}>
                        Aprobados ({approvedDocs.length})
                      </Text>
                      {approvedDocs.map(d => (
                        <Text key={d} style={s.summaryItem}>
                          {d}
                        </Text>
                      ))}
                    </View>
                  )}
                  {rejectedDocs.length > 0 && (
                    <View
                      style={[
                        s.summaryBox,
                        {
                          borderColor: C.errorBorder,
                          backgroundColor: C.errorLight,
                          marginTop: 8,
                        },
                      ]}
                    >
                      <Text style={[s.summaryTitle, { color: C.error }]}>
                        Rechazados ({rejectedDocs.length})
                      </Text>
                      {rejectedDocs.map(d => (
                        <Text
                          key={d}
                          style={[s.summaryItem, { color: C.error }]}
                        >
                          {d}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Notes */}
              {!!selectedApp.verificationNotes && (
                <View style={s.section}>
                  <SectionLabel text="NOTAS DE VERIFICACIÓN" />
                  <View style={s.notesBox}>
                    <Text style={s.notesTxt}>
                      {selectedApp.verificationNotes}
                    </Text>
                  </View>
                </View>
              )}

              {/* Rejection reason (if already rejected) */}
              {selectedApp.status === 'rejected' &&
                selectedApp.rejectionReason && (
                  <View style={s.section}>
                    <SectionLabel text="MOTIVO DE RECHAZO" />
                    <View
                      style={[
                        s.summaryBox,
                        {
                          borderColor: C.errorBorder,
                          backgroundColor: C.errorLight,
                        },
                      ]}
                    >
                      <Text style={[s.notesTxt, { color: C.error }]}>
                        {selectedApp.rejectionReason}
                      </Text>
                    </View>
                  </View>
                )}

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.approveBtn, isSubmitting && { opacity: 0.6 }]}
                    onPress={handleApprove}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <>
                        <Check size={16} color={C.white} strokeWidth={2.5} />
                        <Text style={s.actionTxt}>Aprobar conductor</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.rejectBtn, isSubmitting && { opacity: 0.6 }]}
                    onPress={() => setRejectModalVisible(true)}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <X size={16} color={C.error} strokeWidth={2.5} />
                    <Text style={[s.actionTxt, { color: C.error }]}>
                      Rechazar conductor
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ── Rejection Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={rejectModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={s.overlay}>
          <View style={s.rejectModal}>
            <Text style={s.rejectModalTitle}>Motivo de rechazo</Text>
            <Text style={s.rejectModalSub}>
              Explica por qué se rechaza esta solicitud.
            </Text>
            <TextInput
              style={s.rejectInput}
              placeholder="Describe el motivo de rechazo..."
              placeholderTextColor={C.textMuted}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {rejectedDocs.length > 0 && (
              <View
                style={[
                  s.summaryBox,
                  {
                    borderColor: C.errorBorder,
                    backgroundColor: C.errorLight,
                    marginBottom: 16,
                  },
                ]}
              >
                <Text style={[s.summaryTitle, { color: C.error }]}>
                  Docs a reenviar
                </Text>
                {rejectedDocs.map(d => (
                  <Text key={d} style={[s.summaryItem, { color: C.error }]}>
                    {d}
                  </Text>
                ))}
              </View>
            )}
            <View style={s.rejectBtnsRow}>
              <TouchableOpacity
                style={s.rejectCancelBtn}
                onPress={() => {
                  setRejectionReason('');
                  setRejectModalVisible(false);
                }}
              >
                <Text style={s.rejectCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rejectConfirmBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={s.rejectConfirmTxt}>Rechazar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Document Image Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={docImageModal}
        animationType="fade"
        transparent
        onRequestClose={() => setDocImageModal(false)}
      >
        <View style={s.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setDocImageModal(false)}
          />
          <View style={s.imgModal}>
            {docImageUrl && (
              <Image
                source={{ uri: docImageUrl }}
                style={s.docImg}
                resizeMode="contain"
              />
            )}
            {/* Si el doc está bloqueado (ya aprobado en versión anterior) solo mostrar info */}
            {currentDocKey && lockedDocs.has(currentDocKey) ? (
              <View
                style={[
                  s.imgActions,
                  { flexDirection: 'column', alignItems: 'center' },
                ]}
              >
                <View
                  style={[
                    s.imgBtn,
                    {
                      flex: undefined,
                      backgroundColor: C.successLight,
                      borderColor: C.successBorder,
                      width: '100%',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Check size={16} color={C.success} strokeWidth={2.5} />
                  <Text style={[s.imgBtnTxt, { color: C.success }]}>
                    Ya aprobado en versión anterior
                  </Text>
                </View>
              </View>
            ) : (
              <View style={s.imgActions}>
                <TouchableOpacity
                  style={[
                    s.imgBtn,
                    {
                      backgroundColor: C.errorLight,
                      borderColor: C.errorBorder,
                    },
                  ]}
                  onPress={() => {
                    if (currentDocKey) {
                      setDocStatus(p => ({
                        ...p,
                        [currentDocKey]: 'rejected',
                      }));
                    }
                    setDocImageModal(false);
                    setCurrentDocKey(null);
                  }}
                >
                  <X size={16} color={C.error} strokeWidth={2.5} />
                  <Text style={[s.imgBtnTxt, { color: C.error }]}>
                    Rechazar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.imgBtn,
                    {
                      backgroundColor: C.successLight,
                      borderColor: C.successBorder,
                    },
                  ]}
                  onPress={() => {
                    if (currentDocKey) {
                      setDocStatus(p => ({
                        ...p,
                        [currentDocKey]: 'approved',
                      }));
                    }
                    setDocImageModal(false);
                    setCurrentDocKey(null);
                  }}
                >
                  <Check size={16} color={C.success} strokeWidth={2.5} />
                  <Text style={[s.imgBtnTxt, { color: C.success }]}>
                    Aprobar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={s.imgCloseBtn}
              onPress={() => {
                setDocImageModal(false);
                setCurrentDocKey(null);
              }}
            >
              <Text style={s.imgCloseTxt}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  statLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, padding: 0 },

  filtersRow: { maxHeight: 44, marginBottom: 4 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 12, fontWeight: '600', color: C.textSub },
  chipTxtActive: { color: C.white },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingTxt: { fontSize: 13, color: C.textMuted },
  emptyTxt: { fontSize: 14, color: C.textMuted, fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.errorBorder,
  },
  errorTxt: { flex: 1, fontSize: 13, color: C.error, fontWeight: '600' },

  resultCount: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  cardEmail: { fontSize: 12, color: C.textMuted, marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaTxt: { fontSize: 11, color: C.primary, fontWeight: '600' },
  cardMetaDot: { fontSize: 11, color: C.textMuted },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.surfaceHigh,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillOk: { backgroundColor: C.successLight, borderColor: C.successBorder },
  pillTxt: { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  pillTxtOk: { color: C.success },

  // Modal
  modalContent: { padding: 20, paddingBottom: 40 },
  modalHero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 20,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },

  resubBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.warningLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.warningBorder,
  },
  resubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.warning,
    marginBottom: 2,
  },
  resubSub: { fontSize: 12, color: C.warning },

  section: { marginBottom: 20 },

  summaryBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryItem: { fontSize: 12, color: C.textSub, marginBottom: 3 },

  notesBox: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  notesTxt: { fontSize: 13, color: C.text, lineHeight: 20 },

  actions: { gap: 10, marginTop: 4 },
  approveBtn: {
    backgroundColor: C.success,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: C.errorLight,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.errorBorder,
  },
  actionTxt: { fontSize: 15, fontWeight: '700', color: C.white },

  // Overlay / modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  rejectModal: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  rejectModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  rejectModalSub: { fontSize: 13, color: C.textMuted, marginBottom: 14 },
  rejectInput: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 100,
    marginBottom: 14,
  },
  rejectBtnsRow: { flexDirection: 'row', gap: 10 },
  rejectCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  rejectCancelTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  rejectConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: C.error,
    alignItems: 'center',
  },
  rejectConfirmTxt: { fontSize: 14, fontWeight: '700', color: C.white },

  imgModal: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  docImg: { width: '100%', height: 380, borderRadius: 12, marginBottom: 16 },
  imgActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  imgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1.5,
  },
  imgBtnTxt: { fontSize: 14, fontWeight: '700' },
  imgCloseBtn: {
    paddingVertical: 11,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  imgCloseTxt: { fontSize: 14, fontWeight: '600', color: C.textSub },
});

export default AdminDriverRegistrationScreen;
