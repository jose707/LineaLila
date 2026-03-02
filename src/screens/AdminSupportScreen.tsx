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

type AdminSupportScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AdminSupport"
>;

interface AdminSupportScreenProps {
  navigation: AdminSupportScreenNavigationProp;
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: "lost_item" | "safety" | "payment" | "driver_behavior" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  description: string;
  messageCount: number;
}

const AdminSupportScreen: React.FC<AdminSupportScreenProps> = ({
  navigation,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "open" | "in_progress" | "resolved" | "closed"
  >("all");
  const [selectedPriority, setSelectedPriority] = useState<
    "all" | "low" | "medium" | "high" | "urgent"
  >("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);

  const [tickets] = useState<SupportTicket[]>([
    {
      id: "TK001",
      userId: "USER123",
      userName: "María García",
      subject: "Driver was rude during ride",
      category: "driver_behavior",
      priority: "high",
      status: "open",
      createdAt: "2024-12-15 14:30",
      updatedAt: "2024-12-15 14:30",
      description:
        "The driver was unprofessional and made inappropriate comments during my ride.",
      messageCount: 0,
    },
    {
      id: "TK002",
      userId: "USER456",
      userName: "Ana López",
      subject: "Overcharged for ride",
      category: "payment",
      priority: "urgent",
      status: "in_progress",
      createdAt: "2024-12-15 16:45",
      updatedAt: "2024-12-15 17:20",
      description: "I was charged $65 instead of $38 as shown in the app.",
      messageCount: 2,
    },
    {
      id: "TK003",
      userId: "USER789",
      userName: "Patricia Sánchez",
      subject: "Lost phone in vehicle",
      category: "lost_item",
      priority: "high",
      status: "resolved",
      createdAt: "2024-12-14 20:15",
      updatedAt: "2024-12-15 09:30",
      description:
        "I left my phone in the car. Driver found it and returned it.",
      messageCount: 3,
    },
    {
      id: "TK004",
      userId: "USER012",
      userName: "Roberto Torres",
      subject: "Safety concern - no seatbelt",
      category: "safety",
      priority: "urgent",
      status: "closed",
      createdAt: "2024-12-13 18:00",
      updatedAt: "2024-12-14 10:00",
      description: "Driver did not wear seatbelt during entire ride.",
      messageCount: 4,
    },
  ]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.id.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || ticket.status === selectedStatus;
    const matchesPriority =
      selectedPriority === "all" || ticket.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#EF4444";
      case "in_progress":
        return "#F59E0B";
      case "resolved":
        return "#10B981";
      case "closed":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "lost_item":
        return "🔍";
      case "safety":
        return "🛡️";
      case "payment":
        return "💳";
      case "driver_behavior":
        return "⚠️";
      case "other":
        return "❓";
      default:
        return "📝";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "#3B82F6";
      case "medium":
        return "#F59E0B";
      case "high":
        return "#EF4444";
      case "urgent":
        return "#991B1B";
      default:
        return "#6B7280";
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
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <Text style={styles.headerEmpty} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="Open"
            value={tickets.filter((t) => t.status === "open").length}
            color="#EF4444"
          />
          <StatCard
            label="In Progress"
            value={tickets.filter((t) => t.status === "in_progress").length}
            color="#F59E0B"
          />
          <StatCard
            label="Resolved"
            value={tickets.filter((t) => t.status === "resolved").length}
            color="#10B981"
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
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
                All Status
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === "open" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("open")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "open" && styles.filterTextActive,
                ]}
              >
                Open
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
                selectedStatus === "resolved" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus("resolved")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === "resolved" && styles.filterTextActive,
                ]}
              >
                Resolved
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Priority Filter */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedPriority === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedPriority("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedPriority === "all" && styles.filterTextActive,
                ]}
              >
                All Priority
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedPriority === "urgent" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedPriority("urgent")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedPriority === "urgent" && styles.filterTextActive,
                ]}
              >
                Urgent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedPriority === "high" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedPriority("high")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedPriority === "high" && styles.filterTextActive,
                ]}
              >
                High
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedPriority === "medium" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedPriority("medium")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedPriority === "medium" && styles.filterTextActive,
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tickets List */}
        <View style={styles.listSection}>
          <Text style={styles.resultCount}>
            {filteredTickets.length} ticket
            {filteredTickets.length !== 1 ? "s" : ""}
          </Text>
          {filteredTickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              onPress={() => {
                setSelectedTicket(ticket);
                setModalVisible(true);
              }}
            >
              <View style={styles.ticketHeader}>
                <View style={styles.ticketTitleSection}>
                  <Text style={styles.ticketId}>{ticket.id}</Text>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(ticket.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>
                    {ticket.priority.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketBody}>
                <View style={styles.categorySection}>
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(ticket.category)}
                  </Text>
                  <Text style={styles.categoryText}>{ticket.category}</Text>
                </View>
                <Text style={styles.userName}>👤 {ticket.userName}</Text>
              </View>

              <View style={styles.ticketFooter}>
                <View style={styles.statusSection}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(ticket.status) },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {ticket.status.replace("_", " ")}
                  </Text>
                </View>
                <Text style={styles.messages}>💬 {ticket.messageCount}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Ticket Details</Text>
                <Text style={styles.emptySpace} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Priority Banner */}
                <View
                  style={[
                    styles.priorityBanner,
                    {
                      backgroundColor: getPriorityColor(
                        selectedTicket.priority
                      ),
                    },
                  ]}
                >
                  <Text style={styles.priorityBannerText}>
                    {selectedTicket.priority.toUpperCase()} PRIORITY
                  </Text>
                </View>

                {/* Ticket Info */}
                <View style={styles.detailsSection}>
                  <DetailRow
                    label="Ticket ID"
                    value={selectedTicket.id}
                    icon="🆔"
                  />
                  <DetailRow
                    label="User"
                    value={selectedTicket.userName}
                    icon="👤"
                  />
                  <DetailRow
                    label="Category"
                    value={selectedTicket.category}
                    icon={getCategoryIcon(selectedTicket.category)}
                  />
                  <DetailRow
                    label="Created"
                    value={selectedTicket.createdAt}
                    icon="🕐"
                  />
                  <DetailRow
                    label="Last Updated"
                    value={selectedTicket.updatedAt}
                    icon="🔄"
                  />
                </View>

                {/* Description */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>
                    {selectedTicket.description}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                  {selectedTicket.status === "open" && (
                    <TouchableOpacity style={styles.actionButtonPrimary}>
                      <Text style={styles.actionButtonText}>
                        ▶️ Move to In Progress
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedTicket.status === "in_progress" && (
                    <TouchableOpacity style={styles.actionButtonPrimary}>
                      <Text style={styles.actionButtonText}>
                        ✓ Mark as Resolved
                      </Text>
                    </TouchableOpacity>
                  )}
                  {(selectedTicket.status === "resolved" ||
                    selectedTicket.status === "open") && (
                    <TouchableOpacity style={styles.actionButtonSecondary}>
                      <Text style={styles.actionButtonTextSecondary}>
                        💬 Send Message
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Text style={styles.actionButtonTextSecondary}>
                      📞 Contact User
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

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

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
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
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
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ticketHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  ticketTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  ticketId: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2,
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ticketBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categorySection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  userName: {
    fontSize: 12,
    color: "#1F2937",
  },
  ticketFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  messages: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
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
  priorityBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  priorityBannerText: {
    fontSize: 14,
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
    textTransform: "capitalize",
  },
  descriptionSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
  actionsSection: {
    gap: 10,
    marginBottom: 20,
  },
  actionButtonPrimary: {
    backgroundColor: "#7C3AED",
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

export default AdminSupportScreen;
