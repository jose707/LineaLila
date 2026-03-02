import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

interface ClientRide {
  id: string;
  driverName: string;
  pickupLocation: string;
  destinationLocation: string;
  date: string;
  time: string;
  distance: string;
  fare: number;
  driverRating: number;
  status: "completed" | "cancelled";
}

const ClientRideHistoryScreen = () => {
  const navigation = useNavigation();
  const [rides, setRides] = useState<ClientRide[]>([
    {
      id: "1",
      driverName: "María García",
      pickupLocation: "Plaza Murillo",
      destinationLocation: "Mi Teleférico",
      date: "Hoy",
      time: "14:30",
      distance: "2.5 km",
      fare: 12.5,
      driverRating: 4.8,
      status: "completed",
    },
    {
      id: "2",
      driverName: "Carmen López",
      pickupLocation: "Mercado de las Brujas",
      destinationLocation: "Av. Ballivián",
      date: "Ayer",
      time: "18:45",
      distance: "3.2 km",
      fare: 15.0,
      driverRating: 4.9,
      status: "completed",
    },
    {
      id: "3",
      driverName: "Juana Martínez",
      pickupLocation: "Calle Jaén",
      destinationLocation: "Valle de la Luna",
      date: "Hace 3 días",
      time: "10:15",
      distance: "4.1 km",
      fare: 18.5,
      driverRating: 5.0,
      status: "completed",
    },
    {
      id: "4",
      driverName: "Rosa Flores",
      pickupLocation: "Av. 6 de Agosto",
      destinationLocation: "Casco Viejo",
      date: "Hace 5 días",
      time: "19:20",
      distance: "2.8 km",
      fare: 13.75,
      driverRating: 4.7,
      status: "cancelled",
    },
  ]);

  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "cancelled"
  >("all");

  const filteredRides = rides.filter((ride) => {
    if (filterStatus === "all") return true;
    return ride.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "cancelled":
        return "#EF4444";
      default:
        return "#666";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const renderRideCard = ({ item }: { item: ClientRide }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => {
        // 🔥 TODO: Navegar a detalles del viaje
        Alert.alert("Detalle del viaje", `Viaje con ${item.driverName}`);
      }}
    >
      <View style={styles.rideHeader}>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.driverName}</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>📍 {item.pickupLocation}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.locationText}>{item.destinationLocation}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.rideDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Fecha</Text>
          <Text style={styles.detailValue}>{item.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Hora</Text>
          <Text style={styles.detailValue}>{item.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Distancia</Text>
          <Text style={styles.detailValue}>{item.distance}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Tarifa</Text>
          <Text style={styles.detailValue}>Bs ${item.fare.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Conductor</Text>
          <Text style={styles.detailValue}>⭐ {item.driverRating}</Text>
        </View>
      </View>

      {item.status === "completed" && (
        <TouchableOpacity style={styles.rateButton}>
          <Text style={styles.rateButtonText}>Dejar calificación</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Viajes</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* FILTROS */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus("all")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === "all" && styles.filterButtonTextActive,
            ]}
          >
            Todos ({rides.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === "completed" && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus("completed")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === "completed" && styles.filterButtonTextActive,
            ]}
          >
            Completados ({rides.filter((r) => r.status === "completed").length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === "cancelled" && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus("cancelled")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === "cancelled" && styles.filterButtonTextActive,
            ]}
          >
            Cancelados ({rides.filter((r) => r.status === "cancelled").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE VIAJES */}
      <FlatList
        data={filteredRides}
        renderItem={renderRideCard}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay viajes</Text>
            <Text style={styles.emptySubtext}>
              Los viajes que realices aparecerán aquí
            </Text>
          </View>
        }
      />
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
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterButtonActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  rideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    color: "#999",
    marginHorizontal: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rideDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  detailItem: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D2D2D",
  },
  rateButton: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F8F5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#999",
  },
});

export default ClientRideHistoryScreen;
