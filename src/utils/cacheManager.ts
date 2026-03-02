import { LatLng } from 'react-native-maps';

// Storage helper using react-native-mmkv
let MMKV: any;
let storageInstance: any;

try {
  ({ MMKV } = require('react-native-mmkv'));
  storageInstance = new MMKV.MMKV();
} catch (error) {
  console.warn('MMKV not available', error);
  // Fallback storage
  storageInstance = new Map();
}

const StorageHelper = {
  getItem: (key: string) => {
    try {
      if (storageInstance instanceof Map) {
        return storageInstance.get(key) || null;
      }
      return storageInstance.getString(key) || null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (storageInstance instanceof Map) {
        storageInstance.set(key, value);
      } else {
        storageInstance.set(key, value);
      }
    } catch (error) {
      console.error('Error writing to storage:', error);
    }
  },
  removeItem: (key: string) => {
    try {
      if (storageInstance instanceof Map) {
        storageInstance.delete(key);
      } else {
        storageInstance.delete(key);
      }
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  },
};

// 🔥 TIPOS DE CACHÉ
export interface CachedLocation {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
}

export interface CachedRoute {
  pickupLat: number;
  pickupLon: number;
  destLat: number;
  destLon: number;
  distance: number;
  duration: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
  fare: number;
  timestamp: number;
}

export interface TripHistory {
  id: string;
  pickupLocation: LatLng;
  pickupAddress: string;
  destinationLocation: LatLng;
  destinationAddress: string;
  distance: number;
  duration: number;
  fare: number;
  timestamp: number;
}

const CACHE_KEYS = {
  LOCATIONS: 'linealila_cached_locations',
  ROUTES: 'linealila_cached_routes',
  TRIP_HISTORY: 'linealila_trip_history',
  SEARCH_HISTORY: 'linealila_search_history',
};

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

// 🔥 FUNCIONES DE CACHÉ DE UBICACIONES
export const cacheLocationManager = {
  // Guardar una ubicación en caché
  saveLocation: async (location: LatLng, address: string): Promise<void> => {
    try {
      const cachedLocations = await cacheLocationManager.getLocations();
      const key = `${location.latitude},${location.longitude}`;

      cachedLocations[key] = {
        latitude: location.latitude,
        longitude: location.longitude,
        address,
        timestamp: Date.now(),
      };

      StorageHelper.setItem(
        CACHE_KEYS.LOCATIONS,
        JSON.stringify(cachedLocations),
      );
    } catch (error) {
      console.error('Error guardando ubicación en caché:', error);
    }
  },

  // Obtener todas las ubicaciones cacheadas
  getLocations: async (): Promise<Record<string, CachedLocation>> => {
    try {
      const data = StorageHelper.getItem(CACHE_KEYS.LOCATIONS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error obteniendo ubicaciones cacheadas:', error);
      return {};
    }
  },

  // Obtener ubicación cacheada por coordenadas
  getLocation: async (location: LatLng): Promise<CachedLocation | null> => {
    try {
      const locations = await cacheLocationManager.getLocations();
      const key = `${location.latitude},${location.longitude}`;
      const cached = locations[key];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo ubicación del caché:', error);
      return null;
    }
  },

  // Limpiar ubicaciones expiradas
  cleanExpiredLocations: async (): Promise<void> => {
    try {
      const locations = await cacheLocationManager.getLocations();
      const now = Date.now();
      const cleaned = Object.fromEntries(
        Object.entries(locations).filter(
          ([_, value]) => now - value.timestamp < CACHE_DURATION,
        ),
      );

      StorageHelper.setItem(CACHE_KEYS.LOCATIONS, JSON.stringify(cleaned));
    } catch (error) {
      console.error('Error limpiando ubicaciones expiradas:', error);
    }
  },
};

// 🔥 FUNCIONES DE CACHÉ DE RUTAS
export const cacheRouteManager = {
  // Guardar una ruta en caché
  saveRoute: async (
    pickup: LatLng,
    destination: LatLng,
    route: CachedRoute,
  ): Promise<void> => {
    try {
      const cachedRoutes = await cacheRouteManager.getRoutes();
      const key = `${pickup.latitude},${pickup.longitude}-${destination.latitude},${destination.longitude}`;

      cachedRoutes[key] = {
        ...route,
        pickupLat: pickup.latitude,
        pickupLon: pickup.longitude,
        destLat: destination.latitude,
        destLon: destination.longitude,
        timestamp: Date.now(),
      };

      StorageHelper.setItem(CACHE_KEYS.ROUTES, JSON.stringify(cachedRoutes));
    } catch (error) {
      console.error('Error guardando ruta en caché:', error);
    }
  },

  // Obtener todas las rutas cacheadas
  getRoutes: async (): Promise<Record<string, CachedRoute>> => {
    try {
      const data = StorageHelper.getItem(CACHE_KEYS.ROUTES);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error obteniendo rutas cacheadas:', error);
      return {};
    }
  },

  // Obtener ruta cacheada
  getRoute: async (
    pickup: LatLng,
    destination: LatLng,
  ): Promise<CachedRoute | null> => {
    try {
      const routes = await cacheRouteManager.getRoutes();
      const key = `${pickup.latitude},${pickup.longitude}-${destination.latitude},${destination.longitude}`;
      const cached = routes[key];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo ruta del caché:', error);
      return null;
    }
  },

  // Limpiar rutas expiradas
  cleanExpiredRoutes: async (): Promise<void> => {
    try {
      const routes = await cacheRouteManager.getRoutes();
      const now = Date.now();
      const cleaned = Object.fromEntries(
        Object.entries(routes).filter(
          ([_, value]) => now - value.timestamp < CACHE_DURATION,
        ),
      );

      StorageHelper.setItem(CACHE_KEYS.ROUTES, JSON.stringify(cleaned));
    } catch (error) {
      console.error('Error limpiando rutas expiradas:', error);
    }
  },
};

// 🔥 FUNCIONES DE CACHÉ DE HISTORIAL DE VIAJES
export const cacheTripHistoryManager = {
  // Agregar un viaje al historial
  addTrip: async (
    trip: Omit<TripHistory, 'id' | 'timestamp'>,
  ): Promise<void> => {
    try {
      const trips = await cacheTripHistoryManager.getTrips();
      const newTrip: TripHistory = {
        ...trip,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      trips.unshift(newTrip);

      // Mantener solo los últimos 50 viajes
      if (trips.length > 50) {
        trips.pop();
      }

      StorageHelper.setItem(CACHE_KEYS.TRIP_HISTORY, JSON.stringify(trips));
    } catch (error) {
      console.error('Error guardando viaje en historial:', error);
    }
  },

  // Obtener historial de viajes
  getTrips: async (): Promise<TripHistory[]> => {
    try {
      const data = StorageHelper.getItem(CACHE_KEYS.TRIP_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error obteniendo historial de viajes:', error);
      return [];
    }
  },

  // Obtener viajes frecuentes (top 5)
  getFrequentTrips: async (): Promise<TripHistory[]> => {
    try {
      const trips = await cacheTripHistoryManager.getTrips();

      // Contar frecuencia de rutas
      const routeMap = new Map<string, { trip: TripHistory; count: number }>();

      trips.forEach(trip => {
        const key = `${trip.pickupAddress}-${trip.destinationAddress}`;
        const existing = routeMap.get(key);

        if (existing) {
          existing.count++;
        } else {
          routeMap.set(key, { trip, count: 1 });
        }
      });

      // Ordenar por frecuencia y retornar top 5
      return Array.from(routeMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => item.trip);
    } catch (error) {
      console.error('Error obteniendo viajes frecuentes:', error);
      return [];
    }
  },

  // Limpiar historial
  clearHistory: async (): Promise<void> => {
    try {
      StorageHelper.removeItem(CACHE_KEYS.TRIP_HISTORY);
    } catch (error) {
      console.error('Error limpiando historial:', error);
    }
  },
};

// 🔥 FUNCIONES DE CACHÉ DE BÚSQUEDAS
export const cacheSearchManager = {
  // Guardar búsqueda
  saveSearch: async (address: string): Promise<void> => {
    try {
      const searches = await cacheSearchManager.getSearches();

      // No duplicar búsquedas recientes
      if (searches[0] === address) return;

      searches.unshift(address);

      // Mantener solo las últimas 20 búsquedas
      if (searches.length > 20) {
        searches.pop();
      }

      StorageHelper.setItem(
        CACHE_KEYS.SEARCH_HISTORY,
        JSON.stringify(searches),
      );
    } catch (error) {
      console.error('Error guardando búsqueda:', error);
    }
  },

  // Obtener historial de búsquedas
  getSearches: async (): Promise<string[]> => {
    try {
      const data = StorageHelper.getItem(CACHE_KEYS.SEARCH_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error obteniendo búsquedas guardadas:', error);
      return [];
    }
  },

  // Limpiar búsquedas
  clearSearches: async (): Promise<void> => {
    try {
      StorageHelper.removeItem(CACHE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      console.error('Error limpiando búsquedas:', error);
    }
  },
};

// 🔥 FUNCIÓN GENERAL PARA LIMPIAR TODO EL CACHÉ
export const clearAllCache = async (): Promise<void> => {
  try {
    StorageHelper.removeItem(CACHE_KEYS.LOCATIONS);
    StorageHelper.removeItem(CACHE_KEYS.ROUTES);
    StorageHelper.removeItem(CACHE_KEYS.TRIP_HISTORY);
    StorageHelper.removeItem(CACHE_KEYS.SEARCH_HISTORY);
    console.log('✅ Caché completamente limpiado');
  } catch (error) {
    console.error('Error limpiando caché:', error);
  }
};

// 🔥 FUNCIÓN GENERAL PARA LIMPIAR CACHÉ EXPIRADO
export const cleanExpiredCache = async (): Promise<void> => {
  try {
    await Promise.all([
      cacheLocationManager.cleanExpiredLocations(),
      cacheRouteManager.cleanExpiredRoutes(),
    ]);
    console.log('✅ Caché expirado limpiado');
  } catch (error) {
    console.error('Error limpiando caché expirado:', error);
  }
};
