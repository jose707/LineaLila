import { CrearViajeSolicitud } from '../types/api';
import { RapidaAsignacionRespuesta as RapidoAsignacionRespuesta } from "../types/rapidaAsignacion";
import React from 'react';
import { createNativeStackNavigator as crearNativoPilaNavegador } from '@react-navigation/native-stack';
import { UsuarioRol } from "../types/modelos";

// Importar pantallas - Autenticación
import MapaPantalla from "../screens/PantallaMapa";
import BuscarPantalla from "../screens/BuscarPantalla";

// Importar pantallas - Cliente/Conductor (Perfil unificado)

import PerfilPantalla from "../screens/PerfilPantalla";
import PerfilDetallePantalla from "../screens/PerfilDetailPantalla";
import AjustesPantalla from "../screens/AjustesPantalla";
import ContactosEmergenciaPantalla from '../screens/ContactosEmergenciaPantalla';
import NotificacionesPantalla from "../screens/NotificationsPantalla";
import SoportePantalla from "../screens/SoportePantalla";
import ClienteViajeDetallesPantalla from "../screens/ClienteViajeDetailsPantalla";
import ViajeHistorialPantalla from "../screens/ViajeHistorialPantalla";

// Importar pantallas - Viajes (Nuevas)
import ConductorViajeSolicitudPantalla from "../screens/ConductorViajeSolicitudPantalla";

import ActivoViajePantalla from "../screens/PantallaViajeActivo";
import RapidoAsignacionPantalla from "../screens/RapidaAsignacionPantalla";
import ViajeCompletadoPantalla from "../screens/ViajeCompletadoPantalla";
import NegotiationPantalla from "../screens/NegociacionPantalla";

// Importar pantallas - Conductor

import ConductorRegistroPantalla from "../screens/ConductorRegistrationPantalla";
import DocumentoResubmissionPantalla from "../screens/DocumentoResubmissionPantalla";
import IdentidadVerificacionPantalla from "../screens/IdentidadVerificacionPantalla";

// Importar pantallas - Admin
import AdministradorPanelPantalla from "../screens/AdminDashboardPantalla";
import AdminEmergenciasPantalla from "../screens/AdminEmergenciasPantalla";
import AdministradorUsuariosPantalla from "../screens/AdminUsersPantalla";
import AdminConductoresPantalla from '../screens/AdminConductoresPantalla';
import ConductorComisionesPantalla from '../screens/ConductorComisionesPantalla';
import AdministradorViajesPantalla from "../screens/AdminRidesPantalla";
import AdministradorPagosPantalla from "../screens/AdminPaymentsPantalla";
import AdministradorSoportePantalla from "../screens/AdminSoportePantalla";
import AdministradorAnaliticaPantalla from "../screens/AdminAnaliticaPantalla";
import AdministradorConductorRegistroPantalla from "../screens/AdminConductorRegistrationPantalla";

// 🔥 DEFINIR TIPOS DE PARÁMETROS ACTUALIZADOS
export type Detener = {
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
};

type MapaCamaraRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type RaizPilaParametroLista = {
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
    mapRegion?: MapaCamaraRegion;
    stops?: Detener[];
    pickingMode?: 'origin' | 'destination';
    editingStopIndex?: number;
    reset?: boolean;
    quickAssignmentExpired?: boolean;
    quickAssignmentCancelled?: boolean;
    quickAssignmentNotice?: string;
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
    mapRegion?: MapaCamaraRegion;
    stops?: Detener[];
    pickingMode?: 'origin' | 'destination';
  };
  // Screens del cliente/conductor
  Profile: undefined;
  ProfileDetail: undefined;
  Settings: undefined;
  ContactosEmergencia: undefined;
  Notifications: undefined;
  Support: undefined;
  ClientRideDetails: {rideId: string;};
  RideHistory: undefined;
  // Screens de viajes (Nuevas)
  DriverRideRequest: undefined;

  ActiveRide: {rideId: string;confirmationMessage?: string;};
  QuickAssignment: {rideId: string;request?: CrearViajeSolicitud;initialSnapshot?: RapidoAsignacionRespuesta;};
  RideCompleted: {rideId: string;};
  Negotiation: {
    rideId: string;
    expiresAt?: string;
    pickupLocation: {latitude: number;longitude: number;};
    pickupAddress: string;
    destinationLocation: {latitude: number;longitude: number;};
    destinationAddress: string;
    waypoints?: {latitude: number;longitude: number;address: string;}[];
    fare: number;
    originalFare: number | null;
    distance: number;
    duration: number;
    selectedVehicleType: string;
    selectedPaymentMethod: string;
  };
  // Screens del conductor
  DriverHome: undefined;

  DriverMap: undefined;
  DriverRegistration: {user?: any;};
  DocumentResubmission: undefined;
  DriverCommissions: undefined;
  IdentityVerification: undefined;
  // Screens del administrador
  AdminDashboard: undefined;
  AdminEmergencias: undefined;
  AdminUsers: undefined;
  AdminDrivers: undefined;
  AdminRides: undefined;
  AdminPayments: { conductor?: { id: string; nombre: string }; periodo?: string; liquidacionId?: string } | undefined;
  AdminSupport: undefined;
  AdminAnalytics: undefined;
  AdminDriverRegistration: { usuarioId: string } | undefined;
};

const Pila = crearNativoPilaNavegador<RaizPilaParametroLista>();

interface AplicacionNavegadorPropiedades {
  role?: UsuarioRol | null;
  identityRequired?: boolean;
}

// Función para obtener la pantalla inicial según el rol
const obtenerInicialRutaNombre = (rol?: UsuarioRol | null) => {
  switch (rol) {
    case 'administrador':
      return 'AdminDashboard';
    case 'conductor':
      return 'DriverHome';
    case 'user':
      return 'Map';
    default:
      return 'Map';
  }
};

const AplicacionNavegador = ({ role: rol, identityRequired: identidadRequerido = false }: AplicacionNavegadorPropiedades) => {
  if (identidadRequerido) {
    return <Pila.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}><Pila.Screen name="IdentityVerification" component={IdentidadVerificacionPantalla} /></Pila.Navigator>;
  }
  const inicialRuta = obtenerInicialRutaNombre(rol);

  return (
    <Pila.Navigator
      initialRouteName={inicialRuta}
      screenOptions={{
        headerShown: false
      }}>

      {/* SCREENS DEL PASAJERO */}

      <Pila.Screen
        name="Map"
        component={MapaPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="Search"
        component={BuscarPantalla}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} />


      {/* SCREENS DE AUTENTICACIÓN */}

      <Pila.Screen
        name="Profile"
        component={PerfilPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="ProfileDetail"
        component={PerfilDetallePantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="ClientRideDetails"
        component={ClienteViajeDetallesPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="RideHistory"
        component={ViajeHistorialPantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      {/* SCREENS DE VIAJES (NUEVAS) */}
      <Pila.Screen
        name="DriverRideRequest"
        component={ConductorViajeSolicitudPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen name="QuickAssignment" component={RapidoAsignacionPantalla} options={{ title: 'Asignación rápida' }} />
      <Pila.Screen
        name="ActiveRide"
        component={ActivoViajePantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="Negotiation"
        component={NegotiationPantalla}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} />

      <Pila.Screen
        name="RideCompleted"
        component={ViajeCompletadoPantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      {/* AJUSTES */}
      <Pila.Screen
        name="Settings"
        component={AjustesPantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      <Pila.Screen
        name="Notifications"
        component={NotificacionesPantalla}
        options={{
          animation: 'slide_from_right'
        }} />
      <Pila.Screen name="ContactosEmergencia" component={ContactosEmergenciaPantalla}
        options={{ title: 'Contactos de emergencia', headerShown: true }} />


      <Pila.Screen
        name="Support"
        component={SoportePantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      {/* SCREENS DEL CONDUCTOR */}

      <Pila.Screen
        name="DriverHome"
        component={ConductorViajeSolicitudPantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      <Pila.Screen
        name="DriverRegistration"
        component={ConductorRegistroPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="DriverCommissions"
        component={ConductorComisionesPantalla}
        options={{ animation: 'slide_from_right' }} />

      <Pila.Screen
        name="DocumentResubmission"
        component={DocumentoResubmissionPantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      {/* SCREENS DEL ADMINISTRADOR */}
      <Pila.Screen
        name="AdminDashboard"
        component={AdministradorPanelPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="AdminEmergencias"
        component={AdminEmergenciasPantalla}
        options={{ animation: 'slide_from_right' }} />

      <Pila.Screen
        name="AdminUsers"
        component={AdministradorUsuariosPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="AdminDrivers"
        component={AdminConductoresPantalla}
        options={{ animation: 'slide_from_right' }} />

      <Pila.Screen
        name="AdminRides"
        component={AdministradorViajesPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="AdminPayments"
        component={AdministradorPagosPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="AdminSupport"
        component={AdministradorSoportePantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="AdminAnalytics"
        component={AdministradorAnaliticaPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="AdminDriverRegistration"
        component={AdministradorConductorRegistroPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

    </Pila.Navigator>);

};

export default AplicacionNavegador;
