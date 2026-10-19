import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock3, Handshake, Search } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ridesService } from '../services/rides.service';
import { StorageHelper } from '../services/storage';
import socketService from '../services/socket.service';
import { DriverOfferBubbles } from '../components/DriverOfferBubbles';
import ConfirmBottomSheet from '../components/ConfirmBottomSheet';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from '../components/MapLocationIcons';
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import { offerSecondsLeft } from '../utils/offerCountdown';

const CUSTOM_MAP_STYLE = [
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#DCDDE2' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#DCDDE2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#C0C0C0' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#E7E8ED' }] },
  { featureType: 'building', elementType: 'geometry', stylers: [{ color: '#E7E8ED' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bbdefb' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#E7E8ED' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F7F6F3' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#DCDDE2' }] },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Negotiation'>;
type RouteParams = RouteProp<RootStackParamList, 'Negotiation'>;

const fmtTimer = (sec: number) => {
  const roundedSec = Math.round(sec);
  return `${Math.floor(roundedSec / 60)}:${String(roundedSec % 60).padStart(2, '0')}`;
};

const PULSE_INTERVAL_MS = 1000;
const PULSE_DURATION_MS = 4000;
const ZOOM_DURATION_MS = 100000;
const START_DELTA = 0.006;
const END_DELTA = 0.06;
const PASSENGER_VERTICAL_OFFSET = 0.34;

const NegotiationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();

  const {
    rideId,
    expiresAt,
    pickupLocation,
    pickupAddress,
    destinationAddress,
    waypoints = [],
    fare,
    originalFare,
    distance,
    duration,
    selectedVehicleType,
    selectedPaymentMethod,
  } = route.params;

  const expiryTimeRef = useRef(
    expiresAt && Number.isFinite(Date.parse(expiresAt))
      ? Date.parse(expiresAt)
      : Date.now() + 120000,
  );
  const [nowMs, setNowMs] = useState(Date.now);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);
  const signalStartRef = useRef(0);
  const requestTimeLeft = Math.max(0, (expiryTimeRef.current - nowMs) / 1000);
  const [activeRideId] = useState<string>(rideId);
  const [driverOffers, setDriverOffers] = useState<any[]>([]);
  const [bottomSheetHeight, setBottomSheetHeight] = useState(328);
  const offerClockOffsetRef = useRef(0);
  const [showOffersOverlay, setShowOffersOverlay] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showExpiredOptions, setShowExpiredOptions] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [, setRenderTrigger] = useState(0);
  const visibleOffers = driverOffers.filter(offer =>
    offerSecondsLeft(offer.expiresAt, Date.now(), offer.serverOffsetMs) > 0,
  );

  const requestTimerRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const autoExpireCalledRef = useRef(false);
  const renderTriggerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasOpenedRideRef = useRef(false);

  const openConfirmedRide = useCallback(() => {
    // La respuesta HTTP y el socket pueden confirmar el mismo viaje.
    if (hasOpenedRideRef.current) return;
    hasOpenedRideRef.current = true;
    if (requestTimerRef.current !== null) {
      cancelAnimationFrame(requestTimerRef.current);
      requestTimerRef.current = null;
    }
    setShowOffersOverlay(false);
    setDriverOffers([]);
    StorageHelper.removeItem('activeRideState');
    navigation.replace('ActiveRide', {
      rideId: activeRideId,
      confirmationMessage: '¡Conductor asignado!',
    });
  }, [activeRideId, navigation]);

  const closeRegion = useMemo(() => ({
    latitude: pickupLocation.latitude - START_DELTA * PASSENGER_VERTICAL_OFFSET,
    longitude: pickupLocation.longitude,
    latitudeDelta: START_DELTA,
    longitudeDelta: START_DELTA,
  }), [pickupLocation.latitude, pickupLocation.longitude]);
  const wideRegion = useMemo(() => ({
    latitude: pickupLocation.latitude - END_DELTA * PASSENGER_VERTICAL_OFFSET,
    longitude: pickupLocation.longitude,
    latitudeDelta: END_DELTA,
    longitudeDelta: END_DELTA,
  }), [pickupLocation.latitude, pickupLocation.longitude]);

  useEffect(() => {
    if (!mapReady) return;
    const zoomStart = setTimeout(() => {
      mapRef.current?.animateToRegion(wideRegion, ZOOM_DURATION_MS);
    }, 350);
    return () => clearTimeout(zoomStart);
  }, [mapReady, wideRegion]);

  const handleAutoExpireRide = useCallback(async () => {
    await ridesService.cancelRide(activeRideId, 'Expirada', 'system').catch(() => { });
    if (requestTimerRef.current !== null) {
      cancelAnimationFrame(requestTimerRef.current);
      requestTimerRef.current = null;
    }
    StorageHelper.removeItem('activeRideState');
    setShowExpiredOptions(true);
  }, [activeRideId]);

  const nextFare = useMemo(
    () => Math.ceil((fare + Math.max(2, fare * 0.1)) * 2) / 2,
    [fare],
  );

  const retryWithHigherFare = async () => {
    setIsRetrying(true);
    setRetryError('');
    try {
      const ride = await ridesService.createRide({
        requestMode: 'negotiation',
        pickupLocation: { ...pickupLocation, address: pickupAddress },
        dropoffLocation: { ...route.params.destinationLocation, address: destinationAddress },
        waypoints,
        distance,
        duration,
        fare: nextFare,
        vehicleTypeRequested: selectedVehicleType,
        paymentMethod: selectedPaymentMethod,
      });
      socketService.joinRide(ride.id);
      socketService.notifyRideCreated(ride.id);
      setShowExpiredOptions(false);
      navigation.replace('Negotiation', {
        ...route.params,
        rideId: ride.id,
        expiresAt: (ride as any).expiresAt,
        fare: nextFare,
        originalFare: originalFare ?? fare,
      });
    } catch (error: any) {
      setRetryError(error?.data?.error || error?.message || 'No se pudo iniciar una nueva búsqueda.');
    } finally {
      setIsRetrying(false);
    }
  };

  const cancelExpiredRequest = () => {
    setShowExpiredOptions(false);
    StorageHelper.removeItem('activeRideState');
    navigation.goBack();
  };

  useEffect(() => {
    const tick = () => {
      const currentTime = Date.now();
      setNowMs(currentTime);
      if (currentTime >= expiryTimeRef.current) {
        requestTimerRef.current = null;
        if (!autoExpireCalledRef.current) {
          autoExpireCalledRef.current = true;
          handleAutoExpireRide();
        }
        return;
      }
      requestTimerRef.current = requestAnimationFrame(tick);
    };
    requestTimerRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestTimerRef.current !== null) {
        cancelAnimationFrame(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [handleAutoExpireRide]);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { offers, serverOffsetMs } = await ridesService.getCounterOffers(activeRideId);
        offerClockOffsetRef.current = serverOffsetMs;
        const valid = offers.filter((offer: any) =>
          !offer.rejected && offerSecondsLeft(offer.expiresAt, Date.now(), serverOffsetMs) > 0,
        );
        setDriverOffers(previous => {
          const merged = new Map(previous.map(offer => [offer.offerId, { ...offer, serverOffsetMs }]));
          valid.forEach((offer: any) => merged.set(offer.offerId, { ...offer, serverOffsetMs }));
          return Array.from(merged.values()).filter(offer =>
            offerSecondsLeft(offer.expiresAt, Date.now(), serverOffsetMs) > 0,
          );
        });
        if (valid.length > 0) {
          setShowOffersOverlay(true);
        }
      } catch { }
    };
    fetchOffers();

    const handleNewOffer = (data: any) => {
      if (!data?.offer || data.rideId !== activeRideId) return;
      const offer = data.offer;
      setDriverOffers(prev => {
        const exists = prev.some((o: any) => o.offerId === offer.offerId);
        if (exists) return prev;
        return [...prev, { ...offer, serverOffsetMs: offerClockOffsetRef.current }];
      });
      setShowOffersOverlay(true);
    };
    socketService.on('offer:new', handleNewOffer);

    return () => {
      socketService.off('offer:new', handleNewOffer);
    };
  }, [activeRideId]);

  useEffect(() => {
    const handleRideAccepted = (data: any) => {
      if (data?.rideId !== activeRideId) return;
      openConfirmedRide();
    };
    socketService.on('ride:accepted', handleRideAccepted);
    return () => {
      socketService.off('ride:accepted', handleRideAccepted);
    };
  }, [activeRideId, openConfirmedRide]);

  useEffect(() => {
    if (!showOffersOverlay) {
      if (renderTriggerRef.current) clearInterval(renderTriggerRef.current);
      return;
    }
    renderTriggerRef.current = setInterval(() => setRenderTrigger(p => p + 1), 1000);
    return () => {
      if (renderTriggerRef.current) clearInterval(renderTriggerRef.current);
    };
  }, [showOffersOverlay]);

  useEffect(() => {
    const onBackPress = () => {
      setShowCancelConfirm(true);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      socketService.leaveRide(activeRideId);
    };
  }, [activeRideId]);

  const handleCancelRide = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancelRide = async () => {
    setIsCancelling(true);
    await ridesService
      .cancelRide(activeRideId, 'Cancelado por pasajero', 'passenger')
      .catch(() => { });
    socketService.leaveRide(activeRideId);
    if (requestTimerRef.current !== null) {
      cancelAnimationFrame(requestTimerRef.current);
      requestTimerRef.current = null;
    }
    StorageHelper.removeItem('activeRideState');
    setShowCancelConfirm(false);
    setIsCancelling(false);
    navigation.goBack();
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      await ridesService.rejectCounterOffer(activeRideId, offerId);
      setDriverOffers(previous => previous.filter(offer => offer.offerId !== offerId));
    } catch (error: any) {
      Alert.alert('Error', error?.data?.error || 'No se pudo rechazar la oferta. Inténtalo de nuevo.');
    }
  };

  const handleAcceptOffer = async (offer: any) => {
    try {
      await ridesService.acceptCounterOffer(
        activeRideId,
        offer.offerId,
        offer.proposedPrice || offer.fare,
      );
      openConfirmedRide();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  };

  const signalElapsed = mapReady ? Math.max(0, nowMs - signalStartRef.current) : 0;
  const zoomProgress = Math.min(1, signalElapsed / ZOOM_DURATION_MS);
  const visibleMapSpan = START_DELTA + (END_DELTA - START_DELTA) * zoomProgress;
  const maxPulseRadius = visibleMapSpan * 111000 * 0.27;
  const latestPulse = Math.floor(signalElapsed / PULSE_INTERVAL_MS);
  const signalPulses = mapReady
    ? Array.from({ length: 4 }, (_, index) => latestPulse - index)
        .filter(pulseId => pulseId >= 0)
        .map(pulseId => {
          const age = signalElapsed - pulseId * PULSE_INTERVAL_MS;
          const progress = Math.min(1, age / PULSE_DURATION_MS);
          const easedProgress = progress * progress * (3 - 2 * progress);
          const opacity = Math.sin(Math.PI * progress);
          return {
            id: pulseId,
            radius: 8 + maxPulseRadius * easedProgress,
            strokeColor: `rgba(117,20,197,${(0.36 * opacity).toFixed(3)})`,
            fillColor: `rgba(117,20,197,${(0.055 * opacity).toFixed(3)})`,
          };
        })
    : [];

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <MapView
        ref={mapRef}
        style={[s.map, { bottom: insets.bottom }]}
        initialRegion={closeRegion}
        onMapReady={() => {
          signalStartRef.current = Date.now();
          setMapReady(true);
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        mapType="standard"
        customMapStyle={CUSTOM_MAP_STYLE}
        userInterfaceStyle="light"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {signalPulses.map(pulse => (
          <Circle
            key={pulse.id}
            center={pickupLocation}
            radius={pulse.radius}
            strokeColor={pulse.strokeColor}
            fillColor={pulse.fillColor}
            strokeWidth={2}
          />
        ))}
        <Marker coordinate={pickupLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View collapsable={false}>
            <PassengerMapIcon size={42} />
          </View>
        </Marker>
      </MapView>

      {showOffersOverlay && visibleOffers.length > 0 && (
        <View style={s.mapOverlay} />
      )}

      <View style={[s.negoHeader, showOffersOverlay && visibleOffers.length > 0 && s.negoHeaderRaised]}>
        <View style={s.negoHeaderIcon}>
          <Handshake size={24} color={T.accent} strokeWidth={2.8} />
        </View>
        <Text style={s.negoTitle}>Modo negociación</Text>
      </View>

      <DriverOfferBubbles
        offers={visibleOffers}
        onReject={handleRejectOffer}
        onAccept={handleAcceptOffer}
        bottomOffset={bottomSheetHeight + insets.bottom + 12}
      />

      <View
        style={[
          s.bottomSheet,
          { bottom: insets.bottom },
          showOffersOverlay && visibleOffers.length > 0 && s.bottomSheetDimmed,
        ]}
        onLayout={event => setBottomSheetHeight(event.nativeEvent.layout.height)}
      >
        <View style={s.sheetHandle} />
        <View style={s.searchRow}>
          <View style={s.searchIcon}>
            <Search size={24} color={T.accent} strokeWidth={2.3} />
          </View>
          <View style={s.searchCopy}>
            <Text style={s.searchTitle}>Buscando conductores</Text>
            <Text style={s.searchSubtitle}>Te avisaremos cuando llegue una oferta</Text>
          </View>
        </View>

        <View style={s.timeRow} accessible accessibilityLabel={`Tiempo restante: ${fmtTimer(requestTimeLeft)}`}>
          <Clock3 size={17} color={T.accent} strokeWidth={2} />
          <Text style={s.timeLabel}>Tiempo restante</Text>
          <Text style={s.timeValue}>{fmtTimer(requestTimeLeft)}</Text>
        </View>

        <View style={s.divider} />
        <View style={s.fareRow}>
          <View style={s.fareCopy}>
            <Text style={s.fareLabel}>TU TARIFA</Text>
            <Text style={s.fareValue}>Bs {fare.toFixed(2)}</Text>
          </View>
          {originalFare != null && (
            <View style={s.suggestedFare}>
              <Text style={s.suggestedLabel}>Sugerida</Text>
              <Text style={s.suggestedValue}>Bs {originalFare.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={s.routeRow}>
          {[
            { address: pickupAddress },
            ...waypoints.map(stop => ({ address: stop.address })),
            { address: destinationAddress },
          ].map((stop, index, points) => (
            <View key={`${index}-${stop.address}`} style={s.routePoint}>
              <View style={s.routePointIcon}>
                {index === 0 ? <PassengerMapIcon size={27} bare />
                  : index === points.length - 1 ? <DestinationFlagIcon size={27} bare />
                  : <WaypointMapIcon number={index} size={28} />}
                {index < points.length - 1 && <View style={s.routeLine} />}
              </View>
              <View style={s.routePointCopy}>
                <Text style={s.routeAddress} numberOfLines={2}>{stop.address}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.cancelBtn} onPress={handleCancelRide} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>Cancelar solicitud</Text>
        </TouchableOpacity>
      </View>

      <ConfirmBottomSheet
        visible={showCancelConfirm}
        title="¿Cancelar solicitud?"
        message="Se cancelará la búsqueda de conductores para este viaje."
        confirmLabel="Sí, cancelar"
        cancelLabel="Seguir buscando"
        stackedActions
        loading={isCancelling}
        onConfirm={confirmCancelRide}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <ConfirmBottomSheet
        visible={showExpiredOptions}
        title="Buscar de nuevo con una tarifa más alta"
        message={`No recibimos una oferta a tiempo. Nueva tarifa: Bs ${nextFare.toFixed(2)}.`}
        confirmLabel={`Buscar por Bs ${nextFare.toFixed(2)}`}
        cancelLabel="Cancelar solicitud"
        stackedActions
        loading={isRetrying}
        error={retryError}
        onConfirm={retryWithHigherFare}
        onCancel={cancelExpiredRequest}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,10,18,0.60)',
    zIndex: 30,
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
    zIndex: 10,
  },
  negoHeaderRaised: {
    zIndex: 40,
    elevation: 21,
  },
  negoHeaderIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  negoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111118',
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
    zIndex: 20,
  },
  bottomSheetDimmed: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3EAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCopy: { flex: 1 },
  searchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111118',
  },
  searchSubtitle: {
    fontSize: 13,
    color: '#7A7A8A',
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3EAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  timeLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#7A7A8A' },
  timeValue: { fontSize: 17, fontWeight: '700', color: T.accent },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 14,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  fareCopy: { flex: 1 },
  fareLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A7A8A',
    letterSpacing: 0.8,
  },
  fareValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111118',
    letterSpacing: -0.8,
    fontFamily: 'Montserrat',
  },
  suggestedFare: { alignItems: 'flex-end', paddingBottom: 5 },
  suggestedLabel: { fontSize: 12, color: '#AFAFBF' },
  suggestedValue: { fontSize: 13, fontWeight: '600', color: '#7A7A8A' },
  routeRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    marginTop: 12,
  },
  routePoint: { flexDirection: 'row', minHeight: 42 },
  routePointIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  routeLine: {
    flex: 1,
    minHeight: 8,
    width: 1.5,
    backgroundColor: '#E5E5EA',
    marginVertical: 2,
  },
  routePointCopy: { flex: 1, paddingBottom: 8 },
  routeAddress: { fontSize: 14, fontWeight: '500', color: '#111118' },
  cancelBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  cancelBtnText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111118',
  },
});

export default NegotiationScreen;
