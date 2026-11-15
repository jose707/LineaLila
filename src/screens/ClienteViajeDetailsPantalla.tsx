import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Car, Check, CircleX, TriangleAlert, UserRound, X } from 'lucide-react-native';
import MapaRecorridoViaje from '../components/MapaRecorridoViaje';
import { DestinoIndicadorIcono, PasajeroMapaIcono, ParadaMapaIcono } from '../components/MapUbicacionIcons';
import { usarAjustes } from '../context/AjustesContexto';
import { usarAutenticacion } from '../hooks/usarAutenticacion';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { viajesServicio } from '../services/viajes.servicio';
import type { ViajeDetalleHistorial } from '../types/api';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

const violeta = '#7514C5';
const formatoFecha = new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/La_Paz' });
const formatoTarifa = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const estadosCancelacion = {
  conductor: 'Cancelado por el conductor',
  pasajero: 'Cancelado por el pasajero',
  sistema: 'Cancelado por el sistema'
};

const ClienteViajeDetallesPantalla = () => {
  const navegacion = useNavigation();
  const { params: { rideId: viajeId } } = useRoute<RouteProp<RaizPilaParametroLista, 'ClientRideDetails'>>();
  const { user: usuario } = usarAutenticacion();
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const [viaje, establecerViaje] = useState<ViajeDetalleHistorial | null>(null);
  const [cargando, establecerCargando] = useState(true);
  const [intento, establecerIntento] = useState(0);
  const [fotoFallida, establecerFotoFallida] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    establecerCargando(true);
    establecerViaje(null);
    establecerFotoFallida(null);
    viajesServicio.obtenerDetalleHistorial(viajeId)
      .then(datos => { if (vigente) establecerViaje(datos); })
      .catch(() => { if (vigente) establecerViaje(null); })
      .finally(() => { if (vigente) establecerCargando(false); });
    return () => { vigente = false; };
  }, [viajeId, intento]);

  const esPasajero = viaje?.passengerId === usuario?.id;
  const otraPersona = esPasajero
    ? viaje?.driver?.User?.name || (viaje?.driverId ? 'Conductor' : 'Sin conductor asignado')
    : viaje?.passenger?.name || 'Pasajero';
  const tarifa = viaje?.finalFare ?? viaje?.fare;
  const distancia = viaje?.distance;
  const instante = new Date(viaje?.createdAt ?? '');
  const fecha = Number.isFinite(instante.getTime()) ? formatoFecha.format(instante) : '';
  const paradas = [...(viaje?.waypoints ?? [])].sort((a, b) => a.sequence - b.sequence);
  const cancelado = viaje?.status === 'cancelado';
  const estadoCancelado = viaje?.cancelledBy ? estadosCancelacion[viaje.cancelledBy] : undefined;
  const acento = oscuro ? '#D5A6FF' : violeta;
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };
  const rojo = oscuro ? '#FCA5A5' : '#B91C1C';
  const verde = oscuro ? '#81DBAB' : '#167348';
  const colorEstado = cancelado ? rojo : verde;
  const IconoEstado = cancelado ? CircleX : Check;
  const IconoParticipante = esPasajero ? Car : UserRound;
  const fotoConductor = esPasajero ? viaje?.driver?.User?.profilePhoto?.trim() : undefined;
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];
  const divisor = [s.divisor, oscuro && s.divisorOscuro];
  const tieneTarifa = tarifa != null && Number.isFinite(Number(tarifa));
  const tieneDistancia = distancia != null && Number.isFinite(distancia);

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <TouchableOpacity style={s.control} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar detalles del viaje">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text style={[s.titulo, texto]} accessibilityRole="header">Detalles del viaje</Text>
        <View style={s.control} />
      </View>
      {cargando || (viaje && viaje.id !== viajeId) ? (
        <View style={s.centro}>
          <ActivityIndicator size="large" color={acento} accessibilityLabel="Cargando viaje" />
        </View>
      ) : !viaje ? (
        <View style={s.centro}>
          <TriangleAlert size={32} color={rojo} strokeWidth={2.5} />
          <Text style={[s.subtitulo, texto]} accessibilityRole="alert">No se pudieron cargar los detalles.</Text>
          <TouchableOpacity style={s.reintentar} onPress={() => establecerIntento(anterior => anterior + 1)} accessibilityRole="button">
            <Text style={[s.valor, { color: acento }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
          <View style={s.resumen}>
            <IconoEstado size={23} color={colorEstado} strokeWidth={2.6} />
            <View style={s.datos}>
              <Text style={[s.estado, { color: colorEstado }]}>{cancelado ? (estadoCancelado ?? 'Cancelado') : 'Completado'}</Text>
              {!!fecha && <Text style={[s.secundario, secundario]}>{fecha}</Text>}
            </View>
          </View>
          <View style={s.seccion}>
            <Text style={[s.subtitulo, texto]} accessibilityRole="header">Recorrido del viaje</Text>
            <MapaRecorridoViaje rutaRecorrida={viaje.rutaRecorrida} pickupLocation={viaje.pickupLocation}
              dropoffLocation={viaje.dropoffLocation} status={viaje.status} oscuro={oscuro} />
          </View>
          <View style={tarjeta}>
            <View style={s.fila}>
              <PasajeroMapaIcono size={26} bare color={texto.color} />
              <View style={s.datos}>
                <Text style={[s.secundario, secundario]}>Origen</Text>
                <Text style={[s.valor, texto]}>{viaje.pickupLocation.address || 'Sin dirección'}</Text>
              </View>
            </View>
            {paradas.map((parada, indice) => (
              <View style={[s.fila, divisor]} key={parada.id}>
                <View style={s.iconoParada}><ParadaMapaIcono size={22} number={indice + 1} /></View>
                <View style={s.datos}>
                  <Text style={[s.secundario, secundario]}>{'Parada ' + (indice + 1)}</Text>
                  <Text style={[s.valor, texto]}>{parada.address || 'Sin dirección'}</Text>
                </View>
              </View>
            ))}
            <View style={[s.fila, divisor]}>
              <DestinoIndicadorIcono size={26} bare color={texto.color} />
              <View style={s.datos}>
                <Text style={[s.secundario, secundario]}>Destino solicitado</Text>
                <Text style={[s.valor, texto]}>{viaje.dropoffLocation.address || 'Sin dirección'}</Text>
              </View>
            </View>
          </View>
          <View style={tarjeta}>
            <View style={s.fila}>
              {fotoConductor && fotoConductor !== fotoFallida ? (
                <Image source={privadoImagenOrigen(fotoConductor)} style={s.foto}
                  accessibilityLabel="Foto del conductor" onError={() => establecerFotoFallida(fotoConductor)} />
              ) : <IconoParticipante size={26} color={acento} strokeWidth={2.5} />}
              <View style={s.datos}>
                <Text style={[s.secundario, secundario]}>{esPasajero ? 'Conductor' : 'Pasajero'}</Text>
                <Text style={[s.valor, texto]}>{otraPersona}</Text>
                {!!viaje.driver?.vehiclePlate && <Text style={[s.secundario, secundario]}>
                  {[viaje.driver.vehicleModel, viaje.driver.vehiclePlate].filter(Boolean).join(' · ')}
                </Text>}
              </View>
            </View>
            {(tieneDistancia || tieneTarifa) && (
              <View style={[s.fila, divisor]}>
                {tieneDistancia && <View style={s.datos}>
                  <Text style={[s.secundario, secundario]}>Distancia</Text>
                  <Text style={[s.valor, texto]}>{(Number(distancia) / 1000).toFixed(1)} km</Text>
                </View>}
                {tieneTarifa && <View style={s.datos}>
                  <Text style={[s.secundario, secundario]}>Tarifa</Text>
                  <Text style={[s.valor, texto]}>Bs {formatoTarifa.format(Number(tarifa))}</Text>
                </View>}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 16 },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  estado: { fontSize: 15, fontWeight: '700' },
  seccion: { gap: 8 },
  subtitulo: { fontSize: 17, fontWeight: '700' },
  secundario: { fontSize: 13, lineHeight: 18 },
  valor: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  tarjeta: { paddingHorizontal: 14, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, backgroundColor: '#FFFFFF' },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  divisorOscuro: { borderTopColor: '#4A4A4A' },
  iconoParada: { width: 26, alignItems: 'center' },
  foto: { width: 46, height: 46, borderRadius: 23 },
  datos: { flex: 1, gap: 3 },
  reintentar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 }
});

export default ClienteViajeDetallesPantalla;
