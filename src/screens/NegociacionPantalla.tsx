import { MAPA_CLARO } from '../theme/mapa';
import React, { useState as usarEstado, useRef as usarReferencia, useEffect as usarEfecto, useMemo as usarMemoria, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  BackHandler as ReversoManejador } from
'react-native';
import { SafeAreaView as SeguraZonaVista, useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import MapaVista, { Circle, Marker } from 'react-native-maps';
import { useNavigation as usarNavegacion, useRoute as usarRuta, RouteProp as RutaProp } from '@react-navigation/native';
import { NativeStackNavigationProp as NativoPilaNavegacionProp } from '@react-navigation/native-stack';
import { Clock3 as Reloj3, Handshake, Search as Buscar } from 'lucide-react-native';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { viajesServicio } from "../services/viajes.servicio";
import { AlmacenamientoAuxiliar } from '../services/storage';
import socketServicio from "../services/socket.servicio";
import { ConductorOfertaBubbles } from "../components/ConductorOfertaBubbles";
import ConfirmarInferiorHoja from "../components/ConfirmarInferiorSheet";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import { ofertaSegundosIzquierda } from "../utils/ofertaCountdown";
import { iniciarAdaptativaSincronizacion } from '../utils/adaptativaSincronizar';



type Nav = NativoPilaNavegacionProp<RaizPilaParametroLista, 'Negotiation'>;
type RutaParametros = RutaProp<RaizPilaParametroLista, 'Negotiation'>;

const formatoTemporizador = (segundos: number) => {
  const redondeadoSegundos = Math.round(segundos);
  return `${Math.floor(redondeadoSegundos / 60)}:${String(redondeadoSegundos % 60).padStart(2, '0')}`;
};

const PULSO_INTERVALO_MILISEGUNDOS = 1000;
const PULSO_DURACION_MILISEGUNDOS = 4000;
const ACERCAMIENTO_DURACION_MILISEGUNDOS = 100000;
const INICIAR_DELTA = 0.006;
const FIN_DELTA = 0.06;
const PASAJERO_VERTICAL_DESFASE = 0.34;

const NegociacionPantalla: React.FC = () => {
  const navegacion = usarNavegacion<Nav>();
  const ruta = usarRuta<RutaParametros>();
  const margenes = usarSeguraZonaMargenes();

  const {
    rideId: viajeId,
    expiresAt: venceEn,
    pickupLocation: recogidaUbicacion,
    pickupAddress: recogidaDireccion,
    destinationAddress: destinoDireccion,
    waypoints: paradas = [],
    fare: tarifa,
    originalFare: originalTarifa,
    distance: distancia,
    duration: duracion,
    selectedVehicleType: seleccionadoVehiculoTipo,
    selectedPaymentMethod: seleccionadoPagoMetodo
  } = ruta.params;

  const vencimientoTiempoReferencia = usarReferencia(
    venceEn && Number.isFinite(Date.parse(venceEn)) ?
    Date.parse(venceEn) :
    Date.now() + 120000
  );
  const [ahoraMilisegundos, establecerAhoraMilisegundos] = usarEstado(Date.now);
  const [mapaListo, establecerMapaListo] = usarEstado(false);
  const mapaReferencia = usarReferencia<MapaVista>(null);
  const senalInicioReferencia = usarReferencia(0);
  const solicitudTiempoIzquierda = Math.max(0, (vencimientoTiempoReferencia.current - ahoraMilisegundos) / 1000);
  const [activoViajeId] = usarEstado<string>(viajeId);
  const [conductorOfertas, establecerConductorOfertas] = usarEstado<any[]>([]);
  const [inferiorHojaAlto, establecerInferiorHojaAlto] = usarEstado(328);
  const ofertaRelojDesplazamientoReferencia = usarReferencia(0);
  const [mostrarOfertasCapa, establecerMostrarOfertasCapa] = usarEstado(false);
  const [mostrarCancelarConfirmar, establecerMostrarCancelarConfirmar] = usarEstado(false);
  const [esCancelling, establecerEsCancelling] = usarEstado(false);
  const [errorCancelacion, establecerErrorCancelacion] = usarEstado('');
  const [mostrarVencidoOpciones, establecerMostrarVencidoOpciones] = usarEstado(false);
  const [esRetrying, establecerEsRetrying] = usarEstado(false);
  const [reintentarError, establecerReintentarError] = usarEstado('');
  const [, establecerRepresentarTrigger] = usarEstado(0);
  const visibleOfertas = conductorOfertas.filter((oferta) =>
  ofertaSegundosIzquierda(oferta.expiresAt, Date.now(), oferta.serverOffsetMs) > 0
  );

  const solicitudTemporizadorReferencia = usarReferencia<ReturnType<typeof requestAnimationFrame> | null>(null);
  const automaticoVencerCalledReferencia = usarReferencia(false);
  const representarTriggerReferencia = usarReferencia<ReturnType<typeof setInterval> | null>(null);
  const tieneAbiertoViajeReferencia = usarReferencia(false);

  const abrirConfirmedViaje = usarFuncionRetorno(() => {
    // La respuesta HTTP y el socket pueden confirmar el mismo viaje.
    if (tieneAbiertoViajeReferencia.current) return;
    tieneAbiertoViajeReferencia.current = true;
    if (solicitudTemporizadorReferencia.current !== null) {
      cancelAnimationFrame(solicitudTemporizadorReferencia.current);
      solicitudTemporizadorReferencia.current = null;
    }
    establecerMostrarOfertasCapa(false);
    establecerConductorOfertas([]);
    AlmacenamientoAuxiliar.quitarElemento('activeRideState');
    navegacion.replace('ActiveRide', {
      rideId: activoViajeId,
      confirmationMessage: '¡Conductor asignado!'
    });
  }, [activoViajeId, navegacion]);

  const cerrarRegion = usarMemoria(() => ({
    latitude: recogidaUbicacion.latitude - INICIAR_DELTA * PASAJERO_VERTICAL_DESFASE,
    longitude: recogidaUbicacion.longitude,
    latitudeDelta: INICIAR_DELTA,
    longitudeDelta: INICIAR_DELTA
  }), [recogidaUbicacion.latitude, recogidaUbicacion.longitude]);
  const wideRegion = usarMemoria(() => ({
    latitude: recogidaUbicacion.latitude - FIN_DELTA * PASAJERO_VERTICAL_DESFASE,
    longitude: recogidaUbicacion.longitude,
    latitudeDelta: FIN_DELTA,
    longitudeDelta: FIN_DELTA
  }), [recogidaUbicacion.latitude, recogidaUbicacion.longitude]);

  usarEfecto(() => {
    if (!mapaListo) return;
    const acercamientoInicio = setTimeout(() => {
      mapaReferencia.current?.animateToRegion(wideRegion, ACERCAMIENTO_DURACION_MILISEGUNDOS);
    }, 350);
    return () => clearTimeout(acercamientoInicio);
  }, [mapaListo, wideRegion]);

  const manejarAutomaticoVencerViaje = usarFuncionRetorno(async () => {
    await viajesServicio.cancelarViaje(activoViajeId, 'Expirada', 'sistema').catch(() => {});
    if (solicitudTemporizadorReferencia.current !== null) {
      cancelAnimationFrame(solicitudTemporizadorReferencia.current);
      solicitudTemporizadorReferencia.current = null;
    }
    AlmacenamientoAuxiliar.quitarElemento('activeRideState');
    establecerMostrarVencidoOpciones(true);
  }, [activoViajeId]);

  const siguienteTarifa = usarMemoria(
    () => Math.ceil((tarifa + Math.max(2, tarifa * 0.1)) * 2) / 2,
    [tarifa]
  );

  const reintentarConHigherTarifa = async () => {
    establecerEsRetrying(true);
    establecerReintentarError('');
    try {
      const viaje = await viajesServicio.crearViaje({
        requestMode: 'negociacion',
        pickupLocation: { ...recogidaUbicacion, address: recogidaDireccion },
        dropoffLocation: { ...ruta.params.destinationLocation, address: destinoDireccion },
        waypoints: paradas,
        distance: distancia,
        duration: duracion,
        fare: siguienteTarifa,
        vehicleTypeRequested: seleccionadoVehiculoTipo,
        paymentMethod: seleccionadoPagoMetodo
      });
      socketServicio.unirViaje(viaje.id);
      socketServicio.notificarViajeCreated(viaje.id);
      establecerMostrarVencidoOpciones(false);
      navegacion.replace('Negotiation', {
        ...ruta.params,
        rideId: viaje.id,
        expiresAt: (viaje as any).expiresAt,
        fare: siguienteTarifa,
        originalFare: originalTarifa ?? tarifa
      });
    } catch (error: any) {
      establecerReintentarError(error?.data?.error || error?.message || 'No se pudo iniciar una nueva búsqueda.');
    } finally {
      establecerEsRetrying(false);
    }
  };

  const cancelarVencidoSolicitud = () => {
    establecerMostrarVencidoOpciones(false);
    AlmacenamientoAuxiliar.quitarElemento('activeRideState');
    navegacion.goBack();
  };

  usarEfecto(() => {
    const tick = () => {
      const realTiempo = Date.now();
      establecerAhoraMilisegundos(realTiempo);
      if (realTiempo >= vencimientoTiempoReferencia.current) {
        solicitudTemporizadorReferencia.current = null;
        if (!automaticoVencerCalledReferencia.current) {
          automaticoVencerCalledReferencia.current = true;
          manejarAutomaticoVencerViaje();
        }
        return;
      }
      solicitudTemporizadorReferencia.current = requestAnimationFrame(tick);
    };
    solicitudTemporizadorReferencia.current = requestAnimationFrame(tick);
    return () => {
      if (solicitudTemporizadorReferencia.current !== null) {
        cancelAnimationFrame(solicitudTemporizadorReferencia.current);
        solicitudTemporizadorReferencia.current = null;
      }
    };
  }, [manejarAutomaticoVencerViaje]);

  usarEfecto(() => {
    let vigente = true;
    const consultarOfertas = async () => {
      try {
        const { offers: ofertas, serverOffsetMs: servidorDesplazamientoMilisegundos } = await viajesServicio.obtenerContraofertas(activoViajeId);
        if (!vigente) return;
        ofertaRelojDesplazamientoReferencia.current = servidorDesplazamientoMilisegundos;
        const valido = ofertas.filter((oferta: any) =>
        !oferta.rejected && ofertaSegundosIzquierda(oferta.expiresAt, Date.now(), servidorDesplazamientoMilisegundos) > 0
        );
        establecerConductorOfertas((anterior) => {
          const combinado = new Map(anterior.map((oferta) => [oferta.offerId, { ...oferta, serverOffsetMs: servidorDesplazamientoMilisegundos }]));
          valido.forEach((oferta: any) => combinado.set(oferta.offerId, { ...oferta, serverOffsetMs: servidorDesplazamientoMilisegundos }));
          return Array.from(combinado.values()).filter((oferta) =>
          ofertaSegundosIzquierda(oferta.expiresAt, Date.now(), servidorDesplazamientoMilisegundos) > 0
          );
        });
        if (valido.length > 0) {
          establecerMostrarOfertasCapa(true);
        }
      } catch {}
    };

    const manejarNuevoOferta = (datos: any) => {
      if (!datos?.offer || datos.rideId !== activoViajeId) return;
      const oferta = datos.offer;
      establecerConductorOfertas((anterior) => {
        const actualizada = { ...oferta, serverOffsetMs: ofertaRelojDesplazamientoReferencia.current };
        return anterior.some(o => o.offerId === oferta.offerId)
          ? anterior.map(o => o.offerId === oferta.offerId ? actualizada : o)
          : [...anterior, actualizada];
      });
      establecerMostrarOfertasCapa(true);
    };
    socketServicio.conectar();
    socketServicio.al('offer:new', manejarNuevoOferta);
    const detenerConsultas = iniciarAdaptativaSincronizacion(consultarOfertas, () => 3000);

    return () => {
      vigente = false;
      detenerConsultas();
      socketServicio.desactivado('offer:new', manejarNuevoOferta);
    };
  }, [activoViajeId]);

  usarEfecto(() => {
    const manejarViajeAceptado = (datos: any) => {
      if (datos?.rideId !== activoViajeId) return;
      abrirConfirmedViaje();
    };
    socketServicio.al('ride:accepted', manejarViajeAceptado);
    return () => {
      socketServicio.desactivado('ride:accepted', manejarViajeAceptado);
    };
  }, [activoViajeId, abrirConfirmedViaje]);

  usarEfecto(() => {
    if (!mostrarOfertasCapa) {
      if (representarTriggerReferencia.current) clearInterval(representarTriggerReferencia.current);
      return;
    }
    representarTriggerReferencia.current = setInterval(() => establecerRepresentarTrigger((p) => p + 1), 1000);
    return () => {
      if (representarTriggerReferencia.current) clearInterval(representarTriggerReferencia.current);
    };
  }, [mostrarOfertasCapa]);

  usarEfecto(() => {
    const alReversoPulsar = () => {
      establecerErrorCancelacion('');
      establecerMostrarCancelarConfirmar(true);
      return true;
    };

    const suscripcion = ReversoManejador.addEventListener('hardwareBackPress', alReversoPulsar);
    return () => suscripcion.remove();
  }, []);

  usarEfecto(() => {
    return () => {
      socketServicio.leaveViaje(activoViajeId);
    };
  }, [activoViajeId]);

  const manejarCancelarViaje = () => {
    establecerErrorCancelacion('');
    establecerMostrarCancelarConfirmar(true);
  };

  const confirmarCancelarViaje = async () => {
    establecerEsCancelling(true);
    establecerErrorCancelacion('');
    try {
      await viajesServicio.cancelarViaje(activoViajeId, 'Cancelado por pasajero', 'pasajero');
    } catch (error: any) {
      establecerErrorCancelacion(error?.data?.error || 'No se pudo cancelar la solicitud. Intenta nuevamente.');
      establecerEsCancelling(false);
      return;
    }
    socketServicio.leaveViaje(activoViajeId);
    if (solicitudTemporizadorReferencia.current !== null) {
      cancelAnimationFrame(solicitudTemporizadorReferencia.current);
      solicitudTemporizadorReferencia.current = null;
    }
    AlmacenamientoAuxiliar.quitarElemento('activeRideState');
    establecerMostrarCancelarConfirmar(false);
    establecerEsCancelling(false);
    navegacion.goBack();
  };

  const manejarRechazarOferta = async (ofertaId: string) => {
    try {
      await viajesServicio.rechazarContraoferta(activoViajeId, ofertaId);
      establecerConductorOfertas((anterior) => anterior.filter((oferta) => oferta.offerId !== ofertaId));
    } catch (error: any) {
      Alert.alert('Error', error?.data?.error || 'No se pudo rechazar la oferta. Inténtalo de nuevo.');
    }
  };

  const manejarAceptarOferta = async (oferta: any) => {
    try {
      await viajesServicio.aceptarContraoferta(
        activoViajeId,
        oferta.offerId,
        oferta.proposedPrice || oferta.fare
      );
      abrirConfirmedViaje();
    } catch (error: any) {
      Alert.alert('Error', error?.message);
    }
  };

  const senalTranscurrido = mapaListo ? Math.max(0, ahoraMilisegundos - senalInicioReferencia.current) : 0;
  const acercamientoProgreso = Math.min(1, senalTranscurrido / ACERCAMIENTO_DURACION_MILISEGUNDOS);
  const visibleMapaSpan = INICIAR_DELTA + (FIN_DELTA - INICIAR_DELTA) * acercamientoProgreso;
  const maximoPulsoRadio = visibleMapaSpan * 111000 * 0.27;
  const recientePulso = Math.floor(senalTranscurrido / PULSO_INTERVALO_MILISEGUNDOS);
  const senalPulses = mapaListo ?
  Array.from({ length: 4 }, (_, indice) => recientePulso - indice).
  filter((pulsoId) => pulsoId >= 0).
  map((pulsoId) => {
    const antiguedad = senalTranscurrido - pulsoId * PULSO_INTERVALO_MILISEGUNDOS;
    const progreso = Math.min(1, antiguedad / PULSO_DURACION_MILISEGUNDOS);
    const easedProgreso = progreso * progreso * (3 - 2 * progreso);
    const opacidad = Math.sin(Math.PI * progreso);
    return {
      id: pulsoId,
      radius: 8 + maximoPulsoRadio * easedProgreso,
      strokeColor: `rgba(117,20,197,${(0.36 * opacidad).toFixed(3)})`,
      fillColor: `rgba(117,20,197,${(0.055 * opacidad).toFixed(3)})`
    };
  }) :
  [];

  return (
    <SeguraZonaVista style={s.root} edges={['bottom']}>
      <MapaVista
        {...MAPA_CLARO}
        ref={mapaReferencia}
        style={[s.map, { bottom: margenes.bottom }]}
        initialRegion={cerrarRegion}
        onMapReady={() => {
          senalInicioReferencia.current = Date.now();
          establecerMapaListo(true);
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>

        {senalPulses.map((pulso) =>
        <Circle
          key={pulso.id}
          center={recogidaUbicacion}
          radius={pulso.radius}
          strokeColor={pulso.strokeColor}
          fillColor={pulso.fillColor}
          strokeWidth={2} />

        )}
        <Marker coordinate={recogidaUbicacion} anchor={{ x: 0.5, y: 0.5 }}>
          <Vista collapsable={false}>
            <PasajeroMapaIcono size={42} />
          </Vista>
        </Marker>
      </MapaVista>

      {mostrarOfertasCapa && visibleOfertas.length > 0 &&
      <Vista style={s.mapOverlay} />
      }

      <Vista style={[s.negoHeader, mostrarOfertasCapa && visibleOfertas.length > 0 && s.negoHeaderRaised]}>
        <Vista style={s.negoHeaderIcon}>
          <Handshake size={24} color={T.accent} strokeWidth={2.8} />
        </Vista>
        <Texto style={s.negoTitle}>Modo negociación</Texto>
      </Vista>

      <ConductorOfertaBubbles
        offers={visibleOfertas}
        onReject={manejarRechazarOferta}
        onAccept={manejarAceptarOferta}
        bottomOffset={inferiorHojaAlto + margenes.bottom + 12} />


      <Vista
        style={[
        s.bottomSheet,
        { bottom: margenes.bottom },
        mostrarOfertasCapa && visibleOfertas.length > 0 && s.bottomSheetDimmed]
        }
        onLayout={(evento) => establecerInferiorHojaAlto(evento.nativeEvent.layout.height)}>

        <Vista style={s.sheetHandle} />
        <Vista style={s.searchRow}>
          <Vista style={s.searchIcon}>
            <Buscar size={24} color={T.accent} strokeWidth={2.3} />
          </Vista>
          <Vista style={s.searchCopy}>
            <Texto style={s.searchTitle}>Buscando conductores</Texto>
            <Texto style={s.searchSubtitle}>Te avisaremos cuando llegue una oferta</Texto>
          </Vista>
        </Vista>

        <Vista style={s.timeRow} accessible accessibilityLabel={`Tiempo restante: ${formatoTemporizador(solicitudTiempoIzquierda)}`}>
          <Reloj3 size={17} color={T.accent} strokeWidth={2} />
          <Texto style={s.timeLabel}>Tiempo restante</Texto>
          <Texto style={s.timeValue}>{formatoTemporizador(solicitudTiempoIzquierda)}</Texto>
        </Vista>

        <Vista style={s.divider} />
        <Vista style={s.fareRow}>
          <Vista style={s.fareCopy}>
            <Texto style={s.fareLabel}>TU TARIFA</Texto>
            <Texto style={s.fareValue}>Bs {tarifa.toFixed(2)}</Texto>
          </Vista>
          {originalTarifa != null &&
          <Vista style={s.suggestedFare}>
              <Texto style={s.suggestedLabel}>Sugerida</Texto>
              <Texto style={s.suggestedValue}>Bs {originalTarifa.toFixed(2)}</Texto>
            </Vista>
          }
        </Vista>

        <Vista style={s.routeRow}>
          {[
          { address: recogidaDireccion },
          ...paradas.map((parada) => ({ address: parada.address })),
          { address: destinoDireccion }].
          map((parada, indice, puntos) =>
          <Vista key={`${indice}-${parada.address}`} style={s.routePoint}>
              <Vista style={s.routePointIcon}>
                {indice === 0 ? <PasajeroMapaIcono size={27} bare /> :
              indice === puntos.length - 1 ? <DestinoIndicadorIcon size={27} bare /> :
              <ParadaMapaIcon number={indice} size={28} />}
                {indice < puntos.length - 1 && <Vista style={s.routeLine} />}
              </Vista>
              <Vista style={s.routePointCopy}>
                <Texto style={s.routeAddress} numberOfLines={2}>{parada.address}</Texto>
              </Vista>
            </Vista>
          )}
        </Vista>

        <PulsableOpacidad style={s.cancelBtn} onPress={manejarCancelarViaje} activeOpacity={0.8}>
          <Texto style={s.cancelBtnText}>Cancelar solicitud</Texto>
        </PulsableOpacidad>
      </Vista>

      <ConfirmarInferiorHoja
        visible={mostrarCancelarConfirmar}
        title="¿Cancelar solicitud?"
        message="Se cancelará la búsqueda de conductores para este viaje."
        confirmLabel="Sí, cancelar"
        cancelLabel="Seguir buscando"
        stackedActions
        loading={esCancelling}
        error={errorCancelacion}
        onConfirm={confirmarCancelarViaje}
        onCancel={() => establecerMostrarCancelarConfirmar(false)} />


      <ConfirmarInferiorHoja
        visible={mostrarVencidoOpciones}
        title="Buscar de nuevo con una tarifa más alta"
        message={`No recibimos una oferta a tiempo. Nueva tarifa: Bs ${siguienteTarifa.toFixed(2)}.`}
        confirmLabel={`Buscar por Bs ${siguienteTarifa.toFixed(2)}`}
        cancelLabel="Cancelar solicitud"
        stackedActions
        loading={esRetrying}
        error={reintentarError}
        onConfirm={reintentarConHigherTarifa}
        onCancel={cancelarVencidoSolicitud} />

    </SeguraZonaVista>);

};

const s = EstiloHoja.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  map: { ...EstiloHoja.absoluteFillObject },
  mapOverlay: {
    ...EstiloHoja.absoluteFillObject,
    backgroundColor: 'rgba(11,10,18,0.60)',
    zIndex: 30
  },
  negoHeader: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10
  },
  negoHeaderRaised: {
    zIndex: 40,
    elevation: 21
  },
  negoHeaderIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  negoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111118'
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 20
  },
  bottomSheetDimmed: {
    elevation: 0,
    shadowOpacity: 0
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 14
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  searchIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3EAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchCopy: { flex: 1 },
  searchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111118'
  },
  searchSubtitle: {
    fontSize: 13,
    color: '#7A7A8A',
    marginTop: 2
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3EAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14
  },
  timeLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#7A7A8A' },
  timeValue: { fontSize: 17, fontWeight: '700', color: T.accent },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 14
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12
  },
  fareCopy: { flex: 1 },
  fareLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A7A8A',
    letterSpacing: 0.8
  },
  fareValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111118',
    letterSpacing: -0.8,
    fontFamily: 'Montserrat'
  },
  suggestedFare: { alignItems: 'flex-end', paddingBottom: 5 },
  suggestedLabel: { fontSize: 12, color: '#AFAFBF' },
  suggestedValue: { fontSize: 13, fontWeight: '600', color: '#7A7A8A' },
  routeRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    marginTop: 12
  },
  routePoint: { flexDirection: 'row', minHeight: 42 },
  routePointIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 12
  },
  routeLine: {
    flex: 1,
    minHeight: 8,
    width: 1.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 2
  },
  routePointCopy: { flex: 1, paddingBottom: 8 },
  routeAddress: { fontSize: 14, fontWeight: '500', color: '#111118' },
  cancelBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14
  },
  cancelBtnText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111118'
  }
});

export default NegociacionPantalla;
