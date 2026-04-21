// screens/SearchScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { CommonActions } from '@react-navigation/native';
import SearchBar, { SearchResult } from '../components/SearchBar';
import { LatLng } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import { SEARCHSCREEN_COLORS as C } from '../theme/colors';
import {
  cacheSearchManager,
  cacheTripHistoryManager,
} from '../utils/cacheManager';

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<SearchScreenRouteProp>();

  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(
    route.params?.pickupLocation || null,
  );
  const [pickupAddress, setPickupAddress] = useState<string>(
    route.params?.pickupAddress || '',
  );
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(
    route.params?.destinationLocation || null,
  );
  const [destinationAddress, setDestinationAddress] = useState<string>(
    route.params?.destinationAddress || '',
  );
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [frequentTrips, setFrequentTrips] = useState<any[]>([]);

  // 🔥 CARGAR HISTORIAL DE BÚSQUEDAS Y VIAJES FRECUENTES
  useEffect(() => {
    const loadHistory = async () => {
      const searches = await cacheSearchManager.getSearches();
      const trips = await cacheTripHistoryManager.getFrequentTrips();
      setSearchHistory(searches);
      setFrequentTrips(trips);
    };
    loadHistory();
  }, []);

  // Manejar selección de punto de partida
  const handlePickupSelect = (result: SearchResult) => {
    const location: LatLng = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    setPickupLocation(location);
    setPickupAddress(result.display_name);
    // 🔥 GUARDAR BÚSQUEDA EN CACHÉ
    cacheSearchManager.saveSearch(result.display_name);
  };

  // Manejar selección de destino
  const handleDestinationSelect = (result: SearchResult) => {
    const location: LatLng = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    setDestinationLocation(location);
    setDestinationAddress(result.display_name);
    // 🔥 GUARDAR BÚSQUEDA EN CACHÉ
    cacheSearchManager.saveSearch(result.display_name);
  };

  // Confirmar ubicaciones y volver al mapa
  const confirmLocations = () => {
    if (!pickupLocation) {
      Alert.alert(
        'Punto de partida requerido',
        'Por favor selecciona tu punto de partida',
      );
      return;
    }

    if (!destinationLocation) {
      Alert.alert('Destino requerido', 'Por favor selecciona tu destino');
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Map',
            params: {
              pickupLocation,
              destinationLocation,
              pickupAddress,
              destinationAddress,
            },
          },
        ],
      }),
    );
  };

  // Volver y resetear todo
  const goBack = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Map', params: { reset: true } }],
      }),
    );
  };

  // Volver al mapa en modo de selección manual
  const goBackWithPicking = (mode: 'origin' | 'destination') => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Map',
            params: {
              pickupLocation,
              pickupAddress,
              destinationLocation,
              destinationAddress,
              pickingMode: mode,
            },
          },
        ],
      }),
    );
  };

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [goBack]),
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER PREMIUM */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.logoCircle} />
          <Text style={styles.headerTitle}>Planifica tu viaje</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SECCIÓN PUNTO DE PARTIDA */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={styles.sectionIconContainer}>
                <View style={styles.originDot} />
              </View>
              <Text style={styles.sectionLabel}>Punto de partida</Text>
            </View>
            <TouchableOpacity
              style={styles.mapSelectButton}
              onPress={() => goBackWithPicking('origin')}
              activeOpacity={0.7}
            >
              <MapPin size={14} color={C.primary} />
              <Text style={styles.mapSelectText}>Mapa</Text>
            </TouchableOpacity>
          </View>

          {pickupLocation && pickupAddress ? (
            <View style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationIcon}>
                <View style={styles.selectedLocationDot} />
              </View>
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.selectedLocationTitle}>Confirmado</Text>
                <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                  {pickupAddress.split(',')[0]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setPickupLocation(null);
                  setPickupAddress('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.changeButtonText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SearchBar
              onResultSelect={handlePickupSelect}
              placeholder="¿Dónde te recogemos?"
              currentLat={pickupLocation?.latitude}
              currentLon={pickupLocation?.longitude}
            />
          )}
        </View>

        {/* SECCIÓN DESTINO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={styles.sectionIconContainer}>
                <View style={styles.destinationDot} />
              </View>
              <Text style={styles.sectionLabel}>Destino</Text>
            </View>
            <TouchableOpacity
              style={styles.mapSelectButton}
              onPress={() => goBackWithPicking('destination')}
              activeOpacity={0.7}
            >
              <MapPin size={14} color={C.primary} />
              <Text style={styles.mapSelectText}>Mapa</Text>
            </TouchableOpacity>
          </View>

          {destinationLocation && destinationAddress ? (
            <View style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationIcon}>
                <View
                  style={[
                    styles.selectedLocationDot,
                    styles.destinationLocationDot,
                  ]}
                />
              </View>
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.selectedLocationTitle}>Confirmado</Text>
                <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                  {destinationAddress.split(',')[0]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setDestinationLocation(null);
                  setDestinationAddress('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.changeButtonText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SearchBar
              onResultSelect={handleDestinationSelect}
              placeholder="¿A dónde vamos?"
              currentLat={pickupLocation?.latitude}
              currentLon={pickupLocation?.longitude}
            />
          )}
        </View>

        {/* BOTÓN CONFIRMAR */}
        {pickupLocation && destinationLocation && (
          <View style={styles.confirmSection}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmLocations}
              activeOpacity={0.9}
            >
              <Text style={styles.confirmButtonText}>Continuar</Text>
              <View style={styles.confirmButtonIcon}>
                <Text style={styles.confirmButtonIconText}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ESPACIADO INFERIOR */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },

  // HEADER
  header: {
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.headerBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: C.textDark,
    fontWeight: '300',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primaryLight,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: C.textDark,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // CONTENT
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // SECTIONS
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primaryLight,
  },
  destinationDot: {
    width: 8,
    height: 8,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  sectionLabel: {
    fontSize: 13,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  mapSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight + '15', // light primary tint
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapSelectText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600',
    marginLeft: 4,
  },

  // SELECTED LOCATION
  selectedLocationCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 10,
    backgroundColor: C.success,
  },
  destinationLocationDot: {
    backgroundColor: C.primary,
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationTitle: {
    fontSize: 11,
    color: C.success,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 15,
    color: C.textDark,
    fontWeight: '400',
    lineHeight: 20,
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: C.backgroundLight,
    marginLeft: 8,
  },
  changeButtonText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },

  // BOTÓN CONFIRMAR
  confirmSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: C.primaryLight,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: C.white,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  confirmButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonIconText: {
    fontSize: 16,
    color: C.white,
    fontWeight: '500',
  },

  bottomSpacer: {
    height: 40,
  },
});

export default SearchScreen;
