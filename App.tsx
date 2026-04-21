import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import './src/services/firebase-init';
import * as firebaseService from './src/services/firebase.service';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  useEffect(() => {

    const initGoogle = async () => {
      try {
        console.log('Initializing Google Sign-In...');
        await firebaseService.initializeGoogleSignIn();
        console.log('Google Sign-In initialized');
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
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
