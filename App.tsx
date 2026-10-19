import React, { useEffect } from 'react';
import { StatusBar, Platform, NativeModules, AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import './src/services/firebase-init';
import * as firebaseService from './src/services/firebase.service';

import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuth } from './src/hooks/useAuth';
import type { RootStackParamList } from './src/navigation/AppNavigator';
import { disconnectDriverInBackground } from './src/services/driverAvailability.service';
import socketService from './src/services/socket.service';

const { NavigationBarModule } = NativeModules;
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const RideNotificationOpener = () => {
  const { isLoading, isAuthenticated, isDriverMode } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'android' || isLoading || !isAuthenticated || !isDriverMode) return;
    const tracker = NativeModules.ActiveRideLocationModule;
    if (!tracker) return;
    let active = true;
    const openPendingRide = async () => {
      const rideId = await tracker.consumeLaunchRideId();
      if (!rideId) return;
      const navigateWhenReady = (attempt = 0) => {
        if (!active) return;
        if (navigationRef.isReady()) navigationRef.navigate('ActiveRide', { rideId });
        else if (attempt < 20) setTimeout(() => navigateWhenReady(attempt + 1), 100);
      };
      navigateWhenReady();
    };
    openPendingRide().catch(() => {});
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') openPendingRide().catch(() => {});
    });
    return () => { active = false; subscription.remove(); };
  }, [isLoading, isAuthenticated, isDriverMode]);

  return null;
};

const DriverBackgroundAvailability = () => {
  const { isAuthenticated, isDriverMode } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !isDriverMode) return;
    let mounted = true;
    let pendingOffline = Promise.resolve();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        pendingOffline = disconnectDriverInBackground();
      } else if (state === 'active' && socketService.shouldRestoreAfterRideBackground()) {
        void pendingOffline.then(() => {
          if (mounted && AppState.currentState === 'active') {
            socketService.restoreAfterRideBackground();
          }
        });
      }
    });
    return () => { mounted = false; subscription.remove(); };
  }, [isAuthenticated, isDriverMode]);

  return null;
};

const ThemeBar = () => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.darkMode) {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('#121212');
    } else {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('#FFFFFF');
    }

    if (Platform.OS === 'android' && NavigationBarModule) {
      try {
        NavigationBarModule.setColor(
          settings.darkMode ? '#121212' : '#FFFFFF',
          !settings.darkMode,
        );
      } catch {}
    }
  }, [settings.darkMode]);

  return null;
};

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
      <SettingsProvider>
        <NavigationContainer ref={navigationRef}>
          <ThemeBar />
          <RootNavigator />
          <RideNotificationOpener />
          <DriverBackgroundAvailability />
        </NavigationContainer>
      </SettingsProvider>
    </AuthProvider>
  );
}
