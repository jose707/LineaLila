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
  Animated,
  ScrollView as DesplazableVista,
  Modal,
  Pressable,
  Image as Imagen,
  BackHandler as ReversoManejador,
  NativeModules as NativoModules,
  Platform as Plataforma,
  useWindowDimensions,
  AppState as AplicacionEstado } from
'react-native';
import Geolocation from '@react-native-community/geolocation';
import { ArrowLeft as ArrowIzquierda, CheckCircle, ChevronRight as ChevronDerecha, ShieldAlert, X } from 'lucide-react-native';
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
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { usarAjustes } from '../context/AjustesContexto';
import { viajesServicio } from "../services/viajes.servicio";
import socketServicio from "../services/socket.servicio";
import { API_BASE_URL, SOCKET_CONFIGURACION } from "../config/constantes";
import { AlmacenamientoAuxiliar } from '../services/storage';
import { actualizarConductorRumbo } from "../utils/conductorRumbo";
import type { ConductorRumboEstado } from "../utils/conductorRumbo";
import { tamanoMarcadorTaxi } from "../utils/taxiMarcadorSize";
import Toast from "../components/Aviso";
import ConfirmarInferiorHoja from "../components/ConfirmarInferiorSheet";
import { AnimadoRutaPolilinea } from "../components/AnimadoRutaPolilinea";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import { Icon as MapaIcon, InsigniaPerfilVerificado } from '../theme/icons';
import { OpcionesEmergenciaViajeActivo, usarEmergenciaViajeActivo } from '../components/EmergenciaViajeActivo';
import { ViajeActivoIconos as Icono } from '../components/ViajeActivoIconos';
import { usarConexionViajeActivo, type ActivoViaje } from '../hooks/usarConexionViajeActivo';
import { usarPanelViajeActivo } from '../hooks/usarPanelViajeActivo';
import { usarRutaViajeActivo } from '../hooks/usarRutaViajeActivo';

const T = {
  bg: '#F7F7F9',
  white: '#FFFFFF',
  ink: '#111118',
  inkMid: '#7A7A8A',
  accent: '#7514C5',
  danger: '#DC2626',
  border: '#E5E5EA'
};

const radioPanel = 24;

type AccionesConductorProps = {
  estado: ActivoViaje['status'];
  oscuro: boolean;
  cargando: boolean;
  alLlegar: () => void;
  alIniciar: () => void;
  alFinalizar: () => void;
};

function AccionesConductor({ estado, oscuro, cargando, alLlegar, alIniciar, alFinalizar }: AccionesConductorProps) {
  const acciones = {
    aceptado: { texto: 'Llegué a recogida', pulsar: alLlegar },
    llegado: { texto: 'Iniciar viaje', pulsar: alIniciar },
    en_curso: { texto: 'Finalizar viaje', pulsar: alFinalizar }
  };
  if (estado !== 'aceptado' && estado !== 'llegado' && estado !== 'en_curso') return null;
  const accion = acciones[estado];

  return (
    <Vista style={[estilos.acciones, oscuro && estilos.divisorOscuro]}>
      <PulsableOpacidad style={[estilos.boton, estado !== 'aceptado' && estilos.botonNegro]}
        onPress={accion.pulsar} disabled={cargando} activeOpacity={0.85}
        accessibilityRole="button" accessibilityLabel={accion.texto}>
        {cargando ? <ActividadIndicador size="small" color="#FFFFFF" /> : <Texto style={estilos.textoBoton}>{accion.texto}</Texto>}
      </PulsableOpacidad>
    </Vista>
  );
}

const estilos = EstiloHoja.create({
  acciones: { gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  divisorOscuro: { borderTopColor: '#414141' },
  boton: { justifyContent: 'center', alignItems: 'center', minHeight: 54, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#7514C5' },
  botonNegro: { backgroundColor: '#000000' },
  textoBoton: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }
});

export default function ConductorViajeActivoPantalla() {

  const rolViaje = 'conductor' as const;
  const navegacion = usarNavegacion<NavegacionProp<RaizPilaParametroLista>>();
  const ruta = usarRuta<RutaProp<RaizPilaParametroLista, 'DriverActiveRide'>>();
  const { user: usuario } = usarAutenticacion();
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const { rideId: viajeId } = ruta.params || { rideId: 'demo' };
  const margenes = usarSeguraZonaMargenes();
  const { height: altoVentana } = useWindowDimensions();
  const esEnfocado = usarEsEnfocado();

  const [mostrarPasajeroListoNotificacion, establecerMostrarPasajeroListoNotificacion] = usarEstado(false);
  const anteriorPasajeroListoEnReferencia = usarReferencia<string | null>(null);
  const detectarPasajeroListo = usarFuncionRetorno((listoDesde?: string | null) => {
    if (listoDesde && !anteriorPasajeroListoEnReferencia.current) {
      establecerMostrarPasajeroListoNotificacion(true);
    }
    anteriorPasajeroListoEnReferencia.current = listoDesde ?? null;
  }, []);
  const { viaje, establecerViaje, esCargando, establecerEsCargando, esMontadoReferencia, cargarViajeDetalles } =
    usarConexionViajeActivo(viajeId, esEnfocado, detectarPasajeroListo);
  const puedeCancelarViaje = viaje?.status === 'aceptado' || viaje?.status === 'llegado' || viaje?.status === 'en_curso';
  const { altoPanel, establecerAltoPanel, establecerAltoCancelacion, altoVisiblePanel, panelExpandido,
    desplazamientoPanel, panelListo, posicionPlegada, moverPanel, gestoPanel } =
    usarPanelViajeActivo(viajeId, puedeCancelarViaje, Math.max(0, altoVentana - margenes.bottom));
  const { viajeIniciado, minutosEstimados, rutaCoordenadas, rutaError, establecerRutaReintentar } =
    usarRutaViajeActivo(viaje, esEnfocado, esMontadoReferencia, false);
  const puedeRegistrarEmergencia = viaje?.status === 'en_curso';
  const emergencia = usarEmergenciaViajeActivo(viajeId, usuario?.id, esEnfocado, puedeRegistrarEmergencia, esMontadoReferencia);

  const [confirmacionMensaje, establecerConfirmacionMensaje] = usarEstado('');

  usarEfecto(() => {
    if (!viaje || viaje.rideId !== viajeId || !ruta.params?.confirmationMessage) return;
    establecerConfirmacionMensaje(ruta.params.confirmationMessage);
    navegacion.setParams({ confirmationMessage: undefined });
  }, [viaje, viajeId, ruta.params?.confirmationMessage, navegacion]);
  const [mostrarLlegadoConfirmarModal, establecerMostrarLlegadoConfirmarModal] = usarEstado(false);
  const [llegadoConfirmarError, establecerLlegadoConfirmarError] = usarEstado('');
  const [mostrarCompletarConfirmarModal, establecerMostrarCompletarConfirmarModal] = usarEstado(false);
  const [completarConfirmarError, establecerCompletarConfirmarError] = usarEstado('');
  const [altoAviso, establecerAltoAviso] = usarEstado(0);
  const [cerrandoAviso, establecerCerrandoAviso] = usarEstado(false);
  const progresoAviso = usarReferencia(new Animated.Value(0)).current;
  const mostrarAviso = viaje?.status === 'llegado' && mostrarPasajeroListoNotificacion;
  const avisoListo = mostrarAviso && altoAviso > 0 && panelListo;

  usarEfecto(() => {
    if (!avisoListo) {
      progresoAviso.setValue(0);
      establecerCerrandoAviso(false);
      return;
    }
    const animacion = Animated.timing(progresoAviso, {
      toValue: cerrandoAviso ? 0 : 1,
      duration: cerrandoAviso ? 240 : 300,
      useNativeDriver: true
    });
    animacion.start(({ finished }) => {
      if (!finished || !cerrandoAviso) return;
      establecerMostrarPasajeroListoNotificacion(false);
    });
    return () => animacion.stop();
  }, [avisoListo, cerrandoAviso, progresoAviso]);

  const [mostrarCancelarModal, establecerMostrarCancelarModal] = usarEstado(false);
  const [cancelarPaso, establecerCancelarPaso] = usarEstado<'reasons' | 'confirm'>('reasons');
  const [cancelacionMotivos, establecerCancelacionMotivos] = usarEstado<any[]>([]);
  const [seleccionadoCancelarMotivoId, establecerSeleccionadoCancelarMotivoId] = usarEstado<
    string | null>(
    null);
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

  usarEfecto(() => {
    if (!mapaListo || !viaje) return;
    const mostrarRuta = ['llegado', 'en_curso', 'completing'].includes(viaje.status);
    const etapaClave = [
    viajeId,
    viaje.status,
    !!viaje.driverLocation,
    mostrarRuta && !!rutaCoordenadas?.length].
    join(':');
    if (framedMapaEtapaReferencia.current === etapaClave) return;

    const coordenadas = mostrarRuta ?
    [
    ...(viajeIniciado ? (viaje.driverLocation ? [viaje.driverLocation] : []) : [viaje.pickupLocation]),
    ...(viaje.waypoints || []).filter(parada => !viajeIniciado || (!parada.arrivedAt && !parada.departedAt)).map(parada => parada.location),
    viaje.dropoffLocation,
    ...(rutaCoordenadas || [])] :

    [viaje.pickupLocation, viaje.driverLocation].filter((punto): punto is NonNullable<typeof punto> => !!punto);

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
  }, [mapaListo, viaje, viajeId, rutaCoordenadas, margenes.top, viajeIniciado]);

  usarEfecto(() => {
    if (viajeId) socketServicio.establecerActivoViaje(viajeId, true);
  }, [viajeId]);

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
    if (!esEnfocado || !usuario?.id || viaje?.rideId !== viajeId) return;
    if (['aceptado', 'llegado', 'en_curso'].includes(viaje.status)) {
      viajesServicio.recordarViajeActivo(usuario.id, rolViaje, viajeId);
    } else if (viaje.status === 'completado') {
      viajesServicio.olvidarViajeActivo(usuario.id, rolViaje, viajeId);
    }
  }, [esEnfocado, usuario?.id, viajeId, viaje?.rideId, viaje?.status]);

  usarEfecto(() => {
    if (!esEnfocado || viaje?.rideId !== viajeId || viaje.status !== 'cancelado') return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const programarRegreso = () => {
      espera = setTimeout(() => {
        if (usuario?.id) viajesServicio.olvidarViajeActivo(usuario.id, rolViaje, viajeId);
        navegacion.dispatch(CommonActions.reset({
          index: 0,
          routes: [{ name: 'DriverHome' }]
        }));
      }, 2800);
    };
    if (AplicacionEstado.currentState === 'active' || AplicacionEstado.currentState == null) programarRegreso();
    const suscripcion = AplicacionEstado.addEventListener('change', estado => {
      if (espera !== undefined) clearTimeout(espera);
      if (estado === 'active') programarRegreso();
    });
    return () => {
      if (espera !== undefined) clearTimeout(espera);
      suscripcion.remove();
    };
  }, [esEnfocado, viaje?.rideId, viaje?.status, viajeId, usuario?.id, navegacion]);

  usarEfecto(() => {
    if (!viaje) return;
    if (viaje.status === 'completado')
    navegacion.navigate('RideCompleted' as const, {
      rideId: viaje.rideId
    });
  }, [viaje?.status]);

  usarEfecto(() => {
    if (!viaje) return;
    socketServicio.establecerActivoViaje(
      viajeId,
      ['aceptado', 'llegado', 'en_curso'].includes(viaje.status)
    );
  }, [viaje?.status, viajeId]);

  usarEfecto(() => {
    if (Plataforma.OS !== 'android' || !NativoModules.ActiveRideLocationModule) return;
    const tracker = NativoModules.ActiveRideLocationModule;
    const activo = ['aceptado', 'llegado', 'en_curso'].includes(viaje?.status ?? '');
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
  }, [viaje?.status, viajeId]);

  usarEfecto(() => {
    if (
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
  }, [esEnfocado, viaje?.status, viajeId]);

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
      if (usuario?.id) viajesServicio.olvidarViajeActivo(usuario.id, rolViaje, viajeId);
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
    if (!viaje?.rideId || !puedeCancelarViaje || esCargando) return;

    try {
      establecerEsCargando(true);
      establecerSeleccionadoCancelarMotivoId(null);
      establecerCancelarPaso('reasons');
      const motivos = await viajesServicio.obtenerMotivosCancelacion(rolViaje);
      establecerCancelacionMotivos(motivos);
      establecerMostrarCancelarModal(true);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los motivos de cancelación');
    } finally {
      establecerEsCargando(false);
    }
  };

  const manejarConfirmarCancelar = async () => {
    if (!viaje?.rideId || !puedeCancelarViaje || esCargando) return;
    try {
      establecerEsCargando(true);
      await viajesServicio.cancelarViaje(
        viaje.rideId,
        'Cancelado por conductor',
        rolViaje,
        seleccionadoCancelarMotivoId ?? undefined
      );
      establecerMostrarCancelarModal(false);
      establecerViaje((anterior) => anterior ? {
        ...anterior,
        status: 'cancelado',
        cancelledBy: rolViaje
      } : anterior);
    } catch (error: any) {
      Alert.alert('Error', error?.message);
    } finally {
      establecerEsCargando(false);
    }
  };

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      const suscripcion = ReversoManejador.addEventListener('hardwareBackPress', () => true);
      return () => suscripcion.remove();
    }, [])
  );

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
    const canceladoPorMe = viaje.cancelledBy === rolViaje;
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
        </Vista>
      </SeguraZonaVista>);

  }

  const estadoEtiqueta = {
    aceptado: 'Dirígete al punto de recogida',
    llegado: 'Llegaste al punto de recogida',
    en_curso: 'Viaje en curso',
    completing: 'Finalizando viaje…',
    completado: 'Completado',
    cancelado: 'Cancelado'
  }[viaje.status];
  const estimacionDestino = viaje.status === 'en_curso' && minutosEstimados !== null
    ? `Llegarás en ${minutosEstimados} min`
    : null;
  const nombreConductor = viaje.driverName || 'Conductor';
  const mostrarNombre = viaje.passengerName;
  const mostrarCalificacion = viaje.passengerRating;
  const mostrarViajeRuta = ['llegado', 'en_curso', 'completing'].includes(viaje.status);
  const origenMapa = viajeIniciado ? viaje.driverLocation ?? viaje.dropoffLocation : viaje.pickupLocation;
  const mostrarPasajeroMarcador = viaje.status === 'aceptado';
  const acentoPanel = oscuro ? '#D5A6FF' : T.accent;
  const tintaPanel = { color: oscuro ? '#FFFFFF' : T.ink };
  const textoSecundarioPanel = { color: oscuro ? '#BDBDC7' : '#666675' };
  const recorridoAviso = Math.max(0, altoAviso - radioPanel);
  const fotoParticipante = viaje.passengerProfilePicture;
  const participanteVerificado = viaje.passengerVerified;
  const ajustarMapaHastaViaje = () => {
    const viajePuntos = mostrarViajeRuta ?
    [
    ...(viajeIniciado ? (viaje.driverLocation ? [viaje.driverLocation] : []) : [viaje.pickupLocation]),
    ...(viaje.waypoints || []).filter(parada => !viajeIniciado || (!parada.arrivedAt && !parada.departedAt)).map(parada => parada.location),
    viaje.dropoffLocation,
    ...(rutaCoordenadas || [])] :

    [viaje.pickupLocation, viaje.driverLocation].
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
    <SeguraZonaVista style={[s.root, oscuro && s.panelOscuro]} edges={['bottom']}>
      <Vista style={s.superficieViaje}>
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
            (origenMapa.latitude + viaje.dropoffLocation.latitude) / 2 :
            origenMapa.latitude,
            longitude: mostrarViajeRuta ?
            (origenMapa.longitude + viaje.dropoffLocation.longitude) / 2 :
            origenMapa.longitude,
            latitudeDelta: mostrarViajeRuta ? 0.05 : 0.02,
            longitudeDelta: mostrarViajeRuta ? 0.05 : 0.02
          }}>

          {/* Driver */}
          {viaje.driverLocation &&
          <Marker
            coordinate={viaje.driverLocation}
            title={'Tú · conductor'}
            description={nombreConductor}
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
          {mostrarPasajeroMarcador &&
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
              {!viajeIniciado && <Marker coordinate={viaje.pickupLocation} description={viaje.pickupLocation.address} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
                <Vista style={s.mapIconMarker} collapsable={false}>
                  <PasajeroMapaIcono />
                </Vista>
              </Marker>}
              <Marker coordinate={viaje.dropoffLocation} title={estimacionDestino || undefined}
                description={viaje.dropoffLocation.address} anchor={{ x: 0.5, y: estimacionDestino ? 72 / 94 : 0.5 }} zIndex={1}>
                <Vista style={estimacionDestino ? s.destinoConEstimacion : s.mapIconMarker} collapsable={false}>
                  {estimacionDestino && (
                    <Vista style={s.estimacionDestino}>
                      <Texto style={s.estimacionDestinoTexto} numberOfLines={2}>
                        {'Llegarás en\n'}
                        <Texto style={s.estimacionDestinoMinutos}>{`${minutosEstimados} min`}</Texto>
                      </Texto>
                    </Vista>
                  )}
                  <Vista style={s.mapIconMarker}><DestinoIndicadorIcon /></Vista>
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

      </Vista>

      <Vista style={{ height: Math.max(0, altoVisiblePanel - radioPanel) }} pointerEvents="none" />
      <Animated.View style={[s.mapControls, {
        bottom: altoPanel + 16,
        opacity: panelListo ? 1 : 0,
        transform: [{ translateY: avisoListo
          ? Animated.subtract(desplazamientoPanel, Animated.multiply(progresoAviso, recorridoAviso))
          : desplazamientoPanel }]
      }]} pointerEvents={panelListo ? 'box-none' : 'none'}>
          {puedeRegistrarEmergencia && <PulsableOpacidad
            style={s.mapControlButton}
            onPress={emergencia.abrirOpciones}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Abrir opciones de emergencia">

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
      </Animated.View>

      {mostrarAviso && (
        <Animated.View style={[s.avisoDetrasPanel, s.avisoListo, {
          bottom: altoPanel - radioPanel,
          opacity: avisoListo ? 1 : 0,
          transform: [{ translateY: Animated.add(desplazamientoPanel,
            progresoAviso.interpolate({ inputRange: [0, 1], outputRange: [altoAviso, 0] })) }]
        }]} onLayout={({ nativeEvent }) => establecerAltoAviso(nativeEvent.layout.height)}
          pointerEvents={avisoListo ? 'auto' : 'none'}>
          <Vista style={s.avisoFila} accessibilityLiveRegion="polite">
            <CheckCircle size={23} color={T.white} strokeWidth={2.5} />
            <Texto style={s.avisoTitulo}>¡Pasajero listo!</Texto>
            <PulsableOpacidad style={s.avisoAccion} disabled={cerrandoAviso}
              onPress={() => establecerCerrandoAviso(true)} accessibilityRole="button" accessibilityLabel="Entendido">
              <Texto style={s.avisoAccionTexto}>Entendido</Texto>
            </PulsableOpacidad>
          </Vista>

        </Animated.View>
      )}
      <Animated.View style={[s.panel, oscuro && s.panelOscuro, {
        opacity: panelListo ? 1 : 0,
        transform: [{ translateY: desplazamientoPanel }]
      }]} onLayout={({ nativeEvent }) => establecerAltoPanel(nativeEvent.layout.height)}
        pointerEvents={panelListo ? 'auto' : 'none'} {...gestoPanel.panHandlers}>
        <PulsableOpacidad style={s.controlPanel} disabled={posicionPlegada === 0} onPress={() => moverPanel(!panelExpandido)}
          accessibilityRole="button" accessibilityLabel={panelExpandido ? 'Bajar panel del viaje' : 'Subir panel del viaje'}
          accessibilityState={{ expanded: panelExpandido }}>
          <Vista style={[s.panelHandle, oscuro && s.divisorOscuro]} />
        </PulsableOpacidad>
        <Vista style={s.panelContent}>
          <Vista style={s.resumenPanel}>
            {emergencia.tieneAlertaRegistrada && puedeRegistrarEmergencia && (
              <Pressable style={s.alertaRegistrada} onPress={emergencia.abrirEstadoAlerta}
                accessibilityRole="button" accessibilityHint="Abre el estado de tu alerta">
                <ShieldAlert size={22} color={T.white} strokeWidth={2.4} />
                <Texto style={s.alertaRegistradaTexto}>Alerta de emergencia registrada</Texto>
                <ChevronDerecha size={18} color={T.white} strokeWidth={2.4} />
              </Pressable>
            )}
            <Vista style={[s.personCard, oscuro && s.tarjetaPanelOscura]}>
              <Vista style={s.personRow}>
                <Vista style={s.personInfo}>
                  <Vista style={s.personHeading}>
                    <Texto style={[s.personName, tintaPanel]} numberOfLines={2}>{mostrarNombre}</Texto>
                    <Vista style={s.ratingRow}>
                      <Icono.Star size={14} color={acentoPanel} />
                      <Texto style={[s.ratingText, { color: acentoPanel }]}>{(mostrarCalificacion || 0).toFixed(1)}</Texto>
                    </Vista>
                  </Vista>
                  {viaje.status === 'aceptado' && (
                    <Texto style={[s.subText, textoSecundarioPanel]}>Pasajero en espera</Texto>
                  )}
                </Vista>
                <Vista>
                  <Vista style={[s.avatar, oscuro && s.avatarOscuro]}>
                    {fotoParticipante ? (
                      <Imagen source={privadoImagenOrigen(fotoParticipante)} style={s.avatarImage} />
                    ) : (
                      <Icono.Usuario size={30} color={acentoPanel} />
                    )}
                  </Vista>
                  {participanteVerificado && (
                    <InsigniaPerfilVerificado etiqueta="Identidad verificada" />
                  )}
                </Vista>
              </Vista>
            </Vista>

            <Vista style={[s.routeCard, oscuro && s.tarjetaPanelOscura]}>
              <Vista style={s.routeRow}>
                <PasajeroMapaIcono size={26} bare color={tintaPanel.color} />
                <Texto style={[s.routeAddr, tintaPanel]} numberOfLines={2}>{viaje.pickupLocation.address}</Texto>
              </Vista>
              {(viaje.waypoints || []).map((parada, indice) => (
                <Vista style={[s.routeRow, s.routeDivider, oscuro && s.bordePanelOscuro]} key={parada.sequence + '-' + indice}>
                  <Vista style={s.routeIconSlot}>
                    <ParadaMapaIcon number={parada.sequence || indice + 1} size={22} />
                  </Vista>
                  <Texto style={[s.routeAddr, tintaPanel]} numberOfLines={2}>{parada.address}</Texto>
                </Vista>
              ))}
              <Vista style={[s.routeRow, s.routeDivider, oscuro && s.bordePanelOscuro]}>
                <DestinoIndicadorIcon size={26} bare color={tintaPanel.color} />
                <Texto style={[s.routeAddr, tintaPanel]} numberOfLines={2}>{viaje.dropoffLocation.address}</Texto>
              </Vista>
              <Vista style={[s.statsCard, s.routeDivider, oscuro && s.bordePanelOscuro]}>
                <Vista style={s.statItem}>
                  <Icono.Distancia size={16} color={textoSecundarioPanel.color} />
                  <Texto style={[s.statVal, tintaPanel]}>{viaje.distance.toFixed(1)} km</Texto>
                </Vista>
                <Vista style={s.statItem}>
                  <Icono.Reloj size={16} color={textoSecundarioPanel.color} />
                  <Texto style={[s.statVal, tintaPanel]}>{viaje.duration} min</Texto>
                </Vista>
                <Vista style={s.fareBlock}>
                  <Texto style={[s.fareLabel, textoSecundarioPanel]}>Tarifa</Texto>
                  <Texto style={[s.fareValue, tintaPanel]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    Bs {viaje.fare.toFixed(2)}
                  </Texto>
                </Vista>
              </Vista>
            </Vista>
          </Vista>

        </Vista>

        <AccionesConductor estado={viaje.status} oscuro={oscuro} cargando={esCargando}
          alLlegar={manejarLlegado} alIniciar={manejarInicioViaje} alFinalizar={manejarCompletarViaje} />
        {puedeCancelarViaje && (
          <Vista style={s.cancelacionPanel} onLayout={({ nativeEvent }) => establecerAltoCancelacion(nativeEvent.layout.height)}
            importantForAccessibility={panelExpandido ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!panelExpandido}>
            <PulsableOpacidad style={[s.primaryBtn, s.cancelRideBtn]}
              onPress={manejarCancelarViaje} disabled={esCargando || !panelExpandido} activeOpacity={0.8} accessibilityRole="button">
              <Texto style={[s.primaryBtnTxt, s.cancelRideBtnText]}>Cancelar viaje</Texto>
            </PulsableOpacidad>
          </Vista>
        )}
      </Animated.View>
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
      <OpcionesEmergenciaViajeActivo {...emergencia.opciones} oscuro={oscuro}
        margenInferior={margenes.bottom} onSoporte={() => navegacion.navigate('Support')} />
      <Modal
        transparent
        visible={mostrarCancelarModal && puedeCancelarViaje}
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

      <Toast
        message={confirmacionMensaje}
        visible={!!confirmacionMensaje}
        position="top"
        onHide={() => establecerConfirmacionMensaje('')} />

    </SeguraZonaVista>);

}

const s = EstiloHoja.create({
  root: { flex: 1, backgroundColor: T.white },
  superficieViaje: { flex: 1, overflow: 'hidden' },
  cancelledScreen: { flex: 1, backgroundColor: T.white },
  cancelledContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  cancelledIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  cancelledTitle: { fontSize: 25, fontWeight: '700', color: T.ink, textAlign: 'center' },
  cancelledMessage: { fontSize: 16, lineHeight: 23, color: T.inkMid, textAlign: 'center', marginTop: 10 },
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
  mapWrap: { flex: 1, overflow: 'hidden', backgroundColor: T.bg },
  map: { flex: 1 },
  carMapMarker: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  mapIconMarker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  destinoConEstimacion: { width: 188, height: 94, alignItems: 'center', justifyContent: 'space-between' },
  estimacionDestino: { backgroundColor: T.ink, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  estimacionDestinoTexto: { color: T.white, fontSize: 12, fontWeight: '400', textAlign: 'center' },
  estimacionDestinoMinutos: { fontWeight: '700' },
  mapStatusBanner: { position: 'absolute', alignSelf: 'center', maxWidth: '92%', marginHorizontal: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: T.ink },
  mapRouteError: { position: 'absolute', alignSelf: 'center', maxWidth: '92%', borderRadius: 10, backgroundColor: T.white, paddingHorizontal: 14, paddingVertical: 10, elevation: 4 },
  mapRouteErrorText: { color: T.danger, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  mapStatusText: { fontSize: 15, fontWeight: '700', color: T.white, textAlign: 'center' },
  mapControls: { position: 'absolute', right: 10, alignItems: 'center', gap: 10, zIndex: 15 },
  mapControlButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  panel: {
    backgroundColor: T.white,
    borderTopLeftRadius: radioPanel,
    borderTopRightRadius: radioPanel,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  },
  panelOscuro: { backgroundColor: '#1A1A1A' },
  controlPanel: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  panelHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border },
  divisorOscuro: { backgroundColor: '#414141' },
  panelContent: { paddingHorizontal: 16 },
  alertaRegistrada: {
    minHeight: 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: T.danger
  },
  alertaRegistradaTexto: { flex: 1, fontSize: 15, fontWeight: '700', color: T.white },
  avisoDetrasPanel: {
    position: 'absolute', left: 0, right: 0, backgroundColor: T.accent,
    borderTopLeftRadius: radioPanel, borderTopRightRadius: radioPanel,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: radioPanel + 4
  },
  avisoListo: { backgroundColor: '#167348' },
  avisoFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avisoTitulo: { flex: 1, color: T.white, fontSize: 16, fontWeight: '700' },
  avisoAccion: { minWidth: 76, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  avisoAccionTexto: { color: T.white, fontSize: 15, fontWeight: '700' },
  cancelacionPanel: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  resumenPanel: { gap: 12, paddingBottom: 12 },
  personCard: { borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, paddingHorizontal: 14 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  tarjetaPanelOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarOscuro: { backgroundColor: '#222222' },
  avatarImage: { width: '100%', height: '100%' },
  personInfo: { flex: 1, minWidth: 0, gap: 3 },
  personHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personName: { flexShrink: 1, fontSize: 22, fontWeight: '700' },
  subText: { fontSize: 16, lineHeight: 22 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 16, fontWeight: '700' },
  routeCard: { borderRadius: 16, borderWidth: 1, borderColor: '#EAEAF0', paddingHorizontal: 14 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  routeIconSlot: { width: 26, alignItems: 'center' },
  routeAddr: { flex: 1, fontSize: 17, fontWeight: '500', lineHeight: 23 },
  routeDivider: { borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  bordePanelOscuro: { borderColor: '#414141' },
  statsCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, paddingVertical: 11 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal: { fontSize: 15, fontWeight: '600' },
  fareBlock: { marginLeft: 'auto', alignItems: 'flex-end', maxWidth: '50%', flexShrink: 1 },
  fareLabel: { fontSize: 14, fontWeight: '600' },
  fareValue: { fontSize: 28, fontWeight: '800' },
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
  cancelRideBtn: { backgroundColor: '#F7F7F9' },
  cancelRideBtnText: { color: '#111118' },
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
});
