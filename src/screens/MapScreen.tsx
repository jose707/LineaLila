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
  Animated,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MapView, { Marker, Region, LatLng } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Clock,
  MapPin,
  X,
} from 'lucide-react-native';
import { Icon } from '../theme/icons';
import { RootStackParamList, Stop } from '../navigation/AppNavigator';
import { CreateRideRequest } from '../types/api';
import { SlideUpMenu } from '../components/SlideUpMenu';
import { RouteSummaryCard } from '../components/RouteSummaryCard';
import { StopsModal } from '../components/StopsModal';
import { AddStopModal } from '../components/AddStopModal';
import { RideRequestPanel } from '../components/RideRequestPanel';
import { AnimatedRoutePolyline } from '../components/AnimatedRoutePolyline';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from '../components/MapLocationIcons';
import SavedPlacesModal, { SavedPlace } from '../components/SavedPlacesModal';
import Toast from '../components/Toast';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAuth } from '../hooks/useAuth';
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import {
  cacheLocationManager,
  cacheRouteManager,
  cacheTripHistoryManager,
  cleanExpiredCache,
} from '../utils/cacheManager';
import type { TripHistory } from '../utils/cacheManager';
import { ridesService } from '../services/rides.service';
import { authService } from '../services/auth.service';
import { StorageHelper } from '../services/storage';
import socketService from '../services/socket.service';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const LOCATIONIQ_API_KEY = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';
const FARE_STEP = 0.5;
const TRAFFIC_CORRECTION_FACTOR = 3;
const PIN_TIP_OFFSET = 106;
const PANEL_SLIDE_DURATION_MS = 350;

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

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
          ? Math.floor(containerHeight / 2) - PIN_TIP_OFFSET
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
      {/* El extremo inferior del pin coincide con la coordenada seleccionada. */}
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
  const { height: screenHeight } = useWindowDimensions();

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

  // 🔒 BackHandler para double-back-to-exit
  useEffect(() => {
    let backPressCount = 0;
    let backPressTimeout: ReturnType<typeof setTimeout> | null = null;

    const onBackPress = () => {
      if (savingMode) {
        setSavingMode(null);
        return true;
      }

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
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [savingMode, setSavingMode] = useState<'home' | 'work' | 'favorite' | null>(null);
  const [mapCenterLocation, setMapCenterLocation] = useState<LatLng | null>(
    null,
  );
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [mapGeneration, setMapGeneration] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const routeRevisionRef = useRef(0);
  const skipRouteCacheRef = useRef(false);
  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const [quickAssigning, setQuickAssigning] = useState(false);
  const creatingRideRef = useRef(false);
  const [suggestedFare, setSuggestedFare] = useState<number | null>(null);
  const [originalFare, setOriginalFare] = useState<number | null>(null);
  const [showFareEditor, setShowFareEditor] = useState(false);
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [negotiationMode, setNegotiationMode] = useState(false);

  useFocusEffect(useCallback(() => {
    creatingRideRef.current = false;
    setIsCreatingRide(false);
    if (isDriverMode) return;
    let active = true;
    ridesService.currentQuick().then(({ ride }) => {
      if (!active || !ride || creatingRideRef.current) return;
      if (ride.status === 'requested') navigation.navigate('QuickAssignment', { rideId: ride.id });
      else navigation.navigate('ActiveRide', { rideId: ride.id });
    }).catch(() => {});
    return () => { active = false; };
  }, [isDriverMode, navigation]));
  const toggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: negotiationMode ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [negotiationMode, toggleAnim]);
  const [selectedVehicleType, setSelectedVehicleType] =
    useState<string>('taxi');
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>('cash');
  const [scheduleRide, setScheduleRide] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [mapWrapDimensions, setMapWrapDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [routePanelHeight, setRoutePanelHeight] = useState(0);
  const [searchPanelMounted, setSearchPanelMounted] = useState(true);
  const [requestPanelVisible, setRequestPanelVisible] = useState(false);
  const searchPanelOffset = useRef(new Animated.Value(0)).current;
  const requestPanelOffset = useRef(new Animated.Value(screenHeight)).current;
  const quickAssignmentPanelHiddenRef = useRef(false);
  const negotiationReturnPendingRef = useRef(false);
  const routeCardOffset = useRef(new Animated.Value(-220 - insets.top)).current;
  const routeVisualFade = useRef(new Animated.Value(1)).current;
  const [routeVisualOpacity, setRouteVisualOpacity] = useState(1);
  const routeFitPendingRef = useRef<number | null>(null);
  const routeFitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReturningToStartRef = useRef(false);
  const animateSearchEntranceRef = useRef(false);
  const [fareSettings, setFareSettings] = useState<{
    baseFare: number;
    farePerKm: number;
    farePerMinute: number;
  }>({
    baseFare: 12,
    farePerKm: 0.5,
    farePerMinute: 0.58,
  });
  const [recentTrips, setRecentTrips] = useState<TripHistory[]>([]);
  const [recentTripsLoading, setRecentTripsLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showSavedPlacesModal, setShowSavedPlacesModal] = useState(false);
  const [savedHomeAddress, setSavedHomeAddress] = useState<SavedPlace | null>(null);
  const [savedWorkAddress, setSavedWorkAddress] = useState<SavedPlace | null>(null);
  const [savedFavoritePlaces, setSavedFavoritePlaces] = useState<SavedPlace[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('✓');

  const mapRef = useRef<MapView>(null);
  const pickupMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const destinationMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  const mapRegionRef = useRef<Region | null>(route.params?.mapRegion ?? null);
  const mapSizeRef = useRef({ width: 0, height: 0 });
  const addressLookupRevisionRef = useRef(0);
  const manualCenterRevisionRef = useRef(0);
  const watchId = useRef<number | null>(null);
  const isManualCenteringRef = useRef(false);
  const showRouteCard = Boolean(destinationLocation && pickingMode === null);
  const redrawLocationMarkers = useCallback(() => {
    pickupMarkerRef.current?.redraw();
    destinationMarkerRef.current?.redraw();
  }, []);

  useEffect(() => navigation.addListener('focus', () => {
    if (!quickAssignmentPanelHiddenRef.current) return;
    quickAssignmentPanelHiddenRef.current = false;
    requestPanelOffset.setValue(0);
  }), [navigation, requestPanelOffset]);

  useFocusEffect(useCallback(() => {
    if (!negotiationReturnPendingRef.current) return;
    const coordinates = routeCoordinates.length >= 2
      ? routeCoordinates
      : routeInfo?.coordinates ?? [];
    if (!pickupLocation || !destinationLocation || coordinates.length < 2) return;
    negotiationReturnPendingRef.current = false;
    if (routeCoordinates.length < 2) setRouteCoordinates(coordinates);
    setShowMarker(false);
    routeVisualFade.stopAnimation();
    routeVisualFade.setValue(1);
    setRouteVisualOpacity(1);
    setRequestPanelVisible(false);
    requestPanelOffset.stopAnimation();
    requestPanelOffset.setValue(screenHeight);
    routeCardOffset.stopAnimation();
    routeCardOffset.setValue(-220 - insets.top);
    Animated.timing(routeCardOffset, {
      toValue: 0,
      duration: PANEL_SLIDE_DURATION_MS,
      useNativeDriver: true,
    }).start();
    // Recreate native map features after the full-screen negotiation map closes.
    // Keep the saved region and geometry; replay only when the new map is ready.
    setMapReady(false);
    setMapGeneration(generation => generation + 1);
  }, [pickupLocation, destinationLocation, routeCoordinates, routeInfo,
    requestPanelOffset, routeCardOffset, routeVisualFade, screenHeight, insets.top]));

  useEffect(() => {
    const listener = routeVisualFade.addListener(({ value }) => {
      setRouteVisualOpacity(Math.round(value * 25) / 25);
    });
    return () => routeVisualFade.removeListener(listener);
  }, [routeVisualFade]);

  useEffect(() => {
    routeCardOffset.stopAnimation();
    routeCardOffset.setValue(-220 - insets.top);
    if (showRouteCard) {
      Animated.timing(routeCardOffset, {
        toValue: 0,
        duration: PANEL_SLIDE_DURATION_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [showRouteCard, insets.top, routeCardOffset]);

  const revealRequestPanel = useCallback((revision: number) => {
    if (revision !== routeRevisionRef.current || !destinationLocation || isReturningToStartRef.current) return;
    routeFitPendingRef.current = null;
    if (routeFitTimerRef.current) clearTimeout(routeFitTimerRef.current);
    routeFitTimerRef.current = null;
    setRequestPanelVisible(true);
    Animated.timing(requestPanelOffset, {
      toValue: 0,
      duration: PANEL_SLIDE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [destinationLocation, requestPanelOffset]);

  useEffect(() => {
    if (destinationLocation) return;
    const animateEntrance = animateSearchEntranceRef.current;
    animateSearchEntranceRef.current = false;
    isReturningToStartRef.current = false;
    routeFitPendingRef.current = null;
    if (routeFitTimerRef.current) clearTimeout(routeFitTimerRef.current);
    routeFitTimerRef.current = null;
    searchPanelOffset.stopAnimation();
    requestPanelOffset.stopAnimation();
    routeVisualFade.stopAnimation();
    searchPanelOffset.setValue(animateEntrance ? screenHeight : 0);
    requestPanelOffset.setValue(screenHeight);
    routeVisualFade.setValue(1);
    setRouteVisualOpacity(1);
    setSearchPanelMounted(true);
    setRequestPanelVisible(false);
  }, [destinationLocation, requestPanelOffset, routeVisualFade,
    screenHeight, searchPanelOffset]);

  useEffect(() => () => {
    if (routeFitTimerRef.current) clearTimeout(routeFitTimerRef.current);
  }, []);

  // ── EFFECTS ──────────────────────────────────────────────────────────────

  // Monitor de cambios en user.rating
  useEffect(() => {
  }, [user?.rating]);

  // Cargar configuración de tarifas según coordenadas
  const loadFareSettings = useCallback(async (lat: number, lng: number) => {
    const settings = await ridesService.getFareSettings(lat, lng);
    if (settings) {
      setFareSettings({
        baseFare: settings.baseFare,
        farePerKm: settings.farePerKm,
        farePerMinute: settings.farePerMinute,
      });
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
      authService.fetchCurrentUser().then(updatedUser => {
        if (updatedUser) {
          updateUser(updatedUser);
        }
      });
    }
  }, [showClientMenu, updateUser]);

  useEffect(() => {
    cleanExpiredCache();
  }, []);

  // Mostrar destinos recientes, independientemente del origen usado antes.
  useFocusEffect(useCallback(() => {
    let active = true;
    setRecentTripsLoading(true);
    cacheTripHistoryManager.getTrips().then(trips => {
      if (active) {
        setRecentTrips(trips.slice(0, 3));
        const savedFavorites = StorageHelper.getItem('favoriteTripIds');
        if (savedFavorites) {
          try {
            const ids = JSON.parse(savedFavorites);
            if (Array.isArray(ids)) setFavoriteIds(new Set(ids));
          } catch { /* Un favorito dañado no impide mostrar destinos recientes. */ }
        }
      }
    }).finally(() => {
      if (active) setRecentTripsLoading(false);
    });
    return () => { active = false; };
  }, []));

  // El historial de búsqueda guarda solo el destino seleccionado.
  useEffect(() => {
    if (!destinationLocation || !destinationAddress.trim()) return;
    let active = true;
    cacheTripHistoryManager.addTrip({
      destinationLocation,
      destinationAddress,
    }).then(() => cacheTripHistoryManager.getTrips()).then(trips => {
      if (active) setRecentTrips(trips.slice(0, 3));
    });
    return () => { active = false; };
  }, [destinationLocation, destinationAddress]);

  // Cargar favoritos y direcciones guardadas
  useEffect(() => {
    const loadSavedPlaces = () => {
      const saved = StorageHelper.getItem('favoriteTripIds');
      if (saved) {
        setFavoriteIds(new Set(JSON.parse(saved)));
      }
      const homeData = StorageHelper.getItem('savedHomeAddress');
      if (homeData) {
        setSavedHomeAddress(JSON.parse(homeData));
      }
      const workData = StorageHelper.getItem('savedWorkAddress');
      if (workData) {
        setSavedWorkAddress(JSON.parse(workData));
      }
      const favData = StorageHelper.getItem('savedFavoritePlaces');
      if (favData) {
        setSavedFavoritePlaces(JSON.parse(favData));
      }
    };
    loadSavedPlaces();
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

  const ensurePickup = async (): Promise<LatLng | null> => {
    if (pickupLocation) return pickupLocation;
    const currentPickup = mapCenterLocation || currentLocation;
    if (!currentPickup) return null;
    setLocationLoading(true);
    const addr = await getExactAddress(currentPickup).catch(() => tempPickupAddress);
    setPickupLocation(currentPickup);
    setPickupAddress(addr);
    setShowMarker(false);
    setLocationLoading(false);
    return currentPickup;
  };

  const handleSaveHome = async () => {
    const loc = pickupLocation || mapCenterLocation;
    if (!loc) return;
    const addr = pickupAddress || tempPickupAddress || await getExactAddress(loc);
    const place: SavedPlace = {
      id: 'home',
      type: 'home',
      label: 'Casa',
      address: addr,
      latitude: loc.latitude,
      longitude: loc.longitude,
    };
    setSavedHomeAddress(place);
    StorageHelper.setItem('savedHomeAddress', JSON.stringify(place));
    Alert.alert('Casa guardada', 'Tu dirección de casa ha sido guardada.');
  };

  const handleSaveWork = async () => {
    const loc = pickupLocation || mapCenterLocation;
    if (!loc) return;
    const addr = pickupAddress || tempPickupAddress || await getExactAddress(loc);
    const place: SavedPlace = {
      id: 'work',
      type: 'work',
      label: 'Trabajo',
      address: addr,
      latitude: loc.latitude,
      longitude: loc.longitude,
    };
    setSavedWorkAddress(place);
    StorageHelper.setItem('savedWorkAddress', JSON.stringify(place));
    Alert.alert('Trabajo guardado', 'Tu dirección de trabajo ha sido guardada.');
  };

  const showToast = (msg: string, icon = '✓') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setToastVisible(true);
  };

  useEffect(() => {
    const notice = route.params?.quickAssignmentNotice;
    if (!notice) return;
    showToast(notice, '!');
    navigation.setParams({ quickAssignmentNotice: undefined });
  }, [route.params?.quickAssignmentNotice, navigation]);

  const confirmSaveMode = async () => {
    const loc = mapCenterLocation;
    if (!loc || !savingMode) return;
    const addr = tempPickupAddress || await getExactAddress(loc);
    const place: SavedPlace = {
      id: savingMode === 'favorite' ? `fav-${Date.now()}` : savingMode,
      type: savingMode === 'favorite' ? 'favorite' : savingMode,
      label: savingMode === 'home' ? 'Casa' : savingMode === 'work' ? 'Trabajo' : addr.split(',')[0] || 'Favorito',
      address: addr,
      latitude: loc.latitude,
      longitude: loc.longitude,
    };
    if (savingMode === 'home') {
      setSavedHomeAddress(place);
      StorageHelper.setItem('savedHomeAddress', JSON.stringify(place));
    } else if (savingMode === 'work') {
      setSavedWorkAddress(place);
      StorageHelper.setItem('savedWorkAddress', JSON.stringify(place));
    } else {
      setSavedFavoritePlaces(prev => {
        const updated = [...prev, place];
        StorageHelper.setItem('savedFavoritePlaces', JSON.stringify(updated));
        return updated;
      });
    }
    setSavingMode(null);
    showToast('Se agregó destino correctamente');
    centerToUserLocation(false);
  };

  const handleDeleteHome = () => {
    Alert.alert('Eliminar Casa', '¿Quieres eliminar tu dirección de casa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setSavedHomeAddress(null);
          StorageHelper.removeItem('savedHomeAddress');
        },
      },
    ]);
  };

  const handleDeleteWork = () => {
    Alert.alert('Eliminar Trabajo', '¿Quieres eliminar tu dirección de trabajo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setSavedWorkAddress(null);
          StorageHelper.removeItem('savedWorkAddress');
        },
      },
    ]);
  };

  const handleDeleteFavorite = (placeId: string) => {
    Alert.alert('Eliminar favorito', '¿Quieres eliminar este lugar guardado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setSavedFavoritePlaces(prev => {
            const updated = prev.filter(p => p.id !== placeId);
            StorageHelper.setItem('savedFavoritePlaces', JSON.stringify(updated));
            return updated;
          });
        },
      },
    ]);
  };

  const handleAddFavorite = () => {
    setShowSavedPlacesModal(false);
    setShowMarker(true);
    setSavingMode('favorite');
  };

  const usePlaceAsDestination = (place: SavedPlace) => {
    setDestinationLocation({ latitude: place.latitude, longitude: place.longitude });
    setDestinationAddress(place.address);
  };

  const handleHomePress = async () => {
    if (savedHomeAddress) {
      await ensurePickup();
      usePlaceAsDestination(savedHomeAddress);
      return;
    }
    setShowMarker(true);
    setSavingMode('home');
  };

  const handleWorkPress = async () => {
    if (savedWorkAddress) {
      await ensurePickup();
      usePlaceAsDestination(savedWorkAddress);
      return;
    }
    setShowMarker(true);
    setSavingMode('work');
  };

  const handleFavoritesPress = () => {
    setShowSavedPlacesModal(true);
  };

  const handleSelectSavedPlace = async (place: SavedPlace) => {
    setShowSavedPlacesModal(false);
    await ensurePickup();
    usePlaceAsDestination(place);
  };

  const handleRecentTripPress = async (trip: TripHistory) => {
    if (!await ensurePickup()) {
      Alert.alert('Ubicación no disponible', 'No se pudo definir tu origen actual. Intenta de nuevo.');
      return;
    }
    setDestinationLocation({
      latitude: trip.destinationLocation.latitude,
      longitude: trip.destinationLocation.longitude,
    });
    setDestinationAddress(trip.destinationAddress);
  };

  const savedPlaces = useMemo<SavedPlace[]>(() => {
    const places: SavedPlace[] = [];
    if (savedHomeAddress) places.push(savedHomeAddress);
    if (savedWorkAddress) places.push(savedWorkAddress);
    places.push(...savedFavoritePlaces);
    return places;
  }, [savedHomeAddress, savedWorkAddress, savedFavoritePlaces]);

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

    const fare = parseFloat(roundedFare.toFixed(2));
    setSuggestedFare(fare);
    setOriginalFare(fare);
  }, [routeInfo, fareSettings]);

  const cancelAddStopOnMap = useCallback(() => {
    setIsAddingStop(false);
    setPickingMode(null);
    setShowMarker(false);
    setTempPickupAddress(pickupAddress);
    const points = routeCoordinates.length >= 2
      ? routeCoordinates
      : pickupLocation && destinationLocation
        ? [pickupLocation, ...waypoints, destinationLocation]
        : [];
    if (points.length >= 2) {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 200, right: 60, bottom: 110, left: 60 },
        animated: true,
      });
    }
  }, [pickupAddress, pickupLocation, destinationLocation, routeCoordinates, waypoints]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (creatingRideRef.current) return true;
        if (isAddingStop) {
          cancelAddStopOnMap();
          return true;
        }
        if (pickupLocation || destinationLocation) {
          resetAll();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [pickupLocation, destinationLocation, isAddingStop, cancelAddStopOnMap]),
  );

  useEffect(() => {
    if (!initialLocationLoaded) {
      const selectedPickup = route.params?.pickupLocation;
      if (selectedPickup) {
        setMapCenterLocation(selectedPickup);
        setInitialLocationLoaded(true);
      } else {
        centerToUserLocation(false).then(loc => {
          if (loc) setMapCenterLocation(loc);
          setInitialLocationLoaded(true);
        });
      }
    }
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
    mapRegionRef.current = region;
    if (routeFitPendingRef.current !== null) {
      revealRequestPanel(routeFitPendingRef.current);
    }
    if (isManualCenteringRef.current) return;
    const revision = ++addressLookupRevisionRef.current;
    const { width, height } = mapWrapDimensions;
    let center: LatLng = {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    if (width > 0 && height > 0 && mapRef.current) {
      try {
        center = await mapRef.current.coordinateForPoint({
          x: width / 2,
          y: height / 2 - PIN_TIP_OFFSET,
        });
      } catch {
        // La proyección nativa puede no estar lista en el primer render.
      }
    }
    if (revision !== addressLookupRevisionRef.current) return;

    setMapCenterLocation(center);
    if (!pickupLocation || pickingMode !== null) {
      try {
        setSearchingAddress(true);
        const address = await getExactAddress(center);
        if (revision === addressLookupRevisionRef.current) setTempPickupAddress(address);
      } catch {
      } finally {
        if (revision === addressLookupRevisionRef.current) setSearchingAddress(false);
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

  const centerPinAtLocation = (loc: LatLng): Promise<void> => {
    addressLookupRevisionRef.current += 1;
    const revision = ++manualCenterRevisionRef.current;
    setMapCenterLocation(loc);
    setShowMarker(true);
    isManualCenteringRef.current = true;
    const latitudeDelta = 0.01;
    const height = mapSizeRef.current.height;
    const estimatedOffset = height > 0 ? PIN_TIP_OFFSET / height * latitudeDelta : 0;
    mapRef.current?.animateToRegion(
      {
        latitude: loc.latitude - estimatedOffset,
        longitude: loc.longitude,
        latitudeDelta,
        longitudeDelta: 0.01,
      },
      500,
    );
    return new Promise(resolve => setTimeout(async () => {
      if (revision !== manualCenterRevisionRef.current) {
        resolve();
        return;
      }
      const map = mapRef.current;
      const { width, height: currentHeight } = mapSizeRef.current;
      if (map && width > 0 && currentHeight > 0) {
        try {
          const [atTip, atCenter] = await Promise.all([
            map.coordinateForPoint({ x: width / 2, y: currentHeight / 2 - PIN_TIP_OFFSET }),
            map.coordinateForPoint({ x: width / 2, y: currentHeight / 2 }),
          ]);
          if (revision !== manualCenterRevisionRef.current) return;
          map.animateCamera({ center: {
            latitude: atCenter.latitude + loc.latitude - atTip.latitude,
            longitude: atCenter.longitude + loc.longitude - atTip.longitude,
          } }, { duration: 250 });
        } catch {
          // La posición estimada sigue disponible si la proyección aún no responde.
        }
      }
      setTimeout(() => {
        if (revision === manualCenterRevisionRef.current) isManualCenteringRef.current = false;
        resolve();
      }, 300);
    }, 550));
  };

  const centerToUserLocation = async (showAlert = true, waitForCenter = false) => {
    setLocationLoading(true);
    try {
      if (!hasLocationPermission && Platform.OS === 'android')
        if (!(await requestLocationPermission())) {
          setLocationLoading(false);
          return null;
        }
      const loc = await getCurrentLocation();
      setCurrentLocation(loc);
      setTempPickupAddress(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
      const centering = centerPinAtLocation(loc);
      setLocationLoading(false);
      getExactAddress(loc)
        .then(setTempPickupAddress)
        .catch(() =>
          setTempPickupAddress(
            `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`,
          ),
        );
      if (waitForCenter) await centering;
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
    const revision = ++routeRevisionRef.current;
    const skipCache = skipRouteCacheRef.current;
    skipRouteCacheRef.current = false;
    setRouteLoading(true);
    setRouteCoordinates([]);
    const displayRoute = (coordinates: LatLng[], distance: number, duration: number) => {
      if (coordinates.length < 2) throw new Error('Ruta sin geometría');
      const samePoint = (a: LatLng, b: LatLng) =>
        Math.abs(a.latitude - b.latitude) < 0.000001 &&
        Math.abs(a.longitude - b.longitude) < 0.000001;
      const fromPickup = samePoint(coordinates[0], pickupLocation)
        ? coordinates
        : [pickupLocation, ...coordinates];
      const completeRoute = samePoint(fromPickup[fromPickup.length - 1], destinationLocation)
        ? fromPickup
        : [...fromPickup, destinationLocation];
      setRouteInfo({ distance, duration, coordinates: completeRoute });
      setRouteCoordinates(completeRoute);
    };
    try {
      const cached = waypoints.length === 0 && !skipCache
        ? await cacheRouteManager.getRoute(pickupLocation, destinationLocation)
        : null;
      if (revision !== routeRevisionRef.current) return;
      if (cached) {
        displayRoute(cached.coordinates, cached.distance, cached.duration);
        return;
      }
      const { latitude: sLat, longitude: sLon } = pickupLocation;
      const { latitude: eLat, longitude: eLon } = destinationLocation;

      // Build coordinates string: origin;waypoints;destination
      const wpCoords = waypoints
        .map(wp => `${wp.longitude},${wp.latitude}`)
        .join(';');
      const coordsStr = wpCoords
        ? `${sLon},${sLat};${wpCoords};${eLon},${eLat}`
        : `${sLon},${sLat};${eLon},${eLat}`;

      const r = await fetch(
        `${LOCATIONIQ_BASE_URL}/directions/driving/${coordsStr}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false`,
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (revision !== routeRevisionRef.current) return;
      if (d.routes?.length > 0) {
        const rt = d.routes[0];
        const coords = decodePolyline(rt.geometry);
        const rawDuration = rt.duration;
        const correctedDuration = Math.round(rawDuration * TRAFFIC_CORRECTION_FACTOR);
        if (waypoints.length === 0) {
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
        }
        if (revision !== routeRevisionRef.current) return;
        displayRoute(coords, rt.distance, correctedDuration);
      }
    } catch {
      if (revision === routeRevisionRef.current) createFallbackRoute();
    } finally {
      if (revision === routeRevisionRef.current) setRouteLoading(false);
    }
  }, [pickupLocation, destinationLocation, waypoints]);

  useEffect(() => {
    if (pickupLocation && destinationLocation) calculateRoute();
    else {
      routeRevisionRef.current += 1;
      setRouteInfo(null);
      setRouteCoordinates([]);
    }
  }, [calculateRoute, pickupLocation, destinationLocation]);

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
      ...waypoints.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude })),
      destinationLocation,
    ];
    const d = coords.slice(1).reduce((distance, point, index) => distance + calcDist(coords[index], point), 0);
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

  const formatScheduledDate = (date: Date) => {
    const day = date.getDate();
    const month = MONTHS_SHORT[date.getMonth()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${day} ${month}, ${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const openSchedulePicker = () => {
    const now = new Date();
    let pickedDate: Date | null = null;

    DateTimePickerAndroid.open({
      value: now,
      mode: 'date',
      minimumDate: now,
      onValueChange: (_event, date) => {
        pickedDate = date;
        setTimeout(() => {
          DateTimePickerAndroid.open({
            value: new Date(),
            mode: 'time',
            onValueChange: (_ev, time) => {
              if (!pickedDate) return;
              const finalDate = new Date(
                pickedDate.getFullYear(),
                pickedDate.getMonth(),
                pickedDate.getDate(),
                time.getHours(),
                time.getMinutes(),
                0,
                0,
              );
              if (finalDate <= new Date()) return;
              setScheduledDate(finalDate);
              setScheduleRide(true);
            },
          });
        }, 300);
      },
    });
  };

  const resetAll = (waitForCenter = false) => {
    setPickupLocation(null);
    setPickupAddress('');
    setTempPickupAddress('');
    setDestinationLocation(null);
    setDestinationAddress('');
    setWaypoints([]);
    setAllStops([]);
    setShowMarker(true);
    setRouteInfo(null);
    setRouteCoordinates([]);
    setSuggestedFare(null);
    setOriginalFare(null);
    setShowFareEditor(false);
    setNegotiationMode(false);
    setScheduledDate(null);
    setScheduleRide(false);
    setSavingMode(null);
    return centerToUserLocation(false, waitForCenter);
  };

  const returnToStart = () => {
    if (isReturningToStartRef.current || creatingRideRef.current) return;
    isReturningToStartRef.current = true;
    routeFitPendingRef.current = null;
    if (routeFitTimerRef.current) clearTimeout(routeFitTimerRef.current);
    routeFitTimerRef.current = null;
    setRequestPanelVisible(false);
    Animated.parallel([
      Animated.timing(requestPanelOffset, {
        toValue: screenHeight,
        duration: PANEL_SLIDE_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(routeCardOffset, {
        toValue: -220 - insets.top,
        duration: PANEL_SLIDE_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(routeVisualFade, {
        toValue: 0,
        duration: PANEL_SLIDE_DURATION_MS,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        animateSearchEntranceRef.current = true;
        resetAll(true).finally(() => {
          requestAnimationFrame(() => {
            Animated.timing(searchPanelOffset, {
              toValue: 0,
              duration: PANEL_SLIDE_DURATION_MS,
              useNativeDriver: true,
            }).start();
          });
        });
      }
      else isReturningToStartRef.current = false;
    });
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
        mapRegion: mapRegionRef.current ?? undefined,
      });
      return;
    }
    navigation.navigate('Search', { pickupLocation, pickupAddress, mapRegion: mapRegionRef.current ?? undefined });
  };

  const confirmTrip = () => {
    if (!pickupLocation || !destinationLocation || !routeInfo) {
      Alert.alert('Información incompleta', 'Selecciona origen y destino.');
      return;
    }
    if (isCreatingRide || creatingRideRef.current) return;
    creatingRideRef.current = true;

    // Crear viaje directamente sin alerts de confirmación
    (async () => {
      setIsCreatingRide(true);
      let quickAssignmentStarted = false;
      try {
        if (!negotiationMode) {
          const request: CreateRideRequest = {
            requestMode: 'quick_assignment', requestKey: 'quick_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2),
            pickupLocation: { ...pickupLocation, address: pickupAddress },
            dropoffLocation: { ...destinationLocation, address: destinationAddress },
            waypoints: waypoints.map(wp => ({ latitude: wp.latitude, longitude: wp.longitude, address: wp.address })),
            vehicleTypeRequested: selectedVehicleType, paymentMethod: selectedPaymentMethod,
          };
          quickAssignmentPanelHiddenRef.current = true;
          await new Promise<void>(resolve => {
            Animated.timing(requestPanelOffset, {
              toValue: screenHeight,
              duration: PANEL_SLIDE_DURATION_MS,
              useNativeDriver: true,
            }).start(() => resolve());
          });
          quickAssignmentStarted = true;
          setQuickAssigning(true);
          let assignment;
          try {
            assignment = await ridesService.reserveQuick(request);
          } catch (error: any) {
            if (error?.name !== 'AbortError') throw error;
            const current = await ridesService.currentQuick().catch(() => null);
            assignment = current?.ride ? current : await ridesService.reserveQuick(request);
          }
          if (!assignment.ride) throw new Error('No se encontró una reserva.');
          navigation.navigate('QuickAssignment', {
            rideId: assignment.ride.id,
            request,
            initialSnapshot: assignment,
          });
          setNegotiationMode(false);
          return;
        }
        const res = await ridesService.createRide({
          requestMode: 'negotiation',
          pickupLocation: { ...pickupLocation, address: pickupAddress },
          dropoffLocation: {
            ...destinationLocation,
            address: destinationAddress,
          },
          waypoints: waypoints.map(wp => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
            address: wp.address,
          })),
          distance: routeInfo.distance,
          duration: Math.round(routeInfo.duration),
          fare: suggestedFare || 0,
          vehicleTypeRequested: selectedVehicleType,
          paymentMethod: selectedPaymentMethod,
        });
        // 🔌 Socket: unirse al room del viaje y notificar a conductores cercanos
        socketService.joinRide(res.id);
        socketService.notifyRideCreated(res.id);

        negotiationReturnPendingRef.current = true;
        navigation.navigate('Negotiation' as any, {
            rideId: res.id,
            expiresAt: res.expiresAt,
            pickupLocation: { ...pickupLocation },
            pickupAddress,
            destinationLocation: { ...destinationLocation },
            destinationAddress,
            waypoints: waypoints.map(wp => ({
              latitude: wp.latitude,
              longitude: wp.longitude,
              address: wp.address,
            })),
            fare: suggestedFare || 0,
            originalFare,
            distance: routeInfo.distance,
            duration: Math.round(routeInfo.duration),
            selectedVehicleType,
            selectedPaymentMethod,
          });
        setNegotiationMode(false);
      } catch (e: any) {
        if (quickAssignmentStarted) {
          setQuickAssigning(false);
          await new Promise<void>(resolve => {
            Animated.timing(requestPanelOffset, {
              toValue: 0,
              duration: PANEL_SLIDE_DURATION_MS,
              useNativeDriver: true,
            }).start(() => resolve());
          });
          quickAssignmentPanelHiddenRef.current = false;
        }
        // El API client lanza { status, data } en lugar de un Error estándar
        const serverMsg: string | undefined =
          e?.data?.error ?? e?.data?.message ?? e?.message;

        if (e?.data?.code === 'NO_DRIVERS') {
          showToast('Por ahora no hay conductores cerca. Intenta de nuevo en unos minutos.', '!');
        } else if (e?.status === 422 && e?.data?.code === 'OUT_OF_SERVICE_AREA') {
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
        creatingRideRef.current = false;
        setIsCreatingRide(false);
        setQuickAssigning(false);
      }
    })();
  };

  const handleAddStop = async (result: { lat: string; lon: string; display_name: string }) => {
    const newLat = parseFloat(result.lat);
    const newLon = parseFloat(result.lon);
    const newAddress = result.display_name;

    // Old destination becomes a waypoint
    if (destinationLocation && destinationAddress) {
      setWaypoints(prev => [
        ...prev,
        {
          latitude: destinationLocation.latitude,
          longitude: destinationLocation.longitude,
          address: destinationAddress,
        },
      ]);
    }

    // New location becomes the destination
    setDestinationLocation({ latitude: newLat, longitude: newLon });
    setDestinationAddress(newAddress);
  };

  const handleRemoveWaypoint = (index: number) => {
    routeRevisionRef.current += 1;
    skipRouteCacheRef.current = true;
    const nextWaypoints = waypoints.filter((_, waypointIndex) => waypointIndex !== index);
    setWaypoints(nextWaypoints);
    setAllStops(pickupLocation && destinationLocation ? [
      { location: pickupLocation, address: pickupAddress || tempPickupAddress },
      ...nextWaypoints.map(stop => ({
        location: { latitude: stop.latitude, longitude: stop.longitude },
        address: stop.address,
      })),
      { location: destinationLocation, address: destinationAddress },
    ] : []);
    setRouteInfo(null);
    setRouteCoordinates([]);
    setSuggestedFare(null);
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* MAP CONTAINER — pin is a sibling of MapView so it never scrolls */}
      <View style={s.mapWrapper}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          mapSizeRef.current = { width, height };
          setMapWrapDimensions({ width, height });
        }}
      >
        <MapView
          key={mapGeneration}
          ref={mapRef}
          style={s.map}
          initialRegion={mapRegionRef.current ?? route.params?.mapRegion ?? {
            latitude: route.params?.pickupLocation?.latitude ?? -16.5038,
            longitude: route.params?.pickupLocation?.longitude ?? -68.1345,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={!destinationLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={false}
          mapType="standard"
          customMapStyle={CUSTOM_MAP_STYLE}
          userInterfaceStyle="light"
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          onMapReady={() => {
            setMapReady(true);
            redrawLocationMarkers();
          }}
          onRegionChange={region => {
            mapRegionRef.current = region;
          }}
          onRegionChangeComplete={region => {
            handleRegionChangeComplete(region);
            redrawLocationMarkers();
          }}
        >
          {mapReady && <AnimatedRoutePolyline
            coordinates={routeCoordinates}
            strokeColor={`rgba(117, 20, 197, ${routeVisualOpacity})`}
            onStart={() => {
              const map = mapRef.current;
              const revision = routeRevisionRef.current;
              if (searchPanelMounted) {
                Animated.timing(searchPanelOffset, {
                  toValue: screenHeight,
                  duration: PANEL_SLIDE_DURATION_MS,
                  useNativeDriver: true,
                }).start(({ finished }) => {
                  if (finished && revision === routeRevisionRef.current) setSearchPanelMounted(false);
                });
              }
              map?.getCamera().then(camera => {
                if (revision !== routeRevisionRef.current) return;
                if (typeof camera.zoom === 'number') {
                  map.animateCamera({ ...camera, zoom: camera.zoom - 0.7 }, { duration: 900 });
                } else if (typeof camera.altitude === 'number') {
                  map.animateCamera({ ...camera, altitude: camera.altitude * 1.6 }, { duration: 900 });
                }
              }).catch(() => {});
            }}
            onComplete={() => {
              if (routeCoordinates.length < 2 || isReturningToStartRef.current) return;
              const revision = routeRevisionRef.current;
              const bottomPadding = Math.min(
                Math.max(110, routePanelHeight + 24),
                Math.max(110, mapSizeRef.current.height - 260),
              );
              if (!requestPanelVisible) {
                routeFitPendingRef.current = revision;
                if (routeFitTimerRef.current) clearTimeout(routeFitTimerRef.current);
                routeFitTimerRef.current = setTimeout(() => revealRequestPanel(revision), 1200);
              }
              mapRef.current?.fitToCoordinates(routeCoordinates, {
                edgePadding: { top: 200, right: 60, bottom: bottomPadding, left: 60 },
                animated: true,
              });
            }}
          />}
          {pickupLocation && (
            <Marker key="pickup" ref={pickupMarkerRef} coordinate={pickupLocation}
              anchor={{ x: 0.5, y: 0.5 }} zIndex={9} opacity={routeVisualOpacity}
              tracksViewChanges>
              <View style={s.mapLocationIconMarker} collapsable={false}
                onLayout={() => pickupMarkerRef.current?.redraw()}>
                <PassengerMapIcon />
              </View>
            </Marker>
          )}
          {destinationLocation && (
            <Marker key="destination" ref={destinationMarkerRef} coordinate={destinationLocation}
              anchor={{ x: 0.5, y: 0.5 }} zIndex={10} opacity={routeVisualOpacity}
              tracksViewChanges>
              <View style={s.mapLocationIconMarker} collapsable={false}
                onLayout={() => destinationMarkerRef.current?.redraw()}>
                <DestinationFlagIcon />
              </View>
            </Marker>
          )}
          {waypoints.map((wp, idx) => (
            <Marker key={`wp-${idx}`} coordinate={{ latitude: wp.latitude, longitude: wp.longitude }} title={`P${idx + 1}`} anchor={{ x: 0.5, y: 0.5 }} zIndex={2} opacity={routeVisualOpacity}>
              <WaypointMapIcon number={idx + 1} />
            </Marker>
          ))}
        </MapView>

        {/* ── FLOATING PIN — rendered over the map, stationary ── */}
        <FloatingPin
          visible={showMarker && (pickingMode !== null || savingMode !== null || !pickupLocation)}
          address={tempPickupAddress}
          loading={searchingAddress}
          containerWidth={mapWrapDimensions.width}
          containerHeight={mapWrapDimensions.height}
          mode={pickingMode || 'origin'}
        />

        {/* ── USER BUTTON ── */}
        {!destinationLocation && pickingMode === null && savingMode === null && (
          <TouchableOpacity
            style={[s.locBtn, { top: 5 + insets.top }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Icon.User size={26} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* ── SAVE MODE CLOSE BUTTON ── */}
        {savingMode !== null && (
          <TouchableOpacity
            style={[s.locBtn, { top: 5 + insets.top }]}
            onPress={() => setSavingMode(null)}
            activeOpacity={0.8}
          >
            <X size={26} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {isAddingStop && (
          <TouchableOpacity
            style={[s.addStopBackBtn, { top: 5 + insets.top }]}
            onPress={cancelAddStopOnMap}
            accessibilityRole="button"
            accessibilityLabel="Volver sin agregar parada"
            activeOpacity={0.8}
          >
            <ArrowLeft size={26} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* ── SEARCH MODAL ── */}
        {searchPanelMounted && pickingMode === null && savingMode === null && (
          <Animated.View
            pointerEvents={destinationLocation ? 'none' : 'box-none'}
            style={[s.searchModalWrapper, { transform: [{ translateY: searchPanelOffset }] }]}
          >
            <TouchableOpacity
              style={[s.locBtn, { top: 0 }]}
              onPress={() => centerToUserLocation(true)}
              activeOpacity={0.8}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={T.accent} />
              ) : (
                <Icon.MyLocation size={30} color="#000000" strokeWidth={2.0} />
              )}
            </TouchableOpacity>
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
                  <Text style={s.searchPlaceholder} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>¿A dónde vamos?</Text>
                </View>
                <TouchableOpacity
                  style={[s.scheduleBtn, scheduleRide && s.scheduleBtnActive]}
                  onPress={() => {
                    if (scheduleRide) {
                      setScheduleRide(false);
                      setScheduledDate(null);
                    } else {
                      openSchedulePicker();
                    }
                  }}
                >
                  <Clock size={18} color={scheduleRide ? '#FFFFFF' : '#7C3AED'} />
                  <Text
                    style={[s.scheduleBtnText, scheduleRide && s.scheduleBtnTextActive]}
                    numberOfLines={1}
                  >
                    {scheduleRide && scheduledDate ? formatScheduledDate(scheduledDate) : 'Ahora'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={s.quickDestinations}>
                <TouchableOpacity
                  style={s.quickDestItem}
                  onPress={handleHomePress}
                  onLongPress={savedHomeAddress ? handleDeleteHome : undefined}
                >
                  <View style={s.quickDestIcon}>
                    <Icon.Home size={26} color="#7C3AED" />
                  </View>
                  <View style={[s.quickDestContent, savedHomeAddress && { justifyContent: 'center' }]}>
                    <Text style={[s.quickDestText, savedHomeAddress && { fontSize: 15, fontWeight: '600' }]}>Casa</Text>
                    {!savedHomeAddress && <Text style={s.quickDestAdd}>Agregar</Text>}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.quickDestItem}
                  onPress={handleWorkPress}
                  onLongPress={savedWorkAddress ? handleDeleteWork : undefined}
                >
                  <View style={s.quickDestIcon}>
                    <Icon.Briefcase size={26} color="#7C3AED" />
                  </View>
                  <View style={[s.quickDestContent, savedWorkAddress && { justifyContent: 'center' }]}>
                    <Text style={[s.quickDestText, savedWorkAddress && { fontSize: 15, fontWeight: '600' }]}>Trabajo</Text>
                    {!savedWorkAddress && <Text style={s.quickDestAdd}>Agregar</Text>}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.quickDestItem} onPress={handleFavoritesPress}>
                  <View style={s.quickDestIcon}>
                    <Icon.Star size={26} color="#7C3AED" />
                  </View>
                  <View style={s.quickDestContent}>
                    <Text style={s.quickDestText}>Favoritos</Text>
                    <Text style={s.quickDestAdd}>Abrir</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={s.recentTripsSection}>
                {recentTrips.length === 0 && (
                  <View style={s.recentTripsEmptySpace}>
                    {!recentTripsLoading && (
                      <Text style={s.recentTripsEmpty}>Sin búsquedas recientes</Text>
                    )}
                  </View>
                )}
                {recentTrips.map(trip => (
                  <TouchableOpacity
                    key={trip.id}
                    style={s.recentTripItem}
                    onPress={() => handleRecentTripPress(trip)}
                  >
                    <View style={s.recentTripIcon}>
                      <MapPin size={26} color="#7C3AED" />
                    </View>
                    <View style={s.recentTripContent}>
                      <Text style={s.recentTripText} numberOfLines={1}>
                        {trip.destinationAddress}
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
          </Animated.View>
        )}

        {/* ── FLOATING ROUTE CARD (TOP) ── */}
        {destinationLocation && pickingMode === null && (
          <RouteSummaryCard
            slideOffset={routeCardOffset}
            disabled={isCreatingRide}
            pickupAddress={pickupAddress}
            tempPickupAddress={tempPickupAddress}
            destinationAddress={destinationAddress}
            waypoints={waypoints}
            routeInfo={routeInfo}
            onPressOrigin={() => navigation.navigate('Search', {
              pickupLocation: pickupLocation || undefined,
              pickupAddress: pickupAddress || undefined,
              mapRegion: mapRegionRef.current ?? undefined,
              destinationLocation: destinationLocation || undefined,
              destinationAddress: destinationAddress || undefined,
              stops: pickupLocation && destinationLocation
                ? [
                    { location: pickupLocation, address: pickupAddress },
                    ...waypoints.map((wp: any) => ({ location: { latitude: wp.latitude, longitude: wp.longitude }, address: wp.address })),
                    { location: destinationLocation, address: destinationAddress },
                  ]
                : undefined,
            })}
            onPressStops={() => setShowStopsModal(true)}
            onAddStop={() => setShowAddStopModal(true)}
            insetsTop={insets.top}
            fmtDist={fmtDist}
            fmtTime={fmtTime}
          />
        )}
        {quickAssigning && (
          <View pointerEvents="none" accessibilityRole="alert" style={[s.quickAssignmentNotice, { bottom: Math.max(insets.bottom + 4, 44) }]}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={s.quickAssignmentNoticeText}>Asignando viaje</Text>
          </View>
        )}

      </View>

      {/* BOTTOM PANEL — Hecho */}
      {pickingMode !== null || savingMode !== null ? (
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
              if (savingMode) {
                confirmSaveMode();
                return;
              }
              if (isAddingStop) {
                const newLat = mapCenterLocation?.latitude;
                const newLon = mapCenterLocation?.longitude;
                if (newLat && newLon && destinationLocation && destinationAddress) {
                  setWaypoints(prev => [
                    ...prev,
                    { latitude: destinationLocation.latitude, longitude: destinationLocation.longitude, address: destinationAddress },
                  ]);
                  setDestinationLocation({ latitude: newLat, longitude: newLon });
                  setDestinationAddress(tempPickupAddress);
                }
                setPickingMode(null);
                setIsAddingStop(false);
                return;
              }
              const updatedStops = allStops.length > 0 && editingStopIndex != null
                ? allStops.map((s: any, i: number) => i === editingStopIndex
                  ? { location: { latitude: mapCenterLocation?.latitude ?? s.location.latitude, longitude: mapCenterLocation?.longitude ?? s.location.longitude }, address: tempPickupAddress || s.address }
                  : s)
                : undefined;
              if (pickingMode === 'origin') {
                navigation.navigate('Search' as any, { pickupLocation: mapCenterLocation, pickupAddress: tempPickupAddress, destinationLocation, destinationAddress, mapRegion: mapRegionRef.current ?? undefined, pickingMode, ...(updatedStops ? { stops: updatedStops } : {}) });
              } else {
                navigation.navigate('Search' as any, { pickupLocation, pickupAddress, destinationLocation: mapCenterLocation, destinationAddress: tempPickupAddress, mapRegion: mapRegionRef.current ?? undefined, pickingMode, ...(updatedStops ? { stops: updatedStops } : {}) });
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
        <Animated.View
          pointerEvents={requestPanelVisible && !isCreatingRide ? 'auto' : 'none'}
          style={[s.routePanelOverlay, { transform: [{ translateY: requestPanelOffset }] }]}
          onLayout={event => { setRoutePanelHeight(event.nativeEvent.layout.height); }}
        >
        <RideRequestPanel
          bottomClearance={Math.max(insets.bottom, 48)}
          rideRequested={false}
          requestTimeLeft={120}
          fmtTimer={() => ''}
          progress={0}
          suggestedFare={suggestedFare}
          originalFare={originalFare}
          negotiationMode={negotiationMode}
          onToggleNegotiation={() => setNegotiationMode(!negotiationMode)}
          showFareEditor={showFareEditor}
          onToggleFareEditor={() => setShowFareEditor(!showFareEditor)}
          onDecrementFare={() =>
            setSuggestedFare(p => p ? Math.max(0.5, +(p - 0.5).toFixed(2)) : p)
          }
          onIncrementFare={() =>
            setSuggestedFare(p => (p ? +(p + 0.5).toFixed(2) : p))
          }
          selectedVehicleType={selectedVehicleType}
          onSelectVehicle={setSelectedVehicleType}
          scheduleRide={scheduleRide}
          scheduledDate={scheduledDate}
          onToggleSchedule={() => {
            if (scheduleRide) {
              setScheduleRide(false);
              setScheduledDate(null);
            } else {
              openSchedulePicker();
            }
          }}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPayment={setSelectedPaymentMethod}
          toggleAnim={toggleAnim}
          isCreatingRide={isCreatingRide}
          routeLoading={routeLoading}
          onConfirmTrip={confirmTrip}
          onCancelRide={() => {}}
          driverOffers={[]}
          onRejectOffer={() => {}}
          onAcceptOffer={() => {}}
        />
        </Animated.View>
      ) : null}

      {destinationLocation && pickingMode === null && savingMode === null && (
        <Animated.View
          pointerEvents={requestPanelVisible && !isCreatingRide ? 'auto' : 'none'}
          style={[s.toolbarFloat, { bottom: routePanelHeight + 34, transform: [{ translateY: requestPanelOffset }] }]}
        >
          <TouchableOpacity
            style={s.locBtnStatic}
            onPress={returnToStart}
            activeOpacity={0.8}
          >
            <Icon.Back size={24} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
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

      {/* STOPS MODAL */}
      <StopsModal
        visible={showStopsModal}
        onClose={() => setShowStopsModal(false)}
        pickupAddress={pickupAddress}
        tempPickupAddress={tempPickupAddress}
        destinationAddress={destinationAddress}
        waypoints={waypoints}
        onRemoveWaypoint={handleRemoveWaypoint}
      />

      {/* ADD STOP MODAL */}
      <AddStopModal
        visible={showAddStopModal}
        onClose={() => setShowAddStopModal(false)}
        onConfirm={handleAddStop}
        onPickOnMap={() => {
          setShowAddStopModal(false);
          if (!pickupLocation) {
            Alert.alert('Punto de recogida no disponible', 'Selecciona primero el punto de recogida.');
            return;
          }
          centerPinAtLocation(pickupLocation);
          setTempPickupAddress(pickupAddress || tempPickupAddress);
          setIsAddingStop(true);
          setPickingMode('destination');
        }}
        currentLat={pickupLocation?.latitude}
        currentLon={pickupLocation?.longitude}
      />

      {/* SAVED PLACES MODAL */}
      <SavedPlacesModal
        visible={showSavedPlacesModal}
        onClose={() => setShowSavedPlacesModal(false)}
        onSelect={handleSelectSavedPlace}
        onAdd={handleAddFavorite}
        onDelete={handleDeleteFavorite}
        savedPlaces={savedPlaces}
      />

      {/* TOAST — superpuesto sobre todo */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        icon={toastIcon}
        onHide={() => setToastVisible(false)}
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
  routePanelOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  quickAssignmentNotice: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, elevation: 6, zIndex: 19 },
  quickAssignmentNoticeText: { color: '#000000', fontSize: 19, fontWeight: '700' },

  // ── FLOATING PIN ──────────────────────────────────────────────────────────
  pinAnchor: { position: 'absolute', width: 240, height: 1, alignItems: 'center' },
  pinStack: { position: 'absolute', bottom: 0, width: 240, alignItems: 'center' },
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
  addStopBackBtn: {
    position: 'absolute',
    left: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 15,
  },
  searchModalWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 66,
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
  searchPlaceholder: { flexShrink: 1, fontSize: 21, color: '#111118', fontWeight: '700' },
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
  recentTripsEmptySpace: { height: 180, alignItems: 'center', justifyContent: 'center' },
  recentTripsEmpty: { color: '#999999', fontSize: 14, textAlign: 'center' },
  recentTripIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  recentTripContent: { flex: 1 },
  recentTripText: { fontSize: 18, color: '#000000', fontWeight: '500' },
  recentTripStar: { padding: 4 },

  // ── MAP MARKERS ───────────────────────────────────────────────────────────
  mapLocationIconMarker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dotGray: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E7E8ED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BDBDBD' },
  dotGrayInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9E9E9E' },
  dotBlue: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E7E8ED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BDBDBD' },
  dotBlueInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9E9E9E' },

  // ── TOOLBAR flotante ────────────────────────────────────────────────────
  toolbarFloat: { position: 'absolute', bottom: 35, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', zIndex: 15 },
  locBtnStatic: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },

  // ── FLOATING FARE ─────────────────────────────────────────────────────────
  floatingFare: {
    backgroundColor: T.white,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 5,
  },
  floatingFareTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  floatingFareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  floatingFareValue: {
    fontSize: 32,
    fontWeight: '800',
    color: T.accent,
    fontFamily: 'Montserrat',
  },
  floatingFareEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.accent + '40',
    backgroundColor: T.accentSoft,
  },
  floatingFareEditText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.accent,
    letterSpacing: 0.5,
  },
  floatingFareWarning: {
    backgroundColor: T.accent + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  floatingFareWarnText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.accent,
  },
  floatingFareControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  floatingFareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  floatingFareBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: T.inkMid,
    lineHeight: 22,
  },

  // ── NEGOTIATION HEADER ────────────────────────────────────────────────────
  negoHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  negoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  negoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111118',
  },
  negoSubtitle: {
    fontSize: 13,
    color: '#7A7A8A',
  },

});
export default MapScreen;
