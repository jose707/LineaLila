// src/services/cache.servicio.ts
import { AlmacenamientoAuxiliar } from './storage';

interface CacheadoRuta {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  coordinates: Array<{latitude: number;longitude: number;}>;
  distance?: number;
  duration?: number;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

/**
 * 💾 Gestor de caché para rutas
 * Almacena rutas calculadas para reutilizarlas sin hacer llamadas a la API
 */
const cacheRutaServicio: {
  CACHE_KEY: string;
  DEFAULT_TTL: number;
  calcularDistancia: (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number)
  => number;
  obtenerRuta: (
  origin: {latitude: number;longitude: number;},
  destination: {latitude: number;longitude: number;},
  tolerance?: number)
  => Promise<CacheadoRuta | null>;
  guardarRuta: (
  origin: {latitude: number;longitude: number;},
  destination: {latitude: number;longitude: number;},
  routeData: {
    coordinates: Array<{latitude: number;longitude: number;}>;
    distance?: number;
    duration?: number;
  },
  ttl?: number)
  => Promise<void>;
  limpiarVencido: () => Promise<void>;
  limpiar: () => Promise<void>;
  obtenerEstadisticas: () => Promise<{totalRoutes: number;totalSize: number;}>;
} = {
  /**
   * Clave de almacenamiento en AsyncStorage
   */
  CACHE_KEY: '@lineaLila/routes_cache',

  /**
   * TTL por defecto: 24 horas
   */
  DEFAULT_TTL: 24 * 60 * 60 * 1000,

  /**
   * Calcular distancia entre dos puntos (Haversine formula)
   * Para buscar rutas similares en caché
   */
  calcularDistancia: (
  latitud1: number,
  longitud1: number,
  latitud2: number,
  longitud2: number)
  : number => {
    const R = 6371; // Radio de la Tierra en km
    const dLatitud = (latitud2 - latitud1) * Math.PI / 180;
    const dLongitud = (longitud2 - longitud1) * Math.PI / 180;
    const primero =
    Math.sin(dLatitud / 2) * Math.sin(dLatitud / 2) +
    Math.cos(latitud1 * Math.PI / 180) *
    Math.cos(latitud2 * Math.PI / 180) *
    Math.sin(dLongitud / 2) *
    Math.sin(dLongitud / 2);
    const c = 2 * Math.atan2(Math.sqrt(primero), Math.sqrt(1 - primero));
    return R * c;
  },

  /**
   * Obtener una ruta del caché si existe y es válida
   */
  obtenerRuta: async (
  origen: {latitude: number;longitude: number;},
  destino: {latitude: number;longitude: number;},
  tolerancia: number = 0.05 // 50 metros de tolerancia
  ): Promise<CacheadoRuta | null> => {
    try {
      const cacheDatos = AlmacenamientoAuxiliar.obtenerElemento(cacheRutaServicio.CACHE_KEY);

      if (!cacheDatos) {
        console.log('📍 [cacheRouteService] No hay rutas en caché');
        return null;
      }

      const rutas: CacheadoRuta[] = JSON.parse(cacheDatos);

      // Buscar ruta similar (dentro de tolerancia)
      const cacheadoRuta = rutas.find((ruta) => {
        const distanciaHastaOrigen = cacheRutaServicio.calcularDistancia(
          origen.latitude,
          origen.longitude,
          ruta.origin.latitude,
          ruta.origin.longitude
        );

        const distanciaHastaDestino = cacheRutaServicio.calcularDistancia(
          destino.latitude,
          destino.longitude,
          ruta.destination.latitude,
          ruta.destination.longitude
        );

        const esValido =
        Date.now() - ruta.timestamp < ruta.ttl &&
        distanciaHastaOrigen < tolerancia &&
        distanciaHastaDestino < tolerancia;

        return esValido;
      });

      if (cacheadoRuta) {
        console.log('✅ [cacheRouteService] Ruta encontrada en caché');
        return cacheadoRuta;
      }

      console.log('⚠️ [cacheRouteService] No hay rutas válidas en caché');
      return null;
    } catch (error) {
      console.warn('⚠️ [cacheRouteService] Error leyendo caché:', error);
      return null;
    }
  },

  /**
   * Guardar una ruta en caché
   */
  guardarRuta: async (
  origen: {latitude: number;longitude: number;},
  destino: {latitude: number;longitude: number;},
  rutaDatos: {
    coordinates: Array<{latitude: number;longitude: number;}>;
    distance?: number;
    duration?: number;
  },
  vigencia: number = cacheRutaServicio.DEFAULT_TTL)
  : Promise<void> => {
    try {
      const cacheDatos = AlmacenamientoAuxiliar.obtenerElemento(cacheRutaServicio.CACHE_KEY);
      let rutas: CacheadoRuta[] = cacheDatos ? JSON.parse(cacheDatos) : [];

      // Limitar a máximo 50 rutas almacenadas
      if (rutas.length >= 50) {
        rutas = rutas.slice(-49); // Mantener las 49 más recientes
      }

      const nuevoRuta: CacheadoRuta = {
        origin: origen,
        destination: destino,
        coordinates: rutaDatos.coordinates,
        distance: rutaDatos.distance,
        duration: rutaDatos.duration,
        timestamp: Date.now(),
        ttl: vigencia
      };

      rutas.push(nuevoRuta);
      AlmacenamientoAuxiliar.establecerElemento(
        cacheRutaServicio.CACHE_KEY,
        JSON.stringify(rutas)
      );
      console.log('💾 [cacheRouteService] Ruta guardada en caché');
    } catch (error) {
      console.warn('⚠️ [cacheRouteService] Error guardando en caché:', error);
      // No fallar si el caché falla
    }
  },

  /**
   * Limpiar caché (borrar rutas expiradas)
   */
  limpiarVencido: async (): Promise<void> => {
    try {
      const cacheDatos = AlmacenamientoAuxiliar.obtenerElemento(cacheRutaServicio.CACHE_KEY);

      if (!cacheDatos) return;

      let rutas: CacheadoRuta[] = JSON.parse(cacheDatos);

      // Filtrar rutas no expiradas
      const ahora = Date.now();
      rutas = rutas.filter((ruta) => ahora - ruta.timestamp < ruta.ttl);

      AlmacenamientoAuxiliar.establecerElemento(
        cacheRutaServicio.CACHE_KEY,
        JSON.stringify(rutas)
      );
      console.log('🧹 [cacheRouteService] Caché limpiado');
    } catch (error) {
      console.warn('⚠️ [cacheRouteService] Error limpiando caché:', error);
    }
  },

  /**
   * Borrar todo el caché
   */
  limpiar: async (): Promise<void> => {
    try {
      AlmacenamientoAuxiliar.quitarElemento(cacheRutaServicio.CACHE_KEY);
      console.log('🗑️ [cacheRouteService] Caché completamente borrado');
    } catch (error) {
      console.warn('⚠️ [cacheRouteService] Error borrando caché:', error);
    }
  },

  /**
   * Obtener estadísticas del caché
   */
  obtenerEstadisticas: async (): Promise<{
    totalRoutes: number;
    totalSize: number;
  }> => {
    try {
      const cacheDatos = AlmacenamientoAuxiliar.obtenerElemento(cacheRutaServicio.CACHE_KEY);

      if (!cacheDatos) {
        return { totalRoutes: 0, totalSize: 0 };
      }

      const rutas: CacheadoRuta[] = JSON.parse(cacheDatos);

      return {
        totalRoutes: rutas.length,
        totalSize: new Blob([cacheDatos]).size
      };
    } catch (error) {
      return { totalRoutes: 0, totalSize: 0 };
    }
  }
};export { cacheRutaServicio };
