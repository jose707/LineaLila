import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserRole } from '../types/models';

// Importar pantallas - Autenticación
import MapScreen from '../screens/MapScreen';
import SearchScreen from '../screens/SearchScreen';

// Importar pantallas - Cliente/Conductor (Perfil unificado)

import ProfileScreen from '../screens/ProfileScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import SupportScreen from '../screens/SupportScreen';
import ClientRideDetailsScreen from '../screens/ClientRideDetailsScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';

// Importar pantallas - Viajes (Nuevas)
import DriverRideRequestScreen from '../screens/DriverRideRequestScreen';
import ActiveRideScreen from '../screens/ActiveRideScreen';
import RideCompletedScreen from '../screens/RideCompletedScreen';

// Importar pantallas - Conductor

import DriverRegistrationScreen from '../screens/DriverRegistrationScreen';
import DocumentResubmissionScreen from '../screens/DocumentResubmissionScreen';

// Importar pantallas - Admin
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminRidesScreen from '../screens/AdminRidesScreen';
import AdminPaymentsScreen from '../screens/AdminPaymentsScreen';
import AdminPromoScreen from '../screens/AdminPromoScreen';
import AdminSupportScreen from '../screens/AdminSupportScreen';
import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';
import AdminDriverRegistrationScreen from '../screens/AdminDriverRegistrationScreen';

// 🔥 DEFINIR TIPOS DE PARÁMETROS ACTUALIZADOS
export type Stop = {
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
};

export type RootStackParamList = {
  Home: undefined;
  Map: {
    pickupLocation?: {
      latitude: number;
      longitude: number;
    };
    destinationLocation?: {
      latitude: number;
      longitude: number;
    };
    pickupAddress?: string;
    destinationAddress?: string;
    stops?: Stop[];
    pickingMode?: 'origin' | 'destination';
    editingStopIndex?: number;
    reset?: boolean;
  };
  Search: {
    pickupLocation?: {
      latitude: number;
      longitude: number;
    };
    pickupAddress?: string;
    destinationLocation?: {
      latitude: number;
      longitude: number;
    };
    destinationAddress?: string;
    stops?: Stop[];
    pickingMode?: 'origin' | 'destination';
  };
  // Screens del cliente/conductor
  Profile: undefined;
  ProfileDetail: undefined;
  Settings: undefined;
  Notifications: undefined;
  Help: undefined;
  Support: undefined;
  ClientRideDetails: { rideId: string };
  RideHistory: undefined;
  // Screens de viajes (Nuevas)
  DriverRideRequest: undefined;
  ActiveRide: { rideId: string };
  RideCompleted: { rideId: string };
  // Screens del conductor
  DriverHome: undefined;

  DriverMap: undefined;
  DriverRegistration: { user?: any };
  DocumentResubmission: undefined;
  // Screens del administrador
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminRides: undefined;
  AdminPayments: undefined;
  AdminPromo: undefined;
  AdminSupport: undefined;
  AdminAnalytics: undefined;
  AdminDriverRegistration: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  role?: UserRole | null;
}

// Función para obtener la pantalla inicial según el rol
const getInitialRouteName = (role?: UserRole | null) => {
  switch (role) {
    case 'admin':
      return 'AdminDashboard';
    case 'driver':
      return 'DriverHome';
    case 'user':
      return 'Map';
    default:
      return 'Map';
  }
};

const AppNavigator = ({ role }: AppNavigatorProps) => {
  const initialRoute = getInitialRouteName(role);

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* SCREENS DEL PASAJERO */}

      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* SCREENS DE AUTENTICACIÓN */}

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ClientRideDetails"
        component={ClientRideDetailsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="RideHistory"
        component={RideHistoryScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* SCREENS DE VIAJES (NUEVAS) */}
      <Stack.Screen
        name="DriverRideRequest"
        component={DriverRideRequestScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ActiveRide"
        component={ActiveRideScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="RideCompleted"
        component={RideCompletedScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* AJUSTES */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* SCREENS DEL CONDUCTOR */}
      <Stack.Screen
        name="DriverHome"
        component={DriverRideRequestScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="DriverRegistration"
        component={DriverRegistrationScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="DocumentResubmission"
        component={DocumentResubmissionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* SCREENS DEL ADMINISTRADOR */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminRides"
        component={AdminRidesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminPayments"
        component={AdminPaymentsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminPromo"
        component={AdminPromoScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminSupport"
        component={AdminSupportScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AdminDriverRegistration"
        component={AdminDriverRegistrationScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
