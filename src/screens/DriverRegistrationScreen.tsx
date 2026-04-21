// src/screens/DriverRegistrationScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  Calendar,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../config/constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { VEHICLE_TYPES, vehicleTypeLabel } from '../utils/vehicleTypes';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  primaryGlow: '#7514C510',
  primaryBorder: '#7514C530',
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceHigh: '#F3F3F3',
  border: '#E5E5E5',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#ADADAD',
  success: '#16A34A',
  successGlow: '#16A34A10',
  successBorder: '#16A34A35',
  error: '#DC2626',
  white: '#FFFFFF',
};

type Props = NativeStackScreenProps<any, 'DriverRegistration'>;

// ─── Section icon map ─────────────────────────────────────────────────────────
function SectionIcon({
  id,
  size = 20,
  color,
}: {
  id: string;
  size?: number;
  color: string;
}) {
  const props = { size, color, strokeWidth: 1.8 };
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

// ─── DateInput ────────────────────────────────────────────────────────────────
function DateInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const p = value ? value.split('/') : ['', '', ''];
  const [d, setD] = useState(p[0] || '');
  const [m, setM] = useState(p[1] || '');
  const [y, setY] = useState(p[2] || '');
  const mRef = useRef<TextInput>(null);
  const yRef = useRef<TextInput>(null);

  const emit = (dd: string, mm: string, yy: string) => {
    if (dd && mm && yy && yy.length === 4) onChange(`${dd}/${mm}/${yy}`);
  };

  return (
    <View style={di.wrap}>
      <View style={di.iconWrap}>
        <Calendar size={18} color={C.textMuted} strokeWidth={1.8} />
      </View>
      <View style={di.fields}>
        <View style={di.seg}>
          <Text style={di.lbl}>DÍA</Text>
          <TextInput
            style={di.inp}
            placeholder="01"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            value={d}
            editable={!disabled}
            onChangeText={t => {
              setD(t);
              emit(t, m, y);
              if (t.length === 2) mRef.current?.focus();
            }}
          />
        </View>
        <Text style={di.sep}>/</Text>
        <View style={di.seg}>
          <Text style={di.lbl}>MES</Text>
          <TextInput
            ref={mRef}
            style={di.inp}
            placeholder="01"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            value={m}
            editable={!disabled}
            onChangeText={t => {
              setM(t);
              emit(d, t, y);
              if (t.length === 2) yRef.current?.focus();
            }}
          />
        </View>
        <Text style={di.sep}>/</Text>
        <View style={[di.seg, { flex: 2 }]}>
          <Text style={di.lbl}>AÑO</Text>
          <TextInput
            ref={yRef}
            style={di.inp}
            placeholder="1990"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            value={y}
            editable={!disabled}
            onChangeText={t => {
              setY(t);
              emit(d, m, t);
            }}
          />
        </View>
      </View>
    </View>
  );
}
const di = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  iconWrap: { paddingBottom: 2 },
  fields: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  seg: { flex: 1, alignItems: 'center' },
  lbl: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  inp: {
    fontSize: 22,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    padding: 0,
    width: '100%',
  },
  sep: { fontSize: 22, color: C.border, marginBottom: 4, paddingHorizontal: 4 },
});

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
        <SafeAreaView style={mo.safe}>
          <View style={mo.header}>
            <TouchableOpacity onPress={onClose} style={mo.closeBtn}>
              <X size={16} color={C.textSub} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={mo.title}>{title}</Text>
            <TouchableOpacity
              onPress={onDone}
              style={[mo.doneBtn, doneDisabled && mo.doneBtnDis]}
              disabled={doneDisabled}
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.primary,
    borderRadius: 20,
  },
  doneBtnDis: { backgroundColor: C.surfaceHigh },
  doneText: { fontSize: 14, fontWeight: '700', color: C.white },
  doneTextDis: { color: C.textMuted },
  content: { padding: 20, paddingBottom: 48 },
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
          <Image source={{ uri: current }} style={ps.preview} />
        ) : (
          <View style={ps.empty}>
            <Upload size={32} color={C.textMuted} strokeWidth={1.5} />
          </View>
        )}
        <Text style={ps.label}>{label}</Text>
        <Text style={ps.sub}>
          {current
            ? 'Toca una opción para reemplazar'
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
          <ChevronRight size={18} color={C.textMuted} strokeWidth={2} />
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
          <ChevronRight size={18} color={C.textMuted} strokeWidth={2} />
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
    height: 190,
    borderRadius: 14,
    resizeMode: 'cover',
    marginBottom: 14,
  },
  empty: {
    width: '100%',
    height: 90,
    borderRadius: 14,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  label: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  sub: { fontSize: 13, color: C.textMuted, marginBottom: 20 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnIco: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  btnLbl: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  btnSub: { fontSize: 12, color: C.textMuted },
  cancel: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  cancelTxt: { fontSize: 15, color: C.textSub, fontWeight: '600' },
});

// ─── PhotoField ───────────────────────────────────────────────────────────────
function PhotoField({
  label,
  photo,
  onPress,
  required = true,
}: {
  label: string;
  photo: string | null;
  onPress: () => void;
  required?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[pf.btn, !!photo && pf.btnDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[pf.thumb, !!photo && pf.thumbDone]}>
        {photo ? (
          <Image source={{ uri: photo }} style={pf.img} />
        ) : (
          <Camera size={20} color={C.textMuted} strokeWidth={1.6} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={pf.label}>
          {label}
          {required && !photo && <Text style={{ color: C.error }}> *</Text>}
        </Text>
        <Text style={[pf.status, !!photo && pf.statusDone]}>
          {photo ? 'Foto cargada · toca para cambiar' : 'Toca para subir'}
        </Text>
      </View>
      {photo ? (
        <View style={pf.check}>
          <Check size={14} color={C.white} strokeWidth={2.5} />
        </View>
      ) : (
        <Upload size={18} color={C.textMuted} strokeWidth={1.6} />
      )}
    </TouchableOpacity>
  );
}
const pf = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnDone: { borderColor: C.successBorder, backgroundColor: C.successGlow },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  thumbDone: { borderColor: C.successBorder },
  img: { width: 50, height: 50, resizeMode: 'cover' },
  label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
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

// ─── InputField ───────────────────────────────────────────────────────────────
function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'sentences',
  editable = true,
}: any) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={ifl.lbl}>{label.toUpperCase()}</Text>
      <TextInput
        style={[ifl.inp, !editable && { opacity: 0.4 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
    </View>
  );
}
const ifl = StyleSheet.create({
  lbl: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inp: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
  },
});

// ─── SectionRow ───────────────────────────────────────────────────────────────
function SectionRow({
  id,
  title,
  subtitle,
  done,
  onPress,
}: {
  id: string;
  title: string;
  subtitle: string;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sr.row, done && sr.rowDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[sr.ico, done && sr.icoDone]}>
        {done ? (
          <Check size={20} color={C.white} strokeWidth={2.5} />
        ) : (
          <SectionIcon id={id} size={20} color={C.textSub} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sr.title}>{title}</Text>
        <Text style={[sr.sub, done && sr.subDone]}>
          {done ? 'Completado' : subtitle}
        </Text>
      </View>
      <ChevronRight
        size={18}
        color={done ? C.success : C.textMuted}
        strokeWidth={2}
      />
    </TouchableOpacity>
  );
}
const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowDone: { borderColor: C.successBorder, backgroundColor: C.successGlow },
  ico: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  icoDone: { backgroundColor: C.success, borderColor: C.success },
  title: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  sub: { fontSize: 12, color: C.textMuted },
  subDone: { color: C.success },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DriverRegistrationScreen({ navigation }: Props) {
  const { user: currentUser, token } = useAuth();
  const route = useRoute<any>();
  const navigationParams = route.params;

  // Committed state
  const [birthDate, setBirthDate] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [ciNumber, setCiNumber] = useState('');
  const [ciFront, setCiFront] = useState<string | null>(null);
  const [ciBack, setCiBack] = useState<string | null>(null);
  const [licenseFront, setLicenseFront] = useState<string | null>(null);
  const [licenseBack, setLicenseBack] = useState<string | null>(null);
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [antecedentsPhoto, setAntecedentsPhoto] = useState<string | null>(null);
  const [antecedentsDate, setAntecedentsDate] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePassengerCapacity, setVehiclePassengerCapacity] = useState('');
  const [carFront, setCarFront] = useState<string | null>(null);
  const [carBack, setCarBack] = useState<string | null>(null);
  const [carLeft, setCarLeft] = useState<string | null>(null);
  const [carRight, setCarRight] = useState<string | null>(null);
  const [soatPhoto, setSoatPhoto] = useState<string | null>(null);
  const [ruatPhoto, setRuatPhoto] = useState<string | null>(null);

  // Tmp state (edited in modal, committed on Save)
  const [tmp, setTmp] = useState<Record<string, any>>({});
  const setT = (key: string, val: any) =>
    setTmp(prev => ({ ...prev, [key]: val }));

  // UI
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Procesando…');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [photoSheet, setPhotoSheet] = useState<{
    visible: boolean;
    setter: ((v: string | null) => void) | null;
    label: string;
    current: string | null;
  }>({ visible: false, setter: null, label: '', current: null });

  // Completion checks
  const calcAge = (s: string) => {
    const [d, m, y] = s.split('/').map(Number);
    if (!d || !m || !y) return 0;
    const b = new Date(y, m - 1, d),
      t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const mo = t.getMonth() - b.getMonth();
    if (mo < 0 || (mo === 0 && t.getDate() < b.getDate())) a--;
    return a;
  };

  const done = {
    personal: !!(birthDate && calcAge(birthDate) >= 18 && profilePhoto),
    ci: !!(ciNumber && ciFront && ciBack),
    license: !!(licenseFront && licenseBack && licenseExpiryDate),
    antecedents: !!antecedentsPhoto,
    vehicle: !!(
      vehicleBrand &&
      vehicleModel &&
      vehicleType &&
      vehiclePlate &&
      vehicleYear &&
      vehicleColor &&
      vehiclePassengerCapacity &&
      carFront &&
      carBack &&
      carLeft &&
      carRight
    ),
    docs: !!soatPhoto,
  };
  const completedCount = Object.values(done).filter(Boolean).length;
  const allDone = completedCount === 6;

  // Redirect if rejected
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
  }, [token]);

  // Photo picking
  const openPhoto = (
    setter: (v: string | null) => void,
    label: string,
    current: string | null,
  ) => setPhotoSheet({ visible: true, setter, label, current });

  const handleCamera = async () => {
    if (!photoSheet.setter) return;
    const s = photoSheet.setter;
    setPhotoSheet(p => ({ ...p, visible: false }));
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
      } else if (r.assets?.[0]?.uri) s(r.assets[0].uri);
    } catch {
      Alert.alert('Error', 'No se pudo acceder a la cámara.');
    }
  };

  const handleGallery = async () => {
    if (!photoSheet.setter) return;
    const s = photoSheet.setter;
    setPhotoSheet(p => ({ ...p, visible: false }));
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
      if (r.assets?.[0]?.uri) s(r.assets[0].uri);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  // Open modal → seed tmp
  const openModal = (key: string) => {
    const seed: Record<string, any> = {};
    if (key === 'personal') {
      seed.birthDate = birthDate;
      seed.profilePhoto = profilePhoto;
    }
    if (key === 'ci') {
      seed.ciNumber = ciNumber;
      seed.ciFront = ciFront;
      seed.ciBack = ciBack;
    }
    if (key === 'license') {
      seed.licenseFront = licenseFront;
      seed.licenseBack = licenseBack;
      seed.licenseExpiryDate = licenseExpiryDate;
    }
    if (key === 'antecedents') {
      seed.antecedentsPhoto = antecedentsPhoto;
      seed.antecedentsDate = antecedentsDate;
    }
    if (key === 'vehicle') {
      seed.vehicleBrand = vehicleBrand;
      seed.vehicleModel = vehicleModel;
      seed.vehicleType = vehicleType;
      seed.vehiclePlate = vehiclePlate;
      seed.vehicleYear = vehicleYear;
      seed.vehicleColor = vehicleColor;
      seed.vehiclePassengerCapacity = vehiclePassengerCapacity;
      seed.carFront = carFront;
      seed.carBack = carBack;
      seed.carLeft = carLeft;
      seed.carRight = carRight;
    }
    if (key === 'docs') {
      seed.soatPhoto = soatPhoto;
      seed.ruatPhoto = ruatPhoto;
    }
    setTmp(seed);
    setActiveModal(key);
  };

  // Save modal → commit
  const saveModal = (key: string) => {
    if (key === 'personal') {
      if (!tmp.birthDate) {
        Alert.alert('Campo requerido', 'Ingresa tu fecha de nacimiento');
        return;
      }
      if (calcAge(tmp.birthDate) < 18) {
        Alert.alert('Edad insuficiente', 'Debes ser mayor de 18 años');
        return;
      }
      if (!tmp.profilePhoto) {
        Alert.alert('Campo requerido', 'Sube tu foto de rostro');
        return;
      }
      setBirthDate(tmp.birthDate);
      setProfilePhoto(tmp.profilePhoto);
    }
    if (key === 'ci') {
      if (!tmp.ciNumber?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa tu número de CI');
        return;
      }
      if (!tmp.ciFront) {
        Alert.alert('Campo requerido', 'Sube la foto frontal de tu CI');
        return;
      }
      if (!tmp.ciBack) {
        Alert.alert('Campo requerido', 'Sube la foto posterior de tu CI');
        return;
      }
      setCiNumber(tmp.ciNumber);
      setCiFront(tmp.ciFront);
      setCiBack(tmp.ciBack);
    }
    if (key === 'license') {
      if (!tmp.licenseFront) {
        Alert.alert('Campo requerido', 'Sube la foto frontal de tu licencia');
        return;
      }
      if (!tmp.licenseBack) {
        Alert.alert('Campo requerido', 'Sube la foto posterior de tu licencia');
        return;
      }
      if (!tmp.licenseExpiryDate) {
        Alert.alert(
          'Campo requerido',
          'Ingresa la fecha de expiración de la licencia',
        );
        return;
      }
      setLicenseFront(tmp.licenseFront);
      setLicenseBack(tmp.licenseBack);
      setLicenseExpiryDate(tmp.licenseExpiryDate);
    }
    if (key === 'antecedents') {
      if (!tmp.antecedentsPhoto) {
        Alert.alert('Campo requerido', 'Sube tu certificado de antecedentes');
        return;
      }
      setAntecedentsPhoto(tmp.antecedentsPhoto);
      setAntecedentsDate(tmp.antecedentsDate || '');
    }
    if (key === 'vehicle') {
      if (!tmp.vehicleBrand?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa la marca del vehículo');
        return;
      }
      if (!tmp.vehicleModel?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa el modelo del vehículo');
        return;
      }
      if (!tmp.vehicleType) {
        Alert.alert('Campo requerido', 'Selecciona el tipo de vehículo');
        return;
      }
      if (!tmp.vehiclePlate?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa la placa');
        return;
      }
      if (!tmp.vehicleYear?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa el año del vehículo');
        return;
      }
      if (!tmp.vehicleColor?.trim()) {
        Alert.alert('Campo requerido', 'Ingresa el color del vehículo');
        return;
      }
      if (!tmp.vehiclePassengerCapacity?.toString().trim()) {
        Alert.alert('Campo requerido', 'Ingresa la capacidad de pasajeros');
        return;
      }
      const cap = Number(tmp.vehiclePassengerCapacity);
      if (!Number.isFinite(cap) || cap < 1 || cap > 80) {
        Alert.alert('Valor inválido', 'Capacidad de pasajeros inválida');
        return;
      }
      if (!tmp.carFront || !tmp.carBack || !tmp.carLeft || !tmp.carRight) {
        Alert.alert('Campo requerido', 'Sube todas las fotos del vehículo');
        return;
      }
      setVehicleBrand(tmp.vehicleBrand);
      setVehicleModel(tmp.vehicleModel);
      setVehicleType(tmp.vehicleType);
      setVehiclePlate(tmp.vehiclePlate);
      setVehicleYear(tmp.vehicleYear);
      setVehicleColor(tmp.vehicleColor);
      setVehiclePassengerCapacity(String(cap));
      setCarFront(tmp.carFront);
      setCarBack(tmp.carBack);
      setCarLeft(tmp.carLeft);
      setCarRight(tmp.carRight);
    }
    if (key === 'docs') {
      if (!tmp.soatPhoto) {
        Alert.alert('Campo requerido', 'Sube la foto del SOAT');
        return;
      }
      setSoatPhoto(tmp.soatPhoto);
      setRuatPhoto(tmp.ruatPhoto || null);
    }
    setActiveModal(null);
  };

  // Submit
  const handleSubmit = async () => {
    if (!allDone) return;
    setLoading(true);
    try {
      if (!token) throw new Error('No hay sesión activa.');
      const form = new FormData();
      form.append('birthDate', birthDate);
      form.append('ciNumber', ciNumber);
      form.append('antecedentsDate', antecedentsDate);
      form.append('vehicleType', vehicleType);
      form.append('vehicleBrand', vehicleBrand);
      form.append('vehicleModel', vehicleModel);
      form.append('vehiclePlate', vehiclePlate);
      form.append('vehicleYear', vehicleYear);
      form.append('vehicleColor', vehicleColor);
      form.append('vehiclePassengerCapacity', vehiclePassengerCapacity);
      form.append('licenseExpiryDate', licenseExpiryDate);
      form.append('status', 'pending');
      const add = (k: string, uri: string | null, msg: string) => {
        if (!uri) return;
        setLoadingMsg(msg);
        form.append(k, { uri, type: 'image/jpeg', name: `${k}.jpg` } as any);
      };
      add('profilePhoto', profilePhoto, 'Subiendo foto de rostro…');
      add('ciFront', ciFront, 'Subiendo CI frontal…');
      add('ciBack', ciBack, 'Subiendo CI posterior…');
      add('licenseFront', licenseFront, 'Subiendo licencia de conducir…');
      add('licenseBack', licenseBack, 'Subiendo licencia de conducir…');
      add('antecedentsPhoto', antecedentsPhoto, 'Subiendo antecedentes…');
      add('carFront', carFront, 'Subiendo fotos del vehículo…');
      add('carBack', carBack, 'Subiendo fotos del vehículo…');
      add('carLeft', carLeft, 'Subiendo fotos del vehículo…');
      add('carRight', carRight, 'Subiendo fotos del vehículo…');
      add('soatPhoto', soatPhoto, 'Subiendo SOAT…');
      add('ruatPhoto', ruatPhoto, 'Subiendo RUAT…');
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
        'Solicitud enviada',
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
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ChevronLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Registrar cuenta</Text>
      </View>

      {/* Progress */}
      <View style={s.progressRow}>
        <View style={s.track}>
          <View style={[s.fill, { width: `${(completedCount / 6) * 100}%` }]} />
        </View>
        <Text style={s.progressTxt}>
          <Text style={s.progressNum}>{completedCount}</Text>
          <Text style={s.progressOf}> de 6 ítems</Text>
        </Text>
      </View>

      {/* Section list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionRow
          id="personal"
          title="Información personal"
          subtitle="Haz clic para ingresar la información"
          done={done.personal}
          onPress={() => openModal('personal')}
        />
        <SectionRow
          id="ci"
          title="Cédula de identidad"
          subtitle="Por ambos lados"
          done={done.ci}
          onPress={() => openModal('ci')}
        />
        <SectionRow
          id="license"
          title="Licencia de conducir"
          subtitle="Foto y fecha de vencimiento"
          done={done.license}
          onPress={() => openModal('license')}
        />
        <SectionRow
          id="antecedents"
          title="Antecedentes policiales"
          subtitle="Certificado vigente"
          done={done.antecedents}
          onPress={() => openModal('antecedents')}
        />
        <SectionRow
          id="vehicle"
          title="Información del vehículo"
          subtitle="Haz clic para ingresar la información"
          done={done.vehicle}
          onPress={() => openModal('vehicle')}
        />
        <SectionRow
          id="docs"
          title="SOAT — Póliza de seguro"
          subtitle="Haz clic para subir el documento"
          done={done.docs}
          onPress={() => openModal('docs')}
        />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        {!allDone && (
          <Text style={s.hint}>
            Completa todas las secciones para continuar
          </Text>
        )}
        <TouchableOpacity
          style={[s.submitBtn, !allDone && s.submitBtnOff]}
          onPress={handleSubmit}
          disabled={!allDone || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <Text style={[s.submitTxt, !allDone && s.submitTxtOff]}>
              Enviar solicitud
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── MODAL: Personal ─────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'personal'}
        title="Información personal"
        onClose={() => setActiveModal(null)}
        onDone={() => saveModal('personal')}
        doneDisabled={!tmp.birthDate || !tmp.profilePhoto}
      >
        <InputField
          label="Nombre completo"
          value={currentUser?.name || ''}
          editable={false}
        />
        <View style={{ marginBottom: 18 }}>
          <Text style={ifl.lbl}>FECHA DE NACIMIENTO *</Text>
          <DateInput
            value={tmp.birthDate || ''}
            onChange={v => setT('birthDate', v)}
          />
          <Text style={s.fieldHint}>Debes ser mayor de 18 años</Text>
        </View>
        <Text style={ifl.lbl}>FOTO DE ROSTRO (SELFIE) *</Text>
        <PhotoField
          label="Selfie / Foto de rostro"
          photo={tmp.profilePhoto || null}
          onPress={() =>
            openPhoto(
              v => setT('profilePhoto', v),
              'Foto de rostro',
              tmp.profilePhoto || null,
            )
          }
        />
      </SectionModal>

      {/* ── MODAL: CI ───────────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'ci'}
        title="Cédula de Identidad"
        onClose={() => setActiveModal(null)}
        onDone={() => saveModal('ci')}
        doneDisabled={!tmp.ciNumber || !tmp.ciFront || !tmp.ciBack}
      >
        <InputField
          label="Número de CI *"
          value={tmp.ciNumber || ''}
          onChangeText={(v: string) => setT('ciNumber', v)}
          placeholder="Ej: 1234567 LP"
        />
        <Text style={ifl.lbl}>FOTOS DEL DOCUMENTO *</Text>
        <PhotoField
          label="CI — parte frontal"
          photo={tmp.ciFront || null}
          onPress={() =>
            openPhoto(
              v => setT('ciFront', v),
              'CI frontal',
              tmp.ciFront || null,
            )
          }
        />
        <PhotoField
          label="CI — parte posterior"
          photo={tmp.ciBack || null}
          onPress={() =>
            openPhoto(
              v => setT('ciBack', v),
              'CI posterior',
              tmp.ciBack || null,
            )
          }
        />
      </SectionModal>

      {/* ── MODAL: Licencia ─────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'license'}
        title="Licencia de conducir"
        onClose={() => setActiveModal(null)}
        onDone={() => saveModal('license')}
        doneDisabled={
          !tmp.licenseFront || !tmp.licenseBack || !tmp.licenseExpiryDate
        }
      >
        <Text style={ifl.lbl}>FOTOS DE LICENCIA *</Text>
        <PhotoField
          label="Licencia — parte frontal"
          photo={tmp.licenseFront || null}
          onPress={() =>
            openPhoto(
              v => setT('licenseFront', v),
              'Licencia frontal',
              tmp.licenseFront || null,
            )
          }
        />
        <PhotoField
          label="Licencia — parte posterior"
          photo={tmp.licenseBack || null}
          onPress={() =>
            openPhoto(
              v => setT('licenseBack', v),
              'Licencia posterior',
              tmp.licenseBack || null,
            )
          }
        />
        <View style={{ height: 8 }} />
        <Text style={ifl.lbl}>FECHA DE EXPIRACIÓN *</Text>
        <DateInput
          value={tmp.licenseExpiryDate || ''}
          onChange={v => setT('licenseExpiryDate', v)}
        />
      </SectionModal>

      {/* ── MODAL: Antecedentes ─────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'antecedents'}
        title="Antecedentes policiales"
        onClose={() => setActiveModal(null)}
        onDone={() => saveModal('antecedents')}
        doneDisabled={!tmp.antecedentsPhoto}
      >
        <Text style={ifl.lbl}>CERTIFICADO DE ANTECEDENTES *</Text>
        <PhotoField
          label="Certificado de antecedentes"
          photo={tmp.antecedentsPhoto || null}
          onPress={() =>
            openPhoto(
              v => setT('antecedentsPhoto', v),
              'Certificado de antecedentes',
              tmp.antecedentsPhoto || null,
            )
          }
        />
        <View style={{ height: 8 }} />
        <Text style={ifl.lbl}>FECHA DE EMISIÓN (OPCIONAL)</Text>
        <DateInput
          value={tmp.antecedentsDate || ''}
          onChange={v => setT('antecedentsDate', v)}
        />
      </SectionModal>

      {/* ── MODAL: Vehículo ─────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'vehicle'}
        title="Información del vehículo"
        onClose={() => setActiveModal(null)}
        onDone={() => saveModal('vehicle')}
        doneDisabled={
          !tmp.vehicleBrand ||
          !tmp.vehicleModel ||
          !tmp.vehicleType ||
          !tmp.vehiclePlate ||
          !tmp.vehicleYear ||
          !tmp.vehicleColor ||
          !tmp.vehiclePassengerCapacity ||
          !tmp.carFront ||
          !tmp.carBack ||
          !tmp.carLeft ||
          !tmp.carRight
        }
      >
        <InputField
          label="Marca del vehículo *"
          value={tmp.vehicleBrand || ''}
          onChangeText={(v: string) => setT('vehicleBrand', v)}
          placeholder="Ej: Toyota, Hyundai, Kia"
          autoCapitalize="words"
        />
        <InputField
          label="Modelo del vehículo *"
          value={tmp.vehicleModel || ''}
          onChangeText={(v: string) => setT('vehicleModel', v)}
          placeholder="Ej: Corolla, Tucson, Sportage"
          autoCapitalize="words"
        />
        <Text style={ifl.lbl}>TIPO DE VEHÍCULO *</Text>
        <View style={s.chipRow}>
          {VEHICLE_TYPES.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[s.chip, tmp.vehicleType === value && s.chipOn]}
              onPress={() => setT('vehicleType', value)}
            >
              <Text
                style={[s.chipTxt, tmp.vehicleType === value && s.chipTxtOn]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 18 }} />
        <InputField
          label="Placa *"
          value={tmp.vehiclePlate || ''}
          onChangeText={(v: string) => setT('vehiclePlate', v.toUpperCase())}
          placeholder="Ej: 1234 ABC"
          autoCapitalize="characters"
        />
        <InputField
          label="Año del vehículo *"
          value={tmp.vehicleYear || ''}
          onChangeText={(v: string) => setT('vehicleYear', v)}
          placeholder="Ej: 2022"
          keyboardType="number-pad"
          maxLength={4}
        />
        <InputField
          label="Color del vehículo *"
          value={tmp.vehicleColor || ''}
          onChangeText={(v: string) => setT('vehicleColor', v)}
          placeholder="Ej: Blanco"
        />
        <InputField
          label="Capacidad de pasajeros *"
          value={tmp.vehiclePassengerCapacity?.toString() || ''}
          onChangeText={(v: string) =>
            setT('vehiclePassengerCapacity', v.replace(/[^\d]/g, ''))
          }
          placeholder="Ej: 4"
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={ifl.lbl}>FOTOS DEL VEHÍCULO *</Text>
        <PhotoField
          label="Vista delantera"
          photo={tmp.carFront || null}
          onPress={() =>
            openPhoto(
              v => setT('carFront', v),
              'Vista delantera',
              tmp.carFront || null,
            )
          }
        />
        <PhotoField
          label="Vista trasera"
          photo={tmp.carBack || null}
          onPress={() =>
            openPhoto(
              v => setT('carBack', v),
              'Vista trasera',
              tmp.carBack || null,
            )
          }
        />
        <PhotoField
          label="Lateral izquierda"
          photo={tmp.carLeft || null}
          onPress={() =>
            openPhoto(
              v => setT('carLeft', v),
              'Lateral izquierda',
              tmp.carLeft || null,
            )
          }
        />
        <PhotoField
          label="Lateral derecha"
          photo={tmp.carRight || null}
          onPress={() =>
            openPhoto(
              v => setT('carRight', v),
              'Lateral derecha',
              tmp.carRight || null,
            )
          }
        />
      </SectionModal>

      {/* ── MODAL: Docs ─────────────────────────────────────────────────────── */}
      <SectionModal
        visible={activeModal === 'docs'}
        title="SOAT y RUAT"
        onClose={() => setActiveModal(null)}
        onDone={() => saveModal('docs')}
        doneDisabled={!tmp.soatPhoto}
      >
        <Text style={ifl.lbl}>SOAT — SEGURO OBLIGATORIO *</Text>
        <PhotoField
          label="Foto del SOAT"
          photo={tmp.soatPhoto || null}
          onPress={() =>
            openPhoto(v => setT('soatPhoto', v), 'SOAT', tmp.soatPhoto || null)
          }
        />
        <View style={{ height: 18 }} />
        <Text style={ifl.lbl}>RUAT (OPCIONAL)</Text>
        <PhotoField
          label="Foto del RUAT"
          photo={tmp.ruatPhoto || null}
          required={false}
          onPress={() =>
            openPhoto(v => setT('ruatPhoto', v), 'RUAT', tmp.ruatPhoto || null)
          }
        />
        <View style={s.infoBox}>
          <Text style={s.infoTxt}>
            El SOAT es obligatorio. El RUAT es opcional pero acelera la
            aprobación.
          </Text>
        </View>
      </SectionModal>

      {/* Photo sheet */}
      <PhotoSheet
        visible={photoSheet.visible}
        label={photoSheet.label}
        current={photoSheet.current}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onClose={() => setPhotoSheet(p => ({ ...p, visible: false }))}
      />

      {/* Loading overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={s.loadOverlay}>
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color={C.primary} />
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
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: C.surfaceHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  progressTxt: {},
  progressNum: { fontSize: 15, fontWeight: '800', color: C.primary },
  progressOf: { fontSize: 13, color: C.textMuted },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  hint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    letterSpacing: 0.3,
  },
  submitTxtOff: { color: C.textMuted },

  fieldHint: { fontSize: 11, color: C.textMuted, marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceHigh,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 14, fontWeight: '600', color: C.textSub },
  chipTxtOn: { color: C.white },

  infoBox: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  infoTxt: { fontSize: 13, color: C.textSub, lineHeight: 18 },

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
