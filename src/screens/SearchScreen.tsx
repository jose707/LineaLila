// screens/SearchScreen.tsx
import React, { useState, useCallback } from 'react';
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
import { RootStackParamList, Stop } from '../navigation/AppNavigator';
import { CommonActions } from '@react-navigation/native';
import SearchBar, { SearchResult } from '../components/SearchBar';
import { MapPin, X, Plus, ArrowUpDown } from 'lucide-react-native';
import { SEARCHSCREEN_COLORS as C } from '../theme/colors';
import { cacheSearchManager } from '../utils/cacheManager';

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const EMPTY_STOP: Stop = { location: { latitude: 0, longitude: 0 }, address: '' };

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<SearchScreenRouteProp>();

  const MAX_STOPS = 5;

  const initialStops = React.useMemo(() => {
    if (route.params?.stops && route.params.stops.length >= 2) {
      return route.params.stops.slice(0, MAX_STOPS);
    }
    const pickup = route.params?.pickupLocation
      ? {
          location: route.params.pickupLocation,
          address: route.params.pickupAddress || '',
        }
      : { location: { latitude: 0, longitude: 0 }, address: '' };

    const destination = route.params?.destinationLocation
      ? {
          location: route.params.destinationLocation,
          address: route.params.destinationAddress || '',
        }
      : { location: { latitude: 0, longitude: 0 }, address: '' };

    return [pickup, destination];
  }, []);

  const [stops, setStops] = useState<Stop[]>(initialStops);

  const isStopFilled = (stop: Stop) =>
    stop.address !== '' &&
    stop.location.latitude !== 0 &&
    stop.location.longitude !== 0;

  const filledStops = stops.filter(isStopFilled);

  const handleStopSelect = (index: number, result: SearchResult) => {
    const newStops = [...stops];
    newStops[index] = {
      location: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
      address: result.display_name,
    };
    setStops(newStops);
    cacheSearchManager.saveSearch(result.display_name);
  };

  const addStopAfter = (index: number) => {
    if (stops.length >= MAX_STOPS) return;
    const insertAt = index === stops.length - 1 ? stops.length - 1 : index + 1;
    const newStops = [...stops];
    newStops.splice(insertAt, 0, { ...EMPTY_STOP });
    setStops(newStops);
  };

  const clearStop = (index: number) => {
    const newStops = [...stops];
    newStops[index] = { ...EMPTY_STOP };
    setStops(newStops);
  };

  const swapStops = () => {
    if (stops.length !== 2) return;
    const newStops = [stops[1], stops[0]];
    setStops(newStops);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const confirmLocations = () => {
    const validStops = stops.filter(isStopFilled);

    if (validStops.length < 2) {
      Alert.alert(
        'Información requerida',
        'Selecciona al menos el punto de partida y el destino.',
      );
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Map',
            params: {
              pickupLocation: validStops[0].location,
              destinationLocation: validStops[validStops.length - 1].location,
              pickupAddress: validStops[0].address,
              destinationAddress: validStops[validStops.length - 1].address,
              stops: validStops,
            },
          },
        ],
      }),
    );
  };

  const goBack = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Map', params: { reset: true } }],
      }),
    );
  };

  const goBackWithPicking = (stopIndex: number) => {
    const currentStops = stops.map((s) =>
      isStopFilled(s) ? s : { ...EMPTY_STOP },
    );

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Map',
            params: {
              pickupLocation: isStopFilled(currentStops[0])
                ? currentStops[0].location
                : undefined,
              pickupAddress: currentStops[0].address || undefined,
              destinationLocation: isStopFilled(
                currentStops[currentStops.length - 1],
              )
                ? currentStops[currentStops.length - 1].location
                : undefined,
              destinationAddress:
                currentStops[currentStops.length - 1].address || undefined,
              stops: currentStops,
              pickingMode: stopIndex === 0
                ? 'origin'
                : stopIndex === currentStops.length - 1
                  ? 'destination'
                  : 'origin',
              editingStopIndex: stopIndex,
            },
          },
        ],
      }),
    );
  };

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
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <X size={24} color={C.primaryLight} strokeWidth={2.8} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Planifica tu viaje</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {stops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === stops.length - 1;

          return (
            <View key={`stop-${index}`}>
              

              {/* STOP ROW */}
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  {/* Step indicator */}
                  <View style={styles.stepColumn}>
                    <View
                      style={[
                        styles.stepIndicator,
                        {
                          backgroundColor: '#7C3AED',
                        },
                      ]}
                    >
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                  </View>

                  {/* Content */}
                  <View style={styles.stopContent}>
                    <View style={styles.stopInputRow}>
                      <View style={styles.searchBarWrapper}>
                        {isStopFilled(stop) ? (
                          <TouchableOpacity
                            style={styles.filledInput}
                            onPress={() => clearStop(index)}
                            activeOpacity={0.8}
                          >
                            <MapPin
                              size={20}
                              color="#7C3AED"
                              strokeWidth={2.5}
                              style={{ marginRight: 8 }}
                            />
                            <Text
                              style={styles.filledInputText}
                              numberOfLines={1}
                            >
                              {stop.address}
                            </Text>
                            <TouchableOpacity
                              style={styles.clearInputBtn}
                              onPress={() => clearStop(index)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <X size={12} color="#FFFFFF" strokeWidth={4} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ) : (
                          <SearchBar
                            placeholder={
                              isFirst
                                ? '¿Dónde te recogemos?'
                                : isLast
                                  ? '¿Cuál es el destino final?'
                                  : 'Buscar parada...'
                            }
                            onResultSelect={(result) =>
                              handleStopSelect(index, result)
                            }
                            leftIcon={<MapPin size={22} color="#7C3AED" strokeWidth={2.5} />}
                            onLeftIconPress={() => goBackWithPicking(index)}
                          />
                        )}
                      </View>

                      {/* Right buttons */}
                      {stops.length === 2 && isLast ? (
                        <TouchableOpacity
                          style={styles.swapRowBtn}
                          onPress={swapStops}
                          activeOpacity={0.7}
                        >
                          <ArrowUpDown size={18} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                      ) : stops.length > 2 && !isFirst ? (
                        <TouchableOpacity
                          style={styles.removeStopBtn}
                          onPress={() => removeStop(index)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={18} color="#7C3AED" strokeWidth={3} />
                        </TouchableOpacity>
                      ) : isFirst ? (
                        <TouchableOpacity
                          style={[
                            styles.addStopRowBtn,
                            stops.length >= MAX_STOPS && styles.addStopRowBtnDisabled,
                          ]}
                          onPress={() => addStopAfter(index)}
                          activeOpacity={stops.length >= MAX_STOPS ? 1 : 0.7}
                          disabled={stops.length >= MAX_STOPS}
                        >
                          <Plus
                            size={18}
                            color={stops.length >= MAX_STOPS ? '#9CA3AF' : '#FFFFFF'}
                            strokeWidth={3}
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* CONFIRM BUTTON - FIXED BOTTOM */}
      {filledStops.length >= 2 && (
        <View style={styles.confirmSection}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmLocations}
            activeOpacity={0.9}
          >
            <Text style={styles.confirmButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // HEADER
  header: {
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
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
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },

  
  // CONNECTOR
  connectorRow: {
    width: 48,
    alignItems: 'center',
    height: 4,
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },

  // STOP SECTION
  section: {
    marginBottom: 0,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  stepColumn: {
    width: 48,
    alignItems: 'center',
  },
  stepIndicator: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // STOP CONTENT
  stopContent: {
    flex: 1,
  },

  // STOP INPUT
  stopInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  searchBarWrapper: {
    flex: 1,
  },
  filledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 6,
    minHeight: 48,
  },
  filledInputText: {
    flex: 1,
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '500',
  },
  clearInputBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStopRowBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  addStopRowBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  swapRowBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  removeStopBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  // CONFIRM BUTTON
  confirmSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
    fontWeight: '600',
    color: C.white,
    letterSpacing: 0.5,
  },

});

export default SearchScreen;
