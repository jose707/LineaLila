import React, {
  useState as usarEstado,
  useEffect as usarEfecto,
  forwardRef as forwardReferencia,
  useImperativeHandle as usarImperativeManejar,
  useRef as usarReferencia,
  useCallback as usarFuncionRetorno } from
'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  TextInput as TextoEntrada,
  FlatList as FlatLista,
  ActivityIndicator as ActividadIndicador } from
'react-native';
import { X, MapPin as MapaPin } from 'lucide-react-native';
import LugarSuggestionEtiqueta from "./PlaceSugerenciaEtiqueta";

import {
  lugaresServicio,
  nuevoLugaresSesion,
  LugarSugerencia,
  LugarResultado } from
"../services/places.servicio";
export type BusquedaResultado = LugarResultado;

interface BusquedaBarPropiedades {
  onResultSelect: (result: BusquedaResultado) => void;
  placeholder: string;
  currentLat?: number;
  currentLon?: number;
  leftIcon?: React.ReactNode;
  onLeftIconPress?: () => void;
  autoFocus?: boolean;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  onSuffixIconPress?: () => void;
  initialValue?: string;
  onClear?: () => void;
  onResultsChange?: (
  results: LugarSugerencia[],
  loading: boolean,
  error: string,
  empty: boolean)
  => void;
  onFocusChange?: (focused: boolean) => void;
  hideResults?: boolean;
}

export interface BusquedaBarReferencia {
  focus: () => void;
  select: (suggestion: LugarSugerencia) => Promise<void>;
}

const BuscarBar = forwardReferencia<BusquedaBarReferencia, BusquedaBarPropiedades>(
  (
  {
    onResultSelect: alResultadoSeleccionar,
    placeholder: indicacion,
    currentLat: realLatitud,
    currentLon: realLongitud,
    leftIcon: izquierdaIcono,
    onLeftIconPress: alIzquierdaIconoPulsar,
    autoFocus: automaticoEnfoque,
    prefixIcon: prefijoIcono,
    suffixIcon: sufijoIcono,
    onSuffixIconPress: alSufijoIconoPulsar,
    initialValue: inicialValor,
    onClear: alLimpiar,
    onResultsChange: alResultadosCambio,
    onFocusChange: alEnfoqueCambio,
    hideResults: ocultarResultados
  },
  referencia) =>
  {
    const [buscarTexto, establecerBuscarTexto] = usarEstado(inicialValor || '');
    const [resultados, establecerResultados] = usarEstado<LugarSugerencia[]>([]);
    const [cargando, establecerCargando] = usarEstado(false);
    const [mostrarResultados, establecerMostrarResultados] = usarEstado(false);
    const [esEnfocado, establecerEsEnfocado] = usarEstado(false);
    const [errorMensaje, establecerErrorMensaje] = usarEstado('');
    const [seleccionando, establecerSeleccionando] = usarEstado(false);
    const seleccionandoReferencia = usarReferencia(false);
    const sesionReferencia = usarReferencia('');
    if (!sesionReferencia.current) sesionReferencia.current = nuevoLugaresSesion();
    const revisionReferencia = usarReferencia(0);
    const montadoReferencia = usarReferencia(true);
    const seleccionadoFuncionRetorno = usarReferencia(alResultadoSeleccionar);
    seleccionadoFuncionRetorno.current = alResultadoSeleccionar;
    const entradaReferencia = usarReferencia<TextoEntrada>(null);
    const omitirBuscarReferencia = usarReferencia(!!inicialValor);
    const seleccionadoTextoReferencia = usarReferencia(inicialValor || '');
    const alResultadosCambioReferencia = usarReferencia(alResultadosCambio);
    alResultadosCambioReferencia.current = alResultadosCambio;
    const alEnfoqueCambioReferencia = usarReferencia(alEnfoqueCambio);
    alEnfoqueCambioReferencia.current = alEnfoqueCambio;

    usarEfecto(() => {
      montadoReferencia.current = true;
      return () => {
        montadoReferencia.current = false;
      };
    }, []);

    usarEfecto(() => {
      seleccionadoTextoReferencia.current = inicialValor || '';
      revisionReferencia.current++;
      establecerBuscarTexto(inicialValor || '');
      establecerResultados([]);
      establecerMostrarResultados(false);
      establecerCargando(false);
      establecerErrorMensaje('');
    }, [inicialValor]);

    usarEfecto(() => {
      let cancelado = false;
      if (seleccionandoReferencia.current) return;
      const version = ++revisionReferencia.current;
      if (omitirBuscarReferencia.current || seleccionadoTextoReferencia.current === buscarTexto) {
        omitirBuscarReferencia.current = false;
        return;
      }
      establecerErrorMensaje('');
      establecerResultados([]);
      if (buscarTexto.trim().length < 2) {
        establecerCargando(false);
        establecerMostrarResultados(false);
        return;
      }
      establecerCargando(true);
      establecerMostrarResultados(true);
      const temporizador = setTimeout(async () => {
        try {
          const suggestions = await lugaresServicio.autocompletar(
            buscarTexto,
            sesionReferencia.current,
            realLatitud,
            realLongitud
          );
          if (!cancelado && version === revisionReferencia.current)
          establecerResultados(suggestions);
        } catch (error: any) {
          if (!cancelado && version === revisionReferencia.current)
          establecerErrorMensaje(
            error?.data?.error ||
            'No se pudo buscar. Revisa tu conexión e intenta nuevamente.'
          );
        } finally {
          if (!cancelado && version === revisionReferencia.current) establecerCargando(false);
        }
      }, 400);
      return () => {
        cancelado = true;
        clearTimeout(temporizador);
      };
    }, [buscarTexto, realLatitud, realLongitud]);

    usarEfecto(() => {
      if (ocultarResultados && esEnfocado) {
        alResultadosCambioReferencia.current?.(
          mostrarResultados ? resultados : [],
          cargando || seleccionando,
          errorMensaje,
          mostrarResultados &&
          !cargando &&
          !seleccionando &&
          !errorMensaje &&
          resultados.length === 0
        );
      }
    }, [
    resultados,
    cargando,
    seleccionando,
    mostrarResultados,
    ocultarResultados,
    esEnfocado,
    errorMensaje]
    );

    const manejarResultadoSeleccionar = usarFuncionRetorno(
      async (sugerencia: LugarSugerencia) => {
        if (
        seleccionandoReferencia.current ||
        sugerencia.sessionToken !== sesionReferencia.current)

        return;
        seleccionandoReferencia.current = true;
        const version = ++revisionReferencia.current;
        establecerSeleccionando(true);
        establecerCargando(false);
        establecerErrorMensaje('');
        try {
          const resultado = await lugaresServicio.detalles(sugerencia);
          if (!montadoReferencia.current || version !== revisionReferencia.current) return;
          omitirBuscarReferencia.current = true;
          seleccionadoTextoReferencia.current = resultado.display_name;
          establecerBuscarTexto(resultado.display_name);
          establecerResultados([]);
          establecerMostrarResultados(false);
          sesionReferencia.current = nuevoLugaresSesion();
          seleccionadoFuncionRetorno.current(resultado);
        } catch (error: any) {
          if (montadoReferencia.current && version === revisionReferencia.current)
          establecerErrorMensaje(
            error?.data?.error ||
            'No se pudo obtener el lugar. Intenta seleccionarlo nuevamente.'
          );
        } finally {
          seleccionandoReferencia.current = false;
          if (montadoReferencia.current) establecerSeleccionando(false);
        }
      },
      []
    );

    usarImperativeManejar(
      referencia,
      () => ({
        focus: () => entradaReferencia.current?.focus(),
        select: manejarResultadoSeleccionar
      }),
      [manejarResultadoSeleccionar]
    );

    return (
      <Vista style={estilos.container}>
        <Vista style={estilos.inputContainer}>
          {prefijoIcono && <Vista style={estilos.prefixIcon}>{prefijoIcono}</Vista>}
          {izquierdaIcono && esEnfocado &&
          <PulsableOpacidad
            onPress={alIzquierdaIconoPulsar}
            style={estilos.leftIconBtn}
            activeOpacity={0.7}>

              {izquierdaIcono}
            </PulsableOpacidad>
          }
          <TextoEntrada
            ref={entradaReferencia}
            style={estilos.input}
            placeholder={indicacion}
            placeholderTextColor="#999"
            value={buscarTexto}
            editable={!seleccionando}
            maxLength={200}
            onChangeText={(texto) => {
              revisionReferencia.current++;
              seleccionadoTextoReferencia.current = '';
              omitirBuscarReferencia.current = false;
              establecerBuscarTexto(texto);
            }}
            autoFocus={automaticoEnfoque}
            onFocus={() => {
              establecerEsEnfocado(true);
              alEnfoqueCambioReferencia.current?.(true);
              if (buscarTexto.length >= 2 && seleccionadoTextoReferencia.current !== buscarTexto) {
                establecerMostrarResultados(true);
              }
            }}
            onBlur={() => {
              establecerEsEnfocado(false);
              alEnfoqueCambioReferencia.current?.(false);
            }} />

          {esEnfocado && buscarTexto.length > 0 &&
          <PulsableOpacidad
            disabled={seleccionando}
            style={estilos.clearButton}
            onPress={() => {
              revisionReferencia.current++;
              sesionReferencia.current = nuevoLugaresSesion();
              establecerErrorMensaje('');
              establecerCargando(false);
              establecerBuscarTexto('');
              establecerResultados([]);
              establecerMostrarResultados(false);
              alLimpiar?.();
            }}>

              <X size={10} color="#FFFFFF" strokeWidth={3} />
            </PulsableOpacidad>
          }
          {esEnfocado && sufijoIcono && alSufijoIconoPulsar ?
          <PulsableOpacidad
            style={estilos.suffixIconBtn}
            onPress={alSufijoIconoPulsar}
            activeOpacity={0.7}>

              {sufijoIcono}
            </PulsableOpacidad> :
          esEnfocado && sufijoIcono ?
          <Vista style={estilos.suffixIcon}>{sufijoIcono}</Vista> :
          null}
        </Vista>

        {!ocultarResultados && !!errorMensaje &&
        <Texto accessibilityRole="alert" style={estilos.error}>
            {errorMensaje}
          </Texto>
        }
        {!ocultarResultados &&
        <>
            {(cargando || seleccionando) && mostrarResultados &&
          <Vista style={estilos.loadingContainer}>
                <ActividadIndicador size="small" color="#7C3AED" />
              </Vista>
          }

            {mostrarResultados && resultados.length > 0 &&
          <FlatLista
            data={resultados}
            renderItem={({ item: elemento }) =>
            <PulsableOpacidad
              disabled={seleccionando || cargando}
              style={estilos.resultItem}
              onPress={() => manejarResultadoSeleccionar(elemento)}
              activeOpacity={0.7}>

                    <Vista style={estilos.resultIconContainer}>
                      <MapaPin
                  size={22}
                  color="#7C3AED"
                  strokeWidth={2.2} />

                    </Vista>
                    <LugarSuggestionEtiqueta suggestion={elemento} />
                  </PulsableOpacidad>
            }
            keyExtractor={(elemento) => elemento.placeId}
            ListFooterComponent={
            <Texto style={estilos.attribution}>Google Maps</Texto>
            }
            scrollEnabled={false}
            style={estilos.resultsList} />

          }

            {mostrarResultados &&
          buscarTexto.length >= 2 &&
          resultados.length === 0 &&
          !cargando &&
          !seleccionando &&
          !errorMensaje &&
          <Vista style={estilos.noResultsContainer}>
                  <Texto style={estilos.noResultsText}>
                    No se encontraron resultados en La Paz
                  </Texto>
                </Vista>
          }
          </>
        }
      </Vista>);

  }
);

const estilos = EstiloHoja.create({
  attribution: {
    fontSize: 12,
    fontWeight: '400',
    color: '#5E5E5E',
    padding: 12,
    textAlign: 'right'
  },
  error: { color: '#B91C1C', padding: 12, fontSize: 14 },
  container: {
    marginVertical: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D0D0D0'
  },
  leftIconBtn: {
    marginRight: 8
  },
  prefixIcon: {
    marginRight: 8
  },
  suffixIcon: {
    marginLeft: 8
  },
  suffixIconBtn: {
    marginLeft: 8
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    minHeight: 48
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4
  },
  loadingContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultsList: {
    marginTop: 8,
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
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  resultIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  noResultsContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginTop: 8
  },
  noResultsText: {
    fontSize: 13,
    color: '#999'
  }
});

export default BuscarBar;
