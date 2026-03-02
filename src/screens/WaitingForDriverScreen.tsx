import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ridesService } from '../services/rides.service';
import { COLORS } from '../theme/colors';

interface WaitingForDriverProps {
  rideId: string;
  pickupAddress: string;
  fare: number;
}

interface CounterOffer {
  offerId: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  proposedPrice: number;
  offerType: 'accepted' | 'counter_offer';
  createdAt: string;
  receivedAt?: number; // timestamp cuando se recibió
  expiresIn?: number; // segundos restantes
}

const WaitingForDriverScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WaitingForDriver'>>();

  const { rideId, pickupAddress, fare } = route.params || {
    rideId: '',
    pickupAddress: 'Ubicación de recogida',
    fare: 0,
  };

  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isNavigating, setIsNavigating] = useState(false);
  const [counterOffers, setCounterOffers] = useState<CounterOffer[]>([]);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CounterOffer | null>(null);
  const [offerTimers, setOfferTimers] = useState<{ [key: string]: number }>({});
  const pollIntervalRef = React.useRef<any>(null);
  const expireIntervalRef = React.useRef<any>(null);
  const offerTimerIntervalRef = React.useRef<any>(null);
  const spinValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 360,
        duration: 2000,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  // Timer individual para cada oferta (20 segundos)
  useEffect(() => {
    if (!showOffers || counterOffers.length === 0) return;

    offerTimerIntervalRef.current = setInterval(() => {
      setOfferTimers(prev => {
        const updated = { ...prev };
        let hasExpired = false;

        Object.keys(updated).forEach(offerId => {
          updated[offerId] = Math.max(0, updated[offerId] - 1);
          if (updated[offerId] === 0) {
            hasExpired = true;
            console.log(`⏰ Oferta ${offerId} expiró (20 segundos cumplidos)`);
          }
        });

        // Eliminar ofertas expiradas
        if (hasExpired) {
          setCounterOffers(prev =>
            prev.filter(offer => (updated[offer.offerId] || 0) > 0),
          );
        }

        return updated;
      });
    }, 1000);

    return () => {
      if (offerTimerIntervalRef.current)
        clearInterval(offerTimerIntervalRef.current);
    };
  }, [showOffers, counterOffers.length]);

  // Polling para obtener contraofertas
  useEffect(() => {
    if (isNavigating || !rideId) return;

    let isMounted = true;
    let pollCount = 0;

    const checkRideStatus = async () => {
      if (!isMounted || isNavigating) return;

      try {
        pollCount++;
        console.log(
          `[WaitingForDriver] 🔍 Polling #${pollCount} - Buscando contraofertas para rideId:`,
          rideId,
        );

        const offers = await ridesService.getCounterOffers(rideId);
        console.log('[WaitingForDriver] 📋 Raw ofertas recibidas:', offers);
        console.log(
          '[WaitingForDriver] 📊 Cantidad de ofertas:',
          offers?.length || 0,
        );

        if (!isMounted) return;

        if (offers && Array.isArray(offers) && offers.length > 0) {
          console.log(
            '[WaitingForDriver] ✨ Se encontraron',
            offers.length,
            'ofertas',
          );
          console.log(
            '[WaitingForDriver] Detalles ofertas:',
            JSON.stringify(offers, null, 2),
          );

          // Agregar nuevas ofertas con su timestamp
          setCounterOffers(prevOffers => {
            const newOffers = offers.filter(
              offer =>
                !prevOffers.some(
                  prev =>
                    prev.offerId === offer.offerId || prev.id === offer.id,
                ),
            );

            console.log(
              '[WaitingForDriver] 🆕 Nuevas ofertas:',
              newOffers.length,
            );

            if (newOffers.length > 0) {
              console.log(
                `✨ ${newOffers.length} nueva(s) oferta(s) recibida(s)`,
              );
              // Inicializar timer a 20 segundos para nuevas ofertas
              newOffers.forEach(offer => {
                const offerId = offer.offerId || offer.id;
                console.log(
                  `[WaitingForDriver] ⏱️ Iniciando timer 20s para oferta ${offerId}`,
                );
                setOfferTimers(prev => ({
                  ...prev,
                  [offerId]: 20,
                }));
              });
            }

            return [...prevOffers, ...newOffers];
          });

          setShowOffers(true);
        } else {
          console.log('[WaitingForDriver] ⏳ Sin ofertas aun');
          if (counterOffers.length === 0) {
            setShowOffers(false);
          }
        }
      } catch (error) {
        console.warn('[WaitingForDriver] ❌ Error obteniendo ofertas:', error);
        if (counterOffers.length === 0 && isMounted) {
          setShowOffers(false);
        }
      }
    };

    // Ejecutar inmediatamente
    console.log('[WaitingForDriver] 🚀 Iniciando polling...');
    checkRideStatus();

    // Luego cada 3 segundos (reducido de 2 para ser menos agresivo)
    pollIntervalRef.current = setInterval(checkRideStatus, 3000);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [rideId, isNavigating]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isNavigating || showOffers) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAutoCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isNavigating, showOffers]);

  const handleAutoCancel = async () => {
    if (isNavigating) return;
    try {
      await handleCancelRide();
    } catch (error) {
      console.error('Error en cancelación automática:', error);
    }
  };

  const handleCancelRide = async () => {
    if (isNavigating) return;

    try {
      setIsLoading(true);
      await ridesService.cancelRide(
        rideId,
        'Cancelado por pasajero - Sin conductor disponible',
        'passenger',
      );
      Alert.alert('Viaje cancelado', 'Tu solicitud ha sido cancelada');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cancelar el viaje');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOffer = async (offer: CounterOffer) => {
    try {
      setIsLoading(true);

      const offerId = offer.offerId || offer.id;
      console.log('[WaitingForDriver] ✅ Aceptando oferta:', {
        rideId,
        offerId,
        proposedPrice: offer.proposedPrice,
      });

      await ridesService.acceptCounterOffer(
        rideId,
        offerId,
        offer.proposedPrice,
      );

      Alert.alert(
        'Oferta Aceptada',
        `Oferta de Bs. ${offer.proposedPrice.toFixed(2)} aceptada`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsNavigating(true);
              navigation.navigate('ActiveRide', {
                rideId: rideId,
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo aceptar la oferta');
    } finally {
      setIsLoading(false);
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {showOffers && counterOffers.length > 0 ? (
        <>
          <View style={styles.offersHeader}>
            <Text style={styles.offersTitle}>
              {counterOffers.length} propuesta
              {counterOffers.length > 1 ? 's' : ''} disponible
              {counterOffers.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.offersSubtitle}>Elige cuál aceptar</Text>
          </View>

          <View style={styles.originalFareBox}>
            <Text style={styles.originalFareLabel}>
              Tarifa original solicitada
            </Text>
            <Text style={styles.originalFareValue}>Bs. {fare.toFixed(2)}</Text>
          </View>

          <FlatList
            data={counterOffers}
            renderItem={({ item }) => {
              const offerId = item.offerId || item.id;
              const timeRemaining = offerTimers[offerId] || 0;
              const isExpiring = timeRemaining <= 5;

              return (
                <TouchableOpacity
                  style={[
                    styles.offerCard,
                    timeRemaining === 0 && styles.expiredCard,
                  ]}
                  onPress={() => handleAcceptOffer(item)}
                  activeOpacity={0.8}
                  disabled={timeRemaining === 0}
                >
                  <View style={styles.offerHeader}>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{item.driverName}</Text>
                      <View style={styles.ratingBox}>
                        <Text style={styles.rating}>
                          ⭐ {item.driverRating.toFixed(1)}
                        </Text>
                        <Text style={styles.offerType}>
                          {item.offerType === 'accepted' ||
                          item.offerType === 'accepted'
                            ? '✓ Aceptó tu tarifa'
                            : '💰 Contraoferta'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceBoxContainer}>
                      <View style={styles.priceBox}>
                        <Text
                          style={[
                            styles.offerPrice,
                            item.proposedPrice > fare && styles.higherPrice,
                            item.proposedPrice < fare && styles.lowerPrice,
                          ]}
                        >
                          Bs. {item.proposedPrice.toFixed(2)}
                        </Text>
                        {item.proposedPrice !== fare && (
                          <Text style={styles.priceDiff}>
                            {item.proposedPrice > fare ? '+' : ''}
                            {(item.proposedPrice - fare).toFixed(2)}
                          </Text>
                        )}
                      </View>
                      {/* Timer de 20 segundos */}
                      <View
                        style={[
                          styles.timerBox,
                          isExpiring && styles.timerExpiring,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timerText,
                            isExpiring && styles.timerTextExpiring,
                          ]}
                        >
                          {timeRemaining}s
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.offerId || item.id}
            scrollEnabled={true}
            contentContainerStyle={styles.offersListContent}
          />

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                (isLoading || isNavigating) && styles.buttonDisabled,
              ]}
              onPress={handleCancelRide}
              disabled={isLoading || isNavigating}
            >
              {isLoading || isNavigating ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Text style={styles.cancelButtonText}>
                  ✕ Cancelar solicitud
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.loaderSection}>
            <Animated.View
              style={[styles.spinner, { transform: [{ rotate: spin }] }]}
            >
              <View style={styles.spinnerContent}>
                <Text style={styles.spinnerIcon}>🔍</Text>
              </View>
            </Animated.View>
            <Text style={styles.title}>Buscando conductor...</Text>
            <Text style={styles.subtitle}>
              Estamos buscando el mejor conductor para ti
            </Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📍 Ubicación</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {pickupAddress}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>💰 Tarifa estimada</Text>
                <Text style={styles.fareValue}>Bs. {fare.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>⏱️ Tiempo de espera</Text>
                <Text style={styles.timeValue}>{formatTime(timeLeft)}</Text>
              </View>
            </View>

            <View style={styles.noteSection}>
              <Text style={styles.noteIcon}>ℹ️</Text>
              <Text style={styles.noteText}>
                La solicitud se cancelará automáticamente en{' '}
                {formatTime(timeLeft)} si no se asigna un conductor
              </Text>
            </View>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                (isLoading || isNavigating) && styles.buttonDisabled,
              ]}
              onPress={handleCancelRide}
              disabled={isLoading || isNavigating}
            >
              {isLoading || isNavigating ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Text style={styles.cancelButtonText}>
                  ✕ Cancelar solicitud
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default WaitingForDriverScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  loaderSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  spinnerContent: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  infoSection: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  noteSection: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  noteIcon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  actionSection: {
    paddingBottom: 16,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  offersHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  offersSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  originalFareBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  originalFareLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  originalFareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  offersListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  offerType: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  priceBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  offerPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  higherPrice: {
    color: '#EF4444',
  },
  lowerPrice: {
    color: '#10B981',
  },
  priceDiff: {
    fontSize: 11,
    color: '#666',
  },
  timerBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  timerExpiring: {
    backgroundColor: '#FFE5E5',
    borderColor: COLORS.error,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timerTextExpiring: {
    color: COLORS.error,
  },
  expiredCard: {
    opacity: 0.5,
  },
});
