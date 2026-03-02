import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
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
import Geolocation from '@react-native-community/geolocation';
import { ridesService } from '../services/rides.service';
import { COLORS } from '../theme/colors';

interface RouteParams {
  rideId: string;
  proposedPrice: number;
}

const OfferWaitingScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OfferWaiting'>>();

  const { rideId, proposedPrice } = route.params as RouteParams;

  const [timeLeft, setTimeLeft] = useState(20);
  const [isChecking, setIsChecking] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const pollingIntervalRef = useRef<any>(null);
  const spinValue = new Animated.Value(0);

  // Efecto para traer el tiempo restante del backend cada 1 segundo
  useEffect(() => {
    console.log(
      '[OfferWaiting] 🔄 Iniciando polling de tiempo restante desde backend...',
    );

    const pollTimeFromServer = async () => {
      if (hasResponded || isChecking) return;

      try {
        setIsChecking(true);
        const rideDetails = await ridesService.getRideById(rideId);

        if (rideDetails) {
          // Si la oferta fue aceptada
          if (rideDetails.status === 'accepted') {
            if (!hasResponded) {
              console.log(
                '✅ ¡Oferta aceptada por el pasajero! Navegando a ActiveRide...',
              );

              if (pollingIntervalRef.current)
                clearInterval(pollingIntervalRef.current);

              setHasResponded(true);

              Alert.alert(
                '¡Oferta Aceptada!',
                `El pasajero aceptó tu oferta de Bs. ${proposedPrice.toFixed(
                  2,
                )}\n\nDirígete al punto de recogida.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Obtener ubicación y compartirla
                      Geolocation.getCurrentPosition(
                        (position: any) => {
                          ridesService.updateDriverLocation(
                            position.coords.latitude,
                            position.coords.longitude,
                          );
                        },
                        () => {
                          console.warn('Error obteniendo ubicación');
                        },
                      );

                      navigation.navigate('ActiveRide', { rideId });
                    },
                  },
                ],
              );
            }
            return;
          }

          // Obtener el tiempo restante de la última oferta (la del conductor actual)
          const counterOffers = rideDetails.counterOffers || [];
          const lastOffer = counterOffers[counterOffers.length - 1];

          if (lastOffer && lastOffer.timeLeftInSeconds !== undefined) {
            setTimeLeft(lastOffer.timeLeftInSeconds);

            // Si el tiempo se agotó
            if (lastOffer.timeLeftInSeconds === 0) {
              handleTimeoutExpired();
            }
          }
        }
      } catch (error) {
        console.warn(
          '[OfferWaiting] Error trayendo tiempo del servidor:',
          error,
        );
      } finally {
        setIsChecking(false);
      }
    };

    // Poll cada 1 segundo para sincronizar el contador con el servidor
    pollingIntervalRef.current = setInterval(pollTimeFromServer, 1000);

    // Hacer el primer poll inmediatamente
    pollTimeFromServer();

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [rideId, hasResponded]);

  // Efecto para animación del spinner
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 360,
        duration: 2000,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const handleTimeoutExpired = async () => {
    if (hasResponded) return;

    console.log(
      '[OfferWaiting] ⏱️ Tiempo de espera agotado. Volviendo a solicitudes...',
    );

    // Limpiar intervalos
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    setHasResponded(true);

    Alert.alert(
      'Tiempo Agotado',
      'El pasajero no aceptó tu oferta en el tiempo permitido.\n\nVolviendo a solicitudes...',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleCancelOffer = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setHasResponded(true);
    navigation.goBack();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Spinner */}
        <View style={styles.spinnerSection}>
          <Animated.View
            style={[styles.spinner, { transform: [{ rotate: spin }] }]}
          >
            <View style={styles.spinnerContent}>
              <Text style={styles.spinnerIcon}>⏳</Text>
            </View>
          </Animated.View>
        </View>

        {/* Título y descripción */}
        <View style={styles.messageSection}>
          <Text style={styles.title}>Esperando Respuesta</Text>
          <Text style={styles.subtitle}>
            El pasajero está revisando tu oferta
          </Text>
        </View>

        {/* Detalles de la oferta */}
        <View style={styles.offerCard}>
          <View style={styles.offerRow}>
            <Text style={styles.offerLabel}>Tu Oferta</Text>
            <Text style={styles.offerPrice}>
              Bs. {proposedPrice.toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Tiempo Restante</Text>
            <Text style={styles.timeValue}>
              {timeLeft}s
              <Text style={styles.progressBar}>
                {' '}
                {'█'.repeat(Math.ceil(timeLeft / 2))}
              </Text>
            </Text>
          </View>
        </View>

        {/* Mensaje informativo */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            La oferta expirará en {timeLeft} segundos si no es aceptada
          </Text>
        </View>

        {/* Botón para cancelar */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOffer}
          >
            <Text style={styles.cancelButtonText}>Cancelar Oferta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  spinnerSection: {
    alignItems: 'center',
    marginTop: 40,
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
  messageSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  offerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  offerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  progressBar: {
    fontSize: 8,
    color: '#F59E0B',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
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
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
});

export default OfferWaitingScreen;
