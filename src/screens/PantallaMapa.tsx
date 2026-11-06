import { MAPA_CLARO } from '../theme/mapa';
import React, {
  useState as usarEstado,
  useRef as usarReferencia,
  useEffect as usarEfecto,
  useCallback as usarFuncionRetorno,
  useMemo as usarMemoria } from
'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  ActivityIndicator as ActividadIndicador,
  PermissionsAndroid as PermisosAndroid,
  Platform as Plataforma,
  BackHandler as ReversoManejador,
  useWindowDimensions as usarWindowDimensions,
  Image as Imagen,
  Animated as Animado } from
'react-native';
import { AppState } from 'react-native';
import {
  SafeAreaView as SeguraZonaVista,
  useSafeAreaInsets as usarSeguraZonaMargenes } from
'react-native-safe-area-context';
import MapaVista, { Marker, Region, LatLng as LatitudLongitud } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {
  useNavigation as usarNavegacion,
  useRoute as usarRuta,
  RouteProp as RutaProp,
  useFocusEffect as usarEnfoqueEfecto } from
'@react-navigation/native';
import { NativeStackNavigationProp as NativoPilaNavegacionProp } from '@react-navigation/native-stack';
import {
  ArrowLeft as ArrowIzquierda,
  MapPin as MapaPin,
  X } from
'lucide-react-native';
import { Icon } from '../theme/icons';
import { RaizPilaParametroLista, Detener as Parada } from "../navigation/AplicacionNavegador";
import { CrearViajeSolicitud } from '../types/api';
import { SlideUpMenu } from '../components/SlideUpMenu';
import { RutaResumenTarjeta as RutaResumenCard } from "../components/RutaResumenTarjeta";
import { ParadasModal } from "../components/ParadasModal";
import { AgregarParadaModal } from "../components/AgregarDetenerModal";
import { ViajeSolicitudPanel } from "../components/ViajeSolicitudPanel";
import { AnimadoRutaPolilinea } from "../components/AnimadoRutaPolilinea";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import GuardadoLugaresModal, { GuardadoLugar } from '../components/SavedPlacesModal';
import Toast from "../components/Aviso";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import {
  cacheUbicacionGestor,
  cacheRutaGestor,
  cacheViajeHistorialGestor,
  limpiarVencidoCache } from
"../utils/cacheGestor";
import type { ViajeHistorial } from "../utils/cacheGestor";
import { viajesServicio } from "../services/viajes.servicio";
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { obtenerMiSolicitudEstado } from '../services/admin.servicio';
import { alPrimerPlanoNotificacion } from '../services/firebase.servicio';
import { AlmacenamientoAuxiliar } from '../services/storage';
import socketServicio from "../services/socket.servicio";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const LOCATIONIQ_API_CLAVE = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';
const TARIFA_PASO = 0.5;
const TRAFFIC_CORRECTION_FACTOR = 3;
const PIN_TIP_DESFASE = 106;
const PANEL_SLIDE_DURACION_MILISEGUNDOS = 350;





// ─── TYPES ───────────────────────────────────────────────────────────────────
type MapaPantallaNavegacionPropiedad = NativoPilaNavegacionProp<
  RaizPilaParametroLista,
  'Map'>;

type MapaPantallaRutaPropiedad = RutaProp<RaizPilaParametroLista, 'Map'>;
interface RutaInformacion {
  distance: number;
  duration: number;
  coordinates: LatitudLongitud[];
}
const FlotantePin = ({
  visible,
  address: direccion,
  loading: cargando,
  containerWidth: contenedorAncho,
  containerHeight: contenedorAlto,
  mode: modo = 'origin'







}: {visible: boolean;address: string;loading: boolean;containerWidth: number;containerHeight: number;mode?: 'origin' | 'destination';}) => {
  const pinEstilos = usarMemoria(
    () => ({
      top:
      contenedorAlto > 0 ?
      Math.floor(contenedorAlto / 2) - PIN_TIP_DESFASE :
      0,
      left: contenedorAncho > 0 ? Math.floor(contenedorAncho / 2) - 240 / 2 : 0
    }),
    [contenedorAncho, contenedorAlto]
  );

  if (!visible) return null;

  return (
    <Vista
      pointerEvents="none"
      style={[
      s.pinAnchor,
      {
        top: pinEstilos.top,
        left: pinEstilos.left
      }]
      }>

      {/* El extremo inferior del pin coincide con la coordenada seleccionada. */}
      <Vista style={s.pinStack}>
        {/* Address bubble */}
        {(direccion !== '' || cargando) &&
        <Vista style={s.pinBubble}>
            {cargando ?
          <ActividadIndicador size="small" color={T.accent} /> :

          <Texto style={s.pinBubbleText} numberOfLines={2}>
                {direccion}
              </Texto>
          }
          </Vista>
        }

        {/* Lollipop pin: head + stem */}
        <Vista style={s.pinHead}>
          <Vista style={s.pinHole} />
        </Vista>
        <Vista style={s.pinStem} />
      </Vista>
    </Vista>);

};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const MapaPantalla = () => {
  const navegacion = usarNavegacion<MapaPantallaNavegacionPropiedad>();
  const ruta = usarRuta<MapaPantallaRutaPropiedad>();
  const { user: usuario, updateUser: actualizarUsuario, isDriverMode: esConductorModo } = usarAutenticacion();
  const margenes = usarSeguraZonaMargenes();
  const { height: pantallaAlto } = usarWindowDimensions();
  const [documentosPorReenviar, establecerDocumentosPorReenviar] = usarEstado(false);

  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    let activo = true;
    const actualizar = async () => {
      const estado = await obtenerMiSolicitudEstado();
      if (activo) establecerDocumentosPorReenviar(
        (estado.status === 'rechazado' || estado.status === 'observado') &&
        (estado.request?.rejectedDocuments?.length ?? 0) > 0
      );
    };
    actualizar();
    const app = AppState.addEventListener('change', estado => {
      if (estado === 'active') actualizar();
    });
    const mensaje = alPrimerPlanoNotificacion((_titulo, _cuerpo, datos) => {
      if (datos.action === 'resubmit_driver_documents') actualizar();
    });
    return () => { activo = false; app.remove(); mensaje(); };
  }, []));

  // Restricción: MapScreen solo para pasajeros
  usarEnfoqueEfecto(
    React.useCallback(() => {
      if (esConductorModo) {
        Alert.alert(
          'Acceso denegado',
          'Solo los pasajeros pueden solicitar viajes. Cambia a modo pasajero en tu perfil.',
          [
          {
            text: 'Ir a perfil',
            onPress: () => navegacion.navigate('Profile')
          }]

        );
        // Redirigir a DriverHome
        (navegacion as any).navigate('DriverHome');
      }
    }, [esConductorModo, navegacion])
  );

  // 🔒 BackHandler para double-back-to-exit
  usarEfecto(() => {
    let reversoPulsarCantidad = 0;
    let reversoPulsarEspera: ReturnType<typeof setTimeout> | null = null;

    const alReversoPulsar = () => {
      if (guardandoModo) {
        establecerGuardandoModo(null);
        return true;
      }

      reversoPulsarCantidad++;

      if (reversoPulsarCantidad === 1) {
        Alert.alert('Salir', 'Presiona otra vez para cerrar la app');

        reversoPulsarEspera = setTimeout(() => {
          reversoPulsarCantidad = 0;
        }, 2000);

        return true;
      } else if (reversoPulsarCantidad === 2) {
        if (reversoPulsarEspera) clearTimeout(reversoPulsarEspera);
        ReversoManejador.exitApp();
        return true;
      }

      return false;
    };

    const suscripcion = ReversoManejador.addEventListener(
      'hardwareBackPress',
      alReversoPulsar
    );

    return () => {
      suscripcion.remove();
      if (reversoPulsarEspera) clearTimeout(reversoPulsarEspera);
    };
  }, []);

  const [recogidaUbicacion, establecerRecogidaUbicacion] = usarEstado<LatitudLongitud | null>(null);
  const [recogidaDireccion, establecerRecogidaDireccion] = usarEstado('');
  const [temporalRecogidaDireccion, establecerTemporalRecogidaDireccion] = usarEstado('');
  const [destinoUbicacion, establecerDestinoUbicacion] = usarEstado<LatitudLongitud | null>(
    null
  );
  const [destinoDireccion, establecerDestinoDireccion] = usarEstado('');
  const [paradas, establecerParadas] = usarEstado<
    {latitude: number;longitude: number;address: string;}[]>(
    []);
  const [todosParadas, establecerTodosParadas] = usarEstado<Parada[]>([]);
  const [editandoParadaIndice, establecerEditandoParadaIndice] = usarEstado<number | null>(null);
  const [ubicacionCargando, establecerUbicacionCargando] = usarEstado(false);
  const [mostrarMarcador, establecerMostrarMarcador] = usarEstado(true);
  const [tieneUbicacionPermiso, establecerTieneUbicacionPermiso] = usarEstado(false);
  const [realUbicacion, establecerRealUbicacion] = usarEstado<LatitudLongitud | null>(null);
  const [inicialUbicacionCargado, establecerInicialUbicacionCargado] = usarEstado(false); // ── ESTADO DEL MAPA Y UBICACIÓN ──
  const [seleccionandoModo, establecerSeleccionandoModo] = usarEstado<'origin' | 'destination' | null>(null);
  const [esAddingParada, establecerEsAddingParada] = usarEstado(false);
  const [guardandoModo, establecerGuardandoModo] = usarEstado<'home' | 'work' | 'favorite' | null>(null);
  const [mapaCentroUbicacion, establecerMapaCentroUbicacion] = usarEstado<LatitudLongitud | null>(
    null
  );
  const [searchingDireccion, establecerSearchingDireccion] = usarEstado(false);
  const [rutaInformacion, establecerRutaInformacion] = usarEstado<RutaInformacion | null>(null);
  const [rutaCoordenadas, establecerRutaCoordenadas] = usarEstado<LatitudLongitud[]>([]);
  const [mapaGeneration, establecerMapaGeneration] = usarEstado(0);
  const [mapaListo, establecerMapaListo] = usarEstado(false);
  const [rutaCargando, establecerRutaCargando] = usarEstado(false);
  const rutaRevisionReferencia = usarReferencia(0);
  const omitirRutaCacheReferencia = usarReferencia(false);
  const [esCreandoViaje, establecerEsCreandoViaje] = usarEstado(false);
  const [rapidoAssigning, establecerRapidoAssigning] = usarEstado(false);
  const creandoViajeReferencia = usarReferencia(false);
  const [sugeridoTarifa, establecerSugeridoTarifa] = usarEstado<number | null>(null);
  const [originalTarifa, establecerOriginalTarifa] = usarEstado<number | null>(null);
  const [mostrarTarifaEditor, establecerMostrarTarifaEditor] = usarEstado(false);
  const [mostrarClienteMenu, establecerMostrarClienteMenu] = usarEstado(false);
  const [negociacionModo, establecerNegociacionModo] = usarEstado(false);

  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    creandoViajeReferencia.current = false;
    establecerEsCreandoViaje(false);
    if (esConductorModo) return;
    let activo = true;
    viajesServicio.obtenerAsignacionRapidaActual().then(({ ride: viaje }) => {
      if (!activo || !viaje || creandoViajeReferencia.current) return;
      if (viaje.status === 'solicitado') navegacion.navigate('QuickAssignment', { rideId: viaje.id });else
      navegacion.navigate('ActiveRide', { rideId: viaje.id });
    }).catch(() => {});
    return () => {activo = false;};
  }, [esConductorModo, navegacion]));
  const alternarAnimacion = usarReferencia(new Animado.Value(0)).current;

  usarEfecto(() => {
    Animado.spring(alternarAnimacion, {
      toValue: negociacionModo ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 10
    }).start();
  }, [negociacionModo, alternarAnimacion]);
  const [seleccionadoVehiculoTipo, establecerSeleccionadoVehiculoTipo] =
  usarEstado<string>('taxi');
  const [seleccionadoPagoMetodo, establecerSeleccionadoPagoMetodo] =
  usarEstado<string>('efectivo');
  const [mapaWrapDimensions, establecerMapaWrapDimensions] = usarEstado({
    width: 0,
    height: 0
  });
  const [rutaPanelAlto, establecerRutaPanelAlto] = usarEstado(0);
  const [buscarPanelMontado, establecerBuscarPanelMontado] = usarEstado(true);
  const [solicitudPanelVisible, establecerSolicitudPanelVisible] = usarEstado(false);
  const buscarPanelDesplazamiento = usarReferencia(new Animado.Value(0)).current;
  const solicitudPanelDesplazamiento = usarReferencia(new Animado.Value(pantallaAlto)).current;
  const rapidoAsignacionPanelOcultoReferencia = usarReferencia(false);
  const negociacionRetornoPendienteReferencia = usarReferencia(false);
  const rutaTarjetaDesplazamiento = usarReferencia(new Animado.Value(-220 - margenes.top)).current;
  const rutaVisualFade = usarReferencia(new Animado.Value(1)).current;
  const [rutaVisualOpacidad, establecerRutaVisualOpacidad] = usarEstado(1);
  const rutaAjustarPendienteReferencia = usarReferencia<number | null>(null);
  const rutaAjustarTemporizadorReferencia = usarReferencia<ReturnType<typeof setTimeout> | null>(null);
  const esReturningHastaInicioReferencia = usarReferencia(false);
  const animarBuscarEntranceReferencia = usarReferencia(false);
  const [tarifaAjustes, establecerTarifaAjustes] = usarEstado<{
    baseFare: number;
    farePerKm: number;
    farePerMinute: number;
  }>({
    baseFare: 12,
    farePerKm: 0.5,
    farePerMinute: 0.58
  });
  const [recienteViajes, establecerRecienteViajes] = usarEstado<ViajeHistorial[]>([]);
  const [recienteViajesCargando, establecerRecienteViajesCargando] = usarEstado(true);
  const [favoritoIds, establecerFavoritoIds] = usarEstado<Set<string>>(new Set());
  const [mostrarParadasModal, establecerMostrarParadasModal] = usarEstado(false);
  const [mostrarAgregarParadaModal, establecerMostrarAgregarParadaModal] = usarEstado(false);
  const [mostrarGuardadoLugaresModal, establecerMostrarGuardadoLugaresModal] = usarEstado(false);
  const [guardadoInicioDireccion, establecerGuardadoInicioDireccion] = usarEstado<GuardadoLugar | null>(null);
  const [guardadoTrabajoDireccion, establecerGuardadoTrabajoDireccion] = usarEstado<GuardadoLugar | null>(null);
  const [guardadoFavoritoLugares, establecerGuardadoFavoritoLugares] = usarEstado<GuardadoLugar[]>([]);
  const [avisoVisible, establecerAvisoVisible] = usarEstado(false);
  const [avisoMensaje, establecerAvisoMensaje] = usarEstado('');
  const [avisoIcono, establecerAvisoIcono] = usarEstado('✓');

  const mapaReferencia = usarReferencia<MapaVista>(null);
  const recogidaMarcadorReferencia = usarReferencia<React.ElementRef<typeof Marker>>(null);
  const destinoMarcadorReferencia = usarReferencia<React.ElementRef<typeof Marker>>(null);
  const mapaRegionReferencia = usarReferencia<Region | null>(ruta.params?.mapRegion ?? null);
  const mapaTamanoReferencia = usarReferencia({ width: 0, height: 0 });
  const direccionLookupRevisionReferencia = usarReferencia(0);
  const manualCentroRevisionReferencia = usarReferencia(0);
  const watchId = usarReferencia<number | null>(null);
  const esManualCenteringReferencia = usarReferencia(false);
  const mostrarRutaTarjeta = Boolean(destinoUbicacion && seleccionandoModo === null);
  const redrawUbicacionMarkers = usarFuncionRetorno(() => {
    recogidaMarcadorReferencia.current?.redraw();
    destinoMarcadorReferencia.current?.redraw();
  }, []);

  usarEfecto(() => navegacion.addListener('focus', () => {
    if (!rapidoAsignacionPanelOcultoReferencia.current) return;
    rapidoAsignacionPanelOcultoReferencia.current = false;
    solicitudPanelDesplazamiento.setValue(0);
  }), [navegacion, solicitudPanelDesplazamiento]);

  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    if (!negociacionRetornoPendienteReferencia.current) return;
    const coordenadas = rutaCoordenadas.length >= 2 ?
    rutaCoordenadas :
    rutaInformacion?.coordinates ?? [];
    if (!recogidaUbicacion || !destinoUbicacion || coordenadas.length < 2) return;
    negociacionRetornoPendienteReferencia.current = false;
    if (rutaCoordenadas.length < 2) establecerRutaCoordenadas(coordenadas);
    establecerMostrarMarcador(false);
    rutaVisualFade.stopAnimation();
    rutaVisualFade.setValue(1);
    establecerRutaVisualOpacidad(1);
    establecerSolicitudPanelVisible(false);
    solicitudPanelDesplazamiento.stopAnimation();
    solicitudPanelDesplazamiento.setValue(pantallaAlto);
    rutaTarjetaDesplazamiento.stopAnimation();
    rutaTarjetaDesplazamiento.setValue(-220 - margenes.top);
    Animado.timing(rutaTarjetaDesplazamiento, {
      toValue: 0,
      duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
      useNativeDriver: true
    }).start();
    // Recreate native map features after the full-screen negotiation map closes.
    // Keep the saved region and geometry; replay only when the new map is ready.
    establecerMapaListo(false);
    establecerMapaGeneration((generation) => generation + 1);
  }, [recogidaUbicacion, destinoUbicacion, rutaCoordenadas, rutaInformacion,
  solicitudPanelDesplazamiento, rutaTarjetaDesplazamiento, rutaVisualFade, pantallaAlto, margenes.top]));

  usarEfecto(() => {
    const escucha = rutaVisualFade.addListener(({ value: valor }) => {
      establecerRutaVisualOpacidad(Math.round(valor * 25) / 25);
    });
    return () => rutaVisualFade.removeListener(escucha);
  }, [rutaVisualFade]);

  usarEfecto(() => {
    rutaTarjetaDesplazamiento.stopAnimation();
    rutaTarjetaDesplazamiento.setValue(-220 - margenes.top);
    if (mostrarRutaTarjeta) {
      Animado.timing(rutaTarjetaDesplazamiento, {
        toValue: 0,
        duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
        useNativeDriver: true
      }).start();
    }
  }, [mostrarRutaTarjeta, margenes.top, rutaTarjetaDesplazamiento]);

  const revealSolicitudPanel = usarFuncionRetorno((revision: number) => {
    if (revision !== rutaRevisionReferencia.current || !destinoUbicacion || esReturningHastaInicioReferencia.current) return;
    rutaAjustarPendienteReferencia.current = null;
    if (rutaAjustarTemporizadorReferencia.current) clearTimeout(rutaAjustarTemporizadorReferencia.current);
    rutaAjustarTemporizadorReferencia.current = null;
    establecerSolicitudPanelVisible(true);
    Animado.timing(solicitudPanelDesplazamiento, {
      toValue: 0,
      duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
      useNativeDriver: true
    }).start();
  }, [destinoUbicacion, solicitudPanelDesplazamiento]);

  usarEfecto(() => {
    if (destinoUbicacion) return;
    const animarEntrance = animarBuscarEntranceReferencia.current;
    animarBuscarEntranceReferencia.current = false;
    esReturningHastaInicioReferencia.current = false;
    rutaAjustarPendienteReferencia.current = null;
    if (rutaAjustarTemporizadorReferencia.current) clearTimeout(rutaAjustarTemporizadorReferencia.current);
    rutaAjustarTemporizadorReferencia.current = null;
    buscarPanelDesplazamiento.stopAnimation();
    solicitudPanelDesplazamiento.stopAnimation();
    rutaVisualFade.stopAnimation();
    buscarPanelDesplazamiento.setValue(animarEntrance ? pantallaAlto : 0);
    solicitudPanelDesplazamiento.setValue(pantallaAlto);
    rutaVisualFade.setValue(1);
    establecerRutaVisualOpacidad(1);
    establecerBuscarPanelMontado(true);
    establecerSolicitudPanelVisible(false);
  }, [destinoUbicacion, solicitudPanelDesplazamiento, rutaVisualFade,
  pantallaAlto, buscarPanelDesplazamiento]);

  usarEfecto(() => () => {
    if (rutaAjustarTemporizadorReferencia.current) clearTimeout(rutaAjustarTemporizadorReferencia.current);
  }, []);

  // ── EFFECTS ──────────────────────────────────────────────────────────────

  // Monitor de cambios en user.rating
  usarEfecto(() => {
  }, [usuario?.calificacion]);

  // Cargar configuración de tarifas según coordenadas
  const cargarTarifaAjustes = usarFuncionRetorno(async (latitud: number, longitud: number) => {
    const ajustes = await viajesServicio.obtenerConfiguracionTarifas(latitud, longitud);
    if (ajustes) {
      establecerTarifaAjustes({
        baseFare: ajustes.baseFare,
        farePerKm: ajustes.farePerKm,
        farePerMinute: ajustes.farePerMinute
      });
    }
  }, []);

  // Refrescar tarifas cuando el origen cambia
  usarEfecto(() => {
    if (recogidaUbicacion) {
      cargarTarifaAjustes(recogidaUbicacion.latitude, recogidaUbicacion.longitude);
    }
  }, [recogidaUbicacion, cargarTarifaAjustes]);

  // Refrescar tarifas cuando el centro del mapa cambia (sin pickup confirmado)
  // Solo cuando no hay pickup, y con un debounce de 1s para no saturar la API
  usarEfecto(() => {
    if (recogidaUbicacion || !mapaCentroUbicacion) return;
    const id = setTimeout(() => {
      cargarTarifaAjustes(mapaCentroUbicacion.latitude, mapaCentroUbicacion.longitude);
    }, 1000);
    return () => clearTimeout(id);
  }, [mapaCentroUbicacion, recogidaUbicacion, cargarTarifaAjustes]);

  // Refrescar datos del usuario cuando abres el modal
  usarEfecto(() => {
    if (mostrarClienteMenu) {
      autenticacionServicio.consultarUsuarioActual().then((actualizadoUsuario) => {
        if (actualizadoUsuario) {
          actualizarUsuario(actualizadoUsuario);
        }
      });
    }
  }, [mostrarClienteMenu, actualizarUsuario]);

  usarEfecto(() => {
    limpiarVencidoCache();
  }, []);

  // Mostrar destinos recientes, independientemente del origen usado antes.
  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    let activo = true;
    establecerRecienteViajesCargando(true);
    cacheViajeHistorialGestor.obtenerViajes().then((viajes) => {
      if (activo) {
        establecerRecienteViajes(viajes.slice(0, 3));
        const guardadoFavoritos = AlmacenamientoAuxiliar.obtenerElemento('favoriteTripIds');
        if (guardadoFavoritos) {
          try {
            const ids = JSON.parse(guardadoFavoritos);
            if (Array.isArray(ids)) establecerFavoritoIds(new Set(ids));
          } catch {/* Un favorito dañado no impide mostrar destinos recientes. */}
        }
      }
    }).finally(() => {
      if (activo) establecerRecienteViajesCargando(false);
    });
    return () => {activo = false;};
  }, []));

  // El historial de búsqueda guarda solo el destino seleccionado.
  usarEfecto(() => {
    if (!destinoUbicacion || !destinoDireccion.trim()) return;
    let activo = true;
    cacheViajeHistorialGestor.agregarViaje({
      destinationLocation: destinoUbicacion,
      destinationAddress: destinoDireccion
    }).then(() => cacheViajeHistorialGestor.obtenerViajes()).then((viajes) => {
      if (activo) establecerRecienteViajes(viajes.slice(0, 3));
    });
    return () => {activo = false;};
  }, [destinoUbicacion, destinoDireccion]);

  // Cargar favoritos y direcciones guardadas
  usarEfecto(() => {
    const cargarGuardadoLugares = () => {
      const guardado = AlmacenamientoAuxiliar.obtenerElemento('favoriteTripIds');
      if (guardado) {
        establecerFavoritoIds(new Set(JSON.parse(guardado)));
      }
      const inicioDatos = AlmacenamientoAuxiliar.obtenerElemento('savedHomeAddress');
      if (inicioDatos) {
        establecerGuardadoInicioDireccion(JSON.parse(inicioDatos));
      }
      const trabajoDatos = AlmacenamientoAuxiliar.obtenerElemento('savedWorkAddress');
      if (trabajoDatos) {
        establecerGuardadoTrabajoDireccion(JSON.parse(trabajoDatos));
      }
      const favDatos = AlmacenamientoAuxiliar.obtenerElemento('savedFavoritePlaces');
      if (favDatos) {
        establecerGuardadoFavoritoLugares(JSON.parse(favDatos));
      }
    };
    cargarGuardadoLugares();
  }, []);

  const alternarFavorito = usarFuncionRetorno((viajeId: string) => {
    establecerFavoritoIds((anterior) => {
      const siguiente = new Set(anterior);
      if (siguiente.has(viajeId)) {
        siguiente.delete(viajeId);
      } else {
        siguiente.add(viajeId);
      }
      AlmacenamientoAuxiliar.establecerElemento('favoriteTripIds', JSON.stringify([...siguiente]));
      return siguiente;
    });
  }, []);

  const asegurarRecogida = async (): Promise<LatitudLongitud | null> => {
    if (recogidaUbicacion) return recogidaUbicacion;
    const realRecogida = mapaCentroUbicacion || realUbicacion;
    if (!realRecogida) return null;
    establecerUbicacionCargando(true);
    const direccion = await obtenerExactoDireccion(realRecogida).catch(() => temporalRecogidaDireccion);
    establecerRecogidaUbicacion(realRecogida);
    establecerRecogidaDireccion(direccion);
    establecerMostrarMarcador(false);
    establecerUbicacionCargando(false);
    return realRecogida;
  };

  const manejarGuardarInicio = async () => {
    const ubicacion = recogidaUbicacion || mapaCentroUbicacion;
    if (!ubicacion) return;
    const direccion = recogidaDireccion || temporalRecogidaDireccion || (await obtenerExactoDireccion(ubicacion));
    const lugar: GuardadoLugar = {
      id: 'home',
      type: 'home',
      label: 'Casa',
      address: direccion,
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude
    };
    establecerGuardadoInicioDireccion(lugar);
    AlmacenamientoAuxiliar.establecerElemento('savedHomeAddress', JSON.stringify(lugar));
    Alert.alert('Casa guardada', 'Tu dirección de casa ha sido guardada.');
  };

  const manejarGuardarTrabajo = async () => {
    const ubicacion = recogidaUbicacion || mapaCentroUbicacion;
    if (!ubicacion) return;
    const direccion = recogidaDireccion || temporalRecogidaDireccion || (await obtenerExactoDireccion(ubicacion));
    const lugar: GuardadoLugar = {
      id: 'work',
      type: 'work',
      label: 'Trabajo',
      address: direccion,
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude
    };
    establecerGuardadoTrabajoDireccion(lugar);
    AlmacenamientoAuxiliar.establecerElemento('savedWorkAddress', JSON.stringify(lugar));
    Alert.alert('Trabajo guardado', 'Tu dirección de trabajo ha sido guardada.');
  };

  const mostrarAviso = (mensaje: string, icono = '✓') => {
    establecerAvisoMensaje(mensaje);
    establecerAvisoIcono(icono);
    establecerAvisoVisible(true);
  };

  usarEfecto(() => {
    const aviso = ruta.params?.quickAssignmentNotice;
    if (!aviso) return;
    mostrarAviso(aviso, '!');
    navegacion.setParams({ quickAssignmentNotice: undefined });
  }, [ruta.params?.quickAssignmentNotice, navegacion]);

  const confirmarGuardarModo = async () => {
    const ubicacion = mapaCentroUbicacion;
    if (!ubicacion || !guardandoModo) return;
    const direccion = temporalRecogidaDireccion || (await obtenerExactoDireccion(ubicacion));
    const lugar: GuardadoLugar = {
      id: guardandoModo === 'favorite' ? `fav-${Date.now()}` : guardandoModo,
      type: guardandoModo === 'favorite' ? 'favorite' : guardandoModo,
      label: guardandoModo === 'home' ? 'Casa' : guardandoModo === 'work' ? 'Trabajo' : direccion.split(',')[0] || 'Favorito',
      address: direccion,
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude
    };
    if (guardandoModo === 'home') {
      establecerGuardadoInicioDireccion(lugar);
      AlmacenamientoAuxiliar.establecerElemento('savedHomeAddress', JSON.stringify(lugar));
    } else if (guardandoModo === 'work') {
      establecerGuardadoTrabajoDireccion(lugar);
      AlmacenamientoAuxiliar.establecerElemento('savedWorkAddress', JSON.stringify(lugar));
    } else {
      establecerGuardadoFavoritoLugares((anterior) => {
        const actualizado = [...anterior, lugar];
        AlmacenamientoAuxiliar.establecerElemento('savedFavoritePlaces', JSON.stringify(actualizado));
        return actualizado;
      });
    }
    establecerGuardandoModo(null);
    mostrarAviso('Se agregó destino correctamente');
    centroHastaUsuarioUbicacion(false);
  };

  const manejarEliminarInicio = () => {
    Alert.alert('Eliminar Casa', '¿Quieres eliminar tu dirección de casa?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Eliminar',
      style: 'destructive',
      onPress: () => {
        establecerGuardadoInicioDireccion(null);
        AlmacenamientoAuxiliar.quitarElemento('savedHomeAddress');
      }
    }]
    );
  };

  const manejarEliminarTrabajo = () => {
    Alert.alert('Eliminar Trabajo', '¿Quieres eliminar tu dirección de trabajo?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Eliminar',
      style: 'destructive',
      onPress: () => {
        establecerGuardadoTrabajoDireccion(null);
        AlmacenamientoAuxiliar.quitarElemento('savedWorkAddress');
      }
    }]
    );
  };

  const manejarEliminarFavorito = (lugarId: string) => {
    Alert.alert('Eliminar favorito', '¿Quieres eliminar este lugar guardado?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Eliminar',
      style: 'destructive',
      onPress: () => {
        establecerGuardadoFavoritoLugares((anterior) => {
          const actualizado = anterior.filter((p) => p.id !== lugarId);
          AlmacenamientoAuxiliar.establecerElemento('savedFavoritePlaces', JSON.stringify(actualizado));
          return actualizado;
        });
      }
    }]
    );
  };

  const manejarAgregarFavorito = () => {
    establecerMostrarGuardadoLugaresModal(false);
    establecerMostrarMarcador(true);
    establecerGuardandoModo('favorite');
  };

  const usarLugarComoDestino = (lugar: GuardadoLugar) => {
    establecerDestinoUbicacion({ latitude: lugar.latitude, longitude: lugar.longitude });
    establecerDestinoDireccion(lugar.address);
  };

  const manejarInicioPulsar = async () => {
    if (guardadoInicioDireccion) {
      await asegurarRecogida();
      usarLugarComoDestino(guardadoInicioDireccion);
      return;
    }
    establecerMostrarMarcador(true);
    establecerGuardandoModo('home');
  };

  const manejarTrabajoPulsar = async () => {
    if (guardadoTrabajoDireccion) {
      await asegurarRecogida();
      usarLugarComoDestino(guardadoTrabajoDireccion);
      return;
    }
    establecerMostrarMarcador(true);
    establecerGuardandoModo('work');
  };

  const manejarFavoritosPulsar = () => {
    establecerMostrarGuardadoLugaresModal(true);
  };

  const manejarSeleccionarGuardadoLugar = async (lugar: GuardadoLugar) => {
    establecerMostrarGuardadoLugaresModal(false);
    await asegurarRecogida();
    usarLugarComoDestino(lugar);
  };

  const manejarRecienteViajePulsar = async (viaje: ViajeHistorial) => {
    if (!(await asegurarRecogida())) {
      Alert.alert('Ubicación no disponible', 'No se pudo definir tu origen actual. Intenta de nuevo.');
      return;
    }
    establecerDestinoUbicacion({
      latitude: viaje.destinationLocation.latitude,
      longitude: viaje.destinationLocation.longitude
    });
    establecerDestinoDireccion(viaje.destinationAddress);
  };

  const guardadoLugares = usarMemoria<GuardadoLugar[]>(() => {
    const lugares: GuardadoLugar[] = [];
    if (guardadoInicioDireccion) lugares.push(guardadoInicioDireccion);
    if (guardadoTrabajoDireccion) lugares.push(guardadoTrabajoDireccion);
    lugares.push(...guardadoFavoritoLugares);
    return lugares;
  }, [guardadoInicioDireccion, guardadoTrabajoDireccion, guardadoFavoritoLugares]);

  usarEfecto(() => {
    if (!ruta.params) return;
    const p = ruta.params as any;
    if (p.reset) {
      restablecerTodos();
      establecerSeleccionandoModo(null);
      establecerParadas([]);
      establecerTodosParadas([]);
      establecerEditandoParadaIndice(null);
      return;
    }
    if (p.pickingMode) {
      establecerSeleccionandoModo(p.pickingMode);
      establecerRecogidaUbicacion(p.pickupLocation || null);
      if (p.pickupAddress) establecerRecogidaDireccion(p.pickupAddress);
      establecerDestinoUbicacion(p.destinationLocation || null);
      if (p.destinationAddress) establecerDestinoDireccion(p.destinationAddress);
      establecerEditandoParadaIndice(p.editingStopIndex ?? null);
      establecerTodosParadas(p.stops || []);
      if (p.stops && p.stops.length > 2) {
        const mid = p.stops.slice(1, p.stops.length - 1).filter((s: any) => s.location?.latitude !== 0 && s.location?.longitude !== 0 && s.address !== '');
        establecerParadas(mid.map((s: any) => ({ latitude: s.location.latitude, longitude: s.location.longitude, address: s.address })));
      } else establecerParadas([]);
      establecerRutaInformacion(null);establecerRutaCoordenadas([]);establecerSugeridoTarifa(null);establecerMostrarMarcador(true);
      return;
    }
    if (p.pickupLocation) {establecerRecogidaUbicacion(p.pickupLocation);establecerMostrarMarcador(false);establecerTemporalRecogidaDireccion(p.pickupAddress || '');}
    if (p.destinationLocation) establecerDestinoUbicacion(p.destinationLocation);else establecerDestinoUbicacion(null);
    if (p.destinationAddress) establecerDestinoDireccion(p.destinationAddress);else establecerDestinoDireccion('');
    if (p.pickupAddress) {establecerRecogidaDireccion(p.pickupAddress);establecerTemporalRecogidaDireccion(p.pickupAddress);}
    if (p.destinationAddress) establecerDestinoDireccion(p.destinationAddress);
    if (p.stops && p.stops.length > 2) {
      const mid = p.stops.slice(1, p.stops.length - 1).filter((s: any) => s.location?.latitude !== 0 && s.location?.longitude !== 0 && s.address !== '');
      establecerParadas(mid.map((s: any) => ({ latitude: s.location.latitude, longitude: s.location.longitude, address: s.address })));
      establecerTodosParadas(p.stops);
    } else {establecerParadas([]);establecerTodosParadas([]);}
  }, [ruta.params]);

  usarEfecto(() => {
    if (!rutaInformacion) {
      establecerSugeridoTarifa(null);
      return;
    }
    const km = rutaInformacion.distance / 1000;
    const mins = rutaInformacion.duration / 60;

    const distanciaTarifa = tarifaAjustes.farePerKm * km;
    const tiempoTarifa = tarifaAjustes.farePerMinute * mins;
    const brutoTarifa = tarifaAjustes.baseFare + distanciaTarifa + tiempoTarifa;
    const redondeadoTarifa = Math.max(1.0, Math.round(brutoTarifa / TARIFA_PASO) * TARIFA_PASO);

    const tarifa = parseFloat(redondeadoTarifa.toFixed(2));
    establecerSugeridoTarifa(tarifa);
    establecerOriginalTarifa(tarifa);
  }, [rutaInformacion, tarifaAjustes]);

  const cancelarAgregarParadaAlMapa = usarFuncionRetorno(() => {
    establecerEsAddingParada(false);
    establecerSeleccionandoModo(null);
    establecerMostrarMarcador(false);
    establecerTemporalRecogidaDireccion(recogidaDireccion);
    const puntos = rutaCoordenadas.length >= 2 ?
    rutaCoordenadas :
    recogidaUbicacion && destinoUbicacion ?
    [recogidaUbicacion, ...paradas, destinoUbicacion] :
    [];
    if (puntos.length >= 2) {
      mapaReferencia.current?.fitToCoordinates(puntos, {
        edgePadding: { top: 200, right: 60, bottom: 110, left: 60 },
        animated: true
      });
    }
  }, [recogidaDireccion, recogidaUbicacion, destinoUbicacion, rutaCoordenadas, paradas]);

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      const alReverso = () => {
        if (creandoViajeReferencia.current) return true;
        if (esAddingParada) {
          cancelarAgregarParadaAlMapa();
          return true;
        }
        if (recogidaUbicacion || destinoUbicacion) {
          restablecerTodos();
          return true;
        }
        return false;
      };
      const sub = ReversoManejador.addEventListener('hardwareBackPress', alReverso);
      return () => sub.remove();
    }, [recogidaUbicacion, destinoUbicacion, esAddingParada, cancelarAgregarParadaAlMapa])
  );

  usarEfecto(() => {
    if (!inicialUbicacionCargado) {
      const seleccionadoRecogida = ruta.params?.pickupLocation;
      if (seleccionadoRecogida) {
        establecerMapaCentroUbicacion(seleccionadoRecogida);
        establecerInicialUbicacionCargado(true);
      } else {
        centroHastaUsuarioUbicacion(false).then((ubicacion) => {
          if (ubicacion) establecerMapaCentroUbicacion(ubicacion);
          establecerInicialUbicacionCargado(true);
        });
      }
    }
    watchId.current = Geolocation.watchPosition(
      (p) =>
      establecerRealUbicacion({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude
      }),
      () => {},
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000
      }
    );
    return () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  // ── HELPERS ──────────────────────────────────────────────────────────────

  const manejarRegionCambioCompletar = async (region: Region) => {
    mapaRegionReferencia.current = region;
    if (rutaAjustarPendienteReferencia.current !== null) {
      revealSolicitudPanel(rutaAjustarPendienteReferencia.current);
    }
    if (esManualCenteringReferencia.current) return;
    const revision = ++direccionLookupRevisionReferencia.current;
    const { width: ancho, height: alto } = mapaWrapDimensions;
    let centro: LatitudLongitud = {
      latitude: region.latitude,
      longitude: region.longitude
    };
    if (ancho > 0 && alto > 0 && mapaReferencia.current) {
      try {
        centro = await mapaReferencia.current.coordinateForPoint({
          x: ancho / 2,
          y: alto / 2 - PIN_TIP_DESFASE
        });
      } catch {









        // La proyección nativa puede no estar lista en el primer render.
      }}if (revision !== direccionLookupRevisionReferencia.current) return;establecerMapaCentroUbicacion(centro);if (!recogidaUbicacion || seleccionandoModo !== null) {try {establecerSearchingDireccion(true);const direccion = await obtenerExactoDireccion(centro);if (revision === direccionLookupRevisionReferencia.current) establecerTemporalRecogidaDireccion(direccion);
      } catch {
      } finally {
        if (revision === direccionLookupRevisionReferencia.current) establecerSearchingDireccion(false);
      }
    }
  };

  const obtenerExactoDireccion = async (coord: LatitudLongitud): Promise<string> => {
    try {
      const cacheado = await cacheUbicacionGestor.obtenerUbicacion(coord);
      if (cacheado) return cacheado.address;
      const r = await fetch(
        `${LOCATIONIQ_BASE_URL}/reverse.php?key=${LOCATIONIQ_API_CLAVE}&lat=${coord.latitude}&lon=${coord.longitude}&format=json&normalizeaddress=1&addressdetails=1&zoom=18`
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      const primero = d.address || {};
      const partes: string[] = [];
      if (primero.road && primero.house_number) partes.push(`${primero.road} ${primero.house_number}`);else
      if (primero.road) partes.push(primero.road);
      if (primero.neighbourhood || primero.suburb) partes.push(primero.neighbourhood || primero.suburb);
      const direccion =
      partes.length > 0 ?
      partes.join(', ') :
      (d.display_name || '').split(',').slice(0, 2).join(',');
      await cacheUbicacionGestor.guardarUbicacion(coord, direccion);
      return direccion;
    } catch {
      return `${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`;
    }
  };

  const solicitudUbicacionPermiso = async () => {
    if (Plataforma.OS !== 'android') {
      establecerTieneUbicacionPermiso(true);
      return true;
    }
    const g = await PermisosAndroid.request(
      PermisosAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permiso de Ubicación',
        message: 'Necesitamos acceder a tu ubicación',
        buttonNeutral: 'Después',
        buttonNegative: 'No',
        buttonPositive: 'OK'
      }
    );
    if (g === PermisosAndroid.RESULTS.GRANTED) {
      establecerTieneUbicacionPermiso(true);
      return true;
    }
    return false;
  };

  const obtenerRealUbicacion = (): Promise<LatitudLongitud> =>
  new Promise(async (resolver, rechazar) => {
    const obtener = (opciones: any) =>
    new Promise<LatitudLongitud>((respuesta, rej) =>
    Geolocation.getCurrentPosition(
      (p) =>
      respuesta({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude
      }),
      rej,
      opciones
    )
    );
    try {
      resolver(
        await obtener({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
      );
    } catch (error: any) {
      try {
        resolver(
          await obtener({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          })
        );
      } catch {
        if (realUbicacion) resolver(realUbicacion);else
        rechazar(error);
      }
    }
  });

  const centroPinEnUbicacion = (ubicacion: LatitudLongitud): Promise<void> => {
    direccionLookupRevisionReferencia.current += 1;
    const revision = ++manualCentroRevisionReferencia.current;
    establecerMapaCentroUbicacion(ubicacion);
    establecerMostrarMarcador(true);
    esManualCenteringReferencia.current = true;
    const latitudDelta = 0.01;
    const alto = mapaTamanoReferencia.current.height;
    const estimadoDesplazamiento = alto > 0 ? PIN_TIP_DESFASE / alto * latitudDelta : 0;
    mapaReferencia.current?.animateToRegion(
      {
        latitude: ubicacion.latitude - estimadoDesplazamiento,
        longitude: ubicacion.longitude,
        latitudeDelta: latitudDelta,
        longitudeDelta: 0.01
      },
      500
    );
    return new Promise((resolver) => setTimeout(async () => {
      if (revision !== manualCentroRevisionReferencia.current) {
        resolver();
        return;
      }
      const mapa = mapaReferencia.current;
      const { width: ancho, height: realAlto } = mapaTamanoReferencia.current;
      if (mapa && ancho > 0 && realAlto > 0) {
        try {
          const [enTip, enCentro] = await Promise.all([
          mapa.coordinateForPoint({ x: ancho / 2, y: realAlto / 2 - PIN_TIP_DESFASE }),
          mapa.coordinateForPoint({ x: ancho / 2, y: realAlto / 2 })]
          );
          if (revision !== manualCentroRevisionReferencia.current) return;
          mapa.animateCamera({ center: {
              latitude: enCentro.latitude + ubicacion.latitude - enTip.latitude,
              longitude: enCentro.longitude + ubicacion.longitude - enTip.longitude
            } }, { duration: 250 });
        } catch {









          // La posición estimada sigue disponible si la proyección aún no responde.
        }}setTimeout(() => {if (revision === manualCentroRevisionReferencia.current) esManualCenteringReferencia.current = false;resolver();}, 300);}, 550));};const centroHastaUsuarioUbicacion = async (mostrarAlerta = true, waitParaCentro = false) => {
    establecerUbicacionCargando(true);
    try {
      if (!tieneUbicacionPermiso && Plataforma.OS === 'android')
      if (!(await solicitudUbicacionPermiso())) {
        establecerUbicacionCargando(false);
        return null;
      }
      const ubicacion = await obtenerRealUbicacion();
      establecerRealUbicacion(ubicacion);
      establecerTemporalRecogidaDireccion(`${ubicacion.latitude.toFixed(4)}, ${ubicacion.longitude.toFixed(4)}`);
      const centering = centroPinEnUbicacion(ubicacion);
      establecerUbicacionCargando(false);
      obtenerExactoDireccion(ubicacion).
      then(establecerTemporalRecogidaDireccion).
      catch(() =>
      establecerTemporalRecogidaDireccion(
        `${ubicacion.latitude.toFixed(4)}, ${ubicacion.longitude.toFixed(4)}`
      )
      );
      if (waitParaCentro) await centering;
      return ubicacion;
    } catch {
      establecerUbicacionCargando(false);
      esManualCenteringReferencia.current = false;
      if (mostrarAlerta)
      Alert.alert('Error de ubicación', 'Verifica que el GPS esté activado.');
      return null;
    }
  };

  const calcularRuta = usarFuncionRetorno(async () => {
    if (!recogidaUbicacion || !destinoUbicacion) return;
    const revision = ++rutaRevisionReferencia.current;
    const omitirCache = omitirRutaCacheReferencia.current;
    omitirRutaCacheReferencia.current = false;
    establecerRutaCargando(true);
    establecerRutaCoordenadas([]);
    const mostrarRuta = (coordenadas: LatitudLongitud[], distancia: number, duracion: number) => {
      if (coordenadas.length < 2) throw new Error('Ruta sin geometría');
      const mismoPunto = (primero: LatitudLongitud, segundo: LatitudLongitud) =>
      Math.abs(primero.latitude - segundo.latitude) < 0.000001 &&
      Math.abs(primero.longitude - segundo.longitude) < 0.000001;
      const desdeRecogida = mismoPunto(coordenadas[0], recogidaUbicacion) ?
      coordenadas :
      [recogidaUbicacion, ...coordenadas];
      const completarRuta = mismoPunto(desdeRecogida[desdeRecogida.length - 1], destinoUbicacion) ?
      desdeRecogida :
      [...desdeRecogida, destinoUbicacion];
      establecerRutaInformacion({ distance: distancia, duration: duracion, coordinates: completarRuta });
      establecerRutaCoordenadas(completarRuta);
    };
    try {
      const cacheado = paradas.length === 0 && !omitirCache ?
      await cacheRutaGestor.obtenerRuta(recogidaUbicacion, destinoUbicacion) :
      null;
      if (revision !== rutaRevisionReferencia.current) return;
      if (cacheado) {
        mostrarRuta(cacheado.coordinates, cacheado.distance, cacheado.duration);
        return;
      }
      const { latitude: sLatitud, longitude: sLongitud } = recogidaUbicacion;
      const { latitude: errorLatitud, longitude: errorLongitud } = destinoUbicacion;

      // Build coordinates string: origin;waypoints;destination
      const paradaCoordenadas = paradas.
      map((parada) => `${parada.longitude},${parada.latitude}`).
      join(';');
      const coordenadasStr = paradaCoordenadas ?
      `${sLongitud},${sLatitud};${paradaCoordenadas};${errorLongitud},${errorLatitud}` :
      `${sLongitud},${sLatitud};${errorLongitud},${errorLatitud}`;

      const r = await fetch(
        `${LOCATIONIQ_BASE_URL}/directions/driving/${coordenadasStr}?key=${LOCATIONIQ_API_CLAVE}&overview=full&geometries=polyline&alternatives=false`
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (revision !== rutaRevisionReferencia.current) return;
      if (d.routes?.length > 0) {
        const rt = d.routes[0];
        const coordenadas = decodificarPolilinea(rt.geometry);
        const brutoDuracion = rt.duration;
        const correctedDuracion = Math.round(brutoDuracion * TRAFFIC_CORRECTION_FACTOR);
        if (paradas.length === 0) {
          await cacheRutaGestor.guardarRuta(recogidaUbicacion, destinoUbicacion, {
            pickupLat: sLatitud,
            pickupLon: sLongitud,
            destLat: errorLatitud,
            destLon: errorLongitud,
            distance: rt.distance,
            duration: correctedDuracion,
            coordinates: coordenadas,
            fare: 0,
            timestamp: Date.now()
          });
        }
        if (revision !== rutaRevisionReferencia.current) return;
        mostrarRuta(coordenadas, rt.distance, correctedDuracion);
      }
    } catch {
      if (revision === rutaRevisionReferencia.current) crearAlternativaRuta();
    } finally {
      if (revision === rutaRevisionReferencia.current) establecerRutaCargando(false);
    }
  }, [recogidaUbicacion, destinoUbicacion, paradas]);

  usarEfecto(() => {
    if (recogidaUbicacion && destinoUbicacion) calcularRuta();else
    {
      rutaRevisionReferencia.current += 1;
      establecerRutaInformacion(null);
      establecerRutaCoordenadas([]);
    }
  }, [calcularRuta, recogidaUbicacion, destinoUbicacion]);

  const decodificarPolilinea = (enc: string): LatitudLongitud[] => {
    const puntos: LatitudLongitud[] = [];
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

  const calcularDistancia = (primero: LatitudLongitud, segundo: LatitudLongitud) => {
    const R = 6371e3,
      φ1 = primero.latitude * Math.PI / 180,
      φ2 = segundo.latitude * Math.PI / 180;
    const Δφ = (segundo.latitude - primero.latitude) * Math.PI / 180,
      Δλ = (segundo.longitude - primero.longitude) * Math.PI / 180;
    const x =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  const crearAlternativaRuta = () => {
    if (!recogidaUbicacion || !destinoUbicacion) return;
    const coordenadas = [
    recogidaUbicacion,
    ...paradas.map((parada) => ({ latitude: parada.latitude, longitude: parada.longitude })),
    destinoUbicacion];

    const d = coordenadas.slice(1).reduce((distancia, punto, indice) => distancia + calcularDistancia(coordenadas[indice], punto), 0);
    establecerRutaInformacion({ distance: d, duration: d / 10, coordinates: coordenadas });
    establecerRutaCoordenadas(coordenadas);
  };

  const formatoDistancia = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  const formatoTiempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600),
      m = Math.floor(segundos % 3600 / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };
  const formatoTemporizador = (segundos: number) => {
    const redondeadoSegundos = Math.round(segundos);
    return `${Math.floor(redondeadoSegundos / 60)}:${String(redondeadoSegundos % 60).padStart(
      2,
      '0'
    )}`;
  };

  const restablecerTodos = (waitParaCentro = false) => {
    establecerRecogidaUbicacion(null);
    establecerRecogidaDireccion('');
    establecerTemporalRecogidaDireccion('');
    establecerDestinoUbicacion(null);
    establecerDestinoDireccion('');
    establecerParadas([]);
    establecerTodosParadas([]);
    establecerMostrarMarcador(true);
    establecerRutaInformacion(null);
    establecerRutaCoordenadas([]);
    establecerSugeridoTarifa(null);
    establecerOriginalTarifa(null);
    establecerMostrarTarifaEditor(false);
    establecerNegociacionModo(false);
    establecerGuardandoModo(null);
    return centroHastaUsuarioUbicacion(false, waitParaCentro);
  };

  const retornoHastaInicio = () => {
    if (esReturningHastaInicioReferencia.current || creandoViajeReferencia.current) return;
    esReturningHastaInicioReferencia.current = true;
    rutaAjustarPendienteReferencia.current = null;
    if (rutaAjustarTemporizadorReferencia.current) clearTimeout(rutaAjustarTemporizadorReferencia.current);
    rutaAjustarTemporizadorReferencia.current = null;
    establecerSolicitudPanelVisible(false);
    Animado.parallel([
    Animado.timing(solicitudPanelDesplazamiento, {
      toValue: pantallaAlto,
      duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
      useNativeDriver: true
    }),
    Animado.timing(rutaTarjetaDesplazamiento, {
      toValue: -220 - margenes.top,
      duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
      useNativeDriver: true
    }),
    Animado.timing(rutaVisualFade, {
      toValue: 0,
      duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
      useNativeDriver: false
    })]
    ).start(({ finished: terminado }) => {
      if (terminado) {
        animarBuscarEntranceReferencia.current = true;
        restablecerTodos(true).finally(() => {
          requestAnimationFrame(() => {
            Animado.timing(buscarPanelDesplazamiento, {
              toValue: 0,
              duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
              useNativeDriver: true
            }).start();
          });
        });
      } else
      esReturningHastaInicioReferencia.current = false;
    });
  };

  const irHastaBuscarPantalla = async () => {
    if (!recogidaUbicacion) {
      if (!mapaCentroUbicacion) return;
      establecerUbicacionCargando(true);
      const direccion = await obtenerExactoDireccion(mapaCentroUbicacion).catch(
        () => temporalRecogidaDireccion
      );
      establecerRecogidaUbicacion(mapaCentroUbicacion);
      establecerRecogidaDireccion(direccion);
      establecerMostrarMarcador(false);
      establecerUbicacionCargando(false);
      navegacion.navigate('Search', {
        pickupLocation: mapaCentroUbicacion,
        pickupAddress: direccion,
        mapRegion: mapaRegionReferencia.current ?? undefined
      });
      return;
    }
    navegacion.navigate('Search', { pickupLocation: recogidaUbicacion, pickupAddress: recogidaDireccion, mapRegion: mapaRegionReferencia.current ?? undefined });
  };

  const confirmarViaje = () => {
    if (!recogidaUbicacion || !destinoUbicacion || !rutaInformacion) {
      Alert.alert('Información incompleta', 'Selecciona origen y destino.');
      return;
    }
    if (esCreandoViaje || creandoViajeReferencia.current) return;
    creandoViajeReferencia.current = true;

    // Crear viaje directamente sin alerts de confirmación
    (async () => {
      establecerEsCreandoViaje(true);
      let rapidoAsignacionIniciado = false;
      try {
        if (!negociacionModo) {
          const solicitud: CrearViajeSolicitud = {
            requestMode: 'asignacion_rapida', requestKey: 'quick_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2),
            pickupLocation: { ...recogidaUbicacion, address: recogidaDireccion },
            dropoffLocation: { ...destinoUbicacion, address: destinoDireccion },
            waypoints: paradas.map((parada) => ({ latitude: parada.latitude, longitude: parada.longitude, address: parada.address })),
            vehicleTypeRequested: seleccionadoVehiculoTipo, paymentMethod: seleccionadoPagoMetodo
          };
          rapidoAsignacionPanelOcultoReferencia.current = true;
          await new Promise<void>((resolver) => {
            Animado.timing(solicitudPanelDesplazamiento, {
              toValue: pantallaAlto,
              duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
              useNativeDriver: true
            }).start(() => resolver());
          });
          rapidoAsignacionIniciado = true;
          establecerRapidoAssigning(true);
          let asignacion;
          try {
            asignacion = await viajesServicio.reservarAsignacionRapida(solicitud);
          } catch (error: any) {
            if (error?.name !== 'AbortError') throw error;
            const real = await viajesServicio.obtenerAsignacionRapidaActual().catch(() => null);
            asignacion = real?.ride ? real : await viajesServicio.reservarAsignacionRapida(solicitud);
          }
          if (!asignacion.ride) throw new Error('No se encontró una reserva.');
          navegacion.navigate('QuickAssignment', {
            rideId: asignacion.ride.id,
            request: solicitud,
            initialSnapshot: asignacion
          });
          establecerNegociacionModo(false);
          return;
        }
        const respuesta = await viajesServicio.crearViaje({
          requestMode: 'negociacion',
          pickupLocation: { ...recogidaUbicacion, address: recogidaDireccion },
          dropoffLocation: {
            ...destinoUbicacion,
            address: destinoDireccion
          },
          waypoints: paradas.map((parada) => ({
            latitude: parada.latitude,
            longitude: parada.longitude,
            address: parada.address
          })),
          distance: rutaInformacion.distance,
          duration: Math.round(rutaInformacion.duration),
          fare: sugeridoTarifa || 0,
          vehicleTypeRequested: seleccionadoVehiculoTipo,
          paymentMethod: seleccionadoPagoMetodo
        });
        // 🔌 Socket: unirse al room del viaje y notificar a conductores cercanos
        socketServicio.unirViaje(respuesta.id);
        socketServicio.notificarViajeCreated(respuesta.id);

        negociacionRetornoPendienteReferencia.current = true;
        navegacion.navigate('Negotiation' as any, {
          rideId: respuesta.id,
          expiresAt: respuesta.expiresAt,
          pickupLocation: { ...recogidaUbicacion },
          pickupAddress: recogidaDireccion,
          destinationLocation: { ...destinoUbicacion },
          destinationAddress: destinoDireccion,
          waypoints: paradas.map((parada) => ({
            latitude: parada.latitude,
            longitude: parada.longitude,
            address: parada.address
          })),
          fare: sugeridoTarifa || 0,
          originalFare: originalTarifa,
          distance: rutaInformacion.distance,
          duration: Math.round(rutaInformacion.duration),
          selectedVehicleType: seleccionadoVehiculoTipo,
          selectedPaymentMethod: seleccionadoPagoMetodo
        });
        establecerNegociacionModo(false);
      } catch (error: any) {
        if (rapidoAsignacionIniciado) {
          establecerRapidoAssigning(false);
          await new Promise<void>((resolver) => {
            Animado.timing(solicitudPanelDesplazamiento, {
              toValue: 0,
              duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
              useNativeDriver: true
            }).start(() => resolver());
          });
          rapidoAsignacionPanelOcultoReferencia.current = false;
        }
        // El API client lanza { status, data } en lugar de un Error estándar
        const servidorMensaje: string | undefined =
        error?.data?.error ?? error?.data?.message ?? error?.message;

        if (error?.data?.code === 'NO_DRIVERS') {
          mostrarAviso('Por ahora no hay conductores cerca. Intenta de nuevo en unos minutos.', '!');
        } else if (error?.status === 422 && error?.data?.code === 'OUT_OF_SERVICE_AREA') {
          Alert.alert(
            'Fuera de cobertura',
            'El punto de recogida está fuera de nuestras zonas de servicio.'
          );
        } else {
          Alert.alert(
            'No se pudo crear el viaje',
            servidorMensaje ?? 'Verifica tu conexión e intenta de nuevo.'
          );
        }
      } finally {
        creandoViajeReferencia.current = false;
        establecerEsCreandoViaje(false);
        establecerRapidoAssigning(false);
      }
    })();
  };

  const manejarAgregarParada = async (resultado: {lat: string;lon: string;display_name: string;}) => {
    const nuevoLatitud = parseFloat(resultado.lat);
    const nuevoLongitud = parseFloat(resultado.lon);
    const nuevoDireccion = resultado.display_name;

    // Old destination becomes a waypoint
    if (destinoUbicacion && destinoDireccion) {
      establecerParadas((anterior) => [
      ...anterior,
      {
        latitude: destinoUbicacion.latitude,
        longitude: destinoUbicacion.longitude,
        address: destinoDireccion
      }]
      );
    }

    // New location becomes the destination
    establecerDestinoUbicacion({ latitude: nuevoLatitud, longitude: nuevoLongitud });
    establecerDestinoDireccion(nuevoDireccion);
  };

  const manejarQuitarParada = (indice: number) => {
    rutaRevisionReferencia.current += 1;
    omitirRutaCacheReferencia.current = true;
    const siguienteParadas = paradas.filter((_, paradaIndice) => paradaIndice !== indice);
    establecerParadas(siguienteParadas);
    establecerTodosParadas(recogidaUbicacion && destinoUbicacion ? [
    { location: recogidaUbicacion, address: recogidaDireccion || temporalRecogidaDireccion },
    ...siguienteParadas.map((parada) => ({
      location: { latitude: parada.latitude, longitude: parada.longitude },
      address: parada.address
    })),
    { location: destinoUbicacion, address: destinoDireccion }] :
    []);
    establecerRutaInformacion(null);
    establecerRutaCoordenadas([]);
    establecerSugeridoTarifa(null);
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <SeguraZonaVista style={s.root} edges={['bottom']}>
      {/* MAP CONTAINER — pin is a sibling of MapView so it never scrolls */}
      <Vista style={s.mapWrapper}
      onLayout={(error) => {
        const { width: ancho, height: alto } = error.nativeEvent.layout;
        mapaTamanoReferencia.current = { width: ancho, height: alto };
        establecerMapaWrapDimensions({ width: ancho, height: alto });
      }}>

        <MapaVista
          {...MAPA_CLARO}
          key={mapaGeneration}
          ref={mapaReferencia}
          style={s.map}
          initialRegion={mapaRegionReferencia.current ?? ruta.params?.mapRegion ?? {
            latitude: ruta.params?.pickupLocation?.latitude ?? -16.5038,
            longitude: ruta.params?.pickupLocation?.longitude ?? -68.1345,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
          showsUserLocation={!destinoUbicacion}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={false}
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          onMapReady={() => {
            establecerMapaListo(true);
            redrawUbicacionMarkers();
          }}
          onRegionChange={(region) => {
            mapaRegionReferencia.current = region;
          }}
          onRegionChangeComplete={(region) => {
            manejarRegionCambioCompletar(region);
            redrawUbicacionMarkers();
          }}>

          {mapaListo && <AnimadoRutaPolilinea
            coordinates={rutaCoordenadas}
            strokeColor={`rgba(117, 20, 197, ${rutaVisualOpacidad})`}
            onStart={() => {
              const mapa = mapaReferencia.current;
              const revision = rutaRevisionReferencia.current;
              if (buscarPanelMontado) {
                Animado.timing(buscarPanelDesplazamiento, {
                  toValue: pantallaAlto,
                  duration: PANEL_SLIDE_DURACION_MILISEGUNDOS,
                  useNativeDriver: true
                }).start(({ finished: terminado }) => {
                  if (terminado && revision === rutaRevisionReferencia.current) establecerBuscarPanelMontado(false);
                });
              }
              mapa?.getCamera().then((camara) => {
                if (revision !== rutaRevisionReferencia.current) return;
                if (typeof camara.zoom === 'number') {
                  mapa.animateCamera({ ...camara, zoom: camara.zoom - 0.7 }, { duration: 900 });
                } else if (typeof camara.altitude === 'number') {
                  mapa.animateCamera({ ...camara, altitude: camara.altitude * 1.6 }, { duration: 900 });
                }
              }).catch(() => {});
            }}
            onComplete={() => {
              if (rutaCoordenadas.length < 2 || esReturningHastaInicioReferencia.current) return;
              const revision = rutaRevisionReferencia.current;
              const inferiorRelleno = Math.min(
                Math.max(110, rutaPanelAlto + 24),
                Math.max(110, mapaTamanoReferencia.current.height - 260)
              );
              if (!solicitudPanelVisible) {
                rutaAjustarPendienteReferencia.current = revision;
                if (rutaAjustarTemporizadorReferencia.current) clearTimeout(rutaAjustarTemporizadorReferencia.current);
                rutaAjustarTemporizadorReferencia.current = setTimeout(() => revealSolicitudPanel(revision), 1200);
              }
              mapaReferencia.current?.fitToCoordinates(rutaCoordenadas, {
                edgePadding: { top: 200, right: 60, bottom: inferiorRelleno, left: 60 },
                animated: true
              });
            }} />
          }
          {recogidaUbicacion &&
          <Marker key="pickup" ref={recogidaMarcadorReferencia} coordinate={recogidaUbicacion}
          anchor={{ x: 0.5, y: 0.5 }} zIndex={9} opacity={rutaVisualOpacidad}
          tracksViewChanges>
              <Vista style={s.mapLocationIconMarker} collapsable={false}
            onLayout={() => recogidaMarcadorReferencia.current?.redraw()}>
                <PasajeroMapaIcono />
              </Vista>
            </Marker>
          }
          {destinoUbicacion &&
          <Marker key="destination" ref={destinoMarcadorReferencia} coordinate={destinoUbicacion}
          anchor={{ x: 0.5, y: 0.5 }} zIndex={10} opacity={rutaVisualOpacidad}
          tracksViewChanges>
              <Vista style={s.mapLocationIconMarker} collapsable={false}
            onLayout={() => destinoMarcadorReferencia.current?.redraw()}>
                <DestinoIndicadorIcon />
              </Vista>
            </Marker>
          }
          {paradas.map((parada, indice) =>
          <Marker key={`wp-${indice}`} coordinate={{ latitude: parada.latitude, longitude: parada.longitude }} title={`P${indice + 1}`} anchor={{ x: 0.5, y: 0.5 }} zIndex={2} opacity={rutaVisualOpacidad}>
              <ParadaMapaIcon number={indice + 1} />
            </Marker>
          )}
        </MapaVista>

        {/* ── FLOATING PIN — rendered over the map, stationary ── */}
        <FlotantePin
          visible={mostrarMarcador && (seleccionandoModo !== null || guardandoModo !== null || !recogidaUbicacion)}
          address={temporalRecogidaDireccion}
          loading={searchingDireccion}
          containerWidth={mapaWrapDimensions.width}
          containerHeight={mapaWrapDimensions.height}
          mode={seleccionandoModo || 'origin'} />


        {/* ── USER BUTTON ── */}
        {!destinoUbicacion && seleccionandoModo === null && guardandoModo === null &&
        <PulsableOpacidad
          style={[s.locBtn, { top: 5 + margenes.top }]}
          onPress={() => navegacion.navigate('Profile')}
          activeOpacity={0.8}>

            <Icon.Usuario size={26} color="#000000" strokeWidth={2.5} />
            {documentosPorReenviar && <Vista style={s.userNotificationDot} />}
          </PulsableOpacidad>
        }

        {/* ── SAVE MODE CLOSE BUTTON ── */}
        {guardandoModo !== null &&
        <PulsableOpacidad
          style={[s.locBtn, { top: 5 + margenes.top }]}
          onPress={() => establecerGuardandoModo(null)}
          activeOpacity={0.8}>

            <X size={26} color="#000000" strokeWidth={2.5} />
          </PulsableOpacidad>
        }

        {esAddingParada &&
        <PulsableOpacidad
          style={[s.addStopBackBtn, { top: 5 + margenes.top }]}
          onPress={cancelarAgregarParadaAlMapa}
          accessibilityRole="button"
          accessibilityLabel="Volver sin agregar parada"
          activeOpacity={0.8}>

            <ArrowIzquierda size={26} color="#000000" strokeWidth={2.5} />
          </PulsableOpacidad>
        }

        {/* ── SEARCH MODAL ── */}
        {buscarPanelMontado && seleccionandoModo === null && guardandoModo === null &&
        <Animado.View
          pointerEvents={destinoUbicacion ? 'none' : 'box-none'}
          style={[s.searchModalWrapper, { transform: [{ translateY: buscarPanelDesplazamiento }] }]}>

            <PulsableOpacidad
            style={[s.locBtn, { top: 0 }]}
            onPress={() => centroHastaUsuarioUbicacion(true)}
            activeOpacity={0.8}>

              {ubicacionCargando ?
            <ActividadIndicador size="small" color={T.accent} /> :

            <Icon.MiUbicacion size={30} color="#000000" strokeWidth={2.0} />
            }
            </PulsableOpacidad>
            <Vista style={s.searchModalCard}>
              <PulsableOpacidad
              style={s.searchInput}
              onPress={irHastaBuscarPantalla}
              activeOpacity={0.9}>

                <Vista style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Vista style={s.searchIcon}>
                    <Icon.Busqueda size={22} color="#7C3AED" />
                  </Vista>
                  <Texto style={s.searchPlaceholder} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>¿A dónde vamos?</Texto>
                </Vista>
              </PulsableOpacidad>

              <Vista style={s.quickDestinations}>
                <PulsableOpacidad
                style={s.quickDestItem}
                onPress={manejarInicioPulsar}
                onLongPress={guardadoInicioDireccion ? manejarEliminarInicio : undefined}>

                  <Vista style={s.quickDestIcon}>
                    <Icon.Home size={26} color="#7C3AED" />
                  </Vista>
                  <Vista style={[s.quickDestContent, guardadoInicioDireccion && { justifyContent: 'center' }]}>
                    <Texto style={[s.quickDestText, guardadoInicioDireccion && { fontSize: 15, fontWeight: '600' }]}>Casa</Texto>
                    {!guardadoInicioDireccion && <Texto style={s.quickDestAdd}>Agregar</Texto>}
                  </Vista>
                </PulsableOpacidad>
                <PulsableOpacidad
                style={s.quickDestItem}
                onPress={manejarTrabajoPulsar}
                onLongPress={guardadoTrabajoDireccion ? manejarEliminarTrabajo : undefined}>

                  <Vista style={s.quickDestIcon}>
                    <Icon.Briefcase size={26} color="#7C3AED" />
                  </Vista>
                  <Vista style={[s.quickDestContent, guardadoTrabajoDireccion && { justifyContent: 'center' }]}>
                    <Texto style={[s.quickDestText, guardadoTrabajoDireccion && { fontSize: 15, fontWeight: '600' }]}>Trabajo</Texto>
                    {!guardadoTrabajoDireccion && <Texto style={s.quickDestAdd}>Agregar</Texto>}
                  </Vista>
                </PulsableOpacidad>
                <PulsableOpacidad style={s.quickDestItem} onPress={manejarFavoritosPulsar}>
                  <Vista style={s.quickDestIcon}>
                    <Icon.Star size={26} color="#7C3AED" />
                  </Vista>
                  <Vista style={s.quickDestContent}>
                    <Texto style={s.quickDestText}>Favoritos</Texto>
                    <Texto style={s.quickDestAdd}>Abrir</Texto>
                  </Vista>
                </PulsableOpacidad>
              </Vista>

              <Vista style={s.recentTripsSection}>
                {recienteViajes.length === 0 &&
              <Vista style={s.recentTripsEmptySpace}>
                    {!recienteViajesCargando &&
                <Texto style={s.recentTripsEmpty}>Sin búsquedas recientes</Texto>
                }
                  </Vista>
              }
                {recienteViajes.map((viaje) =>
              <PulsableOpacidad
                key={viaje.id}
                style={s.recentTripItem}
                onPress={() => manejarRecienteViajePulsar(viaje)}>

                    <Vista style={s.recentTripIcon}>
                      <MapaPin size={26} color="#7C3AED" />
                    </Vista>
                    <Vista style={s.recentTripContent}>
                      <Texto style={s.recentTripText} numberOfLines={1}>
                        {viaje.destinationAddress}
                      </Texto>
                    </Vista>
                    <PulsableOpacidad
                  style={s.recentTripStar}
                  onPress={() => alternarFavorito(viaje.id)}
                  activeOpacity={0.7}>

                      <Icon.Star
                    size={20}
                    color="#7C3AED"
                    filled={favoritoIds.has(viaje.id)} />

                    </PulsableOpacidad>
                  </PulsableOpacidad>
              )}
              </Vista>
            </Vista>
          </Animado.View>
        }

        {/* ── FLOATING ROUTE CARD (TOP) ── */}
        {destinoUbicacion && seleccionandoModo === null &&
        <RutaResumenCard
          slideOffset={rutaTarjetaDesplazamiento}
          disabled={esCreandoViaje}
          pickupAddress={recogidaDireccion}
          tempPickupAddress={temporalRecogidaDireccion}
          destinationAddress={destinoDireccion}
          waypoints={paradas}
          routeInfo={rutaInformacion}
          onPressOrigin={() => navegacion.navigate('Search', {
            pickupLocation: recogidaUbicacion || undefined,
            pickupAddress: recogidaDireccion || undefined,
            mapRegion: mapaRegionReferencia.current ?? undefined,
            destinationLocation: destinoUbicacion || undefined,
            destinationAddress: destinoDireccion || undefined,
            stops: recogidaUbicacion && destinoUbicacion ?
            [
            { location: recogidaUbicacion, address: recogidaDireccion },
            ...paradas.map((parada: any) => ({ location: { latitude: parada.latitude, longitude: parada.longitude }, address: parada.address })),
            { location: destinoUbicacion, address: destinoDireccion }] :

            undefined
          })}
          onPressStops={() => establecerMostrarParadasModal(true)}
          onAddStop={() => establecerMostrarAgregarParadaModal(true)}
          insetsTop={margenes.top}
          fmtDist={formatoDistancia}
          fmtTime={formatoTiempo} />

        }
        {rapidoAssigning &&
        <Vista pointerEvents="none" accessibilityRole="alert" style={[s.quickAssignmentNotice, { bottom: Math.max(margenes.bottom + 4, 44) }]}>
            <ActividadIndicador size="small" color="#000000" />
            <Texto style={s.quickAssignmentNoticeText}>Asignando viaje</Texto>
          </Vista>
        }

      </Vista>

      {/* BOTTOM PANEL — Hecho */}
      {seleccionandoModo !== null || guardandoModo !== null ?
      <PulsableOpacidad
        style={{
          position: 'absolute',
          bottom: Math.max(margenes.bottom, 24) + 16,
          alignSelf: 'center',
          backgroundColor: T.accent,
          paddingHorizontal: 48,
          paddingVertical: 16,
          borderRadius: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6
        }}
        onPress={() => {
          if (guardandoModo) {
            confirmarGuardarModo();
            return;
          }
          if (esAddingParada) {
            const nuevoLatitud = mapaCentroUbicacion?.latitude;
            const nuevoLongitud = mapaCentroUbicacion?.longitude;
            if (nuevoLatitud && nuevoLongitud && destinoUbicacion && destinoDireccion) {
              establecerParadas((anterior) => [
              ...anterior,
              { latitude: destinoUbicacion.latitude, longitude: destinoUbicacion.longitude, address: destinoDireccion }]
              );
              establecerDestinoUbicacion({ latitude: nuevoLatitud, longitude: nuevoLongitud });
              establecerDestinoDireccion(temporalRecogidaDireccion);
            }
            establecerSeleccionandoModo(null);
            establecerEsAddingParada(false);
            return;
          }
          const actualizadoParadas = todosParadas.length > 0 && editandoParadaIndice != null ?
          todosParadas.map((s: any, indice: number) => indice === editandoParadaIndice ?
          { location: { latitude: mapaCentroUbicacion?.latitude ?? s.location.latitude, longitude: mapaCentroUbicacion?.longitude ?? s.location.longitude }, address: temporalRecogidaDireccion || s.address } :
          s) :
          undefined;
          if (seleccionandoModo === 'origin') {
            navegacion.navigate('Search' as any, { pickupLocation: mapaCentroUbicacion, pickupAddress: temporalRecogidaDireccion, destinationLocation: destinoUbicacion, destinationAddress: destinoDireccion, mapRegion: mapaRegionReferencia.current ?? undefined, pickingMode: seleccionandoModo, ...(actualizadoParadas ? { stops: actualizadoParadas } : {}) });
          } else {
            navegacion.navigate('Search' as any, { pickupLocation: recogidaUbicacion, pickupAddress: recogidaDireccion, destinationLocation: mapaCentroUbicacion, destinationAddress: temporalRecogidaDireccion, mapRegion: mapaRegionReferencia.current ?? undefined, pickingMode: seleccionandoModo, ...(actualizadoParadas ? { stops: actualizadoParadas } : {}) });
          }
          establecerSeleccionandoModo(null);
        }}
        activeOpacity={0.85}>

            <Texto style={{ color: T.white, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
              Hecho
            </Texto>
          </PulsableOpacidad> :
      destinoUbicacion ?
      <Animado.View
        pointerEvents={solicitudPanelVisible && !esCreandoViaje ? 'auto' : 'none'}
        style={[s.routePanelOverlay, { transform: [{ translateY: solicitudPanelDesplazamiento }] }]}
        onLayout={(evento) => {establecerRutaPanelAlto(evento.nativeEvent.layout.height);}}>

        <ViajeSolicitudPanel
          bottomClearance={Math.max(margenes.bottom, 48)}
          rideRequested={false}
          requestTimeLeft={120}
          fmtTimer={() => ''}
          progress={0}
          suggestedFare={sugeridoTarifa}
          originalFare={originalTarifa}
          negotiationMode={negociacionModo}
          onToggleNegotiation={() => establecerNegociacionModo(!negociacionModo)}
          showFareEditor={mostrarTarifaEditor}
          onToggleFareEditor={() => establecerMostrarTarifaEditor(!mostrarTarifaEditor)}
          onDecrementFare={() =>
          establecerSugeridoTarifa((p) => p ? Math.max(0.5, +(p - 0.5).toFixed(2)) : p)
          }
          onIncrementFare={() =>
          establecerSugeridoTarifa((p) => p ? +(p + 0.5).toFixed(2) : p)
          }
          selectedVehicleType={seleccionadoVehiculoTipo}
          onSelectVehicle={establecerSeleccionadoVehiculoTipo}
          selectedPaymentMethod={seleccionadoPagoMetodo}
          onSelectPayment={establecerSeleccionadoPagoMetodo}
          toggleAnim={alternarAnimacion}
          isCreatingRide={esCreandoViaje}
          routeLoading={rutaCargando}
          onConfirmTrip={confirmarViaje}
          onCancelRide={() => {}}
          driverOffers={[]}
          onRejectOffer={() => {}}
          onAcceptOffer={() => {}} />

        </Animado.View> :
      null}

      {destinoUbicacion && seleccionandoModo === null && guardandoModo === null &&
      <Animado.View
        pointerEvents={solicitudPanelVisible && !esCreandoViaje ? 'auto' : 'none'}
        style={[s.toolbarFloat, { bottom: rutaPanelAlto + 34, transform: [{ translateY: solicitudPanelDesplazamiento }] }]}>

          <PulsableOpacidad
          style={s.locBtnStatic}
          onPress={retornoHastaInicio}
          activeOpacity={0.8}>

            <Icon.Reverso size={24} color="#000000" strokeWidth={2.5} />
          </PulsableOpacidad>
        </Animado.View>
      }

      <SlideUpMenu
        visible={mostrarClienteMenu}
        onClose={() => establecerMostrarClienteMenu(false)}
        user={usuario}
        menuItems={[
        {
          icon: <Icon.Usuario size={20} color={T.inkMid} />,
          label: 'Mi Perfil',
          onPress: () => navegacion.navigate('Profile')
        },
        {
          icon: <Icon.Historial size={20} color={T.inkMid} />,
          label: 'Mis Viajes',
          onPress: () => navegacion.navigate('RideHistory')
        },
        {
          icon: <Icon.Ajustes size={20} color={T.inkMid} />,
          label: 'Ajustes',
          onPress: () => navegacion.navigate('Profile')
        },
        {
          icon: <Icon.Bell size={20} color={T.inkMid} />,
          label: 'Notificaciones',
          onPress: () => navegacion.navigate('Profile')
        },
        {
          icon: <Icon.AyudaCircle size={20} color={T.inkMid} />,
          label: 'Ayuda',
          onPress: () => navegacion.navigate('Profile')
        },
        {
          icon: <Icon.MensajeCircle size={20} color={T.inkMid} />,
          label: 'Soporte',
          onPress: () => navegacion.navigate('Profile')
        }]
        }
        closeButton={{
          label: 'Modo Conductor',
          onPress: () => navegacion.navigate('Profile'),
          backgroundColor: T.accent,
          textColor: T.white
        }}
        theme={{
          primary: T.accent,
          accent: T.accent,
          text: T.ink,
          textMuted: T.inkMid,
          border: T.border,
          bg: T.bg,
          white: T.white,
          overlay: 'rgba(0,0,0,0.4)',
          avatarBg: T.accentSoft
        }} />


      {/* STOPS MODAL */}
      <ParadasModal
        visible={mostrarParadasModal}
        onClose={() => establecerMostrarParadasModal(false)}
        pickupAddress={recogidaDireccion}
        tempPickupAddress={temporalRecogidaDireccion}
        destinationAddress={destinoDireccion}
        waypoints={paradas}
        onRemoveWaypoint={manejarQuitarParada} />


      {/* ADD STOP MODAL */}
      <AgregarParadaModal
        visible={mostrarAgregarParadaModal}
        onClose={() => establecerMostrarAgregarParadaModal(false)}
        onConfirm={manejarAgregarParada}
        onPickOnMap={() => {
          establecerMostrarAgregarParadaModal(false);
          if (!recogidaUbicacion) {
            Alert.alert('Punto de recogida no disponible', 'Selecciona primero el punto de recogida.');
            return;
          }
          centroPinEnUbicacion(recogidaUbicacion);
          establecerTemporalRecogidaDireccion(recogidaDireccion || temporalRecogidaDireccion);
          establecerEsAddingParada(true);
          establecerSeleccionandoModo('destination');
        }}
        currentLat={recogidaUbicacion?.latitude}
        currentLon={recogidaUbicacion?.longitude} />


      {/* SAVED PLACES MODAL */}
      <GuardadoLugaresModal
        visible={mostrarGuardadoLugaresModal}
        onClose={() => establecerMostrarGuardadoLugaresModal(false)}
        onSelect={manejarSeleccionarGuardadoLugar}
        onAdd={manejarAgregarFavorito}
        onDelete={manejarEliminarFavorito}
        savedPlaces={guardadoLugares} />


      {/* TOAST — superpuesto sobre todo */}
      <Toast
        message={avisoMensaje}
        visible={avisoVisible}
        icon={avisoIcono}
        onHide={() => establecerAvisoVisible(false)} />


    </SeguraZonaVista>);

};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = EstiloHoja.create({
  root: { flex: 1, backgroundColor: T.bg, flexDirection: 'column' },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative'
  },
  mapWrap: { flex: 1 },
  map: { ...EstiloHoja.absoluteFillObject },
  routePanelOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  quickAssignmentNotice: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, elevation: 6, zIndex: 19 },
  quickAssignmentNoticeText: { color: '#000000', fontSize: 19, fontWeight: '700' },

  // ── FLOATING PIN ──────────────────────────────────────────────────────────
  pinAnchor: { position: 'absolute', width: 240, height: 1, alignItems: 'center' },
  pinStack: { position: 'absolute', bottom: 0, width: 240, alignItems: 'center' },
  pinBubble: {
    backgroundColor: T.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: 240,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  pinBubbleText: { fontSize: 12, color: T.ink, fontWeight: '600', textAlign: 'center' },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 25,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 2
  },
  pinHole: { width: 15, height: 15, borderRadius: 9, backgroundColor: '#FFFFFF' },
  pinStem: {
    width: 5,
    height: 32,
    backgroundColor: T.accent,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: -4,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },

  // ── MAP CONTROLS ──────────────────────────────────────────────────────────
  locBtn: {
    position: 'absolute',
    right: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  userNotificationDot: {
    position: 'absolute', top: 1.5, right: 1.5,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#E53935'
  },
  addStopBackBtn: {
    position: 'absolute',
    left: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 15
  },
  searchModalWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 66
  },
  searchModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF'
  },
  searchIcon: { marginRight: 8 },
  searchPlaceholder: { flexShrink: 1, fontSize: 21, color: '#111118', fontWeight: '700' },
  quickDestinations: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8 },
  quickDestItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  quickDestContent: { flexDirection: 'column' },
  quickDestIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  quickDestText: { fontSize: 14, color: '#000000', fontWeight: '500' },
  quickDestAdd: { fontSize: 11, color: '#999999', fontWeight: '400' },
  recentTripsSection: { paddingHorizontal: 24, paddingBottom: 10 },
  recentTripItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  recentTripsEmptySpace: { height: 180, alignItems: 'center', justifyContent: 'center' },
  recentTripsEmpty: { color: '#999999', fontSize: 14, textAlign: 'center' },
  recentTripIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  recentTripContent: { flex: 1 },
  recentTripText: { fontSize: 18, color: '#000000', fontWeight: '500' },
  recentTripStar: { padding: 4 },

  // ── MAP MARKERS ───────────────────────────────────────────────────────────
  mapLocationIconMarker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dotGray: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E7E8ED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BDBDBD' },
  dotGrayInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9E9E9E' },
  dotBlue: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E7E8ED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BDBDBD' },
  dotBlueInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9E9E9E' },

  // ── TOOLBAR flotante ────────────────────────────────────────────────────
  toolbarFloat: { position: 'absolute', bottom: 35, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', zIndex: 15 },
  locBtnStatic: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },

  // ── FLOATING FARE ─────────────────────────────────────────────────────────
  floatingFare: {
    backgroundColor: T.white,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 5
  },
  floatingFareTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1.2,
    marginBottom: 2
  },
  floatingFareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  },
  floatingFareValue: {
    fontSize: 32,
    fontWeight: '800',
    color: T.accent,
    fontFamily: 'Montserrat'
  },
  floatingFareEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.accent + '40',
    backgroundColor: T.accentSoft
  },
  floatingFareEditText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.accent,
    letterSpacing: 0.5
  },
  floatingFareWarning: {
    backgroundColor: T.accent + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
    alignItems: 'center'
  },
  floatingFareWarnText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.accent
  },
  floatingFareControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10
  },
  floatingFareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border
  },
  floatingFareBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: T.inkMid,
    lineHeight: 22
  },

  // ── NEGOTIATION HEADER ────────────────────────────────────────────────────
  negoHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10
  },
  negoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2
  },
  negoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111118'
  },
  negoSubtitle: {
    fontSize: 13,
    color: '#7A7A8A'
  }

});
export default MapaPantalla;
