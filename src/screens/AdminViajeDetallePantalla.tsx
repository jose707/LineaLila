import React, { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import MapaRecorridoViaje from '../components/MapaRecorridoViaje';
import { usarAjustes } from '../context/AjustesContexto';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import api from '../services/api.cliente';
import type { ViajeRecorrido } from '../types/api';

type Participante = { name: string; phone: string | null };
type Importe = number | string | null;
type Detalle = ViajeRecorrido & {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  serviceArea: string | null;
  requestMode: string;
  vehicle_type_requested: string | null;
  passenger: Participante | null;
  driver: Participante | null;
  driverId: string | null;
  distance: number | null;
  duration: number | null;
  paymentMethod: string;
  baseFare: Importe;
  farePerKm: Importe;
  farePerMinute: Importe;
  totalFare: Importe;
  finalFare: Importe;
  payment: { amount: Importe; currency: string; payment_status: string; paid_at: string | null } | null;
  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  passengerReadyAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  waypoints: Array<{ sequence: number; address: string; arrived_at: string | null; departed_at: string | null }>;
};

const estados: Record<string, string> = {
  solicitado: 'Solicitado', ofertado: 'Con ofertas', aceptado: 'Aceptado', llegado: 'Conductor llegó',
  en_curso: 'En curso', completado: 'Completado', cancelado: 'Cancelado', vencido: 'Vencido'
};
const formatoFecha = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz'
});
const formatoImporte = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoDistancia = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 });
const fecha = (valor: string) => {
  const instante = new Date(valor);
  return Number.isFinite(instante.getTime()) ? formatoFecha.format(instante) : 'Sin registro';
};
const importe = (valor: Importe, moneda = 'BOB') => valor == null || !Number.isFinite(Number(valor))
  ? 'Sin registro' : (moneda === 'BOB' ? 'Bs' : moneda) + ' ' + formatoImporte.format(Number(valor));
const capitalizar = (valor: string) => valor.charAt(0).toUpperCase() + valor.slice(1);
const persona = (valor: Participante | null, alternativa: string) =>
  valor ? [valor.name || 'Sin nombre registrado', valor.phone].filter(Boolean).join('\n') : alternativa;

export default function AdminViajeDetallePantalla({ navigation, route }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminRideDetails'>) {
  const { rideId } = route.params;
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const [viaje, establecerViaje] = useState<Detalle | null>();
  const [intento, establecerIntento] = useState(0);
  const [seguimientoInterrumpido, establecerSeguimientoInterrumpido] = useState(false);
  const acento = oscuro ? '#D5A6FF' : '#7514C5';
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };

  useFocusEffect(useCallback(() => {
    const rutaDetalle = '/administracion/viajes/' + encodeURIComponent(rideId);
    let vigente = true;
    let espera: ReturnType<typeof setTimeout> | undefined;

    const actualizarRecorrido = async () => {
      if (AppState.currentState === 'active') {
        try {
          const recorrido = await api.obtener<ViajeRecorrido>(rutaDetalle + '/recorrido');
          if (!vigente) return;
          establecerViaje(actual => actual?.id === rideId ? { ...actual, ...recorrido } : actual);
          establecerSeguimientoInterrumpido(false);
          if (recorrido.status !== 'en_curso') {
            const detalleFinal = await api.obtener<Detalle>(rutaDetalle);
            if (vigente) establecerViaje(detalleFinal);
            return;
          }
        } catch (error) {
          if (!vigente) return;
          const codigo = (error as { status?: number } | null)?.status;
          if (codigo === 401 || codigo === 403 || codigo === 404) {
            establecerViaje(null);
            return;
          }
          establecerSeguimientoInterrumpido(true);
        }
      }
      if (vigente) espera = setTimeout(actualizarRecorrido, 3000);
    };

    establecerViaje(undefined);
    establecerSeguimientoInterrumpido(false);
    api.obtener<Detalle>(rutaDetalle)
      .then(datos => {
        if (!vigente) return;
        establecerViaje(datos);
        if (datos.status === 'en_curso') espera = setTimeout(actualizarRecorrido, 3000);
      })
      .catch(() => { if (vigente) establecerViaje(null); });
    return () => {
      vigente = false;
      if (espera !== undefined) clearTimeout(espera);
    };
  }, [rideId, intento]));

  const seccion = (titulo: string, filas: Array<[string, string]>) => (
    <View style={s.seccion}>
      <Text style={[s.tituloSeccion, texto]} accessibilityRole="header">{titulo}</Text>
      <View style={[s.tarjeta, oscuro && s.tarjetaOscura]}>
        {filas.map(([etiqueta, valor], indice) => (
          <View key={etiqueta} style={[s.fila, indice > 0 && s.separador, oscuro && s.bordeOscuro]}>
            <Text style={[s.etiqueta, secundario]}>{etiqueta}</Text>
            <Text style={[s.valor, texto]} selectable>{valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const mostrarViaje = (detalle: Detalle) => {
    const { status: estado, payment: pago } = detalle;
    const cronologia: Array<[string, string | null]> = [
      ['Solicitud', detalle.createdAt], ['Aceptación', detalle.acceptedAt], ['Llegada del conductor', detalle.arrivedAt],
      ['Pasajero listo', detalle.passengerReadyAt], ['Inicio del viaje', detalle.startedAt],
      ['Finalización', detalle.completedAt], ['Cancelación', detalle.cancelledAt]
    ];
    const colorEstado = estado === 'cancelado' ? (oscuro ? '#FCA5A5' : '#B91C1C') :
      estado === 'completado' ? (oscuro ? '#81DBAB' : '#167348') : acento;

    return (
      <>
        <View style={s.resumen}>
          <Text style={[s.estado, { color: colorEstado }]}>{estados[estado] ?? estado}</Text>
          <Text style={[s.etiqueta, secundario]}>{fecha(detalle.createdAt)}</Text>
        </View>
        <View style={s.seccion}>
          <Text style={[s.tituloSeccion, texto]} accessibilityRole="header">Recorrido del viaje</Text>
          {estado === 'en_curso' && (
            <Text style={[s.etiqueta, secundario]}>
              {seguimientoInterrumpido ? 'Reconectando al seguimiento…' : 'Seguimiento en vivo'}
            </Text>
          )}
          <MapaRecorridoViaje rutaRecorrida={detalle.rutaRecorrida} pickupLocation={detalle.pickupLocation}
            dropoffLocation={detalle.dropoffLocation} status={estado} oscuro={oscuro} seguimientoEnVivo={estado === 'en_curso'} />
        </View>
        {seccion('Trayecto', [
          ['Origen', detalle.pickup_address || 'Sin dirección'],
          ...detalle.waypoints.map((parada): [string, string] => [
            'Parada ' + parada.sequence,
            [parada.address || 'Sin dirección', parada.arrived_at && 'Llegada · ' + fecha(parada.arrived_at),
              parada.departed_at && 'Salida · ' + fecha(parada.departed_at)].filter(Boolean).join('\n')
          ]),
          ['Destino solicitado', detalle.dropoff_address || 'Sin dirección'],
          ['Distancia del viaje', detalle.distance == null ? 'Sin registro' : formatoDistancia.format(detalle.distance / 1000) + ' km'],
          ['Duración estimada', detalle.duration == null ? 'Sin registro' : Math.ceil(detalle.duration / 60) + ' min']
        ])}
        {seccion('Datos del viaje', [
          ['ID del viaje', detalle.id],
          ['Zona de operación', detalle.serviceArea ?? 'Sin zona registrada'],
          ['Modalidad', detalle.requestMode === 'asignacion_rapida' ? 'Asignación rápida' : capitalizar(detalle.requestMode)],
          ['Vehículo solicitado', detalle.vehicle_type_requested ? capitalizar(detalle.vehicle_type_requested) : 'Sin registro']
        ])}
        {seccion('Participantes', [
          ['Pasajero', persona(detalle.passenger, 'Sin datos del pasajero')],
          ['Conductor', persona(detalle.driver, detalle.driverId ? 'Sin datos del conductor' : 'Sin conductor asignado')]
        ])}
        {seccion('Tarifa y pago', [
          ['Tarifa base', importe(detalle.baseFare)],
          ['Tarifa por kilómetro', importe(detalle.farePerKm)],
          ['Tarifa por minuto', importe(detalle.farePerMinute)],
          ['Tarifa inicial', importe(detalle.totalFare)],
          ['Tarifa final', importe(detalle.finalFare)],
          ['Método de pago', detalle.paymentMethod === 'qr' ? 'QR' : capitalizar(detalle.paymentMethod)],
          ['Estado del pago', pago ? capitalizar(pago.payment_status) : 'Sin pago registrado'],
          ...(pago ? [['Importe registrado', importe(pago.amount, pago.currency)] as [string, string]] : []),
          ...(pago?.paid_at ? [['Fecha del pago', fecha(pago.paid_at)] as [string, string]] : [])
        ])}
        {seccion('Cronología', cronologia.flatMap(([etiqueta, instante]): Array<[string, string]> =>
          instante ? [[etiqueta, fecha(instante)]] : []))}
        {estado === 'cancelado' && seccion('Cancelación', [
          ['Cancelado por', detalle.cancelledBy ? capitalizar(detalle.cancelledBy) : 'Sin registro'],
          ['Motivo', detalle.cancellationReason || 'Sin motivo registrado']
        ])}
      </>
    );
  };

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <Pressable style={s.control} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar detalle del viaje">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </Pressable>
        <Text style={[s.titulo, texto]} accessibilityRole="header">Detalles del viaje</Text>
        <View style={s.control} />
      </View>
      {viaje === undefined || (viaje && viaje.id !== rideId) ? (
        <View style={s.centro}><ActivityIndicator size="large" color={acento} accessibilityLabel="Cargando detalles del viaje" /></View>
      ) : viaje === null ? (
        <View style={s.centro}>
          <Text style={[s.valor, texto]} accessibilityRole="alert">No se pudieron cargar los detalles del viaje.</Text>
          <Pressable style={s.reintentar} onPress={() => establecerIntento(anterior => anterior + 1)} accessibilityRole="button">
            <Text style={[s.estado, { color: acento }]}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
          {mostrarViaje(viaje)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
  resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  estado: { fontSize: 15, fontWeight: '700' },
  seccion: { gap: 8 },
  tituloSeccion: { fontSize: 17, fontWeight: '700' },
  tarjeta: { borderRadius: 16, borderWidth: 1, borderColor: '#EAEAF0', paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  tarjetaOscura: { borderColor: '#414141', backgroundColor: '#2D2D2D' },
  fila: { gap: 3, paddingVertical: 11 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  bordeOscuro: { borderTopColor: '#414141' },
  etiqueta: { fontSize: 13, fontWeight: '500' },
  valor: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  reintentar: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }
});
