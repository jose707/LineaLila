import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Vibration,
  BackHandler,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  useFocusEffect,
  CommonActions,
  useIsFocused,
} from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';
import { cacheRouteService } from '../services/cache.service';
import { cacheRouteManager, cleanExpiredCache } from '../utils/cacheManager';
import socketService from '../services/socket.service';
import { SOCKET_CONFIG } from '../config/constants';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const LOCATIONIQ_API_KEY = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg: '#F7F6F3',
  white: '#FFFFFF',
  ink: '#141414',
  inkMid: '#555555',
  inkLight: '#999999',
  accent: '#7514C5',
  accentSoft: '#F3E8FF',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  danger: '#DC2626',
  dangerSoft: '#FFF0F0',
  warn: '#D97706',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  pink: '#EC4899',
  border: '#E8E6E1',
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ActiveRide {
  rideId: string;
  status:
    | 'accepted'
    | 'arrived'
    | 'in_progress'
    | 'completing'
    | 'cancelled'
    | 'completed';
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
  passengerProfilePicture?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverProfilePicture?: string;
  vehicleInfo?: string;
  licensePlate?: string;
  pickupLocation: { latitude: number; longitude: number; address: string };
  dropoffLocation: { latitude: number; longitude: number; address: string };
  waypoints?: Array<{
    id: string;
    sequence: number;
    location: { latitude: number; longitude: number };
    address: string;
    arrivedAt?: string | null;
    departedAt?: string | null;
  }>;
  driverLocation?: { latitude: number; longitude: number };
  fare: number;
  distance: number;
  duration: number;
  eta: number;
  startTime?: string;
  cancelledBy?: string;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = {
  Phone: ({
    size = 18,
    color = T.accent,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Car: ({ size = 18, color = T.accent }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 11l1.5-4.5h11L19 11"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <Rect
        x="3"
        y="11"
        width="18"
        height="7"
        rx="2"
        stroke={color}
        strokeWidth="1.75"
      />
      <Circle cx="7.5" cy="18" r="1.5" fill={color} />
      <Circle cx="16.5" cy="18" r="1.5" fill={color} />
    </Svg>
  ),
  User: ({
    size = 18,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.75" />
      <Path
        d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Svg>
  ),
  Star: ({
    size = 13,
    color = '#F59E0B',
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  ),
  Check: ({
    size = 16,
    color = T.white,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l5 5L20 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Close: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M6 18L18 6"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Svg>
  ),
  Play: ({ size = 16, color = T.white }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M5 3l14 9-14 9V3z" />
    </Svg>
  ),
  Distance: ({
    size = 14,
    color = T.inkLight,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12h20M16 7l5 5-5 5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Clock: ({
    size = 14,
    color = T.inkLight,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
      <Path
        d="M12 7v5l3 3"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  Money: ({
    size = 14,
    color = T.inkLight,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        stroke={color}
        strokeWidth="1.75"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.75" />
    </Svg>
  ),
};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS: Record<
  string,
  { label: (d: boolean) => string; color: string; bg: string }
> = {
  accepted: {
    label: d =>
      d ? 'Dirígete al punto de recogida' : 'El conductor está en camino',
    color: T.info,
    bg: T.infoSoft,
  },
  arrived: {
    label: d => (d ? 'Llegaste al punto de recogida' : 'El conductor llegó'),
    color: T.pink,
    bg: '#FDF2F8',
  },
  in_progress: {
    label: _ => 'En camino al destino',
    color: T.success,
    bg: T.successSoft,
  },
  completing: {
    label: _ => 'Finalizando viaje…',
    color: T.accent,
    bg: T.accentSoft,
  },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const ActiveRideScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ActiveRide'>>();
  const { user, isDriverMode } = useAuth();
  const { rideId } = route.params || { rideId: 'demo' };
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [ride, setRide] = useState<ActiveRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{
    latitude: number;
    longitude: number;
  }> | null>(null);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferPrice, setCounterOfferPrice] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [showArrivedNotification, setShowArrivedNotification] = useState(false);
  const [passengerReady, setPassengerReady] = useState(false);
  const [showPassengerReadyNotification, setShowPassengerReadyNotification] =
    useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<any[]>([]);
  const [selectedCancelReasonId, setSelectedCancelReasonId] = useState<
    string | null
  >(null);

  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const previousPassengerReadyAtRef = useRef<string | null>(null);

  // ── Effects ──
  useEffect(() => {
    cacheRouteService.clearExpired();
    cleanExpiredCache();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    isLoadingRef.current = false;
    loadRideDetails(); // Carga inicial

    // 🔌 Socket: unirse al room del viaje
    socketService.joinRide(rideId);

    // Socket: escuchar cambios de estado del viaje
    const handleStatusChanged = (data: any) => {
      if (data?.rideId !== rideId) return;
      if (isMountedRef.current && !isLoadingRef.current) loadRideDetails();
    };

    // Socket: escuchar actualizaciones de ubicación del conductor
    const handleLocationChanged = (data: any) => {
      if (data?.rideId !== rideId) return;
      setRide((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          driverLocation: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        };
      });
    };

    socketService.on('ride:status:changed', handleStatusChanged);
    socketService.on('driver:location:changed', handleLocationChanged);

    return () => {
      isMountedRef.current = false;
      socketService.off('ride:status:changed', handleStatusChanged);
      socketService.off('driver:location:changed', handleLocationChanged);
      socketService.leaveRide(rideId);
    };
  }, [rideId]);

  useEffect(() => {
    if (!ride) return;
    if (ride.status === 'cancelled') {
      // Detener listeners de socket para evitar llamadas innecesarias tras cancelación
      isMountedRef.current = false;

      if (ride.cancelledBy === 'driver' && isDriverMode) return;
      if (ride.cancelledBy === 'passenger' && !isDriverMode) return;

      if (isDriverMode) {
        Alert.alert(
          'Viaje Cancelado',
          'El pasajero u otro factor canceló la solicitud.',
          [
            {
              text: 'Aceptar',
              onPress: () => navigation.navigate('DriverRideRequest' as any),
            },
          ],
        );
      } else {
        Alert.alert('Viaje Cancelado', 'El conductor canceló el viaje.', [
          {
            text: 'Aceptar',
            onPress: () => navigation.navigate('Map' as any),
          },
        ]);
      }
    }
  }, [ride?.status, isDriverMode]);

  useEffect(() => {
    if (!ride || isDriverMode) return;
    if (ride.status === 'arrived') {
      setShowArrivedNotification(true);
      Vibration.vibrate([0, 150, 100, 150]);
    } else {
      setShowArrivedNotification(false);
      setPassengerReady(false);
      previousPassengerReadyAtRef.current = null;
    }
  }, [ride?.status, isDriverMode]);

  useEffect(() => {
    if (!ride) return;
    if (ride.status === 'completed')
      navigation.navigate('RideCompleted' as const, {
        rideId: ride.rideId,
      });
  }, [ride?.status]);

  useEffect(() => {
    if (
      !isDriverMode ||
      !isFocused ||
      ride?.status === 'cancelled' ||
      ride?.status === 'completed'
    )
      return;

    const send = () => {
      if (!isMountedRef.current) return;
      Geolocation.getCurrentPosition(
        (pos: any) => {
          if (isMountedRef.current) {
            // 🔌 Enviar ubicación via WebSocket (más eficiente que REST)
            socketService.updateLocation({
              rideId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      );
    };

    const id = setInterval(send, SOCKET_CONFIG.LOCATION_INTERVAL_MS);
    send();
    return () => clearInterval(id);
  }, [isDriverMode, isFocused, ride?.status, rideId]);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos: any) => {
        if (isMountedRef.current)
          setPassengerLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
    const wid = Geolocation.watchPosition(
      (pos: any) => {
        if (isMountedRef.current)
          setPassengerLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
      },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 10 },
    );
    return () => {
      if (wid !== null) Geolocation.clearWatch(wid);
    };
  }, []);

  useEffect(() => {
    if (!ride) return;
    (async () => {
      try {
        const legs: Array<{ latitude: number; longitude: number }> = [
          ride.pickupLocation,
          ...(ride.waypoints || []).map(wp => wp.location),
          ride.dropoffLocation,
        ];

        let allCoords: Array<{ latitude: number; longitude: number }> = [];

        for (let i = 0; i < legs.length - 1; i++) {
          const { latitude: fromLat, longitude: fromLon } = legs[i];
          const { latitude: toLat, longitude: toLon } = legs[i + 1];
          const cached = await cacheRouteManager.getRoute(
            { latitude: fromLat, longitude: fromLon },
            { latitude: toLat, longitude: toLon },
          );
          if (cached) {
            if (i === 0) {
              allCoords.push(...cached.coordinates);
            } else {
              allCoords.push(...cached.coordinates.slice(1));
            }
            continue;
          }
          const r = await fetch(
            `${LOCATIONIQ_BASE_URL}/directions/driving/${fromLon},${fromLat};${toLon},${toLat}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false`,
          );
          if (!r.ok) throw new Error();
          const data = await r.json();
          if (data.routes?.length > 0) {
            const coords = decodePolyline(data.routes[0].geometry);
            await cacheRouteManager.saveRoute(
              { latitude: fromLat, longitude: fromLon },
              { latitude: toLat, longitude: toLon },
              {
                pickupLat: fromLat,
                pickupLon: fromLon,
                destLat: toLat,
                destLon: toLon,
                distance: data.routes[0].distance,
                duration: data.routes[0].duration,
                coordinates: coords,
                fare: 0,
                timestamp: Date.now(),
              },
            );
            if (i === 0) {
              allCoords.push(...coords);
            } else {
              allCoords.push(...coords.slice(1));
            }
          } else throw new Error();
        }

        if (allCoords.length > 0) {
          setRouteCoordinates(allCoords);
        } else {
          setRouteCoordinates(legs);
        }
      } catch {
        const legs: Array<{ latitude: number; longitude: number }> = [
          ride.pickupLocation,
          ...(ride.waypoints || []).map(wp => wp.location),
          ride.dropoffLocation,
        ];
        setRouteCoordinates(legs);
      }
    })();
  }, [ride?.rideId]);

  // ── Helpers ──
  const decodePolyline = (enc: string) => {
    const pts: Array<{ latitude: number; longitude: number }> = [];
    let i = 0,
      lat = 0,
      lng = 0;
    while (i < enc.length) {
      let b,
        sh = 0,
        r = 0;
      do {
        b = enc.charCodeAt(i++) - 63;
        r |= (b & 0x1f) << sh;
        sh += 5;
      } while (b >= 0x20);
      lat += r & 1 ? ~(r >> 1) : r >> 1;
      sh = 0;
      r = 0;
      do {
        b = enc.charCodeAt(i++) - 63;
        r |= (b & 0x1f) << sh;
        sh += 5;
      } while (b >= 0x20);
      lng += r & 1 ? ~(r >> 1) : r >> 1;
      pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return pts;
  };

  const loadRideDetails = async () => {
    if (isLoadingRef.current || !rideId) return;
    try {
      isLoadingRef.current = true;
      const d: any = await ridesService.getRideById(rideId);
      if (!d || !isMountedRef.current) return;
      const mapped: ActiveRide = {
        rideId: d.id,
        status: d.status,
        passengerName: d.passenger?.name || 'Pasajero',
        passengerPhone: d.passenger?.phone || '',
        passengerRating: d.passenger?.rating || 0,
        passengerProfilePicture: d.passenger?.profilePhoto,
        driverName: d.driver?.User?.name || 'Conductor',
        driverPhone: d.driver?.User?.phone || '',
        driverRating: d.driver?.User?.rating || 0,
        driverProfilePicture: d.driver?.User?.profilePhoto,
        vehicleInfo: d.driver?.vehicleModel
          ? `${d.driver.vehicleModel} ${d.driver.vehicleColor || ''}`.trim()
          : undefined,
        licensePlate: d.driver?.vehiclePlate,
        pickupLocation: {
          latitude: d.pickupLocation?.latitude || -16.5038,
          longitude: d.pickupLocation?.longitude || -68.1345,
          address: d.pickupLocation?.address || 'Punto de recogida',
        },
        dropoffLocation: {
          latitude: d.dropoffLocation?.latitude || -16.518,
          longitude: d.dropoffLocation?.longitude || -68.124,
          address: d.dropoffLocation?.address || 'Destino',
        },
        driverLocation: d.driver?.currentLocation?.latitude
          ? {
              latitude: parseFloat(d.driver.currentLocation.latitude),
              longitude: parseFloat(d.driver.currentLocation.longitude),
            }
          : d.driver?.location?.latitude
          ? {
              latitude: parseFloat(d.driver.location.latitude),
              longitude: parseFloat(d.driver.location.longitude),
            }
          : undefined,
        fare: d.fare || d.finalFare || 0,
        distance: (d.distance || 0) / 1000,
        duration: Math.floor((d.duration || 0) / 60),
        eta: Math.floor((d.duration || 0) / 60),
        startTime: d.startedAt || d.createdAt,
        cancelledBy: d.cancelled_by || d.cancelledBy,
        waypoints: (d.waypoints || []).map((wp: any) => ({
          id: wp.id,
          sequence: wp.sequence,
          location: wp.location || {
            latitude: 0,
            longitude: 0,
          },
          address: wp.address || '',
          arrivedAt: wp.arrivedAt || null,
          departedAt: wp.departedAt || null,
        })),
      };
      setRide(mapped);
      setIsLoading(false);
      setIsRefreshing(false);
      if (
        d.passengerReadyAt &&
        !previousPassengerReadyAtRef.current &&
        isDriverMode
      )
        setShowPassengerReadyNotification(true);
      previousPassengerReadyAtRef.current = d.passengerReadyAt;
    } catch (e: any) {
      if (isMountedRef.current && e?.message !== 'AbortError') {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleCall = async () => {
    if (!ride) return;
    const phone = isDriverMode ? ride.passengerPhone : ride.driverPhone;
    if (!phone) {
      Alert.alert('Sin teléfono', 'No hay número disponible');
      return;
    }
    setIsCalling(true);
    try {
      await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la llamada');
    } finally {
      setIsCalling(false);
    }
  };

  const handleArrived = () => {
    if (!ride?.rideId) return;
    Alert.alert('¿Ya llegaste?', 'Confirma que llegaste al punto de recogida', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setIsLoading(true);
            await ridesService.markAsArrived(ride.rideId);
            setRide(p => (p ? { ...p, status: 'arrived' } : null));
          } catch (e: any) {
            Alert.alert('Error', e?.message);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handlePassengerReady = async () => {
    if (!rideId) return;
    try {
      setIsLoading(true);
      await ridesService.markPassengerReady(rideId);
      setPassengerReady(true);
      setShowArrivedNotification(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRide = async () => {
    if (!ride?.rideId) return;
    try {
      setIsLoading(true);
      await ridesService.startRide(ride.rideId);
      setRide(p => (p ? { ...p, status: 'in_progress' } : null));
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRide = () => {
    if (!rideId) return;
    Alert.alert('Finalizar viaje', '¿Estás seguro?', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: async () => {
          try {
            setIsLoading(true);
            await ridesService.completeRide(rideId, {} as any);
            navigation.navigate('RideCompleted' as const, { rideId });
          } catch (e: any) {
            Alert.alert('Error', e?.message);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleCancelRide = async () => {
    if (!ride?.rideId) return;

    const isPassengerWithDriver =
      !isDriverMode &&
      ['accepted', 'arrived', 'in_progress'].includes(ride.status);

    if (isDriverMode || isPassengerWithDriver) {
      try {
        setIsLoading(true);
        const reasons = await ridesService.getCancellationReasons(
          isDriverMode ? 'driver' : 'passenger',
        );
        setCancellationReasons(reasons);
        setShowCancelModal(true);
      } catch (e: any) {
        Alert.alert(
          'Error',
          'No se pudieron cargar los motivos de cancelación',
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      const msg = 'Cancelar solicitud';
      Alert.alert(msg, '¿Estás seguro?', [
        { text: 'Atrás', style: 'cancel' },
        {
          text: msg,
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await ridesService.cancelRide(
                ride.rideId,
                'Cancelado por pasajero',
                'passenger',
              );
              navigation.navigate('Map' as any);
            } catch (e: any) {
              Alert.alert('Error', e?.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    }
  };

  const handleConfirmCancel = async () => {
    if (!ride?.rideId || !selectedCancelReasonId) {
      Alert.alert('Error', 'Por favor selecciona un motivo de cancelación');
      return;
    }
    try {
      setIsLoading(true);
      await ridesService.cancelRide(
        ride.rideId,
        isDriverMode ? 'Cancelado por conductor' : 'Cancelado por pasajero',
        isDriverMode ? 'driver' : 'passenger',
        selectedCancelReasonId,
      );
      setShowCancelModal(false);
      navigation.navigate((isDriverMode ? 'DriverRideRequest' : 'Map') as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  const handleBackPress = useCallback(() => {
    if (!ride?.rideId) return true;

    const msg = isDriverMode ? 'Cancelar viaje' : 'Cancelar solicitud';
    Alert.alert(msg, '¿Estás seguro?', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: msg,
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await ridesService.cancelRide(
              ride.rideId,
              isDriverMode
                ? 'Cancelado por conductor'
                : 'Cancelado por pasajero',
              isDriverMode ? 'driver' : ('passenger' as any),
            );

            // Resetear navegación y volver a inicio
            const destination = isDriverMode ? 'DriverRideRequest' : 'Map';
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: destination as any }],
              }),
            );
          } catch (e: any) {
            Alert.alert('Error', e?.message);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);

    return true; // Prevenir comportamiento por defecto
  }, [ride?.rideId, isDriverMode]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress,
      );
      return () => subscription.remove();
    }, [handleBackPress]),
  );

  const handleSubmitCounterOffer = async () => {
    const price = parseFloat(counterOfferPrice);
    if (!ride?.rideId || isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Ingresa un precio válido');
      return;
    }
    try {
      setIsSubmittingOffer(true);
      await ridesService.submitCounterOffer(ride.rideId, price);
      Alert.alert(
        'Oferta enviada',
        `Bs. ${price.toFixed(2)} enviados al pasajero`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCounterOfferModal(false);
              setCounterOfferPrice('');
              navigation.navigate('DriverRideRequest' as any);
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // ── Guard states ──
  if (isLoading && !ride) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={s.loadingText}>Cargando viaje…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!ride) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centered}>
          <Text style={s.errorText}>No se pudo cargar el viaje</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadRideDetails}>
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConf = STATUS[ride.status] || {
    label: () => ride.status,
    color: T.inkMid,
    bg: T.bg,
  };
  const displayName = isDriverMode
    ? ride.passengerName
    : ride.driverName || 'Conductor';
  const displayRating = isDriverMode ? ride.passengerRating : ride.driverRating;

  return (
    <SafeAreaView style={s.root}>
      {/* ── MAP ── */}
      <View style={s.mapWrap}>
        <MapView
          style={s.map}
          initialRegion={{
            latitude:
              (ride.pickupLocation.latitude + ride.dropoffLocation.latitude) /
              2,
            longitude:
              (ride.pickupLocation.longitude + ride.dropoffLocation.longitude) /
              2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Driver */}
          <Marker
            coordinate={
              ride.driverLocation ?? {
                latitude:
                  (ride.pickupLocation.latitude +
                    ride.dropoffLocation.latitude) /
                  2,
                longitude:
                  (ride.pickupLocation.longitude +
                    ride.dropoffLocation.longitude) /
                  2,
              }
            }
            title="Conductor"
          >
            <View
              style={[
                s.marker,
                {
                  borderColor: T.accent,
                  opacity: ride.driverLocation ? 1 : 0.35,
                },
              ]}
            >
              <View style={[s.markerDot, { backgroundColor: T.accent }]} />
            </View>
          </Marker>

          {/* Pickup */}
          {ride.status === 'in_progress' && (
            <Marker coordinate={ride.pickupLocation} title="Recogida">
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.markerLabelText, { backgroundColor: T.white, color: T.ink, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 3, fontSize: 11, fontWeight: '800' }]}>Origen</Text>
                <View style={[s.markerDotCircle, { backgroundColor: T.accent }]} />
              </View>
            </Marker>
          )}

          {/* Dropoff */}
          {ride.status === 'in_progress' && (
            <Marker coordinate={ride.dropoffLocation} title="Destino">
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.markerLabelText, { backgroundColor: T.white, color: T.ink, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 3, fontSize: 11, fontWeight: '800' }]}>Destino</Text>
                <View style={[s.markerDotCircle, { backgroundColor: T.accent }]} />
              </View>
            </Marker>
          )}

          {/* Waypoints */}
          {ride.status === 'in_progress' &&
            (ride.waypoints || []).map((wp, idx) => (
              <Marker
                key={`wp-${idx}`}
                coordinate={wp.location}
                title={`Parada ${wp.sequence || idx + 1}`}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={[s.markerLabelText, { backgroundColor: T.white, color: T.ink, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 3, fontSize: 11, fontWeight: '800' }]}>{wp.sequence || idx + 1}</Text>
                  <View style={[s.markerDotCircle, { backgroundColor: T.accent }]} />
                </View>
              </Marker>
            ))}

          {/* Passenger */}
          {passengerLocation && (
            <Marker
              coordinate={passengerLocation}
              title={isDriverMode ? 'Pasajero' : 'Tú'}
            >
              <View style={[s.marker, { borderColor: T.success }]}>
                <View style={[s.markerDot, { backgroundColor: T.success }]} />
              </View>
            </Marker>
          )}

          {/* Route */}
          {routeCoordinates &&
            routeCoordinates.length > 0 &&
            ride.status === 'in_progress' && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={T.accent}
                strokeWidth={3.5}
                lineCap="round"
                lineJoin="round"
              />
            )}
        </MapView>
      </View>

      {/* ── PANEL ── */}
      <ScrollView
        style={s.panel}
        contentContainerStyle={[s.panelContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadRideDetails();
            }}
            tintColor={T.accent}
          />
        }
      >
        {/* Status */}
        <View style={[s.statusBadge, { backgroundColor: statusConf.bg }]}>
          <View style={[s.statusDot, { backgroundColor: statusConf.color }]} />
          <Text style={[s.statusText, { color: statusConf.color }]}>
            {statusConf.label(isDriverMode)}
          </Text>
        </View>

        {/* Person */}
        <View style={s.personRow}>
          <View style={s.avatar}>
            {isDriverMode && ride.passengerProfilePicture ? (
              <Image
                source={{ uri: ride.passengerProfilePicture }}
                style={s.avatarImage}
              />
            ) : !isDriverMode && ride.driverProfilePicture ? (
              <Image
                source={{ uri: ride.driverProfilePicture }}
                style={s.avatarImage}
              />
            ) : isDriverMode ? (
              <Icon.User size={22} color={T.accent} />
            ) : (
              <Icon.Car size={22} color={T.accent} />
            )}
          </View>
          <View style={s.personInfo}>
            <Text style={s.personName}>{displayName}</Text>
            <View style={s.ratingRow}>
              <Icon.Star size={12} />
              <Text style={s.ratingText}>
                {(displayRating || 0).toFixed(1)}
              </Text>
            </View>
            {!isDriverMode && (ride.vehicleInfo || ride.licensePlate) && (
              <View style={s.vehicleRow}>
                {ride.vehicleInfo && (
                  <Text style={s.subText}>{ride.vehicleInfo}</Text>
                )}
                {ride.licensePlate && (
                  <View style={s.plateBadge}>
                    <Text style={s.plateText}>
                      {ride.licensePlate.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <TouchableOpacity
            style={s.callBtn}
            onPress={handleCall}
            disabled={isCalling}
            activeOpacity={0.8}
          >
            {isCalling ? (
              <ActivityIndicator size="small" color={T.accent} />
            ) : (
              <Icon.Phone size={18} color={T.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Route addresses */}
        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: T.inkLight }]} />
            <View style={s.routeTexts}>
              <Text style={s.routeLabel}>Recogida</Text>
              <Text style={s.routeAddr} numberOfLines={2}>
                {ride.pickupLocation.address}
              </Text>
            </View>
          </View>
          {(ride.waypoints || []).map((wp, idx) => (
            <React.Fragment key={`wp-${idx}`}>
              <View style={s.vSep}>
                <View style={s.vLine} />
              </View>
              <View style={s.routeRow}>
                <View style={[s.routeDot, { backgroundColor: T.warn }]} />
                <View style={s.routeTexts}>
                  <Text style={s.routeLabel}>Parada {wp.sequence || idx + 1}</Text>
                  <Text style={[s.routeAddr, { color: T.ink }]} numberOfLines={2}>
                    {wp.address}
                  </Text>
                </View>
              </View>
            </React.Fragment>
          ))}
          <View style={s.vSep}>
            <View style={s.vLine} />
          </View>
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: T.accent }]} />
            <View style={s.routeTexts}>
              <Text style={s.routeLabel}>Destino</Text>
              <Text style={[s.routeAddr, { color: T.ink }]} numberOfLines={2}>
                {ride.dropoffLocation.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          <View style={s.statItem}>
            <Icon.Distance size={13} color={T.inkLight} />
            <Text style={s.statVal}>{ride.distance.toFixed(1)} km</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statItem}>
            <Icon.Clock size={13} color={T.inkLight} />
            <Text style={s.statVal}>{ride.duration} min</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statItem}>
            <Icon.Money size={13} color={T.inkLight} />
            <Text style={[s.statVal, { color: T.accent, fontWeight: '700' }]}>
              Bs {ride.fare.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actionsWrap}>
          {isDriverMode ? (
            <>
              {ride.status === 'accepted' && (
                <TouchableOpacity
                  style={s.primaryBtn}
                  onPress={handleArrived}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={T.white} />
                  ) : (
                    <>
                      <Icon.Check size={16} color={T.white} />
                      <Text style={s.primaryBtnTxt}>Llegué a recogida</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {ride.status === 'arrived' && (
                <>
                  {passengerReady && (
                    <View style={s.readyBadge}>
                      <Icon.Check size={14} color={T.success} />
                      <Text style={s.readyBadgeTxt}>
                        Pasajero listo — puedes iniciar
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={handleStartRide}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={T.white} />
                    ) : (
                      <>
                        <Icon.Play size={16} color={T.white} />
                        <Text style={s.primaryBtnTxt}>Iniciar viaje</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
              {ride.status === 'in_progress' && (
                <>
                  <TouchableOpacity
                    style={[s.primaryBtn, { marginBottom: 10 }]}
                    onPress={handleCompleteRide}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={T.white} />
                    ) : (
                      <>
                        <Icon.Check size={16} color={T.white} />
                        <Text style={s.primaryBtnTxt}>Finalizar viaje</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.dangerBtn}
                    onPress={handleCancelRide}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Icon.Close size={15} color={T.danger} />
                    <Text style={s.dangerBtnTxt}>Cancelar viaje</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              {ride.status !== 'in_progress' && (
                <TouchableOpacity
                  style={s.dangerBtn}
                  onPress={handleCancelRide}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Icon.Close size={15} color={T.danger} />
                  <Text style={s.dangerBtnTxt}>Cancelar solicitud</Text>
                </TouchableOpacity>
              )}
              {ride.status === 'in_progress' && (
                <View style={s.infoBtn}>
                  <Icon.Car size={16} color={T.accent} />
                  <Text style={s.infoBtnTxt}>Viaje en curso…</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── COUNTER OFFER MODAL ── */}
      <Modal
        transparent
        visible={showCounterOfferModal}
        animationType="slide"
        onRequestClose={() => setShowCounterOfferModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Contraoferta de tarifa</Text>
            <View style={s.fareBox}>
              <Text style={s.fareBoxLabel}>Tarifa propuesta</Text>
              <Text style={s.fareBoxVal}>Bs {ride.fare.toFixed(2)}</Text>
            </View>
            <Text style={s.inputLabel}>Tu contraoferta (Bs.)</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: 45.50"
              placeholderTextColor={T.inkLight}
              keyboardType="decimal-pad"
              value={counterOfferPrice}
              onChangeText={setCounterOfferPrice}
              editable={!isSubmittingOffer}
            />
            <Text style={s.helperTxt}>
              Puedes proponer una tarifa diferente a la del pasajero
            </Text>
            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={s.sheetCancelBtn}
                onPress={() => {
                  setShowCounterOfferModal(false);
                  setCounterOfferPrice('');
                }}
                disabled={isSubmittingOffer}
              >
                <Text style={s.sheetCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.sheetSubmitBtn}
                onPress={handleSubmitCounterOffer}
                disabled={isSubmittingOffer}
                activeOpacity={0.85}
              >
                {isSubmittingOffer ? (
                  <ActivityIndicator size="small" color={T.white} />
                ) : (
                  <Text style={s.sheetSubmitTxt}>Enviar oferta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DRIVER CANCEL MODAL ── */}
      <Modal
        transparent
        visible={showCancelModal}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Motivo de cancelación</Text>
            <Text style={s.helperTxt}>
              Por favor selecciona el motivo por el cual cancelas este viaje.
            </Text>

            <ScrollView
              style={{ maxHeight: 250, width: '100%', marginVertical: 12 }}
            >
              {cancellationReasons.map(reason => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    s.reasonBtn,
                    selectedCancelReasonId === reason.id && s.reasonBtnSelected,
                  ]}
                  onPress={() => setSelectedCancelReasonId(reason.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.reasonTxt,
                      selectedCancelReasonId === reason.id &&
                        s.reasonTxtSelected,
                    ]}
                  >
                    {reason.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={s.sheetCancelBtn}
                onPress={() => setShowCancelModal(false)}
                disabled={isLoading}
              >
                <Text style={s.sheetCancelTxt}>Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetSubmitBtn, { backgroundColor: T.danger }]}
                onPress={handleConfirmCancel}
                disabled={isLoading || !selectedCancelReasonId}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={T.white} />
                ) : (
                  <Text style={s.sheetSubmitTxt}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ARRIVED NOTIFICATION (passenger) ── */}
      <Modal
        transparent
        visible={showArrivedNotification}
        animationType="slide"
        onRequestClose={() => setShowArrivedNotification(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.notifSheet}>
            <View style={[s.notifIcon, { backgroundColor: T.accentSoft }]}>
              <Icon.Car size={32} color={T.accent} />
            </View>
            <Text style={s.notifTitle}>¡El conductor llegó!</Text>
            <Text style={s.notifSub}>
              Tu conductor está esperando en el punto de recogida
            </Text>
            <TouchableOpacity
              style={[s.primaryBtn, { width: '100%' }]}
              onPress={handlePassengerReady}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <>
                  <Icon.Check size={16} color={T.white} />
                  <Text style={s.primaryBtnTxt}>Ya voy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PASSENGER READY (driver) ── */}
      <Modal
        transparent
        visible={showPassengerReadyNotification}
        animationType="slide"
        onRequestClose={() => setShowPassengerReadyNotification(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.notifSheet}>
            <View style={[s.notifIcon, { backgroundColor: T.successSoft }]}>
              <Icon.Check size={32} color={T.success} />
            </View>
            <Text style={s.notifTitle}>¡Pasajero listo!</Text>
            <Text style={s.notifSub}>
              El pasajero está listo para subir al vehículo
            </Text>
            <TouchableOpacity
              style={[
                s.primaryBtn,
                { backgroundColor: T.success, width: '100%' },
              ]}
              onPress={() => setShowPassengerReadyNotification(false)}
              activeOpacity={0.85}
            >
              <Icon.Check size={16} color={T.white} />
              <Text style={s.primaryBtnTxt}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: { fontSize: 15, color: T.inkMid, fontWeight: '500' },
  errorText: { fontSize: 15, color: T.danger, fontWeight: '600' },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: T.accent,
    borderRadius: 12,
  },
  retryBtnText: { color: T.white, fontSize: 14, fontWeight: '600' },

  // Map
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  markerDot: { width: 8, height: 8, borderRadius: 4 },
  markerDotCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: T.white,
  },
  markerLabel: {
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.white,
    paddingHorizontal: 6,
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.white,
  },

  // Panel
  panel: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '44%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  panelContent: { paddingTop: 20, paddingHorizontal: 20 },

  // Status
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },

  // Person
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  personInfo: { flex: 1 },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.ink,
    marginBottom: 3,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: T.inkMid, fontWeight: '600' },
  subText: { fontSize: 12, color: T.inkLight, marginTop: 2 },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  plateBadge: {
    backgroundColor: T.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: T.white,
    letterSpacing: 1,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Route
  routeCard: {
    backgroundColor: T.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginTop: 4,
    flexShrink: 0,
  },
  routeTexts: { flex: 1 },
  routeLabel: {
    fontSize: 11,
    color: T.inkLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  routeAddr: {
    fontSize: 13,
    color: T.inkMid,
    fontWeight: '500',
    lineHeight: 18,
  },
  vSep: { paddingLeft: 4, paddingVertical: 4 },
  vLine: { width: 1.5, height: 12, backgroundColor: T.border },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statVal: { fontSize: 13, fontWeight: '600', color: T.ink },
  statSep: { width: 1, height: 18, backgroundColor: T.border },

  // Actions
  actionsWrap: { gap: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: T.accent,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: T.white,
    letterSpacing: 0.2,
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: T.accentSoft,
    borderWidth: 1.5,
    borderColor: T.accent,
  },
  infoBtnTxt: { fontSize: 14, fontWeight: '600', color: T.accent },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.dangerSoft,
    borderWidth: 1,
    borderColor: T.danger,
  },
  dangerBtnTxt: { fontSize: 14, fontWeight: '600', color: T.danger },
  reasonBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
    backgroundColor: T.white,
  },
  reasonBtnSelected: {
    borderColor: T.danger,
    backgroundColor: T.dangerSoft,
  },
  reasonTxt: {
    fontSize: 14,
    color: T.inkMid,
    fontWeight: '500',
  },
  reasonTxtSelected: {
    color: T.danger,
    fontWeight: '700',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.successSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: T.success,
  },
  readyBadgeTxt: { fontSize: 13, fontWeight: '600', color: T.success },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 44,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  fareBox: {
    backgroundColor: T.accentSoft,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  fareBoxLabel: { fontSize: 12, color: T.inkMid, marginBottom: 4 },
  fareBoxVal: { fontSize: 24, fontWeight: '800', color: T.accent },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.ink,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.ink,
    marginBottom: 8,
  },
  helperTxt: {
    fontSize: 12,
    color: T.inkLight,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  sheetCancelTxt: { fontSize: 14, fontWeight: '600', color: T.inkMid },
  sheetSubmitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSubmitTxt: { fontSize: 14, fontWeight: '700', color: T.white },

  // Notification sheets
  notifSheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 52,
    alignItems: 'center',
    gap: 0,
  },
  notifIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  notifTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: T.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  notifSub: {
    fontSize: 14,
    color: T.inkMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  ghostBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  ghostBtnTxt: { fontSize: 14, color: T.inkLight, fontWeight: '600' },
});

export default ActiveRideScreen;
