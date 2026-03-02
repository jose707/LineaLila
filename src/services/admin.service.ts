import api from './api.client';

// API configuration
const API_BASE_URL = 'http://192.168.100.133:3000/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  createdAt?: string;
  rating?: number;
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
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  backgroundCheckDate: string;
  applicationDate: string;
  updatedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  verificationNotes: string;
  userId: string;
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
      licenseNumber: request.metadata?.ciNumber || '',
      licenseExpiryDate: '',
      vehicleType: request.metadata?.vehicleType || '',
      vehiclePlate: request.metadata?.vehiclePlate || '',
      vehicleYear: request.metadata?.vehicleYear || 0,
      documentsVerified:
        !!request.files && Object.keys(request.files).length > 0,
      backgroundCheckPassed: false,
      backgroundCheckDate: request.updatedAt || '',
      applicationDate: request.createdAt || '',
      updatedAt: request.updatedAt || '',
      status: request.status || 'pending',
      rejectionReason: request.rejectionReason || '',
      verificationNotes: '',
      userId: request.userId,
      user: request.User,
      currentRequest: {
        id: request.id,
        version: request.version,
        status: request.status,
        rejectionReason: request.rejectionReason,
        files: request.files || {},
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
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
export const approveDriver = async (requestId: string): Promise<any> => {
  try {
    const response = await api.put(`/admin/requests/${requestId}/approve`, {});
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
): Promise<any> => {
  try {
    const response = await api.put(`/admin/requests/${requestId}/reject`, {
      reason,
    });
    return response;
  } catch (error: any) {
    console.error('Error rejecting driver:', error);
    const errorMessage = error?.data?.error || 'Error al rechazar el conductor';
    throw new Error(errorMessage);
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
  status?: 'pending' | 'approved' | 'rejected' | null;
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
  status?: 'pending' | 'approved' | 'rejected' | null;
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

export default {
  getPendingDriverRequests,
  getAllDrivers,
  getDriverById,
  approveDriver,
  rejectDriver,
  getMyDriverStatus,
  getMyRequestStatus,
};
