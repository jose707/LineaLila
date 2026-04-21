// src/screens/DocumentResubmissionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  ChevronLeft,
  Camera,
  ImageIcon,
  Upload,
  Check,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../config/constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

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

type Props = NativeStackScreenProps<any, 'DocumentResubmission'>;

interface RejectedDocument {
  name: string;
  displayName: string;
  fieldName: string;
  photo: string | null;
}

const documentMapping: Record<string, { display: string; field: string }> = {
  profilePhoto: { display: 'Foto del rostro (selfie)', field: 'profilePhoto' },
  ciFront: { display: 'CI — parte frontal', field: 'ciFront' },
  ciBack: { display: 'CI — parte posterior', field: 'ciBack' },
  licenseFront: {
    display: 'Licencia de conducir — frente',
    field: 'licenseFront',
  },
  licenseBack: {
    display: 'Licencia de conducir — dorso',
    field: 'licenseBack',
  },
  antecedentsPhoto: {
    display: 'Certificado de antecedentes',
    field: 'antecedentsPhoto',
  },
  carFront: { display: 'Vehículo — vista delantera', field: 'carFront' },
  carBack: { display: 'Vehículo — vista trasera', field: 'carBack' },
  carLeft: { display: 'Vehículo — lateral izquierda', field: 'carLeft' },
  carRight: { display: 'Vehículo — lateral derecha', field: 'carRight' },
  soatPhoto: { display: 'SOAT — póliza de seguro', field: 'soatPhoto' },
  ruatPhoto: { display: 'RUAT del vehículo', field: 'ruatPhoto' },
};

// ─── PhotoSheet ───────────────────────────────────────────────────────────────
function PhotoSheet({
  visible,
  label,
  current,
  onCamera,
  onGallery,
  onClose,
}: {
  visible: boolean;
  label: string;
  current: string | null;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={ps.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={ps.sheet}>
        <View style={ps.handle} />
        {current ? (
          <Image source={{ uri: current }} style={ps.preview} />
        ) : (
          <View style={ps.empty}>
            <Upload size={28} color={C.textMuted} strokeWidth={1.5} />
          </View>
        )}
        <Text style={ps.label}>{label}</Text>
        <Text style={ps.sub}>
          {current
            ? 'Toca para reemplazar la foto'
            : 'Elige cómo subir la foto'}
        </Text>

        <TouchableOpacity
          style={ps.btn}
          onPress={onCamera}
          activeOpacity={0.75}
        >
          <View style={ps.btnIco}>
            <Camera size={20} color={C.primary} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.btnLbl}>Tomar foto</Text>
            <Text style={ps.btnSub}>Abre la cámara</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={ps.btn}
          onPress={onGallery}
          activeOpacity={0.75}
        >
          <View style={ps.btnIco}>
            <ImageIcon size={20} color={C.primary} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.btnLbl}>Elegir de galería</Text>
            <Text style={ps.btnSub}>Selecciona foto existente</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={ps.cancel} onPress={onClose}>
          <Text style={ps.cancelTxt}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 14,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    resizeMode: 'cover',
    marginBottom: 14,
  },
  empty: {
    width: '100%',
    height: 80,
    borderRadius: 14,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  label: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 },
  sub: { fontSize: 13, color: C.textMuted, marginBottom: 18 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceHigh,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnIco: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  btnLbl: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  btnSub: { fontSize: 12, color: C.textMuted },
  cancel: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  cancelTxt: { fontSize: 15, color: C.textSub, fontWeight: '600' },
});

// ─── DocRow ───────────────────────────────────────────────────────────────────
function DocRow({
  doc,
  onPress,
  disabled,
}: {
  doc: RejectedDocument;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[dr.row, doc.photo && dr.rowDone]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {/* Thumb */}
      <View style={[dr.thumb, doc.photo && dr.thumbDone]}>
        {doc.photo ? (
          <Image source={{ uri: doc.photo }} style={dr.thumbImg} />
        ) : (
          <Camera size={18} color={C.textMuted} strokeWidth={1.6} />
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={dr.name}>{doc.displayName}</Text>
        <Text style={[dr.status, doc.photo && dr.statusDone]}>
          {doc.photo ? 'Foto cargada · toca para cambiar' : 'Toca para subir'}
        </Text>
      </View>

      {/* Check / upload indicator */}
      {doc.photo ? (
        <View style={dr.check}>
          <Check size={13} color={C.white} strokeWidth={2.5} />
        </View>
      ) : (
        <Upload size={16} color={C.textMuted} strokeWidth={1.6} />
      )}
    </TouchableOpacity>
  );
}
const dr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowDone: { borderColor: C.successBorder, backgroundColor: C.successLight },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  thumbDone: { borderColor: C.successBorder },
  thumbImg: { width: 52, height: 52, resizeMode: 'cover' },
  name: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
  status: { fontSize: 12, color: C.textMuted },
  statusDone: { color: C.success },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DocumentResubmissionScreen({
  navigation,
  route,
}: Props) {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Procesando...');
  const [initialLoading, setInitialLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documents, setDocuments] = useState<RejectedDocument[]>([]);

  // Photo sheet state
  const [sheet, setSheet] = useState<{
    visible: boolean;
    index: number;
    label: string;
    current: string | null;
  }>({ visible: false, index: -1, label: '', current: null });

  const rejectedDocs: string[] = route?.params?.rejectedDocs || [];
  const rejectionReasonParam: string = route?.params?.rejectionReason || '';

  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        setRejectionReason(rejectionReasonParam);

        if (rejectedDocs.length > 0) {
          const docArray: RejectedDocument[] = rejectedDocs
            .filter((k: string) => documentMapping[k])
            .map((k: string) => ({
              name: k,
              displayName: documentMapping[k].display,
              fieldName: documentMapping[k].field,
              photo: null,
            }));
          setDocuments(docArray);
          if (docArray.length === 0) {
            Alert.alert(
              'Solicitud rechazada',
              rejectionReasonParam || 'No se especificó motivo.',
            );
          }
        } else {
          Alert.alert(
            'Solicitud rechazada',
            rejectionReasonParam || 'No se especificó motivo.',
          );
        }
      } catch {
        Alert.alert(
          'Error',
          'No se pudo cargar la información de documentos rechazados.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }],
        );
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [rejectedDocs, rejectionReasonParam]);

  // ── Photo picking ─────────────────────────────────────────────────────────
  const openSheet = (index: number) => {
    setSheet({
      visible: true,
      index,
      label: documents[index].displayName,
      current: documents[index].photo,
    });
  };

  const setPhoto = (uri: string) => {
    setDocuments(prev => {
      const next = [...prev];
      next[sheet.index] = { ...next[sheet.index], photo: uri };
      return next;
    });
  };

  const handleCamera = async () => {
    setSheet(p => ({ ...p, visible: false }));
    try {
      const r = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });
      if (r.errorCode === 'permission') {
        Alert.alert(
          'Permiso denegado',
          'Habilita la cámara en Configuración.',
          [
            { text: 'Configuración', onPress: () => Linking.openSettings() },
            { text: 'Cancelar', style: 'cancel' },
          ],
        );
      } else if (r.assets?.[0]?.uri) setPhoto(r.assets[0].uri);
    } catch {
      Alert.alert('Error', 'No se pudo acceder a la cámara.');
    }
  };

  const handleGallery = async () => {
    setSheet(p => ({ ...p, visible: false }));
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (r.assets?.[0]?.uri) setPhoto(r.assets[0].uri);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const missing = documents.filter(d => !d.photo);
    if (missing.length > 0) {
      Alert.alert(
        'Fotos incompletas',
        `Faltan ${missing.length} foto(s) por cargar.`,
      );
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      documents.forEach((doc, i) => {
        if (doc.photo) {
          setLoadingMessage(`Subiendo foto ${i + 1} de ${documents.length}…`);
          form.append(doc.fieldName, {
            uri: doc.photo,
            type: 'image/jpeg',
            name: `${doc.fieldName}.jpg`,
          } as any);
        }
      });
      setLoadingMessage('Enviando solicitud…');
      const res = await fetch(`${API_BASE_URL}/requests/resubmit`, {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Error ${res.status}`);
      }
      Alert.alert(
        'Enviado',
        'Tus documentos han sido reenviados. Un administrador los revisará en 24–48 horas.',
        [{ text: 'Volver', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo reenviar los documentos.');
    } finally {
      setLoading(false);
      setLoadingMessage('Procesando…');
    }
  };

  // ── Initial loading ───────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingTxt}>Cargando documentos rechazados…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filled = documents.filter(d => d.photo).length;
  const total = documents.length;
  const allFilled = filled === total && total > 0;
  const progress = total > 0 ? filled / total : 0;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ChevronLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Reenvío de documentos</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Progress ──────────────────────────────────────────────────────── */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={s.progressTxt}>
            <Text style={s.progressNum}>{filled}</Text>
            <Text style={s.progressOf}> de {total} fotos cargadas</Text>
          </Text>
        </View>

        {/* ── Rejection reason ──────────────────────────────────────────────── */}
        {!!rejectionReason && (
          <View style={s.reasonBox}>
            <View style={s.reasonIconWrap}>
              <AlertTriangle size={16} color={C.warning} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.reasonTitle}>Motivo del rechazo</Text>
              <Text style={s.reasonTxt}>{rejectionReason}</Text>
            </View>
          </View>
        )}

        {/* ── Status summary ────────────────────────────────────────────────── */}
        <View style={s.statusRow}>
          <View
            style={[
              s.statusPill,
              { backgroundColor: C.successLight, borderColor: C.successBorder },
            ]}
          >
            <Check size={11} color={C.success} strokeWidth={2.5} />
            <Text style={[s.statusPillTxt, { color: C.success }]}>
              {filled} listas
            </Text>
          </View>
          <View
            style={[
              s.statusPill,
              { backgroundColor: C.warningLight, borderColor: C.warningBorder },
            ]}
          >
            <Clock size={11} color={C.warning} strokeWidth={2} />
            <Text style={[s.statusPillTxt, { color: C.warning }]}>
              {total - filled} pendientes
            </Text>
          </View>
        </View>

        {/* ── Document list ─────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>FOTOS A REENVIAR</Text>
        {documents.map((doc, i) => (
          <DocRow
            key={doc.name}
            doc={doc}
            onPress={() => openSheet(i)}
            disabled={loading}
          />
        ))}

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        <View style={s.submitWrap}>
          {!allFilled && (
            <Text style={s.submitHint}>
              Carga todas las fotos para continuar
            </Text>
          )}
          <TouchableOpacity
            style={[s.submitBtn, !allFilled && s.submitBtnOff]}
            onPress={handleSubmit}
            disabled={!allFilled || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <>
                <Upload
                  size={17}
                  color={allFilled ? C.white : C.textMuted}
                  strokeWidth={2}
                />
                <Text style={[s.submitTxt, !allFilled && s.submitTxtOff]}>
                  Reenviar {total > 0 ? `(${filled}/${total})` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Photo Sheet ───────────────────────────────────────────────────── */}
      <PhotoSheet
        visible={sheet.visible}
        label={sheet.label}
        current={sheet.current}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onClose={() => setSheet(p => ({ ...p, visible: false }))}
      />

      {/* ── Loading overlay ───────────────────────────────────────────────── */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={s.loadOverlay}>
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadMsg}>{loadingMessage}</Text>
            <Text style={s.loadSub}>No cierres la aplicación</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingTxt: { fontSize: 14, color: C.textMuted, fontWeight: '600' },

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

  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: C.surfaceHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  progressTxt: {},
  progressNum: { fontSize: 15, fontWeight: '800', color: C.primary },
  progressOf: { fontSize: 13, color: C.textMuted },

  reasonBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: C.warningLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.warningBorder,
  },
  reasonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.warning,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  reasonTxt: { fontSize: 13, color: C.warning, lineHeight: 19 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  submitWrap: { marginTop: 8 },
  submitHint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnOff: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
  },
  submitTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },
  submitTxtOff: { color: C.textMuted },

  loadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadBox: {
    backgroundColor: C.bg,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '75%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: C.border,
  },
  loadMsg: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  loadSub: {
    marginTop: 6,
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
  },
});
