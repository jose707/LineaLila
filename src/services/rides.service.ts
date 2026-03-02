// src/services/rides.service.ts
import api from './api.client';
import {
  CreateRideRequest,
  UpdateRideRequest,
  AcceptRideRequest,
  RejectRideRequest,
  CompleteRideRequest,
  CancelRideRequest,
  PaginatedResponse,
  RideDetailsResponse,
  RideRequestsResponse,
  AvailableDriversResponse,
  RideEstimateResponse,
} from '../types/api';
import { Ride } from '../types/models';

export const ridesService = {
  // ============================
  // SOLICITUD DE VIAJES (CLIENT)
  // ============================

  /**
   * Crear una nueva solicitud de viaje
   * @param data - Datos del viaje a crear
   * @returns Ride - Viaje creado
   */
  createRide: async (data: CreateRideRequest): Promise<Ride> => {
    try {
      const response: any = await api.post<Ride>('/rides', data);
      return response.ride || response;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  },

  /**
   * Obtener detalles completos de un viaje
   * @param rideId - ID del viaje
   * @returns RideDetailsResponse - Detalles del viaje con info de conductor y pasajero
   */
  getRideById: async (rideId: string): Promise<RideDetailsResponse> => {
    try {
      const response: any = await api.get<RideDetailsResponse>(
        `/rides/${rideId}`,
      );
      return response.ride || response;
    } catch (error) {
      console.error('Error fetching ride:', error);
      throw error;
    }
  },

  /**
   * Actualizar información del viaje
   * @param rideId - ID del viaje
   * @param data - Datos a actualizar
   * @returns Ride - Viaje actualizado
   */
  updateRide: async (
    rideId: string,
    data: UpdateRideRequest,
  ): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}`, data);
      return response.ride || response;
    } catch (error) {
      console.error('Error updating ride:', error);
      throw error;
    }
  },

  // ============================
  // ACEPTACIÓN Y RECHAZO (DRIVER)
  // ============================

  /**
   * Aceptar una solicitud de viaje (conductor)
   * @param rideId - ID del viaje
   * @returns Ride - Viaje actualizado
   */
  acceptRide: async (rideId: string): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/accept`, {});
      return response.ride || response;
    } catch (error) {
      console.error('Error accepting ride:', error);
      throw error;
    }
  },

  /**
   * Rechazar una solicitud de viaje (conductor)
   * @param rideId - ID del viaje
   * @param reason - Razón del rechazo (opcional)
   * @returns void
   */
  rejectRide: async (rideId: string, reason?: string): Promise<void> => {
    try {
      await api.post(`/rides/${rideId}/reject`, { reason });
    } catch (error) {
      console.error('Error rejecting ride:', error);
      throw error;
    }
  },

  // ============================
  // FINALIZACIÓN Y CANCELACIÓN
  // ============================

  /**
   * Iniciar un viaje en progreso (conductor)
   * Transición: accepted → in_progress
   * @param rideId - ID del viaje
   * @returns Ride - Viaje actualizado
   */
  startRide: async (rideId: string): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/start`, {});
      return response.ride || response;
    } catch (error) {
      console.error('Error starting ride:', error);
      throw error;
    }
  },

  /**
   * Completar un viaje
   * @param rideId - ID del viaje
   * @param data - Datos de finalización (ubicación, distancia, duración)
   * @returns Ride - Viaje completado
   */
  completeRide: async (
    rideId: string,
    data: CompleteRideRequest,
  ): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(
        `/rides/${rideId}/complete`,
        data,
      );
      return response.ride || response;
    } catch (error) {
      console.error('Error completing ride:', error);
      throw error;
    }
  },

  /**
   * Cancelar un viaje
   * @param rideId - ID del viaje
   * @param reason - Razón de la cancelación (opcional)
   * @param cancelledBy - Quién cancela: 'passenger' | 'driver' | 'system'
   * @returns Ride - Viaje cancelado
   */
  cancelRide: async (
    rideId: string,
    reason?: string,
    cancelledBy?: 'passenger' | 'driver' | 'system',
  ): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/cancel`, {
        reason,
        cancelledBy: cancelledBy || 'system',
      });
      return response.ride || response;
    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  },

  // ============================
  // HISTORIAL Y LISTADOS
  // ============================

  /**
   * Obtener el historial de viajes de un usuario
   * @param userId - ID del usuario
   * @param page - Número de página
   * @param limit - Cantidad de registros por página
   * @returns PaginatedResponse<Ride> - Viajes paginados
   */
  getRideHistory: async (
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Ride>> => {
    try {
      const response = await api.get<PaginatedResponse<Ride>>(
        `/users/${userId}/rides`,
        {
          params: { page, limit },
        },
      );
      return response;
    } catch (error) {
      console.error('Error fetching ride history:', error);
      throw error;
    }
  },

  /**
   * Obtener viajes activos del usuario actual
   * @returns Ride[] - Array de viajes activos
   */
  getActiveRides: async (): Promise<Ride[]> => {
    try {
      const response = await api.get<Ride[]>('/rides/active');
      return response;
    } catch (error) {
      console.error('Error fetching active rides:', error);
      throw error;
    }
  },

  /**
   * Obtener el viaje activo actual (si existe)
   * @returns Ride | null - Viaje activo o null
   */
  getActiveRide: async (): Promise<Ride | null> => {
    try {
      const response: any = await api.get<Ride>('/rides/my-active-ride');
      return response.ride || response || null;
    } catch (error) {
      console.debug('No active ride found');
      return null;
    }
  },

  /**
   * Obtener solicitudes de viajes disponibles para un conductor
   * @returns RideRequestsResponse[] - Solicitudes disponibles
   */
  getRideRequests: async (): Promise<RideRequestsResponse[]> => {
    try {
      const response = await api.get<RideRequestsResponse[]>('/rides/requests');
      return response;
    } catch (error) {
      console.error('Error fetching ride requests:', error);
      throw error;
    }
  },

  // ============================
  // UBICACIÓN Y DISPONIBILIDAD
  // ============================

  /**
   * Obtener conductores disponibles cercanos a una ubicación
   * @param latitude - Latitud de búsqueda
   * @param longitude - Longitud de búsqueda
   * @param radius - Radio de búsqueda en km (default: 5)
   * @returns AvailableDriversResponse[] - Conductores disponibles
   */
  getAvailableDrivers: async (
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<AvailableDriversResponse[]> => {
    try {
      const response = await api.get<AvailableDriversResponse[]>(
        '/drivers/available',
        {
          params: { latitude, longitude, radius },
        },
      );
      return response;
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      throw error;
    }
  },

  // ============================
  // ESTIMACIONES Y TARIFAS
  // ============================

  /**
   * Estimar el costo de un viaje
   * @param pickupLat - Latitud del pickup
   * @param pickupLon - Longitud del pickup
   * @param dropoffLat - Latitud del dropoff
   * @param dropoffLon - Longitud del dropoff
   * @returns RideEstimateResponse - Estimación de tarifa
   */
  estimateRideCost: async (
    pickupLat: number,
    pickupLon: number,
    dropoffLat: number,
    dropoffLon: number,
  ): Promise<RideEstimateResponse> => {
    try {
      const response: any = await api.post<RideEstimateResponse>(
        '/rides/estimate',
        {
          pickupLocation: { latitude: pickupLat, longitude: pickupLon },
          dropoffLocation: { latitude: dropoffLat, longitude: dropoffLon },
        },
      );
      return response.estimate || response;
    } catch (error) {
      console.error('Error estimating ride cost:', error);
      throw error;
    }
  },

  // ============================
  // CALIFICACIONES Y RESEÑAS
  // ============================

  /**
   * Enviar calificación y reseña para un viaje
   * @param rideId - ID del viaje
   * @param score - Puntuación 1-5
   * @param review - Reseña (opcional)
   * @param categories - Puntuaciones por categoría (opcional)
   * @returns any - Respuesta del servidor
   */
  submitRating: async (
    rideId: string,
    score: number,
    review?: string,
    categories?: Array<{ name: string; score: number }>,
  ): Promise<any> => {
    try {
      const response = await api.post(`/rides/${rideId}/rating`, {
        score,
        review,
        categories,
      });
      return response;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  },

  // ============================
  // BÚSQUEDA Y FILTRADO
  // ============================

  /**
   * Buscar viajes con filtros
   * @param filters - Filtros de búsqueda
   * @param page - Número de página
   * @param limit - Cantidad de registros
   * @returns PaginatedResponse<Ride> - Viajes filtrados
   */
  searchRides: async (
    filters: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      minFare?: number;
      maxFare?: number;
    },
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Ride>> => {
    try {
      const response = await api.get<PaginatedResponse<Ride>>('/rides/search', {
        params: { ...filters, page, limit },
      });
      return response;
    } catch (error) {
      console.error('Error searching rides:', error);
      throw error;
    }
  },

  // ============================
  // UTILIDADES
  // ============================

  /**
   * Obtener estadísticas de viajes del usuario
   * @returns any - Estadísticas de viajes
   */
  getRideStatistics: async (): Promise<any> => {
    try {
      const response = await api.get('/rides/statistics');
      return response;
    } catch (error) {
      console.error('Error fetching ride statistics:', error);
      throw error;
    }
  },

  // ============================
  // � CONTRAOFERTAS (Counter Offers)
  // ============================

  /**
   * Enviar una contraoferta para una solicitud de viaje (conductor)
   * @param rideId - ID del viaje
   * @param proposedPrice - Precio propuesto por el conductor
   * @returns any - Respuesta del servidor con la contraoferta creada
   */
  submitCounterOffer: async (
    rideId: string,
    proposedPrice: number,
  ): Promise<any> => {
    try {
      const response: any = await api.post(`/rides/${rideId}/counter-offer`, {
        proposedPrice,
      });
      return response.offer || response;
    } catch (error) {
      console.error('Error submitting counter offer:', error);
      throw error;
    }
  },

  /**
   * Obtener contraofertas activas para una solicitud (pasajero)
   * @param rideId - ID del viaje
   * @returns any[] - Array de contraofertas activas
   */
  getCounterOffers: async (rideId: string): Promise<any[]> => {
    try {
      const response: any = await api.get(`/rides/${rideId}/counter-offers`);
      return Array.isArray(response) ? response : response.offers || [];
    } catch (error) {
      console.error('Error fetching counter offers:', error);
      return [];
    }
  },

  /**
   * Aceptar una contraoferta (pasajero acepta la oferta del conductor)
   * @param rideId - ID del viaje
   * @param offerId - ID de la contraoferta
   * @param finalPrice - Precio aceptado
   * @returns any - Respuesta del servidor
   */
  acceptCounterOffer: async (
    rideId: string,
    offerId: string,
    finalPrice: number,
  ): Promise<any> => {
    try {
      const response: any = await api.post(
        `/rides/${rideId}/accept-counter-offer`,
        {
          offerId,
          finalPrice,
        },
      );
      return response.ride || response;
    } catch (error) {
      console.error('Error accepting counter offer:', error);
      throw error;
    }
  },

  /**
   * Rechazar una contraoferta (pasajero rechaza una oferta)
   * @param rideId - ID del viaje
   * @param offerId - ID de la contraoferta
   * @returns void
   */
  rejectCounterOffer: async (
    rideId: string,
    offerId: string,
  ): Promise<void> => {
    try {
      await api.post(`/rides/${rideId}/reject-counter-offer`, {
        offerId,
      });
    } catch (error) {
      console.error('Error rejecting counter offer:', error);
      throw error;
    }
  },

  // ============================
  // �📍 UBICACIÓN DEL CONDUCTOR
  // ============================

  /**
   * Actualizar ubicación del conductor en tiempo real
   * @param latitude - Latitud del conductor
   * @param longitude - Longitud del conductor
   * @returns any - Confirmación de actualización
   */
  updateDriverLocation: async (
    latitude: number,
    longitude: number,
  ): Promise<any> => {
    try {
      const response = await api.put('/drivers/location', {
        latitude,
        longitude,
      });
      return response;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  },
};
