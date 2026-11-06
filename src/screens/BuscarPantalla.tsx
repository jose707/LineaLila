// screens/SearchScreen.tsx
import React, { useState as usarEstado, useCallback as usarFuncionRetorno, useEffect as usarEfecto, useRef as usarReferencia } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  ScrollView as DesplazableVista,
  ActivityIndicator as ActividadIndicador,
  BackHandler as ReversoManejador,
  Platform as Plataforma,
  PermissionsAndroid as PermisosAndroid } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import {
  useNavigation as usarNavegacion,
  useRoute as usarRuta,
  RouteProp as RutaProp,
  useFocusEffect as usarEnfoqueEfecto } from
'@react-navigation/native';
import { NativeStackNavigationProp as NativoPilaNavegacionProp } from '@react-navigation/native-stack';
import { RaizPilaParametroLista, Detener as Parada } from "../navigation/AplicacionNavegador";
import { CommonActions } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import BuscarBar, { BusquedaResultado as BuscarResultado, BusquedaBarReferencia as BuscarBarReferencia } from "../components/BuscarBar";
import LugarSuggestionEtiqueta from "../components/PlaceSugerenciaEtiqueta";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import { MapPin as MapaPin, X } from 'lucide-react-native';
import { SEARCHSCREEN_COLORS as C } from '../theme/colors';
import { LugarSugerencia } from "../services/places.servicio";

type BusquedaPantallaNavegacionPropiedad = NativoPilaNavegacionProp<
  RaizPilaParametroLista,
  'Search'>;

type BusquedaPantallaRutaPropiedad = RutaProp<RaizPilaParametroLista, 'Search'>;

const VACIO_DETENER: Parada = {
  location: { latitude: 0, longitude: 0 },
  address: ''
};

const BuscarPantalla = () => {
  const navegacion = usarNavegacion<BusquedaPantallaNavegacionPropiedad>();
  const ruta = usarRuta<BusquedaPantallaRutaPropiedad>();

  const MAXIMO_PARADAS = 5;

  const inicialParadas = React.useMemo(() => {
    if (ruta.params?.stops && ruta.params.stops.length >= 2) {
      return ruta.params.stops.slice(0, MAXIMO_PARADAS);
    }
    const recogida = ruta.params?.pickupLocation ?
    {
      location: ruta.params.pickupLocation,
      address: ruta.params.pickupAddress || ''
    } :
    { location: { latitude: 0, longitude: 0 }, address: '' };

    const destino = ruta.params?.destinationLocation ?
    {
      location: ruta.params.destinationLocation,
      address: ruta.params.destinationAddress || ''
    } :
    { location: { latitude: 0, longitude: 0 }, address: '' };

    return [recogida, destino];
  }, [
  ruta.params?.stops,
  ruta.params?.pickupLocation,
  ruta.params?.pickupAddress,
  ruta.params?.destinationLocation,
  ruta.params?.destinationAddress]
  );

  const [paradas, establecerParadas] = usarEstado<Parada[]>(inicialParadas);
  const [usuarioUbicacion, establecerUsuarioUbicacion] = usarEstado<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const primeroBuscarReferencia = usarReferencia<BuscarBarReferencia>(null);
  const buscarBars = usarReferencia<Record<number, BuscarBarReferencia | null>>({});
  const montadoReferencia = usarReferencia(false);
  const anteriorTodosRelleno = usarReferencia(false);
  const [activoBuscarIndice, establecerActivoBuscarIndice] = usarEstado<number | null>(
    null
  );
  const [compartidoResultados, establecerCompartidoResultados] = usarEstado<LugarSugerencia[]>([]);
  const [compartidoCargando, establecerCompartidoCargando] = usarEstado(false);
  const [compartidoError, establecerCompartidoError] = usarEstado('');
  const [compartidoVacio, establecerCompartidoVacio] = usarEstado(false);

  const camaraParaRecogida = (recogida: Parada['location']) => {
    const anterior = ruta.params?.pickupLocation;
    if (!anterior || Math.abs(anterior.latitude - recogida.latitude) > 0.000001 ||
    Math.abs(anterior.longitude - recogida.longitude) > 0.000001) return undefined;
    return ruta.params?.mapRegion;
  };

  usarEfecto(() => {
    setTimeout(() => {
      primeroBuscarReferencia.current?.focus();
    }, 400);
  }, []);

  usarEfecto(() => {
    if (!montadoReferencia.current) {
      montadoReferencia.current = true;
      const todosRelleno =
      paradas.filter(esParadaRelleno).length === paradas.length && paradas.length >= 2;
      anteriorTodosRelleno.current = todosRelleno;
      if (todosRelleno && ruta.params?.pickingMode) {
        const validoParadas = paradas.filter(esParadaRelleno);
        navegacion.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
            {
              name: 'Map',
              params: {
                pickupLocation: validoParadas[0].location,
                destinationLocation:
                validoParadas[validoParadas.length - 1].location,
                pickupAddress: validoParadas[0].address,
                destinationAddress: validoParadas[validoParadas.length - 1].address,
                mapRegion: camaraParaRecogida(validoParadas[0].location),
                stops: validoParadas
              }
            }]

          })
        );
      }
      return;
    }
    const realTodosRelleno =
    paradas.filter(esParadaRelleno).length === paradas.length && paradas.length >= 2;
    if (realTodosRelleno && !anteriorTodosRelleno.current) {
      const validoParadas = paradas.filter(esParadaRelleno);
      navegacion.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
          {
            name: 'Map',
            params: {
              pickupLocation: validoParadas[0].location,
              destinationLocation: validoParadas[validoParadas.length - 1].location,
              pickupAddress: validoParadas[0].address,
              destinationAddress: validoParadas[validoParadas.length - 1].address,
              mapRegion: camaraParaRecogida(validoParadas[0].location),
              stops: validoParadas
            }
          }]

        })
      );
    }
    anteriorTodosRelleno.current = realTodosRelleno;
  }, [paradas, navegacion, ruta.params?.pickingMode]);

  usarEfecto(() => {
    const obtenerUbicacion = async () => {
      if (Plataforma.OS === 'android') {
        const concedido = await PermisosAndroid.request(
          PermisosAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (concedido !== PermisosAndroid.RESULTS.GRANTED) return;
      }
      Geolocation.getCurrentPosition(
        (posicion) => {
          establecerUsuarioUbicacion({
            latitude: posicion.coords.latitude,
            longitude: posicion.coords.longitude
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    };
    obtenerUbicacion();
  }, []);

  const esParadaRelleno = (parada: Parada) =>
  parada.address !== '' &&
  parada.location.latitude !== 0 &&
  parada.location.longitude !== 0;

  const primeroUnfilledIndice = paradas.findIndex((s) => !esParadaRelleno(s));

  const manejarParadaSeleccionar = (indice: number, resultado: BuscarResultado) => {
    anteriorTodosRelleno.current = false;
    const nuevoParadas = [...paradas];
    nuevoParadas[indice] = {
      location: {
        latitude: parseFloat(resultado.lat),
        longitude: parseFloat(resultado.lon)
      },
      address: resultado.display_name
    };
    establecerParadas(nuevoParadas);
    establecerCompartidoResultados([]);
    establecerCompartidoCargando(false);
    establecerCompartidoError('');
    establecerActivoBuscarIndice(null);
  };

  const limpiarParada = (indice: number) => {
    const nuevoParadas = [...paradas];
    nuevoParadas[indice] = { ...VACIO_DETENER };
    establecerParadas(nuevoParadas);
  };

  const quitarParada = (indice: number) => {
    if (paradas.length <= 2) return;
    const nuevoParadas = paradas.filter((_, i) => i !== indice);
    establecerParadas(nuevoParadas);
  };

  const irReverso = usarFuncionRetorno(() => {
    const p = ruta.params;
    if (p?.destinationLocation) {
      navegacion.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
          {
            name: 'Map',
            params: {
              pickupLocation: p.pickupLocation,
              pickupAddress: p.pickupAddress,
              destinationLocation: p.destinationLocation,
              destinationAddress: p.destinationAddress,
              mapRegion: p.mapRegion,
              stops: p.stops
            }
          }]

        })
      );
    } else {
      navegacion.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Map', params: { reset: true } }]
        })
      );
    }
  }, [navegacion, ruta.params]);

  const irReversoConSeleccionando = (paradaIndice: number) => {
    const realParadas = paradas.map((s) =>
    esParadaRelleno(s) ? s : { ...VACIO_DETENER }
    );

    navegacion.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
        {
          name: 'Map',
          params: {
            pickupLocation: esParadaRelleno(realParadas[0]) ?
            realParadas[0].location :
            undefined,
            pickupAddress: realParadas[0].address || undefined,
            destinationLocation: esParadaRelleno(
              realParadas[realParadas.length - 1]
            ) ?
            realParadas[realParadas.length - 1].location :
            undefined,
            destinationAddress:
            realParadas[realParadas.length - 1].address || undefined,
            mapRegion: ruta.params?.mapRegion,
            stops: realParadas,
            pickingMode:
            paradaIndice === 0 ?
            'origin' :
            paradaIndice === realParadas.length - 1 ?
            'destination' :
            'origin',
            editingStopIndex: paradaIndice
          }
        }]

      })
    );
  };

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      const alReversoPulsar = () => {
        irReverso();
        return true;
      };

      const suscripcion = ReversoManejador.addEventListener(
        'hardwareBackPress',
        alReversoPulsar
      );
      return () => suscripcion.remove();
    }, [irReverso])
  );

  return (
    <SeguraZonaVista style={estilos.container}>
      {/* HEADER */}
      <Vista style={estilos.header}>
        <PulsableOpacidad
          style={estilos.backButton}
          onPress={irReverso}
          activeOpacity={0.7}>

          <X size={24} color={C.primaryLight} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Vista style={estilos.headerContent}>
          <Texto style={estilos.headerTitle}>Planifica tu viaje</Texto>
        </Vista>
        <Vista style={estilos.headerSpacer} />
      </Vista>

      <DesplazableVista
        style={estilos.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scrollContent}
        keyboardShouldPersistTaps="handled">

        {paradas.map((parada, indice) => {
          const esPrimero = indice === 0;
          const esUltimo = indice === paradas.length - 1;

          return (
            <Vista key={`stop-${indice}`}>
              {/* STOP ROW */}
              <Vista style={estilos.section}>
                <Vista style={estilos.sectionRow}>
                  {/* Route point icon */}
                  <Vista style={estilos.stepColumn}>
                    {esPrimero ? <PasajeroMapaIcono size={40} /> :
                    esUltimo ? <DestinoIndicadorIcon size={40} /> :
                    <ParadaMapaIcon number={indice} />}
                  </Vista>

                  {/* Content */}
                  <Vista style={estilos.stopContent}>
                    <Vista style={estilos.stopInputRow}>
                      <Vista style={estilos.searchBarWrapper}>
                        <BuscarBar
                          ref={(instancia) => {
                            buscarBars.current[indice] = instancia;
                            if (indice === primeroUnfilledIndice)
                            primeroBuscarReferencia.current = instancia;
                          }}
                          placeholder={
                          esPrimero ?
                          '¿Dónde te recogemos?' :
                          esUltimo ?
                          '¿Cuál es el destino final?' :
                          'Buscar parada...'
                          }
                          initialValue={parada.address}
                          onClear={() => limpiarParada(indice)}
                          onResultSelect={(resultado) =>
                          manejarParadaSeleccionar(indice, resultado)
                          }
                          currentLat={usuarioUbicacion?.latitude}
                          currentLon={usuarioUbicacion?.longitude}
                          suffixIcon={
                          <MapaPin
                            size={26}
                            color="#7C3AED"
                            strokeWidth={2.5} />

                          }
                          onSuffixIconPress={() => irReversoConSeleccionando(indice)}
                          hideResults
                          onResultsChange={(resultados, cargando, error, vacio) => {
                            if (activoBuscarIndice === indice) {
                              establecerCompartidoResultados(resultados);
                              establecerCompartidoCargando(cargando);
                              establecerCompartidoError(error);
                              establecerCompartidoVacio(vacio);
                            }
                          }}
                          onFocusChange={(enfocado) => {
                            if (enfocado) {
                              establecerCompartidoResultados([]);
                              establecerCompartidoError('');
                              establecerCompartidoCargando(false);
                              establecerCompartidoVacio(false);
                              establecerActivoBuscarIndice(indice);
                            }
                          }} />

                      </Vista>

                      {/* Right buttons */}
                      {paradas.length > 2 && !esPrimero ?
                      <PulsableOpacidad
                        style={estilos.removeStopBtn}
                        onPress={() => quitarParada(indice)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>

                          <X size={18} color="#7C3AED" strokeWidth={3} />
                        </PulsableOpacidad> :
                      null}
                    </Vista>
                  </Vista>
                </Vista>
              </Vista>
            </Vista>);

        })}

        {/* Shared results list below all SearchBars */}
        {activoBuscarIndice !== null &&
        <Vista style={estilos.sharedResults}>
            {compartidoCargando &&
          <Vista style={estilos.sharedLoading}>
                <ActividadIndicador size="small" color="#7C3AED" />
              </Vista>
          }
            {!!compartidoError &&
          <Texto accessibilityRole="alert" style={estilos.searchError}>
                {compartidoError}
              </Texto>
          }
            {compartidoVacio && !compartidoCargando && !compartidoError &&
          <Texto style={estilos.attribution}>
                No se encontraron destinos en La Paz.
              </Texto>
          }
            {!compartidoCargando && !compartidoError && compartidoResultados.length > 0 &&
          <Vista style={estilos.sharedResultsList}>
                {compartidoResultados.map((elemento, indice) => {
              const esUltimoElemento = indice === compartidoResultados.length - 1;
              return (
                <PulsableOpacidad
                  key={elemento.placeId}
                  style={[
                  estilos.sharedResultItem,
                  esUltimoElemento && estilos.sharedResultItemLast]
                  }
                  onPress={() => {
                    if (activoBuscarIndice !== null) {
                      buscarBars.current[activoBuscarIndice]?.select(elemento);
                    }
                  }}
                  activeOpacity={0.7}>

                      <Vista style={estilos.sharedResultIconContainer}>
                        <MapaPin
                      size={22}
                      color="#7C3AED"
                      strokeWidth={2.2} />

                      </Vista>
                      <LugarSuggestionEtiqueta suggestion={elemento} />
                    </PulsableOpacidad>);

            })}
                <Texto style={estilos.attribution}>Google Maps</Texto>
              </Vista>
          }
          </Vista>
        }
      </DesplazableVista>
    </SeguraZonaVista>);

};

const estilos = EstiloHoja.create({
  attribution: {
    fontSize: 12,
    fontWeight: '400',
    color: '#5E5E5E',
    padding: 12,
    textAlign: 'right'
  },
  searchError: { fontSize: 14, color: '#B91C1C', padding: 12 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },

  // HEADER
  header: {
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerContent: {
    alignItems: 'center',
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textDark,
    letterSpacing: 0.3
  },
  headerSpacer: {
    width: 40
  },

  // CONTENT
  content: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12
  },

  // CONNECTOR
  connectorRow: {
    width: 48,
    alignItems: 'center',
    height: 4,
    justifyContent: 'center'
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#E5E7EB'
  },

  // STOP SECTION
  section: {
    marginBottom: 0
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5
  },
  stepColumn: {
    width: 48,
    alignItems: 'center'
  },

  // STOP CONTENT
  stopContent: {
    flex: 1
  },

  // STOP INPUT
  stopInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5
  },
  searchBarWrapper: {
    flex: 1
  },
  filledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 6,
    minHeight: 48
  },
  filledInputText: {
    flex: 1,
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '500'
  },
  clearInputBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeStopBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },

  // SHARED RESULTS
  sharedResults: {
    marginTop: 8,
    paddingHorizontal: 2,
    marginBottom: 20
  },
  sharedLoading: {
    padding: 16,
    alignItems: 'center'
  },
  sharedResultsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  sharedResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  sharedResultItemLast: {
    borderBottomWidth: 0
  },
  sharedResultIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  }
});

export default BuscarPantalla;
