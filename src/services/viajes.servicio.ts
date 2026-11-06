// src/services/viajes.servicio.ts
import api from "./api.cliente";
import {
  CrearViajeSolicitud,
  ActualizarViajeSolicitud,
  CompletarViajeSolicitud,
  PaginadaRespuesta as PaginatedRespuesta,
  ViajeDetallesRespuesta,
  ViajeSolicitudesRespuesta,
  CancelacionMotivo,
  TarifaAjustesRespuesta } from
'../types/api';
import { Viaje } from "../types/modelos";
import { RapidaAsignacionRespuesta as RapidoAsignacionRespuesta } from "../types/rapidaAsignacion";
import { desfaseRelojServidor as servidorRelojDesplazamiento } from "../utils/ofertaCountdown";

const viajesServicio = {
  registrarEmergencia: (idViaje: string, ubicacion?: {latitud: number; longitud: number}) =>
    api.post<{idAlerta: string; registradaEnCentral: boolean; contactos: {total: number; aceptados: number; fallidos: number}}>(`/viajes/${idViaje}/emergencia`, ubicacion ?? {}),
  reservarAsignacionRapida: (datos: CrearViajeSolicitud): Promise<RapidoAsignacionRespuesta> =>
  api.post('/viajes/rapida/reservar', datos),
  obtenerAsignacionRapidaActual: (rol: 'pasajero' | 'conductor' = 'pasajero'): Promise<RapidoAsignacionRespuesta> =>
  api.obtener(`/viajes/rapida/actual?role=${rol}`),
  obtenerAsignacionRapida: (viajeId: string): Promise<RapidoAsignacionRespuesta> => api.obtener(`/viajes/${viajeId}/rapida`),
  confirmarAsignacionRapida: (viajeId: string): Promise<RapidoAsignacionRespuesta> => api.post(`/viajes/${viajeId}/rapida/confirmar`, {}),
  cancelarAsignacionRapida: (viajeId: string): Promise<RapidoAsignacionRespuesta> => api.post(`/viajes/${viajeId}/rapida/cancelar`, {}),
  // ============================
  // SOLICITUD DE VIAJES (CLIENT)
  // ============================

  crearViaje: async (datos: CrearViajeSolicitud): Promise<Viaje> => {
    try {
      const respuesta: any = await api.post<Viaje>('/viajes', datos);
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  },

  obtenerViajePorId: async (viajeId: string): Promise<ViajeDetallesRespuesta | null> => {
    try {
      const respuesta: any = await api.obtener<ViajeDetallesRespuesta>(
        `/viajes/${viajeId}`
      );
      return respuesta.ride || respuesta;
    } catch (error: any) {
      const estado = error?.status;
      if (estado !== 404 && estado !== 410) {
        console.warn(
          '[getRideById] fallo transitorio (status:',
          estado ?? 'red',
          ') — se reintentará en el próximo poll.'
        );
      }
      return null;
    }
  },

  obtenerRutaViaje: (viajeId: string): Promise<{polyline: string;}> =>
  api.obtener(`/viajes/${viajeId}/ruta`),

  obtenerConfiguracionTarifas: async (latitud?: number, longitud?: number): Promise<TarifaAjustesRespuesta | null> => {
    try {
      const parametros: Record<string, number> = {};
      if (latitud !== undefined && longitud !== undefined) {
        parametros.lat = latitud;
        parametros.lng = longitud;
      }
      const respuesta = await api.obtener<TarifaAjustesRespuesta>('/viajes/tarifas', {
        params: Object.keys(parametros).length > 0 ? parametros : undefined
      });
      return respuesta;
    } catch (error) {
      console.error('Error fetching fare settings:', error);
      return null;
    }
  },

  actualizarViaje: async (
  viajeId: string,
  datos: ActualizarViajeSolicitud)
  : Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(`/viajes/${viajeId}`, datos);
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error updating ride:', error);
      throw error;
    }
  },

  // 🔵 CUANDO EL CONDUCTOR LLEGA AL PICKUP
  marcarLlegada: async (viajeId: string): Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(`/viajes/${viajeId}/llegada`, {});
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error marking ride as arrived:', error);
      throw error;
    }
  },

  // 🟢 MARCAR PASAJERO LISTO
  marcarPasajeroListo: async (viajeId: string): Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(
        `/viajes/${viajeId}/pasajero-listo`,
        {}
      );
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error marking passenger as ready:', error);
      throw error;
    }
  },

  // 🟢 INICIAR VIAJE
  iniciarViaje: async (viajeId: string): Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(`/viajes/${viajeId}/iniciar`, {});
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error starting ride:', error);
      throw error;
    }
  },

  // ============================
  // ACEPTACIÓN Y RECHAZO (DRIVER)
  // ============================

  aceptarViaje: async (viajeId: string): Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(`/viajes/${viajeId}/aceptar`, {});
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error accepting ride:', error);
      throw error;
    }
  },

  rechazarViaje: async (viajeId: string, motivo?: string): Promise<void> => {
    try {
      await api.post(`/viajes/${viajeId}/rechazar`, { reason: motivo });
    } catch (error) {
      console.error('Error rejecting ride:', error);
      throw error;
    }
  },

  // ============================
  // FINALIZACIÓN Y CANCELACIÓN
  // ============================

  completarViaje: async (
  viajeId: string,
  datos: CompletarViajeSolicitud)
  : Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(
        `/viajes/${viajeId}/completar`,
        datos
      );
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error completing ride:', error);
      throw error;
    }
  },

  obtenerMotivosCancelacion: async (
  rol?: 'pasajero' | 'conductor')
  : Promise<CancelacionMotivo[]> => {
    try {
      return await api.obtener<CancelacionMotivo[]>(
        '/viajes/motivos-cancelacion',
        {
          params: rol ? { role: rol } : undefined
        }
      );
    } catch (error) {
      console.error('Error fetching cancellation reasons:', error);
      throw error;
    }
  },

  cancelarViaje: async (
  viajeId: string,
  motivo?: string,
  canceladoPor?: 'pasajero' | 'conductor' | 'sistema',
  cancelacionMotivoId?: string)
  : Promise<Viaje> => {
    try {
      const respuesta: any = await api.put<Viaje>(`/viajes/${viajeId}/cancelar`, {
        reason: motivo,
        cancelledBy: canceladoPor || 'sistema',
        cancellationReasonId: cancelacionMotivoId
      });
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  },

  // ============================
  // HISTORIAL Y LISTADOS
  // ============================

  obtenerHistorialViajes: async (
  _UsuarioId: string,
  pagina: number = 1,
  limite: number = 10)
  : Promise<any> => {
    try {
      const desplazamiento = (pagina - 1) * limite;
      const respuesta = await api.obtener<any>('/viajes/historial', {
        params: { limit: limite, offset: desplazamiento }
      });
      return respuesta;
    } catch (error: any) {
      console.warn(
        '[getRideHistory] fallo al cargar historial:',
        error?.status ?? error?.message
      );
      return { rides: [], total: 0 };
    }
  },

  obtenerViajeActivo: async (): Promise<Viaje | null> => {
    try {
      const respuesta: any = await api.obtener<Viaje>('/viajes/activo');
      return respuesta.ride || respuesta || null;
    } catch (error) {
      console.debug('No active ride found');
      return null;
    }
  },

  obtenerSolicitudesViaje: async (): Promise<ViajeSolicitudesRespuesta[]> => {
    try {
      const respuesta = await api.obtener<ViajeSolicitudesRespuesta[]>('/viajes/solicitudes');
      return respuesta;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        console.warn('⏱️ Timeout al obtener solicitudes de viaje (reintentar)');
        throw error;
      }
      const esRojoError =
      error.message?.includes('Network request failed') ||
      error.message?.includes('Network Error') ||
      error.message?.includes('ECONNREFUSED') ||
      error.code === 'ECONNABORTED' ||
      error.code === 'NETWORK_ERROR';
      if (esRojoError) {
        console.warn(
          '📡 Error de red al obtener solicitudes (reintentar):',
          error.message
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

  enviarCalificacion: async (
  viajeId: string,
  puntuacion: number,
  revision?: string,
  categorias?: Array<{name: string;score: number;}>)
  : Promise<any> => {
    try {
      const respuesta = await api.post(`/viajes/${viajeId}/calificacion`, {
        score: puntuacion,
        review: revision,
        categories: categorias
      });
      return respuesta;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  },

  // ============================
  // 💰 CONTRAOFERTAS (Counter Offers)
  // ============================

  enviarContraoferta: async (
  viajeId: string,
  propuestoPrecio: number)
  : Promise<any> => {
    try {
      const clienteEnviadoEn = Date.now();
      const respuesta: any = await api.post(`/viajes/${viajeId}/contraoferta`, {
        proposedPrice: propuestoPrecio
      });
      const clienteRecibidoEn = Date.now();
      return respuesta.offer ?
      {
        ...respuesta.offer,
        serverOffsetMs: servidorRelojDesplazamiento(clienteEnviadoEn, clienteRecibidoEn, respuesta.serverClock)
      } :
      respuesta;
    } catch (error) {
      console.error('Error submitting counter offer:', error);
      throw error;
    }
  },

  obtenerContraofertas: async (viajeId: string): Promise<{offers: any[];serverOffsetMs: number;}> => {
    try {
      const clienteEnviadoEn = Date.now();
      const respuesta: any = await api.obtener(`/viajes/${viajeId}/contraofertas`);
      const clienteRecibidoEn = Date.now();
      return {
        offers: Array.isArray(respuesta) ? respuesta : respuesta.offers || [],
        serverOffsetMs: servidorRelojDesplazamiento(clienteEnviadoEn, clienteRecibidoEn, respuesta.serverClock)
      };
    } catch (error: any) {
      const estado = error?.status;
      if (estado !== 404 && estado !== 410) {
        console.warn(
          '[getCounterOffers] fallo transitorio (status:',
          estado ?? 'red',
          ') — se reintentará en el próximo poll.'
        );
      }
      return { offers: [], serverOffsetMs: 0 };
    }
  },

  aceptarContraoferta: async (
  viajeId: string,
  ofertaId: string,
  finalPrecio: number)
  : Promise<any> => {
    try {
      const respuesta: any = await api.post(
        `/viajes/${viajeId}/aceptar-contraoferta`,
        {
          offerId: ofertaId,
          finalPrice: finalPrecio
        }
      );
      return respuesta.ride || respuesta;
    } catch (error) {
      console.error('Error accepting counter offer:', error);
      throw error;
    }
  },

  rechazarContraoferta: async (
  viajeId: string,
  ofertaId: string)
  : Promise<void> => {
    try {
      await api.post(`/viajes/${viajeId}/rechazar-contraoferta`, {
        offerId: ofertaId
      });
    } catch (error) {
      console.error('Error rejecting counter offer:', error);
      throw error;
    }
  }


};export { viajesServicio };
