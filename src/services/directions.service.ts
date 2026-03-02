// src/services/directions.service.ts
import { GOOGLE_MAPS_API_KEY } from '../config/constants';
import { cacheRouteService } from './cache.service';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface DirectionsResponse {
  routes: Array<{
    overview_polyline: {
      points: string;
    };
    legs: Array<{
      distance: {
        value: number;
        text: string;
      };
      duration: {
        value: number;
        text: string;
      };
    }>;
  }>;
}

/**
 * Decodificar polyline de Google Maps
 * Convierte la cadena comprimida a coordenadas
 */
const decodePolyline = (encoded: string): LatLng[] => {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;

    // Decodificar latitud
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    // Decodificar longitud
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

export const directionsService = {
  /**
   * Obtener ruta real entre dos puntos (con caché)
   * @param origin - Punto de origen {latitude, longitude}
   * @param destination - Punto de destino {latitude, longitude}
   * @returns Array de coordenadas que forman la ruta real
   */
  getRoute: async (origin: LatLng, destination: LatLng): Promise<LatLng[]> => {
    try {
      // 1️⃣ INTENTAR OBTENER DEL CACHÉ
      console.log('💾 [directionsService] Buscando en caché...');
      const cachedRoute = await cacheRouteService.getRoute(origin, destination);

      if (cachedRoute) {
        console.log(
          '✅ [directionsService] Ruta obtenida del caché con',
          cachedRoute.coordinates.length,
          'puntos',
        );
        return cachedRoute.coordinates;
      }

      // 2️⃣ SI NO ESTÁ EN CACHÉ, OBTENER DE GOOGLE MAPS
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn(
          '⚠️ [directionsService] Google Maps API key no configurada',
        );
        // Retornar línea recta como fallback
        return [origin, destination];
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=es`;

      console.log(
        '📍 [directionsService] Obteniendo ruta desde Google Maps API...',
      );

      const response = await fetch(url);
      const data: DirectionsResponse = await response.json();

      if (
        !data.routes ||
        data.routes.length === 0 ||
        !data.routes[0].overview_polyline
      ) {
        console.warn(
          '⚠️ [directionsService] No se encontró ruta en la respuesta',
        );
        return [origin, destination];
      }

      // Decodificar la ruta
      const polylinePoints = decodePolyline(
        data.routes[0].overview_polyline.points,
      );

      // 3️⃣ GUARDAR EN CACHÉ PARA PRÓXIMAS VECES
      await cacheRouteService.saveRoute(origin, destination, {
        coordinates: polylinePoints,
        distance: data.routes[0].legs[0]?.distance?.value || 0,
        duration: data.routes[0].legs[0]?.duration?.value || 0,
      });

      console.log(
        '✅ [directionsService] Ruta obtenida y guardada en caché con',
        polylinePoints.length,
        'puntos',
      );

      return polylinePoints;
    } catch (error) {
      console.error('❌ [directionsService] Error obteniendo ruta:', error);
      // Retornar línea recta como fallback
      return [origin, destination];
    }
  },
};
