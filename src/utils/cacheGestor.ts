import { LatLng as LatitudLongitud } from 'react-native-maps';
import { AlmacenamientoAuxiliar } from '../services/storage';

// 🔥 TIPOS DE CACHÉ
export interface CacheadoUbicacion {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
}

export interface CacheadoRuta {
  pickupLat: number;
  pickupLon: number;
  destLat: number;
  destLon: number;
  distance: number;
  duration: number;
  coordinates: Array<{latitude: number;longitude: number;}>;
  fare: number;
  timestamp: number;
}

export interface ViajeHistorial {
  id: string;
  destinationLocation: LatitudLongitud;
  destinationAddress: string;
  count: number;
  timestamp: number;
}

const CACHE_CLAVES = {
  LOCATIONS: 'linealila_cached_locations',
  ROUTES: 'linealila_cached_routes',
  TRIP_HISTORY: 'linealila_trip_history',
  SEARCH_HISTORY: 'linealila_search_history',
  FAVORITE_TRIP_IDS: 'favoriteTripIds'
};

const CACHE_DURACION = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

// 🔥 FUNCIONES DE CACHÉ DE UBICACIONES
const cacheUbicacionGestor = {
  // Guardar una ubicación en caché
  guardarUbicacion: async (ubicacion: LatitudLongitud, direccion: string): Promise<void> => {
    try {
      const cacheadoUbicaciones = await cacheUbicacionGestor.obtenerUbicaciones();
      const clave = `${ubicacion.latitude},${ubicacion.longitude}`;

      cacheadoUbicaciones[clave] = {
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        address: direccion,
        timestamp: Date.now()
      };

      AlmacenamientoAuxiliar.establecerElemento(
        CACHE_CLAVES.LOCATIONS,
        JSON.stringify(cacheadoUbicaciones)
      );
    } catch (error) {
      console.error('Error guardando ubicación en caché:', error);
    }
  },

  // Obtener todas las ubicaciones cacheadas
  obtenerUbicaciones: async (): Promise<Record<string, CacheadoUbicacion>> => {
    try {
      const datos = AlmacenamientoAuxiliar.obtenerElemento(CACHE_CLAVES.LOCATIONS);
      return datos ? JSON.parse(datos) : {};
    } catch (error) {
      console.error('Error obteniendo ubicaciones cacheadas:', error);
      return {};
    }
  },

  // Obtener ubicación cacheada por coordenadas
  obtenerUbicacion: async (ubicacion: LatitudLongitud): Promise<CacheadoUbicacion | null> => {
    try {
      const ubicaciones = await cacheUbicacionGestor.obtenerUbicaciones();
      const clave = `${ubicacion.latitude},${ubicacion.longitude}`;
      const cacheado = ubicaciones[clave];

      if (cacheado && Date.now() - cacheado.timestamp < CACHE_DURACION) {
        return cacheado;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo ubicación del caché:', error);
      return null;
    }
  },

  // Limpiar ubicaciones expiradas
  limpiarUbicacionesVencidas: async (): Promise<void> => {
    try {
      const ubicaciones = await cacheUbicacionGestor.obtenerUbicaciones();
      const ahora = Date.now();
      const limpio = Object.fromEntries(
        Object.entries(ubicaciones).filter(
          ([_, valor]) => ahora - valor.timestamp < CACHE_DURACION
        )
      );

      AlmacenamientoAuxiliar.establecerElemento(CACHE_CLAVES.LOCATIONS, JSON.stringify(limpio));
    } catch (error) {
      console.error('Error limpiando ubicaciones expiradas:', error);
    }
  }
};

// 🔥 FUNCIONES DE CACHÉ DE RUTAS
export { cacheUbicacionGestor };const cacheRutaGestor = {
  // Guardar una ruta en caché
  guardarRuta: async (
  recogida: LatitudLongitud,
  destino: LatitudLongitud,
  ruta: CacheadoRuta)
  : Promise<void> => {
    try {
      const cacheadoRutas = await cacheRutaGestor.obtenerRutas();
      const clave = `${recogida.latitude},${recogida.longitude}-${destino.latitude},${destino.longitude}`;

      cacheadoRutas[clave] = {
        ...ruta,
        pickupLat: recogida.latitude,
        pickupLon: recogida.longitude,
        destLat: destino.latitude,
        destLon: destino.longitude,
        timestamp: Date.now()
      };

      AlmacenamientoAuxiliar.establecerElemento(CACHE_CLAVES.ROUTES, JSON.stringify(cacheadoRutas));
    } catch (error) {
      console.error('Error guardando ruta en caché:', error);
    }
  },

  // Obtener todas las rutas cacheadas
  obtenerRutas: async (): Promise<Record<string, CacheadoRuta>> => {
    try {
      const datos = AlmacenamientoAuxiliar.obtenerElemento(CACHE_CLAVES.ROUTES);
      return datos ? JSON.parse(datos) : {};
    } catch (error) {
      console.error('Error obteniendo rutas cacheadas:', error);
      return {};
    }
  },

  // Obtener ruta cacheada
  obtenerRuta: async (
  recogida: LatitudLongitud,
  destino: LatitudLongitud)
  : Promise<CacheadoRuta | null> => {
    try {
      const rutas = await cacheRutaGestor.obtenerRutas();
      const clave = `${recogida.latitude},${recogida.longitude}-${destino.latitude},${destino.longitude}`;
      const cacheado = rutas[clave];

      if (cacheado && Date.now() - cacheado.timestamp < CACHE_DURACION) {
        return cacheado;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo ruta del caché:', error);
      return null;
    }
  },

  // Limpiar rutas expiradas
  limpiarRutasVencidas: async (): Promise<void> => {
    try {
      const rutas = await cacheRutaGestor.obtenerRutas();
      const ahora = Date.now();
      const limpio = Object.fromEntries(
        Object.entries(rutas).filter(
          ([_, valor]) => ahora - valor.timestamp < CACHE_DURACION
        )
      );

      AlmacenamientoAuxiliar.establecerElemento(CACHE_CLAVES.ROUTES, JSON.stringify(limpio));
    } catch (error) {
      console.error('Error limpiando rutas expiradas:', error);
    }
  }
};

// Búsquedas recientes: solo se conserva el destino, nunca el origen de la ruta.
export { cacheRutaGestor };const cacheViajeHistorialGestor = {
  claveDestino: (viaje: Pick<ViajeHistorial, 'destinationAddress'>): string =>
  viaje.destinationAddress.trim().replace(/\s+/g, ' ').toLocaleLowerCase(),

  // Guardar o actualizar un destino reciente.
  agregarViaje: async (
  viaje: Omit<ViajeHistorial, 'id' | 'timestamp' | 'count'>)
  : Promise<void> => {
    try {
      if (!viaje.destinationAddress.trim() ||
      !Number.isFinite(viaje.destinationLocation.latitude) ||
      !Number.isFinite(viaje.destinationLocation.longitude)) return;
      const viajes = await cacheViajeHistorialGestor.obtenerViajes();
      const anterior = viajes.find((guardado) =>
      cacheViajeHistorialGestor.claveDestino(guardado) === cacheViajeHistorialGestor.claveDestino(viaje)
      );
      const nuevoViaje: ViajeHistorial = {
        destinationLocation: {
          latitude: viaje.destinationLocation.latitude,
          longitude: viaje.destinationLocation.longitude
        },
        destinationAddress: viaje.destinationAddress.trim(),
        id: anterior?.id ?? Date.now().toString(),
        count: (anterior?.count ?? 0) + 1,
        timestamp: Date.now()
      };
      const unico = viajes.filter((guardado) =>
      cacheViajeHistorialGestor.claveDestino(guardado) !== cacheViajeHistorialGestor.claveDestino(viaje)
      );
      AlmacenamientoAuxiliar.establecerElemento(CACHE_CLAVES.TRIP_HISTORY, JSON.stringify([nuevoViaje, ...unico].slice(0, 50)));
    } catch (error) {
      console.error('Error guardando viaje en historial:', error);
    }
  },

  // Migrar entradas antiguas de origen-destino sin perder los destinos guardados.
  obtenerViajes: async (): Promise<ViajeHistorial[]> => {
    try {
      const datos = AlmacenamientoAuxiliar.obtenerElemento(CACHE_CLAVES.TRIP_HISTORY);
      const almacenado: unknown = datos ? JSON.parse(datos) : [];
      if (!Array.isArray(almacenado)) return [];

      let favoritoIds = new Set<string>();
      try {
        const guardado = JSON.parse(AlmacenamientoAuxiliar.obtenerElemento(CACHE_CLAVES.FAVORITE_TRIP_IDS) || '[]');
        if (Array.isArray(guardado)) favoritoIds = new Set(guardado.filter((id): id is string => typeof id === 'string'));
      } catch {/* El historial sigue disponible aunque los favoritos estén dañados. */}
      let favoritosCambiado = false;
      const destinos = new Map<string, ViajeHistorial>();
      for (const elemento of almacenado) {
        const direccion = typeof elemento?.destinationAddress === 'string' ?
        elemento.destinationAddress.trim() :
        '';
        const latitud = elemento?.destinationLocation?.latitude;
        const longitud = elemento?.destinationLocation?.longitude;
        if (!direccion || !Number.isFinite(latitud) || !Number.isFinite(longitud)) continue;

        const clave = cacheViajeHistorialGestor.claveDestino({ destinationAddress: direccion });
        const marcaTiempo = Number.isFinite(elemento.timestamp) ? elemento.timestamp : Date.now();
        const id = String(elemento.id ?? marcaTiempo);
        const cantidad = Number.isFinite(elemento.count) && elemento.count > 0 ? elemento.count : 1;
        const anterior = destinos.get(clave);
        if (anterior) {
          anterior.count += cantidad;
          if (favoritoIds.delete(id)) {
            favoritoIds.add(anterior.id);
            favoritosCambiado = true;
          }
          continue;
        }
        destinos.set(clave, {
          id,
          destinationLocation: { latitude: latitud, longitude: longitud },
          destinationAddress: direccion,
          count: cantidad,
          timestamp: marcaTiempo
        });
      }
      const viajes = Array.from(destinos.values()).slice(0, 50);
      const normalizado = JSON.stringify(viajes);
      if (datos && datos !== normalizado) AlmacenamientoAuxiliar.establecerElemento(CACHE_CLAVES.TRIP_HISTORY, normalizado);
      if (favoritosCambiado) {
        AlmacenamientoAuxiliar.establecerElemento(CACHE_CLAVES.FAVORITE_TRIP_IDS, JSON.stringify([...favoritoIds]));
      }
      return viajes;
    } catch (error) {
      console.error('Error obteniendo historial de viajes:', error);
      return [];
    }
  },

  // Obtener destinos frecuentes (top 5).
  obtenerViajesFrecuentes: async (): Promise<ViajeHistorial[]> => {
    try {
      const viajes = await cacheViajeHistorialGestor.obtenerViajes();
      return [...viajes].
      sort((primero, segundo) => segundo.count - primero.count || segundo.timestamp - primero.timestamp).
      slice(0, 5);
    } catch (error) {
      console.error('Error obteniendo viajes frecuentes:', error);
      return [];
    }
  },

  // Limpiar historial
  limpiarHistorial: async (): Promise<void> => {
    try {
      AlmacenamientoAuxiliar.quitarElemento(CACHE_CLAVES.TRIP_HISTORY);
    } catch (error) {
      console.error('Error limpiando historial:', error);
    }
  }
};

// 🔥 FUNCIONES DE CACHÉ DE BÚSQUEDAS
export { cacheViajeHistorialGestor };const cacheBuscarGestor = {
  // Guardar búsqueda
  guardarBusqueda: async (direccion: string): Promise<void> => {
    try {
      const busquedas = await cacheBuscarGestor.obtenerBusquedas();

      // No duplicar búsquedas recientes
      if (busquedas[0] === direccion) return;

      busquedas.unshift(direccion);

      // Mantener solo las últimas 20 búsquedas
      if (busquedas.length > 20) {
        busquedas.pop();
      }

      AlmacenamientoAuxiliar.establecerElemento(
        CACHE_CLAVES.SEARCH_HISTORY,
        JSON.stringify(busquedas)
      );
    } catch (error) {
      console.error('Error guardando búsqueda:', error);
    }
  },

  // Obtener historial de búsquedas
  obtenerBusquedas: async (): Promise<string[]> => {
    try {
      const datos = AlmacenamientoAuxiliar.obtenerElemento(CACHE_CLAVES.SEARCH_HISTORY);
      return datos ? JSON.parse(datos) : [];
    } catch (error) {
      console.error('Error obteniendo búsquedas guardadas:', error);
      return [];
    }
  },

  // Limpiar búsquedas
  limpiarBusquedas: async (): Promise<void> => {
    try {
      AlmacenamientoAuxiliar.quitarElemento(CACHE_CLAVES.SEARCH_HISTORY);
    } catch (error) {
      console.error('Error limpiando búsquedas:', error);
    }
  }
};

// 🔥 FUNCIÓN GENERAL PARA LIMPIAR TODO EL CACHÉ
export { cacheBuscarGestor as cacheBusquedaGestor };const limpiarTodosCache = async (): Promise<void> => {
  try {
    AlmacenamientoAuxiliar.quitarElemento(CACHE_CLAVES.LOCATIONS);
    AlmacenamientoAuxiliar.quitarElemento(CACHE_CLAVES.ROUTES);
    AlmacenamientoAuxiliar.quitarElemento(CACHE_CLAVES.TRIP_HISTORY);
    AlmacenamientoAuxiliar.quitarElemento(CACHE_CLAVES.SEARCH_HISTORY);
    console.log('✅ Caché completamente limpiado');
  } catch (error) {
    console.error('Error limpiando caché:', error);
  }
};

// 🔥 FUNCIÓN GENERAL PARA LIMPIAR CACHÉ EXPIRADO
export { limpiarTodosCache };const limpiarVencidoCache = async (): Promise<void> => {
  try {
    await Promise.all([
    cacheUbicacionGestor.limpiarUbicacionesVencidas(),
    cacheRutaGestor.limpiarRutasVencidas()]
    );
    console.log('✅ Caché expirado limpiado');
  } catch (error) {
    console.error('Error limpiando caché expirado:', error);
  }
};export { limpiarVencidoCache };
