import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';
import { COLORS } from '../theme/colors';

interface CompletedRide {
  rideId: string;
  otherUserName: string;
  otherUserRating: number;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  duration: number;
  totalTime: string;
  paymentMethod: string;
  completedAt: string;
}

const RideCompletedScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'RideCompleted'>>();
  const { user, isDriverMode } = useAuth();

  const { rideId } = route.params || { rideId: 'demo' };

  const [ride, setRide] = useState<CompletedRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    loadRideDetails();
  }, []);

  const loadRideDetails = async () => {
    try {
      // 🔥 TODO: Conectar con backend para obtener detalles finales del viaje
      setRide({
        rideId: rideId || 'RIDE_001',
        otherUserName: isDriverMode ? 'Juan Rodríguez' : 'María García',
        otherUserRating: isDriverMode ? 4.7 : 4.9,
        pickupLocation: 'Plaza Murillo, La Paz',
        dropoffLocation: 'Centro Comercial Alalay, La Paz',
        fare: 25.5,
        distance: 3.2,
        duration: 12,
        totalTime: '14 min',
        paymentMethod: 'Efectivo',
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error loading ride details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (selectedRating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    setIsSubmittingReview(true);

    try {
      // 🔥 TODO: Conectar con backend para guardar la reseña
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1500));
      setReviewSubmitted(true);
      setShowReviewModal(false);

      setTimeout(() => {
        navigation.navigate('Map' as never);
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo enviar la reseña');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSkipReview = () => {
    Alert.alert('¿Omitir reseña?', 'Nos gustaría saber tu experiencia', [
      { text: 'Escribir reseña', style: 'cancel' },
      {
        text: 'Omitir',
        onPress: () => {
          navigation.navigate('Map' as never);
        },
        style: 'destructive',
      },
    ]);
  };

  const handleRatingPress = (rating: number) => {
    setSelectedRating(rating);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finalizando viaje...</Text>
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

  if (reviewSubmitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>¡Viaje completado!</Text>
          <Text style={styles.successSubtitle}>
            Tu reseña fue enviada exitosamente
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Map' as never)}
          >
            <Text style={styles.homeButtonText}>Ir a inicio</Text>
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
        {/* CABECERA */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Viaje completado</Text>
          <Text style={styles.headerSubtitle}>¡Gracias por tu confianza!</Text>
        </View>

        {/* INFORMACIÓN DEL VIAJE */}
        <View style={styles.rideCard}>
          {/* USUARIO */}
          <View style={styles.userSection}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {isDriverMode ? '👤' : '🚗'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{ride.otherUserName}</Text>
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingText}>
                    ⭐ {ride.otherUserRating}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* UBICACIONES */}
          <View style={styles.locationsSection}>
            <View style={styles.locationItem}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Origen</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {ride.pickupLocation}
                </Text>
              </View>
            </View>

            <View style={styles.routeSeparator} />

            <View style={styles.locationItem}>
              <Text style={styles.locationIcon}>🎯</Text>
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>Destino</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {ride.dropoffLocation}
                </Text>
              </View>
            </View>
          </View>

          {/* DETALLES DEL VIAJE */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Distancia</Text>
              <Text style={styles.detailValue}>{ride.distance} km</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tiempo</Text>
              <Text style={styles.detailValue}>{ride.totalTime}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Pago</Text>
              <Text style={styles.detailValue}>{ride.paymentMethod}</Text>
            </View>
          </View>
        </View>

        {/* RESUMEN DE TARIFA */}
        <View style={styles.fareCard}>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Tarifa base</Text>
            <Text style={styles.fareValue}>Bs. {ride.fare}</Text>
          </View>
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Distancia ({ride.distance} km)</Text>
            <Text style={styles.fareValue}>Bs. 0.00</Text>
          </View>
          <View style={styles.farreSeparator} />
          <View style={styles.fareItem}>
            <Text style={styles.fareTotalLabel}>Total pagado</Text>
            <Text style={styles.fareTotalValue}>Bs. {ride.fare}</Text>
          </View>
        </View>

        {/* INFORMACIÓN DE RESEÑA */}
        <View style={styles.reviewPromptCard}>
          <Text style={styles.reviewPromptTitle}>
            ¿Cómo fue tu experiencia?
          </Text>
          <Text style={styles.reviewPromptSubtitle}>
            Tu opinión nos ayuda a mejorar
          </Text>

          {/* ESTRELLAS */}
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRatingPress(star)}
                style={styles.starButton}
              >
                <Text
                  style={[
                    styles.star,
                    selectedRating >= star && styles.starSelected,
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FOOTER CON BOTONES */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkipReview}>
          <Text style={styles.skipButtonText}>Omitir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            selectedRating === 0 && styles.buttonDisabled,
          ]}
          onPress={() => setShowReviewModal(true)}
          disabled={selectedRating === 0}
        >
          <Text style={styles.submitButtonText}>Enviar reseña</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE RESEÑA */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tu reseña</Text>
              <View style={styles.modalHeaderPlaceholder} />
            </View>

            <ScrollView style={styles.modalBody}>
              {/* INFORMACIÓN DEL USUARIO */}
              <View style={styles.modalUserSection}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {isDriverMode ? '👤' : '🚗'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalUserName}>{ride.otherUserName}</Text>
                  <Text style={styles.modalUserRole}>
                    {isDriverMode ? 'Pasajero' : 'Conductor'}
                  </Text>
                </View>
              </View>

              {/* RATING */}
              <View style={styles.modalRatingSection}>
                <Text style={styles.modalRatingLabel}>Calificación</Text>
                <View style={styles.modalRatingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleRatingPress(star)}
                      style={styles.modalStarButton}
                    >
                      <Text
                        style={[
                          styles.modalStar,
                          selectedRating >= star && styles.modalStarSelected,
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* TEXTO DE RESEÑA */}
              <View style={styles.modalReviewSection}>
                <Text style={styles.modalReviewLabel}>
                  Comenta tu experiencia (opcional)
                </Text>
                <TextInput
                  style={styles.modalReviewInput}
                  placeholder="Tu opinión es importante para nosotros..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={reviewText}
                  onChangeText={setReviewText}
                  maxLength={250}
                />
                <Text style={styles.modalReviewCharCount}>
                  {reviewText.length}/250
                </Text>
              </View>

              {/* CATEGORÍAS DE RESEÑA */}
              <View style={styles.categoriesSection}>
                <Text style={styles.categoriesTitle}>¿Qué fue lo mejor?</Text>
                {[
                  { label: 'Seguridad', icon: '🔒' },
                  { label: 'Amabilidad', icon: '😊' },
                  { label: 'Limpieza', icon: '🧹' },
                  { label: 'Puntualidad', icon: '⏰' },
                ].map((category, index) => (
                  <TouchableOpacity key={index} style={styles.categoryItem}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* MODAL FOOTER */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Atrás</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  isSubmittingReview && styles.buttonDisabled,
                ]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    Enviar reseña
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: COLORS.primary,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  homeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  homeButtonText: {
    color: 'white',
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  rideCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  userSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 28,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  ratingSection: {
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  locationsSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
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
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    paddingVertical: 10,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fareCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fareLabel: {
    fontSize: 13,
    color: '#666',
  },
  fareValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  farreSeparator: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 10,
  },
  fareTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  fareTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reviewPromptCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  reviewPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  reviewPromptSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  star: {
    fontSize: 32,
    color: '#DDD',
  },
  starSelected: {
    color: '#FDB022',
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
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalHeaderPlaceholder: {
    width: 24,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    fontSize: 28,
  },
  modalUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  modalUserRole: {
    fontSize: 12,
    color: '#666',
  },
  modalRatingSection: {
    marginBottom: 24,
  },
  modalRatingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  modalRatingStars: {
    flexDirection: 'row',
    gap: 12,
  },
  modalStarButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  modalStar: {
    fontSize: 36,
    color: '#DDD',
  },
  modalStarSelected: {
    color: '#FDB022',
  },
  modalReviewSection: {
    marginBottom: 24,
  },
  modalReviewLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  modalReviewInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#000',
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  modalReviewCharCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default RideCompletedScreen;
