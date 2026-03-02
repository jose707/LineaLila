import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type AdminRidesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AdminRides"
>;

interface AdminRidesScreenProps {
  navigation: AdminRidesScreenNavigationProp;
}

interface Ride {
  id: string;
  passengerName: string;
  driverName: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: "completed" | "in_progress" | "cancelled" | "disputed";
  fare: number;
  date: string;
  distance: number;
  duration: number;
}

const AdminRidesScreen: React.FC<AdminRidesScreenProps> = ({ navigation }) => {
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "completed" | "in_progress" | "cancelled" | "disputed"
  >("all");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [rides] = useState<Ride[]>([
    {
      id: "RIDE001",
      passengerName: "María García",
      driverName: "Juan Rodríguez",
      pickupLocation: "Calle Santa Cruz",
      dropoffLocation: "Centro Paceño",
      status: "completed",
      fare: 45.5,
      date: "2024-12-15 14:30",
      distance: 12.5,
      duration: 28,
    },
    {
      id: "RIDE002",
      passengerName: "Ana López",
      driverName: "Carlos Méndez",
      pickupLocation: "Zona Sud",
      dropoffLocation: "Sopocachi",
      status: "disputed",
      fare: 38.0,
      date: "2024-12-15 16:45",
      distance: 9.2,
      duration: 22,
    },
    {
      id: "RIDE003",
      passengerName: "Patricia Sánchez",
      driverName: "Luis Fernández",
      pickupLocation: "El Alto",
      dropoffLocation: "Miraflores",
      status: "completed",
      fare: 52.75,
      date: "2024-12-15 10:15",
      distance: 15.8,
      duration: 35,
    },
    {
      id: "RIDE004",
      passengerName: "Roberto Torres",
      driverName: "Miguel Díaz",
      pickupLocation: "Calacoto",
      dropoffLocation: "Irpavi",
      status: "cancelled",
      fare: 0,
      date: "2024-12-14 18:00",
      distance: 0,
      duration: 0,
    },
  ]);

  const filteredRides = rides.filter((ride) => {
    const matchesSearch =
      ride.id.toLowerCase().includes(searchText.toLowerCase()) ||
      ride.passengerName.toLowerCase().includes(searchText.toLowerCase()) ||
      ride.driverName.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || ride.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in_progress":
        return "#3B82F6";
      case "disputed":
        return "#EF4444";
      case "cancelled":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "in_progress":
        return "▶";
      case "disputed":
        return "⚠";
      case "cancelled":
        return "✕";
      default:
        return "?";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rides Management</Text>
        <Text style={styles.headerEmpty} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ride ID, passenger, or driver..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Status Filter */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "all" && styles.filterTextActive,
                ]}
              >
                All Rides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "completed" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("completed")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "completed" && styles.filterTextActive,
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "in_progress" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("in_progress")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "in_progress" && styles.filterTextActive,
                ]}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "disputed" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("disputed")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "disputed" && styles.filterTextActive,
                ]}
              >
                Disputed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "cancelled" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("cancelled")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "cancelled" && styles.filterTextActive,
                ]}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Rides List */}
        <View style={styles.listSection}>
          <Text style={styles.resultCount}>
            {filteredRides.length} ride{filteredRides.length !== 1 ? "s" : ""}{" "}
            found
          </Text>
          {filteredRides.map((ride) => (
            <TouchableOpacity
              key={ride.id}
              style={styles.rideCard}
              onPress={() => {
                setSelectedRide(ride);
                setModalVisible(true);
              }}
            >
              <View style={styles.rideHeader}>
                <View style={styles.rideIdSection}>
                  <Text style={styles.rideId}>{ride.id}</Text>
                  <Text style={styles.rideDate}>{ride.date}</Text>
                </View>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(ride.status) },
                  ]}
                >
                  <Text style={styles.statusIcon}>
                    {getStatusIcon(ride.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.rideBody}>
                <View style={styles.rideRoute}>
                  <View style={styles.routePoint}>
                    <Text style={styles.routeIcon}>▓</Text>
                    <Text style={styles.routeText}>{ride.pickupLocation}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routePoint}>
                    <Text style={styles.routeIcon}>▓</Text>
                    <Text style={styles.routeText}>{ride.dropoffLocation}</Text>
                  </View>
                </View>

                <View style={styles.rideParticipants}>
                  <Text style={styles.participantLabel}>
                    👤 {ride.passengerName}
                  </Text>
                  <Text style={styles.participantLabel}>
                    🚗 {ride.driverName}
                  </Text>
                </View>
              </View>

              <View style={styles.rideFooter}>
                <View style={styles.rideMeta}>
                  <Text style={styles.metaItem}>
                    📏 {ride.distance.toFixed(1)} km
                  </Text>
                  <Text style={styles.metaItem}>⏱️ {ride.duration} min</Text>
                </View>
                <Text style={styles.rideFare}>${ride.fare.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Ride Details Modal */}
      {selectedRide && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Ride Details</Text>
                <Text style={styles.emptySpace} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Ride Status */}
                <View
                  style={[
                    styles.statusSection,
                    { backgroundColor: getStatusColor(selectedRide.status) },
                  ]}
                >
                  <Text style={styles.statusLabel}>
                    {selectedRide.status.toUpperCase().replace("_", " ")}
                  </Text>
                </View>

                {/* Route Details */}
                <View style={styles.detailsSection}>
                  <DetailRow
                    label="Ride ID"
                    value={selectedRide.id}
                    icon="🆔"
                  />
                  <DetailRow
                    label="Date & Time"
                    value={selectedRide.date}
                    icon="🕐"
                  />
                  <DetailRow
                    label="Passenger"
                    value={selectedRide.passengerName}
                    icon="👤"
                  />
                  <DetailRow
                    label="Driver"
                    value={selectedRide.driverName}
                    icon="🚗"
                  />
                  <DetailRow
                    label="Pickup"
                    value={selectedRide.pickupLocation}
                    icon="📍"
                  />
                  <DetailRow
                    label="Dropoff"
                    value={selectedRide.dropoffLocation}
                    icon="🎯"
                  />
                </View>

                {/* Trip Metrics */}
                <View style={styles.metricsSection}>
                  <Text style={styles.metricsTitle}>Trip Metrics</Text>
                  <View style={styles.metricsGrid}>
                    <MetricCard
                      label="Distance"
                      value={`${selectedRide.distance.toFixed(1)} km`}
                    />
                    <MetricCard
                      label="Duration"
                      value={`${selectedRide.duration} min`}
                    />
                    <MetricCard
                      label="Fare"
                      value={`$${selectedRide.fare.toFixed(2)}`}
                    />
                  </View>
                </View>

                {/* Actions */}
                {selectedRide.status === "disputed" && (
                  <View style={styles.actionsSection}>
                    <TouchableOpacity style={styles.actionButtonPrimary}>
                      <Text style={styles.actionButtonText}>
                        ✓ Resolve Dispute
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButtonSecondary}>
                      <Text style={styles.actionButtonTextSecondary}>
                        💬 View Messages
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedRide.status === "completed" && (
                  <View style={styles.actionsSection}>
                    <TouchableOpacity style={styles.actionButtonSecondary}>
                      <Text style={styles.actionButtonTextSecondary}>
                        ⭐ View Ratings
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  icon: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailIcon}>{icon}</Text>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

interface MetricCardProps {
  label: string;
  value: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerEmpty: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  filterText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  resultCount: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  rideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rideHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rideIdSection: {
    flex: 1,
  },
  rideId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  rideDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIcon: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  rideBody: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rideRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  routeIcon: {
    fontSize: 12,
    color: "#7C3AED",
    marginRight: 8,
  },
  routeText: {
    fontSize: 12,
    color: "#1F2937",
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: "#E5E7EB",
    marginLeft: 5,
    marginVertical: 2,
  },
  rideParticipants: {
    gap: 4,
  },
  participantLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  rideFooter: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  rideMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaItem: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  rideFare: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C3AED",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptySpace: {
    width: 28,
  },
  modalBody: {
    padding: 16,
  },
  statusSection: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detailIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  metricsSection: {
    marginBottom: 16,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C3AED",
    marginTop: 4,
  },
  actionsSection: {
    gap: 10,
    marginBottom: 20,
  },
  actionButtonPrimary: {
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
});

export default AdminRidesScreen;
