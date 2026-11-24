import React, { useCallback as usarFuncionRetorno, useEffect as usarEfecto, useMemo as usarMemoria, useRef as usarReferencia, useState as usarEstado } from 'react';
import {
  ActivityIndicator as ActividadIndicador,
  BackHandler,
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
import { RapidaAsignacionRespuesta as RapidoAsignacionRespuesta } from "../types/rapidaAsignacion";
import { viajesServicio } from "../services/viajes.servicio";
import socketServicio from "../services/socket.servicio";
import { iniciarAdaptativaSincronizacion } from '../utils/adaptativaSincronizar';
import { usarAjustes } from '../context/AjustesContexto';
import { CarFront } from 'lucide-react-native';
import { DestinoIndicadorIcono, PasajeroMapaIcono } from '../components/MapUbicacionIcons';

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

  const finalizar = async () => {
    if (!viajeId || pendiente.current) return;
    pendiente.current = true;
    revision.current++;
    establecerOcupado(true);
    establecerMensaje('');
    try {
      const datos = await viajesServicio.cancelarAsignacionRapida(viajeId);
      aplicar(datos);
      if (datos.ride?.status === 'cancelado' && !leaving.current) {
        leaving.current = true;
        navegacion.navigate('Map', { ...retornoRuta, quickAssignmentCancelled: true });
      }
    } catch (error: any) {
      establecerMensaje(
        error?.data?.error ??
        'No se pudo cancelar. Estamos verificando la solicitud.'
      );
    } finally {
      pendiente.current = false;
      establecerOcupado(false);
      if (!leaving.current) renovar();
    }
  };
  usarEnfoqueEfecto(usarFuncionRetorno(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!leaving.current) void finalizar();
      return true;
    });
    return () => suscripcion.remove();
  }, [viajeId, aplicar, retornoRuta, renovar]));

  const viaje = instantanea?.ride;
  const terminal =
  viaje && ['vencido', 'cancelado', 'completado'].includes(viaje.status);

  usarEfecto(() => {
    if (terminal && !leaving.current) {
      leaving.current = true;
      navegacion.navigate('Map', { ...retornoRuta, quickAssignmentNotice: viaje?.status === 'vencido' ? 'No encontramos un conductor disponible. Puedes volver a intentarlo.' : 'La solicitud se canceló.' });
    }
  }, [terminal, viaje?.status, navegacion, retornoRuta]);

  const texto = oscuro && estilos.textoClaro;

  return (
    <SeguraZonaVista style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
      <DesplazableVista contentContainerStyle={[estilos.contenido, !viaje && estilos.contenidoCargando]}
        showsVerticalScrollIndicator={false}>
        {!viaje ? (
          <Vista style={estilos.cargando} accessibilityLiveRegion="polite">
            <ActividadIndicador size="large" color={oscuro ? '#D5A6FF' : '#7514C5'} />
            <Texto style={[estilos.textoCargando, texto]}>Recuperando solicitud…</Texto>
          </Vista>
        ) : !terminal && (
          <Vista style={estilos.reserva}>
            <Vista style={estilos.busqueda}>
              <Vista style={[estilos.orbita, oscuro && estilos.orbitaOscura]}>
                <Vista style={[estilos.circulo, oscuro && estilos.circuloOscuro]}>
                  <CarFront size={46} strokeWidth={2.4} color={oscuro ? '#D5A6FF' : '#7514C5'} />
                </Vista>
                <Vista style={[estilos.actividad, oscuro && estilos.actividadOscura]}>
                  <ActividadIndicador size="small" color={oscuro ? '#D5A6FF' : '#7514C5'} />
                </Vista>
              </Vista>
              <Texto accessibilityRole="header" style={[estilos.titulo, texto]}>Buscando conductor</Texto>
            </Vista>
            <Vista style={[estilos.tarjeta, oscuro && estilos.tarjetaOscura]}>
              <Vista style={estilos.punto}>
                <Vista style={estilos.iconoRuta}><PasajeroMapaIcono size={25} bare color={oscuro ? '#FFFFFF' : '#111118'} /></Vista>
                <Vista style={estilos.datos}>
                  <Texto style={[estilos.etiqueta, oscuro && estilos.secundarioOscuro]}>Recogida</Texto>
                  <Texto style={[estilos.direccion, texto]}>{viaje.pickup_address}</Texto>
                </Vista>
              </Vista>
              <Vista style={[estilos.punto, estilos.destino, oscuro && estilos.divisorOscuro]}>
                <Vista style={estilos.iconoRuta}><DestinoIndicadorIcono size={25} bare color={oscuro ? '#FFFFFF' : '#111118'} /></Vista>
                <Vista style={estilos.datos}>
                  <Texto style={[estilos.etiqueta, oscuro && estilos.secundarioOscuro]}>Destino</Texto>
                  <Texto style={[estilos.direccion, texto]}>{viaje.dropoff_address}</Texto>
                </Vista>
              </Vista>
              <Vista style={[estilos.tarifa, oscuro && estilos.divisorOscuro]}>
                <Vista style={estilos.datos}>
                  <Texto style={[estilos.total, texto]}>Total del viaje</Texto>
                  {!!viaje.paymentMethod && <Texto style={[estilos.etiqueta, oscuro && estilos.secundarioOscuro]}>{viaje.paymentMethod === 'qr' ? 'Pago con QR' : 'Efectivo'}</Texto>}
                </Vista>
                <Texto style={[estilos.precio, texto]}>Bs {Number(viaje.finalFare).toFixed(2)}</Texto>
              </Vista>
            </Vista>
          </Vista>
        )}
        {!!mensaje && (
          <Texto accessibilityRole="alert" style={[estilos.mensaje, oscuro && estilos.mensajeOscuro]}>{mensaje}</Texto>
        )}
      </DesplazableVista>

      {!!viaje && !terminal && (
        <Vista style={[estilos.acciones, oscuro && estilos.accionesOscuras]}>
          <PulsableOpacidad accessibilityRole="button" disabled={ocupado} accessibilityState={{ disabled: ocupado }}
            activeOpacity={0.85} style={[estilos.boton, estilos.cancelar, oscuro && estilos.cancelarOscuro,
              ocupado && estilos.cancelarDeshabilitado]} onPress={finalizar}>
            <Texto style={[estilos.textoBoton, texto]}>Cancelar búsqueda</Texto>
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
  contenido: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 16 },
  contenidoCargando: { flexGrow: 1, justifyContent: 'center' },
  cargando: { alignItems: 'center', gap: 12 },
  textoCargando: { color: '#666675', fontSize: 16 },
  acciones: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 8 },
  accionesOscuras: { borderTopColor: '#414141' },
  boton: { minHeight: 54, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center' },
  textoBoton: { color: '#111118', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  cancelar: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0' },
  cancelarOscuro: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  cancelarDeshabilitado: { opacity: 0.55 },
  mensaje: { color: '#B91C1C', fontSize: 14, lineHeight: 20 },
  mensajeOscuro: { color: '#FCA5A5' },
  reserva: { flex: 1, justifyContent: 'center', gap: 20 },
  busqueda: { alignItems: 'center', paddingVertical: 12, gap: 12 },
  orbita: { width: 138, height: 138, borderRadius: 69, borderWidth: 1, borderColor: '#EFE3F9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  orbitaOscura: { borderColor: '#49315C' },
  circulo: { width: 106, height: 106, borderRadius: 53, backgroundColor: '#F5EDFC', alignItems: 'center', justifyContent: 'center' },
  circuloOscuro: { backgroundColor: '#34233F' },
  actividad: { position: 'absolute', right: 2, bottom: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  actividadOscura: { backgroundColor: '#1A1A1A' },
  titulo: { color: '#111118', fontSize: 26, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  secundarioOscuro: { color: '#BDBDC7' },
  tarjeta: { borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  tarjetaOscura: { backgroundColor: '#242424', borderColor: '#414141' },
  punto: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  iconoRuta: { width: 28, alignItems: 'center' },
  datos: { flex: 1, minWidth: 0, gap: 4 },
  etiqueta: { color: '#666675', fontSize: 13, lineHeight: 18 },
  direccion: { color: '#111118', fontSize: 16, lineHeight: 22, fontWeight: '600' },
  destino: { borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  divisorOscuro: { borderTopColor: '#414141' },
  tarifa: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: '#EAEAF0' },
  total: { color: '#111118', fontSize: 15, fontWeight: '600' },
  precio: { color: '#111118', fontSize: 26, fontWeight: '700', flexShrink: 1 }
});

export default RapidoAsignacionPantalla;
