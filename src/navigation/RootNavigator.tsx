// src/navigation/RootNavigator.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SplashScreen from '../screens/SplashScreen';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

export const RootNavigator = () => {
  const { isLoading, isAuthenticated, role, isDriverMode } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  // Redirigir a AppNavigator con el rol del usuario
  // Si isDriverMode=true y conductor aprobado, mostrar DriverHome
  // Si isDriverMode=false, mostrar Map (pasajero)
  const finalRole = isDriverMode ? 'driver' : role;
  return <AppNavigator role={finalRole as any} />;
};

export default RootNavigator;
