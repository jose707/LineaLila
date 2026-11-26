import { useEffect as usarEfecto, useRef as usarReferencia, useState as usarEstado, type RefObject } from 'react';
import { viajesServicio } from '../services/viajes.servicio';
import { distanciaARuta, actualizarDesvio } from '../utils/desvioRuta';
import type { ActivoViaje } from './usarConexionViajeActivo';

const minutosDeRuta = (segundos?: number | null) =>
  typeof segundos === 'number' && Number.isFinite(segundos) && segundos >= 0
    ? Math.max(1, Math.ceil(segundos / 60))
    : null;

const decodificarPolilinea = (enc: string, distancia?: number) => {
  const puntos: Array<{latitude: number;longitude: number;}> = [];
  let indice = 0,
    latitud = 0,
    longitud = 0;
  while (indice < enc.length) {
    let segundo,
      sh = 0,
      r = 0;
    do {
      segundo = enc.charCodeAt(indice++) - 63;
      r |= (segundo & 0x1f) << sh;
      sh += 5;
    } while (segundo >= 0x20);
    latitud += r & 1 ? ~(r >> 1) : r >> 1;
    sh = 0;
    r = 0;
    do {
      segundo = enc.charCodeAt(indice++) - 63;
      r |= (segundo & 0x1f) << sh;
      sh += 5;
    } while (segundo >= 0x20);
    longitud += r & 1 ? ~(r >> 1) : r >> 1;
    puntos.push({ latitude: latitud / 1e5, longitude: longitud / 1e5 });
  }
  if (puntos.length === 0 || puntos.length === 1 && distancia !== 0 ||
    puntos.some(punto => !Number.isFinite(punto.latitude) || !Number.isFinite(punto.longitude))) {
    throw new Error('Geometría de ruta inválida');
  }
  return puntos;
};

export function usarRutaViajeActivo(
  viaje: ActivoViaje | null, esEnfocado: boolean, esMontadoReferencia: RefObject<boolean>, esPasajero: boolean
) {
  const [rutaTrazada, establecerRutaTrazada] = usarEstado<{
    clave: string; puntos: Array<{ latitude: number; longitude: number }>;
  } | null>(null);
  const [estimacion, establecerEstimacion] = usarEstado<{ clave: string; minutos: number | null } | null>(null);
  const claveEstimacion = viaje ? `${viaje.rideId}:${viaje.status}` : '';
  const minutosEstimados = estimacion?.clave === claveEstimacion ? estimacion.minutos : null;
  const viajeIniciado = viaje?.status === 'en_curso' || viaje?.status === 'completing';
  const haciaRecogida = viaje?.status === 'aceptado';
  const claveTrazado = viaje?.rideId + ':' + (haciaRecogida ? 'hacia-recogida' : viajeIniciado ? 'conductor' : 'recogida');
  const rutaCoordenadas = rutaTrazada?.clave === claveTrazado ? rutaTrazada.puntos : null;
  const [rutaError, establecerRutaError] = usarEstado(false);
  const recalculoReferencia = usarReferencia({ muestras: 0, ultimoIntento: 0, pendiente: false, generacion: 0 });
  const [rutaReintentar, establecerRutaReintentar] = usarEstado(0);

  const rutaVisible = !!viaje && (['llegado', 'en_curso'].includes(viaje.status) || haciaRecogida && !esPasajero);
  const rutaPuntoClave = viaje ? (haciaRecogida ? [viaje.pickupLocation] : [
  viaje.pickupLocation,
  ...(viaje.waypoints || []).filter(parada => !viajeIniciado || (!parada.arrivedAt && !parada.departedAt)).map(parada => parada.location),
  viaje.dropoffLocation]).
  map((punto) => `${punto.latitude},${punto.longitude}`).join(';') : '';

  usarEfecto(() => {
    const id = viaje?.rideId;
    if (!esEnfocado || !id || (!haciaRecogida && viaje?.status !== 'en_curso')) return;
    let vigente = true;
    let pendiente = false;
    const actualizar = async () => {
      if (pendiente) return;
      pendiente = true;
      try {
        const { duration } = await viajesServicio.obtenerRutaViaje(id, !haciaRecogida, haciaRecogida);
        if (vigente) establecerEstimacion({ clave: claveEstimacion, minutos: minutosDeRuta(duration) });
      } catch {
        if (vigente) establecerEstimacion(null);
      } finally {
        pendiente = false;
      }
    };
    if (haciaRecogida && esPasajero) void actualizar();
    const intervalo = setInterval(actualizar, 45000);
    return () => {
      vigente = false;
      clearInterval(intervalo);
    };
  }, [viaje?.rideId, viaje?.status, esPasajero, haciaRecogida, esEnfocado, claveEstimacion]);

  usarEfecto(() => {
    const control = recalculoReferencia.current;
    control.generacion++;
    control.muestras = 0;
    control.ultimoIntento = 0;
    control.pendiente = false;
    if (!viaje || !rutaVisible) {
      if (!viajeIniciado) establecerRutaTrazada(null);
      establecerRutaError(false);
      return;
    }
    if (!esEnfocado) return;
    let cancelado = false;
    let reintento: ReturnType<typeof setTimeout> | undefined;
    establecerRutaTrazada(null);
    establecerRutaError(false);
    (async () => {
      try {
        const { polyline: polilinea, duration, distance } = await viajesServicio.obtenerRutaViaje(viaje.rideId, viaje.status === 'en_curso', haciaRecogida);
        const coordenadas = decodificarPolilinea(polilinea, distance);
        if (!cancelado) {
          establecerRutaTrazada({ clave: claveTrazado, puntos: coordenadas });
          if (viaje.status === 'en_curso' || haciaRecogida) {
            establecerEstimacion({ clave: claveEstimacion, minutos: minutosDeRuta(duration) });
          }
        }
      } catch {
        if (!cancelado) {
          establecerRutaError(true);
          reintento = setTimeout(() => establecerRutaReintentar((valor) => valor + 1),
            viaje.status === 'llegado' || haciaRecogida ? 5000 : 30000);
        }
      }
    })();
    return () => {
      cancelado = true;
      if (reintento !== undefined) clearTimeout(reintento);
      control.generacion++;
    };
  }, [viaje?.rideId, viaje?.status, rutaVisible, rutaPuntoClave, rutaReintentar, claveTrazado, claveEstimacion, viajeIniciado, haciaRecogida, !!viaje?.driverLocation, esEnfocado]);

  usarEfecto(() => {
    const punto = viaje?.driverLocation;
    const control = recalculoReferencia.current;
    if (!esEnfocado || !viaje || (viaje.status !== 'en_curso' && !haciaRecogida) || !punto ||
      !rutaCoordenadas || control.pendiente) return;
    if (!actualizarDesvio(control, distanciaARuta(punto, rutaCoordenadas), Date.now())) return;
    control.pendiente = true;
    const generacion = control.generacion;
    viajesServicio.obtenerRutaViaje(viaje.rideId, !haciaRecogida, haciaRecogida).then(({ polyline, duration, distance }) => {
      if (!esMontadoReferencia.current || generacion !== control.generacion) return;
      const puntos = decodificarPolilinea(polyline, distance);
      establecerRutaTrazada({ clave: claveTrazado, puntos });
      establecerEstimacion({ clave: claveEstimacion, minutos: minutosDeRuta(duration) });
      establecerRutaError(false);
    }).catch(() => {
      // Conservar la ruta visible; las siguientes posiciones reintentan tras la pausa.
    }).finally(() => {
      if (generacion === control.generacion) control.pendiente = false;
    });
  }, [viaje?.driverLocation, viaje?.status, viaje?.rideId, rutaCoordenadas, esEnfocado, haciaRecogida, claveTrazado, claveEstimacion]);

  return { viajeIniciado, minutosEstimados, rutaCoordenadas, rutaError, establecerRutaReintentar };
}
