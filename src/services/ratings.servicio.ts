// src/services/ratings.servicio.ts
import api from "./api.cliente";

const calificacionesServicio = {
  // Create a new rating
  enviarCalificacion: async (
  viajeId: string,
  conductorId: string,
  pasajeroId: string,
  calificacion: number,
  comment?: string,
  raterTipo: 'pasajero' | 'conductor' = 'pasajero')
  : Promise<any> => {
    try {
      const respuesta = await api.post('/calificaciones', {
        rideId: viajeId,
        driverId: conductorId,
        passengerId: pasajeroId,
        rating: calificacion,
        comment: comment || null,
        raterType: raterTipo
      });
      return respuesta;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error submitting rating:', error);
      throw error;
    }
  },

  // Get ratings for a driver
  obtenerCalificacionesConductor: async (
  conductorId: string,
  limite = 10,
  desplazamiento = 0)
  : Promise<any> => {
    try {
      const respuesta = await api.obtener(`/calificaciones/conductor/${conductorId}`, {
        params: { limit: limite, offset: desplazamiento }
      });
      return respuesta;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error fetching ratings:', error);
      throw error;
    }
  },

  // Get driver's average rating
  obtenerPromedioCalificacionesConductor: async (conductorId: string): Promise<any> => {
    try {
      const respuesta = await api.obtener(`/calificaciones/conductor/${conductorId}/promedio`);
      return respuesta;
    } catch (error: any) {
      console.error(
        '❌ [ratingsService] Error fetching average rating:',
        error
      );
      throw error;
    }
  },

  // Get calculated rating for the authenticated user
  obtenerMiCalificacion: async (): Promise<{
    passengerRating: number;
    driverRating: number | null;
    driverId: string | null;
    passengerTrips: number;
    driverTrips: number;
  }> => {
    try {
      const respuesta: any = await api.obtener('/calificaciones/mias');
      return respuesta;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error fetching my rating:', error);
      return {
        passengerRating: 5,
        driverRating: null,
        driverId: null,
        passengerTrips: 0,
        driverTrips: 0
      };
    }
  },

  // Check if a ride already has a rating
  comprobarCalificacionExistente: async (viajeId: string): Promise<boolean> => {
    try {
      const respuesta: any = await api.obtener(`/calificaciones/viaje/${viajeId}/existe`);
      return respuesta.exists;
    } catch (error: any) {
      console.error('❌ [ratingsService] Error checking rating:', error);
      return false;
    }
  }
};export { calificacionesServicio };
