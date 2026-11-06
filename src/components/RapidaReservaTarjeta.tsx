import React from 'react';
import { View as Vista, Text as Texto, StyleSheet as EstiloHoja } from 'react-native';
import { RapidaAsignacionViaje as RapidoAsignacionViaje } from "../types/rapidaAsignacion";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "./MapUbicacionIcons";
import { Check as Comprobar } from 'lucide-react-native';

function RapidoReservaTarjeta({ ride: viaje, segundosRestantes, driver: conductor = false
}: {ride: RapidoAsignacionViaje;segundosRestantes: number | null;driver?: boolean;}) {
  const cuentaRegresiva = segundosRestantes === null ? '—' :
    `${String(Math.floor(segundosRestantes / 60)).padStart(2, '0')}:${String(segundosRestantes % 60).padStart(2, '0')}`;
  const arrivalMinutos = Math.max(1, Math.ceil(viaje.pickupDuration / 60));
  const recogidaKilometres = (viaje.pickupDistance / 1000).toFixed(1);

  if (conductor) {
    return (
      <Vista style={estilos.driverCard}>
        <Vista style={estilos.driverHero}>
          <Vista style={estilos.driverHeroIcon}><Comprobar size={34} color="#7514C5" strokeWidth={3} /></Vista>
          <Texto style={estilos.driverTitle}>Se te ha asignado un viaje</Texto>
          <Texto style={estilos.driverSubtitle}>Esperando confirmación del pasajero</Texto>
        </Vista>
        <Vista style={estilos.driverCountdown}>
          <Vista style={estilos.driverCountdownCopy}>
            <Texto style={estilos.driverTimerLabel}>CONFIRMACIÓN PENDIENTE</Texto>
            <Texto style={estilos.driverTimerHint}>El pasajero tiene este tiempo para confirmar</Texto>
          </Vista>
          <Texto style={estilos.driverTimer}>{cuentaRegresiva}</Texto>
        </Vista>
        <Vista style={estilos.driverTripCard}>
          <Vista style={estilos.driverArrival}>
            <Texto style={estilos.driverArrivalValue}>{arrivalMinutos} min</Texto>
            <Texto style={estilos.driverArrivalText}>hasta la recogida · {recogidaKilometres} km</Texto>
          </Vista>
          <Vista style={estilos.driverRoutePoint}>
            <PasajeroMapaIcono size={28} bare />
            <Vista style={estilos.driverRouteCopy}>
              <Texto style={estilos.driverRouteAddress} numberOfLines={2}>{viaje.pickup_address}</Texto>
            </Vista>
          </Vista>
          <Vista style={estilos.driverRouteDivider} />
          {(viaje.stops ?? []).map((parada) =>
          <React.Fragment key={parada.sequence}>
              <Vista style={estilos.driverRoutePoint}>
                <ParadaMapaIcon number={parada.sequence} size={28} />
                <Vista style={estilos.driverRouteCopy}>
                  <Texto style={estilos.driverRouteAddress} numberOfLines={2}>{parada.address}</Texto>
                </Vista>
              </Vista>
              <Vista style={estilos.driverRouteDivider} />
            </React.Fragment>
          )}
          <Vista style={estilos.driverRoutePoint}>
            <DestinoIndicadorIcon size={28} bare />
            <Vista style={estilos.driverRouteCopy}>
              <Texto style={estilos.driverRouteAddress} numberOfLines={2}>{viaje.dropoff_address}</Texto>
            </Vista>
          </Vista>
        </Vista>
        <Vista style={estilos.driverFareRow}>
          <Texto style={estilos.driverFareLabel}>Tarifa del viaje</Texto>
          <Texto style={estilos.driverFareValue}>Bs {Number(viaje.finalFare).toFixed(2)}</Texto>
        </Vista>
        <Vista style={estilos.driverNoticeBox}>
          <Texto style={estilos.driverNotice}>
            Espera la confirmación antes de ir a recoger al pasajero. Durante esta reserva no recibirás otros viajes.
          </Texto>
        </Vista>
      </Vista>);

  }

  const puntos = [
  { address: viaje.pickup_address },
  ...(viaje.stops ?? []).map((parada) => ({ address: parada.address })),
  { address: viaje.dropoff_address }];


  return (
    <Vista style={estilos.passengerContent}>
      <Vista style={estilos.timerCard}>
        <Vista style={estilos.timerCopy}>
          <Texto style={estilos.timerLabel}>TIEMPO PARA CONFIRMAR</Texto>
          <Texto style={estilos.timerHint}>Tu conductor está reservado mientras decides</Texto>
        </Vista>
        <Texto style={estilos.timer}>{cuentaRegresiva}</Texto>
      </Vista>

      <Vista style={estilos.card}>
        <Vista style={estilos.driverHeader}>
          <Vista style={estilos.avatar}>
            <Texto style={estilos.initial}>{viaje.driverName?.charAt(0).toUpperCase() || '✓'}</Texto>
          </Vista>
          <Vista style={estilos.details}>
            <Texto style={estilos.driverLabel}>TU CONDUCTOR</Texto>
            <Texto style={estilos.name}>{viaje.driverName || 'Conductor asignado'}</Texto>
            <Texto style={estilos.verified}>✓ Verificado</Texto>
          </Vista>
        </Vista>
        <Vista style={estilos.arrival}>
          <Texto style={estilos.arrivalValue}>{arrivalMinutos} min</Texto>
          <Texto style={estilos.arrivalCopy}>para llegar · a {recogidaKilometres} km de ti</Texto>
        </Vista>
        {!!viaje.vehicle &&
        <Vista style={estilos.vehicle}>
            <Vista style={estilos.vehicleDetails}>
              <Texto style={estilos.vehicleLabel}>VEHÍCULO</Texto>
              <Texto style={estilos.vehicleName}>{viaje.vehicle.brand} {viaje.vehicle.model}</Texto>
              {!!viaje.vehicle.color && <Texto style={estilos.muted}>{viaje.vehicle.color}</Texto>}
            </Vista>
            <Vista style={estilos.plateBadge}><Texto style={estilos.plate}>{viaje.vehicle.plate}</Texto></Vista>
          </Vista>
        }
      </Vista>

      <Vista style={estilos.card}>
        <Texto style={estilos.sectionTitle}>Tu recorrido</Texto>
        <Vista style={estilos.route}>
          {puntos.map((punto, indice) =>
          <Vista key={`${punto.address}-${indice}`} style={estilos.routePoint}>
              <Vista style={estilos.routeMarkerColumn}>
                {indice === 0 ?
              <PasajeroMapaIcono size={28} bare /> :
              indice === puntos.length - 1 ?
              <DestinoIndicadorIcon size={28} bare /> :

              <ParadaMapaIcon number={indice} size={28} />
              }
                {indice < puntos.length - 1 && <Vista style={estilos.routeLine} />}
              </Vista>
              <Vista style={estilos.routeDetails}>
                <Texto style={estilos.address}>{punto.address}</Texto>
              </Vista>
            </Vista>
          )}
        </Vista>
        {viaje.distance != null && viaje.duration != null &&
        <Texto style={estilos.tripSummary}>
            {(viaje.distance / 1000).toFixed(1)} km · {Math.ceil(viaje.duration / 60)} min de viaje aprox.
          </Texto>
        }
      </Vista>

      <Vista style={estilos.fareCard}>
        <Vista style={estilos.fareTop}>
          <Vista>
            <Texto style={estilos.fareLabel}>TOTAL DEL VIAJE</Texto>
            <Texto style={estilos.fareValue}>Bs {Number(viaje.finalFare).toFixed(2)}</Texto>
          </Vista>
          {!!viaje.paymentMethod &&
          <Texto style={estilos.payment}>{viaje.paymentMethod === 'qr' ? 'Pago con QR' : 'Efectivo'}</Texto>
          }
        </Vista>
        {Number(viaje.finalFare) !== Number(viaje.totalFare) &&
        <Texto style={estilos.fareDetail}>
            Tarifa Bs {Number(viaje.totalFare).toFixed(2)} · Recogida Bs {Number(viaje.pickupSurcharge).toFixed(2)}
          </Texto>
        }
      </Vista>
    </Vista>);

}export { RapidoReservaTarjeta as default };

const estilos = EstiloHoja.create({
  passengerContent: { gap: 12 },
  timerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3EAFC', borderRadius: 20, padding: 18 },
  timerCopy: { flex: 1, gap: 5 },
  timerLabel: { color: '#7514C5', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  timerHint: { color: '#584B64', fontSize: 13, lineHeight: 18 },
  timer: { color: '#7514C5', fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 16, borderWidth: 1, borderColor: '#ECE8F0' },
  driverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEE2FA', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#7514C5', fontSize: 24, fontWeight: '800' },
  details: { flex: 1, gap: 2 },
  driverLabel: { color: '#8D8098', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  name: { color: '#21142B', fontSize: 21, fontWeight: '800' },
  verified: { color: '#7514C5', fontSize: 13, fontWeight: '600' },
  arrival: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0EBF4' },
  arrivalValue: { color: '#21142B', fontSize: 24, fontWeight: '800' },
  arrivalCopy: { color: '#685C72', fontSize: 13 },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F7F4FA', borderRadius: 14, padding: 12 },
  vehicleDetails: { flex: 1, gap: 2 },
  vehicleLabel: { color: '#8D8098', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  vehicleName: { color: '#21142B', fontSize: 16, fontWeight: '700' },
  muted: { color: '#685C72', fontSize: 12 },
  plateBadge: { backgroundColor: '#FFFFFF', borderColor: '#E4DCEA', borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  plate: { color: '#21142B', fontSize: 13, fontWeight: '800' },
  sectionTitle: { color: '#21142B', fontSize: 18, fontWeight: '800' },
  route: { gap: 0 },
  routePoint: { flexDirection: 'row', gap: 12 },
  routeMarkerColumn: { alignItems: 'center', width: 28 },
  routeLine: { width: 2, flex: 1, minHeight: 32, backgroundColor: '#E8D9F4' },
  routeDetails: { flex: 1, paddingBottom: 14, gap: 3 },
  address: { color: '#21142B', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  tripSummary: { color: '#685C72', fontSize: 13 },
  fareCard: { backgroundColor: '#F8F5FB', borderRadius: 20, padding: 18, gap: 8 },
  fareTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  fareLabel: { color: '#685C72', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  fareValue: { color: '#21142B', fontSize: 30, fontWeight: '800', marginTop: 2 },
  payment: { color: '#7514C5', fontSize: 12, fontWeight: '700' },
  fareDetail: { color: '#685C72', fontSize: 12 },
  driverCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 14 },
  driverHero: { alignItems: 'center', gap: 5, paddingBottom: 4 },
  driverHeroIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F3EAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  driverTitle: { fontSize: 23, fontWeight: '800', color: '#21142B', textAlign: 'center' },
  driverSubtitle: { fontSize: 14, fontWeight: '600', color: '#685C72', textAlign: 'center' },
  driverCountdown: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F3EAFC', borderRadius: 16, padding: 14 },
  driverCountdownCopy: { flex: 1, gap: 4 },
  driverTimerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#7514C5' },
  driverTimerHint: { fontSize: 12, lineHeight: 17, color: '#685C72' },
  driverTimer: { fontSize: 27, fontWeight: '800', color: '#7514C5', fontVariant: ['tabular-nums'] },
  driverTripCard: { borderWidth: 1, borderColor: '#ECE8F0', borderRadius: 16, padding: 14, gap: 10 },
  driverArrival: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 5, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0EBF4' },
  driverArrivalValue: { fontSize: 22, fontWeight: '800', color: '#21142B' },
  driverArrivalText: { fontSize: 12, color: '#685C72' },
  driverRoutePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverRouteCopy: { flex: 1, gap: 2 },
  driverRouteAddress: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#21142B' },
  driverRouteDivider: { width: 2, height: 10, marginLeft: 13, backgroundColor: '#E8D9F4' },
  driverFareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2 },
  driverFareLabel: { fontSize: 14, fontWeight: '600', color: '#685C72' },
  driverFareValue: { fontSize: 23, fontWeight: '800', color: '#000000' },
  driverNoticeBox: { backgroundColor: '#F8F5FB', borderRadius: 14, padding: 12 },
  driverNotice: { fontSize: 12, color: '#685C72', lineHeight: 18, textAlign: 'center' }
});
