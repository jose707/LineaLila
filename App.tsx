import React, { useEffect } from 'react';
// 1. Cambio de expo-status-bar a react-native
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

// 2. Inicializar Firebase ANTES de importar AuthProvider
import './src/services/firebase-init';
import * as firebaseService from './src/services/firebase.service';

// 3. Asegúrate de que estas carpetas y archivos existan realmente
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    // Initialize Google Sign-In when app starts
    const initGoogle = async () => {
      try {
        console.log('🔧 Initializing Google Sign-In...');
        await firebaseService.initializeGoogleSignIn();
        console.log('✅ Google Sign-In initialized');
      } catch (error) {
        console.error('⚠️ Error initializing Google Sign-In:', error);
        // Retry after a delay
        setTimeout(initGoogle, 3000);
      }
    };

    initGoogle();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        {/* En React Native puro, barStyle puede ser 'dark-content' o 'light-content' */}
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
