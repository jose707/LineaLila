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
  TextInput,
  ScrollView,
  Image,
  Switch,
  Animated,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, LatLng, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { SlideUpMenu } from '../components/SlideUpMenu';
import { useAuth } from '../hooks/useAuth';
import useRides from '../hooks/useRides';
import { ridesService } from '../services/rides.service';
import socketService from '../services/socket.service';

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  primaryMid: '#A855F7',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#F0F0F0',
  text: '#111111',
  textSecondary: '#888888',
  textMuted: '#BBBBBB',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  overlay: 'rgba(0,0,0,0.55)',
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
  fare: number;
  distance: number;
  duration: number;
  notes?: string;
  createdAt?: string;
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
        source={{ uri: photo }}
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

  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [showWaitingOverlay, setShowWaitingOverlay] = useState(false);
  const [waitingRide, setWaitingRide] = useState<RideRequest | null>(null);
  const [waitingPrice, setWaitingPrice] = useState<number | null>(null);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(30);
  const [initialWaitTime, setInitialWaitTime] = useState(25);
  const progressAnim = useRef(new Animated.Value(100)).current;
  const [counterOfferPrice, setCounterOfferPrice] = useState<string>('');
  const [currentOfferId, setCurrentOfferId] = useState<string | null>(null);
  const [offerRejected, setOfferRejected] = useState(false);
  const [offerStatus, setOfferStatus] = useState<
    'waiting' | 'rejected' | 'expired'
  >('waiting');
  const [showDriverMenu, setShowDriverMenu] = useState(false);

  const mapRef = useRef<MapView>(null);
  const waitingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMountedRef = useRef(true);
  const showDetailsModalRef = useRef(false);
  const selectedRideRef = useRef<RideRequest | null>(null);

  useEffect(() => {
    showDetailsModalRef.current = showDetailsModal;
    selectedRideRef.current = selectedRide;
  }, [showDetailsModal, selectedRide]);

  // Load availability status from storage on mount
  useEffect(() => {
    const loadAvailabilityStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem('driverAvailabilityStatus');
        if (stored !== null) {
          setIsAvailable(stored === 'true');
        }
      } catch (error) {
        console.error('Error loading availability status:', error);
      }
    };
    loadAvailabilityStatus();
  }, []);

  // Persist availability status when changed
  useEffect(() => {
    const saveAvailabilityStatus = async () => {
      try {
        await AsyncStorage.setItem(
          'driverAvailabilityStatus',
          String(isAvailable),
        );
      } catch (error) {
        console.error('Error saving availability status:', error);
      }
    };
    saveAvailabilityStatus();
  }, [isAvailable]);

  // 🔌 Socket: sincronizar disponibilidad del conductor
  useEffect(() => {
    if (isAvailable) {
      // Intentar obtener posición GPS real antes de ponerse online
      Geolocation.getCurrentPosition(
        (pos: { coords: { latitude: number; longitude: number } }) => {
          socketService.goOnline({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Si no hay GPS disponible, ponerse online sin coordenadas
          socketService.goOnline();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
      );
    } else {
      socketService.goOffline();
    }
  }, [isAvailable]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;

      if (isAvailable && !showWaitingOverlay) {
        // ─── Carga inicial REST (viajes ya existentes en BD) ───────────────
        loadRideRequests();

        // 🔌 Socket: recibir nuevas solicitudes en tiempo real
        const handleNewRequest = (data: any) => {
          if (!isMountedRef.current || !isAvailable) return;
          setRides(prev => {
            const exists = prev.some((r: any) => r.rideId === data.rideId);
            if (exists) return prev;
            const newRide = {
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
              fare: data.fare ?? 0,
              distance: (data.distance ?? 0) / 1000,
              duration: Math.floor((data.duration ?? 0) / 60),
              createdAt: data.createdAt || new Date().toISOString(),
            };
            return [newRide, ...prev];
          });
          setIsLoading(false);
        };

        socketService.on('ride:new_request', handleNewRequest);

        // 🔌 Socket: quitar solicitud cancelada de la lista
        const handleRideCancelled = (data: any) => {
          if (!isMountedRef.current || !data?.rideId) return;
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
          socketService.off('ride:new_request', handleNewRequest);
          socketService.off('ride:request:cancelled', handleRideCancelled);

        };
      }

      return () => {};
    }, [isAvailable, showWaitingOverlay]),
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

  // ─── Carga inicial REST (una sola vez al abrir, no polling) ──────────────
  const loadRideRequests = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    try {
      const requests = await getRideRequests();
      if (!isMountedRef.current) return;
      const transformed = (requests || []).map((req: any) => ({
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
        fare: req.fare ?? 0,
        distance: (req.distance ?? 0) / 1000,
        duration: Math.floor((req.duration ?? 0) / 60),
        createdAt: req.createdAt || new Date().toISOString(),
      }));
      setRides(transformed);
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
    try {
      setMapLoading(true);
      const { pickupLocation: p, dropoffLocation: d } = ride;
      const url = `${LOCATIONIQ_BASE_URL}/directions/driving/${p.longitude},${p.latitude};${d.longitude},${d.latitude}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        const coords = decodePolyline(data.routes[0].geometry);
        setRouteCoordinates(coords);
        if (coords.length > 0 && mapRef.current) {
          setTimeout(
            () =>
              mapRef.current?.fitToCoordinates(coords, {
                edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                animated: true,
              }),
            400,
          );
        }
      }
    } catch {
      setRouteCoordinates([
        {
          latitude: ride.pickupLocation.latitude,
          longitude: ride.pickupLocation.longitude,
        },
        {
          latitude: ride.dropoffLocation.latitude,
          longitude: ride.dropoffLocation.longitude,
        },
      ]);
    } finally {
      setMapLoading(false);
    }
  }, []);

  const handleSelectRide = (ride: RideRequest) => {
    setSelectedRide(ride);
    setCounterOfferPrice(ride.fare.toFixed(2));
    setShowDetailsModal(true);
    calculateRouteForRide(ride);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRide(null);
    setRouteCoordinates([]);
    setCounterOfferPrice('');
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
        Alert.alert(
          '¡Oferta aceptada!',
          'El pasajero ha confirmado tu oferta.',
          [
            {
              text: 'Ver viaje',
              onPress: () =>
                navigation.navigate('ActiveRide' as any, {
                  rideId: waitingRide!.rideId,
                }),
            },
          ],
        );
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
    setAcceptingRideId(ride.id);
    try {
      const response = await ridesService.submitCounterOffer(ride.id, price);
      const offerId = response?.offerId || `${ride.id}-${Date.now()}`;

      // Calcular tiempo real restante desde expiresAt del backend,
      // restando los mismos 5s de buffer que usa el pasajero para ocultar
      // las burbujas. Así ambos lados muestran una ventana de 25s.
      // El -5 hace que el timer visual llegue a 0 exactamente cuando
      // la burbuja del pasajero desaparece (timeLeftInSeconds <= 5).
      const expiresAt = response?.offer?.expiresAt;
      const realTimeLeft = expiresAt
        ? Math.max(
            1,
            Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000) - 5,
          )
        : 25;

      setCurrentOfferId(offerId);
      setOfferRejected(false);
      setShowDetailsModal(false);
      setSelectedRide(null);
      setRouteCoordinates([]);
      setWaitingRide(ride);
      setWaitingPrice(price);
      setShowWaitingOverlay(true);
      setInitialWaitTime(realTimeLeft);
      setWaitingTimeLeft(realTimeLeft);
      setOfferStatus('waiting');
      
      progressAnim.setValue(100);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: realTimeLeft * 1000,
        useNativeDriver: false,
      }).start();

      if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
      waitingTimerRef.current = setInterval(() => {
        setWaitingTimeLeft(prev => {
          if (prev <= 1) {
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
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setAcceptingRideId(null);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo enviar la oferta');
      setAcceptingRideId(null);
    }
  };

  // ─── Ride Card ──────────────────────────────────────────────────────────────
  const renderRideCard = ({ item }: { item: RideRequest }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectRide(item)}
      activeOpacity={0.7}
    >
      {/* Main row: Avatar + Content + Fare */}
      <View style={styles.cardMainRow}>
        {/* Avatar */}
        <PassengerAvatar
          photo={item.passengerProfilePhoto}
          name={item.passengerName}
          size={48}
        />

        {/* Center content: Routes + Meta */}
        <View style={styles.cardContent}>
          {/* Routes with dots */}
          <View style={styles.cardRouteWithDots}>
            <View style={styles.routeDots}>
              <View style={styles.dotPickup} />
              <View style={styles.routeLine} />
              <View style={styles.dotDropoff} />
            </View>
            <View style={styles.cardRouteInfo}>
              <Text style={styles.cardRouteAddr} numberOfLines={1}>
                {item.pickupLocation.address}
              </Text>
              <Text style={styles.cardRouteAddr} numberOfLines={1}>
                {item.dropoffLocation.address}
              </Text>
            </View>
          </View>

          {/* Meta info below routes */}
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>{item.passengerName}</Text>
            <View style={styles.cardMetaDot} />
            <Text style={styles.cardMetaText}>
              {item.distance.toFixed(1)} km
            </Text>
            <View style={styles.cardMetaDot} />
            <Text style={styles.cardMetaText}>{item.duration} min</Text>
            <View style={styles.cardMetaDot} />
            <Text style={styles.cardMetaRating}>
              ★ {item.passengerRating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Fare */}
        <Text style={styles.cardFare}>Bs {item.fare.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowDriverMenu(true)}
          style={styles.menuBtn}
        >
          <Menu size={20} color={THEME.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Solicitudes</Text>
          {rides.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rides.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusPill,
              isAvailable ? styles.statusPillActive : styles.statusPillInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isAvailable ? styles.statusDotActive : styles.statusDotInactive,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isAvailable
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {isAvailable ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: THEME.border, true: THEME.success }}
            thumbColor={isAvailable ? THEME.success : THEME.textMuted}
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>

      {/* List */}
      {!isAvailable ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Estás inactivo</Text>
          <Text style={styles.emptyBody}>
            Activa el switch para comenzar a recibir solicitudes de viaje.
          </Text>
        </View>
      ) : isLoading && rides.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.centerText}>Buscando solicitudes…</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Sin solicitudes</Text>
              <Text style={styles.emptyBody}>
                No hay solicitudes disponibles.{'\n'}El sistema sigue buscando…
              </Text>
            </View>
          }
        />
      )}

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
                <Text style={styles.modalTitle}>Detalles del viaje</Text>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {/* Passenger */}
                <View style={styles.passengerRow}>
                  <PassengerAvatar
                    photo={selectedRide.passengerProfilePhoto}
                    name={selectedRide.passengerName}
                    size={48}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailName}>
                      {selectedRide.passengerName}
                    </Text>
                    <Text style={styles.detailPhone}>
                      {selectedRide.passengerPhone}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeStar}>★</Text>
                    <Text style={styles.ratingBadgeVal}>
                      {selectedRide.passengerRating.toFixed(1)}
                    </Text>
                  </View>
                </View>

                <Divider />

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Distancia</Text>
                    <Text style={styles.statValue}>
                      {selectedRide.distance.toFixed(1)}
                    </Text>
                    <Text style={styles.statUnit}>km</Text>
                  </View>
                  <View style={styles.statSep} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Tiempo</Text>
                    <Text style={styles.statValue}>
                      {selectedRide.duration}
                    </Text>
                    <Text style={styles.statUnit}>min</Text>
                  </View>
                  <View style={styles.statSep} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Tarifa</Text>
                    <Text style={[styles.statValue, { color: THEME.primary }]}>
                      {selectedRide.fare.toFixed(2)}
                    </Text>
                    <Text style={styles.statUnit}>Bs.</Text>
                  </View>
                </View>

                <Divider />

                {/* Route */}
                <View style={styles.routeBlock}>
                  <View style={styles.routeItem}>
                    <View
                      style={[
                        styles.routeIconDot,
                        { backgroundColor: THEME.success },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeItemLabel}>Recogida</Text>
                      <Text style={styles.routeItemAddr}>
                        {selectedRide.pickupLocation.address}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeConnector} />
                  <View style={styles.routeItem}>
                    <View
                      style={[
                        styles.routeIconDot,
                        { backgroundColor: THEME.primary },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeItemLabel}>Destino</Text>
                      <Text style={styles.routeItemAddr}>
                        {selectedRide.dropoffLocation.address}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Map */}
                <View style={styles.mapWrap}>
                  {mapLoading && (
                    <View style={styles.mapLoader}>
                      <ActivityIndicator color={THEME.primary} />
                    </View>
                  )}
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    scrollEnabled
                    zoomEnabled
                    rotateEnabled={false}
                    mapType="standard"
                    initialRegion={{
                      latitude: selectedRide.pickupLocation.latitude,
                      longitude: selectedRide.pickupLocation.longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                  >
                    {routeCoordinates.length > 0 && (
                      <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={THEME.primary}
                        strokeWidth={3}
                        lineCap="round"
                        lineJoin="round"
                      />
                    )}
                    <Marker
                      coordinate={{
                        latitude: selectedRide.pickupLocation.latitude,
                        longitude: selectedRide.pickupLocation.longitude,
                      }}
                    >
                      <View style={styles.markerGreen}>
                        <View style={styles.markerInner} />
                      </View>
                    </Marker>
                    <Marker
                      coordinate={{
                        latitude: selectedRide.dropoffLocation.latitude,
                        longitude: selectedRide.dropoffLocation.longitude,
                      }}
                    >
                      <View style={styles.markerPurple}>
                        <View style={styles.markerInner} />
                      </View>
                    </Marker>
                  </MapView>
                </View>

                {/* Notes */}
                {selectedRide.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notas</Text>
                    <Text style={styles.notesText}>{selectedRide.notes}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footerActions}>
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
                <View style={styles.counterRow}>
                  <TextInput
                    style={styles.counterInput}
                    placeholder="Tu monto (Bs.)"
                    placeholderTextColor={THEME.textMuted}
                    keyboardType="decimal-pad"
                    value={counterOfferPrice}
                    onChangeText={setCounterOfferPrice}
                    editable={acceptingRideId === null}
                  />
                  <TouchableOpacity
                    style={[
                      styles.btnOutline,
                      (!counterOfferPrice.trim() || acceptingRideId !== null) &&
                        styles.btnDisabled,
                    ]}
                    onPress={() => {
                      const p = parseFloat(counterOfferPrice);
                      if (!isNaN(p) && p > 0) {
                        handleCloseModal();
                        handleSubmitOffer(selectedRide, p);
                      } else Alert.alert('Error', 'Ingresa un precio válido');
                    }}
                    disabled={
                      !counterOfferPrice.trim() || acceptingRideId !== null
                    }
                  >
                    <Text style={styles.btnOutlineText}>Contraoferta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* Waiting Overlay */}
      {showWaitingOverlay && waitingRide && (
        <View style={styles.waitingOverlay}>
          <View style={styles.waitingBg} />
          <View style={styles.waitingSheet}>
            {offerRejected ? (
              /* ── Estado: rechazada / expirada ── */
              <>
                <View style={styles.resultIconWrap}>
                  <Text style={styles.resultIcon}>
                    {offerStatus === 'rejected' ? '❌' : '⏰'}
                  </Text>
                </View>
                <Text style={styles.waitingTitle}>
                  {offerStatus === 'rejected'
                    ? 'El pasajero rechazó tu oferta'
                    : 'Tu oferta expiró'}
                </Text>
                <Text style={styles.waitingSubtitle}>
                  {offerStatus === 'rejected'
                    ? 'El pasajero eligió otra opción.'
                    : 'El pasajero no respondió a tiempo.'}
                </Text>
                <Text
                  style={{
                    color: THEME.textMuted,
                    fontSize: 13,
                    marginTop: 12,
                  }}
                >
                  Volviendo a la lista de solicitudes…
                </Text>
                <ActivityIndicator
                  color={THEME.primary}
                  style={{ marginTop: 20 }}
                />
              </>
            ) : (
              /* ── Estado: esperando respuesta ── */
              <>
                <View style={styles.progressBarContainer}>
                  <Animated.View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%']
                        })
                      }
                    ]} 
                  />
                </View>

                <Text style={[styles.waitingSubtitle, { marginTop: 12, marginBottom: 16 }]}>
                  Esperando respuesta del pasajero…
                </Text>

                <View style={[styles.waitingCard, { marginTop: 0 }]}>
                  <View style={styles.waitingRow}>
                    <Text style={styles.waitingLabel}>Pasajero</Text>
                    <Text style={styles.waitingValue}>
                      {waitingRide.passengerName}
                    </Text>
                  </View>
                  <Divider />
                  <View style={styles.waitingRow}>
                    <Text style={styles.waitingLabel}>Tu oferta</Text>
                    <Text
                      style={[
                        styles.waitingValue,
                        {
                          color: THEME.primary,
                          fontSize: 18,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      Bs {waitingPrice?.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <ActivityIndicator
                  color={THEME.primary}
                  style={{ marginVertical: 20 }}
                />
              </>
            )}
          </View>
        </View>
      )}

      <SlideUpMenu
        visible={showDriverMenu}
        onClose={() => setShowDriverMenu(false)}
        user={user}
        menuItems={[
          {
            icon: <User size={20} color={THEME.textSecondary} />,
            label: 'Mi Perfil',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <History size={20} color={THEME.textSecondary} />,
            label: 'Mis Viajes',
            onPress: () => navigation.navigate('RideHistory'),
          },
          {
            icon: <Settings size={20} color={THEME.textSecondary} />,
            label: 'Ajustes',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <Bell size={20} color={THEME.textSecondary} />,
            label: 'Notificaciones',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <CircleHelp size={20} color={THEME.textSecondary} />,
            label: 'Ayuda',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <MessageCircle size={20} color={THEME.textSecondary} />,
            label: 'Soporte',
            onPress: () => navigation.navigate('Profile'),
          },
        ]}
        closeButton={{
          label: 'Modo Pasajero',
          onPress: () => navigation.navigate('Profile'),
          backgroundColor: THEME.primary,
          textColor: THEME.bg,
        }}
        theme={{
          primary: THEME.primary,
          accent: THEME.primary,
          text: THEME.text,
          textMuted: THEME.textSecondary,
          border: THEME.border,
          bg: THEME.bg,
          white: THEME.surface,
          overlay: 'rgba(0,0,0,0.4)',
          avatarBg: THEME.primaryLight,
        }}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  statusPillActive: {
    backgroundColor: '#D1FAE5',
  },
  statusPillInactive: {
    backgroundColor: THEME.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: THEME.success,
  },
  statusDotInactive: {
    backgroundColor: THEME.textMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: THEME.success,
  },
  statusTextInactive: {
    color: THEME.textMuted,
  },
  badge: {
    backgroundColor: THEME.primary,
    borderRadius: 100,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 32, gap: 8 },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  cardRoute: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDots: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
  },
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.success,
  },
  routeLine: { width: 1.5, flex: 1, backgroundColor: THEME.border },
  dotDropoff: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: THEME.primary,
  },
  routeLabels: { flex: 1, justifyContent: 'space-between', height: 36 },
  routeAddrTop: { fontSize: 13, color: THEME.text, fontWeight: '600' },
  routeAddrBottom: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '400',
  },
  cardFare: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    letterSpacing: -0.3,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { fontSize: 12, color: THEME.textMuted, fontWeight: '400' },
  cardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.textMuted,
  },
  cardMetaRating: { fontSize: 12, color: THEME.warning, fontWeight: '600' },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardRouteWithDots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRouteInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardRouteAddr: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
    marginVertical: 2,
  },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 4 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  centerText: { fontSize: 14, color: THEME.textSecondary, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: THEME.text },
  emptyBody: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1, backgroundColor: THEME.overlay },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: THEME.textSecondary, fontWeight: '600' },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailName: { fontSize: 16, fontWeight: '700', color: THEME.text },
  detailPhone: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingBadgeStar: { color: THEME.warning, fontSize: 12 },
  ratingBadgeVal: { fontSize: 13, fontWeight: '700', color: '#92400E' },
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
  routeBlock: { marginVertical: 4, gap: 0 },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  routeIconDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  routeConnector: {
    width: 2,
    height: 20,
    backgroundColor: THEME.border,
    marginLeft: 5,
  },
  routeItemLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  routeItemAddr: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 18,
  },
  mapWrap: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
    backgroundColor: THEME.border,
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
    backgroundColor: THEME.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: { fontSize: 13, color: THEME.text, lineHeight: 20 },
  footerActions: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  counterRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  counterInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.text,
    backgroundColor: THEME.bg,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { color: THEME.primary, fontSize: 14, fontWeight: '700' },
  btnDisabled: { borderColor: THEME.border, opacity: 0.5 },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  waitingBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.overlay,
  },
  waitingSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: THEME.primaryLight,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.primary,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  waitingSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  waitingCard: {
    width: '100%',
    backgroundColor: THEME.bg,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  waitingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waitingLabel: { fontSize: 13, color: THEME.textSecondary, fontWeight: '600' },
  waitingValue: { fontSize: 14, color: THEME.text, fontWeight: '600' },
  resultIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  resultIcon: {
    fontSize: 36,
  },

});

export default DriverRideRequestScreen;
