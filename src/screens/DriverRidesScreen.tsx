import React, { useState, useEffect } from "react";
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

interface DriverRide {
  id: string;
  passengerName: string;
  pickupLocation: string;
  destinationLocation: string;
  startTime: string;
  endTime: string;
  distance: string;
  fare: number;
  rating: number;
  status: "completed" | "cancelled" | "pending";
}

const DriverRidesScreen = () => {
  const navigation = useNavigation();
  const [rides, setRides] = useState<DriverRide[]>([
    {
      id: "1",
      passengerName: "Sofía González",
      pickupLocation: "Plaza Murillo",
      destinationLocation: "Mi Teleférico",
      startTime: "14:30",
      endTime: "14:55",
      distance: "2.5 km",
      fare: 12.5,
      rating: 5,
      status: "completed",
    },
    {
      id: "2",
      passengerName: "Carmen López",
      pickupLocation: "Mercado de las Brujas",
      destinationLocation: "Av. Ballivián",
      startTime: "13:15",
      endTime: "13:45",
      distance: "3.2 km",
      fare: 15.0,
      rating: 4.5,
      status: "completed",
    },
    {
      id: "3",
      passengerName: "Juana Martínez",
      pickupLocation: "Calle Jaén",
      destinationLocation: "Valle de la Luna",
      startTime: "12:00",
      endTime: "12:30",
      distance: "4.1 km",
      fare: 18.5,
      rating: 5,
      status: "completed",
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
      case "pending":
        return "#F59E0B";
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
      case "pending":
        return "Pendiente";
      default:
        return status;
    }
  };

  const renderRideCard = ({ item }: { item: DriverRide }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => {
        // 🔥 TODO: Navegar a detalles del viaje
        Alert.alert("Detalle del viaje", `Viaje con ${item.passengerName}`);
      }}
    >
      <View style={styles.rideHeader}>
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>{item.passengerName}</Text>
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
          <Text style={styles.detailLabel}>Hora</Text>
          <Text style={styles.detailValue}>
            {item.startTime} - {item.endTime}
          </Text>
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
          <Text style={styles.detailLabel}>Calificación</Text>
          <Text style={styles.detailValue}>⭐ {item.rating}</Text>
        </View>
      </View>
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
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
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

export default DriverRidesScreen;
