import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { RootStackParamList } from "../navigation/AppNavigator";

interface ActiveRide {
  rideId: string;
  status: "searching" | "accepted" | "arrived" | "in_progress" | "completed";
  driverName: string;
  driverPhone: string;
  driverRating: number;
  vehicleInfo: string;
  licensePlate: string;
  pickupLocation: string;
  destinationLocation: string;
  pickupCoords: { latitude: number; longitude: number };
  destinationCoords: { latitude: number; longitude: number };
  driverCoords: { latitude: number; longitude: number };
  fare: number;
  eta: number; // en minutos
  distance: number; // en km
}

const ClientRideDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "ClientRideDetails">>();
  const { rideId } = route.params || { rideId: "demo" };

  const [ride, setRide] = useState<ActiveRide>({
    rideId: rideId || "RIDE_001",
    status: "in_progress",
    driverName: "María García",
    driverPhone: "+591 71234567",
    driverRating: 4.8,
    vehicleInfo: "Toyota Yaris Rojo",
    licensePlate: "LLA-123",
    pickupLocation: "Plaza Murillo",
    destinationLocation: "Centro Comercial Alalay",
    pickupCoords: { latitude: -16.503776, longitude: -68.134498 },
    destinationCoords: { latitude: -16.518, longitude: -68.124 },
    driverCoords: { latitude: -16.509, longitude: -68.129 },
    fare: 15.5,
    eta: 8,
    distance: 2.5,
  });

  const [eta, setEta] = useState(ride.eta);

  // Simular ETA actualizado
  useEffect(() => {
    const interval = setInterval(() => {
      setEta((prev) => (prev > 0 ? prev - 1 : 0));
    }, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case "searching":
        return "Buscando conductor";
      case "accepted":
        return "Conductor aceptó";
      case "arrived":
        return "Conductor llegó";
      case "in_progress":
        return "En camino";
      case "completed":
        return "Completado";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "searching":
        return "#F59E0B";
      case "accepted":
        return "#3B82F6";
      case "arrived":
        return "#EC4899";
      case "in_progress":
        return "#10B981";
      case "completed":
        return "#8B5CF6";
      default:
        return "#666";
    }
  };

  const handleCallDriver = () => {
    Linking.openURL(`tel:${ride.driverPhone}`).catch(() => {
      Alert.alert("Error", "No se puede realizar la llamada");
    });
  };

  const handleCancelRide = () => {
    if (ride.status === "in_progress") {
      Alert.alert("Cancelar viaje", "¿Estás segura de que deseas cancelar?", [
        { text: "No", onPress: () => {}, style: "cancel" },
        {
          text: "Sí, cancelar",
          onPress: () => {
            setRide({ ...ride, status: "completed" });
            Alert.alert("Viaje cancelado", "Se ha procesado la cancelación");
            setTimeout(() => navigation.goBack(), 1500);
          },
          style: "destructive",
        },
      ]);
    }
  };

  const handleShareLocation = () => {
    Alert.alert(
      "Ubicación compartida",
      "Se ha compartido tu ubicación con el conductor"
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Viaje</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* MAPA */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: -16.51,
            longitude: -68.127,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
        >
          {/* Marker de origen */}
          <Marker
            coordinate={ride.pickupCoords}
            title="Recogida"
            pinColor="#7C3AED"
          />
          {/* Marker de destino */}
          <Marker
            coordinate={ride.destinationCoords}
            title="Destino"
            pinColor="#EC4899"
          />
          {/* Marker del conductor */}
          <Marker
            coordinate={ride.driverCoords}
            title={ride.driverName}
            pinColor="#F59E0B"
          />
          {/* Ruta */}
          <Polyline
            coordinates={[
              ride.driverCoords,
              ride.pickupCoords,
              ride.destinationCoords,
            ]}
            strokeColor="#7C3AED"
            strokeWidth={4}
          />
        </MapView>

        {/* Status Badge */}
        <View
          style={[
            styles.statusOverlay,
            { backgroundColor: getStatusColor(ride.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(ride.status)}</Text>
        </View>
      </View>

      {/* CONTENIDO SCROLLABLE */}
      <ScrollView style={styles.content}>
        {/* ETA Y DISTANCIA */}
        <View style={styles.etaContainer}>
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>{eta} min</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>{ride.distance} km</Text>
            <Text style={styles.etaLabel}>Distancia</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>Bs ${ride.fare.toFixed(2)}</Text>
            <Text style={styles.etaLabel}>Tarifa</Text>
          </View>
        </View>

        {/* INFORMACIÓN DEL CONDUCTOR */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Conductor</Text>

          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.avatarText}>👩</Text>
            </View>

            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{ride.driverName}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>⭐ {ride.driverRating}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallDriver}
            >
              <Text style={styles.callButtonIcon}>📞</Text>
            </TouchableOpacity>
          </View>

          {/* VEHÍCULO */}
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleLabel}>Vehículo</Text>
            <Text style={styles.vehicleValue}>{ride.vehicleInfo}</Text>
            <Text style={styles.licensePlate}>{ride.licensePlate}</Text>
          </View>
        </View>

        {/* UBICACIONES */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ruta</Text>

          <View style={styles.locationItem}>
            <View style={styles.locationIconPickup}>
              <Text style={styles.locationIcon}>📍</Text>
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Recogida</Text>
              <Text style={styles.locationText}>{ride.pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.locationItem}>
            <View style={styles.locationIconDestination}>
              <Text style={styles.locationIcon}>🎯</Text>
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Destino</Text>
              <Text style={styles.locationText}>
                {ride.destinationLocation}
              </Text>
            </View>
          </View>
        </View>

        {/* ACCIONES */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShareLocation}
          >
            <Text style={styles.buttonIcon}>📍</Text>
            <Text style={styles.secondaryButtonText}>Compartir ubicación</Text>
          </TouchableOpacity>

          {ride.status === "in_progress" && (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleCancelRide}
            >
              <Text style={styles.dangerButtonText}>Cancelar viaje</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SOPORTE */}
        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportIcon}>🆘</Text>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Centro de seguridad</Text>
            <Text style={styles.supportSubtitle}>
              Reportar un problema con este viaje
            </Text>
          </View>
          <Text style={styles.supportArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    zIndex: 10,
  },
  backButton: {
    fontSize: 28,
    color: "#7C3AED",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  mapContainer: {
    height: 240,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  statusOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  etaContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: "space-around",
    alignItems: "center",
  },
  etaItem: {
    alignItems: "center",
  },
  etaValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 4,
  },
  etaLabel: {
    fontSize: 12,
    color: "#999",
  },
  etaDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#F0F0F0",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 12,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  callButtonIcon: {
    fontSize: 20,
  },
  vehicleInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  vehicleLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  vehicleValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 4,
  },
  licensePlate: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  locationIconPickup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationIconDestination: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FCE7F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  routeLine: {
    marginLeft: 18,
    marginBottom: 12,
    height: 24,
    borderLeftWidth: 2,
    borderLeftColor: "#E0E0E0",
  },
  actionButtons: {
    gap: 12,
    marginBottom: 16,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0E6FF",
    gap: 8,
  },
  buttonIcon: {
    fontSize: 16,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED",
  },
  dangerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  supportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  supportSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  supportArrow: {
    fontSize: 20,
    color: "#C0C0C0",
  },
});

export default ClientRideDetailsScreen;
