// src/utils/rideValidation.ts
/**
 * Utilidades de validación para operaciones de viajes
 */

import { Ride, RideStatus, Location } from '../types/models';
import {
  CreateRideRequest,
  CompleteRideRequest,
  RideEstimateResponse,
} from '../types/api';

/**
 * Validar que una ubicación sea válida
 */
export const isValidLocation = (location: any): location is Location => {
  return (
    typeof location === 'object' &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    typeof location.address === 'string' &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180 &&
    location.address.trim().length > 0
  );
};

/**
 * Validar solicitud de creación de viaje
 */
export const isValidCreateRideRequest = (
  data: any,
): data is CreateRideRequest => {
  return (
    isValidLocation(data?.pickupLocation) &&
    isValidLocation(data?.dropoffLocation) &&
    typeof data.pickupLocation.address === 'string' &&
    typeof data.dropoffLocation.address === 'string'
  );
};

/**
 * Validar solicitud de completación de viaje
 */
export const isValidCompleteRideRequest = (
  data: any,
): data is CompleteRideRequest => {
  if (!data) return false;

  // Si incluye ubicación final, debe ser válida
  if (data.endLocation && !isValidLocation(data.endLocation)) {
    return false;
  }

  // Si incluye distancia, debe ser número positivo
  if (
    data.actualDistance !== undefined &&
    typeof data.actualDistance !== 'number'
  ) {
    return false;
  }

  // Si incluye duración, debe ser número positivo
  if (
    data.actualDuration !== undefined &&
    typeof data.actualDuration !== 'number'
  ) {
    return false;
  }

  return true;
};

/**
 * Validar que dos ubicaciones sean diferentes
 */
export const areLocationsDifferent = (
  pickup: Location,
  dropoff: Location,
): boolean => {
  const latDiff = Math.abs(pickup.latitude - dropoff.latitude);
  const lonDiff = Math.abs(pickup.longitude - dropoff.longitude);
  // Diferencia mínima de 0.001 grados (aproximadamente 100 metros)
  return latDiff > 0.001 || lonDiff > 0.001;
};

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Radio de la tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convertir grados a radianes
 */
const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Formatear distancia para mostrar
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Formatear duración para mostrar
 */
export const formatDuration = (durationMinutes: number): string => {
  if (durationMinutes < 60) {
    return `${Math.round(durationMinutes)} min`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = Math.round(durationMinutes % 60);
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
};

/**
 * Formatear tarifa para mostrar
 */
export const formatFare = (fare: number, currency: string = 'BOB'): string => {
  return `${fare.toFixed(2)} ${currency}`;
};

/**
 * Validar rango de puntuación
 */
export const isValidRating = (score: number): boolean => {
  return (
    typeof score === 'number' &&
    score >= 1 &&
    score <= 5 &&
    Number.isInteger(score)
  );
};

/**
 * Obtener color según estado del viaje
 */
export const getRideStatusColor = (status: RideStatus): string => {
  switch (status) {
    case 'pending':
      return '#FFA500'; // Naranja
    case 'accepted':
      return '#4169E1'; // Azul
    case 'in_progress':
      return '#1E90FF'; // Azul claro
    case 'completed':
      return '#32CD32'; // Verde
    case 'cancelled':
      return '#FF6347'; // Rojo
    case 'disputed':
      return '#FF1493'; // Rosa
    default:
      return '#808080'; // Gris
  }
};

/**
 * Obtener etiqueta en español del estado del viaje
 */
export const getRideStatusLabel = (status: RideStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'accepted':
      return 'Aceptado';
    case 'in_progress':
      return 'En progreso';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    case 'disputed':
      return 'En disputa';
    default:
      return 'Desconocido';
  }
};

/**
 * Validar que el viaje puede ser aceptado
 */
export const canAcceptRide = (ride: Ride): boolean => {
  return ride.status === 'pending';
};

/**
 * Validar que el viaje puede ser rechazado
 */
export const canRejectRide = (ride: Ride): boolean => {
  return ride.status === 'pending';
};

/**
 * Validar que el viaje puede ser completado
 */
export const canCompleteRide = (ride: Ride): boolean => {
  return ride.status === 'in_progress';
};

/**
 * Validar que el viaje puede ser cancelado
 */
export const canCancelRide = (ride: Ride): boolean => {
  return (
    ride.status === 'pending' ||
    ride.status === 'accepted' ||
    ride.status === 'in_progress'
  );
};

/**
 * Calcular tarifa basada en distancia y duración
 */
export const calculateEstimatedFare = (
  distanceKm: number,
  durationMinutes: number,
  baseFare: number = 5,
  costPerKm: number = 1.5,
  costPerMinute: number = 0.25,
): number => {
  const distanceFare = distanceKm * costPerKm;
  const timeFare = durationMinutes * costPerMinute;
  return Math.max(baseFare, baseFare + distanceFare + timeFare);
};

/**
 * Validar que el viaje tiene datos suficientes para completarse
 */
export const hasCompleteRideData = (ride: Ride | null): boolean => {
  if (!ride) return false;

  return (
    !!ride.id &&
    !!ride.userId &&
    !!ride.pickupLocation &&
    !!ride.dropoffLocation &&
    !!ride.fare &&
    ride.distance > 0 &&
    ride.duration > 0
  );
};

/**
 * Calcular tiempo restante estimado
 */
export const calculateRemainingTime = (
  currentDurationMinutes: number,
  totalDurationMinutes: number,
): number => {
  return Math.max(0, totalDurationMinutes - currentDurationMinutes);
};

/**
 * Verificar si un viaje es antiguo (completado hace más de X días)
 */
export const isOldRide = (ride: Ride, daysThreshold: number = 30): boolean => {
  if (ride.status !== 'completed') return false;

  const completedDate = new Date(ride.endTime || ride.updatedAt);
  const now = new Date();
  const daysDiff =
    (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff > daysThreshold;
};

/**
 * Obtener información de seguridad para el viaje
 */
export const getRideSafetyInfo = (
  ride: Ride,
): { isSafe: boolean; message: string } => {
  // Un viaje es considerado seguro si:
  // - Tiene conductor asignado (aceptado)
  // - No está cancelado o en disputa
  const isSafe =
    (ride.status === 'accepted' ||
      ride.status === 'in_progress' ||
      ride.status === 'completed') &&
    !!ride.driverId;

  const message = isSafe ? 'Viaje verificado' : 'Viaje no verificado';

  return { isSafe, message };
};

export default {
  isValidLocation,
  isValidCreateRideRequest,
  isValidCompleteRideRequest,
  areLocationsDifferent,
  calculateDistance,
  formatDistance,
  formatDuration,
  formatFare,
  isValidRating,
  getRideStatusColor,
  getRideStatusLabel,
  canAcceptRide,
  canRejectRide,
  canCompleteRide,
  canCancelRide,
  calculateEstimatedFare,
  hasCompleteRideData,
  calculateRemainingTime,
  isOldRide,
  getRideSafetyInfo,
};
