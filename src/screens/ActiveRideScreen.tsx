import { privateImageSource } from '../utils/privateImageSource';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Vibration,
  BackHandler,
  NativeModules,
  Platform,
  AppState,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { ArrowLeft, ChevronRight, ShieldAlert, X } from 'lucide-react-native';
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
import MapView, { Marker } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';
import { cacheRouteService } from '../services/cache.service';
import { cleanExpiredCache } from '../utils/cacheManager';
import socketService from '../services/socket.service';
import { API_BASE_URL, SOCKET_CONFIG } from '../config/constants';
import { StorageHelper } from '../services/storage';
import { normalizeHeading, resolveDriverHeading, updateDriverHeading } from '../utils/driverHeading';
import type { DriverHeadingState } from '../utils/driverHeading';
import { taxiMarkerSize } from '../utils/taxiMarkerSize';
import Toast from '../components/Toast';
import ConfirmBottomSheet from '../components/ConfirmBottomSheet';
import { AnimatedRoutePolyline } from '../components/AnimatedRoutePolyline';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from '../components/MapLocationIcons';
import { Icon as MapIcon } from '../theme/icons';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg: '#F7F7F9',
  white: '#FFFFFF',
  ink: '#111118',
  inkMid: '#7A7A8A',
  inkLight: '#AFAFBF',
  accent: '#7514C5',
  accentSoft: '#F3EAFC',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  danger: '#DC2626',
  dangerSoft: '#FFF0F0',
  warn: '#D97706',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  pink: '#EC4899',
  border: '#E5E5EA',
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
  driverLocation?: { latitude: number; longitude: number; heading?: number };
  fare: number;
  distance: number;
  duration: number;
  eta: number;
  startTime?: string;
  cancelledBy?: string;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = {
  TaxiTop: ({ size = 38 }: { size?: number }) => (
    <Svg width={size} height={size * 2 / 3} viewBox="0 0 72 48" fill="none">
      <Path d="M26 8L29 3H34L32 8M26 40L29 45H34L32 40" fill="#6813A8" />
      <Path d="M11 8H59C66 8 70 14 70 24S66 40 59 40H11C5 40 2 34 2 24S5 8 11 8Z" fill="#8B20D7" />
      <Path d="M12 11H58C64 11 67 16 67 24S64 37 58 37H12C7 37 5 32 5 24S7 11 12 11Z" fill="#A32CF0" stroke="#55118B" strokeWidth="1" />
      <Path d="M28 11C24 15 23 33 28 37L34 35V13L28 11Z" fill="#17202B" stroke="#38114E" strokeWidth="1.5" />
      <Path d="M55 13C59 18 59 30 55 35H50V13H55Z" fill="#17202B" stroke="#38114E" strokeWidth="1.5" />
      <Path d="M34 13H50V35H34C32 28 32 20 34 13Z" fill="#B644F7" />
      <Path d="M8 15C12 11 18 11 24 12M8 33C12 37 18 37 24 36M35 14H47" stroke="#EAB8FF" strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M6 15L9 13M6 33L9 35" stroke="#E6F7FF" strokeWidth="2.4" strokeLinecap="round" />
      <Path d="M66 15L68 19M66 33L68 29" stroke="#FF6C69" strokeWidth="2.4" strokeLinecap="round" />
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
const STATUS: Record<string, (isDriver: boolean) => string> = {
  accepted: isDriver =>
    isDriver ? 'Dirígete al punto de recogida' : 'El conductor está en camino',
  arrived: isDriver =>
    isDriver ? 'Llegaste al punto de recogida' : 'El conductor llegó',
  in_progress: () => 'En camino al destino',
  completing: () => 'Finalizando viaje…',
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
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    if (!ride || ride.rideId !== rideId || !route.params?.confirmationMessage) return;
    setConfirmationMessage(route.params.confirmationMessage);
    navigation.setParams({ confirmationMessage: undefined });
  }, [ride, rideId, route.params?.confirmationMessage, navigation]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{
    latitude: number;
    longitude: number;
  }> | null>(null);
  const [routeError, setRouteError] = useState(false);
  const [routeRetry, setRouteRetry] = useState(0);
  const [showArrivedConfirmModal, setShowArrivedConfirmModal] = useState(false);
  const [arrivedConfirmError, setArrivedConfirmError] = useState('');
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [completeConfirmError, setCompleteConfirmError] = useState('');
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferPrice, setCounterOfferPrice] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [showArrivedNotification, setShowArrivedNotification] = useState(false);
  const [passengerReady, setPassengerReady] = useState(false);
  const [showPassengerReadyNotification, setShowPassengerReadyNotification] =
    useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState<'reasons' | 'confirm'>('reasons');
  const [showEmergencyConfirmModal, setShowEmergencyConfirmModal] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<any[]>([]);
  const [selectedCancelReasonId, setSelectedCancelReasonId] = useState<
    string | null
  >(null);

  const isLoadingRef = useRef(false);
  const lastDriverPointRef = useRef<(DriverHeadingState & { rideId: string }) | null>(null);
  const arrivedConfirmInFlightRef = useRef(false);
  const completeConfirmInFlightRef = useRef(false);
  const activeMapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [taxiSize, setTaxiSize] = useState(38);
  const handleMapRegionChange = useCallback((region: Region) => {
    setTaxiSize(taxiMarkerSize(region.latitudeDelta));
  }, []);
  const framedMapStageRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const previousPassengerReadyAtRef = useRef<string | null>(null);

  // ── Effects ──
  useEffect(() => {
    if (!mapReady || !ride) return;
    const showRoute = ['arrived', 'in_progress', 'completing'].includes(ride.status);
    const stageKey = [
      rideId,
      isDriverMode ? 'driver' : 'passenger',
      showRoute ? 'route' : 'pickup',
      !!ride.driverLocation,
      !isDriverMode && !!passengerLocation,
      showRoute && !!routeCoordinates?.length,
    ].join(':');
    if (framedMapStageRef.current === stageKey) return;

    const coordinates = showRoute
      ? [
          ride.pickupLocation,
          ...(ride.waypoints || []).map(wp => wp.location),
          ride.dropoffLocation,
          ...(routeCoordinates || []),
        ]
      : isDriverMode
        ? [ride.pickupLocation, ride.driverLocation].filter((point): point is NonNullable<typeof point> => !!point)
        : [passengerLocation || ride.pickupLocation, ride.driverLocation].filter((point): point is NonNullable<typeof point> => !!point);

    if (coordinates.length > 1) {
      activeMapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: insets.top + 70, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    } else if (coordinates.length === 1) {
      activeMapRef.current?.animateToRegion({
        ...coordinates[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
    // Reencuadrar al cambiar de etapa o al recibir las primeras ubicaciones.
    framedMapStageRef.current = stageKey;
  }, [mapReady, ride, rideId, isDriverMode, passengerLocation, routeCoordinates, insets.top]);

  useEffect(() => {
    cacheRouteService.clearExpired();
    cleanExpiredCache();
  }, []);

  useEffect(() => {
    if (isDriverMode && rideId) socketService.setActiveRide(rideId, true);
  }, [isDriverMode, rideId]);

  useEffect(() => {
    if (ride?.status && ride.status !== 'accepted') {
      setShowArrivedConfirmModal(false);
      setArrivedConfirmError('');
    }
    if (ride?.status && ride.status !== 'in_progress') {
      setShowCompleteConfirmModal(false);
      setCompleteConfirmError('');
    }
  }, [ride?.status]);

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
      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
        || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
      setRide((prev: any) => {
        if (!prev) return prev;
        const current = { latitude, longitude };
        return {
          ...prev,
          driverLocation: {
            ...current,
            heading: normalizeHeading(data.heading)
              ?? resolveDriverHeading(prev.driverLocation, current),
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
    if (!isFocused) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') loadRideDetails();
    });
    return () => subscription.remove();
  }, [isFocused, rideId]);

  useEffect(() => {
    if (ride?.status !== 'cancelled') return;
    const timeout = setTimeout(() => {
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: isDriverMode ? 'DriverHome' : 'Map' }],
      }));
    }, 2800);
    return () => clearTimeout(timeout);
  }, [ride?.status, isDriverMode, navigation]);

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
    if (!ride || !isDriverMode) return;
    socketService.setActiveRide(
      rideId,
      ['accepted', 'arrived', 'in_progress'].includes(ride.status),
    );
  }, [isDriverMode, ride?.status, rideId]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !NativeModules.ActiveRideLocationModule) return;
    const tracker = NativeModules.ActiveRideLocationModule;
    const active = isDriverMode && ['accepted', 'arrived', 'in_progress'].includes(ride?.status ?? '');
    if (!active) {
      if (ride && ['cancelled', 'completed'].includes(ride.status)) tracker.stop(rideId);
      return;
    }
    const token = StorageHelper.getItem('authToken');
    if (!token) return;
    tracker.start(rideId, token, API_BASE_URL)
      .catch((error: Error) => {
        console.warn('[ActiveRide] Native location tracking unavailable:', error);
      });
  }, [isDriverMode, ride?.status, rideId]);

  useEffect(() => {
    if (
      !isDriverMode ||
      !isFocused ||
      ride?.status === 'cancelled' ||
      ride?.status === 'completed'
    )
      return;

    let cancelled = false;
    let pending = false;
    const send = () => {
      if (!isMountedRef.current || cancelled || pending) return;
      pending = true;
      Geolocation.getCurrentPosition(
        (pos: any) => {
          pending = false;
          if (isMountedRef.current && !cancelled) {
            const current = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            const previous = lastDriverPointRef.current?.rideId === rideId
              ? lastDriverPointRef.current
              : null;
            const headingState = updateDriverHeading(
              previous,
              { ...current, accuracy: pos.coords.accuracy },
              pos.timestamp,
            );
            if (headingState === previous) return;
            const heading = headingState.heading;
            lastDriverPointRef.current = { ...headingState, rideId };
            // 🔌 Enviar ubicación via WebSocket (más eficiente que REST)
            socketService.updateLocation({
              rideId,
              ...current,
              heading,
            });
            setRide(prev => prev ? {
              ...prev,
              driverLocation: {
                ...current,
                heading: heading ?? prev.driverLocation?.heading,
              },
            } : prev);
          }
        },
        () => { pending = false; },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    };

    const id = setInterval(send, SOCKET_CONFIG.LOCATION_INTERVAL_MS);
    send();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isDriverMode, isFocused, ride?.status, rideId]);

  useEffect(() => {
    if (isDriverMode) {
      setPassengerLocation(null);
      return;
    }
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
  }, [isDriverMode]);

  const routeVisible = !!ride && ['arrived', 'in_progress', 'completing'].includes(ride.status);
  const routePointKey = ride ? [
    ride.pickupLocation,
    ...(ride.waypoints || []).map(stop => stop.location),
    ride.dropoffLocation,
  ].map(point => `${point.latitude},${point.longitude}`).join(';') : '';

  useEffect(() => {
    if (!ride || !routeVisible) {
      setRouteCoordinates(null);
      setRouteError(false);
      return;
    }
    let cancelled = false;
    setRouteCoordinates(null);
    setRouteError(false);
    (async () => {
      try {
        const { polyline } = await ridesService.getTripRoute(ride.rideId);
        const coordinates = decodePolyline(polyline);
        if (coordinates.length < 2 || coordinates.some(point => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)))
          throw new Error('Geometría de ruta inválida');
        if (!cancelled) setRouteCoordinates(coordinates);
      } catch {
        if (!cancelled) setRouteError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [ride?.rideId, routeVisible, routePointKey, routeRetry]);

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
              heading: normalizeHeading(d.driver.currentLocation.heading),
            }
          : d.driver?.location?.latitude
          ? {
              latitude: parseFloat(d.driver.location.latitude),
              longitude: parseFloat(d.driver.location.longitude),
              heading: normalizeHeading(d.driver.location.heading),
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
        })).sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence),
      };
      setRide(prev => ({
        ...mapped,
        driverLocation: mapped.driverLocation ? {
          ...mapped.driverLocation,
          heading: mapped.driverLocation.heading ?? (
            prev?.rideId === mapped.rideId ? prev.driverLocation?.heading : undefined
          ),
        } : (prev?.rideId === mapped.rideId ? prev.driverLocation : undefined),
      }));
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

  const handleArrived = () => {
    if (!ride?.rideId || ride.status !== 'accepted') return;
    setArrivedConfirmError('');
    setShowArrivedConfirmModal(true);
  };

  const confirmArrived = async () => {
    if (!ride?.rideId || arrivedConfirmInFlightRef.current) return;
    arrivedConfirmInFlightRef.current = true;
    setIsLoading(true);
    setArrivedConfirmError('');
    try {
      await ridesService.markAsArrived(ride.rideId);
      setShowArrivedConfirmModal(false);
      setRide(p => (p ? { ...p, status: 'arrived' } : null));
    } catch (e: any) {
      setArrivedConfirmError(e?.message || 'No se pudo confirmar la llegada. Inténtalo de nuevo.');
    } finally {
      arrivedConfirmInFlightRef.current = false;
      setIsLoading(false);
    }
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
    if (!rideId || ride?.status !== 'in_progress') return;
    setCompleteConfirmError('');
    setShowCompleteConfirmModal(true);
  };

  const confirmCompleteRide = async () => {
    if (!rideId || completeConfirmInFlightRef.current) return;
    completeConfirmInFlightRef.current = true;
    setIsLoading(true);
    setCompleteConfirmError('');
    try {
      await ridesService.completeRide(rideId, {} as any);
      setShowCompleteConfirmModal(false);
      navigation.navigate('RideCompleted' as const, { rideId });
    } catch (e: any) {
      setCompleteConfirmError(e?.message || 'No se pudo finalizar el viaje. Inténtalo de nuevo.');
    } finally {
      completeConfirmInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!ride?.rideId) return;

    const isPassengerWithDriver =
      !isDriverMode &&
      ['accepted', 'arrived', 'in_progress'].includes(ride.status);

    if (isDriverMode || isPassengerWithDriver) {
      try {
        setIsLoading(true);
        setSelectedCancelReasonId(null);
        setCancelStep('reasons');
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
              setRide(prev => prev ? { ...prev, status: 'cancelled', cancelledBy: 'passenger' } : prev);
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
    if (!ride?.rideId) return;
    try {
      setIsLoading(true);
      await ridesService.cancelRide(
        ride.rideId,
        isDriverMode ? 'Cancelado por conductor' : 'Cancelado por pasajero',
        isDriverMode ? 'driver' : 'passenger',
        selectedCancelReasonId ?? undefined,
      );
      setShowCancelModal(false);
      setRide(prev => prev ? {
        ...prev,
        status: 'cancelled',
        cancelledBy: isDriverMode ? 'driver' : 'passenger',
      } : prev);
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  const handleBackPress = useCallback(() => {
    if (ride?.status === 'cancelled') return true;
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

            setRide(prev => prev ? {
              ...prev,
              status: 'cancelled',
              cancelledBy: isDriverMode ? 'driver' : 'passenger',
            } : prev);
          } catch (e: any) {
            Alert.alert('Error', e?.message);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);

    return true; // Prevenir comportamiento por defecto
  }, [ride?.rideId, ride?.status, isDriverMode]);

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

  if (ride.status === 'cancelled') {
    const cancelledByMe = ride.cancelledBy === (isDriverMode ? 'driver' : 'passenger');
    const message = cancelledByMe
      ? 'Cancelaste este viaje.'
      : ride.cancelledBy === 'driver'
        ? 'El conductor canceló el viaje.'
        : ride.cancelledBy === 'passenger'
          ? 'El pasajero canceló el viaje.'
          : 'Este viaje fue cancelado.';
    return (
      <SafeAreaView style={s.cancelledScreen}>
        <View style={s.cancelledContent}>
          <View style={s.cancelledIcon}>
            <X size={36} color={T.white} strokeWidth={2.4} />
          </View>
          <Text style={s.cancelledTitle}>Viaje cancelado</Text>
          <Text style={s.cancelledMessage}>{message}</Text>
          <Text style={s.cancelledReturn}>Volviendo al inicio…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = STATUS[ride.status]?.(isDriverMode) || ride.status;
  const displayName = isDriverMode
    ? ride.passengerName
    : ride.driverName || 'Conductor';
  const displayRating = isDriverMode ? ride.passengerRating : ride.driverRating;
  const showTripRoute = ['arrived', 'in_progress', 'completing'].includes(ride.status);
  const showPassengerMarker = ride.status === 'accepted';
  const fitMapToTrip = () => {
    const tripPoints = showTripRoute
      ? [
          ride.pickupLocation,
          ...(ride.waypoints || []).map(wp => wp.location),
          ride.dropoffLocation,
          ...(routeCoordinates || []),
        ]
      : [isDriverMode ? ride.pickupLocation : passengerLocation || ride.pickupLocation, ride.driverLocation]
          .filter((point): point is NonNullable<typeof point> => !!point);
    if (tripPoints.length > 1) {
      activeMapRef.current?.fitToCoordinates(tripPoints, {
        edgePadding: { top: insets.top + 70, right: 70, bottom: 65, left: 35 },
        animated: true,
      });
    } else if (tripPoints.length === 1) {
      activeMapRef.current?.animateToRegion({
        ...tripPoints[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* ── MAP ── */}
      <View style={s.mapWrap}>
        <MapView
          ref={activeMapRef}
          onMapReady={() => setMapReady(true)}
          onRegionChange={handleMapRegionChange}
          onRegionChangeComplete={handleMapRegionChange}
          style={s.map}
          mapType="standard"
          userInterfaceStyle="light"
          rotateEnabled={false}
          initialRegion={{
            latitude: showTripRoute
              ? (ride.pickupLocation.latitude + ride.dropoffLocation.latitude) / 2
              : ride.pickupLocation.latitude,
            longitude: showTripRoute
              ? (ride.pickupLocation.longitude + ride.dropoffLocation.longitude) / 2
              : ride.pickupLocation.longitude,
            latitudeDelta: showTripRoute ? 0.05 : 0.02,
            longitudeDelta: showTripRoute ? 0.05 : 0.02,
          }}
        >
          {/* Driver */}
          {ride.driverLocation && (
            <Marker
              coordinate={ride.driverLocation}
              title={isDriverMode ? 'Tú · conductor' : 'Conductor'}
              description={ride.driverName || 'Ubicación del conductor'}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={((ride.driverLocation.heading ?? 0) + 90) % 360}
              tracksViewChanges
              flat
              zIndex={3}
            >
              <View style={s.carMapMarker} collapsable={false}>
                <Icon.TaxiTop size={taxiSize} />
              </View>
            </Marker>
          )}

          {/* Antes de llegar, el conductor ve el punto de recogida como pasajero. */}
          {showPassengerMarker && isDriverMode && (
            <Marker
              coordinate={ride.pickupLocation}
              title="Pasajero · punto de recogida"
              description="Punto acordado, no ubicación GPS en vivo"
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={2}
            >
              <View style={s.mapIconMarker} collapsable={false}>
                <PassengerMapIcon />
              </View>
            </Marker>
          )}

          {/* La ruta y sus extremos aparecen al confirmar la llegada. */}
          {showTripRoute && (
            <>
              <Marker coordinate={ride.pickupLocation} description={ride.pickupLocation.address} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
                <View style={s.mapIconMarker} collapsable={false}>
                  <PassengerMapIcon />
                </View>
              </Marker>
              <Marker coordinate={ride.dropoffLocation} description={ride.dropoffLocation.address} anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
                <View style={s.mapIconMarker} collapsable={false}>
                  <DestinationFlagIcon />
                </View>
              </Marker>
            </>
          )}

          {/* Waypoints */}
          {showTripRoute &&
            (ride.waypoints || []).map((wp, idx) => (
              <Marker
                key={`wp-${idx}`}
                coordinate={wp.location}
                title={`P${wp.sequence || idx + 1}`}
              >
                <WaypointMapIcon number={wp.sequence || idx + 1} />
              </Marker>
            ))}

          {/* Passenger */}
          {showPassengerMarker && !isDriverMode && passengerLocation && (
            <Marker
              coordinate={passengerLocation}
              title="Tú · pasajero"
              description="Tu ubicación actual"
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={2}
            >
              <View style={s.mapIconMarker} collapsable={false}>
                <PassengerMapIcon />
              </View>
            </Marker>
          )}

          {/* Route */}
          {routeCoordinates &&
            routeCoordinates.length > 0 &&
            showTripRoute && (
              <AnimatedRoutePolyline
                coordinates={routeCoordinates}
                strokeColor={T.accent}
                strokeWidth={6}
              />
            )}
        </MapView>
        <View style={[s.mapStatusBanner, { top: insets.top + 12 }]} pointerEvents="none">
          <Text style={s.mapStatusText}>{statusLabel}</Text>
        </View>
        {routeError && showTripRoute && (
          <TouchableOpacity
            style={[s.mapRouteError, { top: insets.top + 70 }]}
            onPress={() => setRouteRetry(value => value + 1)}
            accessibilityRole="button"
            accessibilityLabel="Reintentar trazado de la ruta"
          >
            <Text style={s.mapRouteErrorText}>No se pudo trazar la ruta · Reintentar</Text>
          </TouchableOpacity>
        )}
        <View style={s.mapControls} pointerEvents="box-none">
          <TouchableOpacity
            style={s.mapControlButton}
            onPress={() => setShowEmergencyConfirmModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Emergencia"
          >
            <ShieldAlert size={27} color={T.danger} strokeWidth={2.1} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.mapControlButton}
            onPress={fitMapToTrip}
            disabled={!mapReady}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Mostrar trayecto completo en el mapa"
          >
            <MapIcon.MyLocation size={30} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── PANEL ── */}
      <View style={s.panel}>
        <View style={s.panelHandle} />
      <ScrollView
        style={s.panelScroll}
        contentContainerStyle={s.panelContent}
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
        {/* Person */}
        <View style={s.personRow}>
          <View style={s.avatar}>
            {isDriverMode && ride.passengerProfilePicture ? (
              <Image
                source={privateImageSource(ride.passengerProfilePicture)}
                style={s.avatarImage}
              />
            ) : !isDriverMode && ride.driverProfilePicture ? (
              <Image
                source={privateImageSource(ride.driverProfilePicture)}
                style={s.avatarImage}
              />
            ) : isDriverMode ? (
              <Icon.User size={22} color={T.accent} />
            ) : (
              <Icon.Car size={22} color={T.accent} />
            )}
          </View>
          <View style={s.personInfo}>
            <Text style={s.personName} numberOfLines={2}>{displayName}</Text>
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
            <View style={s.ratingRow}>
              <Icon.Star size={12} color={T.accent} />
              <Text style={s.ratingText}>
                {(displayRating || 0).toFixed(1)}
              </Text>
            </View>
          </View>
          <View style={s.fareBlock}>
            <Text style={s.fareLabel}>TU TARIFA</Text>
            <Text style={s.fareValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Bs {ride.fare.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Route addresses */}
        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={s.routeIconSlot}>
              <PassengerMapIcon size={30} bare />
            </View>
            <View style={s.routeTexts}>
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
                <View style={s.routeStopMarker}>
                  <WaypointMapIcon number={wp.sequence || idx + 1} size={28} />
                </View>
                <View style={s.routeTexts}>
                  <Text style={s.routeAddr} numberOfLines={2}>
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
            <View style={s.routeIconSlot}>
              <DestinationFlagIcon size={30} bare />
            </View>
            <View style={s.routeTexts}>
              <Text style={s.routeAddr} numberOfLines={2}>
                {ride.dropoffLocation.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          <View style={s.statItem}>
            <Icon.Distance size={15} color="#FFFFFF" />
            <Text style={s.statVal}>{ride.distance.toFixed(1)} km</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statItem}>
            <Icon.Clock size={15} color="#FFFFFF" />
            <Text style={s.statVal}>{ride.duration} min</Text>
          </View>
        </View>
      </ScrollView>

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
                    <Text style={s.primaryBtnTxt}>Llegué a recogida</Text>
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
                      <Text style={s.primaryBtnTxt}>Iniciar viaje</Text>
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
                      <Text style={s.primaryBtnTxt}>Finalizar viaje</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.cancelRideBtn}
                    onPress={handleCancelRide}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={s.cancelRideBtnText}>Cancelar viaje</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              {ride.status !== 'in_progress' && (
                <TouchableOpacity
                  style={s.cancelRideBtn}
                  onPress={handleCancelRide}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Text style={s.cancelRideBtnText}>Cancelar viaje</Text>
                </TouchableOpacity>
              )}
              {ride.status === 'in_progress' && (
                <View style={s.infoBtn}>
                  <Text style={s.infoBtnTxt}>Viaje en curso</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <ConfirmBottomSheet
        visible={showArrivedConfirmModal && ride.status === 'accepted'}
        title="¿Llegaste a recogida?"
        message="Confirma que estás en el punto acordado con el pasajero."
        confirmLabel="Sí, ya llegué"
        cancelLabel="Todavía no"
        loading={isLoading}
        error={arrivedConfirmError}
        onConfirm={confirmArrived}
        onCancel={() => {
          setShowArrivedConfirmModal(false);
          setArrivedConfirmError('');
        }}
      />
      <ConfirmBottomSheet
        visible={showCompleteConfirmModal && ride.status === 'in_progress'}
        title="¿Finalizar viaje?"
        message="Confirma que el pasajero llegó a su destino."
        confirmLabel="Finalizar viaje"
        cancelLabel="Seguir viaje"
        loading={isLoading}
        error={completeConfirmError}
        onConfirm={confirmCompleteRide}
        onCancel={() => {
          setShowCompleteConfirmModal(false);
          setCompleteConfirmError('');
        }}
      />
      <ConfirmBottomSheet
        visible={showEmergencyConfirmModal}
        title="¿Estás en una emergencia?"
        message="El envío de alertas a tus contactos y a la central todavía no está disponible. Por ahora, confirmar solo cerrará este aviso."
        confirmLabel="Sí, confirmar"
        cancelLabel="Cancelar"
        onConfirm={() => setShowEmergencyConfirmModal(false)}
        onCancel={() => setShowEmergencyConfirmModal(false)}
      />

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
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          if (isLoading) return;
          if (cancelStep === 'confirm') setCancelStep('reasons');
          else setShowCancelModal(false);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={[s.sheet, s.cancelSheet, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
            <View style={s.cancelHeaderRow}>
              {cancelStep === 'confirm' ? (
                <TouchableOpacity
                  style={s.cancelHeaderButton}
                  onPress={() => setCancelStep('reasons')}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a los motivos"
                >
                  <ArrowLeft size={23} color="#111118" strokeWidth={2.3} />
                </TouchableOpacity>
              ) : <View style={s.cancelHeaderButton} />}
              <View style={s.cancelSheetHandle} />
              {cancelStep === 'reasons' ? (
                <TouchableOpacity
                  style={s.cancelHeaderButton}
                  onPress={() => setShowCancelModal(false)}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar motivos de cancelación"
                >
                  <X size={23} color="#111118" strokeWidth={2.3} />
                </TouchableOpacity>
              ) : <View style={s.cancelHeaderButton} />}
            </View>

            {cancelStep === 'reasons' ? (
              <>
                <Text style={s.cancelSheetTitle}>¿Por qué cancelas el viaje?</Text>
                <Text style={s.cancelSheetSubtitle}>Selecciona un motivo o continúa sin indicarlo.</Text>
                <ScrollView
                  style={s.cancelReasonsScroll}
                  contentContainerStyle={s.cancelReasonsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {cancellationReasons.length === 0 && (
                    <Text style={s.cancelEmpty}>No hay motivos disponibles.</Text>
                  )}
                  {cancellationReasons.map((reason, index) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={[
                        s.reasonBtn,
                        index < cancellationReasons.length - 1 && s.reasonBtnDivider,
                        selectedCancelReasonId === reason.id && s.reasonBtnSelected,
                      ]}
                      onPress={() => {
                        setSelectedCancelReasonId(reason.id);
                        setCancelStep('confirm');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[s.reasonTxt, selectedCancelReasonId === reason.id && s.reasonTxtSelected]}
                      >
                        {reason.description}
                      </Text>
                      <ChevronRight size={18} color="#8D8098" strokeWidth={2} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={s.cancelActions}>
                  <TouchableOpacity
                    style={s.cancelBackBtn}
                    onPress={() => {
                      setSelectedCancelReasonId(null);
                      setCancelStep('confirm');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.cancelBackText}>Omitir</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={s.cancelSheetTitle}>¿Cancelar el viaje?</Text>
                <Text style={s.cancelSheetSubtitle}>
                  Si confirmas, este viaje se cancelará para ambos.
                </Text>
                <View style={s.cancelActions}>
                  <TouchableOpacity
                    style={s.cancelBackBtn}
                    onPress={() => setShowCancelModal(false)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <Text style={s.cancelBackText}>Seguir buscando</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.cancelConfirmBtn, isLoading && s.cancelConfirmBtnDisabled]}
                    onPress={handleConfirmCancel}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={T.white} />
                    ) : (
                      <Text style={s.cancelConfirmText}>Quiero cancelar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
      <Toast
        message={confirmationMessage}
        visible={!!confirmationMessage}
        position="top"
        onHide={() => setConfirmationMessage('')}
      />
    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.white },
  cancelledScreen: { flex: 1, backgroundColor: T.white },
  cancelledContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  cancelledIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  cancelledTitle: { fontSize: 25, fontWeight: '700', color: T.ink, textAlign: 'center' },
  cancelledMessage: { fontSize: 16, lineHeight: 23, color: T.inkMid, textAlign: 'center', marginTop: 10 },
  cancelledReturn: { fontSize: 13, color: T.inkLight, textAlign: 'center', marginTop: 28 },
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
  mapWrap: { flex: 1, overflow: 'hidden', backgroundColor: T.bg },
  map: { flex: 1 },
  carMapMarker: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // La rotación se aplica al marcador nativo para no recortar el taxi.
  mapIconMarker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mapStatusBanner: { position: 'absolute', alignSelf: 'center', maxWidth: '92%', marginHorizontal: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: T.ink },
  mapRouteError: { position: 'absolute', alignSelf: 'center', maxWidth: '92%', borderRadius: 10, backgroundColor: T.white, paddingHorizontal: 14, paddingVertical: 10, elevation: 4 },
  mapRouteErrorText: { color: T.danger, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  mapStatusText: { fontSize: 15, fontWeight: '700', color: T.white, textAlign: 'center' },
  mapControls: { position: 'absolute', bottom: 35, right: 10, alignItems: 'center', gap: 10, zIndex: 15 },
  mapControlButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
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
    maxHeight: '60%',
    flexShrink: 1,
  },
  panelHandle: { width: 32, height: 3, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  panelScroll: { flexShrink: 1 },
  panelContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },

  // Person
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
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
  personInfo: { flex: 1, minWidth: 0 },
  personName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 0,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: T.accentSoft, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginTop: 4 },
  ratingText: { fontSize: 11, color: T.accent, fontWeight: '800' },
  subText: { fontSize: 11.5, color: '#64748B', fontWeight: '500', flexShrink: 1 },
  vehicleRow: {
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 1,
  },
  plateBadge: {
    backgroundColor: '#111118',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  fareBlock: { alignItems: 'flex-end', maxWidth: '42%', flexShrink: 1 },
  fareLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 0.4, marginBottom: 3 },
  fareValue: { fontSize: 35, fontWeight: '900', color: '#000000', fontFamily: 'Montserrat', lineHeight: 38 },

  // Route
  routeCard: {
    backgroundColor: T.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeIconSlot: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routeStopMarker: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  routeTexts: { flex: 1 },
  routeAddr: {
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 19,
  },
  vSep: { paddingLeft: 14.25, paddingVertical: 2 },
  vLine: { width: 1.5, height: 6, backgroundColor: '#CBD5E1' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111118',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  statSep: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.28)' },
  statVal: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Actions
  actionsWrap: { gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.accent,
  },
  primaryBtnTxt: {
    fontSize: 19,
    fontWeight: '800',
    color: T.white,
    letterSpacing: 0.2,
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.accentSoft,
    borderWidth: 1,
    borderColor: T.accentSoft,
  },
  infoBtnTxt: { fontSize: 19, fontWeight: '700', color: T.accent },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
  },
  dangerBtnTxt: { fontSize: 16, fontWeight: '700', color: T.danger },
  cancelRideBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelRideBtnText: { fontSize: 19, fontWeight: '700', color: '#111118' },
  reasonBtn: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonBtnDivider: { borderBottomWidth: 1, borderBottomColor: '#E9E5ED' },
  reasonBtnSelected: {
    backgroundColor: '#F3EAFC',
    borderRadius: 10,
  },
  reasonTxt: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: '#111118',
    fontWeight: '600',
  },
  reasonTxtSelected: {
    color: '#321348',
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
  readyBadgeTxt: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: T.success },

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
  cancelSheet: { paddingTop: 12 },
  cancelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cancelHeaderButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cancelSheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA' },
  cancelSheetTitle: { fontSize: 22, fontWeight: '700', color: '#111118', textAlign: 'center' },
  cancelSheetSubtitle: { fontSize: 15, lineHeight: 21, color: '#7A7A8A', textAlign: 'center', marginTop: 8, marginBottom: 18 },
  cancelReasonsScroll: { maxHeight: 300, width: '100%', backgroundColor: '#F7F7F9', borderRadius: 14, borderWidth: 1, borderColor: '#ECE8F0' },
  cancelReasonsContent: { padding: 4 },
  cancelEmpty: { fontSize: 15, color: '#7A7A8A', textAlign: 'center', paddingVertical: 20 },
  cancelActions: { gap: 10, marginTop: 18 },
  cancelConfirmBtn: { minHeight: 54, borderRadius: 12, backgroundColor: '#7514C5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancelConfirmBtnDisabled: { opacity: 0.5 },
  cancelConfirmText: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  cancelBackBtn: { minHeight: 54, borderRadius: 12, backgroundColor: '#F2F2F5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancelBackText: { fontSize: 19, fontWeight: '700', color: '#111118', textAlign: 'center' },
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
  fareBoxVal: { fontSize: 24, fontWeight: '800', color: '#000000' },
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
