// src/services/cache.service.ts
import { StorageHelper } from './storage';

interface CachedRoute {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance?: number;
  duration?: number;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

/**
 * 💾 Gestor de caché para rutas
 * Almacena rutas calculadas para reutilizarlas sin hacer llamadas a la API
 */
export const cacheRouteService: {
  CACHE_KEY: string;
  DEFAULT_TTL: number;
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => number;
  getRoute: (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    tolerance?: number,
  ) => Promise<CachedRoute | null>;
  saveRoute: (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    routeData: {
      coordinates: Array<{ latitude: number; longitude: number }>;
      distance?: number;
      duration?: number;
    },
    ttl?: number,
  ) => Promise<void>;
  clearExpired: () => Promise<void>;
  clear: () => Promise<void>;
  getStats: () => Promise<{ totalRoutes: number; totalSize: number }>;
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
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Obtener una ruta del caché si existe y es válida
   */
  getRoute: async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    tolerance: number = 0.05, // 50 metros de tolerancia
  ): Promise<CachedRoute | null> => {
    try {
      const cacheData = StorageHelper.getItem(cacheRouteService.CACHE_KEY);

      if (!cacheData) {
        console.log('📍 [cacheRouteService] No hay rutas en caché');
        return null;
      }

      const routes: CachedRoute[] = JSON.parse(cacheData);

      // Buscar ruta similar (dentro de tolerancia)
      const cachedRoute = routes.find(route => {
        const distanceToOrigin = cacheRouteService.calculateDistance(
          origin.latitude,
          origin.longitude,
          route.origin.latitude,
          route.origin.longitude,
        );

        const distanceToDestination = cacheRouteService.calculateDistance(
          destination.latitude,
          destination.longitude,
          route.destination.latitude,
          route.destination.longitude,
        );

        const isValid =
          Date.now() - route.timestamp < route.ttl &&
          distanceToOrigin < tolerance &&
          distanceToDestination < tolerance;

        return isValid;
      });

      if (cachedRoute) {
        console.log('✅ [cacheRouteService] Ruta encontrada en caché');
        return cachedRoute;
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
  saveRoute: async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    routeData: {
      coordinates: Array<{ latitude: number; longitude: number }>;
      distance?: number;
      duration?: number;
    },
    ttl: number = cacheRouteService.DEFAULT_TTL,
  ): Promise<void> => {
    try {
      const cacheData = StorageHelper.getItem(cacheRouteService.CACHE_KEY);
      let routes: CachedRoute[] = cacheData ? JSON.parse(cacheData) : [];

      // Limitar a máximo 50 rutas almacenadas
      if (routes.length >= 50) {
        routes = routes.slice(-49); // Mantener las 49 más recientes
      }

      const newRoute: CachedRoute = {
        origin,
        destination,
        coordinates: routeData.coordinates,
        distance: routeData.distance,
        duration: routeData.duration,
        timestamp: Date.now(),
        ttl,
      };

      routes.push(newRoute);
      StorageHelper.setItem(
        cacheRouteService.CACHE_KEY,
        JSON.stringify(routes),
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
  clearExpired: async (): Promise<void> => {
    try {
      const cacheData = StorageHelper.getItem(cacheRouteService.CACHE_KEY);

      if (!cacheData) return;

      let routes: CachedRoute[] = JSON.parse(cacheData);

      // Filtrar rutas no expiradas
      const now = Date.now();
      routes = routes.filter(route => now - route.timestamp < route.ttl);

      StorageHelper.setItem(
        cacheRouteService.CACHE_KEY,
        JSON.stringify(routes),
      );
      console.log('🧹 [cacheRouteService] Caché limpiado');
    } catch (error) {
      console.warn('⚠️ [cacheRouteService] Error limpiando caché:', error);
    }
  },

  /**
   * Borrar todo el caché
   */
  clear: async (): Promise<void> => {
    try {
      StorageHelper.removeItem(cacheRouteService.CACHE_KEY);
      console.log('🗑️ [cacheRouteService] Caché completamente borrado');
    } catch (error) {
      console.warn('⚠️ [cacheRouteService] Error borrando caché:', error);
    }
  },

  /**
   * Obtener estadísticas del caché
   */
  getStats: async (): Promise<{
    totalRoutes: number;
    totalSize: number;
  }> => {
    try {
      const cacheData = StorageHelper.getItem(cacheRouteService.CACHE_KEY);

      if (!cacheData) {
        return { totalRoutes: 0, totalSize: 0 };
      }

      const routes: CachedRoute[] = JSON.parse(cacheData);

      return {
        totalRoutes: routes.length,
        totalSize: new Blob([cacheData]).size,
      };
    } catch (error) {
      return { totalRoutes: 0, totalSize: 0 };
    }
  },
};
