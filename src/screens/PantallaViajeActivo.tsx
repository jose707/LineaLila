import { MAPA_CLARO } from '../theme/mapa';
import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React, { useState as usarEstado, useEffect as usarEfecto, useRef as usarReferencia, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  ActivityIndicator as ActividadIndicador,
  RefreshControl as RenovarControl,
  ScrollView as DesplazableVista,
  Modal,
  TextInput as TextoEntrada,
  Image as Imagen,
  Vibration,
  BackHandler as ReversoManejador,
  NativeModules as NativoModules,
  Platform as Plataforma,
  AppState as AplicacionEstado } from
'react-native';
import Geolocation from '@react-native-community/geolocation';
import { ArrowLeft as ArrowIzquierda, ChevronRight as ChevronDerecha, ShieldAlert, X } from 'lucide-react-native';
import {
  SafeAreaView as SeguraZonaVista,
  useSafeAreaInsets as usarSeguraZonaMargenes } from
'react-native-safe-area-context';
import {
  useNavigation as usarNavegacion,
  useRoute as usarRuta,
  RouteProp as RutaProp,
  NavigationProp as NavegacionProp,
  useFocusEffect as usarEnfoqueEfecto,
  CommonActions,
  useIsFocused as usarEsEnfocado } from
'@react-navigation/native';
import MapaVista, { Marker } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import Svg, { Path as Ruta, Circle, Rect } from 'react-native-svg';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { viajesServicio } from "../services/viajes.servicio";
import { cacheRutaServicio } from "../services/cache.servicio";
import { limpiarVencidoCache } from "../utils/cacheGestor";
import socketServicio from "../services/socket.servicio";
import { API_BASE_URL, SOCKET_CONFIGURACION } from "../config/constantes";
import { AlmacenamientoAuxiliar } from '../services/storage';
import { normalizarRumbo, resolverConductorRumbo, actualizarConductorRumbo } from "../utils/conductorRumbo";
import type { ConductorRumboEstado } from "../utils/conductorRumbo";
import { tamanoMarcadorTaxi } from "../utils/taxiMarcadorSize";
import Toast from "../components/Aviso";
import ConfirmarInferiorHoja from "../components/ConfirmarInferiorSheet";
import { AnimadoRutaPolilinea } from "../components/AnimadoRutaPolilinea";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import { Icon as MapaIcon } from '../theme/icons';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg: '#F7F7F9',
  white: '#FFFFFF',
  ink: '#111118',
  inkMid: '#7A7A8A',
  inkLight: '#AFAFBF',
  accent: '#7514C5',
  accentSoft: '#F3EAFC',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  danger: '#DC2626',
  dangerSoft: '#FFF0F0',
  warn: '#D97706',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  pink: '#EC4899',
  border: '#E5E5EA'
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ActivoViaje {
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
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverProfilePicture?: string;
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
  eta: number;
  startTime?: string;
  cancelledBy?: string;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icono = {
  TaxiSuperior: ({ size: tamano = 38 }: {size?: number;}) =>
  <Svg width={tamano} height={tamano * 2 / 3} viewBox="0 0 72 48" fill="none">
      <Ruta d="M26 8L29 3H34L32 8M26 40L29 45H34L32 40" fill="#6813A8" />
      <Ruta d="M11 8H59C66 8 70 14 70 24S66 40 59 40H11C5 40 2 34 2 24S5 8 11 8Z" fill="#8B20D7" />
      <Ruta d="M12 11H58C64 11 67 16 67 24S64 37 58 37H12C7 37 5 32 5 24S7 11 12 11Z" fill="#A32CF0" stroke="#55118B" strokeWidth="1" />
      <Ruta d="M28 11C24 15 23 33 28 37L34 35V13L28 11Z" fill="#17202B" stroke="#38114E" strokeWidth="1.5" />
      <Ruta d="M55 13C59 18 59 30 55 35H50V13H55Z" fill="#17202B" stroke="#38114E" strokeWidth="1.5" />
      <Ruta d="M34 13H50V35H34C32 28 32 20 34 13Z" fill="#B644F7" />
      <Ruta d="M8 15C12 11 18 11 24 12M8 33C12 37 18 37 24 36M35 14H47" stroke="#EAB8FF" strokeWidth="1.6" strokeLinecap="round" />
      <Ruta d="M6 15L9 13M6 33L9 35" stroke="#E6F7FF" strokeWidth="2.4" strokeLinecap="round" />
      <Ruta d="M66 15L68 19M66 33L68 29" stroke="#FF6C69" strokeWidth="2.4" strokeLinecap="round" />
    </Svg>,

  Car: ({ size: tamano = 18, color = T.accent }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Ruta
      d="M5 11l1.5-4.5h11L19 11"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round" />

      <Rect
      x="3"
      y="11"
      width="18"
      height="7"
      rx="2"
      stroke={color}
      strokeWidth="1.75" />

      <Circle cx="7.5" cy="18" r="1.5" fill={color} />
      <Circle cx="16.5" cy="18" r="1.5" fill={color} />
    </Svg>,

  Usuario: ({
    size: tamano = 18,
    color = T.inkMid



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.75" />
      <Ruta
      d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round" />

    </Svg>,

  Star: ({
    size: tamano = 13,
    color = '#F59E0B'



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color}>
      <Ruta d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>,

  Comprobar: ({
    size: tamano = 16,
    color = T.white



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Ruta
      d="M5 12l5 5L20 7"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round" />

    </Svg>,

  Close: ({
    size: tamano = 16,
    color = T.inkMid



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Ruta
      d="M6 6l12 12M6 18L18 6"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round" />

    </Svg>,

  Play: ({ size: tamano = 16, color = T.white }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color}>
      <Ruta d="M5 3l14 9-14 9V3z" />
    </Svg>,

  Distancia: ({
    size: tamano = 14,
    color = T.inkLight



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Ruta
      d="M2 12h20M16 7l5 5-5 5"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round" />

    </Svg>,

  Reloj: ({
    size: tamano = 14,
    color = T.inkLight



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
      <Ruta
      d="M12 7v5l3 3"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round" />

    </Svg>,

  Dinero: ({
    size: tamano = 14,
    color = T.inkLight



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="2"
      stroke={color}
      strokeWidth="1.75" />

      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.75" />
    </Svg>

};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const Estado: Record<string, (isDriver: boolean) => string> = {
  aceptado: (esConductor) =>
  esConductor ? 'Dirígete al punto de recogida' : 'El conductor está en camino',
  llegado: (esConductor) =>
  esConductor ? 'Llegaste al punto de recogida' : 'El conductor llegó',
  en_curso: () => 'En camino al destino',
  completing: () => 'Finalizando viaje…'
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const ActivoViajePantalla = () => {
  const navegacion = usarNavegacion<NavegacionProp<RaizPilaParametroLista>>();
  const ruta = usarRuta<RutaProp<RaizPilaParametroLista, 'ActiveRide'>>();
  const { user: usuario, isDriverMode: esConductorModo } = usarAutenticacion();
  const { rideId: viajeId } = ruta.params || { rideId: 'demo' };
  const margenes = usarSeguraZonaMargenes();
  const esEnfocado = usarEsEnfocado();

  const [viaje, establecerViaje] = usarEstado<ActivoViaje | null>(null);
  const [confirmacionMensaje, establecerConfirmacionMensaje] = usarEstado('');

  usarEfecto(() => {
    if (!viaje || viaje.rideId !== viajeId || !ruta.params?.confirmationMessage) return;
    establecerConfirmacionMensaje(ruta.params.confirmationMessage);
    navegacion.setParams({ confirmationMessage: undefined });
  }, [viaje, viajeId, ruta.params?.confirmationMessage, navegacion]);
  const [esCargando, establecerEsCargando] = usarEstado(true);
  const [esRenovando, establecerEsRenovando] = usarEstado(false);
  const [pasajeroUbicacion, establecerPasajeroUbicacion] = usarEstado<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [rutaCoordenadas, establecerRutaCoordenadas] = usarEstado<Array<{
    latitude: number;
    longitude: number;
  }> | null>(null);
  const [rutaError, establecerRutaError] = usarEstado(false);
  const [rutaReintentar, establecerRutaReintentar] = usarEstado(0);
  const [mostrarLlegadoConfirmarModal, establecerMostrarLlegadoConfirmarModal] = usarEstado(false);
  const [llegadoConfirmarError, establecerLlegadoConfirmarError] = usarEstado('');
  const [mostrarCompletarConfirmarModal, establecerMostrarCompletarConfirmarModal] = usarEstado(false);
  const [completarConfirmarError, establecerCompletarConfirmarError] = usarEstado('');
  const [mostrarContraOfertaModal, establecerMostrarContraOfertaModal] = usarEstado(false);
  const [contraOfertaPrecio, establecerContraOfertaPrecio] = usarEstado('');
  const [esEnviandoOferta, establecerEsEnviandoOferta] = usarEstado(false);
  const [mostrarLlegadoNotificacion, establecerMostrarLlegadoNotificacion] = usarEstado(false);
  const [pasajeroListo, establecerPasajeroListo] = usarEstado(false);
  const [mostrarPasajeroListoNotificacion, establecerMostrarPasajeroListoNotificacion] =
  usarEstado(false);
  const [mostrarCancelarModal, establecerMostrarCancelarModal] = usarEstado(false);
  const [cancelarPaso, establecerCancelarPaso] = usarEstado<'reasons' | 'confirm'>('reasons');
  const [mostrarEmergencyConfirmarModal, establecerMostrarEmergencyConfirmarModal] = usarEstado(false);
  const puedeRegistrarEmergencia = viaje?.status === 'en_curso';
  const [registrandoEmergencia, establecerRegistrandoEmergencia] = usarEstado(false);
  const [errorEmergencia, establecerErrorEmergencia] = usarEstado('');
  const emergenciaEnCurso = usarReferencia(false);
  const [cancelacionMotivos, establecerCancelacionMotivos] = usarEstado<any[]>([]);
  const [seleccionadoCancelarMotivoId, establecerSeleccionadoCancelarMotivoId] = usarEstado<
    string | null>(
    null);

  const esCargandoReferencia = usarReferencia(false);
  const ultimoConductorPuntoReferencia = usarReferencia<(ConductorRumboEstado & {rideId: string;}) | null>(null);
  const llegadoConfirmarEnFlightReferencia = usarReferencia(false);
  const completarConfirmarEnFlightReferencia = usarReferencia(false);
  const activoMapaReferencia = usarReferencia<MapaVista>(null);
  const [mapaListo, establecerMapaListo] = usarEstado(false);
  const [taxiTamano, establecerTaxiTamano] = usarEstado(38);
  const manejarMapaRegionCambio = usarFuncionRetorno((region: Region) => {
    establecerTaxiTamano(tamanoMarcadorTaxi(region.latitudeDelta));
  }, []);
  const framedMapaEtapaReferencia = usarReferencia<string | null>(null);
  const esMontadoReferencia = usarReferencia(true);
  const anteriorPasajeroListoEnReferencia = usarReferencia<string | null>(null);

  // ── Effects ──
  usarEfecto(() => {
    if (!mapaListo || !viaje) return;
    const mostrarRuta = ['llegado', 'en_curso', 'completing'].includes(viaje.status);
    const etapaClave = [
    viajeId,
    esConductorModo ? 'conductor' : 'pasajero',
    mostrarRuta ? 'route' : 'pickup',
    !!viaje.driverLocation,
    !esConductorModo && !!pasajeroUbicacion,
    mostrarRuta && !!rutaCoordenadas?.length].
    join(':');
    if (framedMapaEtapaReferencia.current === etapaClave) return;

    const coordenadas = mostrarRuta ?
    [
    viaje.pickupLocation,
    ...(viaje.waypoints || []).map((parada) => parada.location),
    viaje.dropoffLocation,
    ...(rutaCoordenadas || [])] :

    esConductorModo ?
    [viaje.pickupLocation, viaje.driverLocation].filter((punto): punto is NonNullable<typeof punto> => !!punto) :
    [pasajeroUbicacion || viaje.pickupLocation, viaje.driverLocation].filter((punto): punto is NonNullable<typeof punto> => !!punto);

    if (coordenadas.length > 1) {
      activoMapaReferencia.current?.fitToCoordinates(coordenadas, {
        edgePadding: { top: margenes.top + 70, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    } else if (coordenadas.length === 1) {
      activoMapaReferencia.current?.animateToRegion({
        ...coordenadas[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      });
    }
    // Reencuadrar al cambiar de etapa o al recibir las primeras ubicaciones.
    framedMapaEtapaReferencia.current = etapaClave;
  }, [mapaListo, viaje, viajeId, esConductorModo, pasajeroUbicacion, rutaCoordenadas, margenes.top]);

  usarEfecto(() => {
    cacheRutaServicio.limpiarVencido();
    limpiarVencidoCache();
  }, []);

  usarEfecto(() => {
    if (esConductorModo && viajeId) socketServicio.establecerActivoViaje(viajeId, true);
  }, [esConductorModo, viajeId]);

  usarEfecto(() => {
    if (viaje?.status && viaje.status !== 'aceptado') {
      establecerMostrarLlegadoConfirmarModal(false);
      establecerLlegadoConfirmarError('');
    }
    if (viaje?.status && viaje.status !== 'en_curso') {
      establecerMostrarCompletarConfirmarModal(false);
      establecerCompletarConfirmarError('');
    }
  }, [viaje?.status]);

  usarEfecto(() => {
    esMontadoReferencia.current = true;
    esCargandoReferencia.current = false;
    cargarViajeDetalles(); // Carga inicial

    // 🔌 Socket: unirse al room del viaje
    socketServicio.unirViaje(viajeId);

    // Socket: escuchar cambios de estado del viaje
    const manejarEstadoCambiado = (datos: any) => {
      if (datos?.rideId !== viajeId) return;
      if (esMontadoReferencia.current && !esCargandoReferencia.current) cargarViajeDetalles();
    };

    // Socket: escuchar actualizaciones de ubicación del conductor
    const manejarUbicacionCambiado = (datos: any) => {
      if (datos?.rideId !== viajeId) return;
      const latitud = Number(datos.latitude);
      const longitud = Number(datos.longitude);
      if (!Number.isFinite(latitud) || !Number.isFinite(longitud) ||
      Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return;
      establecerViaje((anterior: any) => {
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

  usarEfecto(() => {
    if (viaje?.status !== 'cancelado') return;
    const espera = setTimeout(() => {
      navegacion.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: esConductorModo ? 'DriverHome' : 'Map' }]
      }));
    }, 2800);
    return () => clearTimeout(espera);
  }, [viaje?.status, esConductorModo, navegacion]);

  usarEfecto(() => {
    if (!viaje || esConductorModo) return;
    if (viaje.status === 'llegado') {
      establecerMostrarLlegadoNotificacion(true);
      Vibration.vibrate([0, 150, 100, 150]);
    } else {
      establecerMostrarLlegadoNotificacion(false);
      establecerPasajeroListo(false);
      anteriorPasajeroListoEnReferencia.current = null;
    }
  }, [viaje?.status, esConductorModo]);

  usarEfecto(() => {
    if (!viaje) return;
    if (viaje.status === 'completado')
    navegacion.navigate('RideCompleted' as const, {
      rideId: viaje.rideId
    });
  }, [viaje?.status]);

  usarEfecto(() => {
    if (!viaje || !esConductorModo) return;
    socketServicio.establecerActivoViaje(
      viajeId,
      ['aceptado', 'llegado', 'en_curso'].includes(viaje.status)
    );
  }, [esConductorModo, viaje?.status, viajeId]);

  usarEfecto(() => {
    if (Plataforma.OS !== 'android' || !NativoModules.ActiveRideLocationModule) return;
    const tracker = NativoModules.ActiveRideLocationModule;
    const activo = esConductorModo && ['aceptado', 'llegado', 'en_curso'].includes(viaje?.status ?? '');
    if (!activo) {
      if (viaje && ['cancelado', 'completado'].includes(viaje.status)) tracker.stop(viajeId);
      return;
    }
    const token = AlmacenamientoAuxiliar.obtenerElemento('authToken');
    if (!token) return;
    tracker.start(viajeId, token, API_BASE_URL).
    catch((error: Error) => {
      console.warn('[ActiveRide] Native location tracking unavailable:', error);
    });
  }, [esConductorModo, viaje?.status, viajeId]);

  usarEfecto(() => {
    if (
    !esConductorModo ||
    !esEnfocado ||
    viaje?.status === 'cancelado' ||
    viaje?.status === 'completado')

    return;

    let cancelado = false;
    let pendiente = false;
    const enviar = () => {
      if (!esMontadoReferencia.current || cancelado || pendiente) return;
      pendiente = true;
      Geolocation.getCurrentPosition(
        (posicion: any) => {
          pendiente = false;
          if (esMontadoReferencia.current && !cancelado) {
            const real = {
              latitude: posicion.coords.latitude,
              longitude: posicion.coords.longitude
            };
            const anterior = ultimoConductorPuntoReferencia.current?.rideId === viajeId ?
            ultimoConductorPuntoReferencia.current :
            null;
            const rumboEstado = actualizarConductorRumbo(
              anterior,
              { ...real, accuracy: posicion.coords.accuracy },
              posicion.timestamp
            );
            if (rumboEstado === anterior) return;
            const rumbo = rumboEstado.heading;
            ultimoConductorPuntoReferencia.current = { ...rumboEstado, rideId: viajeId };
            // 🔌 Enviar ubicación via WebSocket (más eficiente que REST)
            socketServicio.actualizarUbicacion({
              rideId: viajeId,
              ...real,
              heading: rumbo
            });
            establecerViaje((prev) => prev ? {
              ...prev,
              driverLocation: {
                ...real,
                heading: rumbo ?? prev.driverLocation?.heading
              }
            } : prev);
          }
        },
        () => {pendiente = false;},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    };

    const id = setInterval(enviar, SOCKET_CONFIGURACION.LOCATION_INTERVAL_MS);
    enviar();
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [esConductorModo, esEnfocado, viaje?.status, viajeId]);

  usarEfecto(() => {
    if (esConductorModo) {
      establecerPasajeroUbicacion(null);
      return;
    }
    Geolocation.getCurrentPosition(
      (posicion: any) => {
        if (esMontadoReferencia.current)
        establecerPasajeroUbicacion({
          latitude: posicion.coords.latitude,
          longitude: posicion.coords.longitude
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
    const wid = Geolocation.watchPosition(
      (posicion: any) => {
        if (esMontadoReferencia.current)
        establecerPasajeroUbicacion({
          latitude: posicion.coords.latitude,
          longitude: posicion.coords.longitude
        });
      },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
    return () => {
      if (wid !== null) Geolocation.clearWatch(wid);
    };
  }, [esConductorModo]);

  const rutaVisible = !!viaje && ['llegado', 'en_curso', 'completing'].includes(viaje.status);
  const rutaPuntoClave = viaje ? [
  viaje.pickupLocation,
  ...(viaje.waypoints || []).map((parada) => parada.location),
  viaje.dropoffLocation].
  map((punto) => `${punto.latitude},${punto.longitude}`).join(';') : '';

  usarEfecto(() => {
    if (!viaje || !rutaVisible) {
      establecerRutaCoordenadas(null);
      establecerRutaError(false);
      return;
    }
    let cancelado = false;
    establecerRutaCoordenadas(null);
    establecerRutaError(false);
    (async () => {
      try {
        const { polyline: polilinea } = await viajesServicio.obtenerRutaViaje(viaje.rideId);
        const coordenadas = decodificarPolilinea(polilinea);
        if (coordenadas.length < 2 || coordenadas.some((punto) => !Number.isFinite(punto.latitude) || !Number.isFinite(punto.longitude)))
        throw new Error('Geometría de ruta inválida');
        if (!cancelado) establecerRutaCoordenadas(coordenadas);
      } catch {
        if (!cancelado) establecerRutaError(true);
      }
    })();
    return () => {cancelado = true;};
  }, [viaje?.rideId, rutaVisible, rutaPuntoClave, rutaReintentar]);

  // ── Helpers ──
  const decodificarPolilinea = (enc: string) => {
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
    return puntos;
  };

  const cargarViajeDetalles = async () => {
    if (esCargandoReferencia.current || !viajeId) return;
    try {
      esCargandoReferencia.current = true;
      const d: any = await viajesServicio.obtenerViajePorId(viajeId);
      if (!d || !esMontadoReferencia.current) return;
      const mapeado: ActivoViaje = {
        rideId: d.id,
        status: d.status,
        passengerName: d.passenger?.name || 'Pasajero',
        passengerPhone: d.passenger?.phone || '',
        passengerRating: d.passenger?.rating || 0,
        passengerProfilePicture: d.passenger?.profilePhoto,
        driverName: d.driver?.User?.name || 'Conductor',
        driverPhone: d.driver?.User?.phone || '',
        driverRating: d.driver?.User?.rating || 0,
        driverProfilePicture: d.driver?.User?.profilePhoto,
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
        eta: Math.floor((d.duration || 0) / 60),
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
      establecerEsRenovando(false);
      if (
      d.passengerReadyAt &&
      !anteriorPasajeroListoEnReferencia.current &&
      esConductorModo)

      establecerMostrarPasajeroListoNotificacion(true);
      anteriorPasajeroListoEnReferencia.current = d.passengerReadyAt;
    } catch (error: any) {
      if (esMontadoReferencia.current && error?.message !== 'AbortError') {
        establecerEsCargando(false);
        establecerEsRenovando(false);
      }
    } finally {
      esCargandoReferencia.current = false;
    }
  };

  const manejarLlegado = () => {
    if (!viaje?.rideId || viaje.status !== 'aceptado') return;
    establecerLlegadoConfirmarError('');
    establecerMostrarLlegadoConfirmarModal(true);
  };

  const confirmarLlegado = async () => {
    if (!viaje?.rideId || llegadoConfirmarEnFlightReferencia.current) return;
    llegadoConfirmarEnFlightReferencia.current = true;
    establecerEsCargando(true);
    establecerLlegadoConfirmarError('');
    try {
      await viajesServicio.marcarLlegada(viaje.rideId);
      establecerMostrarLlegadoConfirmarModal(false);
      establecerViaje((p) => p ? { ...p, status: 'llegado' } : null);
    } catch (error: any) {
      establecerLlegadoConfirmarError(error?.message || 'No se pudo confirmar la llegada. Inténtalo de nuevo.');
    } finally {
      llegadoConfirmarEnFlightReferencia.current = false;
      establecerEsCargando(false);
    }
  };

  const manejarPasajeroListo = async () => {
    if (!viajeId) return;
    try {
      establecerEsCargando(true);
      await viajesServicio.marcarPasajeroListo(viajeId);
      establecerPasajeroListo(true);
      establecerMostrarLlegadoNotificacion(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message);
    } finally {
      establecerEsCargando(false);
    }
  };

  const registrarEmergencia = async () => {
    if (!viajeId || !puedeRegistrarEmergencia || emergenciaEnCurso.current) return;
    emergenciaEnCurso.current = true;
    establecerRegistrandoEmergencia(true);
    establecerErrorEmergencia('');
    try {
      const ubicacion = await new Promise<{latitud: number; longitud: number} | undefined>(resolver => {
        Geolocation.getCurrentPosition(({ coords }) => resolver({
          latitud: coords.latitude, longitud: coords.longitude
        }), () => resolver(undefined), { timeout: 3000, maximumAge: 10000 });
      });
      const { contactos, registradaEnCentral } = await viajesServicio.registrarEmergencia(viajeId, ubicacion);
      establecerMostrarEmergencyConfirmarModal(false);
      if (!registradaEnCentral) {
        Alert.alert('Alerta guardada', 'Esta versión del servidor no confirma que se haya avisado a la central ni a tus contactos.');
        return;
      }
      const detalle = !contactos?.total ? 'No tienes contactos de emergencia registrados.' :
        `SMS aceptados por el proveedor: ${contactos.aceptados} de ${contactos.total}.` +
        (contactos.fallidos ? ` No se pudieron enviar ${contactos.fallidos}.` : '');
      Alert.alert('Alerta registrada en la central', detalle);
    } catch (error: any) {
      establecerErrorEmergencia(error?.data?.error || 'No se pudo registrar la alerta. Intenta nuevamente.');
    } finally {
      emergenciaEnCurso.current = false;
      establecerRegistrandoEmergencia(false);
    }
  };

  const manejarInicioViaje = async () => {
    if (!viaje?.rideId) return;
    try {
      establecerEsCargando(true);
      await viajesServicio.iniciarViaje(viaje.rideId);
      establecerViaje((p) => p ? { ...p, status: 'en_curso' } : null);
    } catch (error: any) {
      Alert.alert('Error', error?.message);
    } finally {
      establecerEsCargando(false);
    }
  };

  const manejarCompletarViaje = () => {
    if (!viajeId || viaje?.status !== 'en_curso') return;
    establecerCompletarConfirmarError('');
    establecerMostrarCompletarConfirmarModal(true);
  };

  const confirmarCompletarViaje = async () => {
    if (!viajeId || completarConfirmarEnFlightReferencia.current) return;
    completarConfirmarEnFlightReferencia.current = true;
    establecerEsCargando(true);
    establecerCompletarConfirmarError('');
    try {
      await viajesServicio.completarViaje(viajeId, {} as any);
      establecerMostrarCompletarConfirmarModal(false);
      navegacion.navigate('RideCompleted' as const, { rideId: viajeId });
    } catch (error: any) {
      establecerCompletarConfirmarError(error?.message || 'No se pudo finalizar el viaje. Inténtalo de nuevo.');
    } finally {
      completarConfirmarEnFlightReferencia.current = false;
      establecerEsCargando(false);
    }
  };

  const manejarCancelarViaje = async () => {
    if (!viaje?.rideId) return;

    const esPasajeroConConductor =
    !esConductorModo &&
    ['aceptado', 'llegado', 'en_curso'].includes(viaje.status);

    if (esConductorModo || esPasajeroConConductor) {
      try {
        establecerEsCargando(true);
        establecerSeleccionadoCancelarMotivoId(null);
        establecerCancelarPaso('reasons');
        const motivos = await viajesServicio.obtenerMotivosCancelacion(
          esConductorModo ? 'conductor' : 'pasajero'
        );
        establecerCancelacionMotivos(motivos);
        establecerMostrarCancelarModal(true);
      } catch (error: any) {
        Alert.alert(
          'Error',
          'No se pudieron cargar los motivos de cancelación'
        );
      } finally {
        establecerEsCargando(false);
      }
    } else {
      const mensaje = 'Cancelar solicitud';
      Alert.alert(mensaje, '¿Estás seguro?', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: mensaje,
        style: 'destructive',
        onPress: async () => {
          try {
            establecerEsCargando(true);
            await viajesServicio.cancelarViaje(
              viaje.rideId,
              'Cancelado por pasajero',
              'pasajero'
            );
            establecerViaje((anterior) => anterior ? { ...anterior, status: 'cancelado', cancelledBy: 'pasajero' } : anterior);
          } catch (error: any) {
            Alert.alert('Error', error?.message);
          } finally {
            establecerEsCargando(false);
          }
        }
      }]
      );
    }
  };

  const manejarConfirmarCancelar = async () => {
    if (!viaje?.rideId) return;
    try {
      establecerEsCargando(true);
      await viajesServicio.cancelarViaje(
        viaje.rideId,
        esConductorModo ? 'Cancelado por conductor' : 'Cancelado por pasajero',
        esConductorModo ? 'conductor' : 'pasajero',
        seleccionadoCancelarMotivoId ?? undefined
      );
      establecerMostrarCancelarModal(false);
      establecerViaje((anterior) => anterior ? {
        ...anterior,
        status: 'cancelado',
        cancelledBy: esConductorModo ? 'conductor' : 'pasajero'
      } : anterior);
    } catch (error: any) {
      Alert.alert('Error', error?.message);
    } finally {
      establecerEsCargando(false);
    }
  };

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  const manejarReversoPulsar = usarFuncionRetorno(() => {
    if (viaje?.status === 'cancelado') return true;
    if (!viaje?.rideId) return true;

    const mensaje = esConductorModo ? 'Cancelar viaje' : 'Cancelar solicitud';
    Alert.alert(mensaje, '¿Estás seguro?', [
    { text: 'Atrás', style: 'cancel' },
    {
      text: mensaje,
      style: 'destructive',
      onPress: async () => {
        try {
          establecerEsCargando(true);
          await viajesServicio.cancelarViaje(
            viaje.rideId,
            esConductorModo ?
            'Cancelado por conductor' :
            'Cancelado por pasajero',
            esConductorModo ? 'conductor' : 'pasajero' as any
          );

          establecerViaje((anterior) => anterior ? {
            ...anterior,
            status: 'cancelado',
            cancelledBy: esConductorModo ? 'conductor' : 'pasajero'
          } : anterior);
        } catch (error: any) {
          Alert.alert('Error', error?.message);
        } finally {
          establecerEsCargando(false);
        }
      }
    }]
    );

    return true; // Prevenir comportamiento por defecto
  }, [viaje?.rideId, viaje?.status, esConductorModo]);

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      const suscripcion = ReversoManejador.addEventListener(
        'hardwareBackPress',
        manejarReversoPulsar
      );
      return () => suscripcion.remove();
    }, [manejarReversoPulsar])
  );

  const manejarEnviarContraOferta = async () => {
    const precio = parseFloat(contraOfertaPrecio);
    if (!viaje?.rideId || isNaN(precio) || precio <= 0) {
      Alert.alert('Error', 'Ingresa un precio válido');
      return;
    }
    try {
      establecerEsEnviandoOferta(true);
      await viajesServicio.enviarContraoferta(viaje.rideId, precio);
      Alert.alert(
        'Oferta enviada',
        `Bs. ${precio.toFixed(2)} enviados al pasajero`,
        [
        {
          text: 'OK',
          onPress: () => {
            establecerMostrarContraOfertaModal(false);
            establecerContraOfertaPrecio('');
            navegacion.navigate('DriverRideRequest' as any);
          }
        }]

      );
    } catch (error: any) {
      Alert.alert('Error', error?.message);
    } finally {
      establecerEsEnviandoOferta(false);
    }
  };

  // ── Guard states ──
  if (esCargando && !viaje) {
    return (
      <SeguraZonaVista style={s.root}>
        <Vista style={s.centered}>
          <ActividadIndicador size="large" color={T.accent} />
          <Texto style={s.loadingText}>Cargando viaje…</Texto>
        </Vista>
      </SeguraZonaVista>);

  }
  if (!viaje) {
    return (
      <SeguraZonaVista style={s.root}>
        <Vista style={s.centered}>
          <Texto style={s.errorText}>No se pudo cargar el viaje</Texto>
          <PulsableOpacidad style={s.retryBtn} onPress={cargarViajeDetalles}>
            <Texto style={s.retryBtnText}>Reintentar</Texto>
          </PulsableOpacidad>
        </Vista>
      </SeguraZonaVista>);

  }

  if (viaje.status === 'cancelado') {
    const canceladoPorMe = viaje.cancelledBy === (esConductorModo ? 'conductor' : 'pasajero');
    const mensaje = canceladoPorMe ?
    'Cancelaste este viaje.' :
    viaje.cancelledBy === 'conductor' ?
    'El conductor canceló el viaje.' :
    viaje.cancelledBy === 'pasajero' ?
    'El pasajero canceló el viaje.' :
    'Este viaje fue cancelado.';
    return (
      <SeguraZonaVista style={s.cancelledScreen}>
        <Vista style={s.cancelledContent}>
          <Vista style={s.cancelledIcon}>
            <X size={36} color={T.white} strokeWidth={2.4} />
          </Vista>
          <Texto style={s.cancelledTitle}>Viaje cancelado</Texto>
          <Texto style={s.cancelledMessage}>{mensaje}</Texto>
          <Texto style={s.cancelledReturn}>Volviendo al inicio…</Texto>
        </Vista>
      </SeguraZonaVista>);

  }

  const estadoEtiqueta = Estado[viaje.status]?.(esConductorModo) || viaje.status;
  const mostrarNombre = esConductorModo ?
  viaje.passengerName :
  viaje.driverName || 'Conductor';
  const mostrarCalificacion = esConductorModo ? viaje.passengerRating : viaje.driverRating;
  const mostrarViajeRuta = ['llegado', 'en_curso', 'completing'].includes(viaje.status);
  const mostrarPasajeroMarcador = viaje.status === 'aceptado';
  const ajustarMapaHastaViaje = () => {
    const viajePuntos = mostrarViajeRuta ?
    [
    viaje.pickupLocation,
    ...(viaje.waypoints || []).map((parada) => parada.location),
    viaje.dropoffLocation,
    ...(rutaCoordenadas || [])] :

    [esConductorModo ? viaje.pickupLocation : pasajeroUbicacion || viaje.pickupLocation, viaje.driverLocation].
    filter((punto): punto is NonNullable<typeof punto> => !!punto);
    if (viajePuntos.length > 1) {
      activoMapaReferencia.current?.fitToCoordinates(viajePuntos, {
        edgePadding: { top: margenes.top + 70, right: 70, bottom: 65, left: 35 },
        animated: true
      });
    } else if (viajePuntos.length === 1) {
      activoMapaReferencia.current?.animateToRegion({
        ...viajePuntos[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      });
    }
  };

  return (
    <SeguraZonaVista style={s.root} edges={['bottom']}>
      {/* ── MAP ── */}
      <Vista style={s.mapWrap}>
        <MapaVista
          {...MAPA_CLARO}
          ref={activoMapaReferencia}
          onMapReady={() => establecerMapaListo(true)}
          onRegionChange={manejarMapaRegionCambio}
          onRegionChangeComplete={manejarMapaRegionCambio}
          style={s.map}
          rotateEnabled={false}
          initialRegion={{
            latitude: mostrarViajeRuta ?
            (viaje.pickupLocation.latitude + viaje.dropoffLocation.latitude) / 2 :
            viaje.pickupLocation.latitude,
            longitude: mostrarViajeRuta ?
            (viaje.pickupLocation.longitude + viaje.dropoffLocation.longitude) / 2 :
            viaje.pickupLocation.longitude,
            latitudeDelta: mostrarViajeRuta ? 0.05 : 0.02,
            longitudeDelta: mostrarViajeRuta ? 0.05 : 0.02
          }}>

          {/* Driver */}
          {viaje.driverLocation &&
          <Marker
            coordinate={viaje.driverLocation}
            title={esConductorModo ? 'Tú · conductor' : 'Conductor'}
            description={viaje.driverName || 'Ubicación del conductor'}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={((viaje.driverLocation.heading ?? 0) + 90) % 360}
            tracksViewChanges
            flat
            zIndex={3}>

              <Vista style={s.carMapMarker} collapsable={false}>
                <Icono.TaxiSuperior size={taxiTamano} />
              </Vista>
            </Marker>
          }

          {/* Antes de llegar, el conductor ve el punto de recogida como pasajero. */}
          {mostrarPasajeroMarcador && esConductorModo &&
          <Marker
            coordinate={viaje.pickupLocation}
            title="Pasajero · punto de recogida"
            description="Punto acordado, no ubicación GPS en vivo"
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={2}>

              <Vista style={s.mapIconMarker} collapsable={false}>
                <PasajeroMapaIcono />
              </Vista>
            </Marker>
          }

          {/* La ruta y sus extremos aparecen al confirmar la llegada. */}
          {mostrarViajeRuta &&
          <>
              <Marker coordinate={viaje.pickupLocation} description={viaje.pickupLocation.address} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
                <Vista style={s.mapIconMarker} collapsable={false}>
                  <PasajeroMapaIcono />
                </Vista>
              </Marker>
              <Marker coordinate={viaje.dropoffLocation} description={viaje.dropoffLocation.address} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
                <Vista style={s.mapIconMarker} collapsable={false}>
                  <DestinoIndicadorIcon />
                </Vista>
              </Marker>
            </>
          }

          {/* Waypoints */}
          {mostrarViajeRuta &&
          (viaje.waypoints || []).map((parada, indice) =>
          <Marker
            key={`wp-${indice}`}
            coordinate={parada.location}
            title={`P${parada.sequence || indice + 1}`}>

                <ParadaMapaIcon number={parada.sequence || indice + 1} />
              </Marker>
          )}

          {/* Passenger */}
          {mostrarPasajeroMarcador && !esConductorModo && pasajeroUbicacion &&
          <Marker
            coordinate={pasajeroUbicacion}
            title="Tú · pasajero"
            description="Tu ubicación actual"
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={2}>

              <Vista style={s.mapIconMarker} collapsable={false}>
                <PasajeroMapaIcono />
              </Vista>
            </Marker>
          }

          {/* Route */}
          {rutaCoordenadas &&
          rutaCoordenadas.length > 0 &&
          mostrarViajeRuta &&
          <AnimadoRutaPolilinea
            coordinates={rutaCoordenadas}
            strokeColor={T.accent}
            strokeWidth={6} />

          }
        </MapaVista>
        <Vista style={[s.mapStatusBanner, { top: margenes.top + 12 }]} pointerEvents="none">
          <Texto style={s.mapStatusText}>{estadoEtiqueta}</Texto>
        </Vista>
        {rutaError && mostrarViajeRuta &&
        <PulsableOpacidad
          style={[s.mapRouteError, { top: margenes.top + 70 }]}
          onPress={() => establecerRutaReintentar((valor) => valor + 1)}
          accessibilityRole="button"
          accessibilityLabel="Reintentar trazado de la ruta">

            <Texto style={s.mapRouteErrorText}>No se pudo trazar la ruta · Reintentar</Texto>
          </PulsableOpacidad>
        }
        <Vista style={s.mapControls} pointerEvents="box-none">
          {puedeRegistrarEmergencia && <PulsableOpacidad
            style={s.mapControlButton}
            onPress={() => {
              establecerErrorEmergencia('');
              establecerMostrarEmergencyConfirmarModal(true);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Emergencia">

            <ShieldAlert size={27} color={T.danger} strokeWidth={2.1} />
          </PulsableOpacidad>}
          <PulsableOpacidad
            style={s.mapControlButton}
            onPress={ajustarMapaHastaViaje}
            disabled={!mapaListo}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Mostrar trayecto completo en el mapa">

            <MapaIcon.MiUbicacion size={30} color="#000000" strokeWidth={2} />
          </PulsableOpacidad>
        </Vista>
      </Vista>

      {/* ── PANEL ── */}
      <Vista style={s.panel}>
        <Vista style={s.panelHandle} />
      <DesplazableVista
          style={s.panelScroll}
          contentContainerStyle={s.panelContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
          <RenovarControl
            refreshing={esRenovando}
            onRefresh={() => {
              establecerEsRenovando(true);
              cargarViajeDetalles();
            }}
            tintColor={T.accent} />

          }>

        {/* Person */}
        <Vista style={s.personRow}>
          <Vista style={s.avatar}>
            {esConductorModo && viaje.passengerProfilePicture ?
              <Imagen
                source={privadoImagenOrigen(viaje.passengerProfilePicture)}
                style={s.avatarImage} /> :

              !esConductorModo && viaje.driverProfilePicture ?
              <Imagen
                source={privadoImagenOrigen(viaje.driverProfilePicture)}
                style={s.avatarImage} /> :

              esConductorModo ?
              <Icono.Usuario size={22} color={T.accent} /> :

              <Icono.Car size={22} color={T.accent} />
              }
          </Vista>
          <Vista style={s.personInfo}>
            <Texto style={s.personName} numberOfLines={2}>{mostrarNombre}</Texto>
            {!esConductorModo && (viaje.vehicleInfo || viaje.licensePlate) &&
              <Vista style={s.vehicleRow}>
                {viaje.vehicleInfo &&
                <Texto style={s.subText}>{viaje.vehicleInfo}</Texto>
                }
                {viaje.licensePlate &&
                <Vista style={s.plateBadge}>
                    <Texto style={s.plateText}>
                      {viaje.licensePlate.toUpperCase()}
                    </Texto>
                  </Vista>
                }
              </Vista>
              }
            <Vista style={s.ratingRow}>
              <Icono.Star size={12} color={T.accent} />
              <Texto style={s.ratingText}>
                {(mostrarCalificacion || 0).toFixed(1)}
              </Texto>
            </Vista>
          </Vista>
          <Vista style={s.fareBlock}>
            <Texto style={s.fareLabel}>TU TARIFA</Texto>
            <Texto style={s.fareValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Bs {viaje.fare.toFixed(2)}
            </Texto>
          </Vista>
        </Vista>

        {/* Route addresses */}
        <Vista style={s.routeCard}>
          <Vista style={s.routeRow}>
            <Vista style={s.routeIconSlot}>
              <PasajeroMapaIcono size={30} bare />
            </Vista>
            <Vista style={s.routeTexts}>
              <Texto style={s.routeAddr} numberOfLines={2}>
                {viaje.pickupLocation.address}
              </Texto>
            </Vista>
          </Vista>
          {(viaje.waypoints || []).map((parada, indice) =>
            <React.Fragment key={`wp-${indice}`}>
              <Vista style={s.vSep}>
                <Vista style={s.vLine} />
              </Vista>
              <Vista style={s.routeRow}>
                <Vista style={s.routeStopMarker}>
                  <ParadaMapaIcon number={parada.sequence || indice + 1} size={28} />
                </Vista>
                <Vista style={s.routeTexts}>
                  <Texto style={s.routeAddr} numberOfLines={2}>
                    {parada.address}
                  </Texto>
                </Vista>
              </Vista>
            </React.Fragment>
            )}
          <Vista style={s.vSep}>
            <Vista style={s.vLine} />
          </Vista>
          <Vista style={s.routeRow}>
            <Vista style={s.routeIconSlot}>
              <DestinoIndicadorIcon size={30} bare />
            </Vista>
            <Vista style={s.routeTexts}>
              <Texto style={s.routeAddr} numberOfLines={2}>
                {viaje.dropoffLocation.address}
              </Texto>
            </Vista>
          </Vista>
        </Vista>

        {/* Stats */}
        <Vista style={s.statsCard}>
          <Vista style={s.statItem}>
            <Icono.Distancia size={15} color="#FFFFFF" />
            <Texto style={s.statVal}>{viaje.distance.toFixed(1)} km</Texto>
          </Vista>
          <Vista style={s.statSep} />
          <Vista style={s.statItem}>
            <Icono.Reloj size={15} color="#FFFFFF" />
            <Texto style={s.statVal}>{viaje.duration} min</Texto>
          </Vista>
        </Vista>
      </DesplazableVista>

        {/* Actions */}
        <Vista style={s.actionsWrap}>
          {esConductorModo ?
          <>
              {viaje.status === 'aceptado' &&
            <PulsableOpacidad
              style={s.primaryBtn}
              onPress={manejarLlegado}
              disabled={esCargando}
              activeOpacity={0.85}>

                  {esCargando ?
              <ActividadIndicador size="small" color={T.white} /> :

              <Texto style={s.primaryBtnTxt}>Llegué a recogida</Texto>
              }
                </PulsableOpacidad>
            }
              {viaje.status === 'llegado' &&
            <>
                  {pasajeroListo &&
              <Vista style={s.readyBadge}>
                      <Icono.Comprobar size={14} color={T.success} />
                      <Texto style={s.readyBadgeTxt}>
                        Pasajero listo — puedes iniciar
                      </Texto>
                    </Vista>
              }
                  <PulsableOpacidad
                style={s.primaryBtn}
                onPress={manejarInicioViaje}
                disabled={esCargando}
                activeOpacity={0.85}>

                    {esCargando ?
                <ActividadIndicador size="small" color={T.white} /> :

                <Texto style={s.primaryBtnTxt}>Iniciar viaje</Texto>
                }
                  </PulsableOpacidad>
                </>
            }
              {viaje.status === 'en_curso' &&
            <>
                  <PulsableOpacidad
                style={[s.primaryBtn, { marginBottom: 10 }]}
                onPress={manejarCompletarViaje}
                disabled={esCargando}
                activeOpacity={0.85}>

                    {esCargando ?
                <ActividadIndicador size="small" color={T.white} /> :

                <Texto style={s.primaryBtnTxt}>Finalizar viaje</Texto>
                }
                  </PulsableOpacidad>

                  <PulsableOpacidad
                style={s.cancelRideBtn}
                onPress={manejarCancelarViaje}
                disabled={esCargando}
                activeOpacity={0.8}>

                    <Texto style={s.cancelRideBtnText}>Cancelar viaje</Texto>
                  </PulsableOpacidad>
                </>
            }
            </> :

          <>
              {viaje.status !== 'en_curso' &&
            <PulsableOpacidad
              style={s.cancelRideBtn}
              onPress={manejarCancelarViaje}
              disabled={esCargando}
              activeOpacity={0.8}>

                  <Texto style={s.cancelRideBtnText}>Cancelar viaje</Texto>
                </PulsableOpacidad>
            }
              {viaje.status === 'en_curso' &&
            <Vista style={s.infoBtn}>
                  <Texto style={s.infoBtnTxt}>Viaje en curso</Texto>
                </Vista>
            }
            </>
          }
        </Vista>
      </Vista>

      <ConfirmarInferiorHoja
        visible={mostrarLlegadoConfirmarModal && viaje.status === 'aceptado'}
        title="¿Llegaste a recogida?"
        message="Confirma que estás en el punto acordado con el pasajero."
        confirmLabel="Sí, ya llegué"
        cancelLabel="Todavía no"
        loading={esCargando}
        error={llegadoConfirmarError}
        onConfirm={confirmarLlegado}
        onCancel={() => {
          establecerMostrarLlegadoConfirmarModal(false);
          establecerLlegadoConfirmarError('');
        }} />

      <ConfirmarInferiorHoja
        visible={mostrarCompletarConfirmarModal && viaje.status === 'en_curso'}
        title="¿Finalizar viaje?"
        message="Confirma que el pasajero llegó a su destino."
        confirmLabel="Finalizar viaje"
        cancelLabel="Seguir viaje"
        loading={esCargando}
        error={completarConfirmarError}
        onConfirm={confirmarCompletarViaje}
        onCancel={() => {
          establecerMostrarCompletarConfirmarModal(false);
          establecerCompletarConfirmarError('');
        }} />

      <ConfirmarInferiorHoja
        visible={mostrarEmergencyConfirmarModal && puedeRegistrarEmergencia}
        title="¿Estás en una emergencia?"
        message="La central verá tu alerta. Se intentará avisar por SMS a tus contactos de emergencia y compartir tu ubicación si está disponible."
        confirmLabel="Activar alerta"
        cancelLabel="Cancelar"
        loading={registrandoEmergencia}
        error={errorEmergencia}
        onConfirm={registrarEmergencia}
        onCancel={() => establecerMostrarEmergencyConfirmarModal(false)} />


      {/* ── COUNTER OFFER MODAL ── */}
      <Modal
        transparent
        visible={mostrarContraOfertaModal}
        animationType="slide"
        onRequestClose={() => establecerMostrarContraOfertaModal(false)}>

        <Vista style={s.modalOverlay}>
          <Vista style={s.sheet}>
            <Vista style={s.sheetHandle} />
            <Texto style={s.sheetTitle}>Contraoferta de tarifa</Texto>
            <Vista style={s.fareBox}>
              <Texto style={s.fareBoxLabel}>Tarifa propuesta</Texto>
              <Texto style={s.fareBoxVal}>Bs {viaje.fare.toFixed(2)}</Texto>
            </Vista>
            <Texto style={s.inputLabel}>Tu contraoferta (Bs.)</Texto>
            <TextoEntrada
              style={s.input}
              placeholder="Ej: 45.50"
              placeholderTextColor={T.inkLight}
              keyboardType="decimal-pad"
              value={contraOfertaPrecio}
              onChangeText={establecerContraOfertaPrecio}
              editable={!esEnviandoOferta} />

            <Texto style={s.helperTxt}>
              Puedes proponer una tarifa diferente a la del pasajero
            </Texto>
            <Vista style={s.sheetBtns}>
              <PulsableOpacidad
                style={s.sheetCancelBtn}
                onPress={() => {
                  establecerMostrarContraOfertaModal(false);
                  establecerContraOfertaPrecio('');
                }}
                disabled={esEnviandoOferta}>

                <Texto style={s.sheetCancelTxt}>Cancelar</Texto>
              </PulsableOpacidad>
              <PulsableOpacidad
                style={s.sheetSubmitBtn}
                onPress={manejarEnviarContraOferta}
                disabled={esEnviandoOferta}
                activeOpacity={0.85}>

                {esEnviandoOferta ?
                <ActividadIndicador size="small" color={T.white} /> :

                <Texto style={s.sheetSubmitTxt}>Enviar oferta</Texto>
                }
              </PulsableOpacidad>
            </Vista>
          </Vista>
        </Vista>
      </Modal>

      {/* ── DRIVER CANCEL MODAL ── */}
      <Modal
        transparent
        visible={mostrarCancelarModal}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          if (esCargando) return;
          if (cancelarPaso === 'confirm') establecerCancelarPaso('reasons');else
          establecerMostrarCancelarModal(false);
        }}>

        <Vista style={s.modalOverlay}>
          <Vista style={[s.sheet, s.cancelSheet, { paddingBottom: Math.max(margenes.bottom, 8) + 8 }]}>
            <Vista style={s.cancelHeaderRow}>
              {cancelarPaso === 'confirm' ?
              <PulsableOpacidad
                style={s.cancelHeaderButton}
                onPress={() => establecerCancelarPaso('reasons')}
                disabled={esCargando}
                accessibilityRole="button"
                accessibilityLabel="Volver a los motivos">

                  <ArrowIzquierda size={23} color="#111118" strokeWidth={2.3} />
                </PulsableOpacidad> :
              <Vista style={s.cancelHeaderButton} />}
              <Vista style={s.cancelSheetHandle} />
              {cancelarPaso === 'reasons' ?
              <PulsableOpacidad
                style={s.cancelHeaderButton}
                onPress={() => establecerMostrarCancelarModal(false)}
                disabled={esCargando}
                accessibilityRole="button"
                accessibilityLabel="Cerrar motivos de cancelación">

                  <X size={23} color="#111118" strokeWidth={2.3} />
                </PulsableOpacidad> :
              <Vista style={s.cancelHeaderButton} />}
            </Vista>

            {cancelarPaso === 'reasons' ?
            <>
                <Texto style={s.cancelSheetTitle}>¿Por qué cancelas el viaje?</Texto>
                <Texto style={s.cancelSheetSubtitle}>Selecciona un motivo o continúa sin indicarlo.</Texto>
                <DesplazableVista
                style={s.cancelReasonsScroll}
                contentContainerStyle={s.cancelReasonsContent}
                showsVerticalScrollIndicator={false}>

                  {cancelacionMotivos.length === 0 &&
                <Texto style={s.cancelEmpty}>No hay motivos disponibles.</Texto>
                }
                  {cancelacionMotivos.map((motivo, indice) =>
                <PulsableOpacidad
                  key={motivo.id}
                  style={[
                  s.reasonBtn,
                  indice < cancelacionMotivos.length - 1 && s.reasonBtnDivider,
                  seleccionadoCancelarMotivoId === motivo.id && s.reasonBtnSelected]
                  }
                  onPress={() => {
                    establecerSeleccionadoCancelarMotivoId(motivo.id);
                    establecerCancelarPaso('confirm');
                  }}
                  activeOpacity={0.7}>

                      <Texto
                    style={[s.reasonTxt, seleccionadoCancelarMotivoId === motivo.id && s.reasonTxtSelected]}>

                        {motivo.description}
                      </Texto>
                      <ChevronDerecha size={18} color="#8D8098" strokeWidth={2} />
                    </PulsableOpacidad>
                )}
                </DesplazableVista>
                <Vista style={s.cancelActions}>
                  <PulsableOpacidad
                  style={s.cancelBackBtn}
                  onPress={() => {
                    establecerSeleccionadoCancelarMotivoId(null);
                    establecerCancelarPaso('confirm');
                  }}
                  activeOpacity={0.85}>

                    <Texto style={s.cancelBackText}>Omitir</Texto>
                  </PulsableOpacidad>
                </Vista>
              </> :

            <>
                <Texto style={s.cancelSheetTitle}>¿Cancelar el viaje?</Texto>
                <Texto style={s.cancelSheetSubtitle}>
                  Si confirmas, este viaje se cancelará para ambos.
                </Texto>
                <Vista style={s.cancelActions}>
                  <PulsableOpacidad
                  style={s.cancelBackBtn}
                  onPress={() => establecerMostrarCancelarModal(false)}
                  disabled={esCargando}
                  activeOpacity={0.85}>

                    <Texto style={s.cancelBackText}>Seguir buscando</Texto>
                  </PulsableOpacidad>
                  <PulsableOpacidad
                  style={[s.cancelConfirmBtn, esCargando && s.cancelConfirmBtnDisabled]}
                  onPress={manejarConfirmarCancelar}
                  disabled={esCargando}
                  activeOpacity={0.85}>

                    {esCargando ?
                  <ActividadIndicador size="small" color={T.white} /> :

                  <Texto style={s.cancelConfirmText}>Quiero cancelar</Texto>
                  }
                  </PulsableOpacidad>
                </Vista>
              </>
            }
          </Vista>
        </Vista>
      </Modal>

      {/* ── ARRIVED NOTIFICATION (passenger) ── */}
      <Modal
        transparent
        visible={mostrarLlegadoNotificacion}
        animationType="slide"
        onRequestClose={() => establecerMostrarLlegadoNotificacion(false)}>

        <Vista style={s.modalOverlay}>
          <Vista style={s.notifSheet}>
            <Vista style={[s.notifIcon, { backgroundColor: T.accentSoft }]}>
              <Icono.Car size={32} color={T.accent} />
            </Vista>
            <Texto style={s.notifTitle}>¡El conductor llegó!</Texto>
            <Texto style={s.notifSub}>
              Tu conductor está esperando en el punto de recogida
            </Texto>
            <PulsableOpacidad
              style={[s.primaryBtn, { width: '100%' }]}
              onPress={manejarPasajeroListo}
              disabled={esCargando}
              activeOpacity={0.85}>

              {esCargando ?
              <ActividadIndicador size="small" color={T.white} /> :

              <>
                  <Icono.Comprobar size={16} color={T.white} />
                  <Texto style={s.primaryBtnTxt}>Ya voy</Texto>
                </>
              }
            </PulsableOpacidad>
          </Vista>
        </Vista>
      </Modal>

      {/* ── PASSENGER READY (driver) ── */}
      <Modal
        transparent
        visible={mostrarPasajeroListoNotificacion}
        animationType="slide"
        onRequestClose={() => establecerMostrarPasajeroListoNotificacion(false)}>

        <Vista style={s.modalOverlay}>
          <Vista style={s.notifSheet}>
            <Vista style={[s.notifIcon, { backgroundColor: T.successSoft }]}>
              <Icono.Comprobar size={32} color={T.success} />
            </Vista>
            <Texto style={s.notifTitle}>¡Pasajero listo!</Texto>
            <Texto style={s.notifSub}>
              El pasajero está listo para subir al vehículo
            </Texto>
            <PulsableOpacidad
              style={[
              s.primaryBtn,
              { backgroundColor: T.success, width: '100%' }]
              }
              onPress={() => establecerMostrarPasajeroListoNotificacion(false)}
              activeOpacity={0.85}>

              <Icono.Comprobar size={16} color={T.white} />
              <Texto style={s.primaryBtnTxt}>Entendido</Texto>
            </PulsableOpacidad>
          </Vista>
        </Vista>
      </Modal>
      <Toast
        message={confirmacionMensaje}
        visible={!!confirmacionMensaje}
        position="top"
        onHide={() => establecerConfirmacionMensaje('')} />

    </SeguraZonaVista>);

};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = EstiloHoja.create({
  root: { flex: 1, backgroundColor: T.white },
  cancelledScreen: { flex: 1, backgroundColor: T.white },
  cancelledContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  cancelledIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  cancelledTitle: { fontSize: 25, fontWeight: '700', color: T.ink, textAlign: 'center' },
  cancelledMessage: { fontSize: 16, lineHeight: 23, color: T.inkMid, textAlign: 'center', marginTop: 10 },
  cancelledReturn: { fontSize: 13, color: T.inkLight, textAlign: 'center', marginTop: 28 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  },
  loadingText: { fontSize: 15, color: T.inkMid, fontWeight: '500' },
  errorText: { fontSize: 15, color: T.danger, fontWeight: '600' },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: T.accent,
    borderRadius: 12
  },
  retryBtnText: { color: T.white, fontSize: 14, fontWeight: '600' },

  // Map
  mapWrap: { flex: 1, overflow: 'hidden', backgroundColor: T.bg },
  map: { flex: 1 },
  carMapMarker: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // La rotación se aplica al marcador nativo para no recortar el taxi.
  mapIconMarker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mapStatusBanner: { position: 'absolute', alignSelf: 'center', maxWidth: '92%', marginHorizontal: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: T.ink },
  mapRouteError: { position: 'absolute', alignSelf: 'center', maxWidth: '92%', borderRadius: 10, backgroundColor: T.white, paddingHorizontal: 14, paddingVertical: 10, elevation: 4 },
  mapRouteErrorText: { color: T.danger, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  mapStatusText: { fontSize: 15, fontWeight: '700', color: T.white, textAlign: 'center' },
  mapControls: { position: 'absolute', bottom: 35, right: 10, alignItems: 'center', gap: 10, zIndex: 15 },
  mapControlButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2
  },
  markerDot: { width: 8, height: 8, borderRadius: 4 },
  markerLabel: {
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.white,
    paddingHorizontal: 6
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.white
  },

  // Panel
  panel: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    flexShrink: 1
  },
  panelHandle: { width: 32, height: 3, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  panelScroll: { flexShrink: 1 },
  panelContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },

  // Person
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24
  },
  personInfo: { flex: 1, minWidth: 0 },
  personName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 0
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: T.accentSoft, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginTop: 4 },
  ratingText: { fontSize: 11, color: T.accent, fontWeight: '800' },
  subText: { fontSize: 11.5, color: '#64748B', fontWeight: '500', flexShrink: 1 },
  vehicleRow: {
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 1
  },
  plateBadge: {
    backgroundColor: '#111118',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1
  },
  fareBlock: { alignItems: 'flex-end', maxWidth: '42%', flexShrink: 1 },
  fareLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 0.4, marginBottom: 3 },
  fareValue: { fontSize: 35, fontWeight: '900', color: '#000000', fontFamily: 'Montserrat', lineHeight: 38 },

  // Route
  routeCard: {
    backgroundColor: T.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeIconSlot: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routeStopMarker: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routeTexts: { flex: 1 },
  routeAddr: {
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 19
  },
  vSep: { paddingLeft: 14.25, paddingVertical: 2 },
  vLine: { width: 1.5, height: 6, backgroundColor: '#CBD5E1' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 10
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7
  },
  statSep: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.28)' },
  statVal: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Actions
  actionsWrap: { gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.accent
  },
  primaryBtnTxt: {
    fontSize: 19,
    fontWeight: '800',
    color: T.white,
    letterSpacing: 0.2
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.accentSoft,
    borderWidth: 1,
    borderColor: T.accentSoft
  },
  infoBtnTxt: { fontSize: 19, fontWeight: '700', color: T.accent },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border
  },
  dangerBtnTxt: { fontSize: 16, fontWeight: '700', color: T.danger },
  cancelRideBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  cancelRideBtnText: { fontSize: 19, fontWeight: '700', color: '#111118' },
  reasonBtn: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  reasonBtnDivider: { borderBottomWidth: 1, borderBottomColor: '#E9E5ED' },
  reasonBtnSelected: {
    backgroundColor: '#F3EAFC',
    borderRadius: 10
  },
  reasonTxt: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: '#111118',
    fontWeight: '600'
  },
  reasonTxtSelected: {
    color: '#321348',
    fontWeight: '700'
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.successSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: T.success
  },
  readyBadgeTxt: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: T.success },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 44
  },
  cancelSheet: { paddingTop: 12 },
  cancelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cancelHeaderButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cancelSheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA' },
  cancelSheetTitle: { fontSize: 22, fontWeight: '700', color: '#111118', textAlign: 'center' },
  cancelSheetSubtitle: { fontSize: 15, lineHeight: 21, color: '#7A7A8A', textAlign: 'center', marginTop: 8, marginBottom: 18 },
  cancelReasonsScroll: { maxHeight: 300, width: '100%', backgroundColor: '#F7F7F9', borderRadius: 14, borderWidth: 1, borderColor: '#ECE8F0' },
  cancelReasonsContent: { padding: 4 },
  cancelEmpty: { fontSize: 15, color: '#7A7A8A', textAlign: 'center', paddingVertical: 20 },
  cancelActions: { gap: 10, marginTop: 18 },
  cancelConfirmBtn: { minHeight: 54, borderRadius: 12, backgroundColor: '#7514C5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancelConfirmBtnDisabled: { opacity: 0.5 },
  cancelConfirmText: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  cancelBackBtn: { minHeight: 54, borderRadius: 12, backgroundColor: '#F2F2F5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancelBackText: { fontSize: 19, fontWeight: '700', color: '#111118', textAlign: 'center' },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 20
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.ink,
    textAlign: 'center',
    marginBottom: 16
  },
  fareBox: {
    backgroundColor: T.accentSoft,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16
  },
  fareBoxLabel: { fontSize: 12, color: T.inkMid, marginBottom: 4 },
  fareBoxVal: { fontSize: 24, fontWeight: '800', color: '#000000' },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.ink,
    marginBottom: 8
  },
  input: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.ink,
    marginBottom: 8
  },
  helperTxt: {
    fontSize: 12,
    color: T.inkLight,
    fontStyle: 'italic',
    marginBottom: 20
  },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border
  },
  sheetCancelTxt: { fontSize: 14, fontWeight: '600', color: T.inkMid },
  sheetSubmitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetSubmitTxt: { fontSize: 14, fontWeight: '700', color: T.white },

  // Notification sheets
  notifSheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 52,
    alignItems: 'center',
    gap: 0
  },
  notifIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  notifTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: T.ink,
    textAlign: 'center',
    marginBottom: 10
  },
  notifSub: {
    fontSize: 14,
    color: T.inkMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28
  },
  ghostBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  ghostBtnTxt: { fontSize: 14, color: T.inkLight, fontWeight: '600' }
});

export default ActivoViajePantalla;
