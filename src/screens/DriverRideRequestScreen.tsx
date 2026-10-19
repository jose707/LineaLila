import { startAdaptiveSync } from '../utils/adaptiveSync';
import { offerSecondsLeft } from '../utils/offerCountdown';
import { privateImageSource } from '../utils/privateImageSource';
import QuickReservationCard from '../components/QuickReservationCard';
import Toast from '../components/Toast';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from '../components/MapLocationIcons';
import { QuickAssignmentRide } from '../types/quickAssignment';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Image,
  RefreshControl,
  Platform,
  AppState,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, LatLng, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  CircleHelp,
  History,
  Menu,
  MessageCircle,
  Settings,
  User,
  Power,
  Radio,
  Clock3,
  CircleX,
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import useRides from '../hooks/useRides';
import { ridesService } from '../services/rides.service';
import socketService from '../services/socket.service';
import { disconnectDriverInBackground } from '../services/driverAvailability.service';

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  primaryMid: '#A855F7',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  overlay: 'rgba(15, 23, 42, 0.6)',
};

const LOCATIONIQ_API_KEY = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

interface RideRequest {
  id: string;
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  passengerProfilePhoto?: string | null;
  passengerRating: number;
  pickupLocation: { latitude: number; longitude: number; address: string };
  dropoffLocation: { latitude: number; longitude: number; address: string };
  waypoints?: { latitude: number; longitude: number; address: string; sequence: number }[];
  fare: number;
  distance: number;
  duration: number;
  notes?: string;
  createdAt?: string;
  expiresAt?: string;
}

// ─── Passenger Avatar ─────────────────────────────────────────────────────────
const PassengerAvatar = ({
  photo,
  name,
  size = 40,
}: {
  photo?: string | null;
  name: string;
  size?: number;
}) => {
  const letters = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const radius = size / 2;
  if (photo) {
    return (
      <Image
        source={privateImageSource(photo)}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: THEME.border,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: THEME.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.35,
          fontWeight: '700',
          color: THEME.primary,
        }}
      >
        {letters}
      </Text>
    </View>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => <View style={styles.divider} />;

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────
const DriverRideRequestScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user, isDriverMode } = useAuth();
  const { getRideRequests } = useRides();

  // Restricción: DriverRideRequestScreen solo para conductores
  useFocusEffect(
    React.useCallback(() => {
      if (!isDriverMode) {
        Alert.alert(
          'Acceso denegado',
          'Solo los conductores aprobados pueden aceptar viajes. Cambia a modo conductor en tu perfil.',
          [
            {
              text: 'Ir a perfil',
              onPress: () => navigation.navigate('Profile'),
            },
          ],
        );
        // Redirigir a Map
        (navigation as any).navigate('Map');
      }
    }, [isDriverMode, navigation]),
  );

  const [isAvailable, setIsAvailable] = useState(() => socketService.isDriverOnline());
  const [quickReservation, setQuickReservation] = useState<QuickAssignmentRide | null>(null);
  const [quickOffset, setQuickOffset] = useState(0);
  const [reservationNotice, setReservationNotice] = useState('');
  const quickReservationRef = useRef<QuickAssignmentRide | null>(null);
  const quickNavigationRef = useRef<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    let refreshing = false;
    quickNavigationRef.current = null;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const { ride, serverTime } = await ridesService.currentQuick('driver');
        if (!active) return;
        setQuickOffset(Date.parse(serverTime) - Date.now());
        if (ride?.status === 'requested') {
          quickReservationRef.current = ride;
          setQuickReservation(ride);
          setReservationNotice('');
          setShowDetailsModal(false);
          setSelectedRide(null);
          setShowWaitingOverlay(false);
          setWaitingRide(null);
          if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
          setRides([]);
          socketRequestsRef.current.clear();
        } else {
          if (quickReservationRef.current && !ride) setReservationNotice('Vuelves a estar en línea');
          quickReservationRef.current = null;
          setQuickReservation(null);
          if (ride && quickNavigationRef.current !== ride.id) {
            quickNavigationRef.current = ride.id;
            navigation.navigate('ActiveRide', { rideId: ride.id });
          }
        }
      } catch { /* Keep a known reservation blocked until the server confirms its release. */ }
      finally { refreshing = false; }
    };
    const stop = startAdaptiveSync(refresh, () =>
      quickReservationRef.current ? 2000 : isAvailable && !socketService.isConnected() ? 5000 : null,
      ['ride:assignment'],
    );
    return () => { active = false; stop(); };
  }, [navigation, isAvailable]));

  const [isLoading, setIsLoading] = useState(true);
  const [availabilityPending, setAvailabilityPending] = useState<'online' | 'offline' | null>(null);
  const availabilityChangeRef = useRef(false);
  const confirmedAvailabilityRef = useRef<boolean | null>(null);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [detailMapReady, setDetailMapReady] = useState(false);
  const [detailMapLaidOut, setDetailMapLaidOut] = useState(false);
  const [showWaitingOverlay, setShowWaitingOverlay] = useState(false);
  const [waitingRide, setWaitingRide] = useState<RideRequest | null>(null);
  const [waitingPrice, setWaitingPrice] = useState<number | null>(null);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(0);
  const [currentOfferId, setCurrentOfferId] = useState<string | null>(null);
  const [offerRejected, setOfferRejected] = useState(false);
  const [offerStatus, setOfferStatus] = useState<
    'waiting' | 'rejected' | 'expired'
  >('waiting');

  const mapRef = useRef<MapView>(null);
  const routeRequestRef = useRef(0);
  const waitingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingExpiresAtRef = useRef<string | null>(null);
  const waitingServerOffsetRef = useRef(0);

  const isMountedRef = useRef(true);
  const socketRequestsRef = useRef(new Map<string, { ride: RideRequest; expiresAt: number }>());
  const requestsRevisionRef = useRef(0);
  const rejectedRideIdsRef = useRef(new Set<string>());
  const showDetailsModalRef = useRef(false);
  const selectedRideRef = useRef<RideRequest | null>(null);

  useEffect(() => {
    showDetailsModalRef.current = showDetailsModal;
    selectedRideRef.current = selectedRide;
  }, [showDetailsModal, selectedRide]);

  const removeRejectedRide = useCallback((rideId: string) => {
    rejectedRideIdsRef.current.add(rideId);
    socketRequestsRef.current.delete(rideId);
    requestsRevisionRef.current++;
    setRides(previous => previous.filter(ride => ride.rideId !== rideId));
    if (selectedRideRef.current?.rideId === rideId) {
      setShowDetailsModal(false);
      setSelectedRide(null);
      setRouteCoordinates([]);
    }
  }, []);

  useEffect(() => {
    const handleRejectedOffer = (data: any) => {
      if (data?.accepted === false && data?.rideId) removeRejectedRide(data.rideId);
    };
    socketService.on('offer:result', handleRejectedOffer);
    return () => socketService.off('offer:result', handleRejectedOffer);
  }, [removeRejectedRide]);

  useEffect(() => socketService.onAvailabilityRestored(() => setIsAvailable(true)), []);

  useEffect(() => {
    if (!isDriverMode) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'background') return;
      if (socketService.hasActiveRide() || socketService.shouldRestoreAfterRideBackground()) return;
      confirmedAvailabilityRef.current = false;
      setIsAvailable(false);
      setRides([]);
      socketRequestsRef.current.clear();
    });
    return () => subscription.remove();
  }, [isDriverMode]);

  // 🔌 Socket: sincronizar disponibilidad del conductor
  useEffect(() => {
    if (!isDriverMode) return;
    if (confirmedAvailabilityRef.current === isAvailable) {
      confirmedAvailabilityRef.current = null;
      return;
    }
    let active = true;
    if (isAvailable) {
      // Intentar obtener posición GPS real antes de ponerse online
      Geolocation.getCurrentPosition(
        (pos: { coords: { latitude: number; longitude: number } }) => {
          if (!active || AppState.currentState !== 'active') return;
          socketService.goOnline({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Si no hay GPS disponible, ponerse online sin coordenadas
          if (active && AppState.currentState === 'active') socketService.goOnline();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
      );
    } else {
      socketService.goOffline();
    }
    return () => { active = false; };
  }, [isAvailable, isDriverMode]);

  useEffect(() => {
    if (!isAvailable || !isDriverMode) return;
    let active = true;
    const refreshLocation = () => Geolocation.getCurrentPosition(
      position => { if (active && AppState.currentState === 'active' && !availabilityChangeRef.current) socketService.goOnline({ latitude: position.coords.latitude, longitude: position.coords.longitude }); },
      () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
    const timer = setInterval(refreshLocation, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [isAvailable, isDriverMode]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;

      if (isAvailable && !showWaitingOverlay && !quickReservation) {
        const stopSync = startAdaptiveSync(loadRideRequests,
          () => socketService.isConnected() ? null : 5000);

        // 🔌 Socket: recibir nuevas solicitudes en tiempo real
        const handleNewRequest = (data: any) => {
          if (!isMountedRef.current || !isAvailable || rejectedRideIdsRef.current.has(data?.rideId)) return;
          const newRide: RideRequest = {
            id: data.rideId,
            rideId: data.rideId,
            passengerName: data.passengerName || 'Pasajero',
            passengerPhone: data.passengerPhone || '',
            passengerProfilePhoto: data.passengerProfilePhoto || null,
            passengerRating: data.passengerRating || 5.0,
            pickupLocation: {
              latitude: data.pickupLocation?.latitude ?? -16.5,
              longitude: data.pickupLocation?.longitude ?? -68.15,
              address: data.pickupAddress || 'Ubicación de recogida',
            },
            dropoffLocation: {
              latitude: data.dropoffLocation?.latitude ?? -16.4,
              longitude: data.dropoffLocation?.longitude ?? -68.1,
              address: data.dropoffAddress || 'Ubicación de destino',
            },
            waypoints: (data.waypoints ?? []).map((stop: any, index: number) => ({
              latitude: stop.latitude,
              longitude: stop.longitude,
              address: stop.address,
              sequence: stop.sequence ?? index + 1,
            })),
            fare: data.fare ?? 0,
            distance: (data.distance ?? 0) / 1000,
            duration: Math.floor((data.duration ?? 0) / 60),
            createdAt: data.createdAt || new Date().toISOString(),
            expiresAt: data.expiresAt,
          };
          const serverExpiry = Date.parse(data.expiresAt);
          socketRequestsRef.current.set(data.rideId, {
            ride: newRide,
            expiresAt: Number.isFinite(serverExpiry) ? serverExpiry : Date.now() + 120000,
          });
          requestsRevisionRef.current++;
          setRides(prev => prev.some(ride => ride.rideId === data.rideId) ? prev : [newRide, ...prev]);
          setIsLoading(false);
        };

        socketService.on('ride:new_request', handleNewRequest);

        // 🔌 Socket: quitar solicitud cancelada de la lista
        const handleRideCancelled = (data: any) => {
          if (!isMountedRef.current || !data?.rideId) return;
          socketRequestsRef.current.delete(data.rideId);
          requestsRevisionRef.current++;
          setRides(prev => prev.filter(r => r.rideId !== data.rideId));
          // Si el modal de detalles está mostrando ese viaje, cerrarlo
          if (showDetailsModalRef.current && selectedRideRef.current?.rideId === data.rideId) {
            setShowDetailsModal(false);
            setSelectedRide(null);
            setRouteCoordinates([]);
          }
        };

        socketService.on('ride:request:cancelled', handleRideCancelled);

        return () => {
          stopSync();
          requestsRevisionRef.current++;
          socketService.off('ride:new_request', handleNewRequest);
          socketService.off('ride:request:cancelled', handleRideCancelled);

        };
      }

      return () => {};
    }, [isAvailable, showWaitingOverlay, quickReservation]),
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
    };
  }, []);

  // Remove expired cards locally without network requests.
  useEffect(() => {
    const deadlines = rides.map(ride => Date.parse(ride.expiresAt ?? '')).filter(Number.isFinite);
    if (!deadlines.length) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setRides(previous => previous.filter(ride => !ride.expiresAt || Date.parse(ride.expiresAt) > now));
      for (const [id, entry] of socketRequestsRef.current) {
        if (entry.expiresAt <= now) socketRequestsRef.current.delete(id);
      }
    }, Math.max(0, Math.min(...deadlines) - Date.now()));
    return () => clearTimeout(timer);
  }, [rides]);

  // Synchronize on focus, reconnection, foreground, or socket fallback.
  const loadRideRequests = useCallback(async () => {
    if (!isMountedRef.current || quickReservationRef.current) return;
    const startedAtRevision = requestsRevisionRef.current;
    setIsLoading(true);
    try {
      const requests = await getRideRequests();
      if (!isMountedRef.current || quickReservationRef.current || startedAtRevision !== requestsRevisionRef.current) return;
      const transformed = (requests || []).filter((req: any) => !rejectedRideIdsRef.current.has(req.rideId)).map((req: any) => ({
        id: req.rideId,
        rideId: req.rideId,
        passengerName: req.passengerName || 'Pasajero',
        passengerPhone: req.passengerPhone || '',
        passengerProfilePhoto: req.passengerProfilePhoto || null,
        passengerRating: req.passengerRating || 5.0,
        pickupLocation: {
          latitude: req.pickupLocation?.latitude ?? -16.5,
          longitude: req.pickupLocation?.longitude ?? -68.15,
          address: req.pickupLocation?.address || 'Ubicación de recogida',
        },
        dropoffLocation: {
          latitude: req.dropoffLocation?.latitude ?? -16.4,
          longitude: req.dropoffLocation?.longitude ?? -68.1,
          address: req.dropoffLocation?.address || 'Ubicación de destino',
        },
        waypoints: (req.waypoints ?? []).map((stop: any, index: number) => ({
          latitude: stop.latitude,
          longitude: stop.longitude,
          address: stop.address,
          sequence: stop.sequence ?? index + 1,
        })).sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence),
        fare: req.fare ?? 0,
        distance: (req.distance ?? 0) / 1000,
        duration: Math.floor((req.duration ?? 0) / 60),
        createdAt: req.createdAt || new Date().toISOString(),
        expiresAt: req.expiresAt,
      }));
      const serverIds = new Set<string>(transformed.map((ride: RideRequest) => ride.rideId));
      for (const [id, pendingRide] of socketRequestsRef.current) {
        if (serverIds.has(id) || pendingRide.expiresAt <= Date.now()) {
          socketRequestsRef.current.delete(id);
        }
      }
      const socketOnly = Array.from(socketRequestsRef.current.values())
        .map(entry => entry.ride)
        .filter(ride => !rejectedRideIdsRef.current.has(ride.rideId));
      setRides([...socketOnly, ...transformed]);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('[loadRideRequests]', error.message);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [getRideRequests]);

  const decodePolyline = (encoded: string): LatLng[] => {
    const points: LatLng[] = [];
    let index = 0,
      lat = 0,
      lng = 0;
    while (index < encoded.length) {
      let result = 0,
        shift = 0,
        b;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      result = 0;
      shift = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const calculateRouteForRide = useCallback(async (ride: RideRequest) => {
    const requestVersion = ++routeRequestRef.current;
    try {
      setMapLoading(true);
      const routePoints = [ride.pickupLocation, ...(ride.waypoints ?? []), ride.dropoffLocation];
      const url = `${LOCATIONIQ_BASE_URL}/directions/driving/${routePoints.map(point => `${point.longitude},${point.latitude}`).join(';')}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (requestVersion !== routeRequestRef.current) return;
      if (data.routes?.length > 0) {
        const coords = decodePolyline(data.routes[0].geometry);
        setRouteCoordinates(coords);
      }
    } catch {
      if (requestVersion === routeRequestRef.current) setRouteCoordinates([
        ride.pickupLocation,
        ...(ride.waypoints ?? []),
        ride.dropoffLocation,
      ]);
    } finally {
      if (requestVersion === routeRequestRef.current) setMapLoading(false);
    }
  }, []);

  const handleSelectRide = (ride: RideRequest) => {
    if (quickReservationRef.current) return;
    setRouteCoordinates([]);
    setSelectedRide(ride);
    setShowDetailsModal(true);
    calculateRouteForRide(ride);
  };

  useEffect(() => {
    if (!showDetailsModal || !selectedRide || !detailMapReady || !detailMapLaidOut) return;
    const points = routeCoordinates.length > 1
      ? routeCoordinates
      : [selectedRide.pickupLocation, selectedRide.dropoffLocation];
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 42, right: 44, bottom: 42, left: 44 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [showDetailsModal, selectedRide, routeCoordinates, detailMapReady, detailMapLaidOut]);

  const handleCloseModal = () => {
    routeRequestRef.current++;
    setShowDetailsModal(false);
    setSelectedRide(null);
    setRouteCoordinates([]);
  };

  useEffect(() => {
    if (!selectedRide || !showDetailsModal) return;
    if (!rides.some(r => r.id === selectedRide.id)) {
      Alert.alert(
        'Solicitud no disponible',
        'Esta solicitud fue cancelada o expiró.',
        [{ text: 'Entendido', onPress: handleCloseModal }],
      );
    }
  }, [rides, selectedRide, showDetailsModal]);

  useEffect(() => {
    if (!showWaitingOverlay || !waitingRide) return;

    // 🔌 Resultado de oferta en tiempo real via WebSocket
    const handleOfferResult = (data: any) => {
      if (data?.rideId !== waitingRide?.rideId) return;
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
      if (data.accepted) {
        setShowWaitingOverlay(false);
        setWaitingRide(null);
        setWaitingPrice(null);
        setCurrentOfferId(null);
        setOfferRejected(false);
        setOfferStatus('waiting');
        navigation.navigate('ActiveRide', {
          rideId: waitingRide.rideId,
          confirmationMessage: '¡Oferta aceptada!',
        });
      } else {
        setOfferStatus('rejected');
        setOfferRejected(true);
        setCurrentOfferId(null);
        setTimeout(() => {
          setShowWaitingOverlay(false);
          setOfferRejected(false);
          setOfferStatus('waiting');
          setWaitingRide(null);
          setWaitingPrice(null);
        }, 2500);
      }
    };

    const handleRideStatusChanged = (data: any) => {
      if (data?.rideId !== waitingRide?.rideId) return;
      if (data.status === 'cancelled' || data.status === 'expired') {
        if (waitingTimerRef.current) {
          clearInterval(waitingTimerRef.current);
          waitingTimerRef.current = null;
        }
        setOfferStatus('rejected');
        setOfferRejected(true);
        setCurrentOfferId(null);
        setTimeout(() => {
          setShowWaitingOverlay(false);
          setOfferRejected(false);
          setOfferStatus('waiting');
          setWaitingRide(null);
          setWaitingPrice(null);
        }, 2500);
      }
    };

    socketService.on('offer:result', handleOfferResult);
    socketService.on('ride:status:changed', handleRideStatusChanged);

    return () => {
      socketService.off('offer:result', handleOfferResult);
      socketService.off('ride:status:changed', handleRideStatusChanged);
    };
  }, [showWaitingOverlay, waitingRide]);

  const handleSubmitOffer = async (ride: RideRequest, price: number) => {
    if (quickReservationRef.current) return;
    setAcceptingRideId(ride.id);
    try {
      const response = await ridesService.submitCounterOffer(ride.id, price);
      const offerId = response?.offerId || `${ride.id}-${Date.now()}`;

      const expiresAt = response?.expiresAt;
      if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) {
        throw new Error('No se recibió el vencimiento de la oferta.');
      }
      waitingExpiresAtRef.current = expiresAt;
      waitingServerOffsetRef.current = response.serverOffsetMs ?? 0;

      setCurrentOfferId(offerId);
      setOfferRejected(false);
      setShowDetailsModal(false);
      setSelectedRide(null);
      setRouteCoordinates([]);
      setWaitingRide(ride);
      setWaitingPrice(price);
      setShowWaitingOverlay(true);
      setWaitingTimeLeft(offerSecondsLeft(expiresAt, Date.now(), waitingServerOffsetRef.current));
      setOfferStatus('waiting');

      if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
      waitingTimerRef.current = setInterval(() => {
        const remaining = offerSecondsLeft(
          waitingExpiresAtRef.current ?? undefined,
          Date.now(),
          waitingServerOffsetRef.current,
        );
        setWaitingTimeLeft(remaining);
        if (remaining === 0) {
            if (waitingTimerRef.current) {
              clearInterval(waitingTimerRef.current);
              waitingTimerRef.current = null;
            }
            // Oferta expiró por tiempo — mostrar mensaje y volver a lista
            setOfferStatus('expired');
            setOfferRejected(true);
            setTimeout(() => {
              setShowWaitingOverlay(false);
              setOfferRejected(false);
              setOfferStatus('waiting');
              setWaitingRide(null);
              setWaitingPrice(null);
              setCurrentOfferId(null);
            }, 2500);
            setAcceptingRideId(null);
        }
      }, 1000);
      setAcceptingRideId(null);
    } catch (error: any) {
      if (error?.data?.code === 'OFFER_REJECTED') removeRejectedRide(ride.id);
      else Alert.alert('Error', error?.data?.error || error?.message || 'No se pudo enviar la oferta');
      setAcceptingRideId(null);
    }
  };

  // ─── Ride Card (Ultra Modern & Minimalist) ──────────────────────────────────
  const renderRideCard = ({ item }: { item: RideRequest }) => {
    const isThisAccepting = acceptingRideId === item.id;
    return (
      <View style={styles.modernCard}>
        {/* Main card body clickable to open map/details */}
        <TouchableOpacity style={styles.cardHeaderArea} onPress={() => handleSelectRide(item)} activeOpacity={0.8}>
          <View style={styles.cardPassengerRow}>
            <PassengerAvatar photo={item.passengerProfilePhoto} name={item.passengerName} size={38} />
            <View style={styles.cardPassengerInfo}>
              <Text style={styles.cardPassengerName} numberOfLines={1}>{item.passengerName}</Text>
              <View style={styles.tripMetaRow}>
                <View style={styles.starRatingBadge}>
                  <Text style={styles.starIcon}>★</Text>
                  <Text style={styles.starText}>{item.passengerRating.toFixed(1)}</Text>
                </View>
                <Text style={styles.metaBullet}>•</Text>
                <Text style={styles.tripMetaText}>{item.distance.toFixed(1)} km</Text>
                <Text style={styles.metaBullet}>•</Text>
                <Text style={styles.tripMetaText}>~{item.duration} min</Text>
              </View>
            </View>
            <View style={styles.cardPriceBox}>
              <Text style={styles.cardPriceAmount}>Bs {item.fare.toFixed(2)}</Text>
              <Text style={styles.cardPriceSub}>Tarifa ofrecida</Text>
            </View>
          </View>

          <View style={styles.cardRouteTimeline}>
            <View style={styles.routeRow}>
              <View style={styles.routeIcon}><PassengerMapIcon size={28} bare /></View>
              <Text style={styles.routeAddressText} numberOfLines={1}>{item.pickupLocation.address}</Text>
            </View>
            <View style={styles.routeLineConnector} />
            {(item.waypoints ?? []).map(stop => (
              <React.Fragment key={stop.sequence}>
                <View style={styles.routeRow}>
                  <View style={styles.routeIcon}><WaypointMapIcon number={stop.sequence} size={28} /></View>
                  <Text style={styles.routeAddressText} numberOfLines={1}>{stop.address}</Text>
                </View>
                <View style={styles.routeLineConnector} />
              </React.Fragment>
            ))}
            <View style={styles.routeRow}>
              <View style={styles.routeIcon}><DestinationFlagIcon size={28} bare /></View>
              <Text style={styles.routeAddressText} numberOfLines={1}>{item.dropoffLocation.address}</Text>
            </View>
          </View>

          {item.notes ? (
            <View style={styles.cardNotesBadge}>
              <MessageCircle size={13} color={THEME.primary} />
              <Text style={styles.cardNotesText} numberOfLines={1}>"{item.notes}"</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.cardActionsContainer}>
          <View style={styles.cardPrimaryRow}>
            <TouchableOpacity
              style={styles.cardPrimaryAcceptBtn}
              onPress={() => handleSubmitOffer(item, item.fare)}
              disabled={acceptingRideId !== null}
              activeOpacity={0.85}
            >
              {isThisAccepting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.cardPrimaryAcceptText}>
                  Aceptar • Bs {item.fare.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardIncrementBtn}
              onPress={() => handleSubmitOffer(item, item.fare + 2)}
              disabled={acceptingRideId !== null}
              activeOpacity={0.85}
              accessibilityLabel={`Ofertar ${item.fare + 2} bolivianos`}
            >
              <Text style={styles.cardIncrementText}>+2</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardIncrementBtn}
              onPress={() => handleSubmitOffer(item, item.fare + 5)}
              disabled={acceptingRideId !== null}
              activeOpacity={0.85}
              accessibilityLabel={`Ofertar ${item.fare + 5} bolivianos`}
            >
              <Text style={styles.cardIncrementText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleAvailabilityChange = async (online: boolean) => {
    if (online === isAvailable || availabilityChangeRef.current) return;
    availabilityChangeRef.current = true;
    setAvailabilityPending(online ? 'online' : 'offline');

    try {
      const coords = online
        ? await new Promise<{ latitude: number; longitude: number } | undefined>(resolve => {
            Geolocation.getCurrentPosition(
              position => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
              () => resolve(undefined),
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
            );
          })
        : undefined;
      if (online && AppState.currentState !== 'active') return;
      const confirmed = await socketService.confirmDriverAvailability(online, coords);
      if (confirmed) {
        if (online && AppState.currentState !== 'active') {
          await disconnectDriverInBackground();
          confirmedAvailabilityRef.current = false;
          setIsAvailable(false);
          return;
        }
        confirmedAvailabilityRef.current = online;
        setIsAvailable(online);
      } else {
        Alert.alert(
          'No se pudo cambiar el servicio',
          'Comprueba tu conexión e inténtalo de nuevo.',
        );
      }
    } catch {
      Alert.alert(
        'No se pudo cambiar el servicio',
        'Ocurrió un error. Inténtalo de nuevo.',
      );
    } finally {
      availabilityChangeRef.current = false;
      setAvailabilityPending(null);
    }
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyStateArea, !isAvailable && styles.emptyStateAreaOffline]}>
      <View style={[styles.emptyStateCard, !isAvailable && styles.emptyStateCardOffline]}>
        <View style={styles.emptyStateTopRow}>
          <View style={[styles.emptyStateIcon, !isAvailable && styles.emptyStateIconOffline]}>
            {isAvailable ? (
              isLoading ? <ActivityIndicator size="small" color={THEME.primary} /> : <Radio size={28} color={THEME.primary} />
            ) : (
              <Power size={28} color="#64748B" />
            )}
          </View>
          <View style={[styles.emptyStateBadge, !isAvailable && styles.emptyStateBadgeOffline]}>
            <View style={[styles.emptyStateDot, !isAvailable && styles.emptyStateDotOffline]} />
            <Text style={[styles.emptyStateBadgeText, !isAvailable && styles.emptyStateBadgeTextOffline]}>
              {isAvailable ? 'EN LÍNEA' : 'DESCONECTADO'}
            </Text>
          </View>
        </View>
        <Text style={styles.emptyStateTitle}>
          {isAvailable ? (isLoading ? 'Buscando ofertas cercanas' : 'Sin ofertas por ahora') : 'Estás fuera de servicio'}
        </Text>
        <Text style={styles.emptyStateDescription}>
          {isAvailable
            ? 'Las nuevas solicitudes de viaje en tu zona aparecerán aquí.'
            : 'Mientras estés desconectado no recibirás solicitudes de viaje.'}
        </Text>
        <View style={styles.emptyStateDivider} />
        <Text style={styles.emptyStateHint}>
          {isAvailable
            ? 'Mantente en línea para recibir la próxima oferta.'
            : 'Toca «En servicio» abajo para volver a conectarte.'}
        </Text>
      </View>
    </View>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Menu size={20} color={THEME.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Panel conductor</Text>
          <Text
            style={[styles.headerSubtitle, isAvailable && rides.length > 0 && styles.headerSubtitleOffers]}
            numberOfLines={1}
          >
            {!isAvailable
              ? 'Activa el servicio para recibir ofertas'
              : rides.length > 0
                ? `${rides.length} ${rides.length === 1 ? 'oferta disponible' : 'ofertas disponibles'}`
                : isLoading ? 'Buscando ofertas cercanas' : 'Esperando nuevas ofertas'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Support')}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
          accessibilityLabel="Ayuda y Soporte"
        >
          <CircleHelp size={20} color={THEME.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Main Body */}
      <View style={{ flex: 1 }}>
        {!isAvailable ? renderEmptyState() : (
          <FlatList
            data={rides}
            renderItem={renderRideCard}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.list, rides.length === 0 && styles.emptyList]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && rides.length > 0}
                onRefresh={loadRideRequests}
                colors={[THEME.primary]}
                tintColor={THEME.primary}
              />
            }
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </View>

      {/* ── ULTRA-MINIMALIST FLOATING STATUS DOCK ── */}
      <View
        style={[
          styles.floatingDockWrapper,
          Platform.OS === 'android' && Number(Platform.Version) >= 35 && {
            bottom: 16 + Math.max(insets.bottom, 24),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.floatingCapsule}>
          <TouchableOpacity
            style={[
              styles.floatingTab,
              isAvailable && styles.floatingTabActiveOnline,
            ]}
            onPress={() => void handleAvailabilityChange(true)}
            disabled={availabilityPending !== null}
            activeOpacity={0.85}
          >
            {availabilityPending === 'online' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View
                style={[
                  styles.floatingDot,
                  isAvailable ? styles.floatingDotOnline : styles.floatingDotMuted,
                ]}
              />
            )}
            <Text
              style={[
                styles.floatingTabText,
                isAvailable
                  ? styles.floatingTabTextActiveOnline
                  : styles.floatingTabTextMuted,
              ]}
            >
              {availabilityPending === 'online' ? 'Conectando…' : 'En servicio'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.floatingTab,
              !isAvailable && styles.floatingTabActiveOffline,
            ]}
            onPress={() => void handleAvailabilityChange(false)}
            disabled={availabilityPending !== null}
            activeOpacity={0.85}
          >
            {availabilityPending === 'offline' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View
                style={[
                  styles.floatingDot,
                  !isAvailable
                    ? styles.floatingDotOffline
                    : styles.floatingDotMuted,
                ]}
              />
            )}
            <Text
              style={[
                styles.floatingTabText,
                !isAvailable
                  ? styles.floatingTabTextActiveOffline
                  : styles.floatingTabTextMuted,
              ]}
            >
              {availabilityPending === 'offline' ? 'Desconectando…' : 'Desconectado'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Detail Modal */}
      {selectedRide && (
        <Modal
          visible={showDetailsModal}
          transparent
          animationType="slide"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalDismiss}
              onPress={handleCloseModal}
            />
            <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
              <View style={styles.sheetHandle} />

              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Solicitud de viaje</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.mapSection}>
                  <View style={styles.mapSectionHeader}>
                    <Text style={styles.mapSectionTitle}>Recorrido del viaje</Text>
                    <Text style={styles.mapSectionDistance}>{selectedRide.distance.toFixed(1)} km · ~{selectedRide.duration} min</Text>
                  </View>
                  <View style={styles.mapWrap} onLayout={() => setDetailMapLaidOut(true)}>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      mapType="standard"
                      onMapReady={() => setDetailMapReady(true)}
                      initialRegion={{
                        latitude: (selectedRide.pickupLocation.latitude + selectedRide.dropoffLocation.latitude) / 2,
                        longitude: (selectedRide.pickupLocation.longitude + selectedRide.dropoffLocation.longitude) / 2,
                        latitudeDelta: Math.max(0.02, Math.abs(selectedRide.pickupLocation.latitude - selectedRide.dropoffLocation.latitude) * 1.8),
                        longitudeDelta: Math.max(0.02, Math.abs(selectedRide.pickupLocation.longitude - selectedRide.dropoffLocation.longitude) * 1.8),
                      }}
                    >
                      {routeCoordinates.length > 0 && (
                        <Polyline coordinates={routeCoordinates} strokeColor={THEME.primary} strokeWidth={4} lineCap="round" lineJoin="round" />
                      )}
                      <Marker coordinate={selectedRide.pickupLocation} anchor={{ x: 0.5, y: 0.5 }}>
                        <PassengerMapIcon size={40} />
                      </Marker>
                      {(selectedRide.waypoints ?? []).map(stop => (
                        <Marker key={stop.sequence} coordinate={stop} title={`P${stop.sequence}`} description={stop.address} anchor={{ x: 0.5, y: 0.5 }}>
                          <WaypointMapIcon number={stop.sequence} />
                        </Marker>
                      ))}
                      <Marker coordinate={selectedRide.dropoffLocation} anchor={{ x: 0.5, y: 0.5 }}>
                        <DestinationFlagIcon size={40} />
                      </Marker>
                    </MapView>
                    {mapLoading && <View style={styles.mapLoader}><ActivityIndicator color={THEME.primary} /></View>}
                  </View>
                </View>

                <View style={styles.rideOverview}>
                  <View style={styles.passengerSummary}>
                    <PassengerAvatar photo={selectedRide.passengerProfilePhoto} name={selectedRide.passengerName} size={42} />
                    <View style={styles.passengerDetails}>
                      <Text style={styles.detailName}>{selectedRide.passengerName}</Text>
                      <View style={styles.passengerMetaRow}>
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingBadgeStar}>★</Text>
                          <Text style={styles.ratingBadgeVal}>{selectedRide.passengerRating.toFixed(1)}</Text>
                        </View>
                        <Text style={styles.passengerMetaText}>{selectedRide.distance.toFixed(1)} km</Text>
                        <Text style={styles.passengerMetaDivider}>•</Text>
                        <Text style={styles.passengerMetaText}>~{selectedRide.duration} min</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.modalFareBox}>
                    <Text style={styles.modalFareValue}>Bs {selectedRide.fare.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.routeBlock}>
                    <View style={styles.routeItem}>
                      <View style={styles.routeIcon}><PassengerMapIcon size={28} bare /></View>
                      <View style={styles.routeItemContent}>
                        <Text style={styles.routeItemAddr}>{selectedRide.pickupLocation.address}</Text>
                      </View>
                    </View>
                    <View style={styles.routeConnector} />
                    {(selectedRide.waypoints ?? []).map(stop => (
                      <React.Fragment key={stop.sequence}>
                        <View style={styles.routeItem}>
                          <View style={styles.routeIcon}><WaypointMapIcon number={stop.sequence} size={28} /></View>
                          <View style={styles.routeItemContent}>
                            <Text style={styles.routeItemAddr}>{stop.address}</Text>
                          </View>
                        </View>
                        <View style={styles.routeConnector} />
                      </React.Fragment>
                    ))}
                    <View style={styles.routeItem}>
                      <View style={styles.routeIcon}><DestinationFlagIcon size={28} bare /></View>
                      <View style={styles.routeItemContent}>
                        <Text style={styles.routeItemAddr}>{selectedRide.dropoffLocation.address}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {selectedRide.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>NOTA DEL PASAJERO</Text>
                    <Text style={styles.notesText}>{selectedRide.notes}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footerActions}>
                {/* Botones de incremento rápido */}
                <View style={styles.quickChipsContainer}>
                  <View style={styles.chipsRow}>
                    {[2, 5, 7].map(inc => {
                      const offerPrice = selectedRide.fare + inc;
                      return (
                        <TouchableOpacity
                          key={inc}
                          style={styles.chipBtn}
                          onPress={() => {
                            handleCloseModal();
                            handleSubmitOffer(selectedRide, offerPrice);
                          }}
                          disabled={acceptingRideId !== null}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.chipBtnText}>+Bs {inc}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => {
                    handleCloseModal();
                    handleSubmitOffer(selectedRide, selectedRide.fare);
                  }}
                  disabled={acceptingRideId !== null}
                >
                  <Text style={styles.btnPrimaryText}>
                    Aceptar Bs {selectedRide.fare.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {!!quickReservation && <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <ScrollView
          style={styles.quickAssignmentOverlay}
          contentContainerStyle={styles.quickAssignmentContent}
          showsVerticalScrollIndicator={false}
        >
          <QuickReservationCard ride={quickReservation} serverOffset={quickOffset} driver />
        </ScrollView>
      </Modal>}
      {/* Waiting Overlay */}
      {showWaitingOverlay && waitingRide && <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.waitingOverlay}>
          <View style={styles.waitingBg} />
          <View style={styles.waitingSheet}>
            {offerRejected ? (
              /* ── Estado: rechazada / expirada ── */
              offerStatus === 'rejected' ? (
                <View style={styles.rejectedContent}>
                  <View style={styles.resultIconRejected}>
                    <CircleX size={25} color={THEME.primary} strokeWidth={2.3} />
                  </View>
                  <Text style={styles.rejectedTitle}>Oferta rechazada</Text>
                  <Text style={styles.rejectedSubtitle}>Puedes seguir revisando otras solicitudes.</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.resultIconWrap, styles.resultIconExpired]}>
                    <Clock3 size={28} color={THEME.primary} />
                  </View>
                  <Text style={styles.waitingTitle}>Tu oferta expiró</Text>
                  <Text style={[styles.waitingSubtitle, styles.waitingResultSubtitle]}>
                    El pasajero no respondió a tiempo.
                  </Text>
                  <Text style={styles.waitingReturnMessage}>
                    Volviendo a la lista de solicitudes…
                  </Text>
                </>
              )
            ) : (
              <>
                <View style={styles.waitingResponseRow}>
                  <Text style={styles.waitingSubtitle}>
                    Esperando la respuesta de {waitingRide.passengerName}
                  </Text>
                  <View style={styles.waitingTimerWrap}>
                    <Clock3 size={14} color={THEME.primary} />
                    <Text style={styles.waitingTimer}>{waitingTimeLeft}s</Text>
                  </View>
                </View>

                <View style={styles.waitingOfferCard}>
                  <View style={styles.waitingPassengerRow}>
                    <PassengerAvatar
                      photo={waitingRide.passengerProfilePhoto}
                      name={waitingRide.passengerName}
                      size={34}
                    />
                    <View style={styles.waitingRoutePreview}>
                      <Text style={styles.waitingPassengerName} numberOfLines={1}>
                        {waitingRide.passengerName}
                      </Text>
                      <View style={styles.waitingRouteRow}>
                        <PassengerMapIcon size={22} bare />
                        <Text style={styles.waitingRouteAddress} numberOfLines={1}>
                          {waitingRide.pickupLocation.address}
                        </Text>
                      </View>
                      {(waitingRide.waypoints ?? []).map(stop => (
                        <View key={stop.sequence} style={styles.waitingRouteRow}>
                          <WaypointMapIcon number={stop.sequence} size={22} />
                          <Text style={styles.waitingRouteAddress} numberOfLines={1}>
                            {stop.address}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.waitingRouteRow}>
                        <DestinationFlagIcon size={22} bare />
                        <Text style={styles.waitingRouteAddress} numberOfLines={1}>
                          {waitingRide.dropoffLocation.address}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.waitingOfferPriceBlock}>
                    <Text style={styles.waitingOfferLabel}>Tu oferta</Text>
                    <Text style={styles.waitingOfferPrice}>Bs {waitingPrice?.toFixed(2)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>}

      <Toast
        message={reservationNotice}
        visible={!!reservationNotice}
        position="top"
        backgroundColor="#15803D"
        onHide={() => setReservationNotice('')}
      />

    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  divider: { height: 1, backgroundColor: 'rgba(0, 0, 0, 0.04)', marginVertical: 8 },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 6 : 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  headerSubtitleOffers: {
    color: THEME.primary,
  },

  list: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 95,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 0,
  },
  cardHeaderArea: { paddingBottom: 0 },
  cardPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardPassengerInfo: {
    flex: 1,
  },
  cardPassengerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 1,
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  starIcon: {
    color: THEME.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  starText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  metaBullet: { fontSize: 9, color: '#CBD5E1' },
  tripMetaText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  cardPriceBox: {
    alignItems: 'flex-end',
  },
  cardPriceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  cardPriceSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 0,
  },

  cardRouteTimeline: {
    marginTop: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  routeLineConnector: {
    width: 1.5,
    height: 8,
    backgroundColor: '#CBD5E1',
    marginLeft: 13.25,
    marginVertical: 1,
  },
  routeAddressText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    lineHeight: 18,
  },

  cardNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  cardNotesText: {
    fontSize: 11.5,
    color: THEME.primary,
    fontWeight: '500',
    flex: 1,
  },

  cardActionsContainer: {
    marginTop: 8,
  },
  cardPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPrimaryAcceptBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  cardPrimaryAcceptText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardIncrementBtn: {
    width: 50,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  cardIncrementText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },

  // ─── Floating Dock ───
  floatingDockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  floatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 30,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  floatingTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 7,
  },
  floatingTabActiveOnline: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  floatingTabActiveOffline: {
    backgroundColor: '#FFFFFF',
  },
  floatingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  floatingDotOnline: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  floatingDotOffline: {
    backgroundColor: '#94A3B8',
  },
  floatingDotMuted: {
    backgroundColor: '#475569',
  },
  floatingTabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  floatingTabTextActiveOnline: {
    color: '#FFFFFF',
  },
  floatingTabTextActiveOffline: {
    color: '#0F172A',
  },
  floatingTabTextMuted: {
    color: '#64748B',
  },

  // ─── Empty driver states ───
  emptyStateArea: {
    paddingHorizontal: 6,
  },
  emptyStateAreaOffline: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  emptyStateCard: {
    backgroundColor: '#FBF8FF',
    borderWidth: 1,
    borderColor: '#EDE2F7',
    borderRadius: 26,
    padding: 24,
  },
  emptyStateCardOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  emptyStateTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  emptyStateIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#EFE3FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconOffline: {
    backgroundColor: '#E8EDF3',
  },
  emptyStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EDE2F7',
  },
  emptyStateBadgeOffline: {
    backgroundColor: '#E8EDF3',
  },
  emptyStateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  emptyStateDotOffline: {
    backgroundColor: '#94A3B8',
  },
  emptyStateBadgeText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyStateBadgeTextOffline: {
    color: '#64748B',
  },
  emptyStateTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptyStateDescription: {
    color: THEME.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyStateDivider: {
    height: 1,
    backgroundColor: '#E6E0EB',
    marginVertical: 20,
  },
  emptyStateHint: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  quickAssignmentOverlay: { flex: 1, backgroundColor: 'rgba(25, 10, 35, 0.65)' },
  quickAssignmentContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalDismiss: { flex: 1, backgroundColor: THEME.overlay },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 9,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: THEME.text, letterSpacing: -0.4 },
  modalScrollContent: { paddingBottom: 10, gap: 12 },
  mapSection: { gap: 9 },
  mapSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 2 },
  mapSectionTitle: { color: THEME.text, fontSize: 16, fontWeight: '800' },
  mapSectionDistance: { color: THEME.textSecondary, fontSize: 12, fontWeight: '600' },
  modalFareCard: {
    backgroundColor: '#F6F0FC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalFareValue: { fontSize: 33, lineHeight: 38, fontWeight: '900', color: '#000000', letterSpacing: -1 },
  modalFareMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  modalFareMetaText: { fontSize: 12, fontWeight: '700', color: '#5B217A' },
  modalFareMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#A855F7' },
  rideOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  passengerSummary: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  passengerDetails: { flex: 1, marginLeft: 11 },
  detailName: { fontSize: 15, fontWeight: '800', color: THEME.text, marginBottom: 3 },
  passengerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passengerMetaText: { fontSize: 11.5, color: THEME.textSecondary, fontWeight: '600' },
  passengerMetaDivider: { color: '#CBD5E1', fontSize: 10 },
  modalFareBox: { alignItems: 'flex-end', marginLeft: 10 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingBadgeStar: { color: THEME.primary, fontSize: 12 },
  ratingBadgeVal: { fontSize: 13, fontWeight: '800', color: THEME.primary },
  modalSection: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12 },
  routeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  routeSummary: { fontSize: 11, color: THEME.textSecondary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  statUnit: { fontSize: 12, color: THEME.textSecondary, fontWeight: '500' },
  statSep: { width: 1, height: 40, backgroundColor: THEME.border },
  routeBlock: { gap: 0 },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
  },
  routeItemContent: { flex: 1, marginLeft: 2 },
  routeIconDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginLeft: 13,
  },
  routeItemAddr: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  mapWrap: {
    height: 230,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 0,
    backgroundColor: '#E2E8F0',
  },
  map: { flex: 1 },
  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  markerGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  markerPurple: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
  },
  notesBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    padding: 11,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: { fontSize: 13, color: THEME.text, lineHeight: 19 },
  footerActions: {
    paddingTop: 8,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 10,
  },
  quickChipsContainer: {
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: THEME.bg,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  btnPrimary: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  waitingOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  waitingBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.overlay,
  },
  waitingSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
    marginBottom: 5,
  },
  waitingSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  waitingResultSubtitle: { marginBottom: 4 },
  waitingResponseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  waitingTimerWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: '#F3E8FF' },
  waitingOfferCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitingPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 9,
  },
  waitingRoutePreview: { flex: 1, gap: 4 },
  waitingPassengerName: { fontSize: 12.5, color: THEME.text, fontWeight: '800' },
  waitingRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingRouteAddress: { flex: 1, fontSize: 11.5, color: THEME.text, fontWeight: '600' },
  waitingOfferPriceBlock: { alignItems: 'flex-end' },
  waitingOfferLabel: { fontSize: 10, color: THEME.textSecondary, fontWeight: '700', marginBottom: 2 },
  waitingOfferPrice: { fontSize: 34, lineHeight: 38, color: '#000000', fontWeight: '900', letterSpacing: -1 },
  waitingTimer: { fontSize: 13, color: THEME.primary, fontWeight: '800' },
  resultIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  rejectedContent: { width: '100%', alignItems: 'center', paddingBottom: 4 },
  resultIconRejected: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rejectedTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800', color: THEME.text, textAlign: 'center' },
  rejectedSubtitle: { fontSize: 14, lineHeight: 20, color: THEME.textSecondary, textAlign: 'center', marginTop: 5 },
  resultIconExpired: { backgroundColor: '#F3E8FF' },
  waitingReturnMessage: { marginTop: 12, color: THEME.textMuted, fontSize: 12, textAlign: 'center' },
});

export default DriverRideRequestScreen;
