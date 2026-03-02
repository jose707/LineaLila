import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  TextInput,
  BackHandler,
} from 'react-native';
import MapView, { Marker, Region, LatLng, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import {
  cacheLocationManager,
  cacheRouteManager,
  cacheTripHistoryManager,
  cleanExpiredCache,
} from '../utils/cacheManager';
import { ridesService } from '../services/rides.service';

// 🔥 CONFIGURACIÓN LOCATIONIQ
const LOCATIONIQ_API_KEY = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

// 🔥 TIPO DE NAVEGACIÓN
type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Map'
>;
type MapScreenRouteProp = RouteProp<RootStackParamList, 'Map'>;

// 🔥 INTERFAZ PARA INFORMACIÓN DE RUTA
interface RouteInfo {
  distance: number;
  duration: number;
  coordinates: LatLng[];
}

// 🔥 COMPONENTE DE MARCADOR FLOTANTE ESTÁTICO
const FloatingMarker = ({
  visible,
  address,
}: {
  visible: boolean;
  address: string;
}) => {
  if (!visible) return null;

  return (
    <View style={styles.floatingMarkerContainer}>
      <View style={styles.floatingMarker}>
        <View style={styles.markerTop}>
          <View style={styles.markerInner} />
        </View>
        <View style={styles.markerBottom} />
      </View>

      {address && (
        <View style={styles.addressBubble}>
          <Text style={styles.addressBubbleText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      )}
    </View>
  );
};

const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const route = useRoute<MapScreenRouteProp>();
  const { user } = useAuth();

  // 🔥 ESTADOS PRINCIPALES
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [tempPickupAddress, setTempPickupAddress] = useState<string>('');
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(
    null,
  );
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showMarker, setShowMarker] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false);
  const [mapCenterLocation, setMapCenterLocation] = useState<LatLng | null>(
    null,
  );
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [destinationInput, setDestinationInput] = useState('');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRoute, setShowRoute] = useState(true);
  const [suggestedFare, setSuggestedFare] = useState<number | null>(null);
  const FARE_STEP = 0.5;
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [rideRequested, setRideRequested] = useState(false);
  const [requestTimeLeft, setRequestTimeLeft] = useState(120); // 2 minutos
  const [activeRideId, setActiveRideId] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const lastRegionChangeTime = useRef<number>(0);
  const requestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchId = useRef<number | null>(null);

  // 🔥 TEMPORIZADOR PARA SOLICITUD DE VIAJE (2 minutos)
  useEffect(() => {
    if (rideRequested && requestTimeLeft > 0) {
      requestTimerRef.current = setInterval(() => {
        setRequestTimeLeft(prev => {
          const newTime = prev - 1;
          console.log('⏱️ Tiempo restante para solicitud:', newTime);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
      }
    };
  }, [rideRequested, requestTimeLeft]);

  // 🔥 LIMPIAR CACHÉ EXPIRADO AL MONTAR
  useEffect(() => {
    cleanExpiredCache();
  }, []);

  // 🔥 EFECTO PARA RECIBIR DATOS DEL SEARCHSCREEN
  useEffect(() => {
    if (route.params) {
      const reset = (route.params as any).reset;

      // Si recibimos el flag reset, resetear completamente
      if (reset) {
        console.log('RESET COMPLETO - Volviendo a estado inicial');
        setPickupLocation(null);
        setPickupAddress('');
        setTempPickupAddress('');
        setDestinationLocation(null);
        setDestinationAddress('');
        setShowMarker(true);
        setRouteInfo(null);
        setRouteCoordinates([]);
        setDestinationInput('');
        setSuggestedFare(null);
        return;
      }

      const {
        pickupLocation: routePickupLocation,
        destinationLocation: routeDestinationLocation,
        pickupAddress: routePickupAddress,
        destinationAddress: routeDestinationAddress,
      } = route.params;

      if (routePickupLocation) {
        setPickupLocation(routePickupLocation);
        setShowMarker(false);
        setTempPickupAddress(routePickupAddress || '');
      }

      if (routeDestinationLocation) {
        setDestinationLocation(routeDestinationLocation);
        setDestinationAddress(routeDestinationAddress || '');
      } else {
        // Si no hay destino en los parámetros, limpiar el destino
        setDestinationLocation(null);
        setDestinationAddress('');
      }

      if (routePickupAddress) {
        setPickupAddress(routePickupAddress);
        setTempPickupAddress(routePickupAddress);
      }

      if (routeDestinationAddress) {
        setDestinationAddress(routeDestinationAddress);
      }
    }
  }, [route.params]);

  // 🔥 EFECTO PARA CALCULAR RUTA CUANDO HAY AMBAS UBICACIONES
  const calculateRouteMemo = useCallback(() => {
    if (pickupLocation && destinationLocation) {
      calculateRoute();
      setShowRoute(true);
    } else {
      setRouteInfo(null);
      setRouteCoordinates([]);
    }
  }, [pickupLocation, destinationLocation]);

  useEffect(() => {
    calculateRouteMemo();
  }, [calculateRouteMemo]);

  // Calcular tarifa sugerida cuando cambia la ruta
  useEffect(() => {
    if (!routeInfo) {
      setSuggestedFare(null);
      return;
    }

    const km = routeInfo.distance / 1000;
    const mins = routeInfo.duration / 60;
    const base = 3.0;
    const perKm = 1.2;
    const perMin = 0.15;
    let fare = base + perKm * km + perMin * mins;
    fare = Math.max(1.0, Math.round(fare / FARE_STEP) * FARE_STEP);
    setSuggestedFare(parseFloat(fare.toFixed(2)));

    // 🔥 LOG: Mostrar conversión exacta de tiempo
    const displayMinutes = Math.floor((routeInfo.duration % 3600) / 60);
    console.log('⏱️ [MapScreen] Cálculo de duración:', {
      rawSeconds: routeInfo.duration,
      displayMinutes: `${displayMinutes} min (usando Math.floor)`,
      minutesDecimal: mins.toFixed(2),
      fare: `Bs ${fare.toFixed(2)}`,
    });
  }, [routeInfo]);

  // 🔥 EFECTO PARA OBTENER DIRECCIÓN CUANDO SE MUEVE EL MAPA
  useEffect(() => {
    const updateAddressFromMapCenter = async () => {
      if (mapCenterLocation && !pickupLocation) {
        try {
          setSearchingAddress(true);
          const address = await getExactAddressWithLocationIQ(
            mapCenterLocation,
          );
          setTempPickupAddress(address);
        } catch (error) {
          console.error('Error obteniendo dirección:', error);
          setTempPickupAddress('Ubicación no disponible');
        } finally {
          setSearchingAddress(false);
        }
      }
    };

    const timeoutId = setTimeout(updateAddressFromMapCenter, 1000);
    return () => clearTimeout(timeoutId);
  }, [mapCenterLocation, pickupLocation]);

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Si hay pickup o destino, resetear completamente
        if (pickupLocation || destinationLocation) {
          console.log('Botón atrás nativo - Reset completo');
          setPickupLocation(null);
          setPickupAddress('');
          setTempPickupAddress('');
          setDestinationLocation(null);
          setDestinationAddress('');
          setShowMarker(true);
          setRouteInfo(null);
          setRouteCoordinates([]);
          setDestinationInput('');
          setSuggestedFare(null);
          return true; // Evitar comportamiento por defecto
        }
        return false; // Permitir comportamiento por defecto si no hay estado
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [pickupLocation, destinationLocation]),
  );

  // 🔥 MANEJAR FINAL DE MOVIMIENTO DEL MAPA
  const handleRegionChangeComplete = async (region: Region) => {
    const now = Date.now();

    if (now - lastRegionChangeTime.current > 300) {
      const newCenter: LatLng = {
        latitude: region.latitude,
        longitude: region.longitude,
      };

      setMapCenterLocation(newCenter);
      lastRegionChangeTime.current = now;

      if (!pickupLocation) {
        try {
          setSearchingAddress(true);
          const address = await getExactAddressWithLocationIQ(newCenter);
          setTempPickupAddress(address);
        } catch (error) {
          console.error('Error obteniendo dirección:', error);
        } finally {
          setSearchingAddress(false);
        }
      }
    }
  };

  // 🔥 FUNCIÓN PARA CONFIRMAR UBICACIÓN ACTUAL COMO PUNTO DE PARTIDA
  const confirmCurrentLocationAsPickup = async () => {
    if (!mapCenterLocation) return;

    try {
      setLocationLoading(true);
      const address = await getExactAddressWithLocationIQ(mapCenterLocation);

      setPickupLocation(mapCenterLocation);
      setPickupAddress(address);
      setShowMarker(false);

      Alert.alert('Punto de partida establecido', address);
    } catch (error) {
      console.error('Error confirmando ubicación:', error);
      Alert.alert('Error', 'No se pudo establecer el punto de partida');
    } finally {
      setLocationLoading(false);
    }
  };

  // 🔥 FUNCIÓN PARA IR AL SEARCHSCREEN
  const goToSearchScreen = async () => {
    if (!pickupLocation) {
      // Si no hay pickup confirmado, usar la ubicación del marcador
      if (!mapCenterLocation) return;

      try {
        setLocationLoading(true);
        const address = await getExactAddressWithLocationIQ(mapCenterLocation);

        // Establecer pickup automáticamente y abrir search screen
        setPickupLocation(mapCenterLocation);
        setPickupAddress(address);
        setShowMarker(false);

        setLocationLoading(false);

        navigation.navigate('Search', {
          pickupLocation: mapCenterLocation,
          pickupAddress: address,
        });
      } catch (error) {
        console.error('Error al obtener dirección:', error);
        setLocationLoading(false);
        navigation.navigate('Search', {
          pickupLocation: mapCenterLocation,
          pickupAddress: tempPickupAddress,
        });
      }
      return;
    }

    navigation.navigate('Search', {
      pickupLocation: pickupLocation,
      pickupAddress: pickupAddress,
    });
  };

  // 🔥 SOLICITAR PERMISOS DE UBICACIÓN
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación',
            message:
              'Esta app necesita acceso a tu ubicación para funcionar correctamente',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasLocationPermission(true);
          return true;
        } else {
          Alert.alert(
            'Permiso denegado',
            'Necesitas permitir el acceso a la ubicación para usar esta función',
          );
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      setHasLocationPermission(true);
      return true;
    }
  };

  // 🔥 OBTENER UBICACIÓN ACTUAL DEL USUARIO
  const getCurrentLocation = (): Promise<LatLng> => {
    const getPosition = (options: any) =>
      new Promise<LatLng>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            resolve({ latitude, longitude });
          },
          error => {
            reject(error);
          },
          options,
        );
      });

    return new Promise(async (resolve, reject) => {
      try {
        // 🔥 INTENTO PRINCIPAL: Alta precisión con timeout corto (más rápido)
        const primary = await getPosition({
          enableHighAccuracy: true,
          timeout: 8000, // Reducido de 20s a 8s
          maximumAge: 0, // Usar ubicación actual siempre
        });
        resolve(primary);
        return;
      } catch (err: any) {
        // Solo mostrar warning si es error real, no timeout
        if (err?.code !== 3) {
          console.warn('Primary location attempt failed:', err);
        }

        // 🔥 INTENTO FALLBACK: Baja precisión, más tolerante
        if (err && (err.code === 3 || err.code === 2)) {
          try {
            const fallback = await getPosition({
              enableHighAccuracy: false,
              timeout: 10000, // Reducido de 25s a 10s
              maximumAge: 60000, // Hasta 1 minuto de antigüedad
            });
            resolve(fallback);
            return;
          } catch (err2: any) {
            // Usar ubicación cached si está disponible
            if (currentLocation) {
              console.log('Using cached location');
              resolve(currentLocation);
              return;
            }

            // Error silencioso en fallback
            if (err2?.code !== 3) {
              console.warn('Fallback location attempt failed:', err2);
            }
            reject(err2);
            return;
          }
        }

        reject(err);
      }
    });
  };

  // 🔥 FUNCIÓN PARA CENTRAR EN UBICACIÓN ACTUAL
  const centerToUserLocation = async (
    showAlert: boolean = true,
  ): Promise<LatLng | null> => {
    setLocationLoading(true);

    try {
      // 🔥 VERIFICAR Y SOLICITAR PERMISOS (siempre, no confiar en estado)
      let canAccessLocation = hasLocationPermission;

      if (!canAccessLocation && Platform.OS === 'android') {
        canAccessLocation = await requestLocationPermission();
      } else if (Platform.OS === 'ios') {
        canAccessLocation = true; // En iOS los permisos se solicitan automáticamente
      }

      if (!canAccessLocation) {
        setLocationLoading(false);
        if (showAlert) {
          Alert.alert(
            'Error',
            'Se requieren permisos de ubicación para continuar',
          );
        }
        return null;
      }

      const userLocation = await getCurrentLocation();

      setCurrentLocation(userLocation);
      setMapCenterLocation(userLocation);
      setShowMarker(true);

      // 🔥 CENTRAR MAPA INMEDIATAMENTE (no esperar dirección)
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500, // Reducir tiempo de animación a 500ms
        );
      }

      setLocationLoading(false);

      // 🔥 OBTENER DIRECCIÓN EN BACKGROUND (sin esperar)
      getExactAddressWithLocationIQ(userLocation)
        .then(address => {
          setTempPickupAddress(address);
        })
        .catch(error => {
          console.error('Error obteniendo dirección:', error);
          setTempPickupAddress(
            `${userLocation.latitude.toFixed(
              4,
            )}, ${userLocation.longitude.toFixed(4)}`,
          );
        });

      return userLocation;
    } catch (error) {
      console.error('Error obteniendo ubicación actual:', error);
      setLocationLoading(false);

      if (showAlert) {
        Alert.alert(
          'Error de ubicación',
          'No se pudo obtener tu ubicación actual. Verifica que el GPS esté activado y los permisos otorgados.',
        );
      }
      return null;
    }
  };

  // 🔥 INICIALIZAR APP CON UBICACIÓN REAL
  useEffect(() => {
    const initApp = async () => {
      if (!initialLocationLoaded) {
        const userLocation = await centerToUserLocation(false); // No mostrar alertas en inicialización
        if (userLocation) {
          setMapCenterLocation(userLocation);
        }
        setInitialLocationLoaded(true);
      }
    };

    initApp();

    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      watchId.current = Geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position.coords;
          const newLocation: LatLng = { latitude, longitude };
          setCurrentLocation(newLocation);
        },
        error => console.error('Error watching location:', error),
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
        },
      );
    }

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // 🔥 OBTENER DIRECCIÓN EXACTA CON LOCATIONIQ
  const getExactAddressWithLocationIQ = async (
    coordinate: LatLng,
  ): Promise<string> => {
    try {
      const { latitude, longitude } = coordinate;

      // 🔥 VERIFICAR CACHÉ PRIMERO
      const cachedLocation = await cacheLocationManager.getLocation(coordinate);
      if (cachedLocation) {
        console.log('📍 Dirección obtenida del caché');
        return cachedLocation.address;
      }

      const response = await fetch(
        `${LOCATIONIQ_BASE_URL}/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${latitude}&lon=${longitude}&format=json&normalizeaddress=1&addressdetails=1&zoom=18`,
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      const address =
        data.display_name || data.address
          ? formatLocationIQAddress(data)
          : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      // 🔥 GUARDAR EN CACHÉ
      await cacheLocationManager.saveLocation(coordinate, address);

      return address;
    } catch (error) {
      console.error('Error obteniendo dirección exacta con LocationIQ:', error);
      return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(
        6,
      )}`;
    }
  };

  // 🔥 FORMATAR DIRECCIÓN DE LOCATIONIQ
  const formatLocationIQAddress = (data: any): string => {
    const address = data.address || {};
    const addressParts = [];

    if (address.road && address.house_number) {
      addressParts.push(`${address.road} ${address.house_number}`);
    } else if (address.road) {
      addressParts.push(address.road);
    }

    if (address.neighbourhood) {
      addressParts.push(address.neighbourhood);
    } else if (address.suburb) {
      addressParts.push(address.suburb);
    }

    if (address.city) {
      addressParts.push(address.city);
    } else if (address.town) {
      addressParts.push(address.town);
    }

    if (address.state) {
      addressParts.push(address.state);
    }

    if (address.country) {
      addressParts.push(address.country);
    }

    if (addressParts.length === 0 && data.display_name) {
      const displayName = data.display_name;
      if (displayName.length > 60) {
        const parts = displayName.split(',');
        return `${parts[0]}, ${parts[1]}`;
      }
      return displayName;
    }

    const result = addressParts.join(', ');
    return result.length > 60 ? result.substring(0, 57) + '...' : result;
  };

  // 🔥 CALCULAR RUTA ENTRE PUNTO DE PARTIDA Y DESTINO
  const calculateRoute = useCallback(async () => {
    if (!pickupLocation || !destinationLocation) return;

    setRouteLoading(true);

    try {
      const { latitude: startLat, longitude: startLon } = pickupLocation;
      const { latitude: endLat, longitude: endLon } = destinationLocation;

      // 🔥 VERIFICAR CACHÉ DE RUTAS
      const cachedRoute = await cacheRouteManager.getRoute(
        pickupLocation,
        destinationLocation,
      );
      if (cachedRoute) {
        console.log('📍 Ruta obtenida del caché');
        setRouteInfo({
          distance: cachedRoute.distance,
          duration: cachedRoute.duration,
          coordinates: cachedRoute.coordinates,
        });
        setRouteCoordinates(cachedRoute.coordinates);

        if (mapRef.current && cachedRoute.coordinates.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(cachedRoute.coordinates, {
              edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
              animated: true,
            });
          }, 500);
        }

        setRouteLoading(false);
        return;
      }

      const response = await fetch(
        `${LOCATIONIQ_BASE_URL}/directions/driving/${startLon},${startLat};${endLon},${endLat}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false&steps=true`,
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = decodePolyline(route.geometry);

        // 🔥 GUARDAR RUTA EN CACHÉ
        await cacheRouteManager.saveRoute(pickupLocation, destinationLocation, {
          pickupLat: startLat,
          pickupLon: startLon,
          destLat: endLat,
          destLon: endLon,
          distance: route.distance,
          duration: route.duration,
          coordinates: coordinates,
          fare: 0, // Se calcula después
          timestamp: Date.now(),
        });

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          coordinates: coordinates,
        });

        setRouteCoordinates(coordinates);

        if (mapRef.current && coordinates.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
              animated: true,
            });
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error calculando ruta:', error);
      createStraightLineRoute();
    } finally {
      setRouteLoading(false);
    }
  }, [pickupLocation, destinationLocation]);

  // 🔥 DECODIFICAR POLYLINE
  const decodePolyline = (encoded: string): LatLng[] => {
    const points: LatLng[] = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
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

  // 🔥 CREAR RUTA DE LÍNEA RECTA (FALLBACK)
  const createStraightLineRoute = () => {
    if (!pickupLocation || !destinationLocation) return;

    const coordinates = [
      pickupLocation,
      {
        latitude: (pickupLocation.latitude + destinationLocation.latitude) / 2,
        longitude:
          (pickupLocation.longitude + destinationLocation.longitude) / 2,
      },
      destinationLocation,
    ];

    const distance = calculateDistance(pickupLocation, destinationLocation);
    const duration = distance / 10;

    setRouteInfo({
      distance,
      duration,
      coordinates,
    });

    setRouteCoordinates(coordinates);
  };

  // 🔥 CALCULAR DISTANCIA ENTRE DOS PUNTOS
  const calculateDistance = (point1: LatLng, point2: LatLng): number => {
    const R = 6371e3;
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 🔥 FORMATAR DISTANCIA Y TIEMPO
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`; // ✅ Usar 1 decimal para claridad
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60); // ✅ Usar FLOOR para consistencia

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  // 🔥 MANEJAR CUANDO EL MAPA ESTÁ LISTO
  const handleMapReady = () => {
    setIsMapReady(true);

    if (currentLocation && !initialLocationLoaded) {
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        );
      }
    }
  };

  // 🔥 CONFIRMAR VIAJE
  const confirmTrip = () => {
    if (!pickupLocation || !destinationLocation) {
      Alert.alert(
        'Información incompleta',
        'Necesitas tener un punto de partida y un destino confirmados.',
      );
      return;
    }

    if (!routeInfo) {
      Alert.alert(
        'Ruta no disponible',
        'Espera a que se calcule la ruta o inténtalo de nuevo.',
      );
      return;
    }

    Alert.alert(
      'Solicitar Viaje',
      `Desde: ${pickupAddress.split(',')[0]}\nHacia: ${
        destinationAddress.split(',')[0]
      }\n\nDistancia: ${formatDistance(
        routeInfo.distance,
      )}\nTiempo: ${formatDuration(routeInfo.duration)}${
        suggestedFare !== null ? `\nTarifa: Bs ${suggestedFare.toFixed(2)}` : ''
      }\n\n¿Confirmar viaje?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              console.log('🚀 [confirmTrip] Creando solicitud de viaje...');

              // 🔥 CREAR SOLICITUD EN EL BACKEND
              const rideData = {
                pickupLocation: {
                  latitude: pickupLocation.latitude,
                  longitude: pickupLocation.longitude,
                  address: pickupAddress,
                },
                dropoffLocation: {
                  latitude: destinationLocation.latitude,
                  longitude: destinationLocation.longitude,
                  address: destinationAddress,
                },
                distance: routeInfo.distance,
                duration: Math.round(routeInfo.duration), // ✅ Convertir a entero
                fare: suggestedFare || 0,
              };

              // 🔥 DEBUG: Log detallado de qué se envía
              console.log('🚀 [confirmTrip] Enviando al backend:', {
                distance: {
                  value: rideData.distance,
                  type: typeof rideData.distance,
                },
                duration: {
                  value: rideData.duration,
                  type: typeof rideData.duration,
                },
                fare: {
                  value: rideData.fare,
                  type: typeof rideData.fare,
                  isNumber: typeof rideData.fare === 'number',
                },
              });

              const response = await ridesService.createRide(rideData);
              console.log(
                '✅ [confirmTrip] Solicitud creada exitosamente:',
                response.id,
              );

              // 🔥 GUARDAR VIAJE EN HISTORIAL LOCAL
              if (pickupLocation && destinationLocation && routeInfo) {
                await cacheTripHistoryManager.addTrip({
                  pickupLocation,
                  pickupAddress,
                  destinationLocation,
                  destinationAddress,
                  distance: routeInfo.distance,
                  duration: routeInfo.duration,
                  fare: suggestedFare || 0,
                });
                console.log('✅ Viaje guardado en historial local');
              }

              // 🔥 NAVEGAR A PANTALLA DE ESPERA
              console.log('📍 [confirmTrip] Navegando a WaitingForDriver:', {
                rideId: response.id,
                pickupAddress,
                fare: suggestedFare,
              });

              navigation.navigate('WaitingForDriver', {
                rideId: response.id,
                pickupAddress: pickupAddress,
                fare: suggestedFare || 0,
              });
            } catch (error: any) {
              console.error('❌ [confirmTrip] Error creando viaje:', error);
              Alert.alert(
                'Error',
                error?.message || 'No se pudo procesar la solicitud del viaje',
              );
            }
          },
        },
      ],
    );
  };

  // 🔥 CANCELAR SOLICITUD DE VIAJE
  const handleCancelRideRequest = () => {
    Alert.alert(
      '¿Cancelar solicitud?',
      'El conductor no ha aceptado aún. ¿Deseas cancelar la solicitud?',
      [
        { text: 'No, esperar', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('❌ Cancelando solicitud:', activeRideId);

              // 🔥 CANCELAR EN EL BACKEND
              if (activeRideId) {
                await ridesService.cancelRide(
                  activeRideId,
                  'Cancelado por pasajero',
                  'passenger',
                );
                console.log('✅ Solicitud cancelada en BD');
              }

              // Limpiar estado del frontend INMEDIATAMENTE
              setRideRequested(false);
              setRequestTimeLeft(120);
              setActiveRideId(null);

              if (requestTimerRef.current) {
                clearInterval(requestTimerRef.current);
              }

              Alert.alert(
                'Solicitud cancelada',
                'Tu solicitud ha sido cancelada exitosamente.',
              );
            } catch (error: any) {
              console.error('❌ Error cancelando solicitud:', error);
              Alert.alert(
                'Error',
                error?.message || 'No se pudo cancelar la solicitud.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER MINIMALISTA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle} />
            <Text style={styles.logoText}>línea lila</Text>
          </View>
          <Text style={styles.tagline}>Conducido por mujeres</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowClientMenu(!showClientMenu)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* MENÚ SANDWICH DE CLIENTE */}
      {showClientMenu && (
        <View style={styles.clientMenuOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setShowClientMenu(false)}
          />
          <View style={styles.clientMenuPanel}>
            {/* DATOS DEL CLIENTE */}
            <View style={styles.clientMenuHeader}>
              <View style={styles.clientAvatar}>
                <Text style={styles.avatarEmoji}>👩</Text>
              </View>
              <View style={styles.clientInfoContainer}>
                <Text style={styles.clientName}>{user?.name || 'Usuario'}</Text>
                <Text style={styles.clientRating}>
                  ⭐ {user?.rating || 4.8}
                </Text>
              </View>
            </View>

            {/* DIVIDER */}
            <View style={styles.menuDivider} />

            {/* OPCIONES DE MENÚ */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setShowClientMenu(false);
                navigation.navigate('Profile' as never);
              }}
            >
              <Text style={styles.menuOptionIcon}>👤</Text>
              <Text style={styles.menuOptionText}>Mi Perfil</Text>
              <Text style={styles.menuOptionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setShowClientMenu(false);
                navigation.navigate('ClientRideHistory' as never);
              }}
            >
              <Text style={styles.menuOptionIcon}>📋</Text>
              <Text style={styles.menuOptionText}>Mis Viajes</Text>
              <Text style={styles.menuOptionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setShowClientMenu(false);
                navigation.navigate('ClientRideDetails', {
                  rideId: 'demo',
                } as never);
              }}
            >
              <Text style={styles.menuOptionIcon}>🚕</Text>
              <Text style={styles.menuOptionText}>Viaje Actual</Text>
              <Text style={styles.menuOptionArrow}>›</Text>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.menuDivider} />

            {/* CERRAR MENÚ */}
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowClientMenu(false)}
            >
              <Text style={styles.menuCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BOTÓN PRINCIPAL CUANDO NO HAY SELECCIÓN */}
      {!pickupLocation && !destinationLocation && (
        <View style={styles.mainActionContainer}>
          <TouchableOpacity
            style={styles.mainActionButton}
            onPress={goToSearchScreen}
            activeOpacity={0.9}
          >
            <View style={styles.actionIconContainer}>
              <View style={styles.actionIcon} />
            </View>
            <Text style={styles.mainActionText}>¿A dónde vamos?</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OVERLAY DE CARGA */}
      {locationLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#A78BFA" />
            <Text style={styles.loadingText}>Localizando...</Text>
          </View>
        </View>
      )}

      {/* OVERLAY DE BÚSQUEDA DE DIRECCIÓN */}
      {searchingAddress && (
        <View style={styles.searchingOverlay}>
          <View style={styles.searchingBox}>
            <ActivityIndicator size="small" color="#A78BFA" />
            <Text style={styles.searchingText}>Buscando dirección</Text>
          </View>
        </View>
      )}

      {/* OVERLAY DE CÁLCULO DE RUTA */}
      {routeLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#A78BFA" />
            <Text style={styles.loadingText}>Calculando ruta</Text>
          </View>
        </View>
      )}

      {/* MAPA */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          mapType="standard"
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {/* LÍNEA DE RUTA */}
          {showRoute && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#A78BFA"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* PUNTO DE PARTIDA */}
          {pickupLocation && (
            <Marker coordinate={pickupLocation} title="Origen">
              <View style={styles.originMarker}>
                <View style={styles.originMarkerInner} />
              </View>
            </Marker>
          )}

          {/* PUNTO DE DESTINO */}
          {destinationLocation && (
            <Marker coordinate={destinationLocation} title="Destino">
              <View style={styles.destinationMarker}>
                <View style={styles.destinationMarkerInner} />
              </View>
            </Marker>
          )}

          {/* UBICACIÓN ACTUAL */}
          {currentLocation && !pickupLocation && (
            <Marker
              coordinate={currentLocation}
              title="Tu ubicación"
              pinColor="#A78BFA"
            />
          )}
        </MapView>

        {/* MARCADOR FLOTANTE */}
        <FloatingMarker
          visible={showMarker && !pickupLocation}
          address={tempPickupAddress}
        />

        {/* BOTÓN DE CENTRAR UBICACIÓN */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => centerToUserLocation(true)} // Mostrar alertas cuando usuario presiona
          activeOpacity={0.9}
        >
          <View style={styles.centerButtonIcon} />
        </TouchableOpacity>
      </View>

      {/* PANEL INFERIOR */}
      <View style={styles.bottomPanel}>
        {pickupLocation ? (
          <>
            {destinationLocation ? (
              <>
                {/* INFORMACIÓN DE RUTA */}
                {routeInfo && (
                  <View style={styles.tripDetails}>
                    <View style={styles.tripStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {formatDistance(routeInfo.distance)}
                        </Text>
                        <Text style={styles.statLabel}>Distancia</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {formatDuration(routeInfo.duration)}
                        </Text>
                        <Text style={styles.statLabel}>Tiempo</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {suggestedFare !== null
                            ? `Bs ${suggestedFare.toFixed(2)}`
                            : '--'}
                        </Text>
                        <Text style={styles.statLabel}>Tarifa</Text>
                      </View>
                    </View>

                    {/* AJUSTAR TARIFA */}
                    {suggestedFare !== null && (
                      <View style={styles.fareAdjust}>
                        <TouchableOpacity
                          style={styles.fareAdjustButton}
                          onPress={() =>
                            setSuggestedFare(prev =>
                              prev
                                ? Math.max(0.5, +(prev - FARE_STEP).toFixed(2))
                                : prev,
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.fareAdjustText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.fareAdjustLabel}>
                          Ajustar tarifa
                        </Text>
                        <TouchableOpacity
                          style={styles.fareAdjustButton}
                          onPress={() =>
                            setSuggestedFare(prev =>
                              prev ? +(prev + FARE_STEP).toFixed(2) : prev,
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.fareAdjustText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* BOTÓN CONFIRMAR VIAJE O CANCELAR */}
                    {rideRequested ? (
                      <>
                        {/* 🔥 MOSTRAR TEMPORIZADOR Y BOTÓN CANCELAR */}
                        <View style={styles.timerContainer}>
                          <Text style={styles.timerText}>
                            ⏱️ Buscando conductor...
                          </Text>
                          <Text style={styles.timerValue}>
                            {Math.floor(requestTimeLeft / 60)}:
                            {String(requestTimeLeft % 60).padStart(2, '0')}s
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.confirmButton, styles.cancelButton]}
                          onPress={handleCancelRideRequest}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.confirmButtonText}>
                            Cancelar solicitud
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={confirmTrip}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.confirmButtonText}>
                          Solicitar viaje
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // HEADER PREMIUM
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logoCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A78BFA',
    marginRight: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  // BOTÓN PRINCIPAL
  mainActionContainer: {
    position: 'absolute',
    top: 160,
    left: 24,
    right: 24,
    zIndex: 10,
  },
  mainActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A78BFA',
  },
  mainActionText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  // OVERLAYS
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 250, 250, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingBox: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  searchingOverlay: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1002,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchingText: {
    marginLeft: 10,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },

  // MAPA
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // MARCADORES
  floatingMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -28,
    marginTop: -56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  floatingMarker: {
    alignItems: 'center',
  },
  markerTop: {
    backgroundColor: '#FFFFFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#A78BFA',
  },
  markerDragging: {
    borderColor: '#8B5CF6',
    transform: [{ scale: 1.1 }],
  },
  markerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#A78BFA',
  },
  markerBottom: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    borderWidth: 2,
    borderColor: '#A78BFA',
  },
  addressBubble: {
    position: 'absolute',
    top: -90,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  addressBubbleDragging: {
    backgroundColor: '#F9FAFB',
  },
  addressBubbleText: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 18,
  },
  originMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  originMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#A78BFA',
  },
  destinationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },

  // BOTÓN CENTRAR
  centerButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  centerButtonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#A78BFA',
  },

  // PANEL INFERIOR
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },

  // DETALLES DEL VIAJE
  tripDetails: {
    marginTop: 8,
  },
  tripStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  // AJUSTAR TARIFA
  fareAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  fareAdjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareAdjustText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '400',
  },
  fareAdjustLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 20,
    fontWeight: '500',
  },

  // BOTÓN CONFIRMAR
  confirmButton: {
    backgroundColor: '#A78BFA',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // 🔥 TEMPORIZADOR
  timerContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  timerText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  // 🔥 BOTÓN CANCELAR
  cancelButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  // MENU SANDWICH
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#7C3AED',
    fontWeight: '600',
  },
  clientMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  clientMenuPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  clientMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  clientInfoContainer: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  clientRating: {
    fontSize: 13,
    color: '#666',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
  },
  menuOptionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  menuOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  menuOptionArrow: {
    fontSize: 18,
    color: '#C0C0C0',
  },
  menuCloseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  menuCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
});

export default MapScreen;
