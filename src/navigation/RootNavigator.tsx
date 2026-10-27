// src/navigation/RootNavigator.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import Toast from '../components/Toast';
import SplashScreen from '../screens/SplashScreen';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { IDENTITY_VERIFICATION_ENABLED } from '../config/constants';

export const RootNavigator = () => {
  const {
    isLoading, isAuthenticated, role, isDriverMode, user,
    phoneVerifiedToastVisible, hidePhoneVerifiedToast,
    registrationSuccessToastVisible, hideRegistrationSuccessToast,
  } = useAuth();

  const finalRole = isDriverMode ? 'driver' : role;
  const identityRequired = IDENTITY_VERIFICATION_ENABLED && role !== 'admin' && role !== 'driver' && user?.identityVerificationStatus !== 'verified';
  const screen = isLoading
    ? <SplashScreen />
    : !isAuthenticated
      ? <AuthNavigator />
      : <AppNavigator key={`${finalRole}:${identityRequired}`} role={finalRole as any} identityRequired={identityRequired} />;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {screen}
        <Toast
          visible={phoneVerifiedToastVisible}
          message="Se verificó tu número de celular"
          backgroundColor="#16A34A"
          duration={4000}
          onHide={hidePhoneVerifiedToast}
        />
        <Toast
          visible={registrationSuccessToastVisible}
          message={'Registro exitoso\nBienvenido a Línea Lila'}
          backgroundColor="#16A34A"
          duration={4500}
          textAlign="right"
          onHide={hideRegistrationSuccessToast}
        />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({ container: { flex: 1 } });

export default RootNavigator;
