// src/types/models.ts
import { LatLng } from 'react-native-maps';

// ENUMS
export enum UserRole {
  USER = 'user',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum DriverStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// BASE USER
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  roles?: UserRole[];
  profileImage?: string;
  profilePicture?: string;
  photoURL?: string;
  rating: number;
  totalRides: number;
  createdAt: string;
  updatedAt: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleYear?: number;
  bankAccount?: string;
  driverVerified?: boolean;
  savedLocations?: SavedLocation[];
  preferredPaymentMethod?: string;
  emergencyContact?: string;
}

// DRIVER (extends User)
export interface Driver extends User {
  role: UserRole.DRIVER;
  licenseNumber: string;
  licenseExpiryDate: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  status: DriverStatus;
  isVerified: boolean;
  bankAccount?: string;
  currentLocation?: LatLng;
  isOnline: boolean;
  totalEarnings: number;
}

// USUARIO (PASAJERO - denominación actualizada)
export interface Passenger extends User {
  role: UserRole.USER;
  savedLocations: SavedLocation[];
  preferredPaymentMethod: string;
  emergencyContact?: string;
}

// LOCATION
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface SavedLocation extends Location {
  id: string;
  label: string; // "Home", "Work", etc.
}

// RIDE
export interface Ride {
  id: string;
  userId: string;
  driverId?: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: RideStatus;
  fare: number;
  distance: number; // en km
  duration: number; // en minutos
  scheduledTime?: string;
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
    offerType: 'accepted' | 'counter_offer';
    createdAt: string;
    accepted: boolean;
    timeLeftInSeconds?: number;
    isExpired?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

// PAYMENT
export interface Payment {
  id: string;
  rideId: string;
  userId: string;
  amount: number;
  currency: string; // "BOB", "USD", etc.
  method: 'credit_card' | 'debit_card' | 'wallet' | 'cash';
  status: PaymentStatus;
  transactionId?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// RATING/REVIEW
export interface Rating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  score: number; // 1-5
  review?: string;
  categories?: RatingCategory[];
  createdAt: string;
}

export interface RatingCategory {
  name: string; // "safety", "cleanliness", "driving"
  score: number; // 1-5
}

// BANK ACCOUNT (para drivers)
export interface BankAccount {
  id: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  routingNumber?: string;
  accountType: 'checking' | 'savings';
}

// PROMO CODE
export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  minRideAmount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

// SUPPORT TICKET
export interface SupportTicket {
  id: string;
  userId: string;
  category: 'lost_item' | 'safety' | 'payment' | 'driver_behavior' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  attachments?: string[]; // URLs
  createdAt: string;
}

// DRIVER APPLICATION
export interface DriverApplication {
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
  status: DriverStatus;
  rejectionReason?: string;
  verificationNotes: string;
}

// ADMIN STATS
export interface AdminStats {
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
export interface RideAnalytics {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  completionRate: number; // %
}

// USER ANALYTICS
export interface UserAnalytics {
  totalUsers: number;
  growthRate: number; // %
  activeDrivers: number;
  activePassengers: number;
}
