import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import QuickReservationCard from '../components/QuickReservationCard';
import { QuickAssignmentResponse } from '../types/quickAssignment';
import { ridesService } from '../services/rides.service';
import socketService from '../services/socket.service';

export default function QuickAssignmentScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'QuickAssignment'>) {
  const rideId = route.params.rideId;
  const request = route.params.request;
  const returnRoute = useMemo(() => request ? {
    pickupLocation: request.pickupLocation,
    pickupAddress: request.pickupLocation.address,
    destinationLocation: request.dropoffLocation,
    destinationAddress: request.dropoffLocation.address,
    stops: [
      { location: request.pickupLocation, address: request.pickupLocation.address },
      ...(request.waypoints ?? []).map(stop => ({ location: stop, address: stop.address })),
      { location: request.dropoffLocation, address: request.dropoffLocation.address },
    ],
  } : {}, [request]);
  const [snapshot, setSnapshot] = useState<QuickAssignmentResponse | null>(
    route.params.initialSnapshot ?? null,
  );
  const [offset, setOffset] = useState(() => route.params.initialSnapshot
    ? Date.parse(route.params.initialSnapshot.serverTime) - Date.now()
    : 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const leaving = useRef(false);
  const pending = useRef(false);
  const revision = useRef(0);
  const refreshing = useRef(false);
  const apply = useCallback(
    (data: QuickAssignmentResponse) => {
      setSnapshot(data);
      setOffset(Date.parse(data.serverTime) - Date.now());
      if (
        data.ride &&
        ['accepted', 'arrived', 'in_progress'].includes(data.ride.status) &&
        !leaving.current
      ) {
        leaving.current = true;
        navigation.replace('ActiveRide', { rideId: data.ride.id });
      }
    },
    [navigation],
  );

  useEffect(() => {
    if (route.params.initialSnapshot) apply(route.params.initialSnapshot);
  }, [apply, route.params.initialSnapshot]);

  const refresh = useCallback(async () => {
    if (!rideId || refreshing.current || pending.current) return;
    refreshing.current = true;
    const version = ++revision.current;
    try {
      const data = await ridesService.getQuick(rideId);
      if (version === revision.current && !pending.current) apply(data);
    } catch {
      setMessage(
        'No se pudo verificar la reserva. Comprueba tu conexión; el servidor mantiene el plazo original.',
      );
    } finally {
      refreshing.current = false;
    }
  }, [apply, rideId]);

  useEffect(() => {
    const invalidateRequests = () => {
      revision.current++;
    };
    refresh();
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!pending.current) refresh();
    }, 1000);
    const event = (data: { rideId: string }) => {
      if (data.rideId === rideId) refresh();
    };
    socketService.on('ride:assignment', event);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      invalidateRequests();
      subscription.remove();
      socketService.off('ride:assignment', event);
    };
  }, [refresh, rideId]);

  const finish = async (confirm: boolean) => {
    if (!rideId || pending.current) return;
    pending.current = true;
    revision.current++;
    setBusy(true);
    setMessage('');
    try {
      const data = await (confirm
        ? ridesService.confirmQuick(rideId)
        : ridesService.cancelQuick(rideId));
      apply(data);
      if (!confirm && !leaving.current) {
        leaving.current = true;
        navigation.navigate('Map', { ...returnRoute, quickAssignmentCancelled: true });
      }
    } catch (error: any) {
      setMessage(
        error?.data?.error ??
          'No se pudo confirmar el resultado. Estamos verificando la reserva.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
      if (!leaving.current) refresh();
    }
  };
  const ride = snapshot?.ride;
  const isExpiredByTime =
    ride?.status === 'requested' &&
    Date.parse(ride.expiresAt) <= now + offset;
  const terminal =
    (ride && ['expired', 'cancelled', 'completed'].includes(ride.status)) ||
    Boolean(isExpiredByTime);

  useEffect(() => {
    if (terminal && !leaving.current) {
      leaving.current = true;
      navigation.navigate('Map', { ...returnRoute, quickAssignmentExpired: true });
    }
  }, [terminal, navigation, returnRoute]);

  const canConfirm =
    ride?.status === 'requested' &&
    Date.parse(ride.expiresAt) > now + offset &&
    !busy;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, !ride && styles.loadingContent]}>
        {!ride ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#7514C5" />
            <Text style={styles.loadingText}>Recuperando reserva…</Text>
          </View>
        ) : terminal ? null : (
          <>
            <View style={styles.success}>
              <View style={styles.successIcon}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
              <View style={styles.successCopy}>
                <Text style={styles.eyebrowLeft}>ASIGNACIÓN RÁPIDA</Text>
                <Text style={styles.successTitle}>Viaje asignado</Text>
                <Text style={styles.caption}>
                  Encontramos un conductor para ti.
                </Text>
              </View>
            </View>
            <QuickReservationCard ride={ride} serverOffset={offset} />
          </>
        )}
        {!!message && (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        )}
      </ScrollView>
      {!!ride && !terminal && (
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!canConfirm}
            style={[styles.button, !canConfirm && styles.disabled]}
            onPress={() => finish(true)}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Verificando…' : `Confirmar por Bs ${Number(ride.finalFare).toFixed(2)}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            style={styles.cancel}
            onPress={() => finish(false)}
          >
            <Text style={styles.cancelText}>Cancelar reserva</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#453950', fontSize: 16 },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  successIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EEE2FA',
    alignItems: 'center', justifyContent: 'center',
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
    backgroundColor: '#FFFFFF',
  },
  loadingContent: { justifyContent: 'center' },
  button: {
    borderRadius: 16,
    backgroundColor: '#7514C5',
    padding: 18,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  actions: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0EBF4',
  },
  cancel: { alignItems: 'center', padding: 12 },
  cancelText: { color: '#7514C5', fontSize: 17, fontWeight: '700' },
  caption: { color: '#685C72', fontSize: 13, lineHeight: 20 },
  message: { color: '#A12943', fontSize: 14, lineHeight: 20 },
});
