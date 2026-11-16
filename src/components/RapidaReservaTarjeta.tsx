import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Info, Star, UserRound } from 'lucide-react-native';
import type { RapidaAsignacionViaje } from '../types/rapidaAsignacion';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';
import { DestinoIndicadorIcono, PasajeroMapaIcono, ParadaMapaIcono } from './MapUbicacionIcons';

function TemporizadorReserva({ segundosRestantes, oscuro = false, driver = false }: {
  segundosRestantes: number | null;
  oscuro?: boolean;
  driver?: boolean;
}) {
  const tinta = oscuro ? '#FFFFFF' : '#111118';
  const acento = oscuro ? '#D5A6FF' : '#7514C5';
  const reloj = segundosRestantes === null ? '—' :
    [Math.floor(segundosRestantes / 60), segundosRestantes % 60].map(valor => String(valor).padStart(2, '0')).join(':');

  return (
    <View style={[s.tarjeta, oscuro && s.tarjetaOscura, s.filaReloj]} accessible accessibilityLabel={`Tiempo para confirmar, ${reloj}`}>
      <Text style={[s.datos, s.etiqueta, { color: tinta }]}>Tiempo para confirmar</Text>
      <Text style={[s.reloj, driver && s.relojModal, { color: acento }]}>{reloj}</Text>
    </View>
  );
}

function RapidaReservaTarjeta({ ride, segundosRestantes, driver = false, oscuro = false }: {
  ride: RapidaAsignacionViaje;
  segundosRestantes: number | null;
  driver?: boolean;
  oscuro?: boolean;
}) {
  const tinta = oscuro ? '#FFFFFF' : '#111118';
  const acento = oscuro ? '#D5A6FF' : '#7514C5';
  const verde = oscuro ? '#81DBAB' : '#167348';
  const secundario = oscuro ? s.secundarioOscuro : s.secundario;
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];
  const divisor = [s.separador, oscuro && s.separadorOscuro];
  const minutosRecogida = Math.max(1, Math.ceil(ride.pickupDuration / 60));
  const distanciaRecogida = (ride.pickupDistance / 1000).toFixed(1);
  const tarifa = Number(ride.finalFare).toFixed(2);
  const nombre = driver ? (ride.passenger?.name || 'Pasajero') : (ride.driverName?.trim() || 'Conductor');
  const foto = driver ? ride.passenger?.photo : null;
  const calificacion = driver ? ride.passenger?.rating : ride.driverRating;
  const viajes = driver ? ride.passenger?.trips : ride.driverTrips;
  const identidadVerificada = !driver || ride.passenger?.verified === true;
  const puntos = [
    { address: ride.pickup_address, sequence: 0 },
    ...(ride.stops ?? []),
    { address: ride.dropoff_address, sequence: 0 }
  ];

  return (
    <View style={s.contenido}>
      <View style={s.cabecera}>
        <CheckCircle size={35} strokeWidth={2.4} color={acento} />
        <View style={s.datos}>
          <Text style={[s.titulo, driver && s.tituloModal, { color: tinta }]} accessibilityRole="header">Viaje asignado</Text>
          <Text style={secundario}>{driver ? 'El pasajero aún debe confirmar' : 'Tu conductor está reservado'}</Text>
        </View>
      </View>

      <TemporizadorReserva segundosRestantes={segundosRestantes} oscuro={oscuro} driver={driver} />

      <View style={tarjeta}>
        <View style={s.fila}>
          {foto ? <Image style={s.foto} source={privadoImagenOrigen(foto)} /> :
            <UserRound size={27} strokeWidth={2.4} color={acento} />}
          <View style={s.datos}>
            <Text style={[s.nombre, { color: tinta }]}>{nombre}</Text>
            {identidadVerificada && <View style={s.verificacion}>
              <CheckCircle size={15} color={verde} strokeWidth={2.5} />
              <Text style={[s.verificado, { color: verde }]}>Verificado</Text>
            </View>}
            {(calificacion != null || viajes != null) && (
              <View style={s.estadisticas}>
                {calificacion != null && (
                  <View style={s.calificacion} accessible accessibilityLabel={`Calificación ${calificacion.toFixed(1)} de 5`}>
                    <Star size={14} color={acento} fill={acento} />
                    <Text style={[s.etiqueta, { color: tinta }]}>{calificacion.toFixed(1)}</Text>
                  </View>
                )}
                {calificacion != null && viajes != null && <Text style={secundario}>·</Text>}
                {viajes != null && <Text style={secundario}>{viajes} {viajes === 1 ? 'viaje' : 'viajes'}</Text>}
              </View>
            )}
          </View>
        </View>
        {!driver && !!ride.vehicle && (
          <View style={[s.fila, divisor]}>
            <Text style={[s.datos, s.etiqueta, { color: tinta }]} numberOfLines={1}
              adjustsFontSizeToFit minimumFontScale={0.8}>
              {[ride.vehicle.brand, ride.vehicle.model].filter(Boolean).join(' ')}
              {!!ride.vehicle.color && <Text style={oscuro ? s.colorVehiculoOscuro : s.colorVehiculo}>{` · ${ride.vehicle.color}`}</Text>}
            </Text>
            {!!ride.vehicle.plate && (
              <Text style={[s.placa, oscuro && s.placaOscura, { color: tinta }]} numberOfLines={1}>
                {ride.vehicle.plate}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={tarjeta}>
        {puntos.map((punto, indice) => (
          <View key={indice} style={[s.fila, indice > 0 && divisor]}>
            <View style={s.iconoRuta}>
              {indice === 0 ? <PasajeroMapaIcono size={26} bare color={tinta} /> :
                indice === puntos.length - 1 ? <DestinoIndicadorIcono size={26} bare color={tinta} /> :
                  <ParadaMapaIcono number={punto.sequence || indice} size={28} />}
            </View>
            <View style={s.datos}>
              <Text style={[s.direccion, driver && s.direccionModal, { color: tinta }]}>{punto.address}</Text>
              {indice === 0 && (
                <Text style={secundario}>{minutosRecogida} min hasta la recogida · {distanciaRecogida} km</Text>
              )}
            </View>
          </View>
        ))}
        {!driver && ride.distance != null && ride.duration != null && (
          <Text style={[s.resumen, secundario, divisor]}>
            {(ride.distance / 1000).toFixed(1)} km · {Math.ceil(ride.duration / 60)} min de viaje aprox.
          </Text>
        )}
      </View>

      <View style={[tarjeta, s.tarifa]}>
        <View style={s.filaTarifa}>
          <View style={s.datos}>
            <Text style={secundario}>{driver ? 'Tarifa del viaje' : 'Total del viaje'}</Text>
            <Text style={[s.precio, driver && s.precioModal, { color: tinta }]}>Bs {tarifa}</Text>
          </View>
          {!driver && !!ride.paymentMethod && (
            <Text style={[s.metodo, { color: acento }]}>{ride.paymentMethod === 'qr' ? 'Pago con QR' : 'Efectivo'}</Text>
          )}
        </View>
        {!driver && Number(ride.finalFare) !== Number(ride.totalFare) && (
          <Text style={secundario}>
            Tarifa Bs {Number(ride.totalFare).toFixed(2)} · Recogida Bs {Number(ride.pickupSurcharge).toFixed(2)}
          </Text>
        )}
      </View>

      {driver && (
        <View style={s.aviso}>
          <Info size={21} color={acento} strokeWidth={2.4} />
          <Text style={[s.datos, secundario]}>
            Espera la confirmación antes de ir a la recogida. Durante la reserva no recibirás otros viajes.
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  contenido: { gap: 12 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 12 },
  datos: { flex: 1, minWidth: 0, gap: 3 },
  titulo: { fontSize: 24, fontWeight: '800' },
  tituloModal: { fontSize: 20, fontWeight: '700' },
  secundario: { fontSize: 14, lineHeight: 19, color: '#666675' },
  secundarioOscuro: { fontSize: 14, lineHeight: 19, color: '#BDBDC7' },
  tarjeta: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, paddingHorizontal: 14 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  filaReloj: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingVertical: 9, gap: 10 },
  etiqueta: { fontSize: 15, fontWeight: '700' },
  reloj: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  relojModal: { fontSize: 22, fontWeight: '700' },
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 10, gap: 11 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  separadorOscuro: { borderTopColor: '#414141' },
  nombre: { fontSize: 20, fontWeight: '700' },
  foto: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAEAF0' },
  verificacion: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verificado: { fontSize: 13, fontWeight: '600' },
  estadisticas: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  calificacion: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorVehiculo: { color: '#666675', fontSize: 14, fontWeight: '400' },
  colorVehiculoOscuro: { color: '#BDBDC7', fontSize: 14, fontWeight: '400' },
  placa: { fontSize: 14, fontWeight: '800', padding: 6, backgroundColor: '#F7F7F9', borderRadius: 8 },
  placaOscura: { backgroundColor: '#414141' },
  iconoRuta: { width: 28, alignItems: 'center' },
  direccion: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  direccionModal: { fontWeight: '500' },
  resumen: { paddingVertical: 10 },
  tarifa: { paddingVertical: 10, gap: 4 },
  filaTarifa: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  precio: { fontSize: 28, fontWeight: '800' },
  precioModal: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metodo: { maxWidth: '40%', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 2 }
});

export default RapidaReservaTarjeta;
