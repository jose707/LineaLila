// src/types/api.ts
import { Usuario, Viaje, Pago } from "./modelos";

// API RESPONSES
export interface ApiRespuesta<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CancelacionMotivo {
  id: string;
  code: string;
  description: string;
  applicable_to: 'pasajero' | 'conductor' | 'ambos' | null;
  is_active: boolean;
}

// AUTH
export interface IngresarSolicitud {
  email: string;
  password: string;
}

export interface IngresarRespuesta {
  token: string;
  refreshToken: string;
  user: Usuario;
  expiresIn: number;
}

export interface RegistrarseSolicitud {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrarseRespuesta {
  user: Usuario;
  token: string;
}

// RIDES
export interface CrearViajeSolicitud {
  requestMode?: 'negociacion' | 'asignacion_rapida';
  requestKey?: string;
  userId?: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  waypoints?: Array<{
    latitude: number;
    longitude: number;
    address: string;
  }>;
  vehicleTypeRequested?: string;
  paymentMethod?: string;
  scheduledTime?: string;
  notes?: string;
  fare?: number;
  distance?: number;
  duration?: number;
}

export interface ActualizarViajeSolicitud {
  status?: string;
  notes?: string;
  fare?: number;
  distance?: number;
  duration?: number;
}

export interface AceptarViajeSolicitud {
  rideId: string;
}

export interface RechazarViajeSolicitud {
  rideId: string;
  reason?: string;
}

export interface CompletarViajeSolicitud {
  rideId?: string;
  endLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  actualDistance?: number;
  actualDuration?: number;
}

export interface CancelarViajeSolicitud {
  rideId: string;
  reason?: string;
  cancellationReasonId?: string;
}

export interface ViajeDetallesRespuesta extends Viaje {
  driverDetails?: {
    id: string;
    name: string;
    rating: number;
    phone: string;
    vehicleInfo: string;
    licensePlate: string;
  };
  passengerDetails?: {
    id: string;
    name: string;
    rating: number;
    phone: string;
  };
  estimatedArrival?: number; // segundos
  paymentDetails?: {
    method: string;
    status: string;
    amount: number;
  };
}

export interface ViajeSolicitudesRespuesta {
  rideId: string;
  passengerName: string;
  passengerRating: number;
  passengerPhone: string;
  passengerProfilePhoto?: string | null;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  waypoints?: Array<{
    latitude: number;
    longitude: number;
    address: string;
    sequence: number;
  }>;
  fare: number;
  distance: number;
  duration: number;
  createdAt: string;
}

export interface DisponibleConductoresRespuesta {
  driverId: string;
  driverName: string;
  rating: number;
  distance: number; // distancia del conductor al pickup
  eta: number; // minutos estimados
  vehicleInfo: string;
  licensePlate: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
}

export interface ViajeEstimacionRespuesta {
  distance: number;
  duration: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  currency: string;
}

export interface TarifaAjustesRespuesta {
  baseFare: number;
  farePerKm: number;
  farePerMinute: number;
  currency: string;
  zoneId?: string | null;
  zoneName?: string | null;
}

// PAYMENTS
export interface ProcesarPagoSolicitud {
  rideId: string;
  amount: number;
  method: string;
  tokenId?: string; // Stripe token
}

export interface ProcesarPagoRespuesta {
  paymentId: string;
  transactionId: string;
  status: string;
  receiptUrl: string;
}

// RATINGS
export interface EnviarCalificacionSolicitud {
  rideId: string;
  score: number;
  review?: string;
  categories?: Array<{name: string;score: number;}>;
}

// RIDE ACTIONS (Already defined above in new structure)

// DRIVER APPLICATION
export interface EnviarConductorApplicationSolicitud {
  licenseNumber: string;
  licenseExpiryDate: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  bankAccount?: string;
}

// PAGINATION
export interface PaginadaRespuesta<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}
