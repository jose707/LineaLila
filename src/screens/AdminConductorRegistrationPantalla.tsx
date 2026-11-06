import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import ZoomableDocumentModal from '../components/ZoomableDocumentModal';
import Aviso from '../components/Aviso';
// src/screens/AdminConductorRegistrationPantalla.tsx
import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  StatusBar as EstadoBar,
  TextInput as TextoEntrada,
  Modal,
  ActivityIndicator as ActividadIndicador,
  RefreshControl as RenovarControl,
  Image as Imagen,
  Linking } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import {
  ChevronRight as ChevronDerecha,
  ChevronDown as ChevronAbajo,
  Search as Buscar,
  Menu as MenuIcono,
  Check as Comprobar,
  X,
  Clock as Reloj,
  Car,
  FileText as ArchivoTexto,
  User as Usuario,
  AlertCircle } from
'lucide-react-native';
import { NativeStackNavigationProp as NativoPilaNavegacionProp, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import * as AdministradorServicio from "../services/admin.servicio";
import { API_HOST } from "../config/constantes";
import { vehiculoTipoEtiqueta } from "../utils/vehiculoTipos";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  primaryBorder: '#E9D5FF',
  bg: '#FFFFFF',
  surface: '#F7F7F9',
  surfaceHigh: '#F3F3F3',
  border: '#EBEBEB',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#777777',
  success: '#16A34A',
  successLight: '#DCFCE7',
  successBorder: '#BBF7D0',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorBorder: '#FECACA',
  white: '#FFFFFF'
};

// ─── Types ────────────────────────────────────────────────────────────────────
type NavPropiedad = NativoPilaNavegacionProp<
  RaizPilaParametroLista,
  'AdminDriverRegistration'>;

interface Propiedades {
  navigation: NavPropiedad;
  route: NativeStackScreenProps<RaizPilaParametroLista, 'AdminDriverRegistration'>['route'];
}

interface LicenciaOcrCampos {
  licenseNumber?: string;
  fullName?: string;
  nationality?: string;
  issueDate?: string;
  licenseExpiryDate?: string;
  birthDate?: string;
  licenseCategory?: string;
}

interface IdentidadDetalles {
  ciNumber: string;
  firstNames?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  birthDate: string;
  issueDate?: string;
  expiryDate?: string;
  birthPlace?: string;
  address?: string;
  occupation?: string;
  maritalStatus?: string;
  verificationStatus: string;
}

interface RuatOcrCampos {
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  vehicleClass?: string;
  vehiclePassengerCapacity?: string;
  vehicleOwnerName?: string;
  vehicleOwnerCi?: string;
  registrationMunicipality?: string;
  crpvaNumber?: string;
  ruatIssueDate?: string;
  ownershipStartDate?: string;
  doorCount?: string;
  serviceType?: string;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType?: string;
  engineDisplacement?: string;
  engineType?: string;
  legalObservations?: string;
}

interface SoatOcrCampos {
  soatRosetteNumber?: string;
  soatYear?: string;
  soatDepartment?: string;
  soatPlate?: string;
  soatVehicleType?: string;
  soatUse?: string;
  soatStartDate?: string;
  soatExpiryDate?: string;
}

interface AntecedentesOcrCampos {
  certificateNumber?: string;
  fullName?: string;
  ciNumber?: string;
  birthDate?: string;
  procedureReason?: string;
  recipient?: string;
  backgroundUnit?: string;
  backgroundResult?: string;
  issueDate?: string;
  validUntil?: string;
}

interface TicOcrCampos {
  ticNumber?: string;
  issuingPlace?: string;
  firstNames?: string;
  surnames?: string;
  fullName?: string;
  licenseNumber?: string;
}

interface DomicilioComprobanteOcrCampos {
  serviceAddress?: string;
  billingMonth?: string;
}

const billingMesEtiqueta = (valor?: string) => {
  const coincidencia = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(valor || '');
  if (!coincidencia) return '';
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${meses[Number(coincidencia[2]) - 1]} ${coincidencia[1]}`;
};

const fechaSolicitudLegible = (valor?: string) => {
  if (!valor) return 'Fecha no disponible';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  const dia = fecha.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  return valor.includes('T') ? `${dia} · ${fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}` : dia;
};

const normalizadoPersonNombre = (valor?: string) => (valor || '').normalize('NFD').
replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').
split(/\s+/).filter(Boolean).sort().join(' ');

const compararTicNombre = (tic?: TicOcrCampos, identidad?: IdentidadDetalles | null) => {
  const ticNombre = normalizadoPersonNombre(tic?.fullName);
  const ciNombre = normalizadoPersonNombre([identidad?.firstNames, identidad?.paternalSurname,
  identidad?.maternalSurname].filter(Boolean).join(' '));
  if (!ticNombre || !ciNombre) return 'Pendiente de lectura';
  return ticNombre === ciNombre ? 'Coinciden' : 'No coinciden';
};

const compararTicLicencia = (tic?: TicOcrCampos, licencia?: LicenciaOcrCampos, alternativa?: string) => {
  const ticNumero = (tic?.licenseNumber || '').replace(/\D/g, '');
  const licenciaNumero = (licencia?.licenseNumber || alternativa || '').replace(/\D/g, '');
  if (!ticNumero || !licenciaNumero) return 'Pendiente de lectura';
  return ticNumero === licenciaNumero ? 'Coinciden' : 'No coinciden';
};

const compararCertificateIdentidad = (certificate?: AntecedentesOcrCampos, identidad?: IdentidadDetalles | null) => {
  if (!certificate || !identidad) return 'Pendiente de lectura';
  const ci = (valor?: string) => (valor || '').replace(/\D/g, '');
  const fecha = (valor?: string) => {
    const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor || '');
    return local ? `${local[3]}-${local[2]}-${local[1]}` : valor || '';
  };
  const nombre = [identidad.firstNames, identidad.paternalSurname, identidad.maternalSurname].filter(Boolean).join(' ');
  const pares = [
  [ci(certificate.ciNumber), ci(identidad.ciNumber)],
  [normalizadoPersonNombre(certificate.fullName), normalizadoPersonNombre(nombre)],
  [fecha(certificate.birthDate), fecha(identidad.birthDate)]];

  if (pares.some(([primero, segundo]) => !primero || !segundo)) return 'Pendiente de lectura';
  return pares.every(([primero, segundo]) => primero === segundo) ? 'Coinciden' : 'No coinciden';
};

const numeroLicenciaOcr = (lado?: LicenciaOcrCampos) => lado?.licenseNumber?.replace(/\D/g, '') || '';

const emisionLicenciaOcr = (frontal?: LicenciaOcrCampos, reverso?: LicenciaOcrCampos) => {
  const emisionFrontal = frontal?.issueDate?.trim();
  if (emisionFrontal) return { fecha: emisionFrontal, desdeReverso: false };
  const numero = numeroLicenciaOcr(frontal);
  const emisionReverso = reverso?.issueDate?.trim();
  if (numero && numero === numeroLicenciaOcr(reverso) && emisionReverso) {
    return { fecha: emisionReverso, desdeReverso: true };
  }
  return { fecha: '', desdeReverso: false };
};

const licenciaComparacion = (frontal?: LicenciaOcrCampos, reverso?: LicenciaOcrCampos) => {
  const fecha = (valor?: string) => {
    const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor || '');
    return local ? `${local[3]}-${local[2]}-${local[1]}` : valor || '';
  };
  const pares = [
  [numeroLicenciaOcr(frontal), numeroLicenciaOcr(reverso)],
  [fecha(emisionLicenciaOcr(frontal, reverso).fecha), fecha(reverso?.issueDate?.trim())],
  [fecha(frontal?.licenseExpiryDate), fecha(reverso?.licenseExpiryDate)]];

  if (pares.some(([primero, segundo]) => !primero || !segundo)) return 'Pendiente de lectura';
  return pares.every(([primero, segundo]) => primero === segundo) ? 'Coinciden' : 'No coinciden';
};

interface ConductorApplication {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  licenseFrontOcr?: LicenciaOcrCampos;
  licenseBackOcr?: LicenciaOcrCampos;
  ruatOcr?: RuatOcrCampos;
  soatOcr?: SoatOcrCampos;
  antecedentsOcr?: AntecedentesOcrCampos;
  ticOcr?: TicOcrCampos;
  domicileProofOcr?: DomicilioComprobanteOcrCampos;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePassengerCapacity?: number;
  domicile?: {address: string;latitude: number;longitude: number;} | null;
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  backgroundCheckDate: string;
  applicationDate: string;
  updatedAt: string;
  status: 'pendiente' | 'observado' | 'aprobado' | 'rechazado';
  ocrProcessingStatus?: 'pendiente' | 'complete';
  identity?: IdentidadDetalles | null;
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
      {filename: string;url?: string;status: string;uploadedAt: string;}>;

    createdAt: string;
    updatedAt: string;
  };
  approvedDocuments?: Record<string, boolean>;
  documentStatus?: Record<string, 'pendiente' | 'verificado' | 'rechazado'>;
  documents?: Record<string, string | undefined>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const estadoMeta = (estado: string) => {
  switch (estado) {
    case 'aprobado':
    case 'verificado':
      return {
        color: C.success,
        bg: C.successLight,
        border: C.successBorder,
        label: 'Aprobado'
      };
    case 'rechazado':
      return {
        color: C.error,
        bg: C.errorLight,
        border: C.errorBorder,
        label: 'Rechazado'
      };
    case 'observado':
      return {
        color: C.warning,
        bg: C.warningLight,
        border: C.warningBorder,
        label: 'Observado'
      };
    default:
      return {
        color: C.warning,
        bg: C.warningLight,
        border: C.warningBorder,
        label: 'Pendiente'
      };
  }
};

const documentoClaves: Array<{key: string;label: string;optional?: boolean;}> = [
{ key: 'licenseFront', label: 'Licencia frente' },
{ key: 'licenseBack', label: 'Licencia dorso' },
{ key: 'ticPhoto', label: 'TIC' },
{ key: 'antecedentsPhoto', label: 'Antecedentes' },
{ key: 'carFront', label: 'Auto frente' },
{ key: 'carBack', label: 'Auto dorso' },
{ key: 'soatPhoto', label: 'SOAT — roseta digital' },
{ key: 'ruatPhoto', label: 'RUAT' },
{ key: 'domicileProof', label: 'Factura de luz' }];

const motivosRechazoRapidos = [
  'Documento ilegible',
  'Datos no coinciden',
  'Documento vencido',
  'Información incompleta',
  'Vehículo no cumple los requisitos'
];

const ocrVistaPreviaDocumentos = new Set(['licenseFront', 'licenseBack', 'ticPhoto', 'ruatPhoto', 'soatPhoto', 'antecedentsPhoto', 'domicileProof']);

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function EstadoInsignia({ status: estado, small: pequeno }: {status: string;small?: boolean;}) {
  const m = estadoMeta(estado);
  const Icono =
  estado === 'aprobado' || estado === 'verificado' ? Comprobar : estado === 'rechazado' ? X : Reloj;
  return (
    <Vista
      style={[
      sb.wrap,
      { backgroundColor: m.bg, borderColor: m.border },
      pequeno && sb.small]
      }>

      <Icono size={pequeno ? 10 : 12} color={m.color} strokeWidth={2.5} />
      <Texto style={[sb.txt, { color: m.color }, pequeno && sb.txtSmall]}>
        {m.label}
      </Texto>
    </Vista>);

}
const sb = EstiloHoja.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1
  },
  small: { paddingHorizontal: 8, paddingVertical: 3 },
  txt: { fontSize: 12, fontWeight: '700' },
  txtSmall: { fontSize: 10 }
});

// ─── InitialsAvatar ───────────────────────────────────────────────────────────
function InitialsAvatar({ name: nombre, photo: foto, size: tamano = 44 }: {name: string;photo?: string;size?: number;}) {
  const [imagenError, establecerImagenError] = usarEstado(false);
  const initials = nombre.
  split(' ').
  slice(0, 2).
  map((w) => w[0]).
  join('').
  toUpperCase();
  return (
    <Vista
      style={[ia.wrap, { width: tamano, height: tamano, borderRadius: tamano / 2 }]}>

      {foto && !imagenError ?
        <Imagen
          source={privadoImagenOrigen(foto)}
          style={{ width: tamano, height: tamano, borderRadius: tamano / 2 }}
          onError={() => establecerImagenError(true)}
        /> :
        <Texto style={[ia.txt, { fontSize: tamano * 0.35 }]}>{initials}</Texto>}
    </Vista>);

}
const ia = EstiloHoja.create({
  wrap: {
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.primaryBorder
  },
  txt: { color: C.primary, fontWeight: '800', letterSpacing: -0.5 }
});

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SeccionEtiqueta({ text: texto }: {text: string;}) {
  return (
    <Texto
      style={{
        fontSize: 13,
        fontWeight: '700',
        color: C.text,
        letterSpacing: 0.3,
        marginBottom: 8
      }}>

      {texto}
    </Texto>);

}

function PlegableSeccion({ titulo, children, inicialAbierto = false }: {
  titulo: string;
  children: React.ReactNode;
  inicialAbierto?: boolean;
}) {
  const [abierto, establecerAbierto] = usarEstado(inicialAbierto);
  return (
    <Vista style={s.section}>
      <PulsableOpacidad
        style={s.sectionToggle}
        onPress={() => establecerAbierto((valor) => !valor)}
        accessibilityRole="button"
        accessibilityLabel={`${abierto ? 'Cerrar' : 'Abrir'} ${titulo}`}>
        <Texto style={s.sectionToggleText}>{titulo}</Texto>
        <ChevronAbajo size={19} color={C.textSub} style={{ transform: [{ rotate: abierto ? '180deg' : '0deg' }] }} />
      </PulsableOpacidad>
      {abierto && <Vista style={s.sectionBody}>{children}</Vista>}
    </Vista>
  );
}

function EnlaceDocumento({ titulo, estado, onPress }: { titulo: string; estado?: string; onPress: () => void }) {
  const colorEstado = estado === 'verificado' || estado === 'aprobado' ? C.success : estado === 'rechazado' ? C.error : null;
  return (
    <PulsableOpacidad style={s.documentLink} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${titulo}${colorEstado ? `, ${colorEstado === C.success ? 'aprobado' : 'rechazado'}` : ''}`}>
      <ArchivoTexto size={16} color={C.primary} />
      <Texto style={s.documentLinkText}>{titulo}</Texto>
      {colorEstado && <Vista style={[s.documentStatusDot, { backgroundColor: colorEstado }]} />}
    </PulsableOpacidad>
  );
}

// ─── DetailRow ────────────────────────────────────────────────────────────────
function DetalleFila({ label: etiqueta, value: valor }: {label: string;value: string;}) {
  return (
    <Vista style={dr.row}>
      <Texto style={dr.label}>{etiqueta}</Texto>
      <Texto style={dr.value}>{valor || '—'}</Texto>
    </Vista>);

}
const dr = EstiloHoja.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  label: { fontSize: 13, color: C.textSub, fontWeight: '400', flex: 1 },
  value: {
    fontSize: 13,
    color: C.text,
    fontWeight: '600',
    maxWidth: '58%',
    textAlign: 'right'
  }
});

// ─── DocButton ────────────────────────────────────────────────────────────────
function DocumentoBoton({
  label: etiqueta,
  docKey: documentoClave,
  app: aplicacion,
  docStatus: documentoEstado,
  locked: bloqueado,
  optional: opcional,
  onPress: alPulsar








}: {label: string;docKey: string;app: ConductorApplication;docStatus: Record<string, 'pendiente' | 'verificado' | 'rechazado'>;locked: boolean;optional?: boolean;onPress: (url: string, key: string) => void;}) {
  const archivoDatos = aplicacion.currentRequest?.files?.[documentoClave] as any;
  const existe = !!archivoDatos;
  // La API puede devolver una URL con localhost, inaccesible desde Android.
  // El archivo se abre siempre desde el mismo host que usa la app para la API.
  const url = existe && archivoDatos.filename ?
  `${API_HOST}/archivos/conductores/${encodeURIComponent(archivoDatos.filename)}` :
  '';
  const estado = documentoEstado[documentoClave] || 'pendiente';
  const m = estadoMeta(estado);

  // Badge visual para el estado del documento
  const insigniaBg = !existe ? opcional ? '#F3F4F6' : C.surface : m.bg;
  const insigniaColor = !existe ? opcional ? C.textMuted : C.textMuted : m.color;
  const insigniaEtiqueta = !existe ?
  opcional ?
  'Opcional' :
  'Sin enviar' :
  estado === 'verificado' ?
  bloqueado ?
  '✓ Verificado previamente' :
  'Verificado' :
  estado === 'rechazado' ?
  'Rechazado' :
  'Pendiente';

  return (
    <PulsableOpacidad
      style={[
      baseDatos.btn,
      existe ?
      { borderColor: m.border } :
      opcional ?
      baseDatos.btnOptional :
      baseDatos.btnMissing,
      bloqueado && baseDatos.btnLocked]
      }
      onPress={() => alPulsar(url, documentoClave)}
      disabled={!existe && opcional}
      activeOpacity={0.7}>

      <ArchivoTexto
        size={16}
        color={existe ? m.color : opcional ? C.textMuted : C.textMuted}
        strokeWidth={1.8} />

      <Vista style={{ flex: 1 }}>
        <Texto style={[baseDatos.label, { color: existe ? C.text : C.textMuted }]}>
          {etiqueta}
        </Texto>
        {opcional && <Texto style={baseDatos.optionalHint}>Documento opcional</Texto>}
      </Vista>
      <Vista style={[baseDatos.badge, { backgroundColor: insigniaBg }]}>
        <Texto style={[baseDatos.badgeTxt, { color: insigniaColor }]}>{insigniaEtiqueta}</Texto>
      </Vista>
    </PulsableOpacidad>);

}
const baseDatos = EstiloHoja.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border
  },
  btnMissing: { borderColor: C.border, backgroundColor: C.surface },
  btnOptional: {
    borderColor: C.border,
    backgroundColor: C.surface,
    borderStyle: 'dashed' as const
  },
  btnLocked: { opacity: 0.75 },
  label: { fontSize: 13, fontWeight: '600' as const },
  optionalHint: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 10, fontWeight: '700' as const }
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const AdministradorConductorRegistroPantalla: React.FC<Propiedades> = ({ navigation: navegacion, route }) => {
  const [buscarTexto, establecerBuscarTexto] = usarEstado('');
  const [busquedaVisible, establecerBusquedaVisible] = usarEstado(false);
  const [filtrosVisibles, establecerFiltrosVisibles] = usarEstado(false);
  const [seleccionadoEstado, establecerSeleccionadoEstado] = usarEstado<
    'all' | 'pendiente' | 'observado' | 'aprobado' | 'rechazado'>(
    'all');
  const [seleccionadoAplicacion, establecerSeleccionadoAplicacion] = usarEstado<ConductorApplication | null>(
    null
  );
  const [modalVisible, establecerModalVisible] = usarEstado(false);
  const [rechazarModalVisible, establecerRechazarModalVisible] = usarEstado(false);
  const [rechazoPaso, establecerRechazoPaso] = usarEstado<'resumen' | 'motivo'>('resumen');
  const [rechazoMotivo, establecerRechazoMotivo] = usarEstado('');
  const [esCargando, establecerEsCargando] = usarEstado(false);
  const [esRenovando, establecerEsRenovando] = usarEstado(false);
  const [esEnviando, establecerEsEnviando] = usarEstado(false);
  const [error, establecerError] = usarEstado<string | null>(null);
  const [aviso, establecerAviso] = usarEstado<{ id: number; mensaje: string } | null>(null);
  const mostrarAviso = React.useCallback((mensaje: string) => establecerAviso({ id: Date.now(), mensaje }), []);
  const cerrarRechazo = () => {
    establecerRechazoMotivo('');
    establecerRechazoPaso('resumen');
    establecerRechazarModalVisible(false);
  };
  const [documentoImagenUrl, establecerDocumentoImagenUrl] = usarEstado<string | null>(null);
  const [documentoImagenError, establecerDocumentoImagenError] = usarEstado(false);
  const [documentoImagenVista, establecerDocumentoImagenVista] = usarEstado<'original' | 'ocr'>('original');
  const [documentoImagenModal, establecerDocumentoImagenModal] = usarEstado(false);
  const [imagenCompletaVisible, establecerImagenCompletaVisible] = usarEstado(false);
  const [realDocumentoClave, establecerRealDocumentoClave] = usarEstado<string | null>(null);
  const [documentoEstado, establecerDocumentoEstado] = usarEstado<
    Record<string, 'pendiente' | 'verificado' | 'rechazado'>>(
    {});
  const [bloqueadoDocumentos, establecerBloqueadoDocumentos] = usarEstado<Set<string>>(new Set());
  const [solicitudes, establecerSolicitudes] = usarEstado<ConductorApplication[]>([]);
  const cargandoSolicitudesReferencia = React.useRef(false);

  const cargarConductorSolicitudes = React.useCallback(async (renovar = false) => {
    if (cargandoSolicitudesReferencia.current) return;
    cargandoSolicitudesReferencia.current = true;
    if (renovar) establecerEsRenovando(true);else
    establecerEsCargando(true);
    establecerError(null);
    try {
      const respuesta = await AdministradorServicio.obtenerTodosConductores(50, 0);
      if (respuesta?.data?.length > 0) {
        const datos = respuesta.data as ConductorApplication[];
        establecerSolicitudes(datos);
        establecerSeleccionadoAplicacion((anterior) => anterior ? datos.find((aplicacion) => aplicacion.id === anterior.id) || anterior : null);
      } else {
        establecerSolicitudes([]);
      }
    } catch {
      establecerError('Error al cargar los conductores');
    } finally {
      cargandoSolicitudesReferencia.current = false;
      if (renovar) establecerEsRenovando(false);else
      establecerEsCargando(false);
    }
  }, []);

  usarEnfoqueEfecto(React.useCallback(() => {
    cargarConductorSolicitudes();
  }, [cargarConductorSolicitudes]));

  const filtrado = solicitudes.filter((aplicacion) => {
    const q = buscarTexto.toLowerCase();
    const coincidenciaBuscar =
    aplicacion.name.toLowerCase().includes(q) ||
    aplicacion.email.toLowerCase().includes(q) ||
    aplicacion.licenseNumber.toLowerCase().includes(q);
    const coincidenciaEstado =
    seleccionadoEstado === 'all' || aplicacion.status === seleccionadoEstado;
    return coincidenciaBuscar && coincidenciaEstado;
  });

  const counts = {
    pending: solicitudes.filter((primero) => primero.status === 'pendiente').length,
    observed: solicitudes.filter((primero) => primero.status === 'observado').length,
    approved: solicitudes.filter((primero) => primero.status === 'aprobado').length,
    rejected: solicitudes.filter((primero) => primero.status === 'rechazado').length
  };

  const iniciarDocumentoEstado = React.useCallback((aplicacion: ConductorApplication) => {
    const s: Record<string, 'pendiente' | 'verificado' | 'rechazado'> = {};
    const bloqueado = new Set<string>();
    documentoClaves.forEach((d) => {
      s[d.key] = 'pendiente';
    });
    if (aplicacion.currentRequest?.files) {
      Object.entries(aplicacion.currentRequest.files).forEach(
        ([k, v]: [string, any]) => {
          s[k] = v.status;
          // Documentos aprobados en versiones anteriores (reenvíos) quedan bloqueados:
          // solo se bloquean si la solicitud es un reenvío (version > 1) y el doc
          // ya venía aprobado desde la BD (no es un archivo recién enviado).
          if (
          v.status === 'verificado' &&
          (aplicacion.currentRequest?.version ?? 1) > 1)
          {
            bloqueado.add(k);
          }
        }
      );
    }
    establecerDocumentoEstado(s);
    establecerBloqueadoDocumentos(bloqueado);
  }, []);

  const abrirAplicacion = React.useCallback((aplicacion: ConductorApplication) => {
    establecerSeleccionadoAplicacion(aplicacion);
    iniciarDocumentoEstado(aplicacion);
    establecerModalVisible(true);
  }, [iniciarDocumentoEstado]);

  const usuarioParaRevision = route.params?.usuarioId;
  React.useEffect(() => {
    if (!usuarioParaRevision) return;
    let vigente = true;
    AdministradorServicio.obtenerTodosConductores(1, 0, undefined, undefined, usuarioParaRevision)
      .then(({ data }) => {
        if (!vigente) return;
        const solicitud = (data as ConductorApplication[]).find(aplicacion => aplicacion.userId === usuarioParaRevision);
        if (solicitud) abrirAplicacion(solicitud);
        else mostrarAviso('No se encontró la solicitud de este usuario.');
      })
      .catch(() => { if (vigente) mostrarAviso('No se pudo abrir la solicitud.'); });
    return () => { vigente = false; };
  }, [usuarioParaRevision, abrirAplicacion, mostrarAviso]);

  const abrirDocumento = (clave: string) => {
    if (clave === 'ciFront' || clave === 'ciBack') {
      if (!seleccionadoAplicacion?.userId) {
        mostrarAviso('No se encontró el usuario de esta solicitud.');
        return;
      }
      establecerDocumentoImagenUrl(`${API_HOST}/api/administracion/usuarios/${encodeURIComponent(seleccionadoAplicacion.userId)}/evidencia-identidad/${clave}`);
      establecerDocumentoImagenError(false);
      establecerDocumentoImagenVista('original');
      establecerRealDocumentoClave(clave);
      establecerDocumentoImagenModal(true);
      return;
    }
    const archivo = seleccionadoAplicacion?.currentRequest?.files?.[clave];
    const url = archivo?.filename ? `${API_HOST}/archivos/conductores/${encodeURIComponent(archivo.filename)}` : '';
    establecerDocumentoImagenUrl(url);
    establecerDocumentoImagenError(false);
    establecerDocumentoImagenVista('original');
    establecerRealDocumentoClave(clave);
    establecerDocumentoImagenModal(true);
  };

  const datosExtraidosDocumento = (clave: string | null): Array<[string, string | undefined]> => {
    const aplicacion = seleccionadoAplicacion;
    if (!aplicacion) return [];
    switch (clave) {
      case 'ciFront':
      case 'ciBack':
        return [['CI', aplicacion.identity?.ciNumber], ['Nombres', aplicacion.identity?.firstNames], ['Apellido paterno', aplicacion.identity?.paternalSurname], ['Apellido materno', aplicacion.identity?.maternalSurname]];
      case 'licenseFront':
      case 'licenseBack':
        return [['Número', aplicacion.licenseFrontOcr?.licenseNumber || aplicacion.licenseNumber], ['Nombre', aplicacion.licenseFrontOcr?.fullName], ['Vencimiento', aplicacion.licenseFrontOcr?.licenseExpiryDate]];
      case 'ticPhoto':
        return [['Número', aplicacion.ticOcr?.ticNumber], ['Nombre', aplicacion.ticOcr?.fullName]];
      case 'antecedentsPhoto':
        return [['Certificado', aplicacion.antecedentsOcr?.certificateNumber], ['Resultado', aplicacion.antecedentsOcr?.backgroundResult]];
      case 'ruatPhoto':
        return [['Placa', aplicacion.ruatOcr?.vehiclePlate || aplicacion.vehiclePlate], ['Marca', aplicacion.ruatOcr?.vehicleBrand || aplicacion.vehicleBrand]];
      case 'soatPhoto':
        return [['Placa', aplicacion.soatOcr?.soatPlate], ['Vigencia', aplicacion.soatOcr?.soatExpiryDate]];
      case 'domicileProof':
        return [['Dirección', aplicacion.domicileProofOcr?.serviceAddress], ['Mes', billingMesEtiqueta(aplicacion.domicileProofOcr?.billingMonth)]];
      default:
        return [];
    }
  };

  const nombreResumenDocumento = (clave: string) => clave === 'licenseFront' || clave === 'licenseBack'
    ? 'Licencia de conducir' : documentoClaves.find(documento => documento.key === clave)?.label || clave;
  const aprobadoDocumentos = [...new Set(Object.entries(documentoEstado).
  filter(([, v]) => v === 'verificado').
  filter(([clave]) => (clave !== 'licenseFront' && clave !== 'licenseBack') ||
    (documentoEstado.licenseFront === 'verificado' && documentoEstado.licenseBack === 'verificado')).
  map(([k]) => nombreResumenDocumento(k)))];
  const rechazadoDocumentos = [...new Set(Object.entries(documentoEstado).
  filter(([, v]) => v === 'rechazado').
  map(([k]) => nombreResumenDocumento(k)))];
  // Docs con archivo subido (para distinguir opcionales sin enviar)
  const documentosConArchivos = new Set(
    Object.keys(seleccionadoAplicacion?.currentRequest?.files || {})
  );

  const pendienteRevisionDocumentos = Object.entries(documentoEstado).filter(([k, v]) => {
    if (v !== 'pendiente') return false;
    if (bloqueadoDocumentos.has(k)) return false;
    const documentoDef = documentoClaves.find((d) => d.key === k);
    // Documentos opcionales que el conductor no envió no bloquean la aprobación
    if (documentoDef?.optional && !documentosConArchivos.has(k)) return false;
    return true;
  });

  const comprobarRevisionCompleta = () => {
    if (pendienteRevisionDocumentos.length === 0) return true;
    mostrarAviso(`Quedan ${pendienteRevisionDocumentos.length} documentos sin revisar.`);
    return false;
  };

  const manejarAprobar = async () => {
    if (!seleccionadoAplicacion) return;
    if (rechazadoDocumentos.length > 0) {
      mostrarAviso('Para aprobar, todos los documentos deben estar aprobados.');
      return;
    }
    if (!comprobarRevisionCompleta()) return;
    establecerEsEnviando(true);
    try {
      await AdministradorServicio.aprobarConductor(
        seleccionadoAplicacion.currentRequest?.id || seleccionadoAplicacion.id,
        Object.entries(documentoEstado).
        filter(([, estado]) => estado === 'verificado').
        map(([clave]) => clave)
      );
      establecerSolicitudes((anterior) =>
      anterior.map((primero) =>
      primero.id === seleccionadoAplicacion.id ? { ...primero, status: 'aprobado' } : primero
      )
      );
      mostrarAviso(`${seleccionadoAplicacion.name} fue aprobada como conductora.`);
      establecerDocumentoEstado({});
      establecerBloqueadoDocumentos(new Set());
      establecerModalVisible(false);
      establecerSeleccionadoAplicacion(null);
      cargarConductorSolicitudes();
    } catch (e: any) {
      mostrarAviso(e?.message || 'No se pudo aprobar la solicitud.');
    } finally {
      establecerEsEnviando(false);
    }
  };

  const manejarDecision = async () => {
    if (!comprobarRevisionCompleta()) return;
    if (!seleccionadoAplicacion || !rechazoMotivo.trim()) {
      mostrarAviso('Ingresa el motivo del rechazo.');
      return;
    }
    const rechazadoClaves = Object.entries(documentoEstado).
    filter(([, v]) => v === 'rechazado').
    map(([k]) => k);
    const verificadoClaves = Object.entries(documentoEstado).
    filter(([, v]) => v === 'verificado').
    map(([k]) => k);
    establecerEsEnviando(true);
    try {
      const solicitudId = seleccionadoAplicacion.currentRequest?.id || seleccionadoAplicacion.id;
      await AdministradorServicio.rechazarConductor(solicitudId, rechazoMotivo.trim(), rechazadoClaves, verificadoClaves);
      establecerSolicitudes((anterior) =>
      anterior.map((primero) =>
      primero.id === seleccionadoAplicacion.id ?
      { ...primero, status: 'rechazado', rejectionReason: rechazoMotivo.trim() } :
      primero
      )
      );
      mostrarAviso(`Se notificó a ${seleccionadoAplicacion.name} el rechazo.`);
      establecerRechazoMotivo('');
      establecerDocumentoEstado({});
      establecerBloqueadoDocumentos(new Set());
      establecerRechazarModalVisible(false);
      establecerModalVisible(false);
      establecerSeleccionadoAplicacion(null);
      cargarConductorSolicitudes();
    } catch (e: any) {
      mostrarAviso(e?.message || 'No se pudo rechazar la solicitud.');
    } finally {
      establecerEsEnviando(false);
    }
  };

  const imagenActualUrl = documentoImagenVista === 'ocr' && realDocumentoClave && seleccionadoAplicacion?.currentRequest?.id ?
    `${API_HOST}/api/administracion/solicitudes/${encodeURIComponent(seleccionadoAplicacion.currentRequest.id)}/vista-previa-ocr/${encodeURIComponent(realDocumentoClave)}` :
    documentoImagenUrl;
  const imagenFuente = imagenActualUrl ? {
    ...privadoImagenOrigen(imagenActualUrl),
    ...(realDocumentoClave === 'ciFront' || realDocumentoClave === 'ciBack' ? { cache: 'reload' as const } : {})
  } : undefined;
  const imagenTitulo = realDocumentoClave === 'ciFront' ? 'CI frente' : realDocumentoClave === 'ciBack' ? 'CI dorso' : documentoClaves.find((documento) => documento.key === realDocumentoClave)?.label || 'Documento';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SeguraZonaVista style={s.container}>
      <EstadoBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <Vista style={s.header}>
        <PulsableOpacidad onPress={() => navegacion.goBack()} style={[s.backBtn, s.closeBtn]}>
          <X size={24} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={s.headerTitle} numberOfLines={1}>Solicitudes de conductores</Texto>
        <PulsableOpacidad
          style={s.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Buscar solicitudes"
          onPress={() => establecerBusquedaVisible((visible) => !visible)}>
          <Buscar size={20} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <PulsableOpacidad
          style={s.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Filtrar solicitudes"
          onPress={() => establecerFiltrosVisibles(true)}>
          <MenuIcono size={22} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
      </Vista>

      {/* Search */}
      {busquedaVisible && <Vista style={s.searchWrap}>
        <Buscar size={15} color={C.textMuted} strokeWidth={2} />
        <TextoEntrada
          style={s.searchInput}
          placeholder="Buscar conductora, correo o licencia"
          placeholderTextColor={C.textMuted}
          value={buscarTexto}
          onChangeText={establecerBuscarTexto} />

        {buscarTexto.length > 0 &&
        <PulsableOpacidad onPress={() => establecerBuscarTexto('')}>
            <X size={15} color={C.textMuted} strokeWidth={2} />
          </PulsableOpacidad>
        }
      </Vista>}

      <Modal visible={filtrosVisibles} transparent animationType="fade" onRequestClose={() => establecerFiltrosVisibles(false)}>
        <Vista style={s.filterOverlay}>
          <PulsableOpacidad style={EstiloHoja.absoluteFill} onPress={() => establecerFiltrosVisibles(false)} />
          <Vista style={s.filterMenu}>
            <Texto style={s.filterTitle}>Mostrar solicitudes</Texto>
        {(
        [
        { key: 'all', label: 'Todos' },
        { key: 'pendiente', label: `Pendientes (${counts.pending})` },
        { key: 'observado', label: `Observados (${counts.observed})` },
        { key: 'aprobado', label: `Aprobados (${counts.approved})` },
        { key: 'rechazado', label: `Rechazados (${counts.rejected})` }] as
        const).
        map((f) =>
        <PulsableOpacidad
          key={f.key}
          style={[s.filterOption, seleccionadoEstado === f.key && s.filterOptionActive]}
          onPress={() => { establecerSeleccionadoEstado(f.key); establecerFiltrosVisibles(false); }}>

            <Texto
            style={[s.filterOptionText, seleccionadoEstado === f.key && s.filterOptionTextActive]}>

              {f.label}
            </Texto>
            {seleccionadoEstado === f.key && <Comprobar size={18} color={C.primary} strokeWidth={2} />}
          </PulsableOpacidad>
        )}
          </Vista>
        </Vista>
      </Modal>

      <DesplazableVista
        style={{ flex: 1 }}
        contentContainerStyle={[s.listContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
        <RenovarControl
          refreshing={esRenovando}
          onRefresh={() => cargarConductorSolicitudes(true)}
          tintColor={C.primary}
          colors={[C.primary]} />

        }>

        {/* Loading / Error */}
        {esCargando &&
        <Vista style={s.center}>
            <ActividadIndicador size="large" color={C.primary} />
            <Texto style={s.loadingTxt}>Cargando solicitudes...</Texto>
          </Vista>
        }
        {error && !esCargando &&
        <Vista style={s.errorBanner}>
            <AlertCircle size={14} color={C.error} strokeWidth={2} />
            <Texto style={s.errorTxt}>{error}</Texto>
          </Vista>
        }

        {/* Result count */}
        {!esCargando &&
        <Texto style={s.resultCount}>
            {filtrado.length} resultado{filtrado.length !== 1 ? 's' : ''}
          </Texto>
        }

        {/* Empty */}
        {!esCargando && filtrado.length === 0 &&
        <Vista style={s.center}>
            <Usuario size={32} color={C.textMuted} strokeWidth={1.5} />
            <Texto style={s.emptyTxt}>Sin solicitudes</Texto>
          </Vista>
        }

        {/* List */}
        {filtrado.map((aplicacion) => {
          return (
            <PulsableOpacidad
              key={aplicacion.id}
              style={s.card}
              onPress={() => abrirAplicacion(aplicacion)}
              activeOpacity={0.7}>

              <Vista style={s.cardTop}>
                <InitialsAvatar name={aplicacion.name} photo={aplicacion.photo} size={50} />
                <Vista style={s.cardIdentity}>
                  <Texto style={s.cardName} numberOfLines={1}>{aplicacion.name}</Texto>
                  <Texto style={s.cardEmail} numberOfLines={1}>{aplicacion.email}</Texto>
                  <Vista style={s.cardVehicle}>
                    <Car size={15} color={C.primary} strokeWidth={1.8} />
                    <Texto style={s.cardVehicleText} numberOfLines={1}>
                      {vehiculoTipoEtiqueta(aplicacion.vehicleType).toUpperCase()} · {aplicacion.vehiclePlate || 'Sin placa'}
                    </Texto>
                  </Vista>
                </Vista>
                <Vista
                  style={[s.statusDot, { backgroundColor: estadoMeta(aplicacion.status).color }]}
                  accessibilityLabel={`Estado: ${estadoMeta(aplicacion.status).label}`}
                />
              </Vista>
            </PulsableOpacidad>);

        })}
      </DesplazableVista>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {seleccionadoAplicacion &&
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => establecerModalVisible(false)}>

          <SeguraZonaVista style={s.container}>
            <EstadoBar barStyle="dark-content" backgroundColor={C.bg} />

            {/* Modal header */}
            <Vista style={s.header}>
              <PulsableOpacidad
              onPress={() => {
                establecerModalVisible(false);
                establecerSeleccionadoAplicacion(null);
              }}
              style={[s.backBtn, s.closeBtn]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar revisión">

                <X size={24} color={C.text} strokeWidth={2.8} />
              </PulsableOpacidad>
              <Texto style={s.headerTitle}>
                Revisión de solicitud{(seleccionadoAplicacion.currentRequest?.version ?? 1) > 1
                  ? ` · V${seleccionadoAplicacion.currentRequest?.version}` : ''}
              </Texto>
              <Vista style={{ width: 42 }} />
            </Vista>

            <DesplazableVista
            contentContainerStyle={s.modalContent}
            showsVerticalScrollIndicator={false}>

              {/* Identity */}
              <Vista style={s.modalHero}>
                <InitialsAvatar name={seleccionadoAplicacion.name} photo={seleccionadoAplicacion.photo} size={64} />
                <Vista style={s.heroInfo}>
                  <Vista style={s.heroNameRow}>
                    <Texto style={s.heroName} numberOfLines={2}>{seleccionadoAplicacion.name}</Texto>
                    <Vista
                      style={[s.statusDot, { backgroundColor: estadoMeta(seleccionadoAplicacion.status).color }]}
                      accessibilityLabel={`Estado: ${estadoMeta(seleccionadoAplicacion.status).label}`}
                    />
                  </Vista>
                  <Texto style={s.heroDate}>Solicitó el {fechaSolicitudLegible(seleccionadoAplicacion.applicationDate)}</Texto>
                </Vista>
              </Vista>

              {seleccionadoAplicacion.ocrProcessingStatus === 'pendiente' &&
            <Vista style={s.resubBanner}>
                  <ActividadIndicador size="small" color={C.warning} />
                  <Texto style={s.resubSub}>
                    Extrayendo datos de los documentos. Desliza hacia abajo para actualizar.
                  </Texto>
                </Vista>
            }

              {/* Info sections */}
              <PlegableSeccion titulo="Información de contacto" inicialAbierto>
                <DetalleFila label="Email" value={seleccionadoAplicacion.email} />
                <DetalleFila label="Teléfono" value={seleccionadoAplicacion.phone} />
              </PlegableSeccion>

              <PlegableSeccion titulo="Cédula de identidad">
                <EnlaceDocumento titulo="Ver CI frente" estado={seleccionadoAplicacion.identity?.verificationStatus} onPress={() => abrirDocumento('ciFront')} />
                <EnlaceDocumento titulo="Ver CI dorso" estado={seleccionadoAplicacion.identity?.verificationStatus} onPress={() => abrirDocumento('ciBack')} />
                <DetalleFila label="Número" value={seleccionadoAplicacion.identity?.ciNumber || ''} />
                <DetalleFila label="Nombres" value={seleccionadoAplicacion.identity?.firstNames || ''} />
                <DetalleFila label="Apellido paterno" value={seleccionadoAplicacion.identity?.paternalSurname || ''} />
                <DetalleFila label="Apellido materno" value={seleccionadoAplicacion.identity?.maternalSurname || ''} />
                <DetalleFila label="Nacimiento" value={seleccionadoAplicacion.identity?.birthDate || ''} />
                <DetalleFila label="Emisión" value={seleccionadoAplicacion.identity?.issueDate || ''} />
                <DetalleFila label="Vencimiento" value={seleccionadoAplicacion.identity?.expiryDate || ''} />
                <DetalleFila label="Lugar de nacimiento" value={seleccionadoAplicacion.identity?.birthPlace || ''} />
                <DetalleFila label="Domicilio" value={seleccionadoAplicacion.identity?.address || ''} />
                <DetalleFila label="Profesión" value={seleccionadoAplicacion.identity?.occupation || ''} />
                <DetalleFila label="Estado civil" value={seleccionadoAplicacion.identity?.maritalStatus || ''} />
                <DetalleFila label="Verificación" value={seleccionadoAplicacion.identity?.verificationStatus === 'verificado' ? 'Verificada' : 'Pendiente'} />
              </PlegableSeccion>

              <PlegableSeccion titulo="Licencia de conducir">
                <EnlaceDocumento titulo="Ver licencia frente" estado={documentoEstado.licenseFront} onPress={() => abrirDocumento('licenseFront')} />
                <EnlaceDocumento titulo="Ver licencia dorso" estado={documentoEstado.licenseBack} onPress={() => abrirDocumento('licenseBack')} />
                <DetalleFila label="Número" value={seleccionadoAplicacion.licenseFrontOcr?.licenseNumber || seleccionadoAplicacion.licenseNumber} />
                <DetalleFila label="Nombre y apellidos" value={seleccionadoAplicacion.licenseFrontOcr?.fullName || ''} />
                <DetalleFila label="Nacionalidad" value={seleccionadoAplicacion.licenseFrontOcr?.nationality || ''} />
                <DetalleFila label="Emisión" value={(() => {
                  const emision = emisionLicenciaOcr(seleccionadoAplicacion.licenseFrontOcr, seleccionadoAplicacion.licenseBackOcr);
                  return emision.desdeReverso ? `${emision.fecha} (del reverso)` : emision.fecha;
                })()} />
                <DetalleFila label="Vencimiento" value={seleccionadoAplicacion.licenseFrontOcr?.licenseExpiryDate || seleccionadoAplicacion.licenseExpiryDate} />
                <DetalleFila label="Nacimiento" value={seleccionadoAplicacion.licenseFrontOcr?.birthDate || ''} />
                <DetalleFila label="Categoría" value={seleccionadoAplicacion.licenseFrontOcr?.licenseCategory || ''} />
                <DetalleFila
                label="Anverso / reverso"
                value={licenciaComparacion(seleccionadoAplicacion.licenseFrontOcr, seleccionadoAplicacion.licenseBackOcr)} />

              </PlegableSeccion>

              <PlegableSeccion titulo="TIC · Identificación de la conductora">
                <EnlaceDocumento titulo="Ver TIC" estado={documentoEstado.ticPhoto} onPress={() => abrirDocumento('ticPhoto')} />
                <DetalleFila label="Número de tarjeta" value={seleccionadoAplicacion.ticOcr?.ticNumber || ''} />
                <DetalleFila label="Lugar de emisión" value={seleccionadoAplicacion.ticOcr?.issuingPlace || ''} />
                <DetalleFila label="Nombre en TIC" value={seleccionadoAplicacion.ticOcr?.fullName || ''} />
                <DetalleFila label="Licencia en TIC" value={seleccionadoAplicacion.ticOcr?.licenseNumber || ''} />
                <DetalleFila label="Nombre TIC / CI" value={compararTicNombre(seleccionadoAplicacion.ticOcr, seleccionadoAplicacion.identity)} />
                <DetalleFila label="Número TIC / licencia" value={compararTicLicencia(
                seleccionadoAplicacion.ticOcr, seleccionadoAplicacion.licenseFrontOcr, seleccionadoAplicacion.licenseNumber
              )} />
                <DetalleFila label="Categoría marcada" value="Revisar en la imagen" />
              </PlegableSeccion>

              <PlegableSeccion titulo="Antecedentes policiales">
                <EnlaceDocumento titulo="Ver certificado" estado={documentoEstado.antecedentsPhoto} onPress={() => abrirDocumento('antecedentsPhoto')} />
                <DetalleFila label="Número de certificado" value={seleccionadoAplicacion.antecedentsOcr?.certificateNumber || ''} />
                <DetalleFila label="Nombre en certificado" value={seleccionadoAplicacion.antecedentsOcr?.fullName || ''} />
                <DetalleFila label="CI en certificado" value={seleccionadoAplicacion.antecedentsOcr?.ciNumber || ''} />
                <DetalleFila label="Nacimiento en certificado" value={seleccionadoAplicacion.antecedentsOcr?.birthDate || ''} />
                <DetalleFila label="Identidad / CI verificada" value={compararCertificateIdentidad(seleccionadoAplicacion.antecedentsOcr, seleccionadoAplicacion.identity)} />
                <DetalleFila label="Tipo de antecedentes" value={seleccionadoAplicacion.antecedentsOcr?.backgroundUnit || ''} />
                <DetalleFila label="Resultado declarado" value={seleccionadoAplicacion.antecedentsOcr?.backgroundResult || ''} />
                <DetalleFila label="Emisión" value={seleccionadoAplicacion.antecedentsOcr?.issueDate || ''} />
                <DetalleFila label="Validez hasta" value={seleccionadoAplicacion.antecedentsOcr?.validUntil || ''} />
                <DetalleFila label="Motivo del trámite" value={seleccionadoAplicacion.antecedentsOcr?.procedureReason || ''} />
                <DetalleFila label="Destinatario" value={seleccionadoAplicacion.antecedentsOcr?.recipient || ''} />
              </PlegableSeccion>

              <PlegableSeccion titulo="RUAT y vehículo">
                <EnlaceDocumento titulo="Ver RUAT" estado={documentoEstado.ruatPhoto} onPress={() => abrirDocumento('ruatPhoto')} />
                <EnlaceDocumento titulo="Ver auto frente" estado={documentoEstado.carFront} onPress={() => abrirDocumento('carFront')} />
                <EnlaceDocumento titulo="Ver auto dorso" estado={documentoEstado.carBack} onPress={() => abrirDocumento('carBack')} />
                <DetalleFila
                label="Marca"
                value={seleccionadoAplicacion.ruatOcr?.vehicleBrand || seleccionadoAplicacion.vehicleBrand || ''} />

                <DetalleFila
                label="Clase"
                value={seleccionadoAplicacion.ruatOcr?.vehicleClass || vehiculoTipoEtiqueta(seleccionadoAplicacion.vehicleType)} />

                <DetalleFila
                label="Tipo de vehículo"
                value={seleccionadoAplicacion.ruatOcr?.vehicleModel || seleccionadoAplicacion.vehicleModel || ''} />

                <DetalleFila
                label="Modelo"
                value={seleccionadoAplicacion.ruatOcr?.vehicleYear || seleccionadoAplicacion.vehicleYear?.toString()} />

                <DetalleFila label="Placa" value={seleccionadoAplicacion.ruatOcr?.vehiclePlate || seleccionadoAplicacion.vehiclePlate} />
                <DetalleFila
                label="Color"
                value={seleccionadoAplicacion.ruatOcr?.vehicleColor || seleccionadoAplicacion.vehicleColor || ''} />

                <DetalleFila
                label="Capacidad pasajeros"
                value={seleccionadoAplicacion.ruatOcr?.vehiclePassengerCapacity || (
                seleccionadoAplicacion.vehiclePassengerCapacity ? String(seleccionadoAplicacion.vehiclePassengerCapacity) : '')} />

                <DetalleFila label="Radicatoria" value={seleccionadoAplicacion.ruatOcr?.registrationMunicipality || ''} />
                <DetalleFila label="CRPVA" value={seleccionadoAplicacion.ruatOcr?.crpvaNumber || ''} />
                <DetalleFila label="Emisión RUAT" value={seleccionadoAplicacion.ruatOcr?.ruatIssueDate || ''} />
                <DetalleFila label="Inicio de propiedad" value={seleccionadoAplicacion.ruatOcr?.ownershipStartDate || ''} />
                <DetalleFila label="Puertas" value={seleccionadoAplicacion.ruatOcr?.doorCount || ''} />
                <DetalleFila label="Servicio" value={seleccionadoAplicacion.ruatOcr?.serviceType || ''} />
                <DetalleFila label="Chasis" value={seleccionadoAplicacion.ruatOcr?.chassisNumber || ''} />
                <DetalleFila label="Motor" value={seleccionadoAplicacion.ruatOcr?.engineNumber || ''} />
                <DetalleFila label="Combustible" value={seleccionadoAplicacion.ruatOcr?.fuelType || ''} />
                <DetalleFila label="Cilindrada" value={seleccionadoAplicacion.ruatOcr?.engineDisplacement || ''} />
                <DetalleFila label="Tipo de motor" value={seleccionadoAplicacion.ruatOcr?.engineType || ''} />
                <DetalleFila label="Observaciones" value={seleccionadoAplicacion.ruatOcr?.legalObservations || ''} />
                <DetalleFila label="Propietario" value={seleccionadoAplicacion.ruatOcr?.vehicleOwnerName || ''} />
                <DetalleFila
                label="CI del propietario"
                value={(seleccionadoAplicacion.ruatOcr?.vehicleOwnerCi || '').replace(/^(\d{5,10})([A-Z]{2})$/, '$1 $2')} />

              </PlegableSeccion>

              <PlegableSeccion titulo="SOAT · Roseta digital">
                <EnlaceDocumento titulo="Ver SOAT" estado={documentoEstado.soatPhoto} onPress={() => abrirDocumento('soatPhoto')} />
                <DetalleFila
                label="Formato"
                value={seleccionadoAplicacion.soatOcr?.soatRosetteNumber && seleccionadoAplicacion.soatOcr?.soatYear ?
                'Roseta detectada' :
                'Revisar imagen'} />

                <DetalleFila label="Número de roseta" value={seleccionadoAplicacion.soatOcr?.soatRosetteNumber || ''} />
                <DetalleFila label="Gestión" value={seleccionadoAplicacion.soatOcr?.soatYear || ''} />
                <DetalleFila label="Departamento" value={seleccionadoAplicacion.soatOcr?.soatDepartment || ''} />
                <DetalleFila label="Placa" value={seleccionadoAplicacion.soatOcr?.soatPlate || ''} />
                <DetalleFila label="Tipo de vehículo" value={seleccionadoAplicacion.soatOcr?.soatVehicleType || ''} />
                <DetalleFila label="Uso" value={seleccionadoAplicacion.soatOcr?.soatUse || ''} />
                <DetalleFila label="Vigencia desde" value={seleccionadoAplicacion.soatOcr?.soatStartDate || ''} />
                <DetalleFila label="Vigencia hasta" value={seleccionadoAplicacion.soatOcr?.soatExpiryDate || ''} />
                <DetalleFila
                label="Placa SOAT / RUAT"
                value={seleccionadoAplicacion.soatOcr?.soatPlate && seleccionadoAplicacion.ruatOcr?.vehiclePlate ?
                seleccionadoAplicacion.soatOcr.soatPlate === seleccionadoAplicacion.ruatOcr.vehiclePlate ?
                'Coinciden' :
                'No coinciden' :
                'Pendiente de lectura'} />

              </PlegableSeccion>

              <PlegableSeccion titulo="Domicilio">
                <EnlaceDocumento titulo="Ver factura de luz" estado={documentoEstado.domicileProof} onPress={() => abrirDocumento('domicileProof')} />
                <DetalleFila label="Dirección en factura de luz" value={seleccionadoAplicacion.domicileProofOcr?.serviceAddress || ''} />
                <DetalleFila label="Mes de factura" value={billingMesEtiqueta(seleccionadoAplicacion.domicileProofOcr?.billingMonth)} />
                <DetalleFila
                label="Ubicación marcada"
                value={seleccionadoAplicacion.domicile ?
                `${seleccionadoAplicacion.domicile.latitude.toFixed(5)}, ${seleccionadoAplicacion.domicile.longitude.toFixed(5)}` :
                '—'} />

                {seleccionadoAplicacion.domicile &&
              <PulsableOpacidad onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${seleccionadoAplicacion.domicile!.latitude},${seleccionadoAplicacion.domicile!.longitude}`)}>
                    <Texto style={{ color: C.primary, fontWeight: '700', marginTop: 8 }}>Ver ubicación en el mapa</Texto>
                  </PulsableOpacidad>
              }
              </PlegableSeccion>

              {/* Summary */}
              {(aprobadoDocumentos.length > 0 || rechazadoDocumentos.length > 0) &&
            <Vista style={s.section}>
                  <SeccionEtiqueta text="RESUMEN DE REVISIÓN" />
                  <Vista style={s.reviewSummary}>
                  {aprobadoDocumentos.length > 0 &&
                    <Vista style={s.reviewGroup}>
                      <Vista style={s.reviewHeading}>
                        <Vista style={[s.reviewDot, { backgroundColor: C.success }]} />
                        <Texto style={s.reviewHeadingText}>Aprobados</Texto>
                        <Texto style={s.reviewCount}>{aprobadoDocumentos.length}</Texto>
                      </Vista>
                      {aprobadoDocumentos.map((documento) =>
                        <Texto key={documento} style={s.reviewItem}>{documento}</Texto>
                      )}
                    </Vista>
              }
                  {rechazadoDocumentos.length > 0 &&
                    <Vista style={[s.reviewGroup, aprobadoDocumentos.length > 0 && s.reviewGroupBorder]}>
                      <Vista style={s.reviewHeading}>
                        <Vista style={[s.reviewDot, { backgroundColor: C.error }]} />
                        <Texto style={s.reviewHeadingText}>Rechazados</Texto>
                        <Texto style={s.reviewCount}>{rechazadoDocumentos.length}</Texto>
                      </Vista>
                      {rechazadoDocumentos.map((documento) =>
                        <Texto key={documento} style={s.reviewItem}>{documento}</Texto>
                      )}
                    </Vista>
              }
                  </Vista>
                </Vista>
            }

              {/* Notes */}
              {!!seleccionadoAplicacion.verificationNotes &&
            <Vista style={s.section}>
                  <SeccionEtiqueta text="NOTAS DE VERIFICACIÓN" />
                  <Vista style={s.notesBox}>
                    <Texto style={s.notesTxt}>
                      {seleccionadoAplicacion.verificationNotes}
                    </Texto>
                  </Vista>
                </Vista>
            }

              {/* Rejection reason (if already rejected) */}
              {(seleccionadoAplicacion.status === 'observado' || seleccionadoAplicacion.status === 'rechazado') &&
            seleccionadoAplicacion.rejectionReason &&
            <Vista style={s.rejectionMessage}>
              <Vista style={s.rejectionMessageIcon}>
                <Texto style={s.rejectionMessageIconText}>!</Texto>
              </Vista>
              <Vista style={s.rejectionMessageContent}>
                <Texto style={s.rejectionMessageTitle}>
                  {seleccionadoAplicacion.status === 'observado' ? 'Motivo de observación' : 'Motivo del rechazo'}
                </Texto>
                <Texto style={s.rejectionMessageText}>{seleccionadoAplicacion.rejectionReason}</Texto>
              </Vista>
            </Vista>
            }

            </DesplazableVista>

              {seleccionadoAplicacion.status === 'pendiente' &&
            <Vista style={s.actions}>
                  <PulsableOpacidad style={s.approveBtn} onPress={manejarAprobar} disabled={esEnviando}>
                    <Texto style={s.actionTxt}>Aprobar</Texto>
                  </PulsableOpacidad>
                  <PulsableOpacidad
                style={s.rejectBtn}
                onPress={() => { if (comprobarRevisionCompleta()) { establecerRechazoPaso('resumen'); establecerRechazarModalVisible(true); } }}
                disabled={esEnviando}>

                    <Texto style={[s.actionTxt, { color: C.text }]}>Rechazar</Texto>
                  </PulsableOpacidad>
                </Vista>
            }
            {aviso && !rechazarModalVisible && !documentoImagenModal &&
              <Aviso key={aviso.id} message={aviso.mensaje} visible position="bottom" icon="!" iconCircle bottomOffset={10} fontWeight="700" textAlign="left" onHide={() => establecerAviso(null)} />}
          </SeguraZonaVista>
        </Modal>
      }

      {/* ── Rejection Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={rechazarModalVisible}
        animationType="fade"
        transparent
        onRequestClose={cerrarRechazo}>

        <Vista style={s.overlay}>
          <Vista style={s.rejectModal}>
            <Texto style={s.rejectModalTitle}>{rechazoPaso === 'resumen' ? 'Resumen de revisión' : 'Motivo de rechazo'}</Texto>
            <Texto style={s.rejectModalSub}>{rechazoPaso === 'resumen' ? 'Confirma los documentos revisados antes de continuar.' : 'Elige un motivo o escribe uno propio.'}</Texto>
            <DesplazableVista style={s.rejectContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {rechazoPaso === 'resumen' ?
                <Vista style={s.rejectSummary}>
                  <Vista style={s.rejectSummaryGroup}>
                    <Vista style={[s.reviewDot, { backgroundColor: C.success }]} />
                    <Texto style={s.rejectSummaryTitle}>Aprobados · {aprobadoDocumentos.length}</Texto>
                  </Vista>
                  {aprobadoDocumentos.map((documento) => <Texto key={documento} style={s.rejectSummaryItem}>{documento}</Texto>)}
                  <Vista style={[s.rejectSummaryGroup, s.rejectSummaryDivider]}>
                    <Vista style={[s.reviewDot, { backgroundColor: C.error }]} />
                    <Texto style={s.rejectSummaryTitle}>Rechazados · {rechazadoDocumentos.length}</Texto>
                  </Vista>
                  {rechazadoDocumentos.map((documento) => <Texto key={documento} style={s.rejectSummaryItem}>{documento}</Texto>)}
                </Vista> :
                <Vista>
                  {motivosRechazoRapidos.map((motivo) =>
                    <PulsableOpacidad
                      key={motivo}
                      style={[s.reasonOption, rechazoMotivo === motivo && s.reasonOptionActive]}
                      onPress={() => establecerRechazoMotivo(motivo)}
                      accessibilityRole="button">
                      <Texto style={[s.reasonOptionText, rechazoMotivo === motivo && s.reasonOptionTextActive]}>{motivo}</Texto>
                      {rechazoMotivo === motivo && <Comprobar size={18} color={C.primary} strokeWidth={2.2} />}
                    </PulsableOpacidad>
                  )}
                  <TextoEntrada
                    style={s.rejectInput}
                    placeholder="Otro motivo..."
                    placeholderTextColor={C.textMuted}
                    value={rechazoMotivo}
                    onChangeText={establecerRechazoMotivo}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top" />
                </Vista>}
            </DesplazableVista>
            <Vista style={s.rejectBtnsRow}>
              <PulsableOpacidad
                style={s.rejectCancelBtn}
                onPress={cerrarRechazo}>

                <Texto style={s.rejectCancelTxt}>Cancelar</Texto>
              </PulsableOpacidad>
              <PulsableOpacidad
                style={[s.rejectConfirmBtn, esEnviando && { opacity: 0.6 }]}
                onPress={rechazoPaso === 'resumen' ? () => establecerRechazoPaso('motivo') : manejarDecision}
                disabled={esEnviando}>

                {esEnviando ?
                <ActividadIndicador color={C.white} size="small" /> :

                <Texto style={s.rejectConfirmTxt}>{rechazoPaso === 'resumen' ? 'Continuar' : 'Rechazar'}</Texto>
                }
              </PulsableOpacidad>
            </Vista>
          </Vista>
          {aviso && rechazarModalVisible &&
            <Aviso key={aviso.id} message={aviso.mensaje} visible position="bottom" icon="!" iconCircle bottomOffset={10} fontWeight="700" textAlign="left" onHide={() => establecerAviso(null)} />}
        </Vista>
      </Modal>

      {/* ── Document Image Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={documentoImagenModal}
        animationType="fade"
        transparent
        onRequestClose={() => establecerDocumentoImagenModal(false)}>

        <Vista style={s.overlay}>
          <PulsableOpacidad
            style={EstiloHoja.absoluteFill}
            onPress={() => establecerDocumentoImagenModal(false)} />

          <Vista style={s.imgModal}>
            <Vista style={s.imgHeader}>
              <Vista style={s.imgHeaderSpacer} />
              <Texto style={s.imgTitle} numberOfLines={1}>{imagenTitulo}</Texto>
              <PulsableOpacidad
                style={s.imgCloseIcon}
                onPress={() => {
                  establecerDocumentoImagenModal(false);
                  establecerRealDocumentoClave(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar documento">
                <X size={23} color={C.text} strokeWidth={3} />
              </PulsableOpacidad>
            </Vista>
            {!documentoImagenUrl && <Texto style={{ color: C.textSub, marginBottom: 16 }}>Este documento no fue enviado. Puedes marcarlo como rechazado.</Texto>}
            {documentoImagenUrl && realDocumentoClave && ocrVistaPreviaDocumentos.has(realDocumentoClave) &&
            <Vista style={s.imgViewSwitch}>
                {(['original', 'ocr'] as const).map((vista) =>
              <PulsableOpacidad
                key={vista}
                style={[s.imgViewOption, documentoImagenVista === vista && s.imgViewOptionActive]}
                onPress={() => {establecerDocumentoImagenVista(vista);establecerDocumentoImagenError(false);}}>

                    <Texto style={[s.imgViewOptionText, documentoImagenVista === vista && s.imgViewOptionTextActive]}>
                      {vista === 'original' ? 'Original' : 'Vista OCR procesada'}
                    </Texto>
                  </PulsableOpacidad>
              )}
              </Vista>
            }
            {imagenFuente &&
              <PulsableOpacidad style={s.docImg} onPress={() => establecerImagenCompletaVisible(true)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Ver imagen en pantalla completa">
                <Imagen
                  key={`${realDocumentoClave}-${documentoImagenVista}`}
                  source={imagenFuente}
                  style={s.docImgInner}
                  resizeMode="contain"
                  onError={() => establecerDocumentoImagenError(true)}
                />
                <Texto style={s.zoomHint}>Toca para ampliar</Texto>
              </PulsableOpacidad>
            }
            {documentoImagenError &&
            <Texto style={{ color: C.error, textAlign: 'center', marginBottom: 16 }}>
                {documentoImagenVista === 'ocr' ?
              'No se pudo generar la imagen OCR. Puedes seguir viendo el original.' :
              'No se pudo cargar la imagen. Comprueba la conexión con el servidor y vuelve a abrir el documento.'}
              </Texto>
            }
            {datosExtraidosDocumento(realDocumentoClave).some(([, valor]) => !!valor) &&
              <Vista style={s.extractedData}>
                <Texto style={s.extractedTitle}>Datos extraídos</Texto>
                {datosExtraidosDocumento(realDocumentoClave).filter(([, valor]) => !!valor).map(([etiqueta, valor]) =>
                  <Vista key={etiqueta} style={s.extractedRow}>
                    <Texto style={s.extractedLabel}>{etiqueta}</Texto>
                    <Texto style={s.extractedValue} numberOfLines={2}>{valor}</Texto>
                  </Vista>
                )}
              </Vista>
            }
            {/* Si el doc está bloqueado (ya aprobado en versión anterior) solo mostrar info */}
            {realDocumentoClave && bloqueadoDocumentos.has(realDocumentoClave) ?
            <Vista
              style={[
              s.imgActions,
              { flexDirection: 'column', alignItems: 'center' }]
              }>

                <Vista
                style={[
                s.imgBtn,
                {
                  flex: undefined,
                  backgroundColor: C.successLight,
                  borderColor: C.successBorder,
                  width: '100%',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8
                }]
                }>

                  <Comprobar size={16} color={C.success} strokeWidth={2.5} />
                  <Texto style={[s.imgBtnTxt, { color: C.success }]}>
                    Ya aprobado en versión anterior
                  </Texto>
                </Vista>
              </Vista> :
            null}
            {realDocumentoClave && realDocumentoClave !== 'ciFront' && realDocumentoClave !== 'ciBack' && seleccionadoAplicacion?.status === 'pendiente' && !bloqueadoDocumentos.has(realDocumentoClave) &&
            <Vista style={s.imgActions}>
                <PulsableOpacidad
                style={[s.imgBtn, s.imgVerifyBtn]}
                disabled={!documentoImagenUrl || documentoImagenVista === 'original' && documentoImagenError}
                onPress={() => {
                  establecerDocumentoEstado((anterior) => ({ ...anterior, [realDocumentoClave]: 'verificado' }));
                  establecerDocumentoImagenModal(false);
                  establecerRealDocumentoClave(null);
                }}>

                  <Texto style={[s.imgBtnTxt, s.imgVerifyTxt]}>Aprobar</Texto>
                </PulsableOpacidad>
                <PulsableOpacidad
                style={[s.imgBtn, s.imgCorrectBtn]}
                onPress={() => {
                  establecerDocumentoEstado((anterior) => realDocumentoClave === 'licenseFront' || realDocumentoClave === 'licenseBack'
                    ? { ...anterior, licenseFront: 'rechazado', licenseBack: 'rechazado' }
                    : { ...anterior, [realDocumentoClave]: 'rechazado' });
                  establecerDocumentoImagenModal(false);
                  establecerRealDocumentoClave(null);
                }}>

                  <Texto style={s.imgBtnTxt}>Rechazar</Texto>
                </PulsableOpacidad>
              </Vista>
            }
          </Vista>
        </Vista>
      </Modal>
      <ZoomableDocumentModal
        visible={imagenCompletaVisible}
        source={imagenFuente}
        title={imagenTitulo}
        onClose={() => establecerImagenCompletaVisible(false)}
      />
      {aviso && !modalVisible && !rechazarModalVisible && !documentoImagenModal &&
        <Aviso key={aviso.id} message={aviso.mensaje} visible position="bottom" icon="!" iconCircle bottomOffset={10} fontWeight="700" textAlign="left" onHide={() => establecerAviso(null)} />}
    </SeguraZonaVista>);

};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = EstiloHoja.create({
  rejectionMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 16,
    padding: 16,
    marginTop: 6
  },
  rejectionMessageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: '#E11D2E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rejectionMessageIconText: { color: '#E11D2E', fontSize: 19, fontWeight: '800', includeFontPadding: false },
  rejectionMessageContent: { flex: 1 },
  rejectionMessageTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 },
  rejectionMessageText: { fontSize: 14, lineHeight: 20, color: C.textSub },
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.bg
  },
  closeBtn: { backgroundColor: C.white },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  headerAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },

  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'flex-end', paddingTop: 65, paddingRight: 20 },
  filterMenu: { width: 245, backgroundColor: C.white, borderRadius: 18, padding: 12, elevation: 8 },
  filterTitle: { fontSize: 13, fontWeight: '600', color: C.textMuted, paddingHorizontal: 12, paddingVertical: 10 },
  filterOption: { minHeight: 45, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10 },
  filterOptionActive: { backgroundColor: C.primaryLight },
  filterOptionText: { fontSize: 15, color: C.text },
  filterOptionTextActive: { color: C.primary, fontWeight: '700' },

  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },

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
    borderColor: C.errorBorder
  },
  errorTxt: { flex: 1, fontSize: 13, color: C.error, fontWeight: '600' },

  resultCount: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    overflow: 'hidden'
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cardIdentity: { flex: 1, minWidth: 0 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 5 },
  cardName: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardEmail: { fontSize: 13, color: C.textSub, marginBottom: 7 },
  cardVehicle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardVehicleText: { flex: 1, fontSize: 13, color: C.textSub, fontWeight: '500' },

  // Modal
  modalContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  modalHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 18,
    marginBottom: 14
  },
  heroInfo: { flex: 1 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDate: { fontSize: 12, color: C.textSub, marginTop: 4 },
  heroName: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.4,
    lineHeight: 24
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
    borderColor: C.warningBorder
  },
  resubSub: { fontSize: 12, color: C.warning },

  section: { marginBottom: 12, padding: 16, backgroundColor: C.surface, borderRadius: 18 },
  sectionToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, gap: 10 },
  sectionToggleText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  sectionBody: { paddingTop: 12 },
  documentLink: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 },
  documentLinkText: { fontSize: 13, fontWeight: '600', color: C.primary },
  documentStatusDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 2 },

  summaryBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  summaryItem: { fontSize: 12, color: C.textSub, marginBottom: 3 },
  reviewSummary: { backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 16 },
  reviewGroup: { paddingVertical: 13 },
  reviewGroupBorder: { borderTopWidth: 1, borderTopColor: C.border },
  reviewHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  reviewDot: { width: 8, height: 8, borderRadius: 4 },
  reviewHeadingText: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  reviewCount: { minWidth: 24, textAlign: 'center', fontSize: 12, fontWeight: '700', color: C.textSub, backgroundColor: C.surface, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  reviewItem: { fontSize: 13, color: C.textSub, lineHeight: 20, marginLeft: 16 },

  notesBox: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border
  },
  notesTxt: { fontSize: 13, color: C.text, lineHeight: 20 },

  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  approveBtn: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.text
  },
  actionTxt: { fontSize: 15, fontWeight: '700', color: C.white, textAlign: 'center' },

  // Overlay / modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },

  rejectModal: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%'
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginBottom: 5
  },
  rejectModalSub: { fontSize: 14, color: C.textSub, marginBottom: 16 },
  rejectContent: { flexGrow: 0, flexShrink: 1, marginBottom: 16 },
  rejectSummary: { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16, paddingBottom: 14 },
  rejectSummaryGroup: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 14, paddingBottom: 5 },
  rejectSummaryDivider: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12 },
  rejectSummaryTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  rejectSummaryItem: { fontSize: 13, color: C.textSub, marginLeft: 17, lineHeight: 20 },
  reasonOption: { minHeight: 46, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reasonOptionActive: { backgroundColor: C.primaryLight },
  reasonOptionText: { flex: 1, fontSize: 14, fontWeight: '500', color: C.text },
  reasonOptionTextActive: { color: C.primary, fontWeight: '700' },
  rejectInput: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: C.text,
    minHeight: 80,
    marginTop: 4
  },
  rejectBtnsRow: { flexDirection: 'row', gap: 12 },
  rejectCancelBtn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.text,
    alignItems: 'center'
  },
  rejectCancelTxt: { fontSize: 15, fontWeight: '700', color: C.text },
  rejectConfirmBtn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center'
  },
  rejectConfirmTxt: { fontSize: 15, fontWeight: '700', color: C.white },

  imgModal: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center'
  },
  imgHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  imgHeaderSpacer: { width: 36, height: 36 },
  imgTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },
  imgCloseIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  extractedData: { width: '100%', backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 12 },
  extractedTitle: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 5 },
  extractedRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 3 },
  extractedLabel: { fontSize: 12, color: C.textSub },
  extractedValue: { flex: 1, fontSize: 12, color: C.text, fontWeight: '600', textAlign: 'right' },
  imgViewSwitch: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 12 },
  imgViewOption: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 5, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  imgViewOptionActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  imgViewOptionText: { fontSize: 12, fontWeight: '700', color: C.textSub, textAlign: 'center' },
  imgViewOptionTextActive: { color: C.primary },
  docImg: { width: '100%', height: 250, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  docImgInner: { width: '100%', height: '100%' },
  zoomHint: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', color: C.white, fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  imgActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 10
  },
  imgBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5
  },
  imgVerifyBtn: { backgroundColor: C.primary, borderColor: C.primary },
  imgCorrectBtn: { backgroundColor: C.white, borderColor: C.text },
  imgBtnTxt: { fontSize: 15, fontWeight: '700', color: C.text },
  imgVerifyTxt: { color: C.white }
});

export default AdministradorConductorRegistroPantalla;
