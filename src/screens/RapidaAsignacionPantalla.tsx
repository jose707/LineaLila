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
import { usarAjustes } from '../context/AjustesContexto';

function RapidoAsignacionPantalla({
  route: ruta,
  navigation: navegacion
}: NativoPilaPantallaPropiedades<RaizPilaParametroLista, 'QuickAssignment'>) {
  const { settings: { darkMode: oscuro } } = usarAjustes();
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
        navegacion.replace('PassengerActiveRide', { rideId: datos.ride.id });
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
  const texto = oscuro && estilos.textoClaro;

  return (
    <SeguraZonaVista style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
      <DesplazableVista contentContainerStyle={[estilos.contenido, !viaje && estilos.contenidoCargando]}
        showsVerticalScrollIndicator={false}>
        {!viaje ? (
          <Vista style={estilos.cargando} accessibilityLiveRegion="polite">
            <ActividadIndicador size="large" color={oscuro ? '#D5A6FF' : '#7514C5'} />
            <Texto style={[estilos.textoCargando, texto]}>Recuperando reserva…</Texto>
          </Vista>
        ) : !terminal && (
          <RapidoReservaCard ride={viaje} segundosRestantes={segundosRestantes} oscuro={oscuro} />
        )}
        {!!mensaje && (
          <Texto accessibilityRole="alert" style={[estilos.mensaje, oscuro && estilos.mensajeOscuro]}>{mensaje}</Texto>
        )}
      </DesplazableVista>

      {!!viaje && !terminal && (
        <Vista style={[estilos.acciones, oscuro && estilos.accionesOscuras]}>
          <PulsableOpacidad accessibilityRole="button" disabled={!puedeConfirmar}
            accessibilityState={{ disabled: !puedeConfirmar, busy: ocupado }} activeOpacity={0.85}
            style={[estilos.boton, estilos.confirmar, !puedeConfirmar && estilos.deshabilitado,
              !puedeConfirmar && oscuro && estilos.deshabilitadoOscuro]}
            onPress={() => finalizar(true)}>
            <Texto style={[estilos.textoBoton, estilos.textoConfirmar, !puedeConfirmar && estilos.textoDeshabilitado,
              !puedeConfirmar && oscuro && estilos.textoDeshabilitadoOscuro]}>
              {ocupado ? 'Verificando…' : 'Confirmar por Bs ' + Number(viaje.finalFare).toFixed(2)}
            </Texto>
          </PulsableOpacidad>
          <PulsableOpacidad accessibilityRole="button" disabled={ocupado} accessibilityState={{ disabled: ocupado }}
            activeOpacity={0.85} style={[estilos.boton, estilos.cancelar, oscuro && estilos.cancelarOscuro,
              ocupado && estilos.cancelarDeshabilitado]} onPress={() => finalizar(false)}>
            <Texto style={[estilos.textoBoton, texto]}>Cancelar reserva</Texto>
          </PulsableOpacidad>
        </Vista>
      )}
    </SeguraZonaVista>
  );
}

const estilos = EstiloHoja.create({
  pantalla: { flex: 1, paddingTop: 64, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  textoClaro: { color: '#FFFFFF' },
  contenido: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 18, gap: 12 },
  contenidoCargando: { flexGrow: 1, justifyContent: 'center' },
  cargando: { alignItems: 'center', gap: 12 },
  textoCargando: { color: '#666675', fontSize: 16 },
  acciones: { paddingHorizontal: 16, paddingVertical: 12, gap: 8,
    borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  accionesOscuras: { borderTopColor: '#414141' },
  boton: { minHeight: 54, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center' },
  confirmar: { backgroundColor: '#7514C5' },
  textoBoton: { color: '#111118', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  textoConfirmar: { color: '#FFFFFF' },
  deshabilitado: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0' },
  deshabilitadoOscuro: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  textoDeshabilitado: { color: '#666675' },
  textoDeshabilitadoOscuro: { color: '#BDBDC7' },
  cancelar: { backgroundColor: '#F2F2F5' },
  cancelarOscuro: { backgroundColor: '#2D2D2D' },
  cancelarDeshabilitado: { opacity: 0.55 },
  mensaje: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  mensajeOscuro: { color: '#FCA5A5' }
});

export default RapidoAsignacionPantalla;
