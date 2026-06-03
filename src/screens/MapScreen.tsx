import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  BackHandler,
  useWindowDimensions,
  Image,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MapView, { Marker, Region, LatLng, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Banknote,
  Bell,
  Briefcase,
  Car,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  History,
  Home,
  LocateFixed,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Settings,
  Star,
  User,
  X,
} from 'lucide-react-native';
import { RootStackParamList, Stop } from '../navigation/AppNavigator';
import { SlideUpMenu } from '../components/SlideUpMenu';
import { useAuth } from '../hooks/useAuth';
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import {
  cacheLocationManager,
  cacheRouteManager,
  cacheTripHistoryManager,
  cleanExpiredCache,
} from '../utils/cacheManager';
import { ridesService } from '../services/rides.service';
import { authService } from '../services/auth.service';
import { StorageHelper } from '../services/storage';
import socketService from '../services/socket.service';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const LOCATIONIQ_API_KEY = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';
const FARE_STEP = 0.5;
const TRAFFIC_CORRECTION_FACTOR = 3;

// Pin dimensions — keep in sync with pinBody size
const PIN_BODY_SIZE = 48; // width & height of the circle
const PIN_TIP_SIZE = 12; // diamond tip
const PIN_BUBBLE_H = 38; // approx bubble height + gap
const PIN_SHIFT_UP = 240;
const PIN_VISUAL_HEIGHT = 108; // bubble(~42) + head(38) + stem(28)

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

// ─── TYPES ───────────────────────────────────────────────────────────────────
type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Map'
>;
type MapScreenRouteProp = RouteProp<RootStackParamList, 'Map'>;
interface RouteInfo {
  distance: number;
  duration: number;
  coordinates: LatLng[];
}

// ─── ICONS (Lucide) ──────────────────────────────────────────────────────────
const Icon = {
  Search: ({
    size = 20,
    color = T.inkLight,
  }: {
    size?: number;
    color?: string;
  }) => <Search size={size} color={color} />,
  MyLocation: ({
    size = 20,
    color = T.accent,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <LocateFixed size={size} color={color} strokeWidth={strokeWidth} />,
  Menu: ({ size = 20, color = T.ink }: { size?: number; color?: string }) => (
    <Menu size={size} color={color} />
  ),
  Clock: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Clock size={size} color={color} />,
  Distance: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <ArrowRight size={size} color={color} />,
  Money: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Banknote size={size} color={color} />,
  Check: ({
    size = 16,
    color = T.white,
  }: {
    size?: number;
    color?: string;
  }) => <Check size={size} color={color} />,
  Close: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <X size={size} color={color} />,
  Star: ({
    size = 14,
    color = '#F59E0B',
    filled = true,
  }: {
    size?: number;
    color?: string;
    filled?: boolean;
  }) => <Star size={size} color={color} fill={filled ? color : 'transparent'} />,
  Car: ({ size = 18, color = T.accent }: { size?: number; color?: string }) => (
    <Car size={size} color={color} />
  ),
  User: ({
    size = 20,
    color = T.inkMid,
    strokeWidth,
  }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => <User size={size} color={color} strokeWidth={strokeWidth} />,
  History: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <History size={size} color={color} />,
  Ride: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Car size={size} color={color} />,
  ChevronRight: ({
    size = 16,
    color = T.border,
  }: {
    size?: number;
    color?: string;
  }) => <ChevronRight size={size} color={color} />,
  Minus: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Minus size={size} color={color} />,
  Plus: ({
    size = 16,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Plus size={size} color={color} />,
  Settings: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Settings size={size} color={color} />,
  Bell: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <Bell size={size} color={color} />,
  HelpCircle: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <CircleHelp size={size} color={color} />,
  MessageCircle: ({
    size = 20,
    color = T.inkMid,
  }: {
    size?: number;
    color?: string;
  }) => <MessageCircle size={size} color={color} />,
  Home: ({ size = 20, color = T.inkMid }: { size?: number; color?: string }) => (
    <Home size={size} color={color} />
  ),
  Briefcase: ({ size = 20, color = T.inkMid }: { size?: number; color?: string }) => (
    <Briefcase size={size} color={color} />
  ),
  MapPin: ({ size = 20, color = T.inkMid }: { size?: number; color?: string }) => (
    <MapPin size={size} color={color} />
  ),
};

const FloatingPin = ({
  visible,
  address,
  loading,
  containerWidth,
  containerHeight,
  mode = 'origin',
}: {
  visible: boolean;
  address: string;
  loading: boolean;
  containerWidth: number;
  containerHeight: number;
  mode?: 'origin' | 'destination';
}) => {
  const pinStyles = useMemo(
    () => ({
      top:
        containerHeight > 0
          ? Math.floor(containerHeight / 2) - PIN_SHIFT_UP
          : 0,
      left: containerWidth > 0 ? Math.floor(containerWidth / 2) - 240 / 2 : 0,
    }),
    [containerWidth, containerHeight],
  );

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        s.pinAnchor,
        {
          top: pinStyles.top,
          left: pinStyles.left,
        },
      ]}
    >
      {/* Stack grows upward from the anchor point */}
      <View style={s.pinStack}>
        {/* Address bubble */}
        {(address !== '' || loading) && (
          <View style={s.pinBubble}>
            {loading ? (
              <ActivityIndicator size="small" color={T.accent} />
            ) : (
              <Text style={s.pinBubbleText} numberOfLines={2}>
                {address}
              </Text>
            )}
          </View>
        )}

        {/* Lollipop pin: head + stem */}
        <View style={s.pinHead}>
          <View style={s.pinHole} />
        </View>
        <View style={s.pinStem} />
      </View>
    </View>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const route = useRoute<MapScreenRouteProp>();
  const { user, updateUser, isDriverMode } = useAuth();
  const insets = useSafeAreaInsets();

  // Restricción: MapScreen solo para pasajeros
  useFocusEffect(
    React.useCallback(() => {
      if (isDriverMode) {
        Alert.alert(
          'Acceso denegado',
          'Solo los pasajeros pueden solicitar viajes. Cambia a modo pasajero en tu perfil.',
          [
            {
              text: 'Ir a perfil',
              onPress: () => navigation.navigate('Profile'),
            },
          ],
        );
        // Redirigir a DriverHome
        (navigation as any).navigate('DriverHome');
      }
    }, [isDriverMode, navigation]),
  );

  // 🔒 BackHandler que responde a cambios de rideRequested
  useEffect(() => {
    let backPressCount = 0;
    let backPressTimeout: ReturnType<typeof setTimeout> | null = null;

    const onBackPress = () => {
      // Si hay solicitud activa (modal visible), pedir confirmación
      if (rideRequested) {
        Alert.alert(
          'Solicitud activa',
          'Tienes una solicitud en curso. ¿Deseas cancelarla?',
          [
            { text: 'No, continuar', style: 'cancel' },
            {
              text: 'Sí, cancelar',
              style: 'destructive',
              onPress: async () => {
                if (activeRideId) {
                  await ridesService
                    .cancelRide(
                      activeRideId,
                      'Cancelado por pasajero',
                      'passenger',
                    )
                    .catch(() => { });
                }
                setRideRequested(false);
                setRequestTimeLeft(120);
                setActiveRideId(null);
                if (requestTimerRef.current)
                  clearInterval(requestTimerRef.current);
                StorageHelper.removeItem('activeRideState');
                console.log(
                  '🗑️ [MapScreen] Estado de solicitud limpiado (via back button)',
                );
              },
            },
          ],
        );
        return true; // Bloquear el back nativo
      }

      // Si NO hay solicitud activa, comportamiento de "double back para salir"
      backPressCount++;

      if (backPressCount === 1) {
        Alert.alert('Salir', 'Presiona otra vez para cerrar la app');

        backPressTimeout = setTimeout(() => {
          backPressCount = 0;
        }, 2000);

        return true;
      } else if (backPressCount === 2) {
        if (backPressTimeout) clearTimeout(backPressTimeout);
        BackHandler.exitApp();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => {
      subscription.remove();
      if (backPressTimeout) clearTimeout(backPressTimeout);
    };
  }, []);

  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [tempPickupAddress, setTempPickupAddress] = useState('');
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(
    null,
  );
  const [destinationAddress, setDestinationAddress] = useState('');
  const [waypoints, setWaypoints] = useState<
    { latitude: number; longitude: number; address: string }[]
  >([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMarker, setShowMarker] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false); // ── ESTADO DEL MAPA Y UBICACIÓN ──
  const [pickingMode, setPickingMode] = useState<'origin' | 'destination' | null>(null);
  const [mapCenterLocation, setMapCenterLocation] = useState<LatLng | null>(
    null,
  );
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [suggestedFare, setSuggestedFare] = useState<number | null>(null);
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [rideRequested, setRideRequested] = useState(false);
  const [requestTimeLeft, setRequestTimeLeft] = useState(120);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [driverOffers, setDriverOffers] = useState<any[]>([]);
  const [showOffersOverlay, setShowOffersOverlay] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] =
    useState<string>('taxi');
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>('cash');
  const [scheduleRide, setScheduleRide] = useState(false);
  const [, setRenderTrigger] = useState(0);
  const [mapWrapDimensions, setMapWrapDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [fareSettings, setFareSettings] = useState<{
    baseFare: number;
    farePerKm: number;
    farePerMinute: number;
  }>({
    baseFare: 12,
    farePerKm: 0.5,
    farePerMinute: 0.58,
  });
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const mapRef = useRef<MapView>(null);
  const lastRegionChangeTime = useRef(0);
  const requestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoExpireCalledRef = useRef(false);

  const renderTriggerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchId = useRef<number | null>(null);
  const isManualCenteringRef = useRef(false);

  // ── EFFECTS ──────────────────────────────────────────────────────────────

  // Monitor de cambios en user.rating
  useEffect(() => {
    if (user?.rating !== undefined) {
      console.log('📊 [MapScreen] user.rating cambió:', user.rating);
    }
  }, [user?.rating]);

  // Cargar configuración de tarifas según coordenadas
  const loadFareSettings = useCallback(async (lat: number, lng: number) => {
    console.log(`📍 [MapScreen] Buscando tarifas para: lat=${lat.toFixed(5)}, lng=${lng.toFixed(5)}`);
    const settings = await ridesService.getFareSettings(lat, lng);
    if (settings) {
      setFareSettings({
        baseFare: settings.baseFare,
        farePerKm: settings.farePerKm,
        farePerMinute: settings.farePerMinute,
      });
      console.log(`💰 [MapScreen] Tarifas recibidas - Zona: "${settings.zoneName ?? 'Global (sin zona)'}"`);
      console.log(`   Base fare:       Bs ${settings.baseFare}`);
      console.log(`   Por km:          Bs ${settings.farePerKm} / km`);
      console.log(`   Por minuto:      Bs ${settings.farePerMinute} / min`);
    }
  }, []);

  // Refrescar tarifas cuando el origen cambia
  useEffect(() => {
    if (pickupLocation) {
      loadFareSettings(pickupLocation.latitude, pickupLocation.longitude);
    }
  }, [pickupLocation, loadFareSettings]);

  // Refrescar tarifas cuando el centro del mapa cambia (sin pickup confirmado)
  // Solo cuando no hay pickup, y con un debounce de 1s para no saturar la API
  useEffect(() => {
    if (pickupLocation || !mapCenterLocation) return;
    const id = setTimeout(() => {
      loadFareSettings(mapCenterLocation.latitude, mapCenterLocation.longitude);
    }, 1000);
    return () => clearTimeout(id);
  }, [mapCenterLocation, pickupLocation, loadFareSettings]);

  // Refrescar datos del usuario cuando abres el modal
  useEffect(() => {
    if (showClientMenu) {
      console.log(
        '🔄 [MapScreen] Abriendo modal - refrescando datos del usuario...',
      );
      authService.fetchCurrentUser().then(updatedUser => {
        if (updatedUser) {
          console.log('✅ [MapScreen] Datos refrescados:', {
            rating: updatedUser.rating,
            totalTrips: updatedUser.totalTrips,
          });
          // Actualizar contexto de Auth
          console.log('🔄 [MapScreen] Actualizando contexto de Auth...');
          updateUser(updatedUser);
        }
      });
    }
  }, [showClientMenu, updateUser]);

  // 🔄 Restaurar solicitud al montar el componente (app startup)
  useEffect(() => {
    // Restaurar solicitud activa UNA SOLA VEZ al montar la pantalla.
    // Si el usuario cerró el app mientras tenía un viaje pendiente,
    // aquí se recupera el estado para que el timer y el polling continúen.
    const savedRideState = StorageHelper.getItem('activeRideState');
    if (!savedRideState) return;

    try {
      const {
        rideRequested: isRequested,
        activeRideId: rideId,
        expiresAt,
      } = JSON.parse(savedRideState);

      if (!isRequested || !rideId) return;

      const timeLeftInSeconds = expiresAt
        ? Math.max(0, (new Date(expiresAt).getTime() - Date.now()) / 1000)
        : 120;

      // Si el viaje ya expiró mientras el app estaba cerrado, limpiar storage
      // y no restaurar — evita llamar handleAutoExpireRide sobre un viaje muerto.
      if (timeLeftInSeconds <= 0) {
        StorageHelper.removeItem('activeRideState');
        console.log(
          '🗑️ [MapScreen] Solicitud restaurada ya expirada, descartando.',
        );
        return;
      }

      console.log('♻️ [MapScreen] Restaurando solicitud activa:', {
        rideId,
        timeLeftInSeconds: timeLeftInSeconds.toFixed(1),
      });
      setRideRequested(true);
      setActiveRideId(rideId);
      setRequestTimeLeft(timeLeftInSeconds);
      // 🔌 Re-unirse al room del viaje restaurado
      socketService.joinRide(rideId);
    } catch (e) {
      console.error('❌ [MapScreen] Error restaurando estado de solicitud:', e);
      StorageHelper.removeItem('activeRideState');
    }
  }, []); // Ejecutar SOLO al montar

  useEffect(() => {
    if (rideRequested && requestTimeLeft > 0) {
      requestTimerRef.current = setInterval(() => {
        setRequestTimeLeft(prev => {
          if (prev - 0.1 <= 0) {
            if (!autoExpireCalledRef.current) {
              autoExpireCalledRef.current = true;
              // Limpiar el intervalo antes de llamar para evitar más ticks
              if (requestTimerRef.current) {
                clearInterval(requestTimerRef.current);
                requestTimerRef.current = null;
              }
              handleAutoExpireRide();
            }
            return 0;
          }
          return Math.max(0, prev - 0.1);
        });
      }, 100);
    }
    return () => {
      if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    };
  }, [rideRequested]);

  useEffect(() => {
    if (!rideRequested || !activeRideId) {
      setShowOffersOverlay(false);
      setDriverOffers([]);
      return;
    }

    // Carga inicial: por si hay ofertas previas (ej. app restaurada desde background)
    const fetchOffers = async () => {
      try {
        const offers = await ridesService.getCounterOffers(activeRideId);
        const now = Date.now();
        const valid = (offers || []).filter((o: any) => {
          if (o.rejected) return false;
          if (o.isExpired) return false;
          if (o.timeLeftInSeconds !== undefined) {
            // Ocultar la burbuja cuando quedan ≤5 s (25 s desde creación),
            // así el pasajero nunca puede tocar una oferta a punto de expirar.
            return o.timeLeftInSeconds > 5;
          }
          const t =
            typeof o.createdAt === 'string'
              ? new Date(o.createdAt).getTime()
              : o.createdAt || now;
          return (now - t) / 1000 < 25;
        });
        if (valid.length > 0) {
          setDriverOffers(valid);
          setShowOffersOverlay(true);
        } else {
          setShowOffersOverlay(false);
          setDriverOffers([]);
        }
      } catch { }
    };
    fetchOffers();

    // 🔌 Nuevas ofertas en tiempo real via WebSocket
    const handleNewOffer = (data: any) => {
      if (!data?.offer || data.rideId !== activeRideId) return;
      const offer = data.offer;
      const timeLeft = offer.expiresAt
        ? Math.max(0, (new Date(offer.expiresAt).getTime() - Date.now()) / 1000)
        : 30;
      if (timeLeft <= 5) return;
      setDriverOffers(prev => {
        const exists = prev.some((o: any) => o.offerId === offer.offerId);
        if (exists) return prev;
        return [...prev, { ...offer, timeLeftInSeconds: timeLeft }];
      });
      setShowOffersOverlay(true);
    };
    socketService.on('offer:new', handleNewOffer);

    return () => {
      socketService.off('offer:new', handleNewOffer);
    };
  }, [rideRequested, activeRideId]);

  // 🔌 Socket: conductor aceptó el viaje directamente (sin contraoferta)
  useEffect(() => {
    if (!rideRequested || !activeRideId) return;

    const handleRideAccepted = (data: any) => {
      if (data?.rideId !== activeRideId) return;
      const acceptedRideId = activeRideId;

      // Limpiar todo el estado de solicitud
      setRideRequested(false);
      setActiveRideId(null);
      setRequestTimeLeft(120);
      setShowOffersOverlay(false);
      setDriverOffers([]);
      if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
        requestTimerRef.current = null;
      }
      StorageHelper.removeItem('activeRideState');

      Alert.alert(
        '¡Conductor en camino!',
        `${data.driverName || 'Un conductor'} aceptó tu solicitud.`,
        [
          {
            text: 'Ver detalles',
            onPress: () =>
              navigation.navigate('ActiveRide' as any, {
                rideId: acceptedRideId,
              }),
          },
        ],
      );
    };

    socketService.on('ride:accepted', handleRideAccepted);
    return () => {
      socketService.off('ride:accepted', handleRideAccepted);
    };
  }, [rideRequested, activeRideId]);

  useEffect(() => {
    if (!showOffersOverlay) {
      if (renderTriggerRef.current) clearInterval(renderTriggerRef.current);
      return;
    }
    renderTriggerRef.current = setInterval(
      () => setRenderTrigger(p => p + 1),
      50,
    );
    return () => {
      if (renderTriggerRef.current) clearInterval(renderTriggerRef.current);
    };
  }, [showOffersOverlay]);

  // 🔒 BackHandler que responde a cambios de rideRequested
  useEffect(() => {
    let backPressCount = 0;
    let backPressTimeout: ReturnType<typeof setTimeout> | null = null;

    const onBackPress = () => {
      // Si hay solicitud activa (modal visible), pedir confirmación
      if (rideRequested) {
        Alert.alert(
          'Solicitud activa',
          'Tienes una solicitud en curso. ¿Deseas cancelarla?',
          [
            { text: 'No, continuar', style: 'cancel' },
            {
              text: 'Sí, cancelar',
              style: 'destructive',
              onPress: async () => {
                if (activeRideId) {
                  await ridesService
                    .cancelRide(
                      activeRideId,
                      'Cancelado por pasajero',
                      'passenger',
                    )
                    .catch(() => { });
                }
                setRideRequested(false);
                setRequestTimeLeft(120);
                setActiveRideId(null);
                if (requestTimerRef.current)
                  clearInterval(requestTimerRef.current);
                StorageHelper.removeItem('activeRideState');
                console.log(
                  '🗑️ [MapScreen] Estado de solicitud limpiado (via back button)',
                );
              },
            },
          ],
        );
        return true; // Bloquear el back nativo
      }

      // Si NO hay solicitud activa, comportamiento de "double back para salir"
      backPressCount++;

      if (backPressCount === 1) {
        Alert.alert('Salir', 'Presiona otra vez para cerrar la app');

        backPressTimeout = setTimeout(() => {
          backPressCount = 0;
        }, 2000);

        return true;
      } else if (backPressCount === 2) {
        if (backPressTimeout) clearTimeout(backPressTimeout);
        BackHandler.exitApp();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => {
      subscription.remove();
      if (backPressTimeout) clearTimeout(backPressTimeout);
    };
  }, [rideRequested, activeRideId]);

  useEffect(() => {
    cleanExpiredCache();
  }, []);

  // Cargar viajes recientes y favoritos
  useEffect(() => {
    const loadRecentTrips = async () => {
      const trips = await cacheTripHistoryManager.getTrips();
      setRecentTrips(trips.slice(0, 3));
      const saved = StorageHelper.getItem('favoriteTripIds');
      if (saved) {
        setFavoriteIds(new Set(JSON.parse(saved)));
      }
    };
    loadRecentTrips();
  }, []);

  const toggleFavorite = useCallback((tripId: string) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      StorageHelper.setItem('favoriteTripIds', JSON.stringify([...next]));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!route.params) return;
    const p = route.params as any;
    if (p.reset) {
      resetAll();
      setPickingMode(null);
      setWaypoints([]);
      setAllStops([]);
      setEditingStopIndex(null);
      return;
    }
    if (p.pickingMode) {
      setPickingMode(p.pickingMode);
      setPickupLocation(p.pickupLocation || null);
      if (p.pickupAddress) setPickupAddress(p.pickupAddress);
      setDestinationLocation(p.destinationLocation || null);
      if (p.destinationAddress) setDestinationAddress(p.destinationAddress);
      setEditingStopIndex(p.editingStopIndex ?? null);
      setAllStops(p.stops || []);
      if (p.stops && p.stops.length > 2) {
        const mid = p.stops.slice(1, p.stops.length - 1).filter((s: any) => s.location?.latitude !== 0 && s.location?.longitude !== 0 && s.address !== '');
        setWaypoints(mid.map((s: any) => ({ latitude: s.location.latitude, longitude: s.location.longitude, address: s.address })));
      } else setWaypoints([]);
      setRouteInfo(null); setRouteCoordinates([]); setSuggestedFare(null); setShowMarker(true);
      return;
    }
    if (p.pickupLocation) { setPickupLocation(p.pickupLocation); setShowMarker(false); setTempPickupAddress(p.pickupAddress || ''); }
    if (p.destinationLocation) setDestinationLocation(p.destinationLocation); else setDestinationLocation(null);
    if (p.destinationAddress) setDestinationAddress(p.destinationAddress); else setDestinationAddress('');
    if (p.pickupAddress) { setPickupAddress(p.pickupAddress); setTempPickupAddress(p.pickupAddress); }
    if (p.destinationAddress) setDestinationAddress(p.destinationAddress);
    if (p.stops && p.stops.length > 2) {
      const mid = p.stops.slice(1, p.stops.length - 1).filter((s: any) => s.location?.latitude !== 0 && s.location?.longitude !== 0 && s.address !== '');
      setWaypoints(mid.map((s: any) => ({ latitude: s.location.latitude, longitude: s.location.longitude, address: s.address })));
      setAllStops(p.stops);
    } else { setWaypoints([]); setAllStops([]); }
  }, [route.params]);

  const calculateRouteMemo = useCallback(() => {
    if (pickupLocation && destinationLocation) calculateRoute();
    else {
      setRouteInfo(null);
      setRouteCoordinates([]);
    }
  }, [pickupLocation, destinationLocation, waypoints]);
  useEffect(() => {
    calculateRouteMemo();
  }, [calculateRouteMemo]);

  useEffect(() => {
    if (!routeInfo) {
      setSuggestedFare(null);
      return;
    }
    const km = routeInfo.distance / 1000;
    const mins = routeInfo.duration / 60;

    const distanceFare = fareSettings.farePerKm * km;
    const timeFare = fareSettings.farePerMinute * mins;
    const rawFare = fareSettings.baseFare + distanceFare + timeFare;
    const roundedFare = Math.max(1.0, Math.round(rawFare / FARE_STEP) * FARE_STEP);

    console.log('🧾e [MapScreen] Cálculo de tarifa:');
    console.log(`   Distancia:       ${km.toFixed(2)} km`);
    console.log(`   Duración:        ${mins.toFixed(1)} min`);
    console.log(`   Base fare:       Bs ${fareSettings.baseFare}`);
    console.log(`   Por distancia:   Bs ${distanceFare.toFixed(2)}  (${km.toFixed(2)} km x ${fareSettings.farePerKm})`);
    console.log(`   Por tiempo:      Bs ${timeFare.toFixed(2)}  (${mins.toFixed(1)} min x ${fareSettings.farePerMinute})`);
    console.log(`   Subtotal raw:    Bs ${rawFare.toFixed(2)}`);
    console.log(`   ✨ Tarifa final:  Bs ${roundedFare.toFixed(2)}  (redondeado al step de ${FARE_STEP})`);

    setSuggestedFare(parseFloat(roundedFare.toFixed(2)));
  }, [routeInfo, fareSettings]);

  useEffect(() => {
    if (!mapCenterLocation || pickupLocation) return;
    const id = setTimeout(async () => {
      try {
        setSearchingAddress(true);
        setTempPickupAddress(await getExactAddress(mapCenterLocation));
      } catch {
      } finally {
        setSearchingAddress(false);
      }
    }, 800);
    return () => clearTimeout(id);
  }, [mapCenterLocation, pickupLocation]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (pickupLocation || destinationLocation) {
          resetAll();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [pickupLocation, destinationLocation]),
  );

  useEffect(() => {
    if (!initialLocationLoaded)
      centerToUserLocation(false).then(loc => {
        if (loc) setMapCenterLocation(loc);
        setInitialLocationLoaded(true);
      });
    watchId.current = Geolocation.watchPosition(
      p =>
        setCurrentLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        }),
      () => { },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
      },
    );
    return () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  // ── HELPERS ──────────────────────────────────────────────────────────────

  const handleRegionChangeComplete = async (region: Region) => {
    const now = Date.now();
    if (now - lastRegionChangeTime.current < 300) return;
    if (isManualCenteringRef.current) return;
    lastRegionChangeTime.current = now;

    // Calculate coordinate at pin tip, not map center
    const h = mapWrapDimensions.height;
    const pixelOffsetUp = PIN_SHIFT_UP - PIN_VISUAL_HEIGHT;
    const latOffset = h > 0 ? (pixelOffsetUp / h) * region.latitudeDelta : 0;
    const center = {
      latitude: region.latitude + latOffset,
      longitude: region.longitude,
    };

    setMapCenterLocation(center);
    if (!pickupLocation || pickingMode !== null) {
      try {
        setSearchingAddress(true);
        setTempPickupAddress(await getExactAddress(center));
      } catch {
      } finally {
        setSearchingAddress(false);
      }
    }
  };

  const getExactAddress = async (coord: LatLng): Promise<string> => {
    try {
      const cached = await cacheLocationManager.getLocation(coord);
      if (cached) return cached.address;
      const r = await fetch(
        `${LOCATIONIQ_BASE_URL}/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${coord.latitude}&lon=${coord.longitude}&format=json&normalizeaddress=1&addressdetails=1&zoom=18`,
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      const a = d.address || {};
      const parts: string[] = [];
      if (a.road && a.house_number) parts.push(`${a.road} ${a.house_number}`);
      else if (a.road) parts.push(a.road);
      if (a.neighbourhood || a.suburb) parts.push(a.neighbourhood || a.suburb);
      const addr =
        parts.length > 0
          ? parts.join(', ')
          : (d.display_name || '').split(',').slice(0, 2).join(',');
      await cacheLocationManager.saveLocation(coord, addr);
      return addr;
    } catch {
      return `${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`;
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return true;
    }
    const g = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permiso de Ubicación',
        message: 'Necesitamos acceder a tu ubicación',
        buttonNeutral: 'Después',
        buttonNegative: 'No',
        buttonPositive: 'OK',
      },
    );
    if (g === PermissionsAndroid.RESULTS.GRANTED) {
      setHasLocationPermission(true);
      return true;
    }
    return false;
  };

  const getCurrentLocation = (): Promise<LatLng> =>
    new Promise(async (resolve, reject) => {
      const get = (opts: any) =>
        new Promise<LatLng>((res, rej) =>
          Geolocation.getCurrentPosition(
            p =>
              res({
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
              }),
            rej,
            opts,
          ),
        );
      try {
        resolve(
          await get({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }),
        );
      } catch (e: any) {
        try {
          resolve(
            await get({
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }),
          );
        } catch {
          if (currentLocation) resolve(currentLocation);
          else reject(e);
        }
      }
    });

  const centerToUserLocation = async (showAlert = true) => {
    setLocationLoading(true);
    try {
      if (!hasLocationPermission && Platform.OS === 'android')
        if (!(await requestLocationPermission())) {
          setLocationLoading(false);
          return null;
        }
      const loc = await getCurrentLocation();
      setCurrentLocation(loc);
      setMapCenterLocation(loc);
      setShowMarker(true);
      isManualCenteringRef.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: loc.latitude - 0.003,
          longitude: loc.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
      setTimeout(() => {
        isManualCenteringRef.current = false;
      }, 600);
      setLocationLoading(false);
      getExactAddress(loc)
        .then(setTempPickupAddress)
        .catch(() =>
          setTempPickupAddress(
            `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`,
          ),
        );
      return loc;
    } catch {
      setLocationLoading(false);
      isManualCenteringRef.current = false;
      if (showAlert)
        Alert.alert('Error de ubicación', 'Verifica que el GPS esté activado.');
      return null;
    }
  };

  const calculateRoute = useCallback(async () => {
    if (!pickupLocation || !destinationLocation) return;
    setRouteLoading(true);
    try {
      const cached = await cacheRouteManager.getRoute(
        pickupLocation,
        destinationLocation,
      );
      if (cached) {
        setRouteInfo({
          distance: cached.distance,
          duration: cached.duration,
          coordinates: cached.coordinates,
        });
        setRouteCoordinates(cached.coordinates);
        setTimeout(
          () =>
            mapRef.current?.fitToCoordinates(cached.coordinates, {
              edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
              animated: true,
            }),
          500,
        );
        return;
      }
      const { latitude: sLat, longitude: sLon } = pickupLocation;
      const { latitude: eLat, longitude: eLon } = destinationLocation;
      const r = await fetch(
        `${LOCATIONIQ_BASE_URL}/directions/driving/${sLon},${sLat};${eLon},${eLat}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false`,
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.routes?.length > 0) {
        const rt = d.routes[0];
        const coords = decodePolyline(rt.geometry);
        const rawDuration = rt.duration;
        const correctedDuration = Math.round(rawDuration * TRAFFIC_CORRECTION_FACTOR);
        console.log(`🕰️ [calculateRoute] Duración LocationIQ: ${rawDuration}s (${(rawDuration / 60).toFixed(1)} min) → Corregida: ${correctedDuration}s (${(correctedDuration / 60).toFixed(1)} min)`);
        await cacheRouteManager.saveRoute(pickupLocation, destinationLocation, {
          pickupLat: sLat,
          pickupLon: sLon,
          destLat: eLat,
          destLon: eLon,
          distance: rt.distance,
          duration: correctedDuration,
          coordinates: coords,
          fare: 0,
          timestamp: Date.now(),
        });
        setRouteInfo({
          distance: rt.distance,
          duration: correctedDuration,
          coordinates: coords,
        });
        setRouteCoordinates(coords);
        setTimeout(
          () =>
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
              animated: true,
            }),
          500,
        );
      }
    } catch {
      createFallbackRoute();
    } finally {
      setRouteLoading(false);
    }
  }, [pickupLocation, destinationLocation]);

  const decodePolyline = (enc: string): LatLng[] => {
    const pts: LatLng[] = [];
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

  const calcDist = (a: LatLng, b: LatLng) => {
    const R = 6371e3,
      φ1 = (a.latitude * Math.PI) / 180,
      φ2 = (b.latitude * Math.PI) / 180;
    const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180,
      Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
    const x =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  const createFallbackRoute = () => {
    if (!pickupLocation || !destinationLocation) return;
    const coords = [
      pickupLocation,
      {
        latitude: (pickupLocation.latitude + destinationLocation.latitude) / 2,
        longitude:
          (pickupLocation.longitude + destinationLocation.longitude) / 2,
      },
      destinationLocation,
    ];
    const d = calcDist(pickupLocation, destinationLocation);
    setRouteInfo({ distance: d, duration: d / 10, coordinates: coords });
    setRouteCoordinates(coords);
  };

  const fmtDist = (m: number) =>
    m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  const fmtTime = (sec: number) => {
    const h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };
  const fmtTimer = (sec: number) => {
    const roundedSec = Math.round(sec);
    return `${Math.floor(roundedSec / 60)}:${String(roundedSec % 60).padStart(
      2,
      '0',
    )}`;
  };

  const resetAll = () => {
    setPickupLocation(null);
    setPickupAddress('');
    setTempPickupAddress('');
    setDestinationLocation(null);
    setDestinationAddress('');
    setShowMarker(true);
    setRouteInfo(null);
    setRouteCoordinates([]);
    setSuggestedFare(null);
  };

  const goToSearchScreen = async () => {
    if (!pickupLocation) {
      if (!mapCenterLocation) return;
      setLocationLoading(true);
      const addr = await getExactAddress(mapCenterLocation).catch(
        () => tempPickupAddress,
      );
      setPickupLocation(mapCenterLocation);
      setPickupAddress(addr);
      setShowMarker(false);
      setLocationLoading(false);
      navigation.navigate('Search', {
        pickupLocation: mapCenterLocation,
        pickupAddress: addr,
      });
      return;
    }
    navigation.navigate('Search', { pickupLocation, pickupAddress });
  };

  const confirmTrip = () => {
    if (!pickupLocation || !destinationLocation || !routeInfo) {
      Alert.alert('Información incompleta', 'Selecciona origen y destino.');
      return;
    }
    if (isCreatingRide) return; // evitar doble tap

    // Crear viaje directamente sin alerts de confirmación
    (async () => {
      setIsCreatingRide(true);
      try {
        const res = await ridesService.createRide({
          pickupLocation: { ...pickupLocation, address: pickupAddress },
          dropoffLocation: {
            ...destinationLocation,
            address: destinationAddress,
          },
          distance: routeInfo.distance,
          duration: Math.round(routeInfo.duration),
          fare: suggestedFare || 0,
          vehicleTypeRequested: selectedVehicleType,
          paymentMethod: selectedPaymentMethod,
        });
        if (pickupLocation && destinationLocation)
          await cacheTripHistoryManager.addTrip({
            pickupLocation,
            pickupAddress,
            destinationLocation,
            destinationAddress,
            distance: routeInfo.distance,
            duration: routeInfo.duration,
            fare: suggestedFare || 0,
          });
        autoExpireCalledRef.current = false;
        setRideRequested(true);
        // Calcular tiempo restante desde expiresAt del backend
        const timeLeftInSeconds = res.expiresAt
          ? Math.max(0, (new Date(res.expiresAt).getTime() - Date.now()) / 1000)
          : 120; // Fallback a 120 si no hay expiresAt
        setRequestTimeLeft(timeLeftInSeconds);
        setActiveRideId(res.id);

        // 🔌 Socket: unirse al room del viaje y notificar a conductores cercanos
        socketService.joinRide(res.id);
        socketService.notifyRideCreated(res.id);

        // 💾 Guardar estado para persistencia (incluyendo expiresAt)
        StorageHelper.setItem(
          'activeRideState',
          JSON.stringify({
            rideRequested: true,
            activeRideId: res.id,
            expiresAt: res.expiresAt,
          }),
        );
        console.log('💾 [MapScreen] Estado de solicitud guardado:', {
          rideId: res.id,
          expiresAt: res.expiresAt,
          timeLeftInSeconds: timeLeftInSeconds.toFixed(1),
          now: new Date().toISOString(),
          expiresAtObject: res.expiresAt
            ? new Date(res.expiresAt).toISOString()
            : 'N/A',
        });
      } catch (e: any) {
        // El API client lanza { status, data } en lugar de un Error estándar
        const serverMsg: string | undefined =
          e?.data?.error ?? e?.data?.message ?? e?.message;

        if (e?.status === 422 && e?.data?.code === 'OUT_OF_SERVICE_AREA') {
          Alert.alert(
            'Fuera de cobertura',
            'El punto de recogida está fuera de nuestras zonas de servicio.',
          );
        } else {
          Alert.alert(
            'No se pudo crear el viaje',
            serverMsg ?? 'Verifica tu conexión e intenta de nuevo.',
          );
        }
      } finally {
        setIsCreatingRide(false);
      }
    })();
  };

  const handleAutoExpireRide = async () => {
    if (activeRideId)
      await ridesService
        .cancelRide(activeRideId, 'Expirada', 'system')
        .catch(() => { });
    setRideRequested(false);
    setRequestTimeLeft(120);
    setActiveRideId(null);
    if (requestTimerRef.current) clearInterval(requestTimerRef.current);

    // 🗑️ Limpiar estado de storage
    StorageHelper.removeItem('activeRideState');
    console.log('🗑️ [MapScreen] Estado de solicitud limpiado (expirada)');

    Alert.alert('Sin conductor', 'No se encontró conductor. Intenta de nuevo.');
  };

  const handleCancelRide = () => {
    Alert.alert('¿Cancelar solicitud?', 'Se cancelará tu solicitud de viaje.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancelar',
        style: 'destructive',
        onPress: async () => {
          if (activeRideId)
            await ridesService
              .cancelRide(activeRideId, 'Cancelado por pasajero', 'passenger')
              .catch(() => { });
          setRideRequested(false);
          setRequestTimeLeft(120);
          setActiveRideId(null);
          if (activeRideId) socketService.leaveRide(activeRideId);
          if (requestTimerRef.current) clearInterval(requestTimerRef.current);

          // 🗑️ Limpiar estado de storage
          StorageHelper.removeItem('activeRideState');
          console.log(
            '🗑️ [MapScreen] Estado de solicitud limpiado (cancelada)',
          );
        },
      },
    ]);
  };

  const handleRejectOffer = async (offerId: string) => {
    if (!activeRideId) return;
    await ridesService
      .rejectCounterOffer(activeRideId, offerId)
      .catch(() => { });
    setDriverOffers(p => p.filter(o => o.offerId !== offerId));
  };

  const handleAcceptOffer = async (offer: any) => {
    if (!activeRideId) return;
    try {
      await ridesService.acceptCounterOffer(
        activeRideId,
        offer.offerId,
        offer.proposedPrice || offer.fare,
      );
      setShowOffersOverlay(false);
      setDriverOffers([]);
      setRideRequested(false);
      setActiveRideId(null);
      if (requestTimerRef.current) clearInterval(requestTimerRef.current);

      // 🗑️ Limpiar estado de storage
      StorageHelper.removeItem('activeRideState');
      console.log(
        '🗑️ [MapScreen] Estado de solicitud limpiado (oferta aceptada)',
      );

      Alert.alert('¡Conductor asignado!', 'Tu viaje está confirmado.', [
        {
          text: 'Ver detalles',
          onPress: () =>
            navigation.navigate('ActiveRide' as any, { rideId: activeRideId }),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  };

  const progress = requestTimeLeft / 120;

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* MAP CONTAINER — pin is a sibling of MapView so it never scrolls */}
      <View style={s.mapWrapper}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setMapWrapDimensions({ width, height });
        }}
      >
        <MapView
          ref={mapRef}
          style={s.map}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          mapType="standard"
          customMapStyle={CUSTOM_MAP_STYLE}
          userInterfaceStyle="light"
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          onMapReady={() => { }}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={T.accent}
              strokeWidth={3.5}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {pickupLocation && (
            <Marker coordinate={pickupLocation} title="Origen">
              <View style={{ alignItems: 'center' }}>
                <Text style={s.markerLabelTxt}>Origen</Text>
                <View style={s.markerDotLila} />
              </View>
            </Marker>
          )}
          {destinationLocation && (
            <Marker coordinate={destinationLocation} title="Destino">
              <View style={{ alignItems: 'center' }}>
                <Text style={s.markerLabelTxt}>Destino</Text>
                <View style={s.markerDotLila} />
              </View>
            </Marker>
          )}
          {waypoints.map((wp, idx) => (
            <Marker key={`wp-${idx}`} coordinate={{ latitude: wp.latitude, longitude: wp.longitude }} title={`Parada ${idx + 1}`}>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.markerLabelTxt}>{idx + 1}</Text>
                <View style={s.markerDotLila} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* ── FLOATING PIN — rendered over the map, stationary ── */}
        <FloatingPin
          visible={showMarker && (pickingMode !== null || !pickupLocation)}
          address={tempPickupAddress}
          loading={searchingAddress}
          containerWidth={mapWrapDimensions.width}
          containerHeight={mapWrapDimensions.height}
          mode={pickingMode || 'origin'}
        />

        {/* ── USER BUTTON ── */}
        {pickingMode === null && !rideRequested && (
          <TouchableOpacity
            style={[s.locBtn, { top: 5 + insets.top }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Icon.User size={26} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* ── MY LOCATION ── */}
        {pickingMode === null && !rideRequested && (
          <TouchableOpacity
              style={[
                s.locBtn,
                {
                  bottom: destinationLocation
                    ? Platform.OS === 'android'
                      ? 10
                      : 370 + insets.bottom
                    : 390,
                  zIndex: 10,
                },
              ]}
            onPress={() => centerToUserLocation(true)}
            activeOpacity={0.8}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={T.accent} />
            ) : (
              <Icon.MyLocation size={30} color="#000000" strokeWidth={2.0} />
            )}
          </TouchableOpacity>
        )}

        {/* ── SEARCH MODAL ── */}
        {!destinationLocation && pickingMode === null && (
          <View style={s.searchModalWrapper}>
            <View style={s.searchModalCard}>
              <TouchableOpacity
                style={s.searchInput}
                onPress={goToSearchScreen}
                activeOpacity={0.9}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={s.searchIcon}>
                    <Icon.Search size={22} color="#7C3AED" />
                  </View>
                  <Text style={s.searchPlaceholder}>¿A dónde vamos?</Text>
                </View>
                <TouchableOpacity
                  style={[s.scheduleBtn, scheduleRide && s.scheduleBtnActive]}
                  onPress={() => setScheduleRide(!scheduleRide)}
                >
                  <Clock size={18} color={scheduleRide ? '#FFFFFF' : '#7C3AED'} />
                  <Text style={[s.scheduleBtnText, scheduleRide && s.scheduleBtnTextActive]}>Ahora</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={s.quickDestinations}>
                <TouchableOpacity style={s.quickDestItem}>
                  <View style={s.quickDestIcon}>
                    <Icon.Home size={26} color="#7C3AED" />
                  </View>
                  <View style={s.quickDestContent}>
                    <Text style={s.quickDestText}>Casa</Text>
                    <Text style={s.quickDestAdd}>Agregar</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.quickDestItem}>
                  <View style={s.quickDestIcon}>
                    <Icon.Briefcase size={26} color="#7C3AED" />
                  </View>
                  <View style={s.quickDestContent}>
                    <Text style={s.quickDestText}>Trabajo</Text>
                    <Text style={s.quickDestAdd}>Agregar</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.quickDestItem}>
                  <View style={s.quickDestIcon}>
                    <Icon.Star size={26} color="#7C3AED" />
                  </View>
                  <View style={s.quickDestContent}>
                    <Text style={s.quickDestText}>Favoritos</Text>
                    <Text style={s.quickDestAdd}>Agregar</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={s.recentTripsSection}>
                <Text style={s.recentTripsTitle}>Viajes recientes</Text>
                {recentTrips.map((trip: any, index: number) => (
                  <TouchableOpacity key={index} style={s.recentTripItem}>
                    <View style={s.recentTripIcon}>
                      <MapPin size={26} color="#7C3AED" />
                    </View>
                    <View style={s.recentTripContent}>
                      <Text style={s.recentTripText} numberOfLines={1}>
                        {trip.destinationAddress || trip.dropoffLocation?.address}
                      </Text>
                      <Text style={s.recentTripSubtext}>
                        {trip.pickupAddress || trip.pickupLocation?.address}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.recentTripStar}
                      onPress={() => toggleFavorite(trip.id)}
                      activeOpacity={0.7}
                    >
                      <Icon.Star
                        size={20}
                        color="#7C3AED"
                        filled={favoriteIds.has(trip.id)}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* BOTTOM PANEL */}
      {pickingMode !== null ? (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: Math.max(insets.bottom, 24) + 16,
            alignSelf: 'center',
            backgroundColor: T.accent,
            paddingHorizontal: 48,
            paddingVertical: 16,
            borderRadius: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
          onPress={() => {
            const updatedStops = allStops.length > 0 && editingStopIndex != null
              ? allStops.map((s: any, i: number) => i === editingStopIndex
                  ? { location: { latitude: mapCenterLocation?.latitude ?? s.location.latitude, longitude: mapCenterLocation?.longitude ?? s.location.longitude }, address: tempPickupAddress || s.address }
                  : s)
              : undefined;
            if (pickingMode === 'origin') {
              navigation.navigate('Search' as any, { pickupLocation: mapCenterLocation, pickupAddress: tempPickupAddress, destinationLocation, destinationAddress, ...(updatedStops ? { stops: updatedStops } : {}) });
            } else {
              navigation.navigate('Search' as any, { pickupLocation, pickupAddress, destinationLocation: mapCenterLocation, destinationAddress: tempPickupAddress, ...(updatedStops ? { stops: updatedStops } : {}) });
            }
            setPickingMode(null);
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: T.white, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
            Hecho
          </Text>
        </TouchableOpacity>
      ) : destinationLocation ? (
        <View style={s.panel}>
          {rideRequested ? (
            <View style={s.timerWrap}>
              <View style={s.timerInfo}>
                <View style={s.timerDot} />
                <Text style={s.timerLabel}>Buscando conductor</Text>
                <Text style={s.timerVal}>{fmtTimer(requestTimeLeft)}</Text>
              </View>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${progress * 100}%` as any },
                  ]}
                />
              </View>
            </View>
          ) : null}

          <View style={s.routePill}>
            <View style={s.routeAddr}>
              <View style={[s.routeDot, { backgroundColor: T.success }]} />
              <Text style={s.routeAddrText} numberOfLines={1}>
                {pickupAddress || tempPickupAddress}
              </Text>
            </View>
            <View style={s.routeConnector}>
              <View style={s.routeLine} />
            </View>
            <View style={s.routeAddr}>
              <View style={[s.routeDot, { backgroundColor: T.accent }]} />
              <Text
                style={[s.routeAddrText, { color: T.ink, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {destinationAddress}
              </Text>
            </View>
          </View>

          {suggestedFare != null && (
            <View style={s.fareRow}>
              <Text style={s.fareLabel}>Ajustar tarifa</Text>
              <View style={s.fareControls}>
                <TouchableOpacity
                  style={s.fareBtn}
                  onPress={() =>
                    setSuggestedFare(p =>
                      p ? Math.max(0.5, +(p - FARE_STEP).toFixed(2)) : p,
                    )
                  }
                >
                  <Icon.Minus size={24} color={T.inkMid} />
                </TouchableOpacity>
                <Text style={s.fareValue}>BS {suggestedFare.toFixed(2)}</Text>
                <TouchableOpacity
                  style={s.fareBtn}
                  onPress={() =>
                    setSuggestedFare(p => (p ? +(p + FARE_STEP).toFixed(2) : p))
                  }
                >
                  <Icon.Plus size={24} color={T.inkMid} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {routeInfo && (
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Icon.Distance size={14} color={T.inkLight} />
                <Text style={s.statVal}>{fmtDist(routeInfo.distance)}</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.stat}>
                <Icon.Clock size={14} color={T.inkLight} />
                <Text style={s.statVal}>{fmtTime(routeInfo.duration)}</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.stat}>
                <Icon.Money size={14} color={T.inkLight} />
                <Text
                  style={[s.statVal, { color: T.accent, fontWeight: '700' }]}
                >
                  {suggestedFare != null
                    ? `Bs ${suggestedFare.toFixed(2)}`
                    : '—'}
                </Text>
              </View>
            </View>
          )}

          {!rideRequested && (
            <>
              <View style={s.selectorsContainer}>
                <View style={s.selectorRow}>
                  <Text style={s.selectorLabel}>Vehículo:</Text>
                  <View style={s.optionsWrap}>
                    {[
                      { id: 'taxi', label: 'Taxi' },
                      { id: 'minibus', label: 'Minibús' },
                      { id: 'motorcycle', label: 'Moto' },
                      { id: 'bus', label: 'Bus' },
                    ].map(type => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          s.optionChip,
                          selectedVehicleType === type.id && s.optionChipActive,
                        ]}
                        onPress={() => setSelectedVehicleType(type.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            s.optionText,
                            selectedVehicleType === type.id &&
                            s.optionTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.selectorRow}>
                  <Text style={s.selectorLabel}>Pago:</Text>
                  <View style={s.optionsWrap}>
                    {[
                      { id: 'cash', label: 'Efectivo' },
                      { id: 'qr', label: 'QR' },
                    ].map(method => (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          s.optionChip,
                          selectedPaymentMethod === method.id &&
                          s.optionChipActive,
                        ]}
                        onPress={() => setSelectedPaymentMethod(method.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            s.optionText,
                            selectedPaymentMethod === method.id &&
                            s.optionTextActive,
                          ]}
                        >
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={s.ctaRow}>
                <TouchableOpacity
                  style={s.ghostBtn}
                  onPress={resetAll}
                  activeOpacity={0.8}
                >
                  <Icon.Close size={16} color={T.inkMid} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.ctaBtn, isCreatingRide && { opacity: 0.7 }]}
                  onPress={confirmTrip}
                  activeOpacity={0.85}
                  disabled={isCreatingRide}
                >
                  {routeLoading || isCreatingRide ? (
                    <ActivityIndicator size="small" color={T.white} />
                  ) : (
                    <>
                      <Icon.Car size={18} color={T.white} />
                      <Text style={s.ctaBtnText}>Solicitar viaje</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {rideRequested && (
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={handleCancelRide}
              activeOpacity={0.8}
            >
              <Icon.Close size={16} color={T.danger} />
              <Text style={s.cancelBtnText}>Cancelar solicitud</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* DRIVER OFFERS - FLOATING BUBBLES */}
      {showOffersOverlay && driverOffers.length > 0 && (
        <View style={s.offersBubblesContainer} pointerEvents="box-none">
          <View style={s.offersBubbles} pointerEvents="box-none">
            {driverOffers.map((offer, i) => {
              const created =
                typeof offer.createdAt === 'string'
                  ? new Date(offer.createdAt).getTime()
                  : offer.createdAt || Date.now();
              // Siempre calcular rem desde createdAt para animación suave y continua.
              // timeLeftInSeconds del backend se usa solo para filtrar, no para animar.
              const rem = Math.max(0, 30 - (Date.now() - created) / 1000);
              // Ocultar la burbuja cuando quedan ≤5 s para evitar que el pasajero
              // intente aceptar una oferta que expirará antes de llegar al servidor.
              if (rem <= 5) return null;
              return (
                <View
                  key={offer.offerId || i}
                  style={s.offerBubble}
                  pointerEvents="auto"
                >
                  <View style={s.offerTopBar}>
                    <View
                      style={[
                        s.offerProgressFill,
                        { width: `${Math.max(0, (rem - 5) / 25) * 100}%` as any },
                      ]}
                    />
                  </View>

                  <View style={s.offerContent}>
                    <View style={s.offerHeader}>
                      {offer.driverProfilePicture ? (
                        <Image
                          source={{ uri: offer.driverProfilePicture }}
                          style={s.offerAvatar}
                        />
                      ) : (
                        <View style={s.offerAvatar}>
                          <Icon.Car size={24} color={'#9CA3AF'} />
                        </View>
                      )}

                      <View style={s.offerInfo}>
                        <Text style={s.offerVehicleText} numberOfLines={1}>
                          {offer.vehicleModel || 'Vehículo'}
                        </Text>
                        <Text style={s.offerDriverName} numberOfLines={1}>
                          {offer.driverName || 'Conductor'}
                        </Text>
                        <View style={s.offerRatingRow}>
                          <Icon.Star size={14} color="#F59E0B" />
                          <Text style={s.offerRatingText}>
                            {offer.driverRating || '5.0'}
                          </Text>
                        </View>
                      </View>

                      <View style={s.offerRightStats}>
                        <Text style={s.offerPrice}>
                          Bs {(offer.proposedPrice || offer.fare || 0).toFixed(2)}
                        </Text>
                        <Text style={s.offerStatText}>{Math.round(rem)}s</Text>
                      </View>
                    </View>

                    <View style={s.offerActions}>
                      <TouchableOpacity
                        style={s.offerRejectBtn}
                        onPress={() => handleRejectOffer(offer.offerId)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.offerRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.offerAcceptBtn}
                        onPress={() => handleAcceptOffer(offer)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.offerAcceptText}>Aceptar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <SlideUpMenu
        visible={showClientMenu}
        onClose={() => setShowClientMenu(false)}
        user={user}
        menuItems={[
          {
            icon: <Icon.User size={20} color={T.inkMid} />,
            label: 'Mi Perfil',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <Icon.History size={20} color={T.inkMid} />,
            label: 'Mis Viajes',
            onPress: () => navigation.navigate('RideHistory'),
          },
          {
            icon: <Icon.Settings size={20} color={T.inkMid} />,
            label: 'Ajustes',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <Icon.Bell size={20} color={T.inkMid} />,
            label: 'Notificaciones',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <Icon.HelpCircle size={20} color={T.inkMid} />,
            label: 'Ayuda',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            icon: <Icon.MessageCircle size={20} color={T.inkMid} />,
            label: 'Soporte',
            onPress: () => navigation.navigate('Profile'),
          },
        ]}
        closeButton={{
          label: 'Modo Conductor',
          onPress: () => navigation.navigate('Profile'),
          backgroundColor: T.accent,
          textColor: T.white,
        }}
        theme={{
          primary: T.accent,
          accent: T.accent,
          text: T.ink,
          textMuted: T.inkMid,
          border: T.border,
          bg: T.bg,
          white: T.white,
          overlay: 'rgba(0,0,0,0.4)',
          avatarBg: T.accentSoft,
        }}
      />
    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, flexDirection: 'column' },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapWrap: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // ── FLOATING PIN ──────────────────────────────────────────────────────────
  pinAnchor: { position: 'absolute' },
  pinStack: { width: 240, alignItems: 'center' },
  pinBubble: {
    backgroundColor: T.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: 240,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pinBubbleText: { fontSize: 12, color: T.ink, fontWeight: '600', textAlign: 'center' },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 25,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 2,
  },
  pinHole: { width: 15, height: 15, borderRadius: 9, backgroundColor: '#FFFFFF' },
  pinStem: {
    width: 5,
    height: 32,
    backgroundColor: T.accent,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: -4,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── MAP CONTROLS ──────────────────────────────────────────────────────────
  locBtn: {
    position: 'absolute',
    right: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchModalWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: { marginRight: 8 },
  searchPlaceholder: { fontSize: 18, color: '#000000', fontWeight: '700' },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EDE9FE', gap: 6, marginLeft: 12 },
  scheduleBtnActive: { backgroundColor: '#7C3AED' },
  scheduleBtnText: { fontSize: 14, color: '#7C3AED', fontWeight: '600' },
  scheduleBtnTextActive: { color: '#FFFFFF' },
  quickDestinations: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 8 },
  quickDestItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  quickDestContent: { flexDirection: 'column' },
  quickDestIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  quickDestText: { fontSize: 14, color: '#000000', fontWeight: '500' },
  quickDestAdd: { fontSize: 11, color: '#999999', fontWeight: '400' },
  recentTripsSection: { paddingHorizontal: 24, paddingBottom: 10 },
  recentTripItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  recentTripsTitle: { fontSize: 12, color: '#999999', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentTripIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  recentTripContent: { flex: 1 },
  recentTripText: { fontSize: 15, color: '#000000', fontWeight: '500' },
  recentTripSubtext: { fontSize: 13, color: '#999999', fontWeight: '400', marginTop: 2 },
  recentTripStar: { padding: 4 },

  // ── MAP MARKERS ───────────────────────────────────────────────────────────
  dotGray: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E7E8ED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BDBDBD' },
  dotGrayInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9E9E9E' },
  dotBlue: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E7E8ED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BDBDBD' },
  dotBlueInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9E9E9E' },
  markerLabelTxt: { fontSize: 10, fontWeight: '800', color: T.ink, backgroundColor: T.white, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 3, overflow: 'hidden' },
  markerDotLila: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.accent, borderWidth: 2, borderColor: T.white },

  // ── BOTTOM PANEL ──────────────────────────────────────────────────────────
  panel: { backgroundColor: T.white, marginTop: -24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  routePill: { backgroundColor: T.bg, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  routeAddr: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeAddrText: { flex: 1, fontSize: 13, color: T.inkMid, fontWeight: '500' },
  routeConnector: { paddingLeft: 3, paddingVertical: 3 },
  routeLine: { width: 1.5, height: 10, backgroundColor: T.border, marginLeft: 3 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statVal: { fontSize: 13, fontWeight: '600', color: T.ink },
  statDiv: { width: 1, height: 20, backgroundColor: T.border },
  fareRow: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  fareLabel: { fontSize: 12, color: T.inkLight, fontWeight: '500', marginBottom: -12 },
  fareControls: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareBtn: { width: 45, height: 45, borderRadius: 21, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  fareValue: { fontSize: 25, fontWeight: '800', color: T.accent, minWidth: 120, textAlign: 'center' },
  timerWrap: { gap: 10 },
  timerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.warn },
  timerLabel: { flex: 1, fontSize: 13, color: T.inkMid, fontWeight: '500' },
  timerVal: { fontSize: 15, fontWeight: '700', color: T.warn },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: T.border, overflow: 'hidden', marginHorizontal: 2 },
  progressFill: { height: '100%', backgroundColor: T.accent, borderRadius: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: T.danger },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: T.danger },

  // ── SELECTORS ─────────────────────────────────────────────────────────────
  selectorsContainer: { marginBottom: 16, gap: 12 },
  selectorRow: { flexDirection: 'column', gap: 8 },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: T.inkMid },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  optionChipActive: { backgroundColor: T.accent + '15', borderColor: T.accent },
  optionText: { fontSize: 13, color: T.inkMid, fontWeight: '500' },
  optionTextActive: { color: T.accent, fontWeight: '700' },

  ctaRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  ctaBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: T.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: T.white, letterSpacing: 0.2 },

  // ── OFFERS BUBBLES ──────────────────────────────────────────────────────────
  offersBubblesContainer: { position: 'absolute', top: 140, left: 16, right: 16, alignItems: 'center', justifyContent: 'flex-start', zIndex: 999, pointerEvents: 'box-none' },
  offersBubbles: { width: '100%', maxWidth: 400, alignItems: 'center', pointerEvents: 'box-none', gap: 12 },
  offerBubble: { width: '100%', backgroundColor: T.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  offerTopBar: { height: 4, backgroundColor: '#E5E7EB', width: '100%' },
  offerProgressFill: { height: '100%', backgroundColor: T.accent },
  offerContent: { padding: 16 },
  offerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  offerAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  offerInfo: { flex: 1, justifyContent: 'center' },
  offerVehicleText: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 2 },
  offerDriverName: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  offerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerRatingText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  offerRightStats: { alignItems: 'flex-end' },
  offerPrice: { fontSize: 22, fontWeight: '800', color: T.accent, marginBottom: 4 },
  offerStatText: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  offerActions: { flexDirection: 'row', gap: 12 },
  offerRejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  offerRejectText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  offerAcceptBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  offerAcceptText: { fontSize: 16, fontWeight: '700', color: T.white },
  offersHint: { fontSize: 11, color: T.inkLight, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },

  // ── MENU ──────────────────────────────────────────────────────────────────
});

export default MapScreen;
