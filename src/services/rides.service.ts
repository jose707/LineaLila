// src/services/rides.service.ts
import api from './api.client';
import {
  CreateRideRequest,
  UpdateRideRequest,
  CompleteRideRequest,
  PaginatedResponse,
  RideDetailsResponse,
  RideRequestsResponse,
  CancellationReason,
  FareSettingsResponse,
} from '../types/api';
import { Ride } from '../types/models';
import { QuickAssignmentResponse } from '../types/quickAssignment';
import { serverClockOffset } from '../utils/offerCountdown';

export const ridesService = {
  reserveQuick: (data: CreateRideRequest): Promise<QuickAssignmentResponse> =>
    api.post('/rides/quick/reserve', data),
  currentQuick: (role: 'passenger' | 'driver' = 'passenger'): Promise<QuickAssignmentResponse> =>
    api.get(`/rides/quick/current?role=${role}`),
  getQuick: (rideId: string): Promise<QuickAssignmentResponse> => api.get(`/rides/${rideId}/quick`),
  confirmQuick: (rideId: string): Promise<QuickAssignmentResponse> => api.post(`/rides/${rideId}/quick/confirm`, {}),
  cancelQuick: (rideId: string): Promise<QuickAssignmentResponse> => api.post(`/rides/${rideId}/quick/cancel`, {}),
  // ============================
  // SOLICITUD DE VIAJES (CLIENT)
  // ============================

  createRide: async (data: CreateRideRequest): Promise<Ride> => {
    try {
      const response: any = await api.post<Ride>('/rides', data);
      return response.ride || response;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  },

  getRideById: async (rideId: string): Promise<RideDetailsResponse | null> => {
    try {
      const response: any = await api.get<RideDetailsResponse>(
        `/rides/${rideId}`,
      );
      return response.ride || response;
    } catch (error: any) {
      const status = error?.status;
      if (status !== 404 && status !== 410) {
        console.warn(
          '[getRideById] fallo transitorio (status:',
          status ?? 'red',
          ') — se reintentará en el próximo poll.',
        );
      }
      return null;
    }
  },

  getTripRoute: (rideId: string): Promise<{ polyline: string }> =>
    api.get(`/rides/${rideId}/route`),

  getFareSettings: async (lat?: number, lng?: number): Promise<FareSettingsResponse | null> => {
    try {
      const params: Record<string, number> = {};
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
      }
      const response = await api.get<FareSettingsResponse>('/rides/fares', {
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      return response;
    } catch (error) {
      console.error('Error fetching fare settings:', error);
      return null;
    }
  },

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

  // 🔵 CUANDO EL CONDUCTOR LLEGA AL PICKUP
  markAsArrived: async (rideId: string): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/arrived`, {});
      return response.ride || response;
    } catch (error) {
      console.error('Error marking ride as arrived:', error);
      throw error;
    }
  },

  // 🟢 MARCAR PASAJERO LISTO
  markPassengerReady: async (rideId: string): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(
        `/rides/${rideId}/passenger-ready`,
        {},
      );
      return response.ride || response;
    } catch (error) {
      console.error('Error marking passenger as ready:', error);
      throw error;
    }
  },

  // 🟢 INICIAR VIAJE
  startRide: async (rideId: string): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/start`, {});
      return response.ride || response;
    } catch (error) {
      console.error('Error starting ride:', error);
      throw error;
    }
  },

  // ============================
  // ACEPTACIÓN Y RECHAZO (DRIVER)
  // ============================

  acceptRide: async (rideId: string): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/accept`, {});
      return response.ride || response;
    } catch (error) {
      console.error('Error accepting ride:', error);
      throw error;
    }
  },

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

  getCancellationReasons: async (
    role?: 'passenger' | 'driver',
  ): Promise<CancellationReason[]> => {
    try {
      return await api.get<CancellationReason[]>(
        '/rides/cancellation-reasons',
        {
          params: role ? { role } : undefined,
        },
      );
    } catch (error) {
      console.error('Error fetching cancellation reasons:', error);
      throw error;
    }
  },

  cancelRide: async (
    rideId: string,
    reason?: string,
    cancelledBy?: 'passenger' | 'driver' | 'system',
    cancellationReasonId?: string,
  ): Promise<Ride> => {
    try {
      const response: any = await api.put<Ride>(`/rides/${rideId}/cancel`, {
        reason,
        cancelledBy: cancelledBy || 'system',
        cancellationReasonId,
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

  getRideHistory: async (
    _userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> => {
    try {
      const offset = (page - 1) * limit;
      const response = await api.get<any>('/rides/history', {
        params: { limit, offset },
      });
      return response;
    } catch (error: any) {
      console.warn(
        '[getRideHistory] fallo al cargar historial:',
        error?.status ?? error?.message,
      );
      return { rides: [], total: 0 };
    }
  },

  getActiveRide: async (): Promise<Ride | null> => {
    try {
      const response: any = await api.get<Ride>('/rides/my-active-ride');
      return response.ride || response || null;
    } catch (error) {
      console.debug('No active ride found');
      return null;
    }
  },

  getRideRequests: async (): Promise<RideRequestsResponse[]> => {
    try {
      const response = await api.get<RideRequestsResponse[]>('/rides/requests');
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        console.warn('⏱️ Timeout al obtener solicitudes de viaje (reintentar)');
        throw error;
      }
      const isNetworkError =
        error.message?.includes('Network request failed') ||
        error.message?.includes('Network Error') ||
        error.message?.includes('ECONNREFUSED') ||
        error.code === 'ECONNABORTED' ||
        error.code === 'NETWORK_ERROR';
      if (isNetworkError) {
        console.warn(
          '📡 Error de red al obtener solicitudes (reintentar):',
          error.message,
        );
        throw error;
      }
      console.error('Error fetching ride requests:', error);
      throw error;
    }
  },

  // ============================
  // CALIFICACIONES Y RESEÑAS
  // ============================

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
  // 💰 CONTRAOFERTAS (Counter Offers)
  // ============================

  submitCounterOffer: async (
    rideId: string,
    proposedPrice: number,
  ): Promise<any> => {
    try {
      const clientSentAt = Date.now();
      const response: any = await api.post(`/rides/${rideId}/counter-offer`, {
        proposedPrice,
      });
      const clientReceivedAt = Date.now();
      return response.offer
        ? {
            ...response.offer,
            serverOffsetMs: serverClockOffset(clientSentAt, clientReceivedAt, response.serverClock),
          }
        : response;
    } catch (error) {
      console.error('Error submitting counter offer:', error);
      throw error;
    }
  },

  getCounterOffers: async (rideId: string): Promise<{ offers: any[]; serverOffsetMs: number }> => {
    try {
      const clientSentAt = Date.now();
      const response: any = await api.get(`/rides/${rideId}/counter-offers`);
      const clientReceivedAt = Date.now();
      return {
        offers: Array.isArray(response) ? response : response.offers || [],
        serverOffsetMs: serverClockOffset(clientSentAt, clientReceivedAt, response.serverClock),
      };
    } catch (error: any) {
      const status = error?.status;
      if (status !== 404 && status !== 410) {
        console.warn(
          '[getCounterOffers] fallo transitorio (status:',
          status ?? 'red',
          ') — se reintentará en el próximo poll.',
        );
      }
      return { offers: [], serverOffsetMs: 0 };
    }
  },

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


};
