import React, { useCallback as usarFuncionRetorno, useEffect as usarEfecto, useMemo as usarMemoria, useRef as usarReferencia, useState as usarEstado } from 'react';
import {
  ActivityIndicator as ActividadIndicador,
  ScrollView as DesplazableVista,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import RapidoReservaCard from "../components/RapidaReservaTarjeta";
import { RapidaAsignacionRespuesta as RapidoAsignacionRespuesta } from "../types/rapidaAsignacion";
import { viajesServicio } from "../services/viajes.servicio";
import socketServicio from "../services/socket.servicio";
import { iniciarAdaptativaSincronizacion } from '../utils/adaptativaSincronizar';
import { tiempoRestanteReserva } from '../utils/tiempoReserva';

function RapidoAsignacionPantalla({
  route: ruta,
  navigation: navegacion
}: NativoPilaPantallaPropiedades<RaizPilaParametroLista, 'QuickAssignment'>) {
  const viajeId = ruta.params.rideId;
  const solicitud = ruta.params.request;
  const retornoRuta = usarMemoria(() => solicitud ? {
    pickupLocation: solicitud.pickupLocation,
    pickupAddress: solicitud.pickupLocation.address,
    destinationLocation: solicitud.dropoffLocation,
    destinationAddress: solicitud.dropoffLocation.address,
    stops: [
    { location: solicitud.pickupLocation, address: solicitud.pickupLocation.address },
    ...(solicitud.waypoints ?? []).map((parada) => ({ location: parada, address: parada.address })),
    { location: solicitud.dropoffLocation, address: solicitud.dropoffLocation.address }]

  } : {}, [solicitud]);
  const [instantanea, establecerInstantanea] = usarEstado<RapidoAsignacionRespuesta | null>(
    ruta.params.initialSnapshot ?? null
  );
  const [ocupado, establecerOcupado] = usarEstado(false);
  const [mensaje, establecerMensaje] = usarEstado('');
  const leaving = usarReferencia(false);
  const pendiente = usarReferencia(false);
  const revision = usarReferencia(0);
  const renovando = usarReferencia(false);
  const aplicar = usarFuncionRetorno(
    (datos: RapidoAsignacionRespuesta) => {
      establecerInstantanea(datos);
      if (
      datos.ride &&
      ['aceptado', 'llegado', 'en_curso'].includes(datos.ride.status) &&
      !leaving.current)
      {
        leaving.current = true;
        navegacion.replace('ActiveRide', { rideId: datos.ride.id });
      }
    },
    [navegacion]
  );

  usarEfecto(() => {
    if (ruta.params.initialSnapshot) aplicar(ruta.params.initialSnapshot);
  }, [aplicar, ruta.params.initialSnapshot]);

  const renovar = usarFuncionRetorno(async () => {
    if (!viajeId || leaving.current || renovando.current || pendiente.current) return;
    renovando.current = true;
    const version = ++revision.current;
    try {
      const datos = await viajesServicio.obtenerAsignacionRapida(viajeId);
      if (version === revision.current && !leaving.current && !pendiente.current) aplicar(datos);
    } catch {
      if (version === revision.current && !leaving.current) {
        establecerMensaje('No se pudo verificar la reserva. Comprueba tu conexión; el servidor mantiene el plazo original.');
      }
    } finally {
      renovando.current = false;
    }
  }, [aplicar, viajeId]);

  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    if (leaving.current) return;
    const detenerConsultas = iniciarAdaptativaSincronizacion(renovar, () => leaving.current ? null : 1000);
    const evento = (datos: {rideId: string;}) => {
      if (datos.rideId === viajeId) renovar();
    };
    socketServicio.al('ride:assignment', evento);
    return () => {
      revision.current++;
      detenerConsultas();
      socketServicio.desactivado('ride:assignment', evento);
    };
  }, [renovar, viajeId]));

  const finalizar = async (confirmar: boolean) => {
    if (!viajeId || pendiente.current) return;
    pendiente.current = true;
    revision.current++;
    establecerOcupado(true);
    establecerMensaje('');
    try {
      const datos = await (confirmar ?
      viajesServicio.confirmarAsignacionRapida(viajeId) :
      viajesServicio.cancelarAsignacionRapida(viajeId));
      aplicar(datos);
      if (!confirmar && !leaving.current) {
        leaving.current = true;
        navegacion.navigate('Map', { ...retornoRuta, quickAssignmentCancelled: true });
      }
    } catch (error: any) {
      establecerMensaje(
        error?.data?.error ??
        'No se pudo confirmar el resultado. Estamos verificando la reserva.'
      );
    } finally {
      pendiente.current = false;
      establecerOcupado(false);
      if (!leaving.current) renovar();
    }
  };
  const viaje = instantanea?.ride;
  const segundosRestantes = tiempoRestanteReserva(instantanea);
  const terminal =
  viaje && ['vencido', 'cancelado', 'completado'].includes(viaje.status) ||
  segundosRestantes === 0;

  usarEfecto(() => {
    if (terminal && !leaving.current) {
      leaving.current = true;
      navegacion.navigate('Map', { ...retornoRuta, quickAssignmentExpired: true });
    }
  }, [terminal, navegacion, retornoRuta]);

  const puedeConfirmar =
  viaje?.status === 'solicitado' &&
  segundosRestantes !== null && segundosRestantes > 0 &&
  !ocupado;
  return (
    <SeguraZonaVista style={estilos.page}>
      <DesplazableVista contentContainerStyle={[estilos.content, !viaje && estilos.loadingContent]}>
        {!viaje ?
        <Vista style={estilos.loading}>
            <ActividadIndicador size="large" color="#7514C5" />
            <Texto style={estilos.loadingText}>Recuperando reserva…</Texto>
          </Vista> :
        terminal ? null :
        <>
            <Vista style={estilos.success}>
              <Vista style={estilos.successIcon}>
                <Texto style={estilos.successCheck}>✓</Texto>
              </Vista>
              <Vista style={estilos.successCopy}>
                <Texto style={estilos.eyebrowLeft}>ASIGNACIÓN RÁPIDA</Texto>
                <Texto style={estilos.successTitle}>Viaje asignado</Texto>
                <Texto style={estilos.caption}>
                  Encontramos un conductor para ti.
                </Texto>
              </Vista>
            </Vista>
            <RapidoReservaCard ride={viaje} segundosRestantes={segundosRestantes} />
          </>
        }
        {!!mensaje &&
        <Texto accessibilityRole="alert" style={estilos.message}>
            {mensaje}
          </Texto>
        }
      </DesplazableVista>
      {!!viaje && !terminal &&
      <Vista style={estilos.actions}>
          <PulsableOpacidad
          accessibilityRole="button"
          disabled={!puedeConfirmar}
          style={[estilos.button, !puedeConfirmar && estilos.disabled]}
          onPress={() => finalizar(true)}>

            <Texto style={estilos.buttonText}>
              {ocupado ? 'Verificando…' : `Confirmar por Bs ${Number(viaje.finalFare).toFixed(2)}`}
            </Texto>
          </PulsableOpacidad>
          <PulsableOpacidad
          accessibilityRole="button"
          disabled={ocupado}
          style={estilos.cancel}
          onPress={() => finalizar(false)}>

            <Texto style={estilos.cancelText}>Cancelar reserva</Texto>
          </PulsableOpacidad>
        </Vista>
      }
    </SeguraZonaVista>);

}export { RapidoAsignacionPantalla as default };
const estilos = EstiloHoja.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#453950', fontSize: 16 },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12
  },
  successIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EEE2FA',
    alignItems: 'center', justifyContent: 'center'
  },
  successCopy: { flex: 1 },
  successCheck: { color: '#7514C5', fontSize: 26, fontWeight: '800' },
  successTitle: { color: '#21142B', fontSize: 25, fontWeight: '800' },
  eyebrowLeft: { color: '#7514C5', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    flexGrow: 1,
    backgroundColor: '#FFFFFF'
  },
  loadingContent: { justifyContent: 'center' },
  button: {
    borderRadius: 16,
    backgroundColor: '#7514C5',
    padding: 18,
    alignItems: 'center'
  },
  buttonText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  actions: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EBF4'
  },
  cancel: { alignItems: 'center', padding: 12 },
  cancelText: { color: '#7514C5', fontSize: 17, fontWeight: '700' },
  caption: { color: '#685C72', fontSize: 13, lineHeight: 20 },
  message: { color: '#A12943', fontSize: 14, lineHeight: 20 }
});
