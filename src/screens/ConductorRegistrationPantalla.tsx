import { privadoImagenOrigen } from "../utils/privateImageOrigen";
// src/screens/ConductorRegistrationPantalla.tsx
import React, { useState as usarEstado } from 'react';
import { CargaEnvioSolicitud, ConfirmacionEnvioSolicitud } from '../components/EstadoEnvioSolicitud';
import {
  View as Vista,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Text as Texto,
  ScrollView as DesplazableVista,
  ActivityIndicator as ActividadIndicador,
  Alert,
  StatusBar as EstadoBar,
  Image as Imagen,
  Linking,
  Modal,
  KeyboardAvoidingView as KeyboardAvoidingVista,
  Platform as Plataforma } from
'react-native';
import { SafeAreaView as SeguraZonaVista, useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { launchCamera as launchCamara, launchImageLibrary as launchImagenLibrary } from 'react-native-image-picker';
import {
  User as Usuario,
  CreditCard,
  FileText as ArchivoTexto,
  Car,
  Shield,
  Camera as Camara,
  Image as ImagenIcon,
  Check as Comprobar,
  ChevronRight as ChevronDerecha,
  ChevronLeft as ChevronIzquierda,
  X,
  Upload as Subir,
  ScanLine as ScanLinea,
  AlertTriangle } from
'lucide-react-native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { API_BASE_URL } from "../config/constantes";
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';
import { useRoute as usarRuta } from '@react-navigation/native';
import { ocrServicio } from "../services/ocr.servicio";
import { DocumentoCamaraModal, type RectanguloFotograma } from "../components/DocumentoCamaraModal";
import { ExtraidoTextoModal } from "../components/ExtraidoTextoModal";
import { ExtraidoCamposModal, type FilaCampoExtraido as ExtraidoCampoFila } from "../components/ExtraidoCamposModal";
import { CiResultadoModal } from "../components/CiResultadoModal";
import { DomicilioEntrada, type DomicilioPunto } from "../components/DomicilioEntrada";

// ─── Tokens de diseño Línea Lila (acorde a ProfileScreen) ───────────────────
const Colores = {
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
  white: '#FFFFFF'
};

type Propiedades = NativoPilaPantallaPropiedades<any, 'DriverRegistration'>;

// ─── Configuración de OCR ─────────────────────────────────────────────────────
const emisionLicencia = (frente: Record<string, string> = {}, reverso: Record<string, string> = {}) => {
  const numero = (frente.licenseNumber || '').replace(/\D/g, '');
  return frente.issueDate?.trim() || (numero && numero === (reverso.licenseNumber || '').replace(/\D/g, '') ?
    reverso.issueDate?.trim() || '' : '');
};

const OCR_PREVIO_HABILITADO = false;
const OCR_TIPOS = [
'licenseFront',
'licenseBack',
'soatPhoto',
'ruatPhoto'];


/** Campos que usan la cámara inteligente de documentos */
const CAMARA_CAMPOS = [
'licenseFront',
'licenseBack',
'ticPhoto',
'antecedentsPhoto',
'ruatPhoto',
'carFront',
'carBack',
'soatPhoto',
'domicileProof'];


const CAMARA_TITLES: Record<string, string> = {
  licenseFront: 'Licencia — parte frontal',
  licenseBack: 'Licencia — parte posterior',
  ticPhoto: 'Tarjeta de identificación del conductor',
  antecedentsPhoto: 'Certificado de antecedentes',
  ruatPhoto: 'RUAT — Registro del vehículo (CRPVA)',
  carFront: 'Vehículo — vista delantera',
  carBack: 'Vehículo — vista trasera',
  soatPhoto: 'SOAT — Seguro obligatorio',
  domicileProof: 'Comprobante de domicilio'
};

const REQUERIDOS_POR_TIPO: Record<string, string[]> = {
  licenseFront: ['licenseExpiryDate'],
  licenseBack: [],
  soatPhoto: [],
  ruatPhoto: [
  'vehiclePlate',
  'vehicleBrand',
  'vehicleModel',
  'vehicleYear',
  'vehicleColor']

};

const CAMPO_ETIQUETAS: Record<string, string> = {
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
  vehicleOwnerName: 'Propietario'
};

const VEHICULO_TIPO_ETIQUETAS: Record<string, string> = {
  taxi: 'Taxi',
  minibus: 'Minibus',
  bus: 'Bus',
  motocicleta: 'Motocicleta'
};

const FOTO_CAMPOS = [
'licenseFront',
'licenseBack',
'antecedentsPhoto',
'carFront',
'carBack',
'soatPhoto',
'ruatPhoto'];


// ─── Section icon map ─────────────────────────────────────────────────────────
function SeccionIcono({
  id,
  size: tamano = 25,
  color,
  strokeWidth: trazoAncho = 2.2





}: {id: string;size?: number;color: string;strokeWidth?: number;}) {
  const propiedades = { size: tamano, color, strokeWidth: trazoAncho };
  switch (id) {
    case 'personal':
      return <Usuario {...propiedades} />;
    case 'ci':
      return <CreditCard {...propiedades} />;
    case 'license':
      return <CreditCard {...propiedades} />;
    case 'antecedents':
      return <ArchivoTexto {...propiedades} />;
    case 'tic':
      return <CreditCard {...propiedades} />;
    case 'domicile':
      return <ArchivoTexto {...propiedades} />;
    case 'vehicle':
      return <Car {...propiedades} />;
    case 'docs':
      return <Shield {...propiedades} />;
    default:
      return <ArchivoTexto {...propiedades} />;
  }
}

// ─── SectionModal ─────────────────────────────────────────────────────────────
function SeccionModal({
  visible,
  title: titulo,
  onClose: alCerrar,
  onDone: alTerminado,
  onShow,
  children: hijos,
  doneDisabled: terminadoDeshabilitado







}: {visible: boolean;title: string;onClose: () => void;onDone: () => void;onShow?: () => void;children: React.ReactNode;doneDisabled?: boolean;}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={onShow}
      onRequestClose={alCerrar}>

      <KeyboardAvoidingVista
        style={{ flex: 1 }}
        behavior={Plataforma.OS === 'ios' ? 'padding' : undefined}>

        <SeguraZonaVista style={mo.safe} edges={['top', 'left', 'right', 'bottom']}>
          <Vista style={mo.header}>
            <PulsableOpacidad onPress={alCerrar} style={mo.closeBtn} activeOpacity={0.7}>
              <X size={18} color={Colores.textSecondary} strokeWidth={2.4} />
            </PulsableOpacidad>
            <Texto style={mo.title} numberOfLines={1}>
              {titulo}
            </Texto>
            <PulsableOpacidad
              onPress={alTerminado}
              style={[mo.doneBtn, terminadoDeshabilitado && mo.doneBtnDis]}
              disabled={terminadoDeshabilitado}
              activeOpacity={0.8}>

              <Texto style={[mo.doneText, terminadoDeshabilitado && mo.doneTextDis]}>
                Guardar
              </Texto>
            </PulsableOpacidad>
          </Vista>
          <DesplazableVista
            contentContainerStyle={mo.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {hijos}
          </DesplazableVista>
        </SeguraZonaVista>
      </KeyboardAvoidingVista>
    </Modal>);

}

const mo = EstiloHoja.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF'
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colores.text,
    paddingHorizontal: 8
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colores.primary,
    borderRadius: 12
  },
  doneBtnDis: { backgroundColor: '#F3EAFC' },
  doneText: { fontSize: 13, fontWeight: '600', color: Colores.white },
  doneTextDis: { color: Colores.primary, opacity: 0.5 },
  content: { padding: 18, paddingBottom: 48, backgroundColor: '#FFFFFF' }
});

// ─── PhotoSheet ───────────────────────────────────────────────────────────────
function FotoHoja({
  visible,
  label: etiqueta,
  current: real,
  onCamera: alCamara,
  onGallery: alGaleria,
  onClose: alCerrar







}: {visible: boolean;label: string;current: string | null;onCamera: () => void;onGallery: () => void;onClose: () => void;}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={alCerrar}>

      <PulsableOpacidad
        style={ps.backdrop}
        activeOpacity={1}
        onPress={alCerrar} />

      <Vista style={ps.sheet}>
        <Vista style={ps.handle} />
        {real ?
        <Imagen source={privadoImagenOrigen(real)} style={ps.preview} /> :

        <Vista style={ps.empty}>
            <Subir size={28} color={Colores.textTertiary} strokeWidth={1.6} />
          </Vista>
        }
        <Texto style={ps.label}>{etiqueta}</Texto>
        <Texto style={ps.sub}>
          {real ?
          'Toca una opción para reemplazar la foto' :
          'Elige cómo subir la imagen requerida'}
        </Texto>

        <PulsableOpacidad
          style={ps.btn}
          onPress={alCamara}
          activeOpacity={0.75}>

          <Vista style={ps.btnIco}>
            <Camara size={20} color={Colores.primary} strokeWidth={2} />
          </Vista>
          <Vista style={{ flex: 1 }}>
            <Texto style={ps.btnLbl}>Tomar foto</Texto>
            <Texto style={ps.btnSub}>Abre la cámara del dispositivo</Texto>
          </Vista>
          <ChevronDerecha size={18} color={Colores.textTertiary} strokeWidth={2} />
        </PulsableOpacidad>

        <PulsableOpacidad
          style={ps.btn}
          onPress={alGaleria}
          activeOpacity={0.75}>

          <Vista style={ps.btnIco}>
            <ImagenIcon size={20} color={Colores.primary} strokeWidth={2} />
          </Vista>
          <Vista style={{ flex: 1 }}>
            <Texto style={ps.btnLbl}>Elegir de galería</Texto>
            <Texto style={ps.btnSub}>Selecciona una imagen guardada</Texto>
          </Vista>
          <ChevronDerecha size={18} color={Colores.textTertiary} strokeWidth={2} />
        </PulsableOpacidad>

        <PulsableOpacidad style={ps.cancel} onPress={alCerrar} activeOpacity={0.7}>
          <Texto style={ps.cancelTxt}>Cancelar</Texto>
        </PulsableOpacidad>
      </Vista>
    </Modal>);

}

const ps = EstiloHoja.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16
  },
  preview: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA'
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
    borderStyle: 'dashed'
  },
  label: { fontSize: 17, fontWeight: '700', color: Colores.text, marginBottom: 4 },
  sub: { fontSize: 13, color: Colores.textSecondary, marginBottom: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  btnIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3EAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnLbl: { fontSize: 15, fontWeight: '600', color: Colores.text, marginBottom: 2 },
  btnSub: { fontSize: 12, color: Colores.textSecondary },
  cancel: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  cancelTxt: { fontSize: 14, color: Colores.textSecondary, fontWeight: '600' }
});

// ─── PhotoField ───────────────────────────────────────────────────────────────
function FotoCampo({
  label: etiqueta,
  photo: foto,
  onPress: alPulsar,
  required: requerido = true,
  extracting: extrayendo = false






}: {label: string;photo: string | null;onPress: () => void;required?: boolean;extracting?: boolean;}) {
  return (
    <PulsableOpacidad
      style={[pf.btn, !!foto && pf.btnDone]}
      onPress={alPulsar}
      activeOpacity={0.7}
      disabled={extrayendo}>

      <Vista style={[pf.thumb, !!foto && pf.thumbDone]}>
        {foto ?
        <Imagen source={privadoImagenOrigen(foto)} style={pf.img} /> :

        <Camara size={20} color={Colores.textTertiary} strokeWidth={1.8} />
        }
      </Vista>
      <Vista style={{ flex: 1 }}>
        <Texto style={pf.label}>
          {etiqueta}
          {requerido && !foto && <Texto style={{ color: Colores.danger }}> *</Texto>}
        </Texto>
        <Texto style={[pf.status, !!foto && pf.statusDone]}>
          {extrayendo ?
          'Analizando documento…' :
          foto ?
          'Foto cargada · toca para cambiar' :
          'Toca para agregar foto'}
        </Texto>
      </Vista>
      {extrayendo ?
      <ActividadIndicador size="small" color={Colores.primary} /> :
      foto ?
      <Vista style={pf.check}>
          <Comprobar size={13} color={Colores.success} strokeWidth={2.8} />
        </Vista> :

      <Vista style={pf.uploadCircle}>
          <Subir size={15} color={Colores.textTertiary} strokeWidth={1.8} />
        </Vista>
      }
    </PulsableOpacidad>);

}

const pf = EstiloHoja.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  btnDone: {
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF'
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
    overflow: 'hidden'
  },
  thumbDone: { borderColor: '#E5E5EA' },
  img: { width: 48, height: 48, resizeMode: 'cover' },
  label: { fontSize: 14, fontWeight: '600', color: Colores.text, marginBottom: 3 },
  status: { fontSize: 12, color: Colores.textSecondary },
  statusDone: { color: Colores.primary, fontWeight: '500' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3EAFC',
    alignItems: 'center',
    justifyContent: 'center'
  }
});

// ─── OcrSummary: muestra los datos detectados automáticamente ────────────────
function OcrResumen({
  result: resultado,
  showTypeLabels: mostrarTipoEtiquetas = false



}: {result: {fields: Record<string, string>;missing: string[];error?: string;} | undefined;showTypeLabels?: boolean;}) {
  if (!resultado) return null;
  const entradas = Object.entries(resultado.fields || {}).filter(
    ([k, v]) => CAMPO_ETIQUETAS[k] && v
  );

  return (
    <Vista style={oc.box}>
      <Vista style={oc.titleRow}>
        <Vista style={oc.titleIcon}>
          <ScanLinea size={14} color={Colores.primary} strokeWidth={2.2} />
        </Vista>
        <Texto style={oc.title}>Datos detectados automáticamente</Texto>
      </Vista>

      {entradas.map(([k, v], indice) => {
        const mostrar =
        k === 'vehicleType' && mostrarTipoEtiquetas && VEHICULO_TIPO_ETIQUETAS[v] ?
        VEHICULO_TIPO_ETIQUETAS[v] :
        v;
        const esUltimo = indice === entradas.length - 1;
        return (
          <Vista key={k} style={[oc.row, !esUltimo && oc.rowBorder]}>
            <Texto style={oc.k}>{CAMPO_ETIQUETAS[k]}</Texto>
            <Texto style={oc.v}>{mostrar}</Texto>
          </Vista>);

      })}

      {entradas.length === 0 &&
      <Texto style={oc.emptyTxt}>Aún no se detectaron datos.</Texto>
      }

      {resultado.error ?
      <Vista style={oc.warnRow}>
          <AlertTriangle size={13} color={Colores.danger} strokeWidth={2.2} />
          <Texto style={[oc.warnTxt, { color: Colores.danger }]}>
            {resultado.error}
          </Texto>
        </Vista> :

      resultado.missing &&
      resultado.missing.length > 0 &&
      <Vista style={oc.warnRow}>
            <AlertTriangle size={13} color={Colores.warning} strokeWidth={2.2} />
            <Texto style={oc.warnTxt}>
              No se detectó:{' '}
              {resultado.missing.
          map((k) => CAMPO_ETIQUETAS[k] || k).
          join(', ')}
              . Sube una foto más clara.
            </Texto>
          </Vista>

      }
    </Vista>);

}

const oc = EstiloHoja.create({
  box: {
    backgroundColor: Colores.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colores.primaryMid
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  titleIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colores.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: { fontSize: 13, fontWeight: '700', color: Colores.primary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colores.borderSubtle
  },
  k: { fontSize: 13, color: Colores.textSecondary },
  v: { fontSize: 13, fontWeight: '700', color: Colores.text, maxWidth: '60%', textAlign: 'right' },
  emptyTxt: { fontSize: 12, color: Colores.textTertiary, paddingVertical: 4 },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    backgroundColor: Colores.warningLight,
    borderRadius: 10,
    padding: 10
  },
  warnTxt: { flex: 1, fontSize: 12, color: Colores.warning, lineHeight: 16 }
});

// ─── SectionRow (Tarjeta de Sección en la lista principal) ─────────────────────
function SeccionFila({
  id,
  title: titulo,
  subtitle: subtitulo,
  done: terminado,
  warning,
  onPress: alPulsar







}: {id: string;title: string;subtitle: string;done: boolean;warning?: string;onPress: () => void;}) {
  return (
    <PulsableOpacidad
      style={[sr.row, terminado && sr.rowDone, !!warning && sr.rowWarn]}
      onPress={alPulsar}
      activeOpacity={0.7}>

      <Vista style={sr.ico}>
        {terminado ?
        <Comprobar size={24} color={Colores.success} strokeWidth={2.8} /> :

        <SeccionIcono id={id} size={25} color={Colores.primary} strokeWidth={2.2} />
        }
      </Vista>
      <Vista style={{ flex: 1 }}>
        <Texto style={sr.title}>{titulo}</Texto>
        <Texto style={[sr.sub, terminado && sr.subDone, !!warning && sr.subWarn]} numberOfLines={1}>
          {terminado ? 'Completado' : warning ? warning : subtitulo}
        </Texto>
      </Vista>

      {terminado &&
      <Vista style={sr.doneBadge}>
          <Texto style={sr.doneBadgeText}>Listo</Texto>
        </Vista>
      }

      {!!warning &&
      <Vista style={sr.warnBadge}>
          <Texto style={sr.warnBadgeText}>Observado</Texto>
        </Vista>
      }

      <ChevronDerecha
        size={20}
        color={terminado ? Colores.success : Colores.textTertiary}
        strokeWidth={2} />

    </PulsableOpacidad>);

}

const sr = EstiloHoja.create({
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
    borderColor: '#E5E5EA'
  },
  rowDone: {
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF'
  },
  rowWarn: {
    borderColor: '#D9770640',
    backgroundColor: '#FFFFFF'
  },
  ico: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: { fontSize: 15, fontWeight: '600', color: Colores.text, marginBottom: 2 },
  sub: { fontSize: 13, color: Colores.textSecondary },
  subDone: { color: Colores.success, fontWeight: '500' },
  subWarn: { color: Colores.warning, fontWeight: '500' },
  doneBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colores.success
  },
  warnBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  warnBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colores.warning
  }
});

// ─── Screen ───────────────────────────────────────────────────────────────────
function ConductorRegistroPantalla({ navigation: navegacion }: Propiedades) {
  const margenes = usarSeguraZonaMargenes();
  const { token } = usarAutenticacion();
  const ruta = usarRuta<any>();
  const navegacionParametros = ruta.params;

  // Fotos subidas por campo
  const [fotos, establecerFotos] = usarEstado<Record<string, string | null>>(
    Object.fromEntries(FOTO_CAMPOS.map((f) => [f, null]))
  );
  const [recortesFotos, establecerRecortesFotos] = usarEstado<Record<string, RectanguloFotograma | undefined>>({});

  // Resultados OCR por campo
  const [ocrResultados, establecerOcrResultados] = usarEstado<
    Record<string, {fields: Record<string, string>;missing: string[];rawText: string;error?: string;}>>(
    {});
  const [licenciaVistas, establecerLicenciaVistas] = usarEstado<Record<string, string>>({});

  // UI State
  const [estadoEnvio, establecerEstadoEnvio] = usarEstado<'pendiente' | 'enviando' | 'enviada'>('pendiente');
  const cargando = estadoEnvio === 'enviando';
  React.useEffect(() => {
    if (estadoEnvio !== 'enviada') return;
    const volverAlMapa = setTimeout(() => navegacion.popTo('Map'), 4000);
    return () => clearTimeout(volverAlMapa);
  }, [estadoEnvio, navegacion]);
  const [domicilioPunto, establecerDomicilioPunto] = usarEstado<DomicilioPunto | null>(null);
  const [abrirMapaDomicilio, establecerAbrirMapaDomicilio] = usarEstado(false);
  const [domicilioVisible, establecerDomicilioVisible] = usarEstado(false);
  const [activoModal, establecerActivoModal] = usarEstado<string | null>(null);
  const [extrayendo, establecerExtrayendo] = usarEstado<string | null>(null);
  const [camaraCampo, establecerCamaraCampo] = usarEstado<string | null>(null);
  const [extraidoTexto, establecerExtraidoTexto] = usarEstado<{
    field: string;
    text: string;
    missing: string[];
    image?: string;
  } | null>(null);
  const [extraidoCampos, establecerExtraidoCampos] = usarEstado<{
    field: string;
    fields: ExtraidoCampoFila[];
    missing: string[];
    image?: string;
    notice?: string;
    title?: string;
  } | null>(null);
  const [ciResultadoVisible, establecerCiResultadoVisible] = usarEstado(false);
  const [rechazadoVista, establecerRechazadoVista] = usarEstado<{
    field: string;
    text: string;
    image?: string;
  } | null>(null);
  const [fotoHoja, establecerFotoHoja] = usarEstado<{
    visible: boolean;
    field: string | null;
    label: string;
    current: string | null;
  }>({ visible: false, field: null, label: '', current: null });

  // Redirigir si ya fue rechazada
  React.useEffect(() => {
    const comprobar = async () => {
      try {
        if (navegacionParametros?.isResubmission) {
          navegacion.navigate('DocumentResubmission' as never);
          return;
        }
        const r = await fetch(`${API_BASE_URL}/conductores/estado`, {
          headers: { Authorization: `Bearer ${token || ''}` }
        });
        if (r.ok) {
          const d = await r.json();
          if (d.status === 'rechazado')
          navegacion.navigate('DocumentResubmission' as never);
        }
      } catch {}
    };
    if (token) comprobar();
  }, [token, navegacion, navegacionParametros?.isResubmission]);

  // ── OCR ─────────────────────────────────────────────────────────────────────
  const ejecutarOcr = async (
  campo: string,
  uri: string,
  recorte?: {screenW: number;screenH: number;x: number;y: number;w: number;h: number;},
  lecturaConjunta = false): Promise<{fields?: ExtraidoCampoFila[];missing?: string[];datos?: Record<string, string>;error?: string;} | undefined> =>
  {
    establecerExtrayendo(campo);
    if (campo === 'licenseFront' || campo === 'licenseBack') {
      establecerLicenciaVistas((anterior) => ({ ...anterior, [campo]: '' }));
    }
    try {
      const respuesta = await ocrServicio.extractDocument(uri, campo, token || '', {
        crop: recorte
      });

      if ((campo === 'licenseFront' || campo === 'licenseBack') && respuesta.previewBase64) {
        establecerLicenciaVistas((anterior) => ({ ...anterior, [campo]: respuesta.previewBase64! }));
      }

      if (respuesta.rejected) {
        establecerFotos((anterior) => ({ ...anterior, [campo]: null }));
        establecerOcrResultados((anterior) => ({
          ...anterior,
          [campo]: {
            fields: {},
            missing: REQUERIDOS_POR_TIPO[campo] || [],
            rawText: '',
            error: respuesta.rejectReason || 'Documento incorrecto'
          }
        }));
        if (lecturaConjunta) return { error: respuesta.rejectReason || 'El documento no es válido.' };
        const buttons =
        CAMARA_CAMPOS.includes(campo) ?
        [
        { text: 'Cancelar', style: 'cancel' as const },
        { text: 'Ver texto leído', onPress: () => establecerRechazadoVista({ field: campo, text: respuesta.rawText || '', image: respuesta.previewBase64 }) },
        { text: 'Reintentar', onPress: () => establecerCamaraCampo(campo) }] :

        [{ text: 'OK' }];
        Alert.alert(
          'Foto rechazada',
          respuesta.rejectReason || 'El documento no es válido.',
          buttons
        );
        return;
      }

      establecerOcrResultados((anterior) => ({
        ...anterior,
        [campo]: {
          fields: respuesta.fields || {},
          missing: respuesta.missing || [],
          rawText: respuesta.rawText || ''
        }
      }));
      const campos = Object.entries(respuesta.fields || {}).
      filter(([, valor]) => String(valor || '').trim()).
      map(([clave, valor]) => ({
        label: CAMPO_ETIQUETAS[clave] || clave,
        value:
        clave === 'vehicleType' && VEHICULO_TIPO_ETIQUETAS[String(valor)] ?
        VEHICULO_TIPO_ETIQUETAS[String(valor)] :
        String(valor)
      }));
      const resultado = {
        field: campo,
        fields: campos,
        missing: (respuesta.missing || []).map((clave) => CAMPO_ETIQUETAS[clave] || clave),
        image: respuesta.previewBase64
      };
      if (!lecturaConjunta) establecerExtraidoCampos(resultado);
      return { ...resultado, datos: respuesta.fields };
    } catch (error: any) {
      if (lecturaConjunta) establecerFotos((anterior) => ({ ...anterior, [campo]: null }));
      establecerOcrResultados((anterior) => ({
        ...anterior,
        [campo]: {
          fields: {},
          missing: REQUERIDOS_POR_TIPO[campo] || [],
          rawText: '',
          error: error?.message || 'Error de OCR'
        }
      }));
      if (lecturaConjunta) return { error: error?.message || 'No pudimos leer esta foto.' };
      Alert.alert(
        'No se pudo extraer',
        error?.message ?
        `${error.message}` :
        'No pudimos leer esta foto. Vuelve a subir una imagen más clara.'
      );
    } finally {
      if (!lecturaConjunta) establecerExtrayendo(null);
    }
  };

  const aplicarFoto = (
  campo: string,
  uri: string,
  recorte?: {screenW: number;screenH: number;x: number;y: number;w: number;h: number;}) =>
  {
    establecerFotos((anterior) => ({ ...anterior, [campo]: uri }));
    establecerRecortesFotos((anterior) => ({ ...anterior, [campo]: recorte }));
    if (OCR_PREVIO_HABILITADO && OCR_TIPOS.includes(campo)) void ejecutarOcr(campo, uri, recorte);
  };

  // ── Photo picking ───────────────────────────────────────────────────────────
  const abrirFoto = (campo: string, etiqueta: string) =>
  establecerFotoHoja({
    visible: true,
    field: campo,
    label: etiqueta,
    current: fotos[campo] || null
  });

  const manejarCamara = async () => {
    const campo = fotoHoja.field;
    if (!campo) return;
    establecerFotoHoja((p) => ({ ...p, visible: false }));
    if (CAMARA_CAMPOS.includes(campo)) {
      establecerCamaraCampo(campo);
      return;
    }
    try {
      const r = await launchCamara({
        mediaType: 'photo',
        quality: 0.7,
        saveToPhotos: false
      });
      if (r.errorCode === 'permission') {
        Alert.alert(
          'Permiso denegado',
          'Habilita la cámara en Configuración.',
          [
          { text: 'Configuración', onPress: () => Linking.openSettings() },
          { text: 'Cancelar', style: 'cancel' }]

        );
      } else if (r.assets?.[0]?.uri) aplicarFoto(campo, r.assets[0].uri, undefined);
    } catch {
      Alert.alert('Error', 'No se pudo acceder a la cámara.');
    }
  };

  const manejarGaleria = async () => {
    const campo = fotoHoja.field;
    if (!campo) return;
    establecerFotoHoja((p) => ({ ...p, visible: false }));
    try {
      const r = await launchImagenLibrary({ mediaType: 'photo', quality: 0.7 });
      if (r.assets?.[0]?.uri) aplicarFoto(campo, r.assets[0].uri);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  // ── Completion ──────────────────────────────────────────────────────────────
  const faltantePara = (campo: string): string[] => {
    const respuesta = ocrResultados[campo];
    if (!respuesta) return REQUERIDOS_POR_TIPO[campo] || [];
    if (respuesta.error) return REQUERIDOS_POR_TIPO[campo] || [];
    return respuesta.missing || [];
  };

  const licenciaFrontalCampos = ocrResultados.licenseFront?.fields || {};
  const licenciaReversoCampos = ocrResultados.licenseBack?.fields || {};
  const licenciaLadosCoincidencia =
  licenciaFrontalCampos.licenseNumber === licenciaReversoCampos.licenseNumber &&
  licenciaFrontalCampos.issueDate === licenciaReversoCampos.issueDate &&
  licenciaFrontalCampos.licenseExpiryDate === licenciaReversoCampos.licenseExpiryDate &&
  licenciaFrontalCampos.licenseCategory === licenciaReversoCampos.licenseCategory;

  const terminado = {
    license:
    !!fotos.licenseFront &&
    !!fotos.licenseBack,
    tic: !!fotos.ticPhoto,
    antecedents: !!fotos.antecedentsPhoto,
    vehicle:
    !!fotos.ruatPhoto &&
    !!fotos.carFront &&
    !!fotos.carBack,
    docs: !!fotos.soatPhoto,
    domicile: !!fotos.domicileProof && !!domicilioPunto
  };

  const warningTexto = (clave: keyof typeof terminado): string | undefined => {
    return undefined;
  };

  const completadoCantidad = Object.values(terminado).filter(Boolean).length;
  const todosTerminado = completadoCantidad === 6;

  // ── Guía Licencia: cámara directa, primero frontal y luego trasera ────────
  const abrirLicenciaSeccion = () => {
    if (!fotos.licenseFront) {
      establecerCamaraCampo('licenseFront');
      return;
    }
    if (!fotos.licenseBack) {
      establecerCamaraCampo('licenseBack');
      return;
    }
    establecerActivoModal('license');
  };

  // ── Guía Vehículo: cámara directa (RUAT -> Frente -> Trasera) ─────────────
  const abrirVehiculoSeccion = () => {
    if (!fotos.ruatPhoto) {
      establecerCamaraCampo('ruatPhoto');
      return;
    }
    if (!fotos.carFront) {
      establecerCamaraCampo('carFront');
      return;
    }
    if (!fotos.carBack) {
      establecerCamaraCampo('carBack');
      return;
    }
    establecerActivoModal('vehicle');
  };

  // ── Guía SOAT: cámara directa ─────────────────────────────────────────────
  const abrirSoatSeccion = () => {
    if (!fotos.soatPhoto) {
      establecerCamaraCampo('soatPhoto');
      return;
    }
    establecerActivoModal('docs');
  };

  // ── Modal de texto extraído (frente de CI, licencia o RUAT) ───────────────
  const manejarExtraidoContinuar = () => {
    const real = extraidoTexto;
    establecerExtraidoTexto(null);
    if (real?.field === 'licenseFront' && !fotos.licenseBack) {
      establecerCamaraCampo('licenseBack');
    } else if (real?.field === 'ruatPhoto') {
      if (!fotos.carFront) {
        establecerCamaraCampo('carFront');
      } else if (!fotos.carBack) {
        establecerCamaraCampo('carBack');
      }
    }
  };

  const manejarExtraidoCamposContinuar = () => {
    const real = extraidoCampos;
    establecerExtraidoCampos(null);
    if (real?.field === 'licenseFront' && !fotos.licenseBack) {
      establecerCamaraCampo('licenseBack');
    } else if (real?.field === 'ruatPhoto') {
      if (!fotos.carFront) {
        establecerCamaraCampo('carFront');
      } else if (!fotos.carBack) {
        establecerCamaraCampo('carBack');
      }
    } else if (real?.field === 'ciBack') {
      establecerCiResultadoVisible(true);
    }
  };

  const repetirFotosLicencia = () => {
    establecerFotos((anterior) => ({ ...anterior, licenseFront: null, licenseBack: null }));
    establecerOcrResultados((anterior) => {
      const siguiente = { ...anterior };
      delete siguiente.licenseFront;
      delete siguiente.licenseBack;
      return siguiente;
    });
    establecerLicenciaVistas({});
    establecerCamaraCampo('licenseFront');
  };

  const manejarExtraidoCamposRepetir = () => {
    const real = extraidoCampos;
    establecerExtraidoCampos(null);
    if (real?.field === 'licenseFront' || real?.field === 'licenseBack') repetirFotosLicencia();
    else if (real) establecerCamaraCampo(real.field);
  };

  const manejarExtraidoRepetir = () => {
    const real = extraidoTexto;
    establecerExtraidoTexto(null);
    if (real?.field === 'licenseFront' || real?.field === 'licenseBack') repetirFotosLicencia();
    else if (real) establecerCamaraCampo(real.field);
  };

  // ── Modal de resultado (ambos lados) ───────────────────────────────────────
  const manejarCiResultadoContinuar = () => {
    establecerCiResultadoVisible(false);
  };

  const manejarCiResultadoRepetirReverso = () => {
    establecerCiResultadoVisible(false);
    establecerCamaraCampo('ciBack');
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const manejarEnviar = async () => {
    if (!todosTerminado || estadoEnvio !== 'pendiente') return;

    establecerEstadoEnvio('enviando');
    try {
      if (!token) throw new Error('No hay sesión activa.');
      const formulario = new FormData();
      formulario.append('domicileAddress', domicilioPunto ?
        `Ubicación marcada: ${domicilioPunto.latitude.toFixed(6)}, ${domicilioPunto.longitude.toFixed(6)}` : '');
      formulario.append('domicileLatitude', String(domicilioPunto?.latitude ?? ''));
      formulario.append('domicileLongitude', String(domicilioPunto?.longitude ?? ''));

      const agregar = (k: string, uri: string | null) => {
        if (!uri) return;
        formulario.append(k, { uri, type: 'image/jpeg', name: `${k}.jpg` } as any);
        const recorte = recortesFotos[k];
        if (recorte) {
          for (const clave of ['x', 'y', 'w', 'h', 'screenW', 'screenH'] as const) {
            formulario.append(`${k}Crop${clave[0].toUpperCase()}${clave.slice(1)}`, String(recorte[clave]));
          }
        }
      };
      agregar('licenseFront', fotos.licenseFront);
      agregar('licenseBack', fotos.licenseBack);
      agregar('ticPhoto', fotos.ticPhoto);
      agregar('antecedentsPhoto', fotos.antecedentsPhoto);
      agregar('carFront', fotos.carFront);
      agregar('carBack', fotos.carBack);
      agregar('soatPhoto', fotos.soatPhoto);
      agregar('ruatPhoto', fotos.ruatPhoto);
      agregar('domicileProof', fotos.domicileProof);

      const respuesta = await fetch(`${API_BASE_URL}/solicitudes/registrar`, {
        method: 'POST',
        body: formulario,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (!respuesta.ok) {
        const error = await respuesta.json();
        throw new Error(error.error || `Error ${respuesta.status}`);
      }
      establecerEstadoEnvio('enviada');
    } catch (error: any) {
      establecerEstadoEnvio('pendiente');
      Alert.alert('Error', error?.message || 'No se pudo enviar la solicitud.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (estadoEnvio === 'enviada') return <ConfirmacionEnvioSolicitud />;

  return (
    <SeguraZonaVista style={s.container} edges={['top', 'left', 'right']}>
      <EstadoBar barStyle="dark-content" backgroundColor={Colores.background} />

      {/* Header Minimalista (consistente con ProfileScreen) */}
      <Vista style={s.header}>
        <PulsableOpacidad
          onPress={() => navegacion.goBack()}
          style={s.backBtn}
          activeOpacity={0.7}>

          <ChevronIzquierda size={22} color={Colores.text} strokeWidth={2.4} />
        </PulsableOpacidad>
        <Texto style={s.headerTitle}>Registro de Conductor</Texto>
        <Vista style={{ width: 36 }} />
      </Vista>

      <DesplazableVista
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}>

        {/* Barra de progreso minimalista */}
        <Vista style={s.progressRow}>
          <Vista style={s.track}>
            <Vista style={[s.fill, { width: `${completadoCantidad / 6 * 100}%` }]} />
          </Vista>
          <Vista style={s.progressBadge}>
            <Texto style={s.progressBadgeNum}>{completadoCantidad}</Texto>
              <Texto style={s.progressBadgeOf}> de 6</Texto>
          </Vista>
        </Vista>

        {/* Lista de Secciones */}
        <SeccionFila
          id="license"
          title="Licencia de conducir"
          subtitle="Por ambos lados (cámara directa)"
          done={terminado.license}
          warning={warningTexto('license')}
          onPress={abrirLicenciaSeccion} />

        <SeccionFila
          id="tic"
          title="TIC"
          subtitle="Tarjeta de identificación del conductor"
          done={terminado.tic}
          onPress={() => fotos.ticPhoto ? establecerActivoModal('tic') : establecerCamaraCampo('ticPhoto')} />

        <SeccionFila
          id="antecedents"
          title="Antecedentes policiales"
          subtitle={
          fotos.antecedentsPhoto ?
          'Certificado oficial registrado' :
          'Certificado oficial (cámara directa)'
          }
          done={terminado.antecedents}
          onPress={() => establecerCamaraCampo('antecedentsPhoto')} />

        <SeccionFila
          id="vehicle"
          title="Información del vehículo"
          subtitle={
          terminado.vehicle ?
          'RUAT y vehículo registrados' :
          fotos.ruatPhoto ?
          'Faltan fotos del vehículo (cámara directa)' :
          'RUAT y vehículo (cámara directa)'
          }
          done={terminado.vehicle}
          warning={warningTexto('vehicle')}
          onPress={abrirVehiculoSeccion} />

        <SeccionFila
          id="docs"
          title="SOAT — Roseta digital"
          subtitle={
          terminado.docs ?
          'Roseta digital registrada' :
          'Roseta vigente (cámara directa)'
          }
          done={terminado.docs}
          onPress={abrirSoatSeccion} />

        <SeccionFila
          id="domicile"
          title="Domicilio"
          subtitle="Dirección, ubicación y factura de luz"
          done={terminado.domicile}
          onPress={() => {
            if (fotos.domicileProof) establecerActivoModal('domicile');
            else establecerCamaraCampo('domicileProof');
          }} />

      </DesplazableVista>

      {/* Footer Minimalista Fijo */}
      <Vista style={[s.footer, { paddingBottom: Math.max(margenes.bottom + 14, 24) }]}>
        {!todosTerminado &&
        <Texto style={s.footerHint}>Completar campos obligatorios</Texto>
        }
        <PulsableOpacidad
          style={[s.submitBtn, !todosTerminado && s.submitBtnOff]}
          onPress={manejarEnviar}
          disabled={!todosTerminado || cargando}
          activeOpacity={0.85}>

          {cargando ?
          <ActividadIndicador color={Colores.white} size="small" /> :

          <Texto style={[s.submitTxt, !todosTerminado && s.submitTxtOff]}>
              {todosTerminado ? 'Registrar como conductor' : `Completar registro (${completadoCantidad}/6)`}
            </Texto>
          }
        </PulsableOpacidad>
      </Vista>

      {/* ── MODAL: Licencia ─────────────────────────────────────────────────── */}
      <SeccionModal
        visible={activoModal === 'license'}
        title="Licencia de conducir"
        onClose={() => establecerActivoModal(null)}
        onDone={() => establecerActivoModal(null)}
        doneDisabled={!fotos.licenseFront || !fotos.licenseBack}>

        <Texto style={s.lbl}>FOTOS DE LICENCIA *</Texto>
        <FotoCampo
          label="Licencia — parte frontal"
          photo={fotos.licenseFront}
          extracting={extrayendo === 'licenseFront'}
          onPress={() => abrirFoto('licenseFront', 'Licencia frontal')} />

        <FotoCampo
          label="Licencia — parte posterior"
          photo={fotos.licenseBack}
          extracting={extrayendo === 'licenseBack'}
          onPress={() => abrirFoto('licenseBack', 'Licencia posterior')} />

        <OcrResumen result={ocrResultados.licenseFront} />
      </SeccionModal>

      <SeccionModal
        visible={activoModal === 'tic'}
        title="TIC"
        onClose={() => establecerActivoModal(null)}
        onDone={() => establecerActivoModal(null)}
        doneDisabled={!fotos.ticPhoto}>

        <Texto style={s.lbl}>TARJETA DE IDENTIFICACIÓN DEL CONDUCTOR *</Texto>
        <FotoCampo
          label="Foto de la TIC"
          photo={fotos.ticPhoto}
          onPress={() => abrirFoto('ticPhoto', 'TIC')} />

      </SeccionModal>

      {/* ── MODAL: Antecedentes ─────────────────────────────────────────────── */}
      <SeccionModal
        visible={activoModal === 'antecedents'}
        title="Antecedentes policiales"
        onClose={() => establecerActivoModal(null)}
        onDone={() => establecerActivoModal(null)}
        doneDisabled={!fotos.antecedentsPhoto}>

        <Texto style={s.lbl}>CERTIFICADO DE ANTECEDENTES *</Texto>
        <FotoCampo
          label="Certificado de antecedentes"
          photo={fotos.antecedentsPhoto}
          onPress={() =>
          abrirFoto('antecedentsPhoto', 'Certificado de antecedentes')
          } />

      </SeccionModal>

      {/* ── MODAL: Vehículo ─────────────────────────────────────────────────── */}
      <SeccionModal
        visible={activoModal === 'vehicle'}
        title="Información del vehículo"
        onClose={() => establecerActivoModal(null)}
        onDone={() => establecerActivoModal(null)}
        doneDisabled={
        !fotos.ruatPhoto ||
        !fotos.carFront ||
        !fotos.carBack
        }>

        <Texto style={s.lbl}>RUAT — DATOS DEL VEHÍCULO *</Texto>
        <FotoCampo
          label="Foto del RUAT"
          photo={fotos.ruatPhoto}
          extracting={extrayendo === 'ruatPhoto'}
          onPress={() => abrirFoto('ruatPhoto', 'RUAT')} />

        <OcrResumen result={ocrResultados.ruatPhoto} showTypeLabels />
        <Vista style={{ height: 14 }} />
        <Texto style={s.lbl}>FOTOS DEL VEHÍCULO *</Texto>
        <FotoCampo
          label="Vista delantera"
          photo={fotos.carFront}
          onPress={() => abrirFoto('carFront', 'Vista delantera')} />

        <FotoCampo
          label="Vista trasera"
          photo={fotos.carBack}
          onPress={() => abrirFoto('carBack', 'Vista trasera')} />

      </SeccionModal>

      {/* ── MODAL: Docs ─────────────────────────────────────────────────────── */}
      <SeccionModal
        visible={activoModal === 'docs'}
        title="SOAT"
        onClose={() => establecerActivoModal(null)}
        onDone={() => establecerActivoModal(null)}
        doneDisabled={!fotos.soatPhoto}>

        <Texto style={s.lbl}>SOAT — SEGURO OBLIGATORIO *</Texto>
        <FotoCampo
          label="Foto del SOAT"
          photo={fotos.soatPhoto}
          extracting={extrayendo === 'soatPhoto'}
          onPress={() => abrirFoto('soatPhoto', 'SOAT')} />

        <OcrResumen result={ocrResultados.soatPhoto} />
        <Vista style={s.infoBox}>
          <Texto style={s.infoTxt}>
            El SOAT es obligatorio y debe encontrarse vigente.
          </Texto>
        </Vista>
      </SeccionModal>

      <SeccionModal
        visible={activoModal === 'domicile'}
        title="Domicilio"
        onShow={() => establecerDomicilioVisible(true)}
        onClose={() => {
          establecerDomicilioVisible(false);
          establecerAbrirMapaDomicilio(false);
          establecerActivoModal(null);
        }}
        onDone={() => {
          establecerDomicilioVisible(false);
          establecerActivoModal(null);
        }}
        doneDisabled={!terminado.domicile}>

        <DomicilioEntrada
          point={domicilioPunto}
          onPointChange={establecerDomicilioPunto}
          onAutoOpenMap={domicilioVisible && abrirMapaDomicilio ? () => establecerAbrirMapaDomicilio(false) : undefined} />

        <Texto style={s.lbl}>FACTURA DE LUZ RECIENTE *</Texto>
        <FotoCampo
          label="Comprobante de domicilio"
          photo={fotos.domicileProof}
          onPress={() => abrirFoto('domicileProof', 'Factura de luz')} />

      </SeccionModal>

      {/* Photo sheet selector */}
      <FotoHoja
        visible={fotoHoja.visible}
        label={fotoHoja.label}
        current={fotoHoja.current}
        onCamera={manejarCamara}
        onGallery={manejarGaleria}
        onClose={() => establecerFotoHoja((p) => ({ ...p, visible: false }))} />


      {/* Cámara de documentos */}
      <DocumentoCamaraModal
        visible={camaraCampo !== null}
        title={camaraCampo ? CAMARA_TITLES[camaraCampo] || 'Documento' : ''}
        documentType={
        camaraCampo === 'antecedentsPhoto' ?
        'certificate' :
        camaraCampo === 'domicileProof' ?
        'certificate' :
        camaraCampo === 'soatPhoto' ?
        'soat' :
        camaraCampo === 'ruatPhoto' ?
        'ruat' :
        camaraCampo === 'carFront' || camaraCampo === 'carBack' ?
        'vehicle' :
        'card'
        }
        frameLabel={
        camaraCampo === 'ciFront' ?
        'Coloca el frente de la cédula dentro del recuadro' :
        camaraCampo === 'ciBack' ?
        'Coloca la parte trasera de la cédula dentro del recuadro' :
        camaraCampo === 'licenseFront' ?
        'Coloca el frente de la licencia dentro del recuadro' :
        camaraCampo === 'licenseBack' ?
        'Coloca la parte trasera de la licencia dentro del recuadro' :
        camaraCampo === 'ticPhoto' ?
        'Encuadra la tarjeta de identificación del conductor' :
        camaraCampo === 'domicileProof' ?
        'Encuadra la parte superior de la factura de luz' :
        camaraCampo === 'antecedentsPhoto' ?
        'Encuadra el certificado de antecedentes completo' :
        camaraCampo === 'ruatPhoto' ?
        'Encuadra el documento RUAT (CRPVA) horizontal completo' :
        camaraCampo === 'soatPhoto' ?
        'Encuadra el certificado o comprobante SOAT completo' :
        camaraCampo === 'carFront' ?
        'Encuadra la parte delantera de tu vehículo' :
        camaraCampo === 'carBack' ?
        'Encuadra la parte trasera con la placa visible' :
        ''
        }
        autoCapture={false}
        twoSided={camaraCampo === 'licenseFront' ? true : undefined}
        onCaptureBoth={camaraCampo === 'licenseFront' ? async (frente, reverso) => {
          establecerCamaraCampo(null);
          establecerFotos((anterior) => ({ ...anterior, licenseFront: frente.uri, licenseBack: reverso.uri }));
          establecerRecortesFotos((anterior) => ({ ...anterior, licenseFront: frente.frame, licenseBack: reverso.frame }));
          if (!OCR_PREVIO_HABILITADO) return;
          establecerLicenciaVistas({});
          try {
            const [frontal, posterior] = await Promise.all([
              ejecutarOcr('licenseFront', frente.uri, frente.frame, true),
              ejecutarOcr('licenseBack', reverso.uri, reverso.frame, true)
            ]);
            const lecturas = [['Frente', frontal], ['Reverso', posterior]] as const;
            const emisionDesdeReverso = !frontal?.datos?.issueDate?.trim() &&
              !!emisionLicencia(frontal?.datos, posterior?.datos);
            establecerExtraidoCampos({
              field: 'licenseBack',
              title: 'Licencia de conducir',
              fields: lecturas.flatMap(([lado, resultado]) =>
                (resultado?.fields || []).map((fila) => ({ ...fila, label: `${fila.label} (${lado.toLowerCase()})` }))),
              missing: lecturas.flatMap(([lado, resultado]) =>
                (resultado?.missing || [])
                  .filter((campo) => !(emisionDesdeReverso && lado === 'Frente' && campo === CAMPO_ETIQUETAS.issueDate))
                  .map((campo) => `${campo} (${lado.toLowerCase()})`)),
              notice: lecturas.flatMap(([lado, resultado]) =>
                resultado?.error ? [`${lado}: ${resultado.error}`] : [])
                .concat(emisionDesdeReverso ? ['Se usará la fecha de emisión del reverso porque los números de licencia coinciden.'] : [])
                .join('\n')
            });
          } finally {
            establecerExtrayendo(null);
          }
        } : undefined}
        onCapture={(uri: string, fotograma?: {screenW: number;screenH: number;x: number;y: number;w: number;h: number;}) => {
          const campo = camaraCampo;
          establecerCamaraCampo(null);
          if (campo) {
            aplicarFoto(campo, uri, fotograma);
            if (campo === 'domicileProof') {
              establecerAbrirMapaDomicilio(true);
              establecerActivoModal('domicile');
            } else if (!OCR_PREVIO_HABILITADO && campo === 'ruatPhoto' && (!fotos.carFront || !fotos.carBack)) {
              setTimeout(() => establecerCamaraCampo(fotos.carFront ? 'carBack' : 'carFront'), 350);
            } else if (campo === 'carFront' && !fotos.carBack) {
              setTimeout(() => establecerCamaraCampo('carBack'), 350);
            }
          }
        }}
        onClose={() => establecerCamaraCampo(null)} />


      {/* Texto extraído del documento */}
      <ExtraidoTextoModal
        visible={extraidoTexto !== null}
        title={
        extraidoTexto ?
        CAMARA_TITLES[extraidoTexto.field] || 'Texto extraído' :
        ''
        }
        text={extraidoTexto?.text || ''}
        missing={extraidoTexto?.missing || []}
        image={extraidoTexto?.image}
        continueLabel={
        extraidoTexto?.field === 'ciFront' || extraidoTexto?.field === 'licenseFront' ?
        'Continuar con la parte trasera' :
        extraidoTexto?.field === 'ruatPhoto' ?
        'Continuar con fotos del vehículo' :
        'Listo'
        }
        onContinue={manejarExtraidoContinuar}
        onRepeat={manejarExtraidoRepetir}
        onClose={() => establecerExtraidoTexto(null)} />


      <ExtraidoCamposModal
        visible={extraidoCampos !== null}
        title={
        extraidoCampos ?
        extraidoCampos.title || CAMARA_TITLES[extraidoCampos.field] || 'Documento' :
        ''
        }
        fields={extraidoCampos?.fields || []}
        image={extraidoCampos?.field === 'licenseFront' || extraidoCampos?.field === 'licenseBack' ? undefined : extraidoCampos?.image}
        images={extraidoCampos?.field === 'licenseFront' || extraidoCampos?.field === 'licenseBack' ?
          ([['licenseFront', 'Frente enviado a Vision'], ['licenseBack', 'Reverso enviado a Vision']] as const).
          filter(([lado]) => !!licenciaVistas[lado]).map(([lado, label]) => ({ label, uri: licenciaVistas[lado] })) : []}
        missing={extraidoCampos?.missing || []}
        notice={extraidoCampos?.notice}
        continueLabel={
        extraidoCampos?.field === 'licenseFront' ?
        'Continuar con el reverso' :
        extraidoCampos?.field === 'ruatPhoto' ?
        'Continuar con el vehículo' :
        'Continuar'
        }
        onContinue={manejarExtraidoCamposContinuar}
        onRepeat={manejarExtraidoCamposRepetir}
        onClose={() => establecerExtraidoCampos(null)} />


      {/* Resultado combinado de ambos lados */}
      <CiResultadoModal
        visible={ciResultadoVisible}
        front={ocrResultados.ciFront || null}
        back={ocrResultados.ciBack || null}
        onContinue={manejarCiResultadoContinuar}
        onRepeatBack={manejarCiResultadoRepetirReverso}
        onClose={() => establecerCiResultadoVisible(false)} />


      {/* Texto leído en una foto rechazada (diagnóstico) */}
      <ExtraidoTextoModal
        visible={rechazadoVista !== null}
        title={
        rechazadoVista ?
        CAMARA_TITLES[rechazadoVista.field] || 'Texto leído' :
        ''
        }
        text={rechazadoVista?.text || ''}
        missing={[]}
        image={rechazadoVista?.image}
        continueLabel="Entendido"
        onContinue={() => establecerRechazadoVista(null)}
        onRepeat={() => {
          const campo = rechazadoVista?.field || null;
          establecerRechazadoVista(null);
          if (campo) establecerCamaraCampo(campo);
        }}
        onClose={() => establecerRechazadoVista(null)} />


      {/* Overlay de análisis OCR */}
      {extrayendo !== null &&
      <Vista style={s.analyzingOverlay}>
          <Vista style={s.analyzingBox}>
            <ActividadIndicador size="large" color={Colores.primary} />
            <Texto style={s.analyzingTxt}>Analizando documento…</Texto>
            <Texto style={s.analyzingSub}>Esto puede tomar unos segundos</Texto>
          </Vista>
        </Vista>
      }

      <CargaEnvioSolicitud visible={cargando} />
    </SeguraZonaVista>);

}

// ─── Styles ───────────────────────────────────────────────────────────────────
export { ConductorRegistroPantalla as default };const s = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF'
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colores.text
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF'
  },

  /* Progress Row Minimalista */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: Colores.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    backgroundColor: Colores.primary,
    borderRadius: 3
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colores.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  progressBadgeNum: {
    fontSize: 12,
    fontWeight: '800',
    color: Colores.primary
  },
  progressBadgeOf: {
    fontSize: 11,
    fontWeight: '500',
    color: Colores.primary
  },

  lbl: {
    fontSize: 11,
    fontWeight: '700',
    color: Colores.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  sectionNote: {
    fontSize: 12,
    color: Colores.textSecondary,
    lineHeight: 17,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },

  /* Footer */
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF'
  },
  footerHint: {
    fontSize: 13,
    fontWeight: '500',
    color: Colores.textSecondary,
    textAlign: 'center',
    marginBottom: 10
  },
  submitBtn: {
    backgroundColor: Colores.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnOff: {
    backgroundColor: '#F3EAFC',
    borderWidth: 0
  },
  submitTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: Colores.white
  },
  submitTxtOff: {
    color: Colores.primary,
    opacity: 0.6
  },

  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colores.primary,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  infoTxt: { fontSize: 13, color: Colores.textSecondary, lineHeight: 18 },

  /* Overlays */
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40
  },
  analyzingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '75%',
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  analyzingTxt: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Colores.text,
    textAlign: 'center'
  },
  analyzingSub: {
    marginTop: 4,
    fontSize: 12,
    color: Colores.textSecondary,
    textAlign: 'center'
  }
});
