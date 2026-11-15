import { useEffect as usarEfecto, useRef as usarReferencia, useState as usarEstado } from 'react';
import { AppState as AplicacionEstado } from 'react-native';
import { viajesServicio } from '../services/viajes.servicio';
import { cacheRutaServicio } from '../services/cache.servicio';
import { limpiarVencidoCache } from '../utils/cacheGestor';
import socketServicio from '../services/socket.servicio';
import { normalizarRumbo, resolverConductorRumbo } from '../utils/conductorRumbo';

export interface ActivoViaje {
  rideId: string;
  status:
  'aceptado' |
  'llegado' |
  'en_curso' |
  'completing' |
  'cancelado' |
  'completado';
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
  passengerProfilePicture?: string;
  passengerVerified: boolean;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverProfilePicture?: string;
  driverApproved: boolean;
  vehicleInfo?: string;
  licensePlate?: string;
  pickupLocation: {latitude: number;longitude: number;address: string;};
  dropoffLocation: {latitude: number;longitude: number;address: string;};
  waypoints?: Array<{
    id: string;
    sequence: number;
    location: {latitude: number;longitude: number;};
    address: string;
    arrivedAt?: string | null;
    departedAt?: string | null;
  }>;
  driverLocation?: {latitude: number;longitude: number;heading?: number;};
  fare: number;
  distance: number;
  duration: number;
  startTime?: string;
  cancelledBy?: string;
}

export function usarConexionViajeActivo(viajeId: string, esEnfocado: boolean, alCargar?: (listoDesde?: string | null) => void) {
  const [viaje, establecerViaje] = usarEstado<ActivoViaje | null>(null);
  const [esCargando, establecerEsCargando] = usarEstado(true);
  const esCargandoReferencia = usarReferencia(false);
  const recargaViajePendiente = usarReferencia(false);
  const esMontadoReferencia = usarReferencia(true);

  const cargarViajeDetalles = async () => {
    if (esCargandoReferencia.current || !viajeId) return;
    try {
      esCargandoReferencia.current = true;
      const d: any = await viajesServicio.obtenerViajePorId(viajeId);
      if (!d || !esMontadoReferencia.current) return;
      const nombresDePila = (persona?: { firstNames?: string | null; name?: string | null }) => {
        const nombres = persona?.firstNames?.trim() || persona?.name?.trim().split(/\s+/)[0] || '';
        return nombres.toLowerCase().split(/\s+/)
          .map(nombre => nombre.charAt(0).toUpperCase() + nombre.slice(1))
          .join(' ');
      };
      const mapeado: ActivoViaje = {
        rideId: d.id,
        status: d.status,
        passengerName: nombresDePila(d.passenger) || 'Pasajero',
        passengerPhone: d.passenger?.phone || '',
        passengerRating: d.passenger?.rating || 0,
        passengerProfilePicture: d.passenger?.profilePhoto,
        passengerVerified: d.passenger?.identidadVerificada === true,
        driverName: nombresDePila(d.driver?.User) || 'Conductor',
        driverPhone: d.driver?.User?.phone || '',
        driverRating: d.driver?.User?.rating || 0,
        driverProfilePicture: d.driver?.User?.profilePhoto,
        driverApproved: d.driver?.status === 'aprobado',
        vehicleInfo: d.driver?.vehicleModel ?
        `${d.driver.vehicleModel} ${d.driver.vehicleColor || ''}`.trim() :
        undefined,
        licensePlate: d.driver?.vehiclePlate,
        pickupLocation: {
          latitude: d.pickupLocation?.latitude || -16.5038,
          longitude: d.pickupLocation?.longitude || -68.1345,
          address: d.pickupLocation?.address || 'Punto de recogida'
        },
        dropoffLocation: {
          latitude: d.dropoffLocation?.latitude || -16.518,
          longitude: d.dropoffLocation?.longitude || -68.124,
          address: d.dropoffLocation?.address || 'Destino'
        },
        driverLocation: d.driver?.currentLocation?.latitude ?
        {
          latitude: parseFloat(d.driver.currentLocation.latitude),
          longitude: parseFloat(d.driver.currentLocation.longitude),
          heading: normalizarRumbo(d.driver.currentLocation.heading)
        } :
        d.driver?.location?.latitude ?
        {
          latitude: parseFloat(d.driver.location.latitude),
          longitude: parseFloat(d.driver.location.longitude),
          heading: normalizarRumbo(d.driver.location.heading)
        } :
        undefined,
        fare: d.fare || d.finalFare || 0,
        distance: (d.distance || 0) / 1000,
        duration: Math.floor((d.duration || 0) / 60),
        startTime: d.startedAt || d.createdAt,
        cancelledBy: d.cancelled_by || d.cancelledBy,
        waypoints: (d.waypoints || []).map((parada: any) => ({
          id: parada.id,
          sequence: parada.sequence,
          location: parada.location || {
            latitude: 0,
            longitude: 0
          },
          address: parada.address || '',
          arrivedAt: parada.arrivedAt || null,
          departedAt: parada.departedAt || null
        })).sort((primero: {sequence: number;}, segundo: {sequence: number;}) => primero.sequence - segundo.sequence)
      };
      establecerViaje((anterior) => ({
        ...mapeado,
        driverLocation: mapeado.driverLocation ? {
          ...mapeado.driverLocation,
          heading: mapeado.driverLocation.heading ?? (
          anterior?.rideId === mapeado.rideId ? anterior.driverLocation?.heading : undefined)

        } : anterior?.rideId === mapeado.rideId ? anterior.driverLocation : undefined
      }));
      establecerEsCargando(false);
      alCargar?.(d.passengerReadyAt);
    } catch (error: any) {
      if (esMontadoReferencia.current && error?.message !== 'AbortError') {
        establecerEsCargando(false);
      }
    } finally {
      esCargandoReferencia.current = false;
      if (esMontadoReferencia.current && recargaViajePendiente.current) {
        recargaViajePendiente.current = false;
        void cargarViajeDetalles();
      }
    }
  };

  usarEfecto(() => {
    cacheRutaServicio.limpiarVencido();
    limpiarVencidoCache();
  }, []);

  usarEfecto(() => {
    esMontadoReferencia.current = true;
    esCargandoReferencia.current = false;
    recargaViajePendiente.current = false;
    cargarViajeDetalles(); // Carga inicial

    // 🔌 Socket: unirse al room del viaje
    socketServicio.unirViaje(viajeId);

    // Socket: escuchar cambios de estado del viaje
    const manejarEstadoCambiado = (datos: any) => {
      if (datos?.rideId !== viajeId || !esMontadoReferencia.current) return;
      if (esCargandoReferencia.current) recargaViajePendiente.current = true;
      else void cargarViajeDetalles();
    };

    // Socket: escuchar actualizaciones de ubicación del conductor
    const manejarUbicacionCambiado = (datos: any) => {
      if (datos?.rideId !== viajeId) return;
      const latitud = Number(datos.latitude);
      const longitud = Number(datos.longitude);
      if (!Number.isFinite(latitud) || !Number.isFinite(longitud) ||
      Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return;
      establecerViaje((anterior) => {
        if (!anterior) return anterior;
        const real = { latitude: latitud, longitude: longitud };
        return {
          ...anterior,
          driverLocation: {
            ...real,
            heading: normalizarRumbo(datos.heading) ??
            resolverConductorRumbo(anterior.driverLocation, real)
          }
        };
      });
    };

    socketServicio.al('ride:status:changed', manejarEstadoCambiado);
    socketServicio.al('driver:location:changed', manejarUbicacionCambiado);

    return () => {
      esMontadoReferencia.current = false;
      socketServicio.desactivado('ride:status:changed', manejarEstadoCambiado);
      socketServicio.desactivado('driver:location:changed', manejarUbicacionCambiado);
      socketServicio.leaveViaje(viajeId);
    };
  }, [viajeId]);

  usarEfecto(() => {
    if (!esEnfocado) return;
    const suscripcion = AplicacionEstado.addEventListener('change', (estado) => {
      if (estado === 'active') cargarViajeDetalles();
    });
    return () => suscripcion.remove();
  }, [esEnfocado, viajeId]);

  return { viaje, establecerViaje, esCargando, establecerEsCargando, esMontadoReferencia, cargarViajeDetalles };
}
