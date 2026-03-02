// screens/SearchScreen.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import SearchBar, { SearchResult } from "../components/SearchBar";
import { LatLng } from "react-native-maps";
import {
  cacheSearchManager,
  cacheTripHistoryManager,
} from "../utils/cacheManager";

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Search"
>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, "Search">;

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<SearchScreenRouteProp>();

  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(
    route.params?.pickupLocation || null
  );
  const [pickupAddress, setPickupAddress] = useState<string>(
    route.params?.pickupAddress || ""
  );
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(
    null
  );
  const [destinationAddress, setDestinationAddress] = useState<string>("");
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

  // Lugares sugeridos populares de La Paz
  const popularPlaces = [
    {
      name: "Plaza Murillo",
      address: "Centro histórico, La Paz",
      icon: "🏛️",
    },
    {
      name: "Mercado de las Brujas",
      address: "Calle Linares, La Paz",
      icon: "🛍️",
    },
    {
      name: "Mi Teleférico",
      address: "Sistema de transporte, La Paz",
      icon: "🚡",
    },
    {
      name: "Valle de la Luna",
      address: "Mallasa, La Paz",
      icon: "🌙",
    },
    {
      name: "Calle Jaén",
      address: "Zona colonial, La Paz",
      icon: "🏘️",
    },
    {
      name: "Mercado Rodríguez",
      address: "Zona central, La Paz",
      icon: "🥘",
    },
  ];

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
        "Punto de partida requerido",
        "Por favor selecciona tu punto de partida"
      );
      return;
    }

    if (!destinationLocation) {
      Alert.alert("Destino requerido", "Por favor selecciona tu destino");
      return;
    }

    navigation.navigate("Map", {
      pickupLocation,
      destinationLocation,
      pickupAddress,
      destinationAddress,
    });
  };

  // Volver y resetear todo
  const goBack = () => {
    navigation.navigate("Map", {
      reset: true,
    } as any);
  };

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goBack();
        return true; // Evitar comportamiento por defecto
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => {
        subscription.remove();
      };
    }, [])
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
            <View style={styles.sectionIconContainer}>
              <View style={styles.originDot} />
            </View>
            <Text style={styles.sectionLabel}>Punto de partida</Text>
          </View>

          {pickupLocation && pickupAddress ? (
            <View style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationIcon}>
                <View style={styles.selectedLocationDot} />
              </View>
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.selectedLocationTitle}>Confirmado</Text>
                <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                  {pickupAddress.split(",")[0]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setPickupLocation(null);
                  setPickupAddress("");
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
            <View style={styles.sectionIconContainer}>
              <View style={styles.destinationDot} />
            </View>
            <Text style={styles.sectionLabel}>Destino</Text>
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
                  {destinationAddress.split(",")[0]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setDestinationLocation(null);
                  setDestinationAddress("");
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

        {/* LUGARES POPULARES */}
        {!destinationLocation && (
          <View style={styles.section}>
            <Text style={styles.popularTitle}>Lugares populares</Text>
            <View style={styles.popularGrid}>
              {popularPlaces.map((place, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    // Aquí podrías hacer una búsqueda del lugar popular
                    Alert.alert("Búsqueda", `Buscando ${place.name}...`, [
                      { text: "OK" },
                    ]);
                  }}
                >
                  <View style={styles.popularIconContainer}>
                    <Text style={styles.popularIcon}>{place.icon}</Text>
                  </View>
                  <Text style={styles.popularName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.popularAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
    backgroundColor: "#FAFAFA",
  },

  // HEADER
  header: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#1A1A1A",
    fontWeight: "300",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logoCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#A78BFA",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "400",
    color: "#1A1A1A",
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A78BFA",
  },
  destinationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8B5CF6",
  },
  sectionLabel: {
    fontSize: 13,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
  },

  // SELECTED LOCATION
  selectedLocationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  destinationLocationDot: {
    backgroundColor: "#8B5CF6",
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationTitle: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "400",
    lineHeight: 20,
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginLeft: 8,
  },
  changeButtonText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  // LUGARES POPULARES
  popularTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  popularCard: {
    width: "50%",
    padding: 6,
  },
  popularIconContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  popularIcon: {
    fontSize: 32,
  },
  popularName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 2,
  },
  popularAddress: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // BOTÓN CONFIRMAR
  confirmSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#A78BFA",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginRight: 8,
  },
  confirmButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonIconText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },

  bottomSpacer: {
    height: 40,
  },
});

export default SearchScreen;
