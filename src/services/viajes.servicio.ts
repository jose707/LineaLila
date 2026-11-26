// src/services/viajes.servicio.ts
import api from "./api.cliente";
import {
  CrearViajeSolicitud,
  ActualizarViajeSolicitud,
  CompletarViajeSolicitud,
  PaginadaRespuesta as PaginatedRespuesta,
  ViajeDetallesRespuesta,
  ViajeDetalleHistorial,
  ViajeSolicitudesRespuesta,
  CancelacionMotivo,
  TarifaAjustesRespuesta } from
'../types/api';
import { Viaje } from "../types/modelos";
import { RapidaAsignacionRespuesta as RapidoAsignacionRespuesta } from "../types/rapidaAsignacion";
import { desfaseRelojServidor as servidorRelojDesplazamiento } from "../utils/ofertaCountdown";
import { AlmacenamientoAuxiliar } from './storage';

type RolViaje = 'pasajero' | 'conductor';
const claveUltimoViaje = (usuarioId: string, rol: RolViaje) => `ultimoViaje:${usuarioId}:${rol}`;

const viajesServicio = {
  compartirUbicacion: (viajeId: string) =>
    api.post<{ruta: string}>(`/viajes/${encodeURIComponent(viajeId)}/compartir`, {}),
  registrarEmergencia: (idViaje: string, ubicacion?: {latitud: number; longitud: number}) =>
    api.post<{idAlerta: string; registradaEnCentral: boolean; contactos: {total: number; aceptados: number; fallidos: number}}>(`/viajes/${idViaje}/emergencia`, ubicacion ?? {}),
  obtenerMiEmergencia: (idViaje: string) =>
    api.obtener<{ idAlerta: string | null }>(`/viajes/${encodeURIComponent(idViaje)}/emergencia`),
  reservarAsignacionRapida: (datos: CrearViajeSolicitud): Promise<RapidoAsignacionRespuesta> =>
  api.post('/viajes/rapida/reservar', datos),
  obtenerAsignacionRapidaActual: (rol: 'pasajero' | 'conductor' = 'pasajero'): Promise<RapidoAsignacionRespuesta> =>
  api.obtener(`/viajes/rapida/actual?role=${rol}`),
  obtenerAsignacionRapida: (viajeId: string): Promise<RapidoAsignacionRespuesta> => api.obtener(`/viajes/${viajeId}/rapida`),
  confirmarAsignacionRapida: (viajeId: string): Promise<RapidoAsignacionRespuesta> => api.post(`/viajes/${viajeId}/rapida/confirmar`, {}),
  rechazarAsignacionRapida: (viajeId: string): Promise<RapidoAsignacionRespuesta> => api.post(`/viajes/` + viajeId + `/rapida/rechazar`, {}),
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

  obtenerDetalleHistorial: (viajeId: string) =>
    api.obtener<ViajeDetalleHistorial>(`/viajes/${encodeURIComponent(viajeId)}`, { params: { historial: 1 } }),

  obtenerRutaPrevia: (puntos: Array<{ latitude: number; longitude: number }>): Promise<{
    polyline: string; distance: number; duration: number;
  }> => api.post('/viajes/ruta-previa', { puntos }),

  obtenerRutaViaje: (viajeId: string, recalcular = false, haciaRecogida = false): Promise<{polyline: string; duration?: number | null; distance?: number}> =>
  api.obtener(`/viajes/${viajeId}/ruta${haciaRecogida ? '?recogida=1' : recalcular ? '?recalcular=1' : ''}`),

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
  limite: number = 10,
  { propagarError = false }: { propagarError?: boolean } = {})
  : Promise<any> => {
    try {
      const desplazamiento = (pagina - 1) * limite;
      const respuesta = await api.obtener<any>('/viajes/historial', {
        params: { limit: limite, offset: desplazamiento }
      });
      return respuesta;
    } catch (error: any) {
      if (propagarError) throw error;
      console.warn(
        '[getRideHistory] fallo al cargar historial:',
        error?.status ?? error?.message
      );
      return { rides: [], total: 0 };
    }
  },

  recordarViajeActivo: (usuarioId: string, rol: RolViaje, viajeId: string) => {
    AlmacenamientoAuxiliar.establecerElemento(claveUltimoViaje(usuarioId, rol), viajeId);
  },

  olvidarViajeActivo: (usuarioId: string, rol: RolViaje, viajeId: string) => {
    const clave = claveUltimoViaje(usuarioId, rol);
    if (AlmacenamientoAuxiliar.obtenerElemento(clave) === viajeId) AlmacenamientoAuxiliar.quitarElemento(clave);
  },

  obtenerViajeActivo: async (rol?: RolViaje, usuarioId?: string): Promise<Viaje | null> => {
    const clave = rol && usuarioId ? claveUltimoViaje(usuarioId, rol) : null;
    const ultimoViajeId = clave ? AlmacenamientoAuxiliar.obtenerElemento(clave) : null;
    try {
      const params = rol ? { role: rol, ...(ultimoViajeId ? { ultimoViajeId } : {}) } : undefined;
      const respuesta = await api.obtener<{ ride: Viaje | null }>('/viajes/activo', { params });
      if (!respuesta.ride && clave && ultimoViajeId && AlmacenamientoAuxiliar.obtenerElemento(clave) === ultimoViajeId) {
        AlmacenamientoAuxiliar.quitarElemento(clave);
      }
      return respuesta.ride ?? null;
    } catch (error: any) {
      if (error?.status === 404) return null;
      throw error;
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
