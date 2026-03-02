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

type AdminPaymentsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AdminPayments"
>;

interface AdminPaymentsScreenProps {
  navigation: AdminPaymentsScreenNavigationProp;
}

interface Payment {
  id: string;
  rideId: string;
  userName: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: string;
  date: string;
  transactionId: string;
}

const AdminPaymentsScreen: React.FC<AdminPaymentsScreenProps> = ({
  navigation,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "completed" | "pending" | "failed" | "refunded"
  >("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [payments] = useState<Payment[]>([
    {
      id: "PAY001",
      rideId: "RIDE001",
      userName: "María García",
      amount: 45.5,
      status: "completed",
      paymentMethod: "Credit Card",
      date: "2024-12-15 14:35",
      transactionId: "TXN_1701362100_ABC123",
    },
    {
      id: "PAY002",
      rideId: "RIDE002",
      userName: "Ana López",
      amount: 38.0,
      status: "pending",
      paymentMethod: "Debit Card",
      date: "2024-12-15 16:50",
      transactionId: "TXN_1701363000_DEF456",
    },
    {
      id: "PAY003",
      rideId: "RIDE003",
      userName: "Patricia Sánchez",
      amount: 52.75,
      status: "completed",
      paymentMethod: "Cash",
      date: "2024-12-15 10:20",
      transactionId: "TXN_1701356400_GHI789",
    },
    {
      id: "PAY004",
      rideId: "RIDE005",
      userName: "Roberto Torres",
      amount: 41.2,
      status: "failed",
      paymentMethod: "Credit Card",
      date: "2024-12-14 19:15",
      transactionId: "TXN_1701283500_JKL012",
    },
    {
      id: "PAY005",
      rideId: "RIDE006",
      userName: "Luis Mendez",
      amount: 55.0,
      status: "refunded",
      paymentMethod: "Debit Card",
      date: "2024-12-14 15:30",
      transactionId: "TXN_1701268200_MNO345",
    },
  ]);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.id.toLowerCase().includes(searchText.toLowerCase()) ||
      payment.userName.toLowerCase().includes(searchText.toLowerCase()) ||
      payment.rideId.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || payment.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "failed":
        return "#EF4444";
      case "refunded":
        return "#8B5CF6";
      default:
        return "#6B7280";
    }
  };

  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <Text style={styles.headerEmpty} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Revenue Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>${totalRevenue.toFixed(2)}</Text>
            <Text style={styles.summaryMeta}>Completed payments</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>
              ${pendingAmount.toFixed(2)}
            </Text>
            <Text style={styles.summaryMeta}>
              {payments.filter((p) => p.status === "pending").length} payments
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by payment ID, ride, or user..."
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
                All Payments
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
                selectedStatus === "pending" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("pending")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "pending" && styles.filterTextActive,
                ]}
              >
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "failed" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("failed")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "failed" && styles.filterTextActive,
                ]}
              >
                Failed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "refunded" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("refunded")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "refunded" && styles.filterTextActive,
                ]}
              >
                Refunded
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Payments List */}
        <View style={styles.listSection}>
          <Text style={styles.resultCount}>
            {filteredPayments.length} payment
            {filteredPayments.length !== 1 ? "s" : ""}
          </Text>
          {filteredPayments.map((payment) => (
            <TouchableOpacity
              key={payment.id}
              style={styles.paymentCard}
              onPress={() => {
                setSelectedPayment(payment);
                setModalVisible(true);
              }}
            >
              <View style={styles.paymentHeader}>
                <View>
                  <Text style={styles.paymentId}>{payment.id}</Text>
                  <Text style={styles.paymentRide}>{payment.rideId}</Text>
                </View>
                <Text
                  style={[
                    styles.paymentAmount,
                    { color: getStatusColor(payment.status) },
                  ]}
                >
                  ${payment.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentBody}>
                <Text style={styles.paymentUser}>👤 {payment.userName}</Text>
                <Text style={styles.paymentMethod}>
                  💳 {payment.paymentMethod}
                </Text>
              </View>
              <View style={styles.paymentFooter}>
                <Text style={styles.paymentDate}>{payment.date}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(payment.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {payment.status.charAt(0).toUpperCase() +
                      payment.status.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Payment Details</Text>
                <Text style={styles.emptySpace} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Status Card */}
                <View
                  style={[
                    styles.statusCard,
                    { backgroundColor: getStatusColor(selectedPayment.status) },
                  ]}
                >
                  <Text style={styles.statusCardText}>
                    {selectedPayment.status.toUpperCase()}
                  </Text>
                  <Text style={styles.statusCardAmount}>
                    ${selectedPayment.amount.toFixed(2)}
                  </Text>
                </View>

                {/* Transaction Details */}
                <View style={styles.detailsSection}>
                  <DetailRow
                    label="Payment ID"
                    value={selectedPayment.id}
                    icon="🆔"
                  />
                  <DetailRow
                    label="Ride ID"
                    value={selectedPayment.rideId}
                    icon="🗺️"
                  />
                  <DetailRow
                    label="Transaction ID"
                    value={selectedPayment.transactionId}
                    icon="🔐"
                  />
                  <DetailRow
                    label="User"
                    value={selectedPayment.userName}
                    icon="👤"
                  />
                  <DetailRow
                    label="Payment Method"
                    value={selectedPayment.paymentMethod}
                    icon="💳"
                  />
                  <DetailRow
                    label="Date & Time"
                    value={selectedPayment.date}
                    icon="🕐"
                  />
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                  {selectedPayment.status === "pending" && (
                    <>
                      <TouchableOpacity style={styles.actionButtonPrimary}>
                        <Text style={styles.actionButtonText}>
                          ✓ Confirm Payment
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonDanger}>
                        <Text style={styles.actionButtonText}>
                          ✕ Mark as Failed
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedPayment.status === "completed" && (
                    <TouchableOpacity style={styles.actionButtonWarning}>
                      <Text style={styles.actionButtonText}>
                        ↶ Process Refund
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedPayment.status === "failed" && (
                    <TouchableOpacity style={styles.actionButtonSecondary}>
                      <Text style={styles.actionButtonTextSecondary}>
                        🔄 Retry Payment
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Text style={styles.actionButtonTextSecondary}>
                      📧 Send Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
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
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
    marginVertical: 6,
  },
  summaryMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paymentHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  paymentId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  paymentRide: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  paymentBody: {
    padding: 14,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  paymentUser: {
    fontSize: 12,
    color: "#1F2937",
  },
  paymentMethod: {
    fontSize: 12,
    color: "#6B7280",
  },
  paymentFooter: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  paymentDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
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
  statusCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  statusCardText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusCardAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 8,
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
    marginBottom: 14,
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
  actionButtonDanger: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonWarning: {
    backgroundColor: "#F59E0B",
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

export default AdminPaymentsScreen;
