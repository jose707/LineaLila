// src/types/modelos.ts
import { LatLng as LatitudLongitud } from 'react-native-maps';

// ENUMS
export enum UsuarioRol {
  USUARIO = 'user',
  CONDUCTOR = 'conductor',
  ADMINISTRADOR = 'administrador',
}

export enum ConductorEstado {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  SUSPENDIDO = 'suspendido',
}

export enum ViajeEstado {
  PENDIENTE = 'pendiente',
  ACEPTADO = 'aceptado',
  EN_PROGRESO = 'en_curso',
  COMPLETADO = 'completado',
  CANCELADO = 'cancelado',
  DISPUTADO = 'disputed',
}

export enum PagoEstado {
  PENDIENTE = 'pendiente',
  COMPLETADO = 'completado',
  FALLIDO = 'fallido',
  REEMBOLSADO = 'reembolsado',
}

// BASE USER
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  telefonoVerificado?: boolean;
  documentosIdentidadEnviados?: boolean;
  motivoRechazoIdentidad?: string | null;
  estadoVerificacionIdentidad?: 'pendiente' | 'verificado' | 'rechazado';
  rol: UsuarioRol;
  roles?: UsuarioRol[];
  fotoPerfil?: string;
  urlFoto?: string;
  calificacion: number;
  calificacionConductor?: number;
  totalViajes?: number;
  totalViajesComoConductor?: number;
  modoActual?: 'pasajero' | 'conductor';
  createdAt: string;
  updatedAt: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleYear?: number;
  bankAccount?: string;
  driverVerified?: boolean;
  savedLocations?: GuardadoUbicacion[];
  preferredPaymentMethod?: string;
  emergencyContact?: string;
}

// DRIVER (extends User)
export interface Conductor extends Usuario {
  role: UsuarioRol.CONDUCTOR;
  licenseNumber: string;
  licenseExpiryDate: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  status: ConductorEstado;
  telefonoVerificado: boolean;
  bankAccount?: string;
  currentLocation?: LatitudLongitud;
  isOnline: boolean;
  totalEarnings: number;
}

// USUARIO (PASAJERO - denominación actualizada)
export interface Pasajero extends Usuario {
  role: UsuarioRol.USUARIO;
  savedLocations: GuardadoUbicacion[];
  preferredPaymentMethod: string;
  emergencyContact?: string;
}

// LOCATION
export interface Ubicacion {
  latitude: number;
  longitude: number;
  address: string;
}

export interface GuardadoUbicacion extends Ubicacion {
  id: string;
  label: string; // "Home", "Work", etc.
}

// RIDE
export interface Viaje {
  id: string;
  userId: string;
  driverId?: string;
  pickupLocation: Ubicacion;
  dropoffLocation: Ubicacion;
  waypoints?: Array<{
    id: string;
    sequence: number;
    location: {
      latitude: number;
      longitude: number;
    };
    address: string;
    arrivedAt?: string | null;
    departedAt?: string | null;
  }>;
  status: ViajeEstado;
  fare: number;
  distance: number; // en km
  duration: number; // en minutos
  scheduledTime?: string;
  requestedAt?: string;
  expiresAt?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  rating?: number;
  review?: string;
  counterOffers?: Array<{
    offerId: string;
    driverId: string;
    driverName: string;
    driverRating: number;
    driverPhone?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    licensePlate?: string;
    proposedPrice: number;
    offerType: 'aceptado' | 'counter_offer';
    createdAt: string;
    accepted: boolean;
    timeLeftInSeconds?: number;
    isExpired?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

// PAYMENT
export interface Pago {
  id: string;
  rideId: string;
  userId: string;
  amount: number;
  currency: string; // "BOB", "USD", etc.
  method: 'credit_card' | 'debit_card' | 'wallet' | 'efectivo';
  status: PagoEstado;
  transactionId?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// RATING/REVIEW
export interface Calificacion {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  score: number; // 1-5
  review?: string;
  categories?: CalificacionCategoria[];
  createdAt: string;
}

export interface CalificacionCategoria {
  name: string; // "safety", "cleanliness", "driving"
  score: number; // 1-5
}

// BANK ACCOUNT (para drivers)
export interface CuentaBancaria {
  id: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  routingNumber?: string;
  accountType: 'checking' | 'savings';
}

// SUPPORT TICKET
export interface SoporteComprobante {
  id: string;
  userId: string;
  category: 'lost_item' | 'safety' | 'pago' | 'driver_behavior' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  status: 'abierto' | 'en_curso' | 'resuelto' | 'closed';
  messages: ComprobanteMensaje[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ComprobanteMensaje {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  attachments?: string[]; // URLs
  createdAt: string;
}

// DRIVER APPLICATION
export interface ConductorApplication {
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
  backgroundCheckDate?: string;
  applicationDate: string;
  status: ConductorEstado;
  rejectionReason?: string;
  verificationNotes: string;
}

// ADMIN STATS
export interface AdminEstadisticas {
  totalUsers: number;
  totalRides: number;
  totalRevenue: number;
  pendingApprovals: number;
  supportTickets: number;
  dailyRides: number;
  monthlyRevenue: number;
  activeDrivers: number;
}

// RIDE ANALYTICS
export interface ViajeAnalitica {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  completionRate: number; // %
}

// USER ANALYTICS
export interface UsuarioAnalitica {
  totalUsers: number;
  growthRate: number; // %
  activeDrivers: number;
  activePassengers: number;
}
