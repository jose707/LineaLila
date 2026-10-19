import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QuickAssignmentRide } from '../types/quickAssignment';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from './MapLocationIcons';
import { Check } from 'lucide-react-native';

export default function QuickReservationCard({ ride, serverOffset = 0, driver = false }: {
  ride: QuickAssignmentRide; serverOffset?: number; driver?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((Date.parse(ride.expiresAt) - now - serverOffset) / 1000));
  const countdown = `00:${String(seconds).padStart(2, '0')}`;
  const arrivalMinutes = Math.max(1, Math.ceil(ride.pickupDuration / 60));
  const pickupKilometres = (ride.pickupDistance / 1000).toFixed(1);

  if (driver) {
    return (
      <View style={styles.driverCard}>
        <View style={styles.driverHero}>
          <View style={styles.driverHeroIcon}><Check size={34} color="#7514C5" strokeWidth={3} /></View>
          <Text style={styles.driverTitle}>Se te ha asignado un viaje</Text>
          <Text style={styles.driverSubtitle}>Esperando confirmación del pasajero</Text>
        </View>
        <View style={styles.driverCountdown}>
          <View style={styles.driverCountdownCopy}>
            <Text style={styles.driverTimerLabel}>CONFIRMACIÓN PENDIENTE</Text>
            <Text style={styles.driverTimerHint}>El pasajero tiene este tiempo para confirmar</Text>
          </View>
          <Text style={styles.driverTimer}>{countdown}</Text>
        </View>
        <View style={styles.driverTripCard}>
          <View style={styles.driverArrival}>
            <Text style={styles.driverArrivalValue}>{arrivalMinutes} min</Text>
            <Text style={styles.driverArrivalText}>hasta la recogida · {pickupKilometres} km</Text>
          </View>
          <View style={styles.driverRoutePoint}>
            <PassengerMapIcon size={28} bare />
            <View style={styles.driverRouteCopy}>
              <Text style={styles.driverRouteAddress} numberOfLines={2}>{ride.pickup_address}</Text>
            </View>
          </View>
          <View style={styles.driverRouteDivider} />
          {(ride.stops ?? []).map(stop => (
            <React.Fragment key={stop.sequence}>
              <View style={styles.driverRoutePoint}>
                <WaypointMapIcon number={stop.sequence} size={28} />
                <View style={styles.driverRouteCopy}>
                  <Text style={styles.driverRouteAddress} numberOfLines={2}>{stop.address}</Text>
                </View>
              </View>
              <View style={styles.driverRouteDivider} />
            </React.Fragment>
          ))}
          <View style={styles.driverRoutePoint}>
            <DestinationFlagIcon size={28} bare />
            <View style={styles.driverRouteCopy}>
              <Text style={styles.driverRouteAddress} numberOfLines={2}>{ride.dropoff_address}</Text>
            </View>
          </View>
        </View>
        <View style={styles.driverFareRow}>
          <Text style={styles.driverFareLabel}>Tarifa del viaje</Text>
          <Text style={styles.driverFareValue}>Bs {Number(ride.finalFare).toFixed(2)}</Text>
        </View>
        <View style={styles.driverNoticeBox}>
          <Text style={styles.driverNotice}>
            Espera la confirmación antes de ir a recoger al pasajero. Durante esta reserva no recibirás otros viajes.
          </Text>
        </View>
      </View>
    );
  }

  const points = [
    { address: ride.pickup_address },
    ...(ride.stops ?? []).map(stop => ({ address: stop.address })),
    { address: ride.dropoff_address },
  ];

  return (
    <View style={styles.passengerContent}>
      <View style={styles.timerCard}>
        <View style={styles.timerCopy}>
          <Text style={styles.timerLabel}>TIEMPO PARA CONFIRMAR</Text>
          <Text style={styles.timerHint}>Tu conductor está reservado mientras decides</Text>
        </View>
        <Text style={styles.timer}>{countdown}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.driverHeader}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{ride.driverName?.charAt(0).toUpperCase() || '✓'}</Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.driverLabel}>TU CONDUCTOR</Text>
            <Text style={styles.name}>{ride.driverName || 'Conductor asignado'}</Text>
            <Text style={styles.verified}>✓ Verificado</Text>
          </View>
        </View>
        <View style={styles.arrival}>
          <Text style={styles.arrivalValue}>{arrivalMinutes} min</Text>
          <Text style={styles.arrivalCopy}>para llegar · a {pickupKilometres} km de ti</Text>
        </View>
        {!!ride.vehicle && (
          <View style={styles.vehicle}>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleLabel}>VEHÍCULO</Text>
              <Text style={styles.vehicleName}>{ride.vehicle.brand} {ride.vehicle.model}</Text>
              {!!ride.vehicle.color && <Text style={styles.muted}>{ride.vehicle.color}</Text>}
            </View>
            <View style={styles.plateBadge}><Text style={styles.plate}>{ride.vehicle.plate}</Text></View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tu recorrido</Text>
        <View style={styles.route}>
          {points.map((point, index) => (
            <View key={`${point.address}-${index}`} style={styles.routePoint}>
              <View style={styles.routeMarkerColumn}>
                {index === 0 ? (
                  <PassengerMapIcon size={28} bare />
                ) : index === points.length - 1 ? (
                  <DestinationFlagIcon size={28} bare />
                ) : (
                  <WaypointMapIcon number={index} size={28} />
                )}
                {index < points.length - 1 && <View style={styles.routeLine} />}
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.address}>{point.address}</Text>
              </View>
            </View>
          ))}
        </View>
        {ride.distance != null && ride.duration != null && (
          <Text style={styles.tripSummary}>
            {(ride.distance / 1000).toFixed(1)} km · {Math.ceil(ride.duration / 60)} min de viaje aprox.
          </Text>
        )}
      </View>

      <View style={styles.fareCard}>
        <View style={styles.fareTop}>
          <View>
            <Text style={styles.fareLabel}>TOTAL DEL VIAJE</Text>
            <Text style={styles.fareValue}>Bs {Number(ride.finalFare).toFixed(2)}</Text>
          </View>
          {!!ride.paymentMethod && (
            <Text style={styles.payment}>{ride.paymentMethod === 'qr' ? 'Pago con QR' : 'Efectivo'}</Text>
          )}
        </View>
        {Number(ride.finalFare) !== Number(ride.totalFare) && (
          <Text style={styles.fareDetail}>
            Tarifa Bs {Number(ride.totalFare).toFixed(2)} · Recogida Bs {Number(ride.pickupSurcharge).toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  driverNotice: { fontSize: 12, color: '#685C72', lineHeight: 18, textAlign: 'center' },
});
