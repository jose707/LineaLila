import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import useRides from '../hooks/useRides';
import { ridesService } from '../services/rides.service';
import { COLORS } from '../theme/colors';

interface RideRequest {
  id: string;
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
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
  fare: number;
  distance: number;
  duration: number;
  notes?: string;
}

const DriverRideRequestScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { getRideRequests } = useRides();

  const [isLoading, setIsLoading] = useState(true);
  const [rides, setRides] = useState<RideRequest[]>([]); // ✅ LISTA de solicitudes
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const isMountedRef = useRef(true); // 🔥 Rastrear si componente está montado

  // 🔥 Pausar polling cuando la pantalla pierde enfoque
  useFocusEffect(
    useCallback(() => {
      console.log(
        '🟢 [DriverRideRequestScreen] Pantalla en enfoque - Iniciando polling',
      );
      isMountedRef.current = true;
      loadRideRequests();

      // Reanudar polling
      pollingIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          loadRideRequests();
        }
      }, 3000);

      return () => {
        console.log(
          '🔴 [DriverRideRequestScreen] Pantalla perdió enfoque - Pausando polling',
        );
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, []),
  );

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      console.log('🚕 DriverRideRequestScreen DESMONTADO');
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Cargar lista de solicitudes y actualizar sin destruir la lista
  const loadRideRequests = useCallback(async () => {
    if (!isMountedRef.current) return; // ✅ No continuar si componente está desmontado

    try {
      console.log('📡 Obteniendo solicitudes de viajes...');

      const requests = await getRideRequests();
      console.log(
        '📋 Cantidad de solicitudes recibidas:',
        requests?.length || 0,
      );

      if (requests && requests.length > 0) {
        // ✅ Solo actualizar si componente está montado
        if (!isMountedRef.current) return;
        const transformedRides = requests.map((req: any, index: number) => {
          console.log(
            `🔍 [Solicitud ${index + 1}] Datos crudos recibidos:`,
            JSON.stringify(
              {
                rideId: req.rideId,
                passengerName: req.passengerName,
                pickupLocation: req.pickupLocation,
                dropoffLocation: req.dropoffLocation,
                distance: req.distance,
                duration: req.duration,
                fare: req.fare,
              },
              null,
              2,
            ),
          );

          let pickupLat = -16.5;
          let pickupLng = -68.15;
          let pickupAddress = 'Ubicación de recogida';

          let dropoffLat = -16.4;
          let dropoffLng = -68.1;
          let dropoffAddress = 'Ubicación de destino';

          // Validar pickupLocation
          if (
            typeof req.pickupLocation === 'object' &&
            req.pickupLocation?.latitude &&
            req.pickupLocation?.longitude
          ) {
            pickupLat = req.pickupLocation.latitude;
            pickupLng = req.pickupLocation.longitude;
            pickupAddress = req.pickupLocation?.address || pickupAddress;
            console.log(
              `✅ [Solicitud ${
                index + 1
              }] Pickup del pasajero: ${pickupAddress}`,
            );
          } else {
            console.warn(
              `⚠️ [Solicitud ${index + 1}] pickupLocation inválido:`,
              req.pickupLocation,
            );
          }

          // Validar dropoffLocation
          if (
            typeof req.dropoffLocation === 'object' &&
            req.dropoffLocation?.latitude &&
            req.dropoffLocation?.longitude
          ) {
            dropoffLat = req.dropoffLocation.latitude;
            dropoffLng = req.dropoffLocation.longitude;
            dropoffAddress = req.dropoffLocation?.address || dropoffAddress;
            console.log(
              `✅ [Solicitud ${
                index + 1
              }] Destino del pasajero: ${dropoffAddress}`,
            );
          } else {
            console.warn(
              `⚠️ [Solicitud ${index + 1}] dropoffLocation inválido:`,
              req.dropoffLocation,
            );
          }

          const transformed = {
            id: req.rideId,
            rideId: req.rideId,
            passengerName: req.passengerName,
            passengerPhone: req.passengerPhone,
            passengerRating: req.passengerRating || 4.5,
            pickupLocation: {
              latitude: pickupLat,
              longitude: pickupLng,
              address: pickupAddress,
            },
            dropoffLocation: {
              latitude: dropoffLat,
              longitude: dropoffLng,
              address: dropoffAddress,
            },
            // ✅ CONVERTIR UNIDADES CORRECTAMENTE
            fare: req.fare || 0, // Ya está en Bs.
            distance: (req.distance || 0) / 1000, // Metros a km
            duration: Math.floor((req.duration || 0) / 60), // Segundos a minutos (usar FLOOR como en pasajero)
          };

          console.log(
            `📦 [Solicitud ${index + 1}] Datos transformados:`,
            JSON.stringify(
              {
                rideId: transformed.rideId,
                fare: `Bs ${transformed.fare.toFixed(2)}`,
                distance: `${transformed.distance.toFixed(1)} km`,
                duration: `${transformed.duration} min (de ${req.duration}s usando Math.floor)`,
                pickupAddress: transformed.pickupLocation.address,
                dropoffAddress: transformed.dropoffLocation.address,
              },
              null,
              2,
            ),
          );

          return transformed;
        });

        // ✅ Actualizar list sin parpadeo (mantiene scroll position)
        setRides(transformedRides);
        console.log('✅ Solicitudes cargadas correctamente');
      } else if (isMountedRef.current) {
        console.log('⏳ No hay solicitudes disponibles');
        setRides([]);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('❌ Error cargando solicitudes:', error);
      }
    }
  }, [getRideRequests]);

  // Mostrar opciones de contraoferta
  const showOfferOptions = (rideRequest: RideRequest) => {
    Alert.alert(
      'Hacer Oferta',
      `Tarifa solicitada: Bs. ${rideRequest.fare.toFixed(
        2,
      )}\n\n¿Qué deseas hacer?`,
      [
        {
          text: 'Aceptar Precio',
          onPress: () => handleSubmitOffer(rideRequest, rideRequest.fare),
        },
        {
          text: 'Hacer Contraoferta',
          onPress: () => {
            promptCounterOfferPrice(rideRequest);
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
    );
  };

  // Pedir precio de contraoferta
  const promptCounterOfferPrice = (rideRequest: RideRequest) => {
    let inputValue = rideRequest.fare.toString();

    Alert.prompt(
      'Proponer Precio',
      `Precio original: Bs. ${rideRequest.fare.toFixed(
        2,
      )}\n\nIngresa tu propuesta:`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Enviar Oferta',
          onPress: (value: string | undefined) => {
            const proposedPrice = parseFloat(value || inputValue);
            if (!isNaN(proposedPrice) && proposedPrice > 0) {
              handleSubmitOffer(rideRequest, proposedPrice);
            } else {
              Alert.alert('Error', 'Por favor ingresa un precio válido');
            }
          },
        },
      ],
      'plain-text',
      inputValue,
    );
  };

  // Enviar contraoferta y esperar confirmación del pasajero
  const handleSubmitOffer = async (
    rideRequest: RideRequest,
    proposedPrice: number,
  ) => {
    setAcceptingRideId(rideRequest.id);

    try {
      console.log(
        `💰 Enviando contraoferta para rideId ${
          rideRequest.id
        }: Bs. ${proposedPrice.toFixed(2)}`,
      );

      // Enviar contraoferta al backend
      await ridesService.submitCounterOffer(rideRequest.id, proposedPrice);

      console.log(
        '✅ Contraoferta enviada. Esperando respuesta del pasajero...',
      );

      // Pausar polling mientras esperamos
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Navegar a pantalla de espera de 20 segundos
      setAcceptingRideId(null);
      navigation.navigate('OfferWaiting' as any, {
        rideId: rideRequest.id,
        proposedPrice: proposedPrice,
      });
    } catch (error: any) {
      console.error('❌ Error enviando contraoferta:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo enviar la contraoferta',
      );
      setAcceptingRideId(null);
    }
  };

  // Renderizar tarjeta de solicitud
  const renderRideCard = ({ item }: { item: RideRequest }) => (
    <View style={styles.card}>
      {/* ENCABEZADO: Pasajero */}
      <View style={styles.cardHeader}>
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>{item.passengerName}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {item.passengerRating}</Text>
            <Text style={styles.phone}>📱 {item.passengerPhone}</Text>
          </View>
        </View>
      </View>

      {/* UBICACIONES */}
      <View style={styles.locationsContainer}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Recogida</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {item.pickupLocation.address}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Destino</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {item.dropoffLocation.address}
            </Text>
          </View>
        </View>
      </View>

      {/* DETALLES Y TARIFA */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Distancia</Text>
          <Text style={styles.detailValue}>{item.distance.toFixed(1)} km</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Tiempo</Text>
          <Text style={styles.detailValue}>{item.duration} min</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Tarifa</Text>
          <Text style={styles.fareValue}>Bs. {item.fare.toFixed(2)}</Text>
        </View>
      </View>

      {/* BOTÓN - Hacer Oferta */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[
            styles.acceptBtn,
            styles.fullWidth,
            acceptingRideId === item.id && styles.buttonDisabled,
          ]}
          onPress={() => showOfferOptions(item)}
          disabled={acceptingRideId !== null}
        >
          {acceptingRideId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>Hacer Oferta</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={styles.headerTitle}>Solicitudes Disponibles</Text>
          <View
            style={{
              backgroundColor: COLORS.primary,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={styles.headerCount}>{rides.length}</Text>
          </View>
        </View>
      </View>

      {isLoading && rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Buscando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>⏳ Sin solicitudes</Text>
              <Text style={styles.emptyText}>
                No hay solicitudes disponibles en este momento
              </Text>
              <Text style={styles.emptySubtext}>
                El sistema sigue buscando...
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 80, // Espacio para el header fijo
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    zIndex: 10,
    height: 70,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerCount: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rating: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  phone: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  locationsContainer: {
    marginBottom: 14,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  locationInfo: {
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
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
    marginLeft: 28,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  fullWidth: {
    flex: 1,
  },
  acceptBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#BBB',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default DriverRideRequestScreen;
