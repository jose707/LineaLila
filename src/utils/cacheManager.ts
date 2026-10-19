import { LatLng } from 'react-native-maps';
import { StorageHelper } from '../services/storage';

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
  destinationLocation: LatLng;
  destinationAddress: string;
  count: number;
  timestamp: number;
}

const CACHE_KEYS = {
  LOCATIONS: 'linealila_cached_locations',
  ROUTES: 'linealila_cached_routes',
  TRIP_HISTORY: 'linealila_trip_history',
  SEARCH_HISTORY: 'linealila_search_history',
  FAVORITE_TRIP_IDS: 'favoriteTripIds',
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

// Búsquedas recientes: solo se conserva el destino, nunca el origen de la ruta.
export const cacheTripHistoryManager = {
  destinationKey: (trip: Pick<TripHistory, 'destinationAddress'>): string =>
    trip.destinationAddress.trim().replace(/\s+/g, ' ').toLocaleLowerCase(),

  // Guardar o actualizar un destino reciente.
  addTrip: async (
    trip: Omit<TripHistory, 'id' | 'timestamp' | 'count'>,
  ): Promise<void> => {
    try {
      if (!trip.destinationAddress.trim() ||
          !Number.isFinite(trip.destinationLocation.latitude) ||
          !Number.isFinite(trip.destinationLocation.longitude)) return;
      const trips = await cacheTripHistoryManager.getTrips();
      const previous = trips.find(saved =>
        cacheTripHistoryManager.destinationKey(saved) === cacheTripHistoryManager.destinationKey(trip),
      );
      const newTrip: TripHistory = {
        destinationLocation: {
          latitude: trip.destinationLocation.latitude,
          longitude: trip.destinationLocation.longitude,
        },
        destinationAddress: trip.destinationAddress.trim(),
        id: previous?.id ?? Date.now().toString(),
        count: (previous?.count ?? 0) + 1,
        timestamp: Date.now(),
      };
      const unique = trips.filter(saved =>
        cacheTripHistoryManager.destinationKey(saved) !== cacheTripHistoryManager.destinationKey(trip),
      );
      StorageHelper.setItem(CACHE_KEYS.TRIP_HISTORY, JSON.stringify([newTrip, ...unique].slice(0, 50)));
    } catch (error) {
      console.error('Error guardando viaje en historial:', error);
    }
  },

  // Migrar entradas antiguas de origen-destino sin perder los destinos guardados.
  getTrips: async (): Promise<TripHistory[]> => {
    try {
      const data = StorageHelper.getItem(CACHE_KEYS.TRIP_HISTORY);
      const stored: unknown = data ? JSON.parse(data) : [];
      if (!Array.isArray(stored)) return [];

      let favoriteIds = new Set<string>();
      try {
        const saved = JSON.parse(StorageHelper.getItem(CACHE_KEYS.FAVORITE_TRIP_IDS) || '[]');
        if (Array.isArray(saved)) favoriteIds = new Set(saved.filter((id): id is string => typeof id === 'string'));
      } catch { /* El historial sigue disponible aunque los favoritos estén dañados. */ }
      let favoritesChanged = false;
      const destinations = new Map<string, TripHistory>();
      for (const item of stored) {
        const address = typeof item?.destinationAddress === 'string'
          ? item.destinationAddress.trim()
          : '';
        const latitude = item?.destinationLocation?.latitude;
        const longitude = item?.destinationLocation?.longitude;
        if (!address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

        const key = cacheTripHistoryManager.destinationKey({ destinationAddress: address });
        const timestamp = Number.isFinite(item.timestamp) ? item.timestamp : Date.now();
        const id = String(item.id ?? timestamp);
        const count = Number.isFinite(item.count) && item.count > 0 ? item.count : 1;
        const previous = destinations.get(key);
        if (previous) {
          previous.count += count;
          if (favoriteIds.delete(id)) {
            favoriteIds.add(previous.id);
            favoritesChanged = true;
          }
          continue;
        }
        destinations.set(key, {
          id,
          destinationLocation: { latitude, longitude },
          destinationAddress: address,
          count,
          timestamp,
        });
      }
      const trips = Array.from(destinations.values()).slice(0, 50);
      const normalized = JSON.stringify(trips);
      if (data && data !== normalized) StorageHelper.setItem(CACHE_KEYS.TRIP_HISTORY, normalized);
      if (favoritesChanged) {
        StorageHelper.setItem(CACHE_KEYS.FAVORITE_TRIP_IDS, JSON.stringify([...favoriteIds]));
      }
      return trips;
    } catch (error) {
      console.error('Error obteniendo historial de viajes:', error);
      return [];
    }
  },

  // Obtener destinos frecuentes (top 5).
  getFrequentTrips: async (): Promise<TripHistory[]> => {
    try {
      const trips = await cacheTripHistoryManager.getTrips();
      return [...trips]
        .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
        .slice(0, 5);
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
