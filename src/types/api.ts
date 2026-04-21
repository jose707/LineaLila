// src/types/api.ts
import { User, Ride, Payment } from './models';

// API RESPONSES
export interface ApiResponse<T> {
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

export interface CancellationReason {
  id: string;
  code: string;
  description: string;
  applicable_to: 'passenger' | 'driver' | 'both' | null;
  is_active: boolean;
}

// AUTH
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface SignupResponse {
  user: User;
  token: string;
}

// RIDES
export interface CreateRideRequest {
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
  vehicleTypeRequested?: string;
  paymentMethod?: string;
  scheduledTime?: string;
  notes?: string;
  fare?: number;
  distance?: number;
  duration?: number;
}

export interface UpdateRideRequest {
  status?: string;
  notes?: string;
  fare?: number;
  distance?: number;
  duration?: number;
}

export interface AcceptRideRequest {
  rideId: string;
}

export interface RejectRideRequest {
  rideId: string;
  reason?: string;
}

export interface CompleteRideRequest {
  rideId?: string;
  endLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  actualDistance?: number;
  actualDuration?: number;
}

export interface CancelRideRequest {
  rideId: string;
  reason?: string;
  cancellationReasonId?: string;
}

export interface RideDetailsResponse extends Ride {
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

export interface RideRequestsResponse {
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
  fare: number;
  distance: number;
  duration: number;
  createdAt: string;
}

export interface AvailableDriversResponse {
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

export interface RideEstimateResponse {
  distance: number;
  duration: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  currency: string;
}

export interface FareSettingsResponse {
  baseFare: number;
  farePerKm: number;
  farePerMinute: number;
  currency: string;
  zoneId?: string | null;
  zoneName?: string | null;
}

// PAYMENTS
export interface ProcessPaymentRequest {
  rideId: string;
  amount: number;
  method: string;
  tokenId?: string; // Stripe token
}

export interface ProcessPaymentResponse {
  paymentId: string;
  transactionId: string;
  status: string;
  receiptUrl: string;
}

// RATINGS
export interface SubmitRatingRequest {
  rideId: string;
  score: number;
  review?: string;
  categories?: Array<{ name: string; score: number }>;
}

// RIDE ACTIONS (Already defined above in new structure)

// DRIVER APPLICATION
export interface SubmitDriverApplicationRequest {
  licenseNumber: string;
  licenseExpiryDate: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  bankAccount?: string;
}

// PAGINATION
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}
