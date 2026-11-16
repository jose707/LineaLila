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
import { usarAjustes } from '../context/AjustesContexto';
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
  const { settings } = usarAjustes();
  const oscuro = settings.darkMode;
  const acento = oscuro ? '#D5A6FF' : '#7514C5';
  const tinta = oscuro ? '#FFFFFF' : '#111118';

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

  const hayResultados = !compartidoCargando && !compartidoError && compartidoResultados.length > 0;

  return (
    <SeguraZonaVista style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
      <Vista style={estilos.cabecera}>
        <PulsableOpacidad style={estilos.control} onPress={irReverso} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="Cerrar planificación">
          <X size={24} color={tinta} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={[estilos.titulo, { color: tinta }]} accessibilityRole="header">Planifica tu viaje</Texto>
        <Vista style={estilos.control} />
      </Vista>

      <DesplazableVista contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Vista>
          {paradas.map((parada, indice) => {
            const esPrimero = indice === 0;
            const esUltimo = indice === paradas.length - 1;
            const etiquetaCampo = esPrimero ? 'Punto de recogida' : esUltimo ? 'Destino' : 'Parada ' + indice;

            return (
              <Vista key={'stop-' + indice} style={estilos.filaRuta}>
                <Vista style={[estilos.columnaIcono, (esPrimero || esUltimo) && estilos.iconoRuta]}
                  accessible={false} importantForAccessibility="no-hide-descendants">
                  {esPrimero ? <PasajeroMapaIcono bare size={23} color="#FFFFFF" /> : esUltimo ?
                    <DestinoIndicadorIcon bare size={23} color="#FFFFFF" /> :
                    <ParadaMapaIcon number={indice} size={28} />}
                </Vista>

                <Vista style={estilos.campo}>
                  <BuscarBar
                    ref={instancia => {
                      buscarBars.current[indice] = instancia;
                      if (indice === primeroUnfilledIndice) primeroBuscarReferencia.current = instancia;
                    }}
                    placeholder={etiquetaCampo}
                    initialValue={parada.address}
                    onClear={() => limpiarParada(indice)}
                    onResultSelect={resultado => manejarParadaSeleccionar(indice, resultado)}
                    currentLat={usuarioUbicacion?.latitude}
                    currentLon={usuarioUbicacion?.longitude}
                    suffixIcon={<MapaPin size={24} color={acento} strokeWidth={2.5} />}
                    onSuffixIconPress={() => irReversoConSeleccionando(indice)}
                    estiloRuta={{ oscuro, etiquetaMapa: etiquetaCampo + ' en el mapa' }}
                    hideResults
                    onResultsChange={(resultados, cargando, error, vacio) => {
                      if (activoBuscarIndice !== indice) return;
                      establecerCompartidoResultados(resultados);
                      establecerCompartidoCargando(cargando);
                      establecerCompartidoError(error);
                      establecerCompartidoVacio(vacio);
                    }}
                    onFocusChange={enfocado => {
                      if (!enfocado) return;
                      establecerCompartidoResultados([]);
                      establecerCompartidoError('');
                      establecerCompartidoCargando(false);
                      establecerCompartidoVacio(false);
                      establecerActivoBuscarIndice(indice);
                    }} />
                </Vista>

                {paradas.length > 2 && !esPrimero && (
                  <PulsableOpacidad style={estilos.quitar} onPress={() => quitarParada(indice)} activeOpacity={0.7}
                    accessibilityRole="button" accessibilityLabel={'Quitar ' + etiquetaCampo.toLowerCase()}>
                    <X size={20} color={acento} strokeWidth={2.6} />
                  </PulsableOpacidad>
                )}
              </Vista>
            );
          })}
        </Vista>

        {activoBuscarIndice !== null && (
          <>
            {compartidoCargando && (
              <Vista style={estilos.cargando}>
                <ActividadIndicador size="small" color={acento} accessibilityLabel="Buscando lugares" />
              </Vista>
            )}
            {!!compartidoError && (
              <Vista style={[estilos.tarjeta, estilos.aviso, oscuro && estilos.tarjetaOscura]}>
                <Texto accessibilityRole="alert" style={[estilos.mensajeError, oscuro && estilos.errorOscuro]}>{compartidoError}</Texto>
              </Vista>
            )}
            {compartidoVacio && !compartidoCargando && !compartidoError && (
              <Vista style={[estilos.tarjeta, estilos.aviso, oscuro && estilos.tarjetaOscura]}>
                <Texto style={[estilos.mensaje, oscuro && estilos.mensajeOscuro]} accessibilityLiveRegion="polite">
                  No se encontraron lugares en La Paz.
                </Texto>
              </Vista>
            )}
            {hayResultados && (
              <Vista style={estilos.resultados}>
                <Vista style={[estilos.tarjeta, oscuro && estilos.tarjetaOscura]}>
                  {compartidoResultados.map((elemento, indice) => (
                    <PulsableOpacidad key={elemento.placeId} activeOpacity={0.72} accessibilityRole="button"
                      style={[estilos.resultado, indice > 0 && estilos.separador, indice > 0 && oscuro && estilos.separadorOscuro]}
                      onPress={() => buscarBars.current[activoBuscarIndice]?.select(elemento)}>
                      <MapaPin size={23} color={acento} strokeWidth={2.5} />
                      <LugarSuggestionEtiqueta suggestion={elemento} oscuro={oscuro} />
                    </PulsableOpacidad>
                  ))}
                </Vista>
                <Texto style={[estilos.atribucion, oscuro && estilos.mensajeOscuro]}>Google Maps</Texto>
              </Vista>
            )}
          </>
        )}
      </DesplazableVista>
    </SeguraZonaVista>
  );
};

const estilos = EstiloHoja.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 20 },
  tarjeta: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  filaRuta: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  campo: { flex: 1, minWidth: 0 },
  columnaIcono: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  iconoRuta: { borderRadius: 12, backgroundColor: '#000000' },
  quitar: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cargando: { paddingVertical: 4, alignItems: 'center' },
  aviso: { padding: 14 },
  mensaje: { fontSize: 14, lineHeight: 20, color: '#666675' },
  mensajeOscuro: { color: '#BDBDC7' },
  mensajeError: { fontSize: 14, lineHeight: 20, color: '#B91C1C' },
  errorOscuro: { color: '#FCA5A5' },
  resultados: { gap: 8 },
  resultado: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  separador: { borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  separadorOscuro: { borderTopColor: '#414141' },
  atribucion: { fontSize: 12, color: '#666675', textAlign: 'right', paddingRight: 2 }
});

export default BuscarPantalla;
