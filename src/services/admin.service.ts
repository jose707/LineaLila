import api from './api.client';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  createdAt?: string;
  rating?: number;
}

interface LicenseOcrFields {
  licenseNumber?: string;
  fullName?: string;
  nationality?: string;
  issueDate?: string;
  licenseExpiryDate?: string;
  birthDate?: string;
  licenseCategory?: string;
}

interface IdentityDetails {
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

interface RuatOcrFields {
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

interface SoatOcrFields {
  soatRosetteNumber?: string;
  soatYear?: string;
  soatDepartment?: string;
  soatPlate?: string;
  soatVehicleType?: string;
  soatUse?: string;
  soatStartDate?: string;
  soatExpiryDate?: string;
}

interface AntecedentsOcrFields {
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

interface TicOcrFields {
  ticNumber?: string;
  issuingPlace?: string;
  firstNames?: string;
  surnames?: string;
  fullName?: string;
  licenseNumber?: string;
}

interface DomicileProofOcrFields {
  serviceAddress?: string;
  billingMonth?: string;
}

interface DriverApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  licenseFrontOcr?: LicenseOcrFields;
  licenseBackOcr?: LicenseOcrFields;
  ruatOcr?: RuatOcrFields;
  soatOcr?: SoatOcrFields;
  antecedentsOcr?: AntecedentsOcrFields;
  ticOcr?: TicOcrFields;
  domicileProofOcr?: DomicileProofOcrFields;
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
  status: 'pending' | 'observed' | 'approved' | 'rejected';
  ocrProcessingStatus?: 'pending' | 'complete';
  identity?: IdentityDetails | null;
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
      }
    >;
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
      | 'accident'
      | 'vehicle_mismatch'
      | 'suspension_reactivation'
      | 'criminal_record';
    ruatRequiredAt?: string;
  };
  approvedDocuments?: Record<string, boolean>;
  documentStatus?: Record<string, 'pending' | 'approved'>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Obtener todos los usuarios
 */
export const getAllUsers = async (
  limit: number = 20,
  offset: number = 0,
  search?: string,
  role?: string,
  inactive?: boolean,
): Promise<PaginatedResponse<User>> => {
  try {
    const params: any = { limit, offset };
    if (search) params.search = search;
    if (role) params.role = role;
    if (inactive) params.inactive = 'true';

    const response: any = await api.get('/admin/users', { params });

    // Map backend user data to User interface
    const mappedUsers = (response.users || []).map((user: any) => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'user',
      createdAt: user.createdAt,
      rating: user.rating || 0,
    }));

    return {
      data: mappedUsers,
      total: response.total || 0,
      limit: response.limit || limit,
      offset: response.offset || offset,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Error al obtener usuarios');
  }
};

/**
 * Obtener todas las solicitudes de conductores pendientes
 */
export const getPendingDriverRequests = async (
  limit: number = 20,
  offset: number = 0,
): Promise<PaginatedResponse<DriverApplication>> => {
  try {
    const response: any = await api.get('/admin/drivers/pending', {
      params: { limit, offset },
    });
    // Backend retorna { drivers, total, limit, offset }
    return {
      data: response.drivers || [],
      total: response.total || 0,
      limit: response.limit || limit,
      offset: response.offset || offset,
    };
  } catch (error) {
    console.error('Error fetching pending driver requests:', error);
    throw new Error('Error al obtener solicitudes de conductores');
  }
};

/**
 * Obtener todos los conductores con filtros opcionales
 */
export const getAllDrivers = async (
  limit: number = 20,
  offset: number = 0,
  status?: string,
  search?: string,
): Promise<PaginatedResponse<DriverApplication>> => {
  try {
    const params: any = { limit, offset };
    if (status) params.status = status;
    if (search) params.search = search;

    const response: any = await api.get('/admin/drivers', { params });

    // Map backend request data to DriverApplication interface
    const mappedRequests = (response.requests || []).map((request: any) => ({
      id: request.id,
      name: request.User?.name || 'Unknown',
      email: request.User?.email || '',
      phone: request.User?.phone || '',
      licenseNumber: request.metadata?.licenseNumber || '',
      licenseExpiryDate: request.metadata?.licenseExpiryDate || '',
      licenseFrontOcr: request.metadata?.ocr?.licenseFront?.fields || {},
      licenseBackOcr: request.metadata?.ocr?.licenseBack?.fields || {},
      ruatOcr: request.metadata?.ocr?.ruatPhoto?.fields || {},
      soatOcr: request.metadata?.ocr?.soatPhoto?.fields || {},
      antecedentsOcr: request.metadata?.ocr?.antecedentsPhoto?.fields || {},
      ticOcr: request.metadata?.ocr?.ticPhoto?.fields || {},
      domicileProofOcr: request.metadata?.ocr?.domicileProof?.fields || {},
      vehicleType: request.metadata?.vehicleType || '',
      vehiclePlate: request.metadata?.vehiclePlate || '',
      vehicleYear: request.metadata?.vehicleYear || 0,
      vehicleBrand: request.metadata?.vehicleBrand || '',
      vehicleModel: request.metadata?.vehicleModel || '',
      vehicleColor: request.metadata?.vehicleColor || '',
      vehiclePassengerCapacity: request.metadata?.vehiclePassengerCapacity
        ? Number(request.metadata.vehiclePassengerCapacity)
        : 0,
      domicile: request.domicile || null,
      documentsVerified:
        !!request.files && Object.keys(request.files).length > 0,
      backgroundCheckPassed: false,
      backgroundCheckDate: request.updatedAt || '',
      applicationDate: request.createdAt || '',
      updatedAt: request.updatedAt || '',
      status: request.status || 'pending',
      ocrProcessingStatus: request.metadata?.ocrProcessingStatus || 'complete',
      rejectionReason: request.rejectionReason || '',
      verificationNotes: '',
      userId: request.userId,
      driverRecordId: request.driver?.id || null,
      user: request.User,
      identity: request.identity || null,
      currentRequest: {
        id: request.id,
        version: request.version,
        status: request.status,
        rejectionReason: request.rejectionReason,
        files: request.files || {},
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
      vehicle: request.vehicle || null,
      documents: {},
      approvedDocuments: {},
      documentStatus: {},
    }));

    return {
      data: mappedRequests,
      total: response.total || 0,
      limit: response.limit || limit,
      offset: response.offset || offset,
    };
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw new Error('Error al obtener conductores');
  }
};

/**
 * Obtener detalles de un conductor específico
 */
export const getDriverById = async (
  driverId: string,
): Promise<DriverApplication> => {
  try {
    const response = await api.get(`/admin/drivers/${driverId}`);
    return (response as any).driver as DriverApplication;
  } catch (error) {
    console.error('Error fetching driver details:', error);
    throw new Error('Error al obtener detalles del conductor');
  }
};

/**
 * Aprobar una solicitud de conductor
 */
export const approveDriver = async (requestId: string, verifiedDocuments: string[]): Promise<any> => {
  try {
    const response = await api.put(`/admin/requests/${requestId}/approve`, { verifiedDocuments });
    return response;
  } catch (error: any) {
    console.error('Error approving driver:', error);
    const errorMessage = error?.data?.error || 'Error al aprobar el conductor';
    throw new Error(errorMessage);
  }
};

/**
 * Rechazar una solicitud de conductor
 */
export const rejectDriver = async (
  requestId: string,
  reason: string,
  rejectedDocuments: string[] = [],
  verifiedDocuments: string[] = [],
): Promise<any> => {
  try {
    const response = await api.put(`/admin/requests/${requestId}/reject`, {
      reason,
      rejectedDocuments,
      verifiedDocuments,
    });
    return response;
  } catch (error: any) {
    console.error('Error rejecting driver:', error);
    const errorMessage = error?.data?.error || 'Error al rechazar el conductor';
    throw new Error(errorMessage);
  }
};

export const observeDriver = async (
  requestId: string,
  reason: string,
  rejectedDocuments: string[],
  verifiedDocuments: string[],
): Promise<any> => {
  try {
    return await api.put(`/admin/requests/${requestId}/observe`, {
      reason, rejectedDocuments, verifiedDocuments,
    });
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al observar la solicitud');
  }
};

/**
 * Eliminar un conductor
 */
export const deleteDriver = async (driverId: string): Promise<any> => {
  try {
    const response = await api.delete(`/admin/drivers/${driverId}`);
    return response;
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    const errorMessage = error?.data?.error || 'Error al eliminar el conductor';
    throw new Error(errorMessage);
  }
};

/**
 * Eliminar un usuario
 */
export const deleteUser = async (userId: string): Promise<any> => {
  try {
    const response = await api.delete(`/admin/users/${userId}`);
    return response;
  } catch (error: any) {
    console.error('Error deleting user:', error);
    const errorMessage = error?.data?.error || 'Error al eliminar el usuario';
    throw new Error(errorMessage);
  }
};

/**
 * Habilitar un usuario
 */
export const enableUser = async (userId: string): Promise<any> => {
  try {
    const response = await api.put(`/admin/users/${userId}/enable`);
    return response;
  } catch (error: any) {
    console.error('Error enabling user:', error);
    const errorMessage = error?.data?.error || 'Error al habilitar el usuario';
    throw new Error(errorMessage);
  }
};

/**
 * Get driver request status for current user (nuevo sistema versionado)
 */
export const getMyRequestStatus = async (): Promise<{
  hasApplication: boolean;
  status?: 'pending' | 'observed' | 'approved' | 'rejected' | null;
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
      }
    >;
    createdAt?: string;
  };
}> => {
  try {
    const response: any = await api.get('/requests/status');
    return response;
  } catch (error: any) {
    console.error('Error getting request status:', error);
    // Retornar estado por defecto si no hay solicitud
    return { hasApplication: false, status: null };
  }
};

/**
 * Get driver status for current user
 */
export const getMyDriverStatus = async (): Promise<{
  hasApplication: boolean;
  status?: 'pending' | 'observed' | 'approved' | 'rejected' | null;
  driver?: any;
}> => {
  try {
    const response: any = await api.get('/drivers/status');
    return response;
  } catch (error: any) {
    console.error('Error getting driver status:', error);
    throw new Error('Error al obtener estado de solicitud');
  }
};

export const requireRuatVerification = async (
  driverId: string,
  reason:
    | 'accident'
    | 'vehicle_mismatch'
    | 'suspension_reactivation'
    | 'criminal_record',
  suspend: boolean,
): Promise<any> => {
  try {
    const response = await api.post(`/admin/drivers/${driverId}/require-ruat`, {
      reason,
      suspend,
    });
    return response;
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al requerir RUAT');
  }
};

export const approveVehicleRuat = async (vehicleId: string): Promise<any> => {
  try {
    const response = await api.post(
      `/admin/vehicles/${vehicleId}/approve-ruat`,
      {},
    );
    return response;
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al aprobar RUAT');
  }
};

export const rejectVehicleRuat = async (
  vehicleId: string,
  reason: string,
): Promise<any> => {
  try {
    const response = await api.post(
      `/admin/vehicles/${vehicleId}/reject-ruat`,
      { reason },
    );
    return response;
  } catch (error: any) {
    throw new Error(error?.data?.error || 'Error al rechazar RUAT');
  }
};

export const toggleSuspendDriver = async (
  driverId: string,
  suspend: boolean,
): Promise<any> => {
  try {
    const response = await api.put(`/admin/drivers/${driverId}/suspend`, {
      suspend,
    });
    return response;
  } catch (error: any) {
    throw new Error(
      error?.data?.error || 'Error al cambiar estado del conductor',
    );
  }
};

export default {
  getPendingDriverRequests,
  getAllDrivers,
  getDriverById,
  approveDriver,
  observeDriver,
  rejectDriver,
  getMyDriverStatus,
  getMyRequestStatus,
  requireRuatVerification,
  approveVehicleRuat,
  rejectVehicleRuat,
  toggleSuspendDriver,
};
