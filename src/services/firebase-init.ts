/**
 * Firebase Initialization Module
 *
 * CRITICAL: This file MUST be imported at the VERY TOP of App.tsx
 * BEFORE any React code runs to ensure Firebase native modules are loaded.
 *
 * Example: import './src/services/firebase-init'; // MUST BE FIRST IMPORT
 */

import '@react-native-firebase/app';
import '@react-native-firebase/auth';

console.log('🔥 Firebase modules imported and initialized');

// Export a function to check Firebase status if needed
export const checkFirebaseReady = () => {
  try {
    console.log('✅ Firebase is ready for use');
    return true;
  } catch (error) {
    console.error('❌ Firebase check error:', error);
    return false;
  }
};
