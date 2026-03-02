import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';
import { cacheRouteService } from '../services/cache.service';
import { COLORS } from '../theme/colors';
import { cacheRouteManager, cleanExpiredCache } from '../utils/cacheManager';

// 🔥 CONFIGURACIÓN LOCATIONIQ
const LOCATIONIQ_API_KEY = 'pk.2c35bb8a74b61271c3e0f669fb81718d';
const LOCATIONIQ_BASE_URL = 'https://us1.locationiq.com/v1';

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
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  vehicleInfo?: string;
  licensePlate?: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
  };
  fare: number;
  distance: number;
  duration: number;
  eta: number;
  startTime?: string;
  distanceRemaining?: number;
  durationRemaining?: number;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

const ActiveRideScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ActiveRide'>>();
  const { user, isDriverMode } = useAuth();

  const { rideId } = route.params || { rideId: 'demo' };

  const [ride, setRide] = useState<ActiveRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [passengerLocation, setPassengerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{
    latitude: number;
    longitude: number;
  }> | null>(null);

  // Estados para contraofertas
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferPrice, setCounterOfferPrice] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // 🧹 Limpiar caché expirado al montar el componente
  useEffect(() => {
    console.log('🧹 [ActiveRideScreen] Limpiando caché expirado...');
    cacheRouteService.clearExpired();
    cleanExpiredCache();
  }, []);

  useEffect(() => {
    loadRideDetails();
    // Recargar los datos cada 5 segundos para actualizar ubicación del conductor en tiempo real
    const refreshInterval = setInterval(() => {
      loadRideDetails();
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [rideId]);

  // � Detectar si el viaje fue cancelado por el pasajero
  useEffect(() => {
    if (!ride || !isDriverMode) return;

    // Si el viaje fue cancelado, notificar y cerrar
    if (ride.status === 'cancelled') {
      console.log('📢 [ActiveRideScreen] El pasajero canceló el viaje');
      Alert.alert(
        'Viaje Cancelado',
        'El pasajero ha cancelado la solicitud. Continuando con búsqueda de solicitudes...',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              navigation.navigate('DriverRideRequest' as any);
            },
          },
        ],
      );
    }
  }, [ride?.status, isDriverMode]);

  // �📍 Si es conductor, enviar su ubicación cada 5 segundos
  useEffect(() => {
    if (!isDriverMode) return; // Solo si es conductor

    const sendDriverLocation = async () => {
      try {
        Geolocation.getCurrentPosition(
          async (position: any) => {
            try {
              await ridesService.updateDriverLocation(
                position.coords.latitude,
                position.coords.longitude,
              );
              console.log(
                '✅ [ActiveRideScreen] Ubicación del conductor enviada',
              );
            } catch (error) {
              console.warn(
                '⚠️ [ActiveRideScreen] Error enviando ubicación:',
                error,
              );
            }
          },
          (error: any) => {
            console.warn('⚠️ [ActiveRideScreen] Error obteniendo GPS:', error);
          },
          { enableHighAccuracy: true, timeout: 5000 },
        );
      } catch (error) {
        console.warn(
          '⚠️ [ActiveRideScreen] Error en sendDriverLocation:',
          error,
        );
      }
    };

    // Enviar ubicación cada 5 segundos
    const locationInterval = setInterval(sendDriverLocation, 5000);

    // Enviar ubicación inicial
    sendDriverLocation();

    return () => clearInterval(locationInterval);
  }, [isDriverMode]);

  // Obtener ubicación del pasajero en tiempo real
  useEffect(() => {
    // Obtener ubicación inicial
    Geolocation.getCurrentPosition(
      (position: any) => {
        setPassengerLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error: any) => {
        console.warn('❌ Error obteniendo ubicación del pasajero:', error);
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );

    // Monitorear cambios de ubicación en tiempo real
    const watchId = Geolocation.watchPosition(
      (position: any) => {
        setPassengerLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error: any) => {
        console.warn('❌ Error en watchPosition:', error);
      },
      { enableHighAccuracy: true, distanceFilter: 10 }, // Actualizar cada 10 metros
    );

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // � DECODIFICAR POLYLINE (igual a MapScreen)
  const decodePolyline = (
    encoded: string,
  ): Array<{ latitude: number; longitude: number }> => {
    const points: Array<{ latitude: number; longitude: number }> = [];
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

  // 📍 Cargar ruta real entre recogida y destino (usando LocationIQ como MapScreen)
  useEffect(() => {
    if (!ride) return;

    const loadRoute = async () => {
      try {
        const pickupLat = ride.pickupLocation.latitude;
        const pickupLon = ride.pickupLocation.longitude;
        const destLat = ride.dropoffLocation.latitude;
        const destLon = ride.dropoffLocation.longitude;

        console.log('🗺️ [ActiveRideScreen] Obteniendo ruta de LocationIQ...');

        // 🔥 VERIFICAR CACHÉ DE RUTAS (igual a MapScreen)
        const cachedRoute = await cacheRouteManager.getRoute(
          { latitude: pickupLat, longitude: pickupLon },
          { latitude: destLat, longitude: destLon },
        );

        if (cachedRoute) {
          console.log('✅ [ActiveRideScreen] Ruta obtenida del caché');
          setRouteCoordinates(cachedRoute.coordinates);
          return;
        }

        // Si no está en caché, obtener de LocationIQ
        const response = await fetch(
          `${LOCATIONIQ_BASE_URL}/directions/driving/${pickupLon},${pickupLat};${destLon},${destLat}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline&alternatives=false&steps=true`,
        );

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = decodePolyline(route.geometry);

          // 🔥 GUARDAR RUTA EN CACHÉ (igual a MapScreen)
          await cacheRouteManager.saveRoute(
            { latitude: pickupLat, longitude: pickupLon },
            { latitude: destLat, longitude: destLon },
            {
              pickupLat,
              pickupLon,
              destLat,
              destLon,
              distance: route.distance,
              duration: route.duration,
              coordinates: coordinates,
              fare: 0,
              timestamp: Date.now(),
            },
          );

          setRouteCoordinates(coordinates);
          console.log(
            '✅ [ActiveRideScreen] Ruta cargada con',
            coordinates.length,
            'puntos',
          );
        } else {
          throw new Error('No routes found');
        }
      } catch (error) {
        console.error('❌ [ActiveRideScreen] Error cargando ruta:', error);
        // Fallback: línea recta
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
      }
    };

    loadRoute();
  }, [ride]);

  const loadRideDetails = async () => {
    if (!rideId) {
      console.error('❌ [ActiveRideScreen] No se proporcionó rideId');
      setIsLoading(false);
      return;
    }

    try {
      console.log('📍 [ActiveRideScreen] Cargando detalles del viaje:', rideId);

      // Obtener datos del backend (casteado como any para acceder a propiedades extendidas)
      const rideData: any = await ridesService.getRideById(rideId);

      if (!rideData) {
        console.error('❌ [ActiveRideScreen] rideData es null/undefined');
        setIsLoading(false);
        return;
      }

      console.log('📍 [ActiveRideScreen] Datos del viaje obtenidos:', {
        id: rideData.id,
        status: rideData.status,
        driverId: rideData.driverId,
        driver: rideData.driver, // Loguar todo el objeto conductor
      });
      console.log(
        '🚗 [DEBUG] Propiedades del conductor:',
        Object.keys(rideData.driver || {}),
      );
      console.log(
        '🚗 [DEBUG] driver.currentLocation:',
        rideData.driver?.currentLocation,
      );
      console.log('🚗 [DEBUG] driver.location:', rideData.driver?.location);
      console.log(
        '🚗 [DEBUG] driver.coordinates:',
        rideData.driver?.coordinates,
      );
      console.log(
        '🚗 [DEBUG] Conductor completo:',
        JSON.stringify(rideData.driver, null, 2).substring(0, 500),
      );

      // Mapear datos del backend al formato local
      const mappedRide: ActiveRide = {
        rideId: rideData.id,
        status: rideData.status as any,
        passengerName: rideData.passenger?.name || 'Pasajero',
        passengerPhone: rideData.passenger?.phone || '',
        passengerRating: rideData.passenger?.rating || 0,
        driverName: rideData.driver?.User?.name || 'Conductor',
        driverPhone: rideData.driver?.User?.phone || '',
        driverRating: rideData.driver?.User?.rating || 0,
        vehicleInfo: rideData.driver?.vehicleModel
          ? `${rideData.driver?.vehicleModel} ${
              rideData.driver?.vehicleColor || ''
            }`
          : undefined,
        licensePlate: rideData.driver?.licensePlate || undefined,
        pickupLocation: {
          latitude: rideData.pickupLocation?.latitude || -16.503776,
          longitude: rideData.pickupLocation?.longitude || -68.134498,
          address: rideData.pickupLocation?.address || 'Ubicación de recogida',
        },
        dropoffLocation: {
          latitude: rideData.dropoffLocation?.latitude || -16.518,
          longitude: rideData.dropoffLocation?.longitude || -68.124,
          address: rideData.dropoffLocation?.address || 'Ubicación de destino',
        },
        driverLocation:
          // Intentar extraer ubicación de varias posibles ubicaciones
          rideData.driver?.currentLocation?.latitude &&
          rideData.driver?.currentLocation?.longitude
            ? {
                latitude: parseFloat(rideData.driver.currentLocation.latitude),
                longitude: parseFloat(
                  rideData.driver.currentLocation.longitude,
                ),
              }
            : rideData.driver?.location?.latitude &&
              rideData.driver?.location?.longitude
            ? {
                latitude: parseFloat(rideData.driver.location.latitude),
                longitude: parseFloat(rideData.driver.location.longitude),
              }
            : rideData.driver?.coordinates?.latitude &&
              rideData.driver?.coordinates?.longitude
            ? {
                latitude: parseFloat(rideData.driver.coordinates.latitude),
                longitude: parseFloat(rideData.driver.coordinates.longitude),
              }
            : undefined,
        fare: rideData.fare || rideData.finalFare || rideData.totalFare || 0,
        distance: (rideData.distance || 0) / 1000, // Convertir metros a km
        duration: Math.floor((rideData.duration || 0) / 60), // Convertir segundos a minutos
        eta: Math.floor((rideData.duration || 0) / 60),
        startTime: rideData.startedAt || rideData.createdAt,
      };

      setRide(mappedRide);
      setIsLoading(false);
      setIsRefreshing(false);
      console.log('✅ [ActiveRideScreen] Viaje mapeado correctamente');
      console.log(
        '📍 [ActiveRideScreen] Ubicación del conductor:',
        mappedRide.driverLocation,
      );
      console.log(
        '📍 [ActiveRideScreen] Ubicación de recogida:',
        mappedRide.pickupLocation,
      );
      console.log(
        '📍 [ActiveRideScreen] Ubicación de destino:',
        mappedRide.dropoffLocation,
      );
    } catch (error: any) {
      console.error('❌ [ActiveRideScreen] Error cargando viaje:', error);
      setIsLoading(false);
      setIsRefreshing(false);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo cargar los detalles del viaje',
      );
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRideDetails();
  };

  const handleCall = async () => {
    if (!ride) return;

    const phoneNumber =
      isDriverMode && ride.passengerPhone
        ? ride.passengerPhone
        : ride.driverPhone;

    if (!phoneNumber) {
      Alert.alert('Error', 'No hay número de teléfono disponible');
      return;
    }

    setIsCalling(true);
    try {
      const url = `tel:${phoneNumber.replace(/\s+/g, '')}`;
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la llamada');
    } finally {
      setIsCalling(false);
    }
  };

  const handleArrived = async () => {
    if (!ride?.rideId) return;

    Alert.alert('¿Ya llegaste?', 'Confirma que llegaste al punto de recogida', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setIsLoading(true);
            await ridesService.updateRide(ride.rideId, {
              status: 'in_progress',
            } as any);
            setRide(prev => (prev ? { ...prev, status: 'arrived' } : null));
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo actualizar');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleStartRide = async () => {
    if (!ride?.rideId) return;

    try {
      setIsLoading(true);
      await ridesService.updateRide(ride.rideId, {
        status: 'in_progress',
      } as any);
      setRide(prev => (prev ? { ...prev, status: 'in_progress' } : null));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo iniciar el viaje');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!ride?.rideId) return;

    Alert.alert(
      'Finalizar viaje',
      '¿Estás seguro de que deseas finalizar este viaje?',
      [
        { text: 'Atrás', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await ridesService.completeRide(
                ride.rideId,
                {} as any,
              );
              setShowCompletionOptions(false);
              navigation.navigate('RideCompleted', {
                rideId: result.id,
              });
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message || 'No se pudo finalizar el viaje',
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelRide = async () => {
    if (!ride?.rideId) return;

    // Diferente mensaje según quién cancela
    const cancelMessage = isDriverMode
      ? 'Cancelar viaje'
      : 'Cancelar solicitud';
    const cancelReason = isDriverMode
      ? 'Cancelado por conductor'
      : 'Cancelado por pasajero';
    const cancelledBy = isDriverMode ? 'driver' : 'passenger';
    const navTarget = isDriverMode ? 'DriverRideRequest' : 'Map';

    Alert.alert(cancelMessage, '¿Estás seguro?', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: cancelMessage,
        onPress: async () => {
          try {
            setIsLoading(true);
            await ridesService.cancelRide(
              ride.rideId,
              cancelReason,
              cancelledBy as any,
            );
            navigation.navigate(navTarget as any);
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo cancelar');
          } finally {
            setIsLoading(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // ✅ Manejar aceptación del viaje en modo solicitud
  const handleAcceptRequest = async () => {
    if (!ride?.rideId) return;

    try {
      setIsLoading(true);
      await ridesService.acceptRide(ride.rideId);

      // Obtener ubicación actual del conductor
      Geolocation.getCurrentPosition(
        async (position: any) => {
          try {
            await ridesService.updateDriverLocation(
              position.coords.latitude,
              position.coords.longitude,
            );
          } catch (error) {
            console.warn('⚠️ Error compartiendo ubicación:', error);
          }
        },
        error => console.warn('⚠️ Error obteniendo ubicación:', error),
        { enableHighAccuracy: true, timeout: 5000 },
      );

      Alert.alert('¡Viaje Aceptado!', 'Dirígete al punto de recogida', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('DriverRideRequest' as any);
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Error aceptando viaje:', error);
      Alert.alert('Error', error?.message || 'No se pudo aceptar el viaje');
    } finally {
      setIsLoading(false);
    }
  };

  // 💰 Manejar contraoferta de tarifa
  const handleSubmitCounterOffer = async () => {
    if (!ride?.rideId || !counterOfferPrice) {
      Alert.alert('Error', 'Por favor ingresa el precio de tu contraoferta');
      return;
    }

    const newPrice = parseFloat(counterOfferPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Error', 'Ingresa un precio válido');
      return;
    }

    try {
      setIsSubmittingOffer(true);

      // Enviar contraoferta al backend
      await ridesService.submitCounterOffer(ride.rideId, newPrice);

      Alert.alert(
        'Contraoferta Enviada',
        `Contraoferta de Bs. ${newPrice.toFixed(2)} enviada al pasajero`,
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
    } catch (error: any) {
      console.error('❌ Error enviando contraoferta:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo enviar la contraoferta',
      );
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Viaje aceptado - En ruta a recogida';
      case 'arrived':
        return 'Llegaste al punto de recogida';
      case 'in_progress':
        return 'En camino al destino';
      case 'completing':
        return 'Finalizando viaje...';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#3B82F6';
      case 'arrived':
        return '#EC4899';
      case 'in_progress':
        return '#10B981';
      case 'completing':
        return '#8B5CF6';
      default:
        return '#666';
    }
  };

  if (isLoading && !ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando viaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar el viaje</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadRideDetails}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* MAPA - Solo renderizar cuando ride esté completamente cargado */}
      {ride && (
        <>
          {console.log(
            '🗺️ DEBUG MapView - driverLocation:',
            ride?.driverLocation,
          )}
          <MapView
            style={styles.map}
            initialRegion={{
              // Centrar entre recogida y destino
              latitude:
                (ride.pickupLocation.latitude + ride.dropoffLocation.latitude) /
                2,
              longitude:
                (ride.pickupLocation.longitude +
                  ride.dropoffLocation.longitude) /
                2,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Marcador del conductor (se actualiza cada 5 segundos) */}
            {ride?.driverLocation ? (
              <Marker
                key="driver"
                coordinate={{
                  latitude: ride.driverLocation.latitude,
                  longitude: ride.driverLocation.longitude,
                }}
                title="Tu conductor (en ruta)"
              >
                <View style={styles.markerDriver}>
                  <Text style={styles.markerText}>🚗</Text>
                </View>
              </Marker>
            ) : (
              // Si no hay ubicación del conductor, mostrar en punto intermedio como aproximación
              <Marker
                key="driver-approx"
                coordinate={{
                  latitude:
                    (ride.pickupLocation.latitude +
                      ride.dropoffLocation.latitude) /
                    2,
                  longitude:
                    (ride.pickupLocation.longitude +
                      ride.dropoffLocation.longitude) /
                    2,
                }}
                title="Tu conductor (ubicación aproximada)"
                description="Esperando que el conductor inicie"
              >
                <View style={[styles.markerDriver, { opacity: 0.5 }]}></View>
              </Marker>
            )}

            {ride?.pickupLocation && ride?.status === 'in_progress' && (
              <Marker
                key="pickup"
                coordinate={{
                  latitude: ride.pickupLocation.latitude,
                  longitude: ride.pickupLocation.longitude,
                }}
                title="Recogida"
              >
                <View style={styles.markerPickup}>
                  <Text style={styles.markerText}>📍</Text>
                </View>
              </Marker>
            )}

            {ride?.dropoffLocation && ride?.status === 'in_progress' && (
              <Marker
                key="dropoff"
                coordinate={{
                  latitude: ride.dropoffLocation.latitude,
                  longitude: ride.dropoffLocation.longitude,
                }}
                title="Destino"
              >
                <View style={styles.markerDropoff}>
                  <Text style={styles.markerText}>🎯</Text>
                </View>
              </Marker>
            )}

            {/* Marcador del pasajero (ubicación actual del usuario) */}
            {passengerLocation && !isDriverMode && (
              <Marker
                key="passenger"
                coordinate={{
                  latitude: passengerLocation.latitude,
                  longitude: passengerLocation.longitude,
                }}
                title="Tu ubicación"
              >
                <View style={styles.markerPassenger}>
                  <Text style={styles.markerText}>👤</Text>
                </View>
              </Marker>
            )}

            {/* Ruta real entre recogida y destino - Estilo MapScreen - Solo visible cuando el viaje inicia */}
            {routeCoordinates &&
              routeCoordinates.length > 0 &&
              ride?.status === 'in_progress' && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#A78BFA"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
          </MapView>
        </>
      )}

      {/* INFORMACIÓN DEL VIAJE - SCROLL */}
      <ScrollView
        style={styles.rideInfoCard}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ESTADO */}
        <View style={styles.statusSection}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(ride.status) },
              ]}
            />
            <Text style={styles.statusText}>{getStatusText(ride.status)}</Text>
          </View>
        </View>

        {/* INFORMACIÓN DEL PASAJERO/CONDUCTOR */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {isDriverMode ? '👤' : '🚗'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {isDriverMode ? ride.passengerName : ride.driverName}
              </Text>
              <Text style={styles.userRating}>
                ⭐ {isDriverMode ? ride.passengerRating : ride.driverRating}
              </Text>
              {!isDriverMode && ride.vehicleInfo && (
                <Text style={styles.vehicleInfo}>{ride.vehicleInfo}</Text>
              )}
              {!isDriverMode && ride.licensePlate && (
                <Text style={styles.vehicleInfo}>📋 {ride.licensePlate}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            disabled={isCalling}
          >
            {isCalling ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.callButtonText}>📞</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* UBICACIONES */}
        <View style={styles.locationsSection}>
          <View style={styles.locationItem}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Recogida</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {ride.pickupLocation.address}
              </Text>
            </View>
          </View>

          <View style={styles.routeSeparator} />

          <View style={styles.locationItem}>
            <Text style={styles.locationIcon}>🎯</Text>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Destino</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {ride.dropoffLocation.address}
              </Text>
            </View>
          </View>
        </View>

        {/* DETALLES DEL VIAJE */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Distancia</Text>
            <Text style={styles.detailValue}>
              {ride.distance.toFixed(1)} km
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tiempo</Text>
            <Text style={styles.detailValue}>{ride.duration} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tarifa</Text>
            <Text style={styles.detailValue}>Bs. {ride.fare.toFixed(2)}</Text>
          </View>
        </View>

        {/* ACCIONES */}
        <View style={styles.actionsSection}>
          {isDriverMode ? (
            <>
              {ride.status === 'accepted' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleArrived}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      ✓ Llegué a recogida
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {ride.status === 'arrived' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleStartRide}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>▶ Iniciar viaje</Text>
                  )}
                </TouchableOpacity>
              )}

              {ride.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => setShowCompletionOptions(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      ✓ Finalizar viaje
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleCancelRide}
                disabled={isLoading}
              >
                <Text style={styles.dangerButtonText}>✕ Cancelar viaje</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {ride.status === 'in_progress' && (
                <View style={[styles.actionButton, styles.infoButton]}>
                  <Text style={styles.infoButtonText}>
                    🚗 Viaje en curso...
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleCancelRide}
                disabled={isLoading}
              >
                <Text style={styles.dangerButtonText}>✕ Cancelar viaje</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* MODAL DE CONTRAOFERTA */}
      <Modal
        transparent={true}
        visible={showCounterOfferModal}
        animationType="slide"
        onRequestClose={() => setShowCounterOfferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hacer Contraoferta</Text>

            <View style={styles.fareInfoBox}>
              <Text style={styles.fareInfoLabel}>Tarifa propuesta:</Text>
              <Text style={styles.fareInfoValue}>
                Bs. {ride?.fare.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Tu contraoferta (Bs.):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 45.50"
              keyboardType="decimal-pad"
              value={counterOfferPrice}
              onChangeText={setCounterOfferPrice}
              editable={!isSubmittingOffer}
            />

            <Text style={styles.helperText}>
              Puedes ofrecer una tarifa menor o mayor a la propuesta por el
              pasajero
            </Text>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCounterOfferModal(false);
                  setCounterOfferPrice('');
                }}
                disabled={isSubmittingOffer}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitCounterOffer}
                disabled={isSubmittingOffer}
              >
                {isSubmittingOffer ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Enviar Contraoferta
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  markerPickup: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
    elevation: 5,
  },
  markerDropoff: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F44336',
    elevation: 5,
  },
  markerDriver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    elevation: 5,
  },
  markerPassenger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#9C27B0',
    elevation: 5,
  },
  markerText: {
    fontSize: 24,
  },
  rideInfoCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: '50%',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  userRating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 20,
  },
  locationsSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  routeSeparator: {
    height: 8,
    marginVertical: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    marginLeft: 8,
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionsSection: {
    gap: 8,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: '#F59E0B4D',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  dangerButton: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  infoButton: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  successButton: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  successButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  // Estilos del modal de contraoferta
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  fareInfoBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  fareInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fareInfoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
    color: '#000',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default ActiveRideScreen;
