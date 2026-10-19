// screens/SearchScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Platform,
  PermissionsAndroid,
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
import Geolocation from '@react-native-community/geolocation';
import SearchBar, { SearchResult, SearchBarRef } from '../components/SearchBar';
import PlaceSuggestionLabel from '../components/PlaceSuggestionLabel';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from '../components/MapLocationIcons';
import { MapPin, X } from 'lucide-react-native';
import { SEARCHSCREEN_COLORS as C } from '../theme/colors';
import { PlaceSuggestion } from '../services/places.service';

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const EMPTY_STOP: Stop = {
  location: { latitude: 0, longitude: 0 },
  address: '',
};

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
  }, [
    route.params?.stops,
    route.params?.pickupLocation,
    route.params?.pickupAddress,
    route.params?.destinationLocation,
    route.params?.destinationAddress,
  ]);

  const [stops, setStops] = useState<Stop[]>(initialStops);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const firstSearchRef = useRef<SearchBarRef>(null);
  const searchBars = useRef<Record<number, SearchBarRef | null>>({});
  const mountedRef = useRef(false);
  const prevAllFilled = useRef(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(
    null,
  );
  const [sharedResults, setSharedResults] = useState<PlaceSuggestion[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState('');
  const [sharedEmpty, setSharedEmpty] = useState(false);

  const cameraForPickup = (pickup: Stop['location']) => {
    const previous = route.params?.pickupLocation;
    if (!previous || Math.abs(previous.latitude - pickup.latitude) > 0.000001 ||
      Math.abs(previous.longitude - pickup.longitude) > 0.000001) return undefined;
    return route.params?.mapRegion;
  };

  useEffect(() => {
    setTimeout(() => {
      firstSearchRef.current?.focus();
    }, 400);
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      const allFilled =
        stops.filter(isStopFilled).length === stops.length && stops.length >= 2;
      prevAllFilled.current = allFilled;
      if (allFilled && route.params?.pickingMode) {
        const validStops = stops.filter(isStopFilled);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'Map',
                params: {
                  pickupLocation: validStops[0].location,
                  destinationLocation:
                    validStops[validStops.length - 1].location,
                  pickupAddress: validStops[0].address,
                  destinationAddress: validStops[validStops.length - 1].address,
                  mapRegion: cameraForPickup(validStops[0].location),
                  stops: validStops,
                },
              },
            ],
          }),
        );
      }
      return;
    }
    const currentAllFilled =
      stops.filter(isStopFilled).length === stops.length && stops.length >= 2;
    if (currentAllFilled && !prevAllFilled.current) {
      const validStops = stops.filter(isStopFilled);
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
                mapRegion: cameraForPickup(validStops[0].location),
                stops: validStops,
              },
            },
          ],
        }),
      );
    }
    prevAllFilled.current = currentAllFilled;
  }, [stops, navigation, route.params?.pickingMode]);

  useEffect(() => {
    const getLocation = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      Geolocation.getCurrentPosition(
        pos => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    };
    getLocation();
  }, []);

  const isStopFilled = (stop: Stop) =>
    stop.address !== '' &&
    stop.location.latitude !== 0 &&
    stop.location.longitude !== 0;

  const firstUnfilledIndex = stops.findIndex(s => !isStopFilled(s));

  const handleStopSelect = (index: number, result: SearchResult) => {
    prevAllFilled.current = false;
    const newStops = [...stops];
    newStops[index] = {
      location: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
      address: result.display_name,
    };
    setStops(newStops);
    setSharedResults([]);
    setSharedLoading(false);
    setSharedError('');
    setActiveSearchIndex(null);
  };

  const clearStop = (index: number) => {
    const newStops = [...stops];
    newStops[index] = { ...EMPTY_STOP };
    setStops(newStops);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const goBack = useCallback(() => {
    const p = route.params;
    if (p?.destinationLocation) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Map',
              params: {
                pickupLocation: p.pickupLocation,
                pickupAddress: p.pickupAddress,
                destinationLocation: p.destinationLocation,
                destinationAddress: p.destinationAddress,
                mapRegion: p.mapRegion,
                stops: p.stops,
              },
            },
          ],
        }),
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Map', params: { reset: true } }],
        }),
      );
    }
  }, [navigation, route.params]);

  const goBackWithPicking = (stopIndex: number) => {
    const currentStops = stops.map(s =>
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
              mapRegion: route.params?.mapRegion,
              stops: currentStops,
              pickingMode:
                stopIndex === 0
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
                  {/* Route point icon */}
                  <View style={styles.stepColumn}>
                    {isFirst ? <PassengerMapIcon size={40} />
                      : isLast ? <DestinationFlagIcon size={40} />
                      : <WaypointMapIcon number={index} />}
                  </View>

                  {/* Content */}
                  <View style={styles.stopContent}>
                    <View style={styles.stopInputRow}>
                      <View style={styles.searchBarWrapper}>
                        <SearchBar
                          ref={instance => {
                            searchBars.current[index] = instance;
                            if (index === firstUnfilledIndex)
                              firstSearchRef.current = instance;
                          }}
                          placeholder={
                            isFirst
                              ? '¿Dónde te recogemos?'
                              : isLast
                              ? '¿Cuál es el destino final?'
                              : 'Buscar parada...'
                          }
                          initialValue={stop.address}
                          onClear={() => clearStop(index)}
                          onResultSelect={result =>
                            handleStopSelect(index, result)
                          }
                          currentLat={userLocation?.latitude}
                          currentLon={userLocation?.longitude}
                          suffixIcon={
                            <MapPin
                              size={26}
                              color="#7C3AED"
                              strokeWidth={2.5}
                            />
                          }
                          onSuffixIconPress={() => goBackWithPicking(index)}
                          hideResults
                          onResultsChange={(results, loading, error, empty) => {
                            if (activeSearchIndex === index) {
                              setSharedResults(results);
                              setSharedLoading(loading);
                              setSharedError(error);
                              setSharedEmpty(empty);
                            }
                          }}
                          onFocusChange={focused => {
                            if (focused) {
                              setSharedResults([]);
                              setSharedError('');
                              setSharedLoading(false);
                              setSharedEmpty(false);
                              setActiveSearchIndex(index);
                            }
                          }}
                        />
                      </View>

                      {/* Right buttons */}
                      {stops.length > 2 && !isFirst ? (
                        <TouchableOpacity
                          style={styles.removeStopBtn}
                          onPress={() => removeStop(index)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={18} color="#7C3AED" strokeWidth={3} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Shared results list below all SearchBars */}
        {activeSearchIndex !== null && (
          <View style={styles.sharedResults}>
            {sharedLoading && (
              <View style={styles.sharedLoading}>
                <ActivityIndicator size="small" color="#7C3AED" />
              </View>
            )}
            {!!sharedError && (
              <Text accessibilityRole="alert" style={styles.searchError}>
                {sharedError}
              </Text>
            )}
            {sharedEmpty && !sharedLoading && !sharedError && (
              <Text style={styles.attribution}>
                No se encontraron destinos en La Paz.
              </Text>
            )}
            {!sharedLoading && !sharedError && sharedResults.length > 0 && (
              <View style={styles.sharedResultsList}>
                {sharedResults.map((item, index) => {
                  const isLastItem = index === sharedResults.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.placeId}
                      style={[
                        styles.sharedResultItem,
                        isLastItem && styles.sharedResultItemLast,
                      ]}
                      onPress={() => {
                        if (activeSearchIndex !== null) {
                          searchBars.current[activeSearchIndex]?.select(item);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.sharedResultIconContainer}>
                        <MapPin
                          size={22}
                          color="#7C3AED"
                          strokeWidth={2.2}
                        />
                      </View>
                      <PlaceSuggestionLabel suggestion={item} />
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.attribution}>Google Maps</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  attribution: {
    fontSize: 12,
    fontWeight: '400',
    color: '#5E5E5E',
    padding: 12,
    textAlign: 'right',
  },
  searchError: { fontSize: 14, color: '#B91C1C', padding: 12 },
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
  removeStopBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  // SHARED RESULTS
  sharedResults: {
    marginTop: 8,
    paddingHorizontal: 2,
    marginBottom: 20,
  },
  sharedLoading: {
    padding: 16,
    alignItems: 'center',
  },
  sharedResultsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sharedResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sharedResultItemLast: {
    borderBottomWidth: 0,
  },
  sharedResultIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});

export default SearchScreen;
