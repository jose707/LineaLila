// src/navigation/RootNavigator.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SplashScreen from '../screens/SplashScreen';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { IDENTITY_VERIFICATION_ENABLED } from '../config/constants';

export const RootNavigator = () => {
  const { isLoading, isAuthenticated, role, isDriverMode, user } = useAuth();

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
  const identityRequired = IDENTITY_VERIFICATION_ENABLED && role !== 'admin' && role !== 'driver' && user?.identityVerificationStatus !== 'verified';
  return <AppNavigator key={`${finalRole}:${identityRequired}`} role={finalRole as any} identityRequired={identityRequired} />;
};

export default RootNavigator;
