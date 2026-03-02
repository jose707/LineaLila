import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';

type DriverHomeScreenNavigationProp = NativeStackNavigationProp<
  any,
  'DriverHome'
>;

interface DriverStats {
  isAvailable: boolean;
  totalEarnings: number;
  totalTrips: number;
  averageRating: number;
  completedToday: number;
}

const DriverHomeScreen = () => {
  const navigation = useNavigation<DriverHomeScreenNavigationProp>();
  const { logout } = useAuth();
  const [stats, setStats] = useState<DriverStats>({
    isAvailable: false,
    totalEarnings: 0,
    totalTrips: 0,
    averageRating: 4.8,
    completedToday: 0,
  });

  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Cargar estadísticas del conductor
  useEffect(() => {
    loadDriverStats();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      {
        text: 'Cancelar',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Cerrar Sesión',
        onPress: async () => {
          try {
            await logout();
          } catch (error: any) {
            console.error('Logout error:', error);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const loadDriverStats = async () => {
    setIsLoadingStats(true);
    try {
      // 🔥 TODO: Conectar con backend para obtener estadísticas reales
      // Por ahora usamos datos de ejemplo
      setStats({
        isAvailable: false,
        totalEarnings: 1250.5,
        totalTrips: 87,
        averageRating: 4.8,
        completedToday: 5,
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      // 🔥 TODO: Conectar con backend para cambiar disponibilidad
      setStats(prev => ({
        ...prev,
        isAvailable: !prev.isAvailable,
      }));

      Alert.alert(
        'Disponibilidad actualizada',
        stats.isAvailable
          ? 'Pasaste a estado NO disponible'
          : '¡Ahora estás disponible para recibir solicitudes!',
      );
    } catch (error) {
      console.error('Error al cambiar disponibilidad:', error);
      Alert.alert('Error', 'No se pudo actualizar la disponibilidad');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle} />
            <Text style={styles.logoText}>línea lila</Text>
          </View>
          <Text style={styles.headerSubtitle}>Conductor</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButtonSmall}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ESTADO DE DISPONIBILIDAD */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityHeader}>
            <Text style={styles.availabilityTitle}>Tu estado</Text>
            <View
              style={[
                styles.statusBadge,
                stats.isAvailable
                  ? styles.statusAvailable
                  : styles.statusUnavailable,
              ]}
            >
              <Text style={styles.statusText}>
                {stats.isAvailable ? '🟢 Disponible' : '⚫ No disponible'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              stats.isAvailable
                ? styles.toggleButtonActive
                : styles.toggleButtonInactive,
            ]}
            onPress={() => {
              toggleAvailability();
              // Si se va a servicio, navegar a DriverRideRequestScreen
              if (!stats.isAvailable) {
                setTimeout(() => {
                  navigation.navigate('DriverRideRequest' as never);
                }, 500);
              }
            }}
          >
            <Text style={styles.toggleButtonText}>
              {stats.isAvailable ? 'Salir de servicio' : 'Ir a servicio'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ESTADÍSTICAS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${stats.totalEarnings.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Ganancias totales</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Viajes completados</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>⭐ {stats.averageRating}</Text>
            <Text style={styles.statLabel}>Calificación promedio</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Viajes hoy</Text>
          </View>
        </View>

        {/* SOLICITUDES ACTIVAS */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Solicitudes Activas</Text>
          <View style={styles.noRequestsContainer}>
            <Text style={styles.noRequestsText}>📭</Text>
            <Text style={styles.noRequestsMessage}>
              No hay solicitudes en este momento
            </Text>
            <Text style={styles.noRequestsSubtext}>
              Estarás listo cuando aceptes ir a servicio
            </Text>
          </View>
        </View>

        {/* ACCIONES RÁPIDAS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DriverMap' as never)}
          >
            <Text style={styles.actionButtonText}>🗺️</Text>
            <Text style={styles.actionButtonLabel}>Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DriverRides' as never)}
          >
            <Text style={styles.actionButtonText}>📋</Text>
            <Text style={styles.actionButtonLabel}>Mis viajes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Text style={styles.actionButtonText}>👤</Text>
            <Text style={styles.actionButtonLabel}>Mi perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>⚙️</Text>
            <Text style={styles.actionButtonLabel}>Configuración</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 24,
  },
  logoutButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  availabilityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusAvailable: {
    backgroundColor: '#D1FAE5',
  },
  statusUnavailable: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  toggleButton: {
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FEE2E2',
  },
  toggleButtonInactive: {
    backgroundColor: '#D1FAE5',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  requestsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  noRequestsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRequestsText: {
    fontSize: 48,
    marginBottom: 12,
  },
  noRequestsMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  noRequestsSubtext: {
    fontSize: 12,
    color: '#999',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
  },
});

export default DriverHomeScreen;
