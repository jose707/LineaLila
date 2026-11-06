// src/services/directions.servicio.ts
import { GOOGLE_MAPS_API_CLAVE } from "../config/constantes";
import { cacheRutaServicio } from "./cache.servicio";

interface LatitudLongitud {
  latitude: number;
  longitude: number;
}

interface DirectionsRespuesta {
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
const decodificarPolilinea = (encoded: string): LatitudLongitud[] => {
  const puntos: LatitudLongitud[] = [];
  let indice = 0;
  let latitud = 0;
  let longitud = 0;

  while (indice < encoded.length) {
    let resultado = 0;
    let shift = 0;

    // Decodificar latitud
    let byte = 0;
    do {
      byte = encoded.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitud += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    // Decodificar longitud
    resultado = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitud += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    puntos.push({
      latitude: latitud / 1e5,
      longitude: longitud / 1e5
    });
  }

  return puntos;
};

const directionsServicio = {
  /**
   * Obtener ruta real entre dos puntos (con caché)
   * @param origin - Punto de origen {latitude, longitude}
   * @param destination - Punto de destino {latitude, longitude}
   * @returns Array de coordenadas que forman la ruta real
   */
  obtenerRuta: async (origen: LatitudLongitud, destino: LatitudLongitud): Promise<LatitudLongitud[]> => {
    try {
      // 1️⃣ INTENTAR OBTENER DEL CACHÉ
      console.log('💾 [directionsService] Buscando en caché...');
      const cacheadoRuta = await cacheRutaServicio.obtenerRuta(origen, destino);

      if (cacheadoRuta) {
        console.log(
          '✅ [directionsService] Ruta obtenida del caché con',
          cacheadoRuta.coordinates.length,
          'puntos'
        );
        return cacheadoRuta.coordinates;
      }

      // 2️⃣ SI NO ESTÁ EN CACHÉ, OBTENER DE GOOGLE MAPS
      if (!GOOGLE_MAPS_API_CLAVE) {
        console.warn(
          '⚠️ [directionsService] Google Maps API key no configurada'
        );
        // Retornar línea recta como fallback
        return [origen, destino];
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen.latitude},${origen.longitude}&destination=${destino.latitude},${destino.longitude}&key=${GOOGLE_MAPS_API_CLAVE}&mode=driving&language=es`;

      console.log(
        '📍 [directionsService] Obteniendo ruta desde Google Maps API...'
      );

      const respuesta = await fetch(url);
      const datos: DirectionsRespuesta = await respuesta.json();

      if (
      !datos.routes ||
      datos.routes.length === 0 ||
      !datos.routes[0].overview_polyline)
      {
        console.warn(
          '⚠️ [directionsService] No se encontró ruta en la respuesta'
        );
        return [origen, destino];
      }

      // Decodificar la ruta
      const polilineaPuntos = decodificarPolilinea(
        datos.routes[0].overview_polyline.points
      );

      // 3️⃣ GUARDAR EN CACHÉ PARA PRÓXIMAS VECES
      await cacheRutaServicio.guardarRuta(origen, destino, {
        coordinates: polilineaPuntos,
        distance: datos.routes[0].legs[0]?.distance?.value || 0,
        duration: datos.routes[0].legs[0]?.duration?.value || 0
      });

      console.log(
        '✅ [directionsService] Ruta obtenida y guardada en caché con',
        polilineaPuntos.length,
        'puntos'
      );

      return polilineaPuntos;
    } catch (error) {
      console.error('❌ [directionsService] Error obteniendo ruta:', error);
      // Retornar línea recta como fallback
      return [origen, destino];
    }
  }
};export { directionsServicio };
