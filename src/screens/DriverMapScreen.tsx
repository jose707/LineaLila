import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, LatLng } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

interface RideRequest {
  id: string;
  passengerName: string;
  pickupLocation: LatLng;
  pickupAddress: string;
  destinationLocation: LatLng;
  destinationAddress: string;
  estimatedFare: number;
  distance: string;
  estimatedTime: string;
}

const DriverMapScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);

  const [isAvailable, setIsAvailable] = useState(true);
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [showingRequest, setShowingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simular una solicitud de viaje (en realidad vendría del backend)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAvailable && !rideRequest) {
        simulateRideRequest();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAvailable, rideRequest]);

  const simulateRideRequest = () => {
    const mockRequest: RideRequest = {
      id: "req_" + Date.now(),
      passengerName: "Carmen López",
      pickupLocation: { latitude: -16.5, longitude: -68.15 },
      pickupAddress: "Plaza Murillo, La Paz",
      destinationLocation: { latitude: -16.515, longitude: -68.12 },
      destinationAddress: "Mi Teleférico, La Paz",
      estimatedFare: 15.0,
      distance: "2.5 km",
      estimatedTime: "8 min",
    };
    setRideRequest(mockRequest);
    setShowingRequest(true);
  };

  const handleAcceptRide = async () => {
    if (!rideRequest) return;

    setIsLoading(true);
    try {
      // 🔥 TODO: Conectar con backend para aceptar viaje
      Alert.alert(
        "Viaje aceptado",
        `Dirigiéndote a recoger a ${rideRequest.passengerName}`
      );

      // Centrar mapa en el pickup
      if (mapRef.current && rideRequest.pickupLocation) {
        mapRef.current.animateToRegion(
          {
            latitude: rideRequest.pickupLocation.latitude,
            longitude: rideRequest.pickupLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      }

      setShowingRequest(false);
      setRideRequest(null);
    } catch (error) {
      Alert.alert("Error", "No se pudo aceptar el viaje");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineRide = () => {
    setShowingRequest(false);
    setRideRequest(null);
    Alert.alert("Viaje rechazado", "Buscando otras solicitudes...");
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: -16.5,
          longitude: -68.15,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Marcador de pickup si hay solicitud activa */}
        {rideRequest && (
          <>
            <Marker
              coordinate={rideRequest.pickupLocation}
              title={rideRequest.pickupAddress}
              pinColor="#7C3AED"
            />
            <Marker
              coordinate={rideRequest.destinationLocation}
              title={rideRequest.destinationAddress}
              pinColor="#EC4899"
            />
          </>
        )}
      </MapView>

      {/* HEADER CON ESTADO */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle} />
            <Text style={styles.logoText}>línea lila</Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                isAvailable
                  ? styles.statusDotAvailable
                  : styles.statusDotUnavailable,
              ]}
            />
            <Text style={styles.statusText}>
              {isAvailable ? "Disponible" : "No disponible"}
            </Text>
          </View>
        </View>
      </View>

      {/* SOLICITUD DE VIAJE FLOTANTE */}
      {showingRequest && rideRequest && (
        <View style={styles.rideRequestPanel}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestTitle}>Nueva solicitud</Text>
            <View style={styles.passengerBadge}>
              <Text style={styles.passengerEmoji}>👤</Text>
            </View>
          </View>

          <Text style={styles.passengerName}>{rideRequest.passengerName}</Text>

          <View style={styles.locationSection}>
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>Recogida</Text>
              <Text style={styles.locationAddress}>
                {rideRequest.pickupAddress}
              </Text>
            </View>

            <View style={styles.routeIndicator}>
              <View style={styles.routeLine} />
              <Text style={styles.routeArrow}>→</Text>
            </View>

            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>Destino</Text>
              <Text style={styles.locationAddress}>
                {rideRequest.destinationAddress}
              </Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailValue}>{rideRequest.distance}</Text>
              <Text style={styles.detailLabel}>Distancia</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailValue}>
                {rideRequest.estimatedTime}
              </Text>
              <Text style={styles.detailLabel}>Tiempo estimado</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailValue}>
                Bs ${rideRequest.estimatedFare.toFixed(2)}
              </Text>
              <Text style={styles.detailLabel}>Tarifa estimada</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDeclineRide}
              disabled={isLoading}
            >
              <Text style={styles.declineButtonText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptRide}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptButtonText}>Aceptar viaje</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BOTÓN FLOTANTE PARA ACCIONES */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("DriverHome" as never)}
      >
        <Text style={styles.floatingButtonText}>🏠</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  map: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7C3AED",
  },
  logoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C3AED",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotAvailable: {
    backgroundColor: "#10B981",
  },
  statusDotUnavailable: {
    backgroundColor: "#9CA3AF",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  rideRequestPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  passengerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  passengerEmoji: {
    fontSize: 18,
  },
  passengerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D2D2D",
    marginBottom: 16,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationItem: {
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    fontWeight: "500",
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  routeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingLeft: 4,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: "#7C3AED",
    marginRight: 8,
  },
  routeArrow: {
    fontSize: 12,
    color: "#7C3AED",
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  detailBox: {
    flex: 1,
    alignItems: "center",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  floatingButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 28,
  },
});

export default DriverMapScreen;
