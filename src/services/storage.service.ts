import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  FIREBASE_UID: 'firebase_uid',
  PHONE_NUMBER: 'phone_number',
  LAST_LOGIN: 'last_login',
};

/**
 * Store authentication token
 */
export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    console.log('✅ Auth token stored');
  } catch (error) {
    console.error('❌ Error storing auth token:', error);
  }
};

/**
 * Retrieve authentication token
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return token;
  } catch (error) {
    console.error('❌ Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Store user data
 */
export const storeUserData = async (user: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
    console.log('✅ User data stored');
  } catch (error) {
    console.error('❌ Error storing user data:', error);
  }
};

/**
 * Retrieve user data
 */
export const getUserData = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem(KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('❌ Error retrieving user data:', error);
    return null;
  }
};

/**
 * Store Firebase UID
 */
export const storeFirebaseUid = async (uid: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.FIREBASE_UID, uid);
    console.log('✅ Firebase UID stored');
  } catch (error) {
    console.error('❌ Error storing Firebase UID:', error);
  }
};

/**
 * Retrieve Firebase UID
 */
export const getFirebaseUid = async (): Promise<string | null> => {
  try {
    const uid = await AsyncStorage.getItem(KEYS.FIREBASE_UID);
    return uid;
  } catch (error) {
    console.error('❌ Error retrieving Firebase UID:', error);
    return null;
  }
};

/**
 * Store phone number
 */
export const storePhoneNumber = async (phone: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.PHONE_NUMBER, phone);
    console.log('✅ Phone number stored');
  } catch (error) {
    console.error('❌ Error storing phone number:', error);
  }
};

/**
 * Retrieve phone number
 */
export const getPhoneNumber = async (): Promise<string | null> => {
  try {
    const phone = await AsyncStorage.getItem(KEYS.PHONE_NUMBER);
    return phone;
  } catch (error) {
    console.error('❌ Error retrieving phone number:', error);
    return null;
  }
};

/**
 * Store last login time
 */
export const storeLastLogin = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_LOGIN, new Date().toISOString());
    console.log('✅ Last login time stored');
  } catch (error) {
    console.error('❌ Error storing last login:', error);
  }
};

/**
 * Retrieve last login time
 */
export const getLastLogin = async (): Promise<string | null> => {
  try {
    const lastLogin = await AsyncStorage.getItem(KEYS.LAST_LOGIN);
    return lastLogin;
  } catch (error) {
    console.error('❌ Error retrieving last login:', error);
    return null;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.AUTH_TOKEN,
      KEYS.USER_DATA,
      KEYS.FIREBASE_UID,
      KEYS.PHONE_NUMBER,
      KEYS.LAST_LOGIN,
    ]);

    // Sign out from Firebase
    try {
      await auth().signOut();
    } catch (e) {
      console.warn('Firebase sign out warning:', e);
    }

    console.log('✅ All auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};

/**
 * Check if user is logged in
 */
export const isUserLoggedIn = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    return false;
  }
};

/**
 * Get all stored data
 */
export const getAllStoredData = async (): Promise<Record<string, any>> => {
  try {
    const token = await getAuthToken();
    const userData = await getUserData();
    const firebaseUid = await getFirebaseUid();
    const phoneNumber = await getPhoneNumber();
    const lastLogin = await getLastLogin();

    return {
      token,
      userData,
      firebaseUid,
      phoneNumber,
      lastLogin,
    };
  } catch (error) {
    console.error('❌ Error getting all stored data:', error);
    return {};
  }
};
