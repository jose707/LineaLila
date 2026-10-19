import { privateImageSource } from '../utils/privateImageSource';
import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  BackHandler,
} from 'react-native';
import { Banknote, Car, Check, CreditCard, Star, User, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
  CommonActions,
} from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ridesService } from '../services/rides.service';
import { authService } from '../services/auth.service';
import { ratingsService } from '../services/ratings.service';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from '../components/MapLocationIcons';
import ConfirmBottomSheet from '../components/ConfirmBottomSheet';

const COLORS = {
  primary: '#7514C5',
  primaryLight: '#9B45E4',
  primaryUltraLight: '#F3EAFC',
  primaryMuted: '#F3EAFC',
  black: '#111118',
  gray900: '#1A1A1A',
  gray600: '#7A7A8A',
  gray400: '#AFAFBF',
  gray200: '#E5E5EA',
  gray100: '#F7F7F9',
  white: '#FFFFFF',
  success: '#10B981',
};

interface CompletedRide {
  rideId: string;
  driverId: string;
  passengerId: string;
  driverName: string;
  driverRating: number;
  driverProfilePicture?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  passengerName: string;
  passengerRating: number;
  passengerProfilePicture?: string;
  otherUserName: string;
  otherUserRating: number;
  pickupLocation: string;
  dropoffLocation: string;
  waypoints: { address: string; sequence: number }[];
  fare: number;
  distance: number;
  duration: number;
  totalTime: string;
  paymentMethod: string;
  completedAt: string;
}

const StarIcon = ({ filled, size = 28 }: { filled: boolean; size?: number }) => (
  <Star
    size={size}
    color={filled ? COLORS.primary : COLORS.gray400}
    fill={filled ? COLORS.primary : 'transparent'}
    strokeWidth={1.8}
  />
);

const RideCompletedScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'RideCompleted'>>();
  const { user, isDriverMode, updateUser } = useAuth();

  const { rideId } = route.params || { rideId: 'demo' };

  const [ride, setRide] = useState<CompletedRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // 🔥 RESETEAR NAVEGACIÓN AL IR A INICIO
  const goToHome = useCallback(() => {
    const destination = isDriverMode ? 'DriverHome' : 'Map';
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: destination as any }],
      }),
    );
  }, [isDriverMode, navigation]);

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goToHome();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [goToHome]),
  );

  const loadRideDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const rideData: any = await ridesService.getRideById(rideId);
      if (!rideData) {
        Alert.alert('Error', 'No se pudo cargar el viaje');
        return;
      }
      const otherUser = isDriverMode
        ? rideData.passenger
        : rideData.driver?.User;
      const otherUserRating = isDriverMode
        ? rideData.passenger?.rating ?? 5
        : rideData.driverRatingValue ?? rideData.driver?.rating ?? 5;

      setRide({
        rideId: rideData.id,
        driverId: rideData.driverId || '',
        passengerId: rideData.passengerId || '',
        driverName: rideData.driver?.User?.name || 'Conductor',
        driverRating:
          rideData.driverRatingValue ?? rideData.driver?.rating ?? 5,
        driverProfilePicture: rideData.driver?.User?.profilePhoto,
        vehicleModel: rideData.driver?.vehicleModel,
        vehicleColor: rideData.driver?.vehicleColor,
        licensePlate: rideData.driver?.vehiclePlate,
        passengerName: rideData.passenger?.name || 'Pasajero',
        passengerRating:
          rideData.passengerRatingValue ?? rideData.passenger?.rating ?? 5,
        passengerProfilePicture: rideData.passenger?.profilePhoto,
        otherUserName: otherUser?.name || 'Usuario',
        otherUserRating,
        pickupLocation:
          rideData.pickupLocation?.address || 'Ubicación de recogida',
        dropoffLocation:
          rideData.dropoffLocation?.address || 'Ubicación de destino',
        waypoints: (rideData.waypoints ?? [])
          .map((stop: { address: string; sequence: number }) => ({ address: stop.address, sequence: stop.sequence }))
          .sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence),
        fare: rideData.finalFare || rideData.totalFare || 0,
        distance: (rideData.distance || 0) / 1000,
        duration: Math.floor((rideData.duration || 0) / 60),
        totalTime: `${Math.floor((rideData.duration || 0) / 60)} min`,
        paymentMethod: rideData.paymentMethod || 'Efectivo',
        completedAt: rideData.completedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error loading ride details:', error);
      Alert.alert('Error', 'No se pudo cargar los detalles del viaje');
    } finally {
      setIsLoading(false);
    }
  }, [rideId, isDriverMode]);

  useEffect(() => {
    loadRideDetails();
  }, [loadRideDetails]);
  const handleSubmitReview = async () => {
    if (selectedRating === 0) {
      Alert.alert('', 'Por favor selecciona una calificación');
      return;
    }
    setIsSubmittingReview(true);
    try {
      // 🔥 NUEVO FLUJO: Usar el nuevo endpoint de ratings
      // Si soy PASAJERO (!isDriverMode) → califico al CONDUCTOR
      // Si soy CONDUCTOR (isDriverMode) → califico al PASAJERO

      let driverId: string;
      let passengerId: string;

      if (!isDriverMode) {
        // Pasajero: yo califico al conductor
        driverId = ride?.driverId || '';
        passengerId = user?.id || '';
      } else {
        // Conductor: yo califico al pasajero
        // ride.driverId = drivers.id (FK correcto), NO user.id (users.id)
        driverId = ride?.driverId || '';
        passengerId = ride?.passengerId || '';
      }

      console.log('📤 [RideCompleted] Enviando calificación:', {
        rideId,
        driverId,
        passengerId,
        rating: selectedRating,
        comment: reviewText,
        isDriverMode,
      });

      await ratingsService.submitRating(
        rideId,
        driverId,
        passengerId,
        selectedRating,
        reviewText,
        isDriverMode ? 'driver' : 'passenger',
      );

      // Refrescar datos del usuario para obtener el nuevo rating
      console.log('🔄 [RideCompleted] Refrescando datos del usuario...');
      const updatedUser = await authService.fetchCurrentUser();
      console.log('🔄 [RideCompleted] Usuario obtenido del servidor:', {
        id: updatedUser?.id,
        name: updatedUser?.name,
        rating: updatedUser?.rating,
        totalTrips: updatedUser?.totalTrips,
      });

      if (updatedUser) {
        try {
          console.log(
            '🔄 [RideCompleted] Llamando updateUser con:',
            updatedUser,
          );
          updateUser(updatedUser);
          console.log('✅ [RideCompleted] Usuario actualizado en contexto');
        } catch (updateError) {
          console.warn(
            '⚠️ [RideCompleted] Error actualizando contexto:',
            updateError,
          );
        }
      }

      setReviewSubmitted(true);
      setShowReviewModal(false);
      setTimeout(() => goToHome(), 2000);
    } catch (error: any) {
      console.error('❌ [RideCompleted] Error al enviar calificación:', error);
      Alert.alert('Error', error?.message || 'No se pudo enviar la reseña');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSkipReview = () => {
    setShowSkipConfirm(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Finalizando viaje…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <Text style={s.errorText}>No se pudo cargar el viaje</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadRideDetails}>
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (reviewSubmitted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <View style={s.successRing}>
            <Check size={38} color={COLORS.primary} strokeWidth={2.5} />
          </View>
          <Text style={s.successTitle}>¡Viaje completado!</Text>
          <Text style={s.successSub}>Tu reseña fue enviada exitosamente</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={goToHome}>
            <Text style={s.primaryBtnText}>Ir a inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ratingLabels = [
    '',
    'Malo',
    'Regular',
    'Bueno',
    'Muy bueno',
    'Excelente',
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* RESUMEN DEL VIAJE */}
        <View style={s.hero}>
          <View style={s.heroText}>
            <Text style={s.heroTitle}>Viaje completado</Text>
            <Text style={s.heroFare} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Bs. {ride.fare}
            </Text>
            <Text style={s.heroLabel}>Total a pagar</Text>
          </View>
          <View style={s.heroStatusIcon}>
            <Check size={38} color={COLORS.white} strokeWidth={2.8} />
          </View>
        </View>

        {/* ROUTE CARD */}
        <View style={s.card}>
          <View style={s.routeRow}>
            <View style={s.routeDots}>
              <PassengerMapIcon size={30} bare />
              {ride.waypoints.map((stop, index) => (
                <React.Fragment key={`${stop.sequence}-${index}`}>
                  <View style={s.routeLine} />
                  <WaypointMapIcon number={index + 1} size={28} />
                </React.Fragment>
              ))}
              <View style={s.routeLine} />
              <DestinationFlagIcon size={30} bare />
            </View>
            <View style={s.routeAddresses}>
              <View style={s.routeAddress}>
                <Text style={s.routeAddressText} numberOfLines={1}>
                  {ride.pickupLocation}
                </Text>
              </View>
              {ride.waypoints.map((stop, index) => (
                <View key={`${stop.sequence}-${index}`} style={s.routeAddress}>
                  <Text style={s.routeAddressText} numberOfLines={1}>{stop.address}</Text>
                </View>
              ))}
              <View style={s.routeAddress}>
                <Text style={s.routeAddressText} numberOfLines={1}>
                  {ride.dropoffLocation}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* STATS ROW */}
          <View style={s.statsRow}>
            <View style={s.stat} accessible accessibilityLabel={`Distancia: ${ride.distance.toFixed(1)} kilómetros`}>
              <Text style={s.statValue}>{ride.distance.toFixed(1)}</Text>
              <Text style={s.statUnit}>km</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.stat} accessible accessibilityLabel={`Tiempo: ${ride.duration} minutos`}>
              <Text style={s.statValue}>{ride.duration}</Text>
              <Text style={s.statUnit}>min</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.stat} accessible accessibilityLabel={`Método de pago: ${ride.paymentMethod}`}>
              {ride.paymentMethod === 'Efectivo' ? (
                <Banknote size={26} color={COLORS.primary} strokeWidth={1.8} />
              ) : (
                <CreditCard size={26} color={COLORS.primary} strokeWidth={1.8} />
              )}
            </View>
          </View>
        </View>

        {/* OTHER USER CARD */}
        <View style={s.card}>
          <View style={s.userRow}>
            <View style={s.userAvatar}>
              {isDriverMode ? (
                ride.passengerProfilePicture ? (
                  <Image
                    source={privateImageSource(ride.passengerProfilePicture)}
                    style={s.userAvatarImage}
                  />
                ) : (
                  <User size={27} color={COLORS.primary} strokeWidth={1.8} />
                )
              ) : ride.driverProfilePicture ? (
                <Image
                  source={privateImageSource(ride.driverProfilePicture)}
                  style={s.userAvatarImage}
                />
              ) : (
                <Car size={27} color={COLORS.primary} strokeWidth={1.8} />
              )}
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>
                {isDriverMode ? ride.passengerName : ride.driverName}
              </Text>
              <View style={s.userRatingRow}>
                <Star size={14} color={COLORS.primary} fill={COLORS.primary} />
                <Text style={s.userRating}>
                  {isDriverMode ? ride.passengerRating.toFixed(1) : ride.driverRating.toFixed(1)}
                </Text>
                <Text style={s.userRatingDot}>•</Text>
                <Text style={s.personRole}>{isDriverMode ? 'Pasajero' : 'Conductor'}</Text>
              </View>
            </View>
          </View>
          {!isDriverMode &&
            (ride.vehicleModel || ride.vehicleColor || ride.licensePlate) && (
              <View style={s.vehicleSection}>
                {(ride.vehicleModel || ride.vehicleColor) && (
                  <Text style={s.vehicleText}>
                    {ride.vehicleModel} {ride.vehicleColor}
                  </Text>
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
        </View>

        {/* RATING CARD */}
        <View style={s.card}>
          <Text style={s.ratingTitle}>¿Cómo fue tu viaje?</Text>
          {selectedRating > 0 && (
            <Text style={s.ratingLabelText}>
              {ratingLabels[selectedRating]}
            </Text>
          )}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => setSelectedRating(star)}
                style={s.starBtn}
                accessibilityRole="button"
                accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
              >
                <StarIcon filled={selectedRating >= star} size={36} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={s.footer}>
        <TouchableOpacity style={s.ghostBtn} onPress={handleSkipReview}>
          <Text style={s.ghostBtnText}>Omitir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.primaryBtn,
            s.footerPrimary,
            selectedRating === 0 && s.btnDisabled,
          ]}
          onPress={() => setShowReviewModal(true)}
          disabled={selectedRating === 0}
        >
          <Text style={s.primaryBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>

      <ConfirmBottomSheet
        visible={showSkipConfirm}
        title="¿Omitir reseña?"
        message="Puedes continuar sin calificar este viaje."
        confirmLabel="Omitir reseña"
        cancelLabel="Calificar"
        onConfirm={() => {
          setShowSkipConfirm(false);
          goToHome();
        }}
        onCancel={() => setShowSkipConfirm(false)}
      />

      {/* REVIEW MODAL */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* HANDLE */}
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Tu reseña</Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={s.closeBtn}
              >
                <X size={22} color={COLORS.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* STARS */}
              <View style={s.modalStarsSection}>
                <View style={s.modalStarsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSelectedRating(star)}
                      style={s.starBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                    >
                      <StarIcon filled={selectedRating >= star} size={40} />
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedRating > 0 && (
                  <Text style={s.modalRatingLabel}>
                    {ratingLabels[selectedRating]}
                  </Text>
                )}
              </View>

              {/* TEXT INPUT */}
              <Text style={s.sectionLabel}>Comentario</Text>
              <TextInput
                style={s.reviewInput}
                placeholder="Cuéntanos más sobre tu experiencia…"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={4}
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={250}
              />
              <Text style={s.charCount}>{reviewText.length}/250</Text>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[
                  s.primaryBtn,
                  s.modalConfirmBtn,
                  isSubmittingReview && s.btnDisabled,
                ]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={s.primaryBtnText}>Enviar reseña</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.gray600,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },

  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // SUCCESS
  successRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 20,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 15,
    color: COLORS.gray600,
    marginBottom: 28,
    textAlign: 'center',
  },

  // SCROLL
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 12,
  },

  // HERO
  hero: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroText: { flex: 1, alignItems: 'flex-start' },
  heroStatusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    lineHeight: 21,
  },
  heroFare: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -1.2,
    lineHeight: 52,
  },
  heroLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 18,
  },

  // CARD
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 16,
  },

  // ROUTE
  routeRow: { flexDirection: 'row', alignItems: 'stretch' },
  routeDots: { width: 30, alignItems: 'center', marginRight: 14, paddingVertical: 4 },
  routeLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: COLORS.gray200,
    marginVertical: 4,
    minHeight: 12,
  },
  routeAddresses: { flex: 1, justifyContent: 'space-between' },
  routeAddress: { paddingVertical: 4 },
  routeAddressText: { fontSize: 15, color: COLORS.black, fontWeight: '500' },

  divider: { height: 1, backgroundColor: COLORS.gray200, marginVertical: 14 },

  // STATS
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
  },
  statUnit: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  statSep: { width: 1, height: 28, backgroundColor: COLORS.gray200 },

  // PERSON
  personRow: { flexDirection: 'row', alignItems: 'center' },
  personAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  personAvatarEmoji: { fontSize: 26 },
  personInfo: { flex: 1 },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 3,
  },
  personRole: { fontSize: 12, color: COLORS.gray400, fontWeight: '500' },
  personRating: {
    backgroundColor: COLORS.primaryUltraLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  personRatingValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // USER CARDS
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 5,
  },
  userRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userRating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  userRatingDot: { color: COLORS.gray400, marginHorizontal: 4 },
  vehicleSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'left',
  },
  plateBadge: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'center',
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
  },

  // RATING
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 12,
  },
  ratingLabelText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  starBtn: { padding: 5, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  // FOOTER
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  ghostBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.gray600 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  footerPrimary: { flex: 1 },
  btnDisabled: { opacity: 0.35 },

  // MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray200,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 20 },

  modalStarsSection: { alignItems: 'center', marginBottom: 28 },
  modalStarsRow: { flexDirection: 'row', gap: 8 },
  modalRatingLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  catChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  catIcon: { fontSize: 15, marginRight: 6 },
  catLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray600 },
  catLabelActive: { color: COLORS.primary },

  reviewInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.black,
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: COLORS.gray100,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 20,
  },

  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalConfirmBtn: { width: '100%' },
});

export default RideCompletedScreen;
