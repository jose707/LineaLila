// src/screens/RoleSelectionScreen.tsx
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { COLORS } from "../theme/colors";

type RoleSelectionScreenProps = NativeStackNavigationProp<
  AuthStackParamList,
  "RoleSelection"
>;

interface Props {
  navigation: RoleSelectionScreenProps;
  route: {
    params?: {
      user?: any;
    };
  };
}

export default function RoleSelectionScreen({ navigation, route }: Props) {
  const { user } = route.params || {};

  const handleSelectRole = async (selectedRole: "passenger" | "driver") => {
    if (selectedRole === "passenger") {
      // Ir directamente al dashboard del pasajero
      navigation.navigate("Home" as never);
    } else if (selectedRole === "driver") {
      // Ir al registro de conductor
      navigation.navigate("DriverRegistration", { user } as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>¿Cuál es tu rol?</Text>
          <Text style={styles.subtitle}>Elige cómo deseas usar Línea Lila</Text>
        </View>

        {/* Passenger Option */}
        <TouchableOpacity
          style={[styles.roleCard, styles.passengerCard]}
          onPress={() => handleSelectRole("passenger")}
          activeOpacity={0.8}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>👩</Text>
          </View>
          <Text style={styles.roleName}>Pasajera</Text>
          <Text style={styles.roleDescription}>
            Solicita viajes seguros con nuestras conductoras certificadas
          </Text>
          <View style={styles.features}>
            <Text style={styles.feature}>✓ Viajes seguros</Text>
            <Text style={styles.feature}>✓ Historial de viajes</Text>
            <Text style={styles.feature}>✓ Calificaciones</Text>
            <Text style={styles.feature}>✓ Soporte 24/7</Text>
          </View>
          <View style={styles.roleButton}>
            <Text style={styles.roleButtonText}>Seleccionar</Text>
          </View>
        </TouchableOpacity>

        {/* Driver Option */}
        <TouchableOpacity
          style={[styles.roleCard, styles.driverCard]}
          onPress={() => handleSelectRole("driver")}
          activeOpacity={0.8}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>👩‍🚗</Text>
          </View>
          <Text style={styles.roleName}>Conductora</Text>
          <Text style={styles.roleDescription}>
            Gana dinero conduciendo en tu horario
          </Text>
          <View style={styles.features}>
            <Text style={styles.feature}>✓ Ganancias competitivas</Text>
            <Text style={styles.feature}>✓ Flexibilidad horaria</Text>
            <Text style={styles.feature}>✓ Soporte de conductora</Text>
            <Text style={styles.feature}>✓ Seguros incluidos</Text>
          </View>
          <View style={styles.roleButton}>
            <Text style={styles.roleButtonText}>Seleccionar</Text>
          </View>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>¿Por qué Línea Lila?</Text>
          <Text style={styles.infoText}>
            Línea Lila es la primera plataforma de transporte diseñada
            específicamente para que las mujeres viajen con seguridad y
            tranquilidad.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  roleCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  passengerCard: {
    backgroundColor: "#F8F5FF",
    borderColor: COLORS.secondary,
  },
  driverCard: {
    backgroundColor: "#FFF5F8",
    borderColor: COLORS.primary,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  roleIcon: {
    fontSize: 36,
  },
  roleName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  features: {
    marginBottom: 20,
  },
  feature: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "500",
  },
  roleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  roleButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  infoSection: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
});
