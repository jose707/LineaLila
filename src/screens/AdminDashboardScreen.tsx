import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';

type AdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

interface AdminDashboardScreenProps {
  navigation: AdminDashboardScreenNavigationProp;
}

interface DashboardStats {
  totalUsers: number;
  totalRides: number;
  totalRevenue: number;
  activeDrivers: number;
  pendingApprovals: number;
  dailyRides: number;
  monthlyRevenue: number;
}

const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  navigation,
}) => {
  const { logout, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRides: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    pendingApprovals: 0,
    dailyRides: 0,
    monthlyRevenue: 0,
  });

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Panel de Administración</Text>
          <Text style={styles.headerSubtitle}>Gestión Línea Lila</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Quick Stats Row 1 */}
        <View style={styles.statsRow}>
          <StatCard
            label="Usuarios Totales"
            value={stats.totalUsers}
            color="#7C3AED"
            icon="👥"
          />
          <StatCard
            label="Conductores Activos"
            value={stats.activeDrivers}
            color="#10B981"
            icon="🚗"
          />
        </View>

        {/* Quick Stats Row 2 */}
        <View style={styles.statsRow}>
          <StatCard
            label="Viajes Totales"
            value={stats.totalRides}
            color="#F59E0B"
            icon="🗺️"
          />
          <StatCard
            label="Viajes Diarios"
            value={stats.dailyRides}
            color="#3B82F6"
            icon="📊"
          />
        </View>

        {/* Revenue Section */}
        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Resumen de Ingresos</Text>
          <View style={styles.revenueGrid}>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Ingresos Mensuales</Text>
              <Text style={styles.revenueValue}>
                ${stats.monthlyRevenue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Ingresos Totales</Text>
              <Text style={styles.revenueValue}>
                ${stats.totalRevenue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pending Items */}
        <View style={styles.pendingSection}>
          <View style={styles.pendingHeader}>
            <Text style={styles.sectionTitle}>Acciones Pendientes</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingApprovals}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.pendingCard}
            onPress={() => navigation.navigate('AdminDriverRegistration')}
          >
            <Text style={styles.pendingIcon}>📋</Text>
            <View style={styles.pendingContent}>
              <Text style={styles.pendingTitle}>
                Solicitudes de Conductores
              </Text>
              <Text style={styles.pendingDesc}>
                {stats.pendingApprovals} solicitudes pendientes
              </Text>
            </View>
            <Text style={styles.pendingCount}>{stats.pendingApprovals}</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Gestión</Text>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('AdminDriverRegistration')}
          >
            <Text style={styles.navIcon}>📋</Text>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Solicitudes de Conductores</Text>
              <Text style={styles.navDesc}>
                Revisar y aprobar solicitudes de conductores
              </Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('AdminUsers')}
          >
            <Text style={styles.navIcon}>👥</Text>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Gestión de Usuarios</Text>
              <Text style={styles.navDesc}>
                Ver, editar y administrar todos los usuarios
              </Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('AdminRides')}
          >
            <Text style={styles.navIcon}>🗺️</Text>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Gestión de Viajes</Text>
              <Text style={styles.navDesc}>
                Monitorear todos los viajes y disputas
              </Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('AdminPayments')}
          >
            <Text style={styles.navIcon}>💳</Text>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Pagos e Ingresos</Text>
              <Text style={styles.navDesc}>Ver transacciones y pagos</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('AdminAnalytics')}
          >
            <Text style={styles.navIcon}>📈</Text>
            <View style={styles.navContent}>
              <Text style={styles.navTitle}>Análisis y Reportes</Text>
              <Text style={styles.navDesc}>Ver estadísticas detalladas</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  revenueSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  revenueGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FCA5A5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pendingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  pendingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pendingCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  navigationSection: {
    marginTop: 8,
    marginBottom: 10,
  },
  navButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  navDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  navArrow: {
    fontSize: 20,
    color: '#D1D5DB',
    marginLeft: 8,
  },
});

export default AdminDashboardScreen;
