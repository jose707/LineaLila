// src/hooks/useRides.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { ridesService } from '../services/rides.service';
import { Ride, RideStatus } from '../types/models';
import {
  RideDetailsResponse,
  RideRequestsResponse,
  RideEstimateResponse,
} from '../types/api';

export interface UseRidesState {
  ride: Ride | null;
  rideDetails: RideDetailsResponse | null;
  activeRide: Ride | null;
  rideRequests: RideRequestsResponse[];
  rideHistory: Ride[];
  estimate: RideEstimateResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

export interface UseRidesActions {
  createRide: (data: any) => Promise<Ride | null>;
  getRideById: (rideId: string) => Promise<RideDetailsResponse | null>;
  acceptRide: (rideId: string) => Promise<Ride | null>;
  startRide: (rideId: string) => Promise<Ride | null>;
  rejectRide: (rideId: string, reason?: string) => Promise<boolean>;
  completeRide: (rideId: string, data: any) => Promise<Ride | null>;
  cancelRide: (
    rideId: string,
    reason?: string,
    cancelledBy?: 'passenger' | 'driver' | 'system',
  ) => Promise<Ride | null>;
  getActiveRide: () => Promise<Ride | null>;
  getRideRequests: () => Promise<RideRequestsResponse[]>;
  getRideHistory: (
    userId: string,
    page?: number,
    limit?: number,
  ) => Promise<Ride[]>;
  estimateCost: (
    pickupLat: number,
    pickupLon: number,
    dropoffLat: number,
    dropoffLon: number,
  ) => Promise<RideEstimateResponse | null>;
  submitRating: (
    rideId: string,
    score: number,
    review?: string,
    categories?: any[],
  ) => Promise<boolean>;
  clearErrors: () => void;
  clearRide: () => void;
}

/**
 * Hook para manejar operaciones de viajes
 * Proporciona estado y métodos para crear, aceptar, completar y calificar viajes
 */
export const useRides = (): UseRidesState & UseRidesActions => {
  const [state, setState] = useState<UseRidesState>({
    ride: null,
    rideDetails: null,
    activeRide: null,
    rideRequests: [],
    rideHistory: [],
    estimate: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  // Flag para evitar setState después de desmontar
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setLoading = (isLoading: boolean) => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, isLoading }));
  };

  const setError = (error: string | null) => {
    if (!isMountedRef.current) return;
    setState(prev => ({
      ...prev,
      isError: !!error,
      error,
      isLoading: false,
    }));
  };

  // ============================
  // CREAR VIAJE
  // ============================
  const createRide = useCallback(async (data: any): Promise<Ride | null> => {
    try {
      if (!isMountedRef.current) return null;
      setLoading(true);
      const newRide = await ridesService.createRide(data);
      if (!isMountedRef.current) return newRide;
      setState(prev => ({ ...prev, ride: newRide, isLoading: false }));
      return newRide;
    } catch (error: any) {
      if (!isMountedRef.current) return null;
      const errorMsg = error?.message || 'Error al crear el viaje';
      setError(errorMsg);
      console.error('useRides - createRide error:', error);
      Alert.alert('Error', errorMsg);
      return null;
    }
  }, []);

  // ============================
  // OBTENER DETALLES DEL VIAJE
  // ============================
  const getRideById = useCallback(
    async (rideId: string): Promise<RideDetailsResponse | null> => {
      try {
        if (!isMountedRef.current) return null;
        setLoading(true);
        const details = await ridesService.getRideById(rideId);
        if (!isMountedRef.current) return details;
        setState(prev => ({
          ...prev,
          rideDetails: details,
          ride: details as Ride,
          isLoading: false,
        }));
        return details;
      } catch (error: any) {
        if (!isMountedRef.current) return null;
        const errorMsg =
          error?.message || 'Error al obtener detalles del viaje';
        setError(errorMsg);
        console.error('useRides - getRideById error:', error);
        return null;
      }
    },
    [],
  );

  // ============================
  // ACEPTAR VIAJE
  // ============================
  const acceptRide = useCallback(
    async (rideId: string): Promise<Ride | null> => {
      try {
        if (!isMountedRef.current) return null;
        setLoading(true);
        const acceptedRide = await ridesService.acceptRide(rideId);
        if (!isMountedRef.current) return acceptedRide;
        setState(prev => ({
          ...prev,
          ride: acceptedRide,
          activeRide: acceptedRide,
          isLoading: false,
        }));
        return acceptedRide;
      } catch (error: any) {
        if (!isMountedRef.current) return null;
        const errorMsg = error?.message || 'Error al aceptar el viaje';
        setError(errorMsg);
        console.error('useRides - acceptRide error:', error);
        Alert.alert('Error', errorMsg);
        return null;
      }
    },
    [],
  );

  // ============================
  // INICIAR VIAJE
  // ============================
  const startRide = useCallback(
    async (rideId: string): Promise<Ride | null> => {
      try {
        if (!isMountedRef.current) return null;
        setLoading(true);
        const startedRide = await ridesService.startRide(rideId);
        if (!isMountedRef.current) return startedRide;
        setState(prev => ({
          ...prev,
          ride: startedRide,
          activeRide: startedRide,
          isLoading: false,
        }));
        return startedRide;
      } catch (error: any) {
        if (!isMountedRef.current) return null;
        const errorMsg = error?.message || 'Error al iniciar el viaje';
        setError(errorMsg);
        console.error('useRides - startRide error:', error);
        Alert.alert('Error', errorMsg);
        return null;
      }
    },
    [],
  );

  // ============================
  // RECHAZAR VIAJE
  // ============================
  const rejectRide = useCallback(
    async (rideId: string, reason?: string): Promise<boolean> => {
      try {
        setLoading(true);
        await ridesService.rejectRide(rideId, reason);
        // Remover de la lista de solicitudes
        setState(prev => ({
          ...prev,
          rideRequests: prev.rideRequests.filter(r => r.rideId !== rideId),
          isLoading: false,
        }));
        return true;
      } catch (error: any) {
        const errorMsg = error?.message || 'Error al rechazar el viaje';
        setError(errorMsg);
        console.error('useRides - rejectRide error:', error);
        Alert.alert('Error', errorMsg);
        return false;
      }
    },
    [],
  );

  // ============================
  // COMPLETAR VIAJE
  // ============================
  const completeRide = useCallback(
    async (rideId: string, data: any): Promise<Ride | null> => {
      try {
        setLoading(true);
        const completedRide = await ridesService.completeRide(rideId, data);
        setState(prev => ({
          ...prev,
          ride: completedRide,
          activeRide: null,
          isLoading: false,
        }));
        return completedRide;
      } catch (error: any) {
        const errorMsg = error?.message || 'Error al completar el viaje';
        setError(errorMsg);
        console.error('useRides - completeRide error:', error);
        Alert.alert('Error', errorMsg);
        return null;
      }
    },
    [],
  );

  // ============================
  // CANCELAR VIAJE
  // ============================
  const cancelRide = useCallback(
    async (
      rideId: string,
      reason?: string,
      cancelledBy?: 'passenger' | 'driver' | 'system',
    ): Promise<Ride | null> => {
      try {
        setLoading(true);
        const cancelledRide = await ridesService.cancelRide(
          rideId,
          reason,
          cancelledBy,
        );
        setState(prev => ({
          ...prev,
          ride: cancelledRide,
          activeRide: null,
          isLoading: false,
        }));
        return cancelledRide;
      } catch (error: any) {
        const errorMsg = error?.message || 'Error al cancelar el viaje';
        setError(errorMsg);
        console.error('useRides - cancelRide error:', error);
        Alert.alert('Error', errorMsg);
        return null;
      }
    },
    [],
  );

  // ============================
  // OBTENER VIAJE ACTIVO
  // ============================
  const getActiveRide = useCallback(async (): Promise<Ride | null> => {
    try {
      if (!isMountedRef.current) return null;
      setLoading(true);
      const active = await ridesService.getActiveRide();
      if (!isMountedRef.current) return active;
      if (active) {
        setState(prev => ({
          ...prev,
          activeRide: active,
          ride: active,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          activeRide: null,
          isLoading: false,
        }));
      }
      return active;
    } catch (error: any) {
      if (!isMountedRef.current) return null;
      console.debug(
        'useRides - getActiveRide error (expected):',
        error?.message,
      );
      setState(prev => ({ ...prev, activeRide: null, isLoading: false }));
      return null;
    }
  }, []);

  // ============================
  // OBTENER SOLICITUDES DISPONIBLES
  // ============================
  const getRideRequests = useCallback(async (): Promise<
    RideRequestsResponse[]
  > => {
    try {
      if (!isMountedRef.current) return [];
      setLoading(true);
      const requests = await ridesService.getRideRequests();
      if (!isMountedRef.current) return requests;
      setState(prev => ({
        ...prev,
        rideRequests: requests,
        isLoading: false,
      }));
      return requests;
    } catch (error: any) {
      if (!isMountedRef.current) return [];
      const errorMsg = error?.message || 'Error al obtener solicitudes';
      setError(errorMsg);
      console.error('useRides - getRideRequests error:', error);
      return [];
    }
  }, []);

  // ============================
  // OBTENER HISTORIAL DE VIAJES
  // ============================
  const getRideHistory = useCallback(
    async (
      userId: string,
      page: number = 1,
      limit: number = 10,
    ): Promise<Ride[]> => {
      try {
        setLoading(true);
        const response = await ridesService.getRideHistory(userId, page, limit);
        const rides = response.data || [];
        setState(prev => ({
          ...prev,
          rideHistory: rides,
          isLoading: false,
        }));
        return rides;
      } catch (error: any) {
        const errorMsg = error?.message || 'Error al obtener historial';
        setError(errorMsg);
        console.error('useRides - getRideHistory error:', error);
        return [];
      }
    },
    [],
  );

  // ============================
  // ESTIMAR COSTO DE VIAJE
  // ============================
  const estimateCost = useCallback(
    async (
      pickupLat: number,
      pickupLon: number,
      dropoffLat: number,
      dropoffLon: number,
    ): Promise<RideEstimateResponse | null> => {
      try {
        setLoading(true);
        const estimate = await ridesService.estimateRideCost(
          pickupLat,
          pickupLon,
          dropoffLat,
          dropoffLon,
        );
        setState(prev => ({
          ...prev,
          estimate,
          isLoading: false,
        }));
        return estimate;
      } catch (error: any) {
        const errorMsg = error?.message || 'Error al estimar tarifa';
        setError(errorMsg);
        console.error('useRides - estimateCost error:', error);
        return null;
      }
    },
    [],
  );

  // ============================
  // CALIFICAR Y RESEÑAR
  // ============================
  const submitRating = useCallback(
    async (
      rideId: string,
      score: number,
      review?: string,
      categories?: any[],
    ): Promise<boolean> => {
      try {
        setLoading(true);
        await ridesService.submitRating(rideId, score, review, categories);
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
        return true;
      } catch (error: any) {
        const errorMsg = error?.message || 'Error al enviar calificación';
        setError(errorMsg);
        console.error('useRides - submitRating error:', error);
        Alert.alert('Error', errorMsg);
        return false;
      }
    },
    [],
  );

  // ============================
  // LIMPIAR ERRORES
  // ============================
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, isError: false, error: null }));
  }, []);

  // ============================
  // LIMPIAR VIAJE ACTUAL
  // ============================
  const clearRide = useCallback(() => {
    setState(prev => ({
      ...prev,
      ride: null,
      rideDetails: null,
      activeRide: null,
    }));
  }, []);

  return {
    // Estado
    ride: state.ride,
    rideDetails: state.rideDetails,
    activeRide: state.activeRide,
    rideRequests: state.rideRequests,
    rideHistory: state.rideHistory,
    estimate: state.estimate,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
    // Acciones
    createRide,
    getRideById,
    acceptRide,
    startRide,
    rejectRide,
    completeRide,
    cancelRide,
    getActiveRide,
    getRideRequests,
    getRideHistory,
    estimateCost,
    submitRating,
    clearErrors,
    clearRide,
  };
};

export default useRides;
