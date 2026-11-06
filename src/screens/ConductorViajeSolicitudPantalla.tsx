import { MAPA_CLARO } from '../theme/mapa';
import { iniciarAdaptativaSincronizacion as inicioAdaptiveSincronizar } from "../utils/adaptativaSincronizar";
import { ofertaSegundosIzquierda } from "../utils/ofertaCountdown";
import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import RapidoReservaCard from "../components/RapidaReservaTarjeta";
import { tiempoRestanteReserva } from '../utils/tiempoReserva';
import Toast from "../components/Aviso";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import { RapidaAsignacionViaje as RapidoAsignacionViaje } from "../types/rapidaAsignacion";
import React, { useState as usarEstado, useEffect as usarEfecto, useRef as usarReferencia, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  ActivityIndicator as ActividadIndicador,
  FlatList as FlatLista,
  Modal,
  ScrollView as DesplazableVista,
  Image as Imagen,
  RefreshControl as RenovarControl,
  Platform as Plataforma,
  AppState as AplicacionEstado } from
'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapaVista, { Marker, LatLng as LatitudLongitud, Polyline } from 'react-native-maps';
import { SafeAreaView as SeguraZonaVista, useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion, useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import type { NativeStackNavigationProp as NativoPilaNavegacionPropiedad } from '@react-navigation/native-stack';
import {
  Bell,
  CircleHelp as CircleAyuda,
  History as Historial,
  Menu,
  MessageCircle as MensajeCircle,
  Settings as Ajustes,
  User as Usuario,
  Power,
  Radio,
  Clock3 as Reloj3,
  CircleX } from
'lucide-react-native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import usarViajes from "../hooks/usarRides";
import { viajesServicio } from "../services/viajes.servicio";
import socketServicio from "../services/socket.servicio";
import { desconectarConductorEnSegundoPlano as disconnectConductorEnFondo } from "../services/conductorDisponibilidad.servicio";

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  primaryMid: '#A855F7',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  overlay: 'rgba(15, 23, 42, 0.6)'
};

const LOCATIONIQ_API_CLAVE = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

interface ViajeSolicitud {
  id: string;
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  passengerProfilePhoto?: string | null;
  passengerRating: number;
  pickupLocation: {latitude: number;longitude: number;address: string;};
  dropoffLocation: {latitude: number;longitude: number;address: string;};
  waypoints?: {latitude: number;longitude: number;address: string;sequence: number;}[];
  fare: number;
  distance: number;
  duration: number;
  notes?: string;
  createdAt?: string;
  expiresAt?: string;
}

// ─── Passenger Avatar ─────────────────────────────────────────────────────────
const PasajeroAvatar = ({
  photo: foto,
  name: nombre,
  size: tamano = 40




}: {photo?: string | null;name: string;size?: number;}) => {
  const letras = nombre.
  split(' ').
  map((w) => w[0]).
  join('').
  toUpperCase().
  slice(0, 2);
  const radio = tamano / 2;
  if (foto) {
    return (
      <Imagen
        source={privadoImagenOrigen(foto)}
        style={{
          width: tamano,
          height: tamano,
          borderRadius: radio,
          backgroundColor: THEME.border
        }} />);


  }
  return (
    <Vista
      style={{
        width: tamano,
        height: tamano,
        borderRadius: radio,
        backgroundColor: THEME.primaryLight,
        alignItems: 'center',
        justifyContent: 'center'
      }}>

      <Texto
        style={{
          fontSize: tamano * 0.35,
          fontWeight: '700',
          color: THEME.primary
        }}>

        {letras}
      </Texto>
    </Vista>);

};

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divisor = () => <Vista style={estilos.divider} />;

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────
const ConductorViajeSolicitudPantalla = () => {
  const navegacion = usarNavegacion<NativoPilaNavegacionPropiedad<any>>();
  const margenes = usarSeguraZonaMargenes();
  const { user: usuario, isDriverMode: esConductorModo } = usarAutenticacion();
  const { obtenerSolicitudesViaje: obtenerViajeSolicitudes } = usarViajes();

  // Restricción: DriverRideRequestScreen solo para conductores
  usarEnfoqueEfecto(
    React.useCallback(() => {
      if (!esConductorModo) {
        Alert.alert(
          'Acceso denegado',
          'Solo los conductores aprobados pueden aceptar viajes. Cambia a modo conductor en tu perfil.',
          [
          {
            text: 'Ir a perfil',
            onPress: () => navegacion.navigate('Profile')
          }]

        );
        // Redirigir a Map
        (navegacion as any).navigate('Map');
      }
    }, [esConductorModo, navegacion])
  );

  const [esDisponible, establecerEsDisponible] = usarEstado(() => socketServicio.esConductorConectado());
  const [rapidoReserva, establecerRapidoReserva] = usarEstado<RapidoAsignacionViaje | null>(null);
  const [rapidoSegundosRestantes, establecerRapidoSegundosRestantes] = usarEstado<number | null>(null);
  const [reservaAviso, establecerReservaAviso] = usarEstado('');
  const rapidoReservaReferencia = usarReferencia<RapidoAsignacionViaje | null>(null);
  const rapidoNavegacionReferencia = usarReferencia<string | null>(null);

  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    let activo = true;
    let renovando = false;
    rapidoNavegacionReferencia.current = null;
    const renovar = async () => {
      if (renovando) return;
      renovando = true;
      try {
        const datos = await viajesServicio.obtenerAsignacionRapidaActual('conductor');
        const viaje = datos.ride;
        if (!activo) return;
        establecerRapidoSegundosRestantes(tiempoRestanteReserva(datos));
        if (viaje?.status === 'solicitado') {
          rapidoReservaReferencia.current = viaje;
          establecerRapidoReserva(viaje);
          establecerReservaAviso('');
          establecerMostrarDetallesModal(false);
          establecerSeleccionadoViaje(null);
          establecerMostrarEsperandoCapa(false);
          establecerEsperandoViaje(null);
          if (esperandoTemporizadorReferencia.current) clearInterval(esperandoTemporizadorReferencia.current);
          establecerViajes([]);
        } else {
          if (rapidoReservaReferencia.current && !viaje) establecerReservaAviso('Vuelves a estar en línea');
          rapidoReservaReferencia.current = null;
          establecerRapidoReserva(null);
          if (viaje && rapidoNavegacionReferencia.current !== viaje.id) {
            rapidoNavegacionReferencia.current = viaje.id;
            navegacion.navigate('ActiveRide', { rideId: viaje.id });
          }
        }
      } catch {/* Keep a known reservation blocked until the server confirms its release. */} finally
      {renovando = false;}
    };
    const parada = inicioAdaptiveSincronizar(renovar, () =>
    rapidoReservaReferencia.current ? 1000 : esDisponible && !socketServicio.esConectado() ? 5000 : null,
    ['ride:assignment']
    );
    return () => {activo = false;parada();};
  }, [navegacion, esDisponible]));

  const [esCargando, establecerEsCargando] = usarEstado(true);
  const [disponibilidadPendiente, establecerDisponibilidadPendiente] = usarEstado<'online' | 'offline' | null>(null);
  const disponibilidadCambioReferencia = usarReferencia(false);
  const confirmedDisponibilidadReferencia = usarReferencia<boolean | null>(null);
  const [viajes, establecerViajes] = usarEstado<ViajeSolicitud[]>([]);
  const [aceptandoViajeId, establecerAceptandoViajeId] = usarEstado<string | null>(null);
  const [seleccionadoViaje, establecerSeleccionadoViaje] = usarEstado<ViajeSolicitud | null>(null);
  const [mostrarDetallesModal, establecerMostrarDetallesModal] = usarEstado(false);
  const [rutaCoordenadas, establecerRutaCoordenadas] = usarEstado<LatitudLongitud[]>([]);
  const [mapaCargando, establecerMapaCargando] = usarEstado(false);
  const [detalleMapaListo, establecerDetalleMapaListo] = usarEstado(false);
  const [detalleMapaLaidFuera, establecerDetalleMapaLaidFuera] = usarEstado(false);
  const [mostrarEsperandoCapa, establecerMostrarEsperandoCapa] = usarEstado(false);
  const [esperandoViaje, establecerEsperandoViaje] = usarEstado<ViajeSolicitud | null>(null);
  const [esperandoPrecio, establecerEsperandoPrecio] = usarEstado<number | null>(null);
  const [esperandoTiempoIzquierda, establecerEsperandoTiempoIzquierda] = usarEstado(0);
  const [realOfertaId, establecerRealOfertaId] = usarEstado<string | null>(null);
  const [ofertaRechazado, establecerOfertaRechazado] = usarEstado(false);
  const [ofertaEstado, establecerOfertaEstado] = usarEstado<
    'waiting' | 'rechazado' | 'vencido'>(
    'waiting');

  const mapaReferencia = usarReferencia<MapaVista>(null);
  const rutaSolicitudReferencia = usarReferencia(0);
  const esperandoTemporizadorReferencia = usarReferencia<ReturnType<typeof setInterval> | null>(null);
  const esperandoVenceEnReferencia = usarReferencia<string | null>(null);
  const esperandoServidorDesplazamientoReferencia = usarReferencia(0);

  const esMontadoReferencia = usarReferencia(true);
  const solicitudesRevisionReferencia = usarReferencia(0);
  const rechazadoViajeIdsReferencia = usarReferencia(new Set<string>());
  const seleccionadoViajeReferencia = usarReferencia<ViajeSolicitud | null>(null);

  usarEfecto(() => {
    seleccionadoViajeReferencia.current = seleccionadoViaje;
  }, [seleccionadoViaje]);

  const quitarRechazadoViaje = usarFuncionRetorno((viajeId: string) => {
    rechazadoViajeIdsReferencia.current.add(viajeId);
    solicitudesRevisionReferencia.current++;
    establecerViajes((anterior) => anterior.filter((viaje) => viaje.rideId !== viajeId));
    if (seleccionadoViajeReferencia.current?.rideId === viajeId) {
      establecerMostrarDetallesModal(false);
      establecerSeleccionadoViaje(null);
      establecerRutaCoordenadas([]);
    }
  }, []);

  usarEfecto(() => {
    const manejarRechazadoOferta = (datos: any) => {
      if (datos?.accepted === false && datos?.rideId) quitarRechazadoViaje(datos.rideId);
    };
    const manejarViajeCancelado = (datos: any) => {
      if (datos?.rideId) quitarRechazadoViaje(datos.rideId);
    };
    socketServicio.conectar();
    socketServicio.al('offer:result', manejarRechazadoOferta);
    socketServicio.al('ride:request:cancelled', manejarViajeCancelado);
    return () => {
      socketServicio.desactivado('offer:result', manejarRechazadoOferta);
      socketServicio.desactivado('ride:request:cancelled', manejarViajeCancelado);
    };
  }, [quitarRechazadoViaje]);

  usarEfecto(() => socketServicio.alDisponibilidadRestablecida(() => establecerEsDisponible(true)), []);

  usarEfecto(() => {
    if (!esConductorModo) return;
    const suscripcion = AplicacionEstado.addEventListener('change', (estado) => {
      if (estado !== 'background') return;
      if (socketServicio.tieneActivoViaje() || socketServicio.debeRestablecerDespuesViajeSegundoPlano()) return;
      confirmedDisponibilidadReferencia.current = false;
      establecerEsDisponible(false);
      establecerViajes([]);
    });
    return () => suscripcion.remove();
  }, [esConductorModo]);

  // 🔌 Socket: sincronizar disponibilidad del conductor
  usarEfecto(() => {
    if (!esConductorModo) return;
    if (confirmedDisponibilidadReferencia.current === esDisponible) {
      confirmedDisponibilidadReferencia.current = null;
      return;
    }
    let activo = true;
    if (esDisponible) {
      // Intentar obtener posición GPS real antes de ponerse online
      Geolocation.getCurrentPosition(
        (posicion: {coords: {latitude: number;longitude: number;};}) => {
          if (!activo || AplicacionEstado.currentState !== 'active') return;
          socketServicio.irConectado({
            latitude: posicion.coords.latitude,
            longitude: posicion.coords.longitude
          });
        },
        () => {
          // Si no hay GPS disponible, ponerse online sin coordenadas
          if (activo && AplicacionEstado.currentState === 'active') socketServicio.irConectado();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
      );
    } else {
      socketServicio.irDesconectado();
    }
    return () => {activo = false;};
  }, [esDisponible, esConductorModo]);

  usarEfecto(() => {
    if (!esDisponible || !esConductorModo) return;
    let activo = true;
    let consultando = false;
    const renovarUbicacion = () => {
      if (!activo || consultando || AplicacionEstado.currentState !== 'active' || disponibilidadCambioReferencia.current) return;
      consultando = true;
      Geolocation.getCurrentPosition((posicion) => {
        consultando = false;
        if (activo && AplicacionEstado.currentState === 'active' && !disponibilidadCambioReferencia.current) {
          socketServicio.irConectado({ latitude: posicion.coords.latitude, longitude: posicion.coords.longitude });
        }
      }, () => { consultando = false; }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 });
    };
    const temporizador = setInterval(renovarUbicacion, 15000);
    const suscripcion = AplicacionEstado.addEventListener('change', estado => {
      if (estado === 'active') renovarUbicacion();
    });
    return () => { activo = false; clearInterval(temporizador); suscripcion.remove(); };
  }, [esDisponible, esConductorModo]);

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      esMontadoReferencia.current = true;

      if (esDisponible && !mostrarEsperandoCapa && !rapidoReserva) {
        const paradaSincronizar = inicioAdaptiveSincronizar(cargarViajeSolicitudes,
        () => socketServicio.esConectado() ? null : 5000);

        // 🔌 Socket: recibir nuevas solicitudes en tiempo real
        const manejarNuevoSolicitud = (datos: any) => {
          if (!esMontadoReferencia.current || !esDisponible || rechazadoViajeIdsReferencia.current.has(datos?.rideId)) return;
          const nuevoViaje: ViajeSolicitud = {
            id: datos.rideId,
            rideId: datos.rideId,
            passengerName: datos.passengerName || 'Pasajero',
            passengerPhone: datos.passengerPhone || '',
            passengerProfilePhoto: datos.passengerProfilePhoto || null,
            passengerRating: datos.passengerRating || 5.0,
            pickupLocation: {
              latitude: datos.pickupLocation?.latitude ?? -16.5,
              longitude: datos.pickupLocation?.longitude ?? -68.15,
              address: datos.pickupAddress || 'Ubicación de recogida'
            },
            dropoffLocation: {
              latitude: datos.dropoffLocation?.latitude ?? -16.4,
              longitude: datos.dropoffLocation?.longitude ?? -68.1,
              address: datos.dropoffAddress || 'Ubicación de destino'
            },
            waypoints: (datos.waypoints ?? []).map((parada: any, indice: number) => ({
              latitude: parada.latitude,
              longitude: parada.longitude,
              address: parada.address,
              sequence: parada.sequence ?? indice + 1
            })),
            fare: datos.fare ?? 0,
            distance: (datos.distance ?? 0) / 1000,
            duration: Math.floor((datos.duration ?? 0) / 60),
            createdAt: datos.createdAt || new Date().toISOString(),
            expiresAt: datos.expiresAt
          };
          solicitudesRevisionReferencia.current++;
          establecerViajes((anterior) => anterior.some((viaje) => viaje.rideId === datos.rideId) ? anterior : [nuevoViaje, ...anterior]);
          establecerEsCargando(false);
        };

        socketServicio.al('ride:new_request', manejarNuevoSolicitud);

        return () => {
          paradaSincronizar();
          solicitudesRevisionReferencia.current++;
          socketServicio.desactivado('ride:new_request', manejarNuevoSolicitud);

        };
      }

      return () => {};
    }, [esDisponible, mostrarEsperandoCapa, rapidoReserva])
  );

  usarEfecto(() => {
    return () => {
      esMontadoReferencia.current = false;
      if (esperandoTemporizadorReferencia.current) {
        clearInterval(esperandoTemporizadorReferencia.current);
        esperandoTemporizadorReferencia.current = null;
      }
    };
  }, []);

  // Remove expired cards locally without network requests.
  usarEfecto(() => {
    const deadlines = viajes.map((viaje) => Date.parse(viaje.expiresAt ?? '')).filter(Number.isFinite);
    if (!deadlines.length) return;
    const temporizador = setTimeout(() => {
      const ahora = Date.now();
      establecerViajes((anterior) => anterior.filter((viaje) => !viaje.expiresAt || Date.parse(viaje.expiresAt) > ahora));
    }, Math.max(0, Math.min(...deadlines) - Date.now()));
    return () => clearTimeout(temporizador);
  }, [viajes]);

  // Synchronize on focus, reconnection, foreground, or socket fallback.
  const cargarViajeSolicitudes = usarFuncionRetorno(async () => {
    if (!esMontadoReferencia.current || rapidoReservaReferencia.current) return;
    const iniciadoEnRevision = solicitudesRevisionReferencia.current;
    establecerEsCargando(true);
    try {
      const solicitudes = await obtenerViajeSolicitudes();
      if (!esMontadoReferencia.current || rapidoReservaReferencia.current || iniciadoEnRevision !== solicitudesRevisionReferencia.current) return;
      const transformado = (solicitudes || []).filter((solicitud: any) => !rechazadoViajeIdsReferencia.current.has(solicitud.rideId)).map((solicitud: any) => ({
        id: solicitud.rideId,
        rideId: solicitud.rideId,
        passengerName: solicitud.passengerName || 'Pasajero',
        passengerPhone: solicitud.passengerPhone || '',
        passengerProfilePhoto: solicitud.passengerProfilePhoto || null,
        passengerRating: solicitud.passengerRating || 5.0,
        pickupLocation: {
          latitude: solicitud.pickupLocation?.latitude ?? -16.5,
          longitude: solicitud.pickupLocation?.longitude ?? -68.15,
          address: solicitud.pickupLocation?.address || 'Ubicación de recogida'
        },
        dropoffLocation: {
          latitude: solicitud.dropoffLocation?.latitude ?? -16.4,
          longitude: solicitud.dropoffLocation?.longitude ?? -68.1,
          address: solicitud.dropoffLocation?.address || 'Ubicación de destino'
        },
        waypoints: (solicitud.waypoints ?? []).map((parada: any, indice: number) => ({
          latitude: parada.latitude,
          longitude: parada.longitude,
          address: parada.address,
          sequence: parada.sequence ?? indice + 1
        })).sort((primero: {sequence: number;}, segundo: {sequence: number;}) => primero.sequence - segundo.sequence),
        fare: solicitud.fare ?? 0,
        distance: (solicitud.distance ?? 0) / 1000,
        duration: Math.floor((solicitud.duration ?? 0) / 60),
        createdAt: solicitud.createdAt || new Date().toISOString(),
        expiresAt: solicitud.expiresAt
      }));
      establecerViajes(transformado);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('[loadRideRequests]', error.message);
      }
    } finally {
      if (esMontadoReferencia.current) establecerEsCargando(false);
    }
  }, [obtenerViajeSolicitudes]);

  const decodificarPolilinea = (encoded: string): LatitudLongitud[] => {
    const puntos: LatitudLongitud[] = [];
    let indice = 0,
      latitud = 0,
      longitud = 0;
    while (indice < encoded.length) {
      let resultado = 0,
        shift = 0,
        segundo;
      do {
        segundo = encoded.charCodeAt(indice++) - 63;
        resultado |= (segundo & 0x1f) << shift;
        shift += 5;
      } while (segundo >= 0x20);
      const dlat = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
      latitud += dlat;
      resultado = 0;
      shift = 0;
      do {
        segundo = encoded.charCodeAt(indice++) - 63;
        resultado |= (segundo & 0x1f) << shift;
        shift += 5;
      } while (segundo >= 0x20);
      const dlng = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
      longitud += dlng;
      puntos.push({ latitude: latitud / 1e5, longitude: longitud / 1e5 });
    }
    return puntos;
  };

  const calcularRutaParaViaje = usarFuncionRetorno(async (viaje: ViajeSolicitud) => {
    const solicitudVersion = ++rutaSolicitudReferencia.current;
    try {
      establecerMapaCargando(true);
      const rutaPuntos = [viaje.pickupLocation, ...(viaje.waypoints ?? []), viaje.dropoffLocation];
      const url = `${LOCATIONIQ_BASE_URL}/directions/driving/${rutaPuntos.map((punto) => `${punto.longitude},${punto.latitude}`).join(';')}?key=${LOCATIONIQ_API_CLAVE}&overview=full&geometries=polyline&alternatives=false&steps=true`;
      const respuesta = await fetch(url);
      const datos = await respuesta.json();
      if (solicitudVersion !== rutaSolicitudReferencia.current) return;
      if (datos.routes?.length > 0) {
        const coordenadas = decodificarPolilinea(datos.routes[0].geometry);
        establecerRutaCoordenadas(coordenadas);
      }
    } catch {
      if (solicitudVersion === rutaSolicitudReferencia.current) establecerRutaCoordenadas([
      viaje.pickupLocation,
      ...(viaje.waypoints ?? []),
      viaje.dropoffLocation]
      );
    } finally {
      if (solicitudVersion === rutaSolicitudReferencia.current) establecerMapaCargando(false);
    }
  }, []);

  const manejarSeleccionarViaje = (viaje: ViajeSolicitud) => {
    if (rapidoReservaReferencia.current) return;
    establecerRutaCoordenadas([]);
    establecerSeleccionadoViaje(viaje);
    establecerMostrarDetallesModal(true);
    calcularRutaParaViaje(viaje);
  };

  usarEfecto(() => {
    if (!mostrarDetallesModal || !seleccionadoViaje || !detalleMapaListo || !detalleMapaLaidFuera) return;
    const puntos = rutaCoordenadas.length > 1 ?
    rutaCoordenadas :
    [seleccionadoViaje.pickupLocation, seleccionadoViaje.dropoffLocation];
    const temporizador = setTimeout(() => {
      mapaReferencia.current?.fitToCoordinates(puntos, {
        edgePadding: { top: 42, right: 44, bottom: 42, left: 44 },
        animated: true
      });
    }, 250);
    return () => clearTimeout(temporizador);
  }, [mostrarDetallesModal, seleccionadoViaje, rutaCoordenadas, detalleMapaListo, detalleMapaLaidFuera]);

  const manejarCerrarModal = () => {
    rutaSolicitudReferencia.current++;
    establecerMostrarDetallesModal(false);
    establecerSeleccionadoViaje(null);
    establecerRutaCoordenadas([]);
  };

  usarEfecto(() => {
    if (!seleccionadoViaje || !mostrarDetallesModal) return;
    if (!viajes.some((r) => r.id === seleccionadoViaje.id)) {
      Alert.alert(
        'Solicitud no disponible',
        'Esta solicitud fue cancelada o expiró.',
        [{ text: 'Entendido', onPress: manejarCerrarModal }]
      );
    }
  }, [viajes, seleccionadoViaje, mostrarDetallesModal]);

  usarEfecto(() => {
    if (!mostrarEsperandoCapa || !esperandoViaje) return;
    let vigente = true;
    let finalizado = false;
    const idViaje = esperandoViaje.rideId;

    // 🔌 Resultado de oferta en tiempo real via WebSocket
    const manejarOfertaResultado = (datos: any) => {
      if (finalizado || datos?.rideId !== idViaje) return;
      finalizado = true;
      if (esperandoTemporizadorReferencia.current) {
        clearInterval(esperandoTemporizadorReferencia.current);
        esperandoTemporizadorReferencia.current = null;
      }
      if (datos.accepted) {
        establecerMostrarEsperandoCapa(false);
        establecerEsperandoViaje(null);
        establecerEsperandoPrecio(null);
        establecerRealOfertaId(null);
        establecerOfertaRechazado(false);
        establecerOfertaEstado('waiting');
        navegacion.navigate('ActiveRide', {
          rideId: esperandoViaje.rideId,
          confirmationMessage: '¡Oferta aceptada!'
        });
      } else {
        establecerOfertaEstado('rechazado');
        establecerOfertaRechazado(true);
        establecerRealOfertaId(null);
        setTimeout(() => {
          establecerMostrarEsperandoCapa(false);
          establecerOfertaRechazado(false);
          establecerOfertaEstado('waiting');
          establecerEsperandoViaje(null);
          establecerEsperandoPrecio(null);
        }, 2500);
      }
    };

    const manejarViajeCancelado = (datos: any) => {
      if (finalizado || datos?.rideId !== idViaje) return;
      finalizado = true;
      quitarRechazadoViaje(idViaje);
      if (esperandoTemporizadorReferencia.current) {
        clearInterval(esperandoTemporizadorReferencia.current);
        esperandoTemporizadorReferencia.current = null;
      }
      establecerMostrarEsperandoCapa(false);
      establecerOfertaEstado('waiting');
      establecerOfertaRechazado(false);
      establecerRealOfertaId(null);
      establecerEsperandoViaje(null);
      establecerEsperandoPrecio(null);
    };
    const manejarViajeEstadoCambiado = (datos: any) => {
      if (datos?.status === 'cancelado' || datos?.status === 'vencido') manejarViajeCancelado(datos);
    };
    const consultarEstado = async () => {
      if (finalizado) return;
      const viaje = await viajesServicio.obtenerViajePorId(idViaje);
      if (vigente) manejarViajeEstadoCambiado({ rideId: idViaje, status: viaje?.status });
    };

    socketServicio.al('offer:result', manejarOfertaResultado);
    socketServicio.al('ride:status:changed', manejarViajeEstadoCambiado);
    socketServicio.al('ride:request:cancelled', manejarViajeCancelado);
    const detenerConsultas = inicioAdaptiveSincronizar(consultarEstado, () => finalizado ? null : 4000);

    return () => {
      vigente = false;
      detenerConsultas();
      socketServicio.desactivado('offer:result', manejarOfertaResultado);
      socketServicio.desactivado('ride:status:changed', manejarViajeEstadoCambiado);
      socketServicio.desactivado('ride:request:cancelled', manejarViajeCancelado);
    };
  }, [mostrarEsperandoCapa, esperandoViaje, navegacion, quitarRechazadoViaje]);

  const manejarEnviarOferta = async (viaje: ViajeSolicitud, precio: number) => {
    if (rapidoReservaReferencia.current) return;
    establecerAceptandoViajeId(viaje.id);
    try {
      const respuesta = await viajesServicio.enviarContraoferta(viaje.id, precio);
      if (rechazadoViajeIdsReferencia.current.has(viaje.id)) {
        establecerAceptandoViajeId(null);
        return;
      }
      const ofertaId = respuesta?.offerId || `${viaje.id}-${Date.now()}`;

      const venceEn = respuesta?.expiresAt;
      if (!venceEn || !Number.isFinite(Date.parse(venceEn))) {
        throw new Error('No se recibió el vencimiento de la oferta.');
      }
      esperandoVenceEnReferencia.current = venceEn;
      esperandoServidorDesplazamientoReferencia.current = respuesta.serverOffsetMs ?? 0;

      establecerRealOfertaId(ofertaId);
      establecerOfertaRechazado(false);
      establecerMostrarDetallesModal(false);
      establecerSeleccionadoViaje(null);
      establecerRutaCoordenadas([]);
      establecerEsperandoViaje(viaje);
      establecerEsperandoPrecio(precio);
      establecerMostrarEsperandoCapa(true);
      establecerEsperandoTiempoIzquierda(ofertaSegundosIzquierda(venceEn, Date.now(), esperandoServidorDesplazamientoReferencia.current));
      establecerOfertaEstado('waiting');

      if (esperandoTemporizadorReferencia.current) clearInterval(esperandoTemporizadorReferencia.current);
      esperandoTemporizadorReferencia.current = setInterval(() => {
        const restante = ofertaSegundosIzquierda(
          esperandoVenceEnReferencia.current ?? undefined,
          Date.now(),
          esperandoServidorDesplazamientoReferencia.current
        );
        establecerEsperandoTiempoIzquierda(restante);
        if (restante === 0) {
          if (esperandoTemporizadorReferencia.current) {
            clearInterval(esperandoTemporizadorReferencia.current);
            esperandoTemporizadorReferencia.current = null;
          }
          // Oferta expiró por tiempo — mostrar mensaje y volver a lista
          establecerOfertaEstado('vencido');
          establecerOfertaRechazado(true);
          setTimeout(() => {
            establecerMostrarEsperandoCapa(false);
            establecerOfertaRechazado(false);
            establecerOfertaEstado('waiting');
            establecerEsperandoViaje(null);
            establecerEsperandoPrecio(null);
            establecerRealOfertaId(null);
          }, 2500);
          establecerAceptandoViajeId(null);
        }
      }, 1000);
      establecerAceptandoViajeId(null);
    } catch (error: any) {
      if (error?.data?.code === 'OFFER_REJECTED') quitarRechazadoViaje(viaje.id);else
      Alert.alert('Error', error?.data?.error || error?.message || 'No se pudo enviar la oferta');
      establecerAceptandoViajeId(null);
    }
  };

  // ─── Ride Card (Ultra Modern & Minimalist) ──────────────────────────────────
  const representarViajeTarjeta = ({ item: elemento }: {item: ViajeSolicitud;}) => {
    const esThisAceptando = aceptandoViajeId === elemento.id;
    return (
      <Vista style={estilos.modernCard}>
        {/* Main card body clickable to open map/details */}
        <PulsableOpacidad style={estilos.cardHeaderArea} onPress={() => manejarSeleccionarViaje(elemento)} activeOpacity={0.8}>
          <Vista style={estilos.cardPassengerRow}>
            <PasajeroAvatar photo={elemento.passengerProfilePhoto} name={elemento.passengerName} size={38} />
            <Vista style={estilos.cardPassengerInfo}>
              <Texto style={estilos.cardPassengerName} numberOfLines={1}>{elemento.passengerName}</Texto>
              <Vista style={estilos.tripMetaRow}>
                <Vista style={estilos.starRatingBadge}>
                  <Texto style={estilos.starIcon}>★</Texto>
                  <Texto style={estilos.starText}>{elemento.passengerRating.toFixed(1)}</Texto>
                </Vista>
                <Texto style={estilos.metaBullet}>•</Texto>
                <Texto style={estilos.tripMetaText}>{elemento.distance.toFixed(1)} km</Texto>
                <Texto style={estilos.metaBullet}>•</Texto>
                <Texto style={estilos.tripMetaText}>~{elemento.duration} min</Texto>
              </Vista>
            </Vista>
            <Vista style={estilos.cardPriceBox}>
              <Texto style={estilos.cardPriceAmount}>Bs {elemento.fare.toFixed(2)}</Texto>
              <Texto style={estilos.cardPriceSub}>Tarifa ofrecida</Texto>
            </Vista>
          </Vista>

          <Vista style={estilos.cardRouteTimeline}>
            <Vista style={estilos.routeRow}>
              <Vista style={estilos.routeIcon}><PasajeroMapaIcono size={28} bare /></Vista>
              <Texto style={estilos.routeAddressText} numberOfLines={1}>{elemento.pickupLocation.address}</Texto>
            </Vista>
            <Vista style={estilos.routeLineConnector} />
            {(elemento.waypoints ?? []).map((parada) =>
            <React.Fragment key={parada.sequence}>
                <Vista style={estilos.routeRow}>
                  <Vista style={estilos.routeIcon}><ParadaMapaIcon number={parada.sequence} size={28} /></Vista>
                  <Texto style={estilos.routeAddressText} numberOfLines={1}>{parada.address}</Texto>
                </Vista>
                <Vista style={estilos.routeLineConnector} />
              </React.Fragment>
            )}
            <Vista style={estilos.routeRow}>
              <Vista style={estilos.routeIcon}><DestinoIndicadorIcon size={28} bare /></Vista>
              <Texto style={estilos.routeAddressText} numberOfLines={1}>{elemento.dropoffLocation.address}</Texto>
            </Vista>
          </Vista>

          {elemento.notes ?
          <Vista style={estilos.cardNotesBadge}>
              <MensajeCircle size={13} color={THEME.primary} />
              <Texto style={estilos.cardNotesText} numberOfLines={1}>"{elemento.notes}"</Texto>
            </Vista> :
          null}
        </PulsableOpacidad>

        <Vista style={estilos.cardActionsContainer}>
          <Vista style={estilos.cardPrimaryRow}>
            <PulsableOpacidad
              style={estilos.cardPrimaryAcceptBtn}
              onPress={() => manejarEnviarOferta(elemento, elemento.fare)}
              disabled={aceptandoViajeId !== null}
              activeOpacity={0.85}>

              {esThisAceptando ?
              <ActividadIndicador size="small" color="#FFFFFF" /> :

              <Texto style={estilos.cardPrimaryAcceptText}>
                  Aceptar • Bs {elemento.fare.toFixed(2)}
                </Texto>
              }
            </PulsableOpacidad>

            <PulsableOpacidad
              style={estilos.cardIncrementBtn}
              onPress={() => manejarEnviarOferta(elemento, elemento.fare + 2)}
              disabled={aceptandoViajeId !== null}
              activeOpacity={0.85}
              accessibilityLabel={`Ofertar ${elemento.fare + 2} bolivianos`}>

              <Texto style={estilos.cardIncrementText}>+2</Texto>
            </PulsableOpacidad>

            <PulsableOpacidad
              style={estilos.cardIncrementBtn}
              onPress={() => manejarEnviarOferta(elemento, elemento.fare + 5)}
              disabled={aceptandoViajeId !== null}
              activeOpacity={0.85}
              accessibilityLabel={`Ofertar ${elemento.fare + 5} bolivianos`}>

              <Texto style={estilos.cardIncrementText}>+5</Texto>
            </PulsableOpacidad>
          </Vista>
        </Vista>
      </Vista>);

  };

  const manejarDisponibilidadCambio = async (conectado: boolean) => {
    if (conectado === esDisponible || disponibilidadCambioReferencia.current) return;
    disponibilidadCambioReferencia.current = true;
    establecerDisponibilidadPendiente(conectado ? 'online' : 'offline');

    try {
      const coordenadas = conectado ?
      await new Promise<{latitude: number;longitude: number;} | undefined>((resolver) => {
        Geolocation.getCurrentPosition(
          (posicion) => resolver({
            latitude: posicion.coords.latitude,
            longitude: posicion.coords.longitude
          }),
          () => resolver(undefined),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );
      }) :
      undefined;
      if (conectado && AplicacionEstado.currentState !== 'active') return;
      const confirmed = await socketServicio.confirmarConductorDisponibilidad(conectado, coordenadas);
      if (confirmed) {
        if (conectado && AplicacionEstado.currentState !== 'active') {
          await disconnectConductorEnFondo();
          confirmedDisponibilidadReferencia.current = false;
          establecerEsDisponible(false);
          return;
        }
        confirmedDisponibilidadReferencia.current = conectado;
        establecerEsDisponible(conectado);
      } else {
        Alert.alert(
          'No se pudo cambiar el servicio',
          'Comprueba tu conexión e inténtalo de nuevo.'
        );
      }
    } catch {
      Alert.alert(
        'No se pudo cambiar el servicio',
        'Ocurrió un error. Inténtalo de nuevo.'
      );
    } finally {
      disponibilidadCambioReferencia.current = false;
      establecerDisponibilidadPendiente(null);
    }
  };

  const representarVacioEstado = () =>
  <Vista style={[estilos.emptyStateArea, !esDisponible && estilos.emptyStateAreaOffline]}>
      <Vista style={[estilos.emptyStateCard, !esDisponible && estilos.emptyStateCardOffline]}>
        <Vista style={estilos.emptyStateTopRow}>
          <Vista style={[estilos.emptyStateIcon, !esDisponible && estilos.emptyStateIconOffline]}>
            {esDisponible ?
          esCargando ? <ActividadIndicador size="small" color={THEME.primary} /> : <Radio size={28} color={THEME.primary} /> :

          <Power size={28} color="#64748B" />
          }
          </Vista>
          <Vista style={[estilos.emptyStateBadge, !esDisponible && estilos.emptyStateBadgeOffline]}>
            <Vista style={[estilos.emptyStateDot, !esDisponible && estilos.emptyStateDotOffline]} />
            <Texto style={[estilos.emptyStateBadgeText, !esDisponible && estilos.emptyStateBadgeTextOffline]}>
              {esDisponible ? 'EN LÍNEA' : 'DESCONECTADO'}
            </Texto>
          </Vista>
        </Vista>
        <Texto style={estilos.emptyStateTitle}>
          {esDisponible ? esCargando ? 'Buscando ofertas cercanas' : 'Sin ofertas por ahora' : 'Estás fuera de servicio'}
        </Texto>
        <Texto style={estilos.emptyStateDescription}>
          {esDisponible ?
        'Las nuevas solicitudes de viaje en tu zona aparecerán aquí.' :
        'Mientras estés desconectado no recibirás solicitudes de viaje.'}
        </Texto>
        <Vista style={estilos.emptyStateDivider} />
        <Texto style={estilos.emptyStateHint}>
          {esDisponible ?
        'Mantente en línea para recibir la próxima oferta.' :
        'Toca «En servicio» abajo para volver a conectarte.'}
        </Texto>
      </Vista>
    </Vista>;


  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SeguraZonaVista style={estilos.container}>
      {/* Header */}
      <Vista style={estilos.header}>
        <PulsableOpacidad
          onPress={() => navegacion.navigate('Profile')}
          style={estilos.headerIconBtn}
          activeOpacity={0.7}>

          <Menu size={20} color={THEME.text} />
        </PulsableOpacidad>

        <Vista style={estilos.headerCenter}>
          <Texto style={estilos.headerTitle}>Panel conductor</Texto>
          <Texto
            style={[estilos.headerSubtitle, esDisponible && viajes.length > 0 && estilos.headerSubtitleOffers]}
            numberOfLines={1}>

            {!esDisponible ?
            'Activa el servicio para recibir ofertas' :
            viajes.length > 0 ?
            `${viajes.length} ${viajes.length === 1 ? 'oferta disponible' : 'ofertas disponibles'}` :
            esCargando ? 'Buscando ofertas cercanas' : 'Esperando nuevas ofertas'}
          </Texto>
        </Vista>

        <PulsableOpacidad
          onPress={() => navegacion.navigate('Support')}
          style={estilos.headerIconBtn}
          activeOpacity={0.7}
          accessibilityLabel="Ayuda y Soporte">

          <CircleAyuda size={20} color={THEME.textSecondary} />
        </PulsableOpacidad>
      </Vista>

      {/* Main Body */}
      <Vista style={{ flex: 1 }}>
        {!esDisponible ? representarVacioEstado() :
        <FlatLista
          data={viajes}
          renderItem={representarViajeTarjeta}
          keyExtractor={(elemento) => elemento.id}
          contentContainerStyle={[estilos.list, viajes.length === 0 && estilos.emptyList]}
          showsVerticalScrollIndicator={false}
          refreshControl={
          <RenovarControl
            refreshing={esCargando && viajes.length > 0}
            onRefresh={cargarViajeSolicitudes}
            colors={[THEME.primary]}
            tintColor={THEME.primary} />

          }
          ListEmptyComponent={representarVacioEstado} />

        }
      </Vista>

      {/* ── ULTRA-MINIMALIST FLOATING STATUS DOCK ── */}
      <Vista
        style={[
        estilos.floatingDockWrapper,
        Plataforma.OS === 'android' && Number(Plataforma.Version) >= 35 && {
          bottom: 16 + Math.max(margenes.bottom, 24)
        }]
        }
        pointerEvents="box-none">

        <Vista style={estilos.floatingCapsule}>
          <PulsableOpacidad
            style={[
            estilos.floatingTab,
            esDisponible && estilos.floatingTabActiveOnline]
            }
            onPress={() => void manejarDisponibilidadCambio(true)}
            disabled={disponibilidadPendiente !== null}
            activeOpacity={0.85}>

            {disponibilidadPendiente === 'online' ?
            <ActividadIndicador size="small" color="#FFFFFF" /> :

            <Vista
              style={[
              estilos.floatingDot,
              esDisponible ? estilos.floatingDotOnline : estilos.floatingDotMuted]
              } />

            }
            <Texto
              style={[
              estilos.floatingTabText,
              esDisponible ?
              estilos.floatingTabTextActiveOnline :
              estilos.floatingTabTextMuted]
              }>

              {disponibilidadPendiente === 'online' ? 'Conectando…' : 'En servicio'}
            </Texto>
          </PulsableOpacidad>

          <PulsableOpacidad
            style={[
            estilos.floatingTab,
            !esDisponible && estilos.floatingTabActiveOffline]
            }
            onPress={() => void manejarDisponibilidadCambio(false)}
            disabled={disponibilidadPendiente !== null}
            activeOpacity={0.85}>

            {disponibilidadPendiente === 'offline' ?
            <ActividadIndicador size="small" color="#FFFFFF" /> :

            <Vista
              style={[
              estilos.floatingDot,
              !esDisponible ?
              estilos.floatingDotOffline :
              estilos.floatingDotMuted]
              } />

            }
            <Texto
              style={[
              estilos.floatingTabText,
              !esDisponible ?
              estilos.floatingTabTextActiveOffline :
              estilos.floatingTabTextMuted]
              }>

              {disponibilidadPendiente === 'offline' ? 'Desconectando…' : 'Desconectado'}
            </Texto>
          </PulsableOpacidad>
        </Vista>
      </Vista>

      {/* Detail Modal */}
      {seleccionadoViaje &&
      <Modal
        visible={mostrarDetallesModal}
        transparent
        animationType="slide"
        onRequestClose={manejarCerrarModal}>

          <Vista style={estilos.modalBackdrop}>
            <PulsableOpacidad
            style={estilos.modalDismiss}
            onPress={manejarCerrarModal} />

            <SeguraZonaVista style={estilos.modalSheet} edges={['bottom']}>
              <Vista style={estilos.sheetHandle} />

              <Vista style={estilos.modalHeaderRow}>
                <Texto style={estilos.modalTitle}>Solicitud de viaje</Texto>
              </Vista>

              <DesplazableVista
              showsVerticalScrollIndicator={false}
              contentContainerStyle={estilos.modalScrollContent}>

                <Vista style={estilos.mapSection}>
                  <Vista style={estilos.mapSectionHeader}>
                    <Texto style={estilos.mapSectionTitle}>Recorrido del viaje</Texto>
                    <Texto style={estilos.mapSectionDistance}>{seleccionadoViaje.distance.toFixed(1)} km · ~{seleccionadoViaje.duration} min</Texto>
                  </Vista>
                  <Vista style={estilos.mapWrap} onLayout={() => establecerDetalleMapaLaidFuera(true)}>
                    <MapaVista
                      {...MAPA_CLARO}
                    ref={mapaReferencia}
                    style={estilos.map}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    onMapReady={() => establecerDetalleMapaListo(true)}
                    initialRegion={{
                      latitude: (seleccionadoViaje.pickupLocation.latitude + seleccionadoViaje.dropoffLocation.latitude) / 2,
                      longitude: (seleccionadoViaje.pickupLocation.longitude + seleccionadoViaje.dropoffLocation.longitude) / 2,
                      latitudeDelta: Math.max(0.02, Math.abs(seleccionadoViaje.pickupLocation.latitude - seleccionadoViaje.dropoffLocation.latitude) * 1.8),
                      longitudeDelta: Math.max(0.02, Math.abs(seleccionadoViaje.pickupLocation.longitude - seleccionadoViaje.dropoffLocation.longitude) * 1.8)
                    }}>

                      {rutaCoordenadas.length > 0 &&
                    <Polyline coordinates={rutaCoordenadas} strokeColor={THEME.primary} strokeWidth={4} lineCap="round" lineJoin="round" />
                    }
                      <Marker coordinate={seleccionadoViaje.pickupLocation} anchor={{ x: 0.5, y: 0.5 }}>
                        <PasajeroMapaIcono size={40} />
                      </Marker>
                      {(seleccionadoViaje.waypoints ?? []).map((parada) =>
                    <Marker key={parada.sequence} coordinate={parada} title={`P${parada.sequence}`} description={parada.address} anchor={{ x: 0.5, y: 0.5 }}>
                          <ParadaMapaIcon number={parada.sequence} />
                        </Marker>
                    )}
                      <Marker coordinate={seleccionadoViaje.dropoffLocation} anchor={{ x: 0.5, y: 0.5 }}>
                        <DestinoIndicadorIcon size={40} />
                      </Marker>
                    </MapaVista>
                    {mapaCargando && <Vista style={estilos.mapLoader}><ActividadIndicador color={THEME.primary} /></Vista>}
                  </Vista>
                </Vista>

                <Vista style={estilos.rideOverview}>
                  <Vista style={estilos.passengerSummary}>
                    <PasajeroAvatar photo={seleccionadoViaje.passengerProfilePhoto} name={seleccionadoViaje.passengerName} size={42} />
                    <Vista style={estilos.passengerDetails}>
                      <Texto style={estilos.detailName}>{seleccionadoViaje.passengerName}</Texto>
                      <Vista style={estilos.passengerMetaRow}>
                        <Vista style={estilos.ratingBadge}>
                          <Texto style={estilos.ratingBadgeStar}>★</Texto>
                          <Texto style={estilos.ratingBadgeVal}>{seleccionadoViaje.passengerRating.toFixed(1)}</Texto>
                        </Vista>
                        <Texto style={estilos.passengerMetaText}>{seleccionadoViaje.distance.toFixed(1)} km</Texto>
                        <Texto style={estilos.passengerMetaDivider}>•</Texto>
                        <Texto style={estilos.passengerMetaText}>~{seleccionadoViaje.duration} min</Texto>
                      </Vista>
                    </Vista>
                  </Vista>
                  <Vista style={estilos.modalFareBox}>
                    <Texto style={estilos.modalFareValue}>Bs {seleccionadoViaje.fare.toFixed(2)}</Texto>
                  </Vista>
                </Vista>

                <Vista style={estilos.modalSection}>
                  <Vista style={estilos.routeBlock}>
                    <Vista style={estilos.routeItem}>
                      <Vista style={estilos.routeIcon}><PasajeroMapaIcono size={28} bare /></Vista>
                      <Vista style={estilos.routeItemContent}>
                        <Texto style={estilos.routeItemAddr}>{seleccionadoViaje.pickupLocation.address}</Texto>
                      </Vista>
                    </Vista>
                    <Vista style={estilos.routeConnector} />
                    {(seleccionadoViaje.waypoints ?? []).map((parada) =>
                  <React.Fragment key={parada.sequence}>
                        <Vista style={estilos.routeItem}>
                          <Vista style={estilos.routeIcon}><ParadaMapaIcon number={parada.sequence} size={28} /></Vista>
                          <Vista style={estilos.routeItemContent}>
                            <Texto style={estilos.routeItemAddr}>{parada.address}</Texto>
                          </Vista>
                        </Vista>
                        <Vista style={estilos.routeConnector} />
                      </React.Fragment>
                  )}
                    <Vista style={estilos.routeItem}>
                      <Vista style={estilos.routeIcon}><DestinoIndicadorIcon size={28} bare /></Vista>
                      <Vista style={estilos.routeItemContent}>
                        <Texto style={estilos.routeItemAddr}>{seleccionadoViaje.dropoffLocation.address}</Texto>
                      </Vista>
                    </Vista>
                  </Vista>
                </Vista>

                {seleccionadoViaje.notes &&
              <Vista style={estilos.notesBox}>
                    <Texto style={estilos.notesLabel}>NOTA DEL PASAJERO</Texto>
                    <Texto style={estilos.notesText}>{seleccionadoViaje.notes}</Texto>
                  </Vista>
              }
              </DesplazableVista>

              {/* Footer */}
              <Vista style={estilos.footerActions}>
                {/* Botones de incremento rápido */}
                <Vista style={estilos.quickChipsContainer}>
                  <Vista style={estilos.chipsRow}>
                    {[2, 5, 7].map((inc) => {
                    const ofertaPrecio = seleccionadoViaje.fare + inc;
                    return (
                      <PulsableOpacidad
                        key={inc}
                        style={estilos.chipBtn}
                        onPress={() => {
                          manejarCerrarModal();
                          manejarEnviarOferta(seleccionadoViaje, ofertaPrecio);
                        }}
                        disabled={aceptandoViajeId !== null}
                        activeOpacity={0.7}>

                          <Texto style={estilos.chipBtnText}>+Bs {inc}</Texto>
                        </PulsableOpacidad>);

                  })}
                  </Vista>
                </Vista>

                <PulsableOpacidad
                style={estilos.btnPrimary}
                onPress={() => {
                  manejarCerrarModal();
                  manejarEnviarOferta(seleccionadoViaje, seleccionadoViaje.fare);
                }}
                disabled={aceptandoViajeId !== null}>

                  <Texto style={estilos.btnPrimaryText}>
                    Aceptar Bs {seleccionadoViaje.fare.toFixed(2)}
                  </Texto>
                </PulsableOpacidad>
              </Vista>
            </SeguraZonaVista>
          </Vista>
        </Modal>
      }

      {!!rapidoReserva && <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <DesplazableVista
          style={estilos.quickAssignmentOverlay}
          contentContainerStyle={estilos.quickAssignmentContent}
          showsVerticalScrollIndicator={false}>

          <RapidoReservaCard ride={rapidoReserva} segundosRestantes={rapidoSegundosRestantes} driver />
        </DesplazableVista>
      </Modal>}
      {/* Waiting Overlay */}
      {mostrarEsperandoCapa && esperandoViaje && <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <Vista style={estilos.waitingOverlay}>
          <Vista style={estilos.waitingBg} />
          <Vista style={estilos.waitingSheet}>
            {ofertaRechazado ? (
            /* ── Estado: rechazada / expirada ── */
            ofertaEstado === 'rechazado' ?
            <Vista style={estilos.rejectedContent}>
                  <Vista style={estilos.resultIconRejected}>
                    <CircleX size={25} color={THEME.primary} strokeWidth={2.3} />
                  </Vista>
                  <Texto style={estilos.rejectedTitle}>Oferta rechazada</Texto>
                  <Texto style={estilos.rejectedSubtitle}>Puedes seguir revisando otras solicitudes.</Texto>
                </Vista> :

            <>
                  <Vista style={[estilos.resultIconWrap, estilos.resultIconExpired]}>
                    <Reloj3 size={28} color={THEME.primary} />
                  </Vista>
                  <Texto style={estilos.waitingTitle}>Tu oferta expiró</Texto>
                  <Texto style={[estilos.waitingSubtitle, estilos.waitingResultSubtitle]}>
                    El pasajero no respondió a tiempo.
                  </Texto>
                  <Texto style={estilos.waitingReturnMessage}>
                    Volviendo a la lista de solicitudes…
                  </Texto>
                </>) :


            <>
                <Vista style={estilos.waitingResponseRow}>
                  <Texto style={estilos.waitingSubtitle}>
                    Esperando la respuesta de {esperandoViaje.passengerName}
                  </Texto>
                  <Vista style={estilos.waitingTimerWrap}>
                    <Reloj3 size={14} color={THEME.primary} />
                    <Texto style={estilos.waitingTimer}>{esperandoTiempoIzquierda}s</Texto>
                  </Vista>
                </Vista>

                <Vista style={estilos.waitingOfferCard}>
                  <Vista style={estilos.waitingPassengerRow}>
                    <PasajeroAvatar
                    photo={esperandoViaje.passengerProfilePhoto}
                    name={esperandoViaje.passengerName}
                    size={34} />

                    <Vista style={estilos.waitingRoutePreview}>
                      <Texto style={estilos.waitingPassengerName} numberOfLines={1}>
                        {esperandoViaje.passengerName}
                      </Texto>
                      <Vista style={estilos.waitingRouteRow}>
                        <PasajeroMapaIcono size={22} bare />
                        <Texto style={estilos.waitingRouteAddress} numberOfLines={1}>
                          {esperandoViaje.pickupLocation.address}
                        </Texto>
                      </Vista>
                      {(esperandoViaje.waypoints ?? []).map((parada) =>
                    <Vista key={parada.sequence} style={estilos.waitingRouteRow}>
                          <ParadaMapaIcon number={parada.sequence} size={22} />
                          <Texto style={estilos.waitingRouteAddress} numberOfLines={1}>
                            {parada.address}
                          </Texto>
                        </Vista>
                    )}
                      <Vista style={estilos.waitingRouteRow}>
                        <DestinoIndicadorIcon size={22} bare />
                        <Texto style={estilos.waitingRouteAddress} numberOfLines={1}>
                          {esperandoViaje.dropoffLocation.address}
                        </Texto>
                      </Vista>
                    </Vista>
                  </Vista>
                  <Vista style={estilos.waitingOfferPriceBlock}>
                    <Texto style={estilos.waitingOfferLabel}>Tu oferta</Texto>
                    <Texto style={estilos.waitingOfferPrice}>Bs {esperandoPrecio?.toFixed(2)}</Texto>
                  </Vista>
                </Vista>
              </>
            }
          </Vista>
        </Vista>
      </Modal>}

      <Toast
        message={reservaAviso}
        visible={!!reservaAviso}
        position="top"
        backgroundColor="#15803D"
        onHide={() => establecerReservaAviso('')} />


    </SeguraZonaVista>);

};

// ─── Styles ───────────────────────────────────────────────────────────────────
const estilos = EstiloHoja.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  divider: { height: 1, backgroundColor: 'rgba(0, 0, 0, 0.04)', marginVertical: 8 },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Plataforma.OS === 'ios' ? 6 : 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2
  },
  headerSubtitleOffers: {
    color: THEME.primary
  },

  list: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 95,
    gap: 8,
    backgroundColor: '#FFFFFF'
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center'
  },

  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 0
  },
  cardHeaderArea: { paddingBottom: 0 },
  cardPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  cardPassengerInfo: {
    flex: 1
  },
  cardPassengerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 1
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  starRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2
  },
  starIcon: {
    color: THEME.primary,
    fontSize: 9,
    fontWeight: '700'
  },
  starText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: '800'
  },
  metaBullet: { fontSize: 9, color: '#CBD5E1' },
  tripMetaText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500'
  },
  cardPriceBox: {
    alignItems: 'flex-end'
  },
  cardPriceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.8,
    lineHeight: 30
  },
  cardPriceSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 0
  },

  cardRouteTimeline: {
    marginTop: 8
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  routeIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  routeLineConnector: {
    width: 1.5,
    height: 8,
    backgroundColor: '#CBD5E1',
    marginLeft: 13.25,
    marginVertical: 1
  },
  routeAddressText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    lineHeight: 18
  },

  cardNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6
  },
  cardNotesText: {
    fontSize: 11.5,
    color: THEME.primary,
    fontWeight: '500',
    flex: 1
  },

  cardActionsContainer: {
    marginTop: 8
  },
  cardPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardPrimaryAcceptBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0
  },
  cardPrimaryAcceptText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  cardIncrementBtn: {
    width: 50,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0
  },
  cardIncrementText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700'
  },

  // ─── Floating Dock ───
  floatingDockWrapper: {
    position: 'absolute',
    bottom: Plataforma.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99
  },
  floatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 30,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  floatingTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 7
  },
  floatingTabActiveOnline: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)'
  },
  floatingTabActiveOffline: {
    backgroundColor: '#FFFFFF'
  },
  floatingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  floatingDotOnline: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2
  },
  floatingDotOffline: {
    backgroundColor: '#94A3B8'
  },
  floatingDotMuted: {
    backgroundColor: '#475569'
  },
  floatingTabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  floatingTabTextActiveOnline: {
    color: '#FFFFFF'
  },
  floatingTabTextActiveOffline: {
    color: '#0F172A'
  },
  floatingTabTextMuted: {
    color: '#64748B'
  },

  // ─── Empty driver states ───
  emptyStateArea: {
    paddingHorizontal: 6
  },
  emptyStateAreaOffline: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 95
  },
  emptyStateCard: {
    backgroundColor: '#FBF8FF',
    borderWidth: 1,
    borderColor: '#EDE2F7',
    borderRadius: 26,
    padding: 24
  },
  emptyStateCardOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0'
  },
  emptyStateTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22
  },
  emptyStateIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#EFE3FB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateIconOffline: {
    backgroundColor: '#E8EDF3'
  },
  emptyStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EDE2F7'
  },
  emptyStateBadgeOffline: {
    backgroundColor: '#E8EDF3'
  },
  emptyStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.primary
  },
  emptyStateDotOffline: {
    backgroundColor: '#94A3B8'
  },
  emptyStateBadgeText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  emptyStateBadgeTextOffline: {
    color: '#64748B'
  },
  emptyStateTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8
  },
  emptyStateDescription: {
    color: THEME.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  emptyStateDivider: {
    height: 1,
    backgroundColor: '#E6E0EB',
    marginVertical: 20
  },
  emptyStateHint: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  quickAssignmentOverlay: { flex: 1, backgroundColor: 'rgba(25, 10, 35, 0.65)' },
  quickAssignmentContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalDismiss: { flex: 1, backgroundColor: THEME.overlay },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 9
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: THEME.text, letterSpacing: -0.4 },
  modalScrollContent: { paddingBottom: 10, gap: 12 },
  mapSection: { gap: 9 },
  mapSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 2 },
  mapSectionTitle: { color: THEME.text, fontSize: 16, fontWeight: '800' },
  mapSectionDistance: { color: THEME.textSecondary, fontSize: 12, fontWeight: '600' },
  modalFareCard: {
    backgroundColor: '#F6F0FC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalFareValue: { fontSize: 33, lineHeight: 38, fontWeight: '900', color: '#000000', letterSpacing: -1 },
  modalFareMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  modalFareMetaText: { fontSize: 12, fontWeight: '700', color: '#5B217A' },
  modalFareMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#A855F7' },
  rideOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 2
  },
  passengerSummary: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  passengerDetails: { flex: 1, marginLeft: 11 },
  detailName: { fontSize: 15, fontWeight: '800', color: THEME.text, marginBottom: 3 },
  passengerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passengerMetaText: { fontSize: 11.5, color: THEME.textSecondary, fontWeight: '600' },
  passengerMetaDivider: { color: '#CBD5E1', fontSize: 10 },
  modalFareBox: { alignItems: 'flex-end', marginLeft: 10 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  ratingBadgeStar: { color: THEME.primary, fontSize: 12 },
  ratingBadgeVal: { fontSize: 13, fontWeight: '800', color: THEME.primary },
  modalSection: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12 },
  routeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  routeSummary: { fontSize: 11, color: THEME.textSecondary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5
  },
  statUnit: { fontSize: 12, color: THEME.textSecondary, fontWeight: '500' },
  statSep: { width: 1, height: 40, backgroundColor: THEME.border },
  routeBlock: { gap: 0 },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5
  },
  routeItemContent: { flex: 1, marginLeft: 2 },
  routeIconDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginLeft: 13
  },
  routeItemAddr: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18
  },
  mapWrap: {
    height: 230,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 0,
    backgroundColor: '#E2E8F0'
  },
  map: { flex: 1 },
  mapLoader: {
    ...EstiloHoja.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  markerGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4
  },
  markerPurple: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF'
  },
  notesBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    padding: 11
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  notesText: { fontSize: 13, color: THEME.text, lineHeight: 19 },
  footerActions: {
    paddingTop: 8,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 10
  },
  quickChipsContainer: {
    marginBottom: 4
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: THEME.bg,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000'
  },
  btnPrimary: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  waitingOverlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  waitingBg: {
    ...EstiloHoja.absoluteFillObject,
    backgroundColor: THEME.overlay
  },
  waitingSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
    marginBottom: 5
  },
  waitingSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center'
  },
  waitingResultSubtitle: { marginBottom: 4 },
  waitingResponseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  waitingTimerWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: '#F3E8FF' },
  waitingOfferCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center'
  },
  waitingPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 9
  },
  waitingRoutePreview: { flex: 1, gap: 4 },
  waitingPassengerName: { fontSize: 12.5, color: THEME.text, fontWeight: '800' },
  waitingRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingRouteAddress: { flex: 1, fontSize: 11.5, color: THEME.text, fontWeight: '600' },
  waitingOfferPriceBlock: { alignItems: 'flex-end' },
  waitingOfferLabel: { fontSize: 10, color: THEME.textSecondary, fontWeight: '700', marginBottom: 2 },
  waitingOfferPrice: { fontSize: 34, lineHeight: 38, color: '#000000', fontWeight: '900', letterSpacing: -1 },
  waitingTimer: { fontSize: 13, color: THEME.primary, fontWeight: '800' },
  resultIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center'
  },
  rejectedContent: { width: '100%', alignItems: 'center', paddingBottom: 4 },
  resultIconRejected: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  rejectedTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800', color: THEME.text, textAlign: 'center' },
  rejectedSubtitle: { fontSize: 14, lineHeight: 20, color: THEME.textSecondary, textAlign: 'center', marginTop: 5 },
  resultIconExpired: { backgroundColor: '#F3E8FF' },
  waitingReturnMessage: { marginTop: 12, color: THEME.textMuted, fontSize: 12, textAlign: 'center' }
});

export default ConductorViajeSolicitudPantalla;
