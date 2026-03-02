import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';
import { COLORS } from '../theme/colors';

interface RequestRideParams {
  pickupLocation: {
    latitude: number;
    longitude: number;
  };
  pickupAddress: string;
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
  destinationAddress: string;
  fare?: number;
  distance?: number;
  duration?: number;
}

const RequestRideScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RequestRide'>>();
  const { user } = useAuth();

  const params = route.params as RequestRideParams;

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [specialNotes, setSpecialNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Datos de ejemplo (deberían venir del cálculo de ruta)
  const [rideEstimate, setRideEstimate] = useState({
    fare: params.fare || 25.5,
    distance: params.distance || 3.2,
    duration: params.duration || 12,
    estimatedTime: '12 min',
    availableDrivers: 5,
  });

  const paymentMethods = [
    { id: 'cash', label: 'Efectivo', icon: '💵' },
    { id: 'card', label: 'Tarjeta de Crédito', icon: '💳' },
    { id: 'wallet', label: 'Billetera', icon: '👛' },
  ];

  const handleRequestRide = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    setIsLoading(true);
    setIsSearching(true);

    try {
      // Crear solicitud de viaje en el backend
      const rideData = {
        userId: user.id,
        pickupLocation: {
          latitude: params.pickupLocation.latitude,
          longitude: params.pickupLocation.longitude,
          address: params.pickupAddress,
        },
        dropoffLocation: {
          latitude: params.destinationLocation.latitude,
          longitude: params.destinationLocation.longitude,
          address: params.destinationAddress,
        },
        paymentMethod: selectedPaymentMethod,
        notes: specialNotes || undefined,
        fare: rideEstimate.fare,
        distance: rideEstimate.distance,
        duration: Math.round(rideEstimate.duration), // ✅ Convertir a entero
      };

      const response = await ridesService.createRide(rideData as any);

      // Simular búsqueda de conductor
      setTimeout(() => {
        setIsSearching(false);
        if (response?.id) {
          Alert.alert(
            '¡Viaje Solicitado!',
            'Buscando conductor cerca de ti...',
            [
              {
                text: 'Ver detalles',
                onPress: () => {
                  navigation.navigate('ActiveRide', {
                    rideId: response.id,
                  });
                },
              },
            ],
          );
        }
      }, 3000);
    } catch (error: any) {
      setIsSearching(false);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo procesar la solicitud del viaje',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert('Cancelar', '¿Deseas cancelar la solicitud?', [
      { text: 'Atrás', style: 'cancel' },
      {
        text: 'Cancelar solicitud',
        onPress: () => {
          navigation.goBack();
        },
        style: 'destructive',
      },
    ]);
  };

  if (isSearching) {
    return (
      <SafeAreaView style={[styles.container, styles.searchingContainer]}>
        <View style={styles.searchingContent}>
          <View style={styles.spinnerContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.spinner}
            />
          </View>

          <Text style={styles.searchingTitle}>Buscando conductor...</Text>
          <Text style={styles.searchingSubtitle}>
            {rideEstimate.availableDrivers} conductores disponibles
          </Text>

          <View style={styles.rideInfoBox}>
            <View style={styles.rideInfoRow}>
              <Text style={styles.rideInfoLabel}>📍 Origen:</Text>
              <Text style={styles.rideInfoValue}>{params.pickupAddress}</Text>
            </View>
            <View style={styles.rideInfoRow}>
              <Text style={styles.rideInfoLabel}>📍 Destino:</Text>
              <Text style={styles.rideInfoValue}>
                {params.destinationAddress}
              </Text>
            </View>
            <View style={styles.rideInfoRow}>
              <Text style={styles.rideInfoLabel}>💰 Fare Estimado:</Text>
              <Text style={styles.rideInfoValue}>Bs. {rideEstimate.fare}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cancelSearchButton}
            onPress={handleCancelRequest}
          >
            <Text style={styles.cancelSearchButtonText}>Cancelar búsqueda</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar viaje</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* MAPA CON RUTA */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude:
                (params.pickupLocation.latitude +
                  params.destinationLocation.latitude) /
                2,
              longitude:
                (params.pickupLocation.longitude +
                  params.destinationLocation.longitude) /
                2,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: params.pickupLocation.latitude,
                longitude: params.pickupLocation.longitude,
              }}
              title="Origen"
            >
              <View style={styles.markerOrigin}>
                <Text style={styles.markerText}>📍</Text>
              </View>
            </Marker>

            <Marker
              coordinate={{
                latitude: params.destinationLocation.latitude,
                longitude: params.destinationLocation.longitude,
              }}
              title="Destino"
            >
              <View style={styles.markerDestination}>
                <Text style={styles.markerText}>🎯</Text>
              </View>
            </Marker>
          </MapView>
        </View>

        {/* RESUMEN DEL VIAJE */}
        <View style={styles.rideEstimateCard}>
          <Text style={styles.cardTitle}>Resumen del viaje</Text>

          {/* UBICACIONES */}
          <View style={styles.locationSection}>
            <View style={styles.locationRow}>
              <View style={styles.locationMarker}>
                <Text>📍</Text>
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Recogida</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {params.pickupAddress}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.locationRow}>
              <View style={styles.locationMarker}>
                <Text>🎯</Text>
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Destino</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {params.destinationAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* INFORMACIÓN DEL VIAJE */}
          <View style={styles.rideDetailsGrid}>
            <View style={styles.rideDetailItem}>
              <Text style={styles.rideDetailLabel}>Distancia</Text>
              <Text style={styles.rideDetailValue}>
                {rideEstimate.distance} km
              </Text>
            </View>
            <View style={styles.rideDetailItem}>
              <Text style={styles.rideDetailLabel}>Tiempo estimado</Text>
              <Text style={styles.rideDetailValue}>
                {rideEstimate.duration} min
              </Text>
            </View>
          </View>

          {/* PRECIO */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Tarifa estimada</Text>
            <Text style={styles.priceValue}>Bs. {rideEstimate.fare}</Text>
            <Text style={styles.priceNote}>El precio final puede variar</Text>
          </View>
        </View>

        {/* MÉTODO DE PAGO */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Método de pago</Text>

          <TouchableOpacity
            style={styles.paymentSelector}
            onPress={() => setShowPaymentModal(true)}
          >
            <Text style={styles.paymentSelectorText}>
              {paymentMethods.find(m => m.id === selectedPaymentMethod)
                ?.label || 'Seleccionar método'}
            </Text>
            <Text style={styles.paymentSelectorIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* NOTAS ESPECIALES */}
        <View style={styles.notesCard}>
          <Text style={styles.cardTitle}>Notas especiales (opcional)</Text>

          <TextInput
            style={styles.notesInput}
            placeholder="Ej: Tengo mascotas, necesito baúl extra, etc."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            value={specialNotes}
            onChangeText={setSpecialNotes}
          />
        </View>

        {/* INFORMACIÓN DEL PASAJERO */}
        <View style={styles.passengerInfo}>
          <View style={styles.passengerHeader}>
            <Text style={styles.passengerName}>{user?.name || 'Pasajero'}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ 4.8</Text>
            </View>
          </View>
          <Text style={styles.passengerDetails}>
            {user?.phone || 'Sin teléfono'}
          </Text>
        </View>
      </ScrollView>

      {/* FOOTER CON BOTONES */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelRequest}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
          onPress={handleRequestRide}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.confirmButtonText}>
              Solicitar viaje - Bs. {rideEstimate.fare}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* PAYMENT METHOD MODAL */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Método de pago</Text>
            <View style={styles.modalHeaderPlaceholder} />
          </View>

          <ScrollView style={styles.paymentMethodsList}>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodItem,
                  selectedPaymentMethod === method.id &&
                    styles.paymentMethodItemSelected,
                ]}
                onPress={() => {
                  setSelectedPaymentMethod(method.id);
                  setShowPaymentModal(false);
                }}
              >
                <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                <Text style={styles.paymentMethodLabel}>{method.label}</Text>
                {selectedPaymentMethod === method.id && (
                  <Text style={styles.paymentMethodCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  spinnerContainer: {
    marginBottom: 30,
  },
  spinner: {
    transform: [{ scale: 1.5 }],
  },
  searchingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  searchingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  rideInfoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  rideInfoRow: {
    marginBottom: 12,
  },
  rideInfoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  rideInfoValue: {
    fontSize: 14,
    color: '#000',
    marginTop: 4,
  },
  cancelSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderColor: COLORS.primary,
    borderWidth: 2,
    minWidth: 200,
    alignItems: 'center',
  },
  cancelSearchButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerPlaceholder: {
    width: 50,
  },
  mapContainer: {
    height: 250,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  map: {
    flex: 1,
  },
  markerOrigin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  markerDestination: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F44336',
  },
  markerText: {
    fontSize: 24,
  },
  rideEstimateCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  locationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.primary,
    marginLeft: 17,
    marginVertical: 4,
  },
  rideDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  rideDetailItem: {
    alignItems: 'center',
  },
  rideDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  rideDetailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  priceSection: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  paymentCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  paymentSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  paymentSelectorText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  paymentSelectorIcon: {
    fontSize: 18,
  },
  notesCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    textAlignVertical: 'top',
  },
  passengerInfo: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  ratingBadge: {
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  passengerDetails: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalHeaderPlaceholder: {
    width: 24,
  },
  paymentMethodsList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  paymentMethodItemSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  paymentMethodCheck: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: '700',
  },
});

// Componente auxiliar
interface CardProps {
  children: React.ReactNode;
}

const Card = ({ children }: CardProps) => (
  <View style={styles.rideEstimateCard}>{children}</View>
);

export default RequestRideScreen;
