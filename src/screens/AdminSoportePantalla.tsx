import React, { useState as usarEstado } from "react";
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  StatusBar as EstadoBar,
  TextInput as TextoEntrada,
  Modal } from
"react-native";
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { NativeStackNavigationProp as NativoPilaNavegacionProp } from "@react-navigation/native-stack";
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";

type AdminSoportePantallaNavegacionPropiedad = NativoPilaNavegacionProp<
  RaizPilaParametroLista,
  "AdminSupport">;


interface AdminSoportePantallaPropiedades {
  navigation: AdminSoportePantallaNavegacionPropiedad;
}

interface SoporteComprobante {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: "lost_item" | "safety" | "pago" | "driver_behavior" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "abierto" | "en_curso" | "resuelto" | "closed";
  createdAt: string;
  updatedAt: string;
  description: string;
  messageCount: number;
}

const AdministradorSoportePantalla: React.FC<AdminSoportePantallaPropiedades> = ({
  navigation: navegacion
}) => {
  const [buscarTexto, establecerBuscarTexto] = usarEstado("");
  const [seleccionadoEstado, establecerSeleccionadoEstado] = usarEstado<
    "all" | "abierto" | "en_curso" | "resuelto" | "closed">(
    "all");
  const [seleccionadoPrioridad, establecerSeleccionadoPrioridad] = usarEstado<
    "all" | "low" | "medium" | "high" | "urgent">(
    "all");
  const [seleccionadoComprobante, establecerSeleccionadoComprobante] = usarEstado<SoporteComprobante | null>(
    null
  );
  const [modalVisible, establecerModalVisible] = usarEstado(false);

  const [tickets] = usarEstado<SoporteComprobante[]>([
  {
    id: "TK001",
    userId: "USER123",
    userName: "María García",
    subject: "Driver was rude during ride",
    category: "driver_behavior",
    priority: "high",
    status: "abierto",
    createdAt: "2024-12-15 14:30",
    updatedAt: "2024-12-15 14:30",
    description:
    "The driver was unprofessional and made inappropriate comments during my ride.",
    messageCount: 0
  },
  {
    id: "TK002",
    userId: "USER456",
    userName: "Ana López",
    subject: "Overcharged for ride",
    category: "pago",
    priority: "urgent",
    status: "en_curso",
    createdAt: "2024-12-15 16:45",
    updatedAt: "2024-12-15 17:20",
    description: "I was charged $65 instead of $38 as shown in the app.",
    messageCount: 2
  },
  {
    id: "TK003",
    userId: "USER789",
    userName: "Patricia Sánchez",
    subject: "Lost phone in vehicle",
    category: "lost_item",
    priority: "high",
    status: "resuelto",
    createdAt: "2024-12-14 20:15",
    updatedAt: "2024-12-15 09:30",
    description:
    "I left my phone in the car. Driver found it and returned it.",
    messageCount: 3
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
    messageCount: 4
  }]
  );

  const filtradoTickets = tickets.filter((comprobante) => {
    const coincidenciasBuscar =
    comprobante.id.toLowerCase().includes(buscarTexto.toLowerCase()) ||
    comprobante.userName.toLowerCase().includes(buscarTexto.toLowerCase()) ||
    comprobante.subject.toLowerCase().includes(buscarTexto.toLowerCase());
    const coincidenciasEstado =
    seleccionadoEstado === "all" || comprobante.status === seleccionadoEstado;
    const coincidenciasPrioridad =
    seleccionadoPrioridad === "all" || comprobante.priority === seleccionadoPrioridad;
    return coincidenciasBuscar && coincidenciasEstado && coincidenciasPrioridad;
  });

  const obtenerEstadoColor = (estado: string) => {
    switch (estado) {
      case "abierto":
        return "#EF4444";
      case "en_curso":
        return "#F59E0B";
      case "resuelto":
        return "#10B981";
      case "closed":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const obtenerCategoriaIcono = (categoria: string) => {
    switch (categoria) {
      case "lost_item":
        return "🔍";
      case "safety":
        return "🛡️";
      case "pago":
        return "💳";
      case "driver_behavior":
        return "⚠️";
      case "other":
        return "❓";
      default:
        return "📝";
    }
  };

  const obtenerPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
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
    <SeguraZonaVista style={estilos.container}>
      <EstadoBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <Vista style={estilos.header}>
        <PulsableOpacidad onPress={() => navegacion.goBack()}>
          <Texto style={estilos.backButton}>‹</Texto>
        </PulsableOpacidad>
        <Texto style={estilos.headerTitle}>Support Tickets</Texto>
        <Texto style={estilos.headerEmpty} />
      </Vista>

      <DesplazableVista
        style={estilos.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Stats */}
        <Vista style={estilos.statsRow}>
          <StatTarjeta
            label="Open"
            value={tickets.filter((t) => t.status === "abierto").length}
            color="#EF4444" />

          <StatTarjeta
            label="In Progress"
            value={tickets.filter((t) => t.status === "en_curso").length}
            color="#F59E0B" />

          <StatTarjeta
            label="Resolved"
            value={tickets.filter((t) => t.status === "resuelto").length}
            color="#10B981" />

        </Vista>

        {/* Search Bar */}
        <Vista style={estilos.searchContainer}>
          <TextoEntrada
            style={estilos.searchInput}
            placeholder="Search tickets..."
            placeholderTextColor="#999"
            value={buscarTexto}
            onChangeText={establecerBuscarTexto} />

        </Vista>

        {/* Status Filter */}
        <Vista style={estilos.filterSection}>
          <DesplazableVista horizontal showsHorizontalScrollIndicator={false}>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoEstado === "all" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoEstado("all")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoEstado === "all" && estilos.filterTextActive]
                }>

                All Status
              </Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoEstado === "abierto" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoEstado("abierto")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoEstado === "abierto" && estilos.filterTextActive]
                }>

                Open
              </Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoEstado === "en_curso" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoEstado("en_curso")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoEstado === "en_curso" && estilos.filterTextActive]
                }>

                In Progress
              </Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoEstado === "resuelto" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoEstado("resuelto")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoEstado === "resuelto" && estilos.filterTextActive]
                }>

                Resolved
              </Texto>
            </PulsableOpacidad>
          </DesplazableVista>
        </Vista>

        {/* Priority Filter */}
        <Vista style={estilos.filterSection}>
          <DesplazableVista horizontal showsHorizontalScrollIndicator={false}>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoPrioridad === "all" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoPrioridad("all")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoPrioridad === "all" && estilos.filterTextActive]
                }>

                All Priority
              </Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoPrioridad === "urgent" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoPrioridad("urgent")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoPrioridad === "urgent" && estilos.filterTextActive]
                }>

                Urgent
              </Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoPrioridad === "high" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoPrioridad("high")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoPrioridad === "high" && estilos.filterTextActive]
                }>

                High
              </Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={[
              estilos.filterButton,
              seleccionadoPrioridad === "medium" && estilos.filterButtonActive]
              }
              onPress={() => establecerSeleccionadoPrioridad("medium")}>

              <Texto
                style={[
                estilos.filterText,
                seleccionadoPrioridad === "medium" && estilos.filterTextActive]
                }>

                Medium
              </Texto>
            </PulsableOpacidad>
          </DesplazableVista>
        </Vista>

        {/* Tickets List */}
        <Vista style={estilos.listSection}>
          <Texto style={estilos.resultCount}>
            {filtradoTickets.length} ticket
            {filtradoTickets.length !== 1 ? "s" : ""}
          </Texto>
          {filtradoTickets.map((comprobante) =>
          <PulsableOpacidad
            key={comprobante.id}
            style={estilos.ticketCard}
            onPress={() => {
              establecerSeleccionadoComprobante(comprobante);
              establecerModalVisible(true);
            }}>

              <Vista style={estilos.ticketHeader}>
                <Vista style={estilos.ticketTitleSection}>
                  <Texto style={estilos.ticketId}>{comprobante.id}</Texto>
                  <Texto style={estilos.ticketSubject}>{comprobante.subject}</Texto>
                </Vista>
                <Vista
                style={[
                estilos.priorityBadge,
                { backgroundColor: obtenerPrioridadColor(comprobante.priority) }]
                }>

                  <Texto style={estilos.priorityText}>
                    {comprobante.priority.charAt(0).toUpperCase()}
                  </Texto>
                </Vista>
              </Vista>

              <Vista style={estilos.ticketBody}>
                <Vista style={estilos.categorySection}>
                  <Texto style={estilos.categoryIcon}>
                    {obtenerCategoriaIcono(comprobante.category)}
                  </Texto>
                  <Texto style={estilos.categoryText}>{comprobante.category}</Texto>
                </Vista>
                <Texto style={estilos.userName}>👤 {comprobante.userName}</Texto>
              </Vista>

              <Vista style={estilos.ticketFooter}>
                <Vista style={estilos.statusSection}>
                  <Vista
                  style={[
                  estilos.statusDot,
                  { backgroundColor: obtenerEstadoColor(comprobante.status) }]
                  } />

                  <Texto style={estilos.statusText}>
                    {comprobante.status.replace("_", " ")}
                  </Texto>
                </Vista>
                <Texto style={estilos.messages}>💬 {comprobante.messageCount}</Texto>
              </Vista>
            </PulsableOpacidad>
          )}
        </Vista>
      </DesplazableVista>

      {/* Ticket Details Modal */}
      {seleccionadoComprobante &&
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <Vista style={estilos.modalContainer}>
            <Vista style={estilos.modalContent}>
              <Vista style={estilos.modalHeader}>
                <PulsableOpacidad onPress={() => establecerModalVisible(false)}>
                  <Texto style={estilos.closeButton}>‹</Texto>
                </PulsableOpacidad>
                <Texto style={estilos.modalTitle}>Ticket Details</Texto>
                <Texto style={estilos.emptySpace} />
              </Vista>

              <DesplazableVista style={estilos.modalBody}>
                {/* Priority Banner */}
                <Vista
                style={[
                estilos.priorityBanner,
                {
                  backgroundColor: obtenerPrioridadColor(
                    seleccionadoComprobante.priority
                  )
                }]
                }>

                  <Texto style={estilos.priorityBannerText}>
                    {seleccionadoComprobante.priority.toUpperCase()} PRIORITY
                  </Texto>
                </Vista>

                {/* Ticket Info */}
                <Vista style={estilos.detailsSection}>
                  <DetalleFila
                  label="Ticket ID"
                  value={seleccionadoComprobante.id}
                  icon="🆔" />

                  <DetalleFila
                  label="User"
                  value={seleccionadoComprobante.userName}
                  icon="👤" />

                  <DetalleFila
                  label="Category"
                  value={seleccionadoComprobante.category}
                  icon={obtenerCategoriaIcono(seleccionadoComprobante.category)} />

                  <DetalleFila
                  label="Created"
                  value={seleccionadoComprobante.createdAt}
                  icon="🕐" />

                  <DetalleFila
                  label="Last Updated"
                  value={seleccionadoComprobante.updatedAt}
                  icon="🔄" />

                </Vista>

                {/* Description */}
                <Vista style={estilos.descriptionSection}>
                  <Texto style={estilos.descriptionTitle}>Description</Texto>
                  <Texto style={estilos.descriptionText}>
                    {seleccionadoComprobante.description}
                  </Texto>
                </Vista>

                {/* Actions */}
                <Vista style={estilos.actionsSection}>
                  {seleccionadoComprobante.status === "abierto" &&
                <PulsableOpacidad style={estilos.actionButtonPrimary}>
                      <Texto style={estilos.actionButtonText}>
                        ▶️ Move to In Progress
                      </Texto>
                    </PulsableOpacidad>
                }
                  {seleccionadoComprobante.status === "en_curso" &&
                <PulsableOpacidad style={estilos.actionButtonPrimary}>
                      <Texto style={estilos.actionButtonText}>
                        ✓ Mark as Resolved
                      </Texto>
                    </PulsableOpacidad>
                }
                  {(seleccionadoComprobante.status === "resuelto" ||
                seleccionadoComprobante.status === "abierto") &&
                <PulsableOpacidad style={estilos.actionButtonSecondary}>
                      <Texto style={estilos.actionButtonTextSecondary}>
                        💬 Send Message
                      </Texto>
                    </PulsableOpacidad>
                }
                  <PulsableOpacidad style={estilos.actionButtonSecondary}>
                    <Texto style={estilos.actionButtonTextSecondary}>
                      📞 Contact User
                    </Texto>
                  </PulsableOpacidad>
                </Vista>
              </DesplazableVista>
            </Vista>
          </Vista>
        </Modal>
      }
    </SeguraZonaVista>);

};

interface StatTarjetaPropiedades {
  label: string;
  value: number;
  color: string;
}

const StatTarjeta: React.FC<StatTarjetaPropiedades> = ({ label: etiqueta, value: valor, color }) =>
<Vista style={[estilos.statCard, { borderLeftColor: color }]}>
    <Texto style={estilos.statLabel}>{etiqueta}</Texto>
    <Texto style={[estilos.statValue, { color }]}>{valor}</Texto>
  </Vista>;


interface DetailFilaPropiedades {
  label: string;
  value: string;
  icon: string;
}

const DetalleFila: React.FC<DetailFilaPropiedades> = ({ label: etiqueta, value: valor, icon: icono }) =>
<Vista style={estilos.detailRow}>
    <Texto style={estilos.detailIcon}>{icono}</Texto>
    <Vista style={estilos.detailContent}>
      <Texto style={estilos.detailLabel}>{etiqueta}</Texto>
      <Texto style={estilos.detailValue}>{valor}</Texto>
    </Vista>
  </Vista>;


const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA"
  },
  header: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  headerEmpty: {
    width: 28
  },
  content: {
    flex: 1
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500"
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8
  },
  filterButtonActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED"
  },
  filterText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500"
  },
  filterTextActive: {
    color: "#FFFFFF"
  },
  listSection: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  resultCount: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    fontWeight: "500"
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  ticketHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  ticketTitleSection: {
    flex: 1,
    marginRight: 12
  },
  ticketId: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500"
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  ticketBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  categorySection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  categoryIcon: {
    fontSize: 14
  },
  categoryText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "capitalize"
  },
  userName: {
    fontSize: 12,
    color: "#1F2937"
  },
  ticketFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB"
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "500",
    textTransform: "capitalize"
  },
  messages: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500"
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%"
  },
  modalHeader: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  closeButton: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  emptySpace: {
    width: 28
  },
  modalBody: {
    padding: 16
  },
  priorityBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16
  },
  priorityBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  detailsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12
  },
  detailIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2
  },
  detailContent: {
    flex: 1
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    textTransform: "capitalize"
  },
  descriptionSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10
  },
  descriptionText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20
  },
  actionsSection: {
    gap: 10,
    marginBottom: 20
  },
  actionButtonPrimary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  actionButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937"
  }
});

export default AdministradorSoportePantalla;
