// src/hooks/usarRides.ts
import { useState as usarEstado, useCallback as usarFuncionRetorno, useRef as usarReferencia, useEffect as usarEfecto } from 'react';
import { Alert } from 'react-native';
import { viajesServicio } from "../services/viajes.servicio";
import { Viaje, ViajeEstado } from "../types/modelos";
import {
  ViajeDetallesRespuesta,
  ViajeSolicitudesRespuesta,
  ViajeEstimacionRespuesta } from
'../types/api';

export interface UsarViajesEstado {
  ride: Viaje | null;
  rideDetails: ViajeDetallesRespuesta | null;
  activeRide: Viaje | null;
  rideRequests: ViajeSolicitudesRespuesta[];
  rideHistory: Viaje[];
  estimate: ViajeEstimacionRespuesta | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

export interface UsarViajesAcciones {
  crearViaje: (data: any) => Promise<Viaje | null>;
  obtenerViajePorId: (rideId: string) => Promise<ViajeDetallesRespuesta | null>;
  aceptarViaje: (rideId: string) => Promise<Viaje | null>;
  iniciarViaje: (rideId: string) => Promise<Viaje | null>;
  rechazarViaje: (rideId: string, reason?: string) => Promise<boolean>;
  completarViaje: (rideId: string, data: any) => Promise<Viaje | null>;
  cancelarViaje: (
  rideId: string,
  reason?: string,
  cancelledBy?: 'pasajero' | 'conductor' | 'sistema')
  => Promise<Viaje | null>;
  obtenerViajeActivo: () => Promise<Viaje | null>;
  obtenerSolicitudesViaje: () => Promise<ViajeSolicitudesRespuesta[]>;
  obtenerHistorialViajes: (
  userId: string,
  page?: number,
  limit?: number)
  => Promise<Viaje[]>;
  enviarCalificacion: (
  rideId: string,
  score: number,
  review?: string,
  categories?: any[])
  => Promise<boolean>;
  clearErrors: () => void;
  clearRide: () => void;
}

/**
 * Hook para manejar operaciones de viajes
 * Proporciona estado y métodos para crear, aceptar, completar y calificar viajes
 */
const usarViajes = (): UsarViajesEstado & UsarViajesAcciones => {
  const [estado, establecerEstado] = usarEstado<UsarViajesEstado>({
    ride: null,
    rideDetails: null,
    activeRide: null,
    rideRequests: [],
    rideHistory: [],
    estimate: null,
    isLoading: false,
    isError: false,
    error: null
  });

  // Flag para evitar setState después de desmontar
  const esMontadoReferencia = usarReferencia(true);

  usarEfecto(() => {
    return () => {
      esMontadoReferencia.current = false;
    };
  }, []);

  const establecerCargando = (esCargando: boolean) => {
    if (!esMontadoReferencia.current) return;
    establecerEstado((anterior) => ({ ...anterior, isLoading: esCargando }));
  };

  const establecerError = (error: string | null) => {
    if (!esMontadoReferencia.current) return;
    establecerEstado((anterior) => ({
      ...anterior,
      isError: !!error,
      error,
      isLoading: false
    }));
  };

  // ============================
  // CREAR VIAJE
  // ============================
  const crearViaje = usarFuncionRetorno(async (datos: any): Promise<Viaje | null> => {
    try {
      if (!esMontadoReferencia.current) return null;
      establecerCargando(true);
      const nuevoViaje = await viajesServicio.crearViaje(datos);
      if (!esMontadoReferencia.current) return nuevoViaje;
      establecerEstado((anterior) => ({ ...anterior, ride: nuevoViaje, isLoading: false }));
      return nuevoViaje;
    } catch (error: any) {
      if (!esMontadoReferencia.current) return null;
      const errorMensaje = error?.message || 'Error al crear el viaje';
      establecerError(errorMensaje);
      console.error('useRides - createRide error:', error);
      Alert.alert('Error', errorMensaje);
      return null;
    }
  }, []);

  // ============================
  // OBTENER DETALLES DEL VIAJE
  // ============================
  const obtenerViajePorId = usarFuncionRetorno(
    async (viajeId: string): Promise<ViajeDetallesRespuesta | null> => {
      try {
        if (!esMontadoReferencia.current) return null;
        establecerCargando(true);
        const detalles = await viajesServicio.obtenerViajePorId(viajeId);
        if (!esMontadoReferencia.current) return detalles;
        establecerEstado((anterior) => ({
          ...anterior,
          rideDetails: detalles,
          ride: detalles as Viaje,
          isLoading: false
        }));
        return detalles;
      } catch (error: any) {
        if (!esMontadoReferencia.current) return null;
        const errorMensaje =
        error?.message || 'Error al obtener detalles del viaje';
        establecerError(errorMensaje);
        console.error('useRides - getRideById error:', error);
        return null;
      }
    },
    []
  );

  // ============================
  // ACEPTAR VIAJE
  // ============================
  const aceptarViaje = usarFuncionRetorno(
    async (viajeId: string): Promise<Viaje | null> => {
      try {
        if (!esMontadoReferencia.current) return null;
        establecerCargando(true);
        const aceptadoViaje = await viajesServicio.aceptarViaje(viajeId);
        if (!esMontadoReferencia.current) return aceptadoViaje;
        establecerEstado((anterior) => ({
          ...anterior,
          ride: aceptadoViaje,
          activeRide: aceptadoViaje,
          isLoading: false
        }));
        return aceptadoViaje;
      } catch (error: any) {
        if (!esMontadoReferencia.current) return null;
        const errorMensaje = error?.message || 'Error al aceptar el viaje';
        establecerError(errorMensaje);
        console.error('useRides - acceptRide error:', error);
        Alert.alert('Error', errorMensaje);
        return null;
      }
    },
    []
  );

  // ============================
  // INICIAR VIAJE
  // ============================
  const inicioViaje = usarFuncionRetorno(
    async (viajeId: string): Promise<Viaje | null> => {
      try {
        if (!esMontadoReferencia.current) return null;
        establecerCargando(true);
        const iniciadoViaje = await viajesServicio.iniciarViaje(viajeId);
        if (!esMontadoReferencia.current) return iniciadoViaje;
        establecerEstado((anterior) => ({
          ...anterior,
          ride: iniciadoViaje,
          activeRide: iniciadoViaje,
          isLoading: false
        }));
        return iniciadoViaje;
      } catch (error: any) {
        if (!esMontadoReferencia.current) return null;
        const errorMensaje = error?.message || 'Error al iniciar el viaje';
        establecerError(errorMensaje);
        console.error('useRides - startRide error:', error);
        Alert.alert('Error', errorMensaje);
        return null;
      }
    },
    []
  );

  // ============================
  // RECHAZAR VIAJE
  // ============================
  const rechazarViaje = usarFuncionRetorno(
    async (viajeId: string, motivo?: string): Promise<boolean> => {
      try {
        establecerCargando(true);
        await viajesServicio.rechazarViaje(viajeId, motivo);
        // Remover de la lista de solicitudes
        establecerEstado((anterior) => ({
          ...anterior,
          rideRequests: anterior.rideRequests.filter((r) => r.rideId !== viajeId),
          isLoading: false
        }));
        return true;
      } catch (error: any) {
        const errorMensaje = error?.message || 'Error al rechazar el viaje';
        establecerError(errorMensaje);
        console.error('useRides - rejectRide error:', error);
        Alert.alert('Error', errorMensaje);
        return false;
      }
    },
    []
  );

  // ============================
  // COMPLETAR VIAJE
  // ============================
  const completarViaje = usarFuncionRetorno(
    async (viajeId: string, datos: any): Promise<Viaje | null> => {
      try {
        establecerCargando(true);
        const completadoViaje = await viajesServicio.completarViaje(viajeId, datos);
        establecerEstado((anterior) => ({
          ...anterior,
          ride: completadoViaje,
          activeRide: null,
          isLoading: false
        }));
        return completadoViaje;
      } catch (error: any) {
        const errorMensaje = error?.message || 'Error al completar el viaje';
        establecerError(errorMensaje);
        console.error('useRides - completeRide error:', error);
        Alert.alert('Error', errorMensaje);
        return null;
      }
    },
    []
  );

  // ============================
  // CANCELAR VIAJE
  // ============================
  const cancelarViaje = usarFuncionRetorno(
    async (
    viajeId: string,
    motivo?: string,
    canceladoPor?: 'pasajero' | 'conductor' | 'sistema')
    : Promise<Viaje | null> => {
      try {
        establecerCargando(true);
        const canceladoViaje = await viajesServicio.cancelarViaje(
          viajeId,
          motivo,
          canceladoPor
        );
        establecerEstado((anterior) => ({
          ...anterior,
          ride: canceladoViaje,
          activeRide: null,
          isLoading: false
        }));
        return canceladoViaje;
      } catch (error: any) {
        const errorMensaje = error?.message || 'Error al cancelar el viaje';
        establecerError(errorMensaje);
        console.error('useRides - cancelRide error:', error);
        Alert.alert('Error', errorMensaje);
        return null;
      }
    },
    []
  );

  // ============================
  // OBTENER VIAJE ACTIVO
  // ============================
  const obtenerActivoViaje = usarFuncionRetorno(async (): Promise<Viaje | null> => {
    try {
      if (!esMontadoReferencia.current) return null;
      establecerCargando(true);
      const activo = await viajesServicio.obtenerViajeActivo();
      if (!esMontadoReferencia.current) return activo;
      if (activo) {
        establecerEstado((anterior) => ({
          ...anterior,
          activeRide: activo,
          ride: activo,
          isLoading: false
        }));
      } else {
        establecerEstado((anterior) => ({
          ...anterior,
          activeRide: null,
          isLoading: false
        }));
      }
      return activo;
    } catch (error: any) {
      if (!esMontadoReferencia.current) return null;
      console.debug(
        'useRides - getActiveRide error (expected):',
        error?.message
      );
      establecerEstado((anterior) => ({ ...anterior, activeRide: null, isLoading: false }));
      return null;
    }
  }, []);

  // ============================
  // OBTENER SOLICITUDES DISPONIBLES
  // ============================
  const obtenerViajeSolicitudes = usarFuncionRetorno(async (): Promise<
    ViajeSolicitudesRespuesta[]> =>
  {
    try {
      if (!esMontadoReferencia.current) return [];
      establecerCargando(true);
      const solicitudes = await viajesServicio.obtenerSolicitudesViaje();
      if (!esMontadoReferencia.current) return solicitudes;
      establecerEstado((anterior) => ({
        ...anterior,
        rideRequests: solicitudes,
        isLoading: false
      }));
      return solicitudes;
    } catch (error: any) {
      if (!esMontadoReferencia.current) return [];

      // 🔥 Manejar AbortError silenciosamente
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        console.warn(
          '⏱️ [useRides] Timeout obteniendo solicitudes (reintentar)'
        );
        establecerError('Timeout al obtener solicitudes');
        throw error;
      }

      const esRojoError =
      error.message?.includes('Network request failed') ||
      error.message?.includes('Network Error') ||
      error.message?.includes('ECONNREFUSED') ||
      error.code === 'ECONNABORTED' ||
      error.code === 'NETWORK_ERROR' ||
      error.name === 'NetworkError';

      // Silenciosamente manejar errores de red sin alerta
      if (esRojoError) {
        console.warn('📡 [useRides] Error de red, reintentando automáticamente...');
        establecerCargando(false);
        throw error;
      }

      const errorMensaje = error?.message || 'Error al obtener solicitudes';
      establecerError(errorMensaje);
      console.error('useRides - getRideRequests error:', error);
      throw error;
    }
  }, []);

  // ============================
  // OBTENER HISTORIAL DE VIAJES
  // ============================
  const obtenerViajeHistorial = usarFuncionRetorno(
    async (
    usuarioId: string,
    pagina: number = 1,
    limite: number = 10)
    : Promise<Viaje[]> => {
      try {
        establecerCargando(true);
        const respuesta = await viajesServicio.obtenerHistorialViajes(usuarioId, pagina, limite);
        const viajes = respuesta.data || [];
        establecerEstado((anterior) => ({
          ...anterior,
          rideHistory: viajes,
          isLoading: false
        }));
        return viajes;
      } catch (error: any) {
        const errorMensaje = error?.message || 'Error al obtener historial';
        establecerError(errorMensaje);
        console.error('useRides - getRideHistory error:', error);
        return [];
      }
    },
    []
  );

  // ============================
  const enviarCalificacion = usarFuncionRetorno(
    async (
    viajeId: string,
    puntuacion: number,
    revision?: string,
    categorias?: any[])
    : Promise<boolean> => {
      try {
        establecerCargando(true);
        await viajesServicio.enviarCalificacion(viajeId, puntuacion, revision, categorias);
        establecerEstado((anterior) => ({
          ...anterior,
          isLoading: false
        }));
        return true;
      } catch (error: any) {
        const errorMensaje = error?.message || 'Error al enviar calificación';
        establecerError(errorMensaje);
        console.error('useRides - submitRating error:', error);
        Alert.alert('Error', errorMensaje);
        return false;
      }
    },
    []
  );

  // ============================
  // LIMPIAR ERRORES
  // ============================
  const limpiarErrores = usarFuncionRetorno(() => {
    establecerEstado((anterior) => ({ ...anterior, isError: false, error: null }));
  }, []);

  // ============================
  // LIMPIAR VIAJE ACTUAL
  // ============================
  const limpiarViaje = usarFuncionRetorno(() => {
    establecerEstado((anterior) => ({
      ...anterior,
      ride: null,
      rideDetails: null,
      activeRide: null
    }));
  }, []);

  return {
    // Estado
    ride: estado.ride,
    rideDetails: estado.rideDetails,
    activeRide: estado.activeRide,
    rideRequests: estado.rideRequests,
    rideHistory: estado.rideHistory,
    estimate: estado.estimate,
    isLoading: estado.isLoading,
    isError: estado.isError,
    error: estado.error,
    // Acciones
    crearViaje: crearViaje,
    obtenerViajePorId: obtenerViajePorId,
    aceptarViaje: aceptarViaje,
    iniciarViaje: inicioViaje,
    rechazarViaje: rechazarViaje,
    completarViaje: completarViaje,
    cancelarViaje: cancelarViaje,
    obtenerViajeActivo: obtenerActivoViaje,
    obtenerSolicitudesViaje: obtenerViajeSolicitudes,
    obtenerHistorialViajes: obtenerViajeHistorial,
    enviarCalificacion: enviarCalificacion,
    clearErrors: limpiarErrores,
    clearRide: limpiarViaje
  };
};export { usarViajes };

export default usarViajes;
