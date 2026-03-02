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

type AdminPromoScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AdminPromo"
>;

interface AdminPromoScreenProps {
  navigation: AdminPromoScreenNavigationProp;
}

interface PromoCode {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  maxUsage: number;
  currentUsage: number;
  minRideAmount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

const AdminPromoScreen: React.FC<AdminPromoScreenProps> = ({ navigation }) => {
  const [searchText, setSearchText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const [promos] = useState<PromoCode[]>([
    {
      id: "PROMO001",
      code: "WELCOME15",
      discountType: "percentage",
      discountValue: 15,
      maxUsage: 1000,
      currentUsage: 342,
      minRideAmount: 20,
      validFrom: "2024-01-01",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: "PROMO002",
      code: "SAVE50",
      discountType: "fixed_amount",
      discountValue: 50,
      maxUsage: 500,
      currentUsage: 487,
      minRideAmount: 100,
      validFrom: "2024-12-01",
      validUntil: "2024-12-25",
      isActive: true,
    },
    {
      id: "PROMO003",
      code: "REFERRAL20",
      discountType: "percentage",
      discountValue: 20,
      maxUsage: 2000,
      currentUsage: 1203,
      minRideAmount: 0,
      validFrom: "2024-01-01",
      validUntil: "2025-12-31",
      isActive: true,
    },
    {
      id: "PROMO004",
      code: "HOLIDAY30",
      discountType: "percentage",
      discountValue: 30,
      maxUsage: 300,
      currentUsage: 300,
      minRideAmount: 50,
      validFrom: "2024-12-01",
      validUntil: "2024-12-31",
      isActive: false,
    },
  ]);

  const filteredPromos = promos.filter((promo) =>
    promo.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const getUsagePercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const isExpiringSoon = (date: string) => {
    const expiryDate = new Date(date);
    const today = new Date();
    const daysLeft = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft <= 7 && daysLeft > 0;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Promo Codes</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
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
            placeholder="Search promo codes..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Active & Inactive Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="Active Codes"
            value={promos.filter((p) => p.isActive).length}
            color="#10B981"
          />
          <StatCard
            label="Inactive Codes"
            value={promos.filter((p) => !p.isActive).length}
            color="#6B7280"
          />
        </View>

        {/* Promos List */}
        <View style={styles.listSection}>
          {filteredPromos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎁</Text>
              <Text style={styles.emptyStateText}>No promo codes found</Text>
            </View>
          ) : (
            filteredPromos.map((promo) => (
              <TouchableOpacity
                key={promo.id}
                style={styles.promoCard}
                onPress={() => {
                  setSelectedPromo(promo);
                  setDetailsModalVisible(true);
                }}
              >
                <View style={styles.promoHeader}>
                  <View>
                    <Text style={styles.promoCode}>{promo.code}</Text>
                    <Text style={styles.promoId}>{promo.id}</Text>
                  </View>
                  <View
                    style={[
                      styles.discountBadge,
                      {
                        backgroundColor:
                          promo.discountType === "percentage"
                            ? "#ECE5FF"
                            : "#E0F2FE",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountText,
                        {
                          color:
                            promo.discountType === "percentage"
                              ? "#7C3AED"
                              : "#0284C7",
                        },
                      ]}
                    >
                      {promo.discountType === "percentage"
                        ? `${promo.discountValue}%`
                        : `$${promo.discountValue}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.promoBody}>
                  <Text style={styles.promoDesc}>
                    Min: ${promo.minRideAmount} | Valid: {promo.validFrom} to{" "}
                    {promo.validUntil}
                  </Text>
                  {isExpiringSoon(promo.validUntil) && (
                    <Text style={styles.expiringWarning}>⚠️ Expiring soon</Text>
                  )}
                </View>

                <View style={styles.promoFooter}>
                  <View style={styles.usageSection}>
                    <View style={styles.usageBar}>
                      <View
                        style={[
                          styles.usageFill,
                          {
                            width: `${getUsagePercentage(
                              promo.currentUsage,
                              promo.maxUsage
                            )}%`,
                            backgroundColor:
                              promo.currentUsage >= promo.maxUsage
                                ? "#EF4444"
                                : "#7C3AED",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.usageText}>
                      {promo.currentUsage} / {promo.maxUsage}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: promo.isActive ? "#10B981" : "#D1D5DB",
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Promo Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeButton}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Promo Code</Text>
              <Text style={styles.emptySpace} />
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <FormField label="Code Name" placeholder="e.g., SUMMER25" />
                <FormField
                  label="Discount Type"
                  placeholder="Percentage or Fixed Amount"
                />
                <FormField
                  label="Discount Value"
                  placeholder="15 or 50"
                  keyboardType="numeric"
                />
                <FormField
                  label="Max Usage"
                  placeholder="1000"
                  keyboardType="numeric"
                />
                <FormField
                  label="Min Ride Amount"
                  placeholder="20"
                  keyboardType="numeric"
                />
                <FormField label="Valid From" placeholder="2024-01-01" />
                <FormField label="Valid Until" placeholder="2024-12-31" />

                <TouchableOpacity style={styles.createPromoButton}>
                  <Text style={styles.createPromoButtonText}>
                    Create Promo Code
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Promo Details Modal */}
      {selectedPromo && (
        <Modal
          visible={detailsModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <Text style={styles.closeButton}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Promo Details</Text>
                <Text style={styles.emptySpace} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Code Display */}
                <View style={styles.codeDisplayCard}>
                  <Text style={styles.codeName}>{selectedPromo.code}</Text>
                  <Text style={styles.codeDiscount}>
                    {selectedPromo.discountType === "percentage"
                      ? `${selectedPromo.discountValue}% OFF`
                      : `$${selectedPromo.discountValue} OFF`}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.detailsSection}>
                  <DetailRow
                    label="Code ID"
                    value={selectedPromo.id}
                    icon="🆔"
                  />
                  <DetailRow
                    label="Discount Type"
                    value={
                      selectedPromo.discountType === "percentage"
                        ? "Percentage"
                        : "Fixed Amount"
                    }
                    icon="🏷️"
                  />
                  <DetailRow
                    label="Min Ride Amount"
                    value={`$${selectedPromo.minRideAmount}`}
                    icon="💰"
                  />
                  <DetailRow
                    label="Valid Period"
                    value={`${selectedPromo.validFrom} to ${selectedPromo.validUntil}`}
                    icon="📅"
                  />
                  <DetailRow
                    label="Usage"
                    value={`${selectedPromo.currentUsage} / ${selectedPromo.maxUsage}`}
                    icon="📊"
                  />
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                  {selectedPromo.isActive ? (
                    <TouchableOpacity style={styles.actionButtonDanger}>
                      <Text style={styles.actionButtonText}>⛔ Deactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.actionButtonPrimary}>
                      <Text style={styles.actionButtonText}>✓ Activate</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Text style={styles.actionButtonTextSecondary}>
                      ✏️ Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Text style={styles.actionButtonTextSecondary}>
                      🗑️ Delete
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

interface FormFieldProps {
  label: string;
  placeholder: string;
  keyboardType?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  placeholder,
  keyboardType = "default",
}) => (
  <View style={styles.formField}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      placeholder={placeholder}
      placeholderTextColor="#999"
      keyboardType={keyboardType as any}
    />
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  createButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
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
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 12,
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
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  listSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
  },
  promoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  promoHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  promoCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  promoId: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 14,
    fontWeight: "700",
  },
  promoBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  promoDesc: {
    fontSize: 11,
    color: "#6B7280",
  },
  expiringWarning: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 4,
    fontWeight: "500",
  },
  promoFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  usageSection: {
    flex: 1,
    marginRight: 12,
  },
  usageBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 4,
  },
  usageFill: {
    height: 4,
    borderRadius: 2,
  },
  usageText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  formSection: {
    gap: 12,
  },
  formField: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  createPromoButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  createPromoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  codeDisplayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  codeName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#7C3AED",
  },
  codeDiscount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
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

export default AdminPromoScreen;
