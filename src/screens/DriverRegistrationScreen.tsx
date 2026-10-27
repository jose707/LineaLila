import { privateImageSource } from '../utils/privateImageSource';
// src/screens/DriverRegistrationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  User,
  CreditCard,
  FileText,
  Car,
  Shield,
  Camera,
  Image as ImageIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  ScanLine,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../config/constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { ocrService } from '../services/ocr.service';
import { DocumentCameraModal } from '../components/DocumentCameraModal';
import { ExtractedTextModal } from '../components/ExtractedTextModal';
import { CiResultModal } from '../components/CiResultModal';

// ─── Tokens de diseño Línea Lila (acorde a ProfileScreen) ───────────────────
const COLORS = {
  primary: '#7514C5',
  primaryLight: '#F3EAFC',
  primaryMid: '#EAD5F8',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#111118',
  textSecondary: '#7A7A8A',
  textTertiary: '#AFAFBF',
  border: '#E5E5EA',
  borderSubtle: '#F0F0F5',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  white: '#FFFFFF',
};

type Props = NativeStackScreenProps<any, 'DriverRegistration'>;

// ─── Configuración de OCR ─────────────────────────────────────────────────────
const OCR_TYPES = [
  'licenseFront',
  'licenseBack',
  'soatPhoto',
  'ruatPhoto',
];

/** Campos que usan la cámara inteligente de documentos */
const CAMERA_FIELDS = [
  'licenseFront',
  'licenseBack',
  'antecedentsPhoto',
  'ruatPhoto',
  'carFront',
  'carBack',
  'soatPhoto',
];

const CAMERA_TITLES: Record<string, string> = {
  licenseFront: 'Licencia — parte frontal',
  licenseBack: 'Licencia — parte posterior',
  antecedentsPhoto: 'Certificado de antecedentes',
  ruatPhoto: 'RUAT — Registro del vehículo (CRPVA)',
  carFront: 'Vehículo — vista delantera',
  carBack: 'Vehículo — vista trasera',
  soatPhoto: 'SOAT — Seguro obligatorio',
};

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  licenseFront: ['licenseExpiryDate'],
  licenseBack: [],
  soatPhoto: [],
  ruatPhoto: [
    'vehiclePlate',
    'vehicleBrand',
    'vehicleModel',
    'vehicleYear',
    'vehicleColor',
  ],
};

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Nombre completo',
  ciNumber: 'Nº de CI',
  birthDate: 'Fecha de nacimiento',
  issueDate: 'Fecha de emisión',
  expiryDate: 'Fecha de expiración',
  birthPlace: 'Lugar de nacimiento',
  address: 'Domicilio',
  occupation: 'Profesión',
  maritalStatus: 'Estado civil',
  vehicleOwnerCi: 'CI del propietario',
  registrationMunicipality: 'Radicatoria',
  crpvaNumber: 'Nro. CRPVA',
  ruatIssueDate: 'Fecha de emisión RUAT',
  ownershipStartDate: 'Inicio de propiedad',
  doorCount: 'Número de puertas',
  serviceType: 'Tipo de servicio',
  chassisNumber: 'Número de chasis',
  engineNumber: 'Número de motor',
  fuelType: 'Combustible',
  engineDisplacement: 'Cilindrada',
  engineType: 'Tipo de motor',
  legalObservations: 'Observaciones',
  licenseExpiryDate: 'Vencimiento',
  licenseCategory: 'Categoría',
  licenseNumber: 'Nº de licencia',
  nationality: 'Nacionalidad',
  glasses: 'Lentes',
  hearingAid: 'Audífonos',
  soatExpiryDate: 'Vencimiento',
  soatRosetteNumber: 'Nº de roseta',
  soatStartDate: 'Inicio de vigencia',
  soatUse: 'Uso',
  vehiclePlate: 'Placa',
  vehicleBrand: 'Marca',
  vehicleModel: 'Modelo',
  vehicleYear: 'Año',
  vehicleColor: 'Color',
  vehicleClass: 'Clase',
  vehicleType: 'Tipo de vehículo',
  vehiclePassengerCapacity: 'Capacidad',
  vehicleOwnerName: 'Propietario',
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  taxi: 'Taxi',
  minibus: 'Minibus',
  bus: 'Bus',
  motorcycle: 'Motocicleta',
};

const PHOTO_FIELDS = [
  'licenseFront',
  'licenseBack',
  'antecedentsPhoto',
  'carFront',
  'carBack',
  'soatPhoto',
  'ruatPhoto',
];

// ─── Section icon map ─────────────────────────────────────────────────────────
function SectionIcon({
  id,
  size = 25,
  color,
  strokeWidth = 2.2,
}: {
  id: string;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const props = { size, color, strokeWidth };
  switch (id) {
    case 'personal':
      return <User {...props} />;
    case 'ci':
      return <CreditCard {...props} />;
    case 'license':
      return <CreditCard {...props} />;
    case 'antecedents':
      return <FileText {...props} />;
    case 'vehicle':
      return <Car {...props} />;
    case 'docs':
      return <Shield {...props} />;
    default:
      return <FileText {...props} />;
  }
}

// ─── SectionModal ─────────────────────────────────────────────────────────────
function SectionModal({
  visible,
  title,
  onClose,
  onDone,
  children,
  doneDisabled,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDone: () => void;
  children: React.ReactNode;
  doneDisabled?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={mo.safe} edges={['top', 'left', 'right', 'bottom']}>
          <View style={mo.header}>
            <TouchableOpacity onPress={onClose} style={mo.closeBtn} activeOpacity={0.7}>
              <X size={18} color={COLORS.textSecondary} strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={mo.title} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onDone}
              style={[mo.doneBtn, doneDisabled && mo.doneBtnDis]}
              disabled={doneDisabled}
              activeOpacity={0.8}
            >
              <Text style={[mo.doneText, doneDisabled && mo.doneTextDis]}>
                Guardar
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={mo.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mo = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 8,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  doneBtnDis: { backgroundColor: '#F3EAFC' },
  doneText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  doneTextDis: { color: COLORS.primary, opacity: 0.5 },
  content: { padding: 18, paddingBottom: 48, backgroundColor: '#FFFFFF' },
});

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
          <Image source={privateImageSource(current)} style={ps.preview} />
        ) : (
          <View style={ps.empty}>
            <Upload size={28} color={COLORS.textTertiary} strokeWidth={1.6} />
          </View>
        )}
        <Text style={ps.label}>{label}</Text>
        <Text style={ps.sub}>
          {current
            ? 'Toca una opción para reemplazar la foto'
            : 'Elige cómo subir la imagen requerida'}
        </Text>

        <TouchableOpacity
          style={ps.btn}
          onPress={onCamera}
          activeOpacity={0.75}
        >
          <View style={ps.btnIco}>
            <Camera size={20} color={COLORS.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.btnLbl}>Tomar foto</Text>
            <Text style={ps.btnSub}>Abre la cámara del dispositivo</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={ps.btn}
          onPress={onGallery}
          activeOpacity={0.75}
        >
          <View style={ps.btnIco}>
            <ImageIcon size={20} color={COLORS.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.btnLbl}>Elegir de galería</Text>
            <Text style={ps.btnSub}>Selecciona una imagen guardada</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textTertiary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity style={ps.cancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={ps.cancelTxt}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  preview: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  empty: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  label: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  btnIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3EAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLbl: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  btnSub: { fontSize: 12, color: COLORS.textSecondary },
  cancel: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelTxt: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});

// ─── PhotoField ───────────────────────────────────────────────────────────────
function PhotoField({
  label,
  photo,
  onPress,
  required = true,
  extracting = false,
}: {
  label: string;
  photo: string | null;
  onPress: () => void;
  required?: boolean;
  extracting?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[pf.btn, !!photo && pf.btnDone]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={extracting}
    >
      <View style={[pf.thumb, !!photo && pf.thumbDone]}>
        {photo ? (
          <Image source={privateImageSource(photo)} style={pf.img} />
        ) : (
          <Camera size={20} color={COLORS.textTertiary} strokeWidth={1.8} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={pf.label}>
          {label}
          {required && !photo && <Text style={{ color: COLORS.danger }}> *</Text>}
        </Text>
        <Text style={[pf.status, !!photo && pf.statusDone]}>
          {extracting
            ? 'Analizando documento…'
            : photo
            ? 'Foto cargada · toca para cambiar'
            : 'Toca para agregar foto'}
        </Text>
      </View>
      {extracting ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : photo ? (
        <View style={pf.check}>
          <Check size={13} color={COLORS.success} strokeWidth={2.8} />
        </View>
      ) : (
        <View style={pf.uploadCircle}>
          <Upload size={15} color={COLORS.textTertiary} strokeWidth={1.8} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const pf = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  btnDone: {
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F7F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  thumbDone: { borderColor: '#E5E5EA' },
  img: { width: 48, height: 48, resizeMode: 'cover' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  status: { fontSize: 12, color: COLORS.textSecondary },
  statusDone: { color: COLORS.primary, fontWeight: '500' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3EAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── OcrSummary: muestra los datos detectados automáticamente ────────────────
function OcrSummary({
  result,
  showTypeLabels = false,
}: {
  result: { fields: Record<string, string>; missing: string[]; error?: string } | undefined;
  showTypeLabels?: boolean;
}) {
  if (!result) return null;
  const entries = Object.entries(result.fields || {}).filter(
    ([k, v]) => FIELD_LABELS[k] && v,
  );

  return (
    <View style={oc.box}>
      <View style={oc.titleRow}>
        <View style={oc.titleIcon}>
          <ScanLine size={14} color={COLORS.primary} strokeWidth={2.2} />
        </View>
        <Text style={oc.title}>Datos detectados automáticamente</Text>
      </View>

      {entries.map(([k, v], idx) => {
        const display =
          k === 'vehicleType' && showTypeLabels && VEHICLE_TYPE_LABELS[v]
            ? VEHICLE_TYPE_LABELS[v]
            : v;
        const isLast = idx === entries.length - 1;
        return (
          <View key={k} style={[oc.row, !isLast && oc.rowBorder]}>
            <Text style={oc.k}>{FIELD_LABELS[k]}</Text>
            <Text style={oc.v}>{display}</Text>
          </View>
        );
      })}

      {entries.length === 0 && (
        <Text style={oc.emptyTxt}>Aún no se detectaron datos.</Text>
      )}

      {result.error ? (
        <View style={oc.warnRow}>
          <AlertTriangle size={13} color={COLORS.danger} strokeWidth={2.2} />
          <Text style={[oc.warnTxt, { color: COLORS.danger }]}>
            {result.error}
          </Text>
        </View>
      ) : (
        result.missing &&
        result.missing.length > 0 && (
          <View style={oc.warnRow}>
            <AlertTriangle size={13} color={COLORS.warning} strokeWidth={2.2} />
            <Text style={oc.warnTxt}>
              No se detectó:{' '}
              {result.missing
                .map((k) => FIELD_LABELS[k] || k)
                .join(', ')}
              . Sube una foto más clara.
            </Text>
          </View>
        )
      )}
    </View>
  );
}

const oc = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  titleIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  k: { fontSize: 13, color: COLORS.textSecondary },
  v: { fontSize: 13, fontWeight: '700', color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
  emptyTxt: { fontSize: 12, color: COLORS.textTertiary, paddingVertical: 4 },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    padding: 10,
  },
  warnTxt: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 16 },
});

// ─── SectionRow (Tarjeta de Sección en la lista principal) ─────────────────────
function SectionRow({
  id,
  title,
  subtitle,
  done,
  warning,
  onPress,
}: {
  id: string;
  title: string;
  subtitle: string;
  done: boolean;
  warning?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sr.row, done && sr.rowDone, !!warning && sr.rowWarn]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={sr.ico}>
        {done ? (
          <Check size={24} color={COLORS.success} strokeWidth={2.8} />
        ) : (
          <SectionIcon id={id} size={25} color={COLORS.primary} strokeWidth={2.2} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sr.title}>{title}</Text>
        <Text style={[sr.sub, done && sr.subDone, !!warning && sr.subWarn]} numberOfLines={1}>
          {done ? 'Completado' : warning ? warning : subtitle}
        </Text>
      </View>

      {done && (
        <View style={sr.doneBadge}>
          <Text style={sr.doneBadgeText}>Listo</Text>
        </View>
      )}

      {!!warning && (
        <View style={sr.warnBadge}>
          <Text style={sr.warnBadgeText}>Observado</Text>
        </View>
      )}

      <ChevronRight
        size={20}
        color={done ? COLORS.success : COLORS.textTertiary}
        strokeWidth={2}
      />
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rowDone: {
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  rowWarn: {
    borderColor: '#D9770640',
    backgroundColor: '#FFFFFF',
  },
  ico: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  sub: { fontSize: 13, color: COLORS.textSecondary },
  subDone: { color: COLORS.success, fontWeight: '500' },
  subWarn: { color: COLORS.warning, fontWeight: '500' },
  doneBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  warnBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  warnBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.warning,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DriverRegistrationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const route = useRoute<any>();
  const navigationParams = route.params;

  // Fotos subidas por campo
  const [photos, setPhotos] = useState<Record<string, string | null>>(
    Object.fromEntries(PHOTO_FIELDS.map((f) => [f, null])),
  );

  // Resultados OCR por campo
  const [ocrResults, setOcrResults] = useState<
    Record<string, { fields: Record<string, string>; missing: string[]; rawText: string; error?: string }>
  >({});

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Procesando…');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [cameraField, setCameraField] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<{
    field: string;
    text: string;
    missing: string[];
    image?: string;
  } | null>(null);
  const [ciResultVisible, setCiResultVisible] = useState(false);
  const [rejectedView, setRejectedView] = useState<{
    field: string;
    text: string;
    image?: string;
  } | null>(null);
  const [photoSheet, setPhotoSheet] = useState<{
    visible: boolean;
    field: string | null;
    label: string;
    current: string | null;
  }>({ visible: false, field: null, label: '', current: null });

  // Redirigir si ya fue rechazada
  React.useEffect(() => {
    const check = async () => {
      try {
        if (navigationParams?.isResubmission) {
          navigation.navigate('DocumentResubmission' as never);
          return;
        }
        const r = await fetch(`${API_BASE_URL}/drivers/status`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        if (r.ok) {
          const d = await r.json();
          if (d.status === 'rejected')
            navigation.navigate('DocumentResubmission' as never);
        }
      } catch {}
    };
    if (token) check();
  }, [token, navigation, navigationParams?.isResubmission]);

  // ── OCR ─────────────────────────────────────────────────────────────────────
  const runOcr = async (
    field: string,
    uri: string,
    crop?: { screenW: number; screenH: number; x: number; y: number; w: number; h: number },
  ) => {
    setExtracting(field);
    try {
      const res = await ocrService.extractDocument(uri, field, token || '', {
        crop,
      });

      if (res.rejected) {
        setPhotos((prev) => ({ ...prev, [field]: null }));
        setOcrResults((prev) => ({
          ...prev,
          [field]: {
            fields: {},
            missing: REQUIRED_BY_TYPE[field] || [],
            rawText: '',
            error: res.rejectReason || 'Documento incorrecto',
          },
        }));
        const buttons =
          CAMERA_FIELDS.includes(field)
            ? [
                { text: 'Cancelar', style: 'cancel' as const },
                { text: 'Ver texto leído', onPress: () => setRejectedView({ field, text: res.rawText || '', image: res.previewBase64 }) },
                { text: 'Reintentar', onPress: () => setCameraField(field) },
              ]
            : [{ text: 'OK' }];
        Alert.alert(
          'Foto rechazada',
          res.rejectReason || 'El documento no es válido.',
          buttons,
        );
        return;
      }

      setOcrResults((prev) => ({
        ...prev,
        [field]: {
          fields: res.fields || {},
          missing: res.missing || [],
          rawText: res.rawText || '',
        },
      }));

      // Frente: confirmar el OCR antes de continuar con el reverso.
      if (field === 'ciFront' || field === 'licenseFront') {
        setExtractedText({
          field,
          text: res.rawText || '',
          missing: (res.missing || []).map(
            (k) => FIELD_LABELS[k] || k,
          ),
          image: res.previewBase64,
        });
      } else if (field === 'ciBack') {
        setCiResultVisible(true);
      } else if (field === 'licenseBack') {
        setExtractedText({
          field,
          text: res.rawText || '',
          missing: [],
          image: res.previewBase64,
        });
      } else if (field === 'ruatPhoto' || field === 'soatPhoto') {
        setExtractedText({
          field,
          text: res.rawText || '',
          missing: (res.missing || []).map(
            (k) => FIELD_LABELS[k] || k,
          ),
          image: res.previewBase64,
        });
      }
    } catch (e: any) {
      setOcrResults((prev) => ({
        ...prev,
        [field]: {
          fields: {},
          missing: REQUIRED_BY_TYPE[field] || [],
          rawText: '',
          error: e?.message || 'Error de OCR',
        },
      }));
      Alert.alert(
        'No se pudo extraer',
        e?.message
          ? `${e.message}`
          : 'No pudimos leer esta foto. Vuelve a subir una imagen más clara.',
      );
    } finally {
      setExtracting(null);
    }
  };

  const applyPhoto = (
    field: string,
    uri: string,
    crop?: { screenW: number; screenH: number; x: number; y: number; w: number; h: number },
  ) => {
    setPhotos((prev) => ({ ...prev, [field]: uri }));
    if (OCR_TYPES.includes(field)) runOcr(field, uri, crop);
  };

  // ── Photo picking ───────────────────────────────────────────────────────────
  const openPhoto = (field: string, label: string) =>
    setPhotoSheet({
      visible: true,
      field,
      label,
      current: photos[field] || null,
    });

  const handleCamera = async () => {
    const field = photoSheet.field;
    if (!field) return;
    setPhotoSheet((p) => ({ ...p, visible: false }));
    if (CAMERA_FIELDS.includes(field)) {
      setCameraField(field);
      return;
    }
    try {
      const r = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
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
      } else if (r.assets?.[0]?.uri) applyPhoto(field, r.assets[0].uri, undefined);
    } catch {
      Alert.alert('Error', 'No se pudo acceder a la cámara.');
    }
  };

  const handleGallery = async () => {
    const field = photoSheet.field;
    if (!field) return;
    setPhotoSheet((p) => ({ ...p, visible: false }));
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
      if (r.assets?.[0]?.uri) applyPhoto(field, r.assets[0].uri);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  // ── Completion ──────────────────────────────────────────────────────────────
  const missingFor = (field: string): string[] => {
    const res = ocrResults[field];
    if (!res) return REQUIRED_BY_TYPE[field] || [];
    if (res.error) return REQUIRED_BY_TYPE[field] || [];
    return res.missing || [];
  };

  const licenseFrontFields = ocrResults.licenseFront?.fields || {};
  const licenseBackFields = ocrResults.licenseBack?.fields || {};
  const licenseSidesMatch =
    licenseFrontFields.licenseNumber === licenseBackFields.licenseNumber &&
    licenseFrontFields.issueDate === licenseBackFields.issueDate &&
    licenseFrontFields.licenseExpiryDate === licenseBackFields.licenseExpiryDate &&
    licenseFrontFields.licenseCategory === licenseBackFields.licenseCategory;

  const done = {
    license:
      !!photos.licenseFront &&
      !!photos.licenseBack &&
      missingFor('licenseFront').length === 0 &&
      missingFor('licenseBack').length === 0 &&
      licenseSidesMatch,
    antecedents: !!photos.antecedentsPhoto,
    vehicle:
      !!photos.ruatPhoto &&
      !!photos.carFront &&
      !!photos.carBack &&
      missingFor('ruatPhoto').length === 0,
    docs: !!photos.soatPhoto,
  };

  const warningText = (key: keyof typeof done): string | undefined => {
    const photosOk: Record<string, boolean> = {
      license: !!photos.licenseFront && !!photos.licenseBack,
      antecedents: !!photos.antecedentsPhoto,
      vehicle:
        !!photos.ruatPhoto &&
        !!photos.carFront &&
        !!photos.carBack,
      docs: !!photos.soatPhoto,
    };
    if (!photosOk[key]) return undefined;
    if (key === 'license' && !licenseSidesMatch) {
      return 'Los datos del frente y reverso no coinciden';
    }
    const missingKey = key === 'license' ? 'licenseFront' : key === 'vehicle' ? 'ruatPhoto' : null;
    if (!missingKey) return undefined;
    const missing = missingFor(missingKey);
    if (missing.length === 0) return undefined;
    return `Faltan datos: ${missing.map((k) => FIELD_LABELS[k] || k).join(', ')}`;
  };

  const completedCount = Object.values(done).filter(Boolean).length;
  const allDone = completedCount === 4;

  // ── Guía Licencia: cámara directa, primero frontal y luego trasera ────────
  const openLicenseSection = () => {
    if (!photos.licenseFront || missingFor('licenseFront').length > 0) {
      setCameraField('licenseFront');
      return;
    }
    if (!photos.licenseBack || missingFor('licenseBack').length > 0) {
      setCameraField('licenseBack');
      return;
    }
    setActiveModal('license');
  };

  // ── Guía Vehículo: cámara directa (RUAT -> Frente -> Trasera) ─────────────
  const openVehicleSection = () => {
    if (!photos.ruatPhoto || missingFor('ruatPhoto').length > 0) {
      setCameraField('ruatPhoto');
      return;
    }
    if (!photos.carFront) {
      setCameraField('carFront');
      return;
    }
    if (!photos.carBack) {
      setCameraField('carBack');
      return;
    }
    setActiveModal('vehicle');
  };

  // ── Guía SOAT: cámara directa ─────────────────────────────────────────────
  const openSoatSection = () => {
    if (!photos.soatPhoto) {
      setCameraField('soatPhoto');
      return;
    }
    setActiveModal('docs');
  };

  // ── Modal de texto extraído (frente de CI, licencia o RUAT) ───────────────
  const handleExtractedContinue = () => {
    const current = extractedText;
    setExtractedText(null);
    if (current?.field === 'licenseFront' && !photos.licenseBack) {
      setCameraField('licenseBack');
    } else if (current?.field === 'ruatPhoto') {
      if (!photos.carFront) {
        setCameraField('carFront');
      } else if (!photos.carBack) {
        setCameraField('carBack');
      }
    }
  };

  const handleExtractedRepeat = () => {
    const current = extractedText;
    setExtractedText(null);
    if (current) setCameraField(current.field);
  };

  // ── Modal de resultado (ambos lados) ───────────────────────────────────────
  const handleCiResultContinue = () => {
    setCiResultVisible(false);
  };

  const handleCiResultRepeatBack = () => {
    setCiResultVisible(false);
    setCameraField('ciBack');
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!allDone) return;

    const lic = ocrResults.licenseFront?.fields || {};
    const soat = ocrResults.soatPhoto?.fields || {};
    const ruat = ocrResults.ruatPhoto?.fields || {};

    setLoading(true);
    try {
      if (!token) throw new Error('No hay sesión activa.');
      const form = new FormData();
      form.append('licenseExpiryDate', lic.licenseExpiryDate || '');
      form.append('licenseCategory', lic.licenseCategory || '');
      form.append('licenseNumber', lic.licenseNumber || '');
      form.append('licenseIssueDate', lic.issueDate || '');
      form.append('licenseNationality', lic.nationality || '');
      form.append('licenseGlasses', (ocrResults.licenseBack?.fields || {}).glasses || '');
      form.append('licenseHearingAid', (ocrResults.licenseBack?.fields || {}).hearingAid || '');
      form.append('vehicleType', ruat.vehicleType || 'taxi');
      form.append('vehicleBrand', ruat.vehicleBrand || '');
      form.append('vehicleModel', ruat.vehicleModel || '');
      form.append('vehiclePlate', ruat.vehiclePlate || '');
      form.append('vehicleYear', ruat.vehicleYear || '');
      form.append('vehicleColor', ruat.vehicleColor || '');
      form.append(
        'vehiclePassengerCapacity',
        String(ruat.vehiclePassengerCapacity || 4),
      );
      form.append('status', 'pending');

      const add = (k: string, uri: string | null, msg: string) => {
        if (!uri) return;
        setLoadingMsg(msg);
        form.append(k, { uri, type: 'image/jpeg', name: `${k}.jpg` } as any);
      };
      add('licenseFront', photos.licenseFront, 'Subiendo licencia de conducir…');
      add('licenseBack', photos.licenseBack, 'Subiendo licencia de conducir…');
      add('antecedentsPhoto', photos.antecedentsPhoto, 'Subiendo antecedentes…');
      add('carFront', photos.carFront, 'Subiendo fotos del vehículo…');
      add('carBack', photos.carBack, 'Subiendo fotos del vehículo…');
      add('soatPhoto', photos.soatPhoto, 'Subiendo SOAT…');
      add('ruatPhoto', photos.ruatPhoto, 'Subiendo RUAT…');

      // Texto OCR crudo por documento para verificación del admin
      const ocrPayload: Record<string, any> = {};
      Object.entries(ocrResults).forEach(([k, res]) => {
        if (!res) return;
        ocrPayload[k] = { fields: res.fields, text: res.rawText };
      });
      form.append('ocrData', JSON.stringify(ocrPayload));

      setLoadingMsg('Enviando solicitud…');
      const res = await fetch(`${API_BASE_URL}/requests/register`, {
        method: 'POST',
        body: form,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || `Error ${res.status}`);
      }
      Alert.alert(
        'Solicitud enviada con éxito',
        'Revisaremos tu aplicación en 24–48 horas y te notificaremos por correo.',
        [{ text: 'Listo', onPress: () => navigation.navigate('Map' as never) }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
      setLoadingMsg('Procesando…');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header Minimalista (consistente con ProfileScreen) */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Registro de Conductor</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Barra de progreso minimalista */}
        <View style={s.progressRow}>
          <View style={s.track}>
            <View style={[s.fill, { width: `${(completedCount / 4) * 100}%` }]} />
          </View>
          <View style={s.progressBadge}>
            <Text style={s.progressBadgeNum}>{completedCount}</Text>
            <Text style={s.progressBadgeOf}> de 4</Text>
          </View>
        </View>

        {/* Lista de Secciones */}
        <SectionRow
          id="license"
          title="Licencia de conducir"
          subtitle="Por ambos lados (cámara directa)"
          done={done.license}
          warning={warningText('license')}
          onPress={openLicenseSection}
        />
        <SectionRow
          id="antecedents"
          title="Antecedentes policiales"
          subtitle={
            photos.antecedentsPhoto
              ? 'Certificado oficial registrado'
              : 'Certificado oficial (cámara directa)'
          }
          done={done.antecedents}
          onPress={() => setCameraField('antecedentsPhoto')}
        />
        <SectionRow
          id="vehicle"
          title="Información del vehículo"
          subtitle={
            done.vehicle
              ? 'RUAT y vehículo registrados'
              : photos.ruatPhoto
              ? 'Faltan fotos del vehículo (cámara directa)'
              : 'RUAT y vehículo (cámara directa)'
          }
          done={done.vehicle}
          warning={warningText('vehicle')}
          onPress={openVehicleSection}
        />
        <SectionRow
          id="docs"
          title="SOAT — Póliza de seguro"
          subtitle={
            done.docs
              ? 'Póliza SOAT registrada'
              : 'Póliza vigente (cámara directa)'
          }
          done={done.docs}
          onPress={openSoatSection}
        />
      </ScrollView>

      {/* Footer Minimalista Fijo */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 14, 24) }]}>
        {!allDone && (
          <Text style={s.footerHint}>Completar campos obligatorios</Text>
        )}
        <TouchableOpacity
          style={[s.submitBtn, !allDone && s.submitBtnOff]}
          onPress={handleSubmit}
          disabled={!allDone || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={[s.submitTxt, !allDone && s.submitTxtOff]}>
              {allDone ? 'Registrar como conductor' : `Completar registro (${completedCount}/4)`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── MODAL: Licencia ─────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'license'}
        title="Licencia de conducir"
        onClose={() => setActiveModal(null)}
        onDone={() => setActiveModal(null)}
        doneDisabled={!photos.licenseFront || !photos.licenseBack}
      >
        <Text style={s.lbl}>FOTOS DE LICENCIA *</Text>
        <PhotoField
          label="Licencia — parte frontal"
          photo={photos.licenseFront}
          extracting={extracting === 'licenseFront'}
          onPress={() => openPhoto('licenseFront', 'Licencia frontal')}
        />
        <PhotoField
          label="Licencia — parte posterior"
          photo={photos.licenseBack}
          extracting={extracting === 'licenseBack'}
          onPress={() => openPhoto('licenseBack', 'Licencia posterior')}
        />
        <OcrSummary result={ocrResults.licenseFront} />
      </SectionModal>

      {/* ── MODAL: Antecedentes ─────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'antecedents'}
        title="Antecedentes policiales"
        onClose={() => setActiveModal(null)}
        onDone={() => setActiveModal(null)}
        doneDisabled={!photos.antecedentsPhoto}
      >
        <Text style={s.lbl}>CERTIFICADO DE ANTECEDENTES *</Text>
        <PhotoField
          label="Certificado de antecedentes"
          photo={photos.antecedentsPhoto}
          onPress={() =>
            openPhoto('antecedentsPhoto', 'Certificado de antecedentes')
          }
        />
      </SectionModal>

      {/* ── MODAL: Vehículo ─────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'vehicle'}
        title="Información del vehículo"
        onClose={() => setActiveModal(null)}
        onDone={() => setActiveModal(null)}
        doneDisabled={
          !photos.ruatPhoto ||
          !photos.carFront ||
          !photos.carBack
        }
      >
        <Text style={s.lbl}>RUAT — DATOS DEL VEHÍCULO *</Text>
        <PhotoField
          label="Foto del RUAT"
          photo={photos.ruatPhoto}
          extracting={extracting === 'ruatPhoto'}
          onPress={() => openPhoto('ruatPhoto', 'RUAT')}
        />
        <OcrSummary result={ocrResults.ruatPhoto} showTypeLabels />
        <View style={{ height: 14 }} />
        <Text style={s.lbl}>FOTOS DEL VEHÍCULO *</Text>
        <PhotoField
          label="Vista delantera"
          photo={photos.carFront}
          onPress={() => openPhoto('carFront', 'Vista delantera')}
        />
        <PhotoField
          label="Vista trasera"
          photo={photos.carBack}
          onPress={() => openPhoto('carBack', 'Vista trasera')}
        />
      </SectionModal>

      {/* ── MODAL: Docs ─────────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'docs'}
        title="SOAT"
        onClose={() => setActiveModal(null)}
        onDone={() => setActiveModal(null)}
        doneDisabled={!photos.soatPhoto}
      >
        <Text style={s.lbl}>SOAT — SEGURO OBLIGATORIO *</Text>
        <PhotoField
          label="Foto del SOAT"
          photo={photos.soatPhoto}
          extracting={extracting === 'soatPhoto'}
          onPress={() => openPhoto('soatPhoto', 'SOAT')}
        />
        <OcrSummary result={ocrResults.soatPhoto} />
        <View style={s.infoBox}>
          <Text style={s.infoTxt}>
            El SOAT es obligatorio y debe encontrarse vigente.
          </Text>
        </View>
      </SectionModal>

      {/* Photo sheet selector */}
      <PhotoSheet
        visible={photoSheet.visible}
        label={photoSheet.label}
        current={photoSheet.current}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onClose={() => setPhotoSheet((p) => ({ ...p, visible: false }))}
      />

      {/* Cámara de documentos */}
      <DocumentCameraModal
        visible={cameraField !== null}
        title={cameraField ? CAMERA_TITLES[cameraField] || 'Documento' : ''}
        documentType={
          cameraField === 'antecedentsPhoto'
            ? 'certificate'
            : cameraField === 'soatPhoto'
            ? 'soat'
            : cameraField === 'ruatPhoto'
            ? 'ruat'
            : cameraField === 'carFront' || cameraField === 'carBack'
            ? 'vehicle'
            : 'card'
        }
        frameLabel={
          cameraField === 'ciFront'
            ? 'Coloca el frente de la cédula dentro del recuadro'
            : cameraField === 'ciBack'
            ? 'Coloca la parte trasera de la cédula dentro del recuadro'
            : cameraField === 'licenseFront'
            ? 'Coloca el frente de la licencia dentro del recuadro'
            : cameraField === 'licenseBack'
            ? 'Coloca la parte trasera de la licencia dentro del recuadro'
            : cameraField === 'antecedentsPhoto'
            ? 'Encuadra el certificado de antecedentes completo'
            : cameraField === 'ruatPhoto'
            ? 'Encuadra el documento RUAT (CRPVA) horizontal completo'
            : cameraField === 'soatPhoto'
            ? 'Encuadra el certificado o comprobante SOAT completo'
            : cameraField === 'carFront'
            ? 'Encuadra la parte delantera de tu vehículo'
            : cameraField === 'carBack'
            ? 'Encuadra la parte trasera con la placa visible'
            : ''
        }
        autoCapture={false}
        onCapture={(uri: string, frame?: { screenW: number; screenH: number; x: number; y: number; w: number; h: number }) => {
          const field = cameraField;
          setCameraField(null);
          if (field) {
            applyPhoto(field, uri, frame);
            if (field === 'carFront' && !photos.carBack) {
              setTimeout(() => setCameraField('carBack'), 350);
            }
          }
        }}
        onClose={() => setCameraField(null)}
      />

      {/* Texto extraído del documento */}
      <ExtractedTextModal
        visible={extractedText !== null}
        title={
          extractedText
            ? CAMERA_TITLES[extractedText.field] || 'Texto extraído'
            : ''
        }
        text={extractedText?.text || ''}
        missing={extractedText?.missing || []}
        image={extractedText?.image}
        continueLabel={
          extractedText?.field === 'ciFront' || extractedText?.field === 'licenseFront'
            ? 'Continuar con la parte trasera'
            : extractedText?.field === 'ruatPhoto'
            ? 'Continuar con fotos del vehículo'
            : 'Listo'
        }
        onContinue={handleExtractedContinue}
        onRepeat={handleExtractedRepeat}
        onClose={() => setExtractedText(null)}
      />

      {/* Resultado combinado de ambos lados */}
      <CiResultModal
        visible={ciResultVisible}
        front={ocrResults.ciFront || null}
        back={ocrResults.ciBack || null}
        onContinue={handleCiResultContinue}
        onRepeatBack={handleCiResultRepeatBack}
        onClose={() => setCiResultVisible(false)}
      />

      {/* Texto leído en una foto rechazada (diagnóstico) */}
      <ExtractedTextModal
        visible={rejectedView !== null}
        title={
          rejectedView
            ? CAMERA_TITLES[rejectedView.field] || 'Texto leído'
            : ''
        }
        text={rejectedView?.text || ''}
        missing={[]}
        image={rejectedView?.image}
        continueLabel="Entendido"
        onContinue={() => setRejectedView(null)}
        onRepeat={() => {
          const field = rejectedView?.field || null;
          setRejectedView(null);
          if (field) setCameraField(field);
        }}
        onClose={() => setRejectedView(null)}
      />

      {/* Overlay de análisis OCR */}
      {extracting !== null && (
        <View style={s.analyzingOverlay}>
          <View style={s.analyzingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.analyzingTxt}>Analizando documento…</Text>
            <Text style={s.analyzingSub}>Esto puede tomar unos segundos</Text>
          </View>
        </View>
      )}

      {/* Loading overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={s.loadOverlay}>
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadMsg}>{loadingMsg}</Text>
            <Text style={s.loadSub}>No cierres la aplicación</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },

  /* Progress Row Minimalista */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeNum: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressBadgeOf: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.primary,
  },

  lbl: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },

  /* Footer */
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  footerHint: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnOff: {
    backgroundColor: '#F3EAFC',
    borderWidth: 0,
  },
  submitTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  submitTxtOff: {
    color: COLORS.primary,
    opacity: 0.6,
  },

  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  infoTxt: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  /* Overlays */
  loadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
  analyzingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '75%',
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  analyzingTxt: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  analyzingSub: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  loadMsg: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadSub: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
