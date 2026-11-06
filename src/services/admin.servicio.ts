import api from "./api.cliente";

interface Usuario {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'pasajero' | 'conductor' | 'administrador';
  createdAt?: string;
  rating?: number;
  photo?: string;
}

export interface DetalleAdministrativoUsuario {
  solicitudConductor: { id: string; status: string; version: number } | null;
  historial: { id: string; activo: boolean; motivo: string | null; fecha: string; administrador: string | null }[];
}

export const obtenerDetalleUsuario = (usuarioId: string) =>
  api.obtener<DetalleAdministrativoUsuario>(`/administracion/usuarios/${encodeURIComponent(usuarioId)}`);

export type EstadoConduccion = 'aprobado' | 'suspendido';

export interface ConductorOperativo {
  id: string;
  usuarioId: string;
  nombre: string;
  foto: string | null;
  correo: string | null;
  telefono: string | null;
  cuentaActiva: boolean;
  estado: EstadoConduccion;
  disponible: boolean;
  licencia: string | null;
  vencimientoLicencia: string | null;
  estadoLicencia: string;
  vehiculos: {
    id: string; plate: string; brand: string; model: string; year: number;
    color: string | null; vehicle_type: string; status: string;
    ruatVerified: boolean; ruatRequired: boolean; soatExpiryDate: string | null;
  }[];
}

export interface FichaConductorOperativo extends ConductorOperativo {
  saldoPendiente: number;
  comisiones: { id: string; periodo: string; vence: string | null; total: number; pagado: number; saldo: number; estado: string }[];
  historial: { id: string; estado: EstadoConduccion; motivo: string; fecha: string; administrador: string | null }[];
}

export const listarConductoresOperativos = (limit: number, offset: number, search: string, status?: EstadoConduccion) =>
  api.obtener<{ conductores: ConductorOperativo[]; total: number }>('/administracion/gestion-conductores', {
    params: { limit, offset, ...(search ? { search } : {}), ...(status ? { status } : {}) }
  });

export const obtenerFichaConductor = (id: string) =>
  api.obtener<FichaConductorOperativo>(`/administracion/gestion-conductores/${encodeURIComponent(id)}`);

export async function cambiarPermisoConductor(id: string, suspender: boolean, motivo: string) {
  try {
    return await api.put<{ driver: { status: EstadoConduccion; isAvailable: boolean } }>(
      `/administracion/gestion-conductores/${encodeURIComponent(id)}/suspension`, { suspend: suspender, motivo }
    );
  } catch (error) {
    const problema = error as { data?: { error?: string }; message?: string };
    throw new Error(problema?.data?.error || problema?.message || 'No se pudo cambiar el permiso de conducción.');
  }
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

interface ConductorApplication {
  id: string;
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
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  backgroundCheckDate: string;
  applicationDate: string;
  updatedAt?: string;
  status: 'pendiente' | 'observado' | 'aprobado' | 'rechazado';
  ocrProcessingStatus?: 'pendiente' | 'complete';
  identity?: IdentidadDetalles | null;
  rejectionReason?: string;
  verificationNotes: string;
  userId: string;
  driverRecordId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  currentRequest?: {
    id: string;
    version: number;
    status: string;
    rejectionReason?: string;
    files: Record<
      string,
      {
        filename: string;
        status: string;
        uploadedAt: string;
      }>;

    createdAt: string;
    updatedAt: string;
  };
  vehicle?: {
    id: string;
    /** Archivo RUAT. != null && !ruatVerified → en revisión. != null && ruatVerified → aprobado */
    ruatFile?: string;
    ruatFileUrl?: string;
    ruatVerified: boolean;
    ruatVerifiedAt?: string;
    ruatRequired: boolean;
    ruatRequiredReason?:
    'accidente' |
    'vehiculo_no_coincide' |
    'reactivacion_tras_suspension' |
    'antecedentes_penales';
    ruatRequiredAt?: string;
  };
  approvedDocuments?: Record<string, boolean>;
  documentStatus?: Record<string, 'pendiente' | 'aprobado'>;
}

interface PaginadaRespuesta<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Obtener todos los usuarios
 */
const obtenerTodosUsuarios = async (
limite: number = 20,
desplazamiento: number = 0,
buscar?: string,
rol?: string,
inactivo?: boolean)
: Promise<PaginadaRespuesta<Usuario>> => {
  try {
    const parametros: any = { limit: limite, offset: desplazamiento };
    if (buscar) parametros.search = buscar;
    if (rol) parametros.role = rol;
    if (inactivo) parametros.inactive = 'true';

    const respuesta: any = await api.obtener('/administracion/usuarios', { params: parametros });

    // Map backend user data to User interface
    const mapeadoUsuarios = (respuesta.users || []).map((usuario: any) => ({
      id: usuario.id,
      name: usuario.name || 'Sin nombre',
      email: usuario.email || '',
      phone: usuario.phone || '',
      role: usuario.role || 'pasajero',
      createdAt: usuario.createdAt,
      rating: usuario.rating || 0,
      photo: usuario.profilePhoto || usuario.photoURL || undefined
    }));

    return {
      data: mapeadoUsuarios,
      total: respuesta.total || 0,
      limit: respuesta.limit || limite,
      offset: respuesta.offset || desplazamiento
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Error al obtener usuarios');
  }
};

/**
 * Obtener todas las solicitudes de conductores pendientes
 */export { obtenerTodosUsuarios };
const obtenerPendienteConductorSolicitudes = async (
limite: number = 20,
desplazamiento: number = 0)
: Promise<PaginadaRespuesta<ConductorApplication>> => {
  try {
    const respuesta: any = await api.obtener('/administracion/conductores/pendientes', {
      params: { limit: limite, offset: desplazamiento }
    });
    // Backend retorna { drivers, total, limit, offset }
    return {
      data: respuesta.drivers || [],
      total: respuesta.total || 0,
      limit: respuesta.limit || limite,
      offset: respuesta.offset || desplazamiento
    };
  } catch (error) {
    console.error('Error fetching pending driver requests:', error);
    throw new Error('Error al obtener solicitudes de conductores');
  }
};

/**
 * Obtener todos los conductores con filtros opcionales
 */export { obtenerPendienteConductorSolicitudes };
const obtenerTodosConductores = async (
limite: number = 20,
desplazamiento: number = 0,
estado?: string,
buscar?: string,
usuarioId?: string)
: Promise<PaginadaRespuesta<ConductorApplication>> => {
  try {
    const parametros: any = { limit: limite, offset: desplazamiento };
    if (estado) parametros.status = estado;
    if (buscar) parametros.search = buscar;
    if (usuarioId) parametros.userId = usuarioId;

    const respuesta: any = await api.obtener('/administracion/conductores', { params: parametros });

    // Map backend request data to DriverApplication interface
    const mapeadoSolicitudes = (respuesta.requests || []).map((solicitud: any) => ({
      id: solicitud.id,
      name: solicitud.User?.name || 'Unknown',
      photo: solicitud.User?.profilePhoto || solicitud.User?.photoURL || '',
      email: solicitud.User?.email || '',
      phone: solicitud.User?.phone || '',
      licenseNumber: solicitud.metadata?.licenseNumber || '',
      licenseExpiryDate: solicitud.metadata?.licenseExpiryDate || '',
      licenseFrontOcr: solicitud.metadata?.ocr?.licenseFront?.fields || {},
      licenseBackOcr: solicitud.metadata?.ocr?.licenseBack?.fields || {},
      ruatOcr: solicitud.metadata?.ocr?.ruatPhoto?.fields || {},
      soatOcr: solicitud.metadata?.ocr?.soatPhoto?.fields || {},
      antecedentsOcr: solicitud.metadata?.ocr?.antecedentsPhoto?.fields || {},
      ticOcr: solicitud.metadata?.ocr?.ticPhoto?.fields || {},
      domicileProofOcr: solicitud.metadata?.ocr?.domicileProof?.fields || {},
      vehicleType: solicitud.metadata?.vehicleType || '',
      vehiclePlate: solicitud.metadata?.vehiclePlate || '',
      vehicleYear: solicitud.metadata?.vehicleYear || 0,
      vehicleBrand: solicitud.metadata?.vehicleBrand || '',
      vehicleModel: solicitud.metadata?.vehicleModel || '',
      vehicleColor: solicitud.metadata?.vehicleColor || '',
      vehiclePassengerCapacity: solicitud.metadata?.vehiclePassengerCapacity ?
      Number(solicitud.metadata.vehiclePassengerCapacity) :
      0,
      domicile: solicitud.domicile || null,
      documentsVerified:
      !!solicitud.files && Object.keys(solicitud.files).length > 0,
      backgroundCheckPassed: false,
      backgroundCheckDate: solicitud.updatedAt || '',
      applicationDate: solicitud.createdAt || '',
      updatedAt: solicitud.updatedAt || '',
      status: solicitud.status || 'pendiente',
      ocrProcessingStatus: solicitud.metadata?.ocrProcessingStatus || 'complete',
      rejectionReason: solicitud.rejectionReason || '',
      verificationNotes: '',
      userId: solicitud.userId,
      driverRecordId: solicitud.driver?.id || null,
      user: solicitud.User,
      identity: solicitud.identity || null,
      currentRequest: {
        id: solicitud.id,
        version: solicitud.version,
        status: solicitud.status,
        rejectionReason: solicitud.rejectionReason,
        files: solicitud.files || {},
        createdAt: solicitud.createdAt,
        updatedAt: solicitud.updatedAt
      },
      vehicle: solicitud.vehicle || null,
      documents: {},
      approvedDocuments: {},
      documentStatus: {}
    }));

    return {
      data: mapeadoSolicitudes,
      total: respuesta.total || 0,
      limit: respuesta.limit || limite,
      offset: respuesta.offset || desplazamiento
    };
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw new Error('Error al obtener conductores');
  }
};

/**
 * Obtener detalles de un conductor específico
 */export { obtenerTodosConductores };
const obtenerConductorPorId = async (
conductorId: string)
: Promise<ConductorApplication> => {
  try {
    const respuesta = await api.obtener(`/administracion/conductores/${conductorId}`);
    return (respuesta as any).driver as ConductorApplication;
  } catch (error) {
    console.error('Error fetching driver details:', error);
    throw new Error('Error al obtener detalles del conductor');
  }
};

/**
 * Aprobar una solicitud de conductor
 */export { obtenerConductorPorId };
const aprobarConductor = async (solicitudId: string, verificadoDocumentos: string[]): Promise<any> => {
  try {
    const respuesta = await api.put(`/administracion/solicitudes/${solicitudId}/aprobar`, { verifiedDocuments: verificadoDocumentos });
    return respuesta;
  } catch (error: any) {
    console.error('Error approving driver:', error);
    const errorMensaje = error?.data?.error || 'Error al aprobar el conductor';
    throw new Error(errorMensaje);
  }
};

/**
 * Rechazar una solicitud de conductor
 */export { aprobarConductor };
const rechazarConductor = async (
solicitudId: string,
motivo: string,
rechazadoDocumentos: string[] = [],
verificadoDocumentos: string[] = [])
: Promise<any> => {
  try {
    const respuesta = await api.put(`/administracion/solicitudes/${solicitudId}/rechazar`, {
      reason: motivo,
      rejectedDocuments: rechazadoDocumentos,
      verifiedDocuments: verificadoDocumentos
    });
    return respuesta;
  } catch (error: any) {
    console.error('Error rejecting driver:', error);
    const errorMensaje = error?.data?.error || 'Error al rechazar el conductor';
    throw new Error(errorMensaje);
  }
};export { rechazarConductor };

const observeConductor = async (
solicitudId: string,
motivo: string,
rechazadoDocumentos: string[],
verificadoDocumentos: string[])
: Promise<any> => {
  try {
    return await api.put(`/administracion/solicitudes/${solicitudId}/observar`, {
      reason: motivo, rejectedDocuments: rechazadoDocumentos, verifiedDocuments: verificadoDocumentos
    });
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al observar la solicitud');
  }
};

/**
 * Eliminar un conductor
 */export { observeConductor };
const eliminarConductor = async (conductorId: string): Promise<any> => {
  try {
    const respuesta = await api.eliminar(`/administracion/conductores/${conductorId}`);
    return respuesta;
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    const errorMensaje = error?.data?.error || 'Error al eliminar el conductor';
    throw new Error(errorMensaje);
  }
};

/**
 * Eliminar un usuario
 */export { eliminarConductor };
const eliminarUsuario = async (usuarioId: string, motivo: string): Promise<any> => {
  try {
    const respuesta = await api.eliminar(`/administracion/usuarios/${usuarioId}`, { body: JSON.stringify({ motivo }) });
    return respuesta;
  } catch (error: any) {
    console.error('Error deleting user:', error);
    const errorMensaje = error?.data?.error || 'Error al eliminar el usuario';
    throw new Error(errorMensaje);
  }
};

/**
 * Habilitar un usuario
 */export { eliminarUsuario };
const enableUsuario = async (usuarioId: string): Promise<any> => {
  try {
    const respuesta = await api.put(`/administracion/usuarios/${usuarioId}/habilitar`);
    return respuesta;
  } catch (error: any) {
    console.error('Error enabling user:', error);
    const errorMensaje = error?.data?.error || 'Error al habilitar el usuario';
    throw new Error(errorMensaje);
  }
};

/**
 * Get driver request status for current user (nuevo sistema versionado)
 */export { enableUsuario };
const obtenerMiSolicitudEstado = async (): Promise<{
  hasApplication: boolean;
  status?: 'pendiente' | 'observado' | 'aprobado' | 'rechazado' | null;
  request?: {
    id: string;
    version: number;
    status: string;
    rejectionReason?: string;
    rejectedDocuments?: string[];
    metadata?: Record<string, any>;
    documents?: Record<
      string,
      {
        filename: string;
        url: string;
        status: string;
        uploadedAt?: string;
      }>;

    createdAt?: string;
  };
}> => {
  try {
    const respuesta: any = await api.obtener('/solicitudes/estado');
    return respuesta;
  } catch (error: any) {
    console.error('Error getting request status:', error);
    // Retornar estado por defecto si no hay solicitud
    return { hasApplication: false, status: null };
  }
};

/**
 * Get driver status for current user
 */export { obtenerMiSolicitudEstado };
const obtenerMiConductorEstado = async (): Promise<{
  hasApplication: boolean;
  status?: 'pendiente' | 'observado' | 'aprobado' | 'rechazado' | null;
  driver?: any;
}> => {
  try {
    const respuesta: any = await api.obtener('/conductores/estado');
    return respuesta;
  } catch (error: any) {
    console.error('Error getting driver status:', error);
    throw new Error('Error al obtener estado de solicitud');
  }
};export { obtenerMiConductorEstado };

const requireRuatVerificacion = async (
conductorId: string,
motivo:
'accidente' |
'vehiculo_no_coincide' |
'reactivacion_tras_suspension' |
'antecedentes_penales',
suspender: boolean)
: Promise<any> => {
  try {
    const respuesta = await api.post(`/administracion/conductores/${conductorId}/requerir-ruat`, {
      reason: motivo,
      suspend: suspender
    });
    return respuesta;
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al requerir RUAT');
  }
};export { requireRuatVerificacion };

const aprobarVehiculoRuat = async (vehiculoId: string): Promise<any> => {
  try {
    const respuesta = await api.post(
      `/administracion/vehiculos/${vehiculoId}/aprobar-ruat`,
      {}
    );
    return respuesta;
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al aprobar RUAT');
  }
};export { aprobarVehiculoRuat };

const rechazarVehiculoRuat = async (
vehiculoId: string,
motivo: string)
: Promise<any> => {
  try {
    const respuesta = await api.post(
      `/administracion/vehiculos/${vehiculoId}/rechazar-ruat`,
      { reason: motivo }
    );
    return respuesta;
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al rechazar RUAT');
  }
};export { rechazarVehiculoRuat };

const alternarSuspenderConductor = async (
conductorId: string,
suspender: boolean)
: Promise<any> => {
  try {
    const respuesta = await api.put(`/administracion/conductores/${conductorId}/suspender`, {
      suspend: suspender
    });
    return respuesta;
  } catch (error: any) {
    throw new Error(
      error?.data?.error || 'Error al cambiar estado del conductor'
    );
  }
};export { alternarSuspenderConductor };

export default {
  getPendingDriverRequests: obtenerPendienteConductorSolicitudes,
  getAllDrivers: obtenerTodosConductores,
  getDriverById: obtenerConductorPorId,
  approveDriver: aprobarConductor,
  observeDriver: observeConductor,
  rejectDriver: rechazarConductor,
  getMyDriverStatus: obtenerMiConductorEstado,
  getMyRequestStatus: obtenerMiSolicitudEstado,
  requireRuatVerification: requireRuatVerificacion,
  approveVehicleRuat: aprobarVehiculoRuat,
  rejectVehicleRuat: rechazarVehiculoRuat,
  toggleSuspendDriver: alternarSuspenderConductor
};
