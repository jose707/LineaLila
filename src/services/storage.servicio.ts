import AsincronoAlmacenamiento from '@react-native-async-storage/async-storage';
import autenticacion from '@react-native-firebase/auth';

const Claves = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  FIREBASE_UID: 'firebase_uid',
  PHONE_NUMBER: 'phone_number',
  LAST_LOGIN: 'last_login'
};

/**
 * Store authentication token
 */
const guardarAutenticacionToken = async (token: string): Promise<void> => {
  try {
    await AsincronoAlmacenamiento.setItem(Claves.AUTH_TOKEN, token);
    console.log('✅ Auth token stored');
  } catch (error) {
    console.error('❌ Error storing auth token:', error);
  }
};

/**
 * Retrieve authentication token
 */export { guardarAutenticacionToken };
const obtenerAutenticacionToken = async (): Promise<string | null> => {
  try {
    const token = await AsincronoAlmacenamiento.getItem(Claves.AUTH_TOKEN);
    return token;
  } catch (error) {
    console.error('❌ Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Store user data
 */export { obtenerAutenticacionToken as obtenerTokenAutenticacion };
const guardarUsuarioDatos = async (usuario: any): Promise<void> => {
  try {
    await AsincronoAlmacenamiento.setItem(Claves.USER_DATA, JSON.stringify(usuario));
    console.log('✅ User data stored');
  } catch (error) {
    console.error('❌ Error storing user data:', error);
  }
};

/**
 * Retrieve user data
 */export { guardarUsuarioDatos as guardarDatosUsuario };
const obtenerUsuarioDatos = async (): Promise<any | null> => {
  try {
    const usuarioDatos = await AsincronoAlmacenamiento.getItem(Claves.USER_DATA);
    return usuarioDatos ? JSON.parse(usuarioDatos) : null;
  } catch (error) {
    console.error('❌ Error retrieving user data:', error);
    return null;
  }
};

/**
 * Store Firebase UID
 */export { obtenerUsuarioDatos as obtenerDatosUsuario };
const guardarFirebaseUid = async (uid: string): Promise<void> => {
  try {
    await AsincronoAlmacenamiento.setItem(Claves.FIREBASE_UID, uid);
    console.log('✅ Firebase UID stored');
  } catch (error) {
    console.error('❌ Error storing Firebase UID:', error);
  }
};

/**
 * Retrieve Firebase UID
 */export { guardarFirebaseUid as storeFirebaseUid };
const obtenerFirebaseUid = async (): Promise<string | null> => {
  try {
    const uid = await AsincronoAlmacenamiento.getItem(Claves.FIREBASE_UID);
    return uid;
  } catch (error) {
    console.error('❌ Error retrieving Firebase UID:', error);
    return null;
  }
};

/**
 * Store phone number
 */export { obtenerFirebaseUid as obtenerUidFirebase };
const guardarTelefonoNumero = async (telefono: string): Promise<void> => {
  try {
    await AsincronoAlmacenamiento.setItem(Claves.PHONE_NUMBER, telefono);
    console.log('✅ Phone number stored');
  } catch (error) {
    console.error('❌ Error storing phone number:', error);
  }
};

/**
 * Retrieve phone number
 */export { guardarTelefonoNumero };
const obtenerTelefonoNumero = async (): Promise<string | null> => {
  try {
    const telefono = await AsincronoAlmacenamiento.getItem(Claves.PHONE_NUMBER);
    return telefono;
  } catch (error) {
    console.error('❌ Error retrieving phone number:', error);
    return null;
  }
};

/**
 * Store last login time
 */export { obtenerTelefonoNumero as obtenerNumeroTelefono };
const guardarUltimoIngresar = async (): Promise<void> => {
  try {
    await AsincronoAlmacenamiento.setItem(Claves.LAST_LOGIN, new Date().toISOString());
    console.log('✅ Last login time stored');
  } catch (error) {
    console.error('❌ Error storing last login:', error);
  }
};

/**
 * Retrieve last login time
 */export { guardarUltimoIngresar };
const obtenerUltimoIngresar = async (): Promise<string | null> => {
  try {
    const ultimoIngresar = await AsincronoAlmacenamiento.getItem(Claves.LAST_LOGIN);
    return ultimoIngresar;
  } catch (error) {
    console.error('❌ Error retrieving last login:', error);
    return null;
  }
};

/**
 * Clear all authentication data
 */export { obtenerUltimoIngresar as obtenerUltimoAcceso };
const limpiarAutenticacionDatos = async (): Promise<void> => {
  try {
    await AsincronoAlmacenamiento.multiRemove([
    Claves.AUTH_TOKEN,
    Claves.USER_DATA,
    Claves.FIREBASE_UID,
    Claves.PHONE_NUMBER,
    Claves.LAST_LOGIN]
    );

    // Sign out from Firebase
    try {
      await autenticacion().signOut();
    } catch (error) {
      console.warn('Firebase sign out warning:', error);
    }

    console.log('✅ All auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};

/**
 * Check if user is logged in
 */export { limpiarAutenticacionDatos as limpiarDatosAutenticacion };
const esUsuarioLoggedEn = async (): Promise<boolean> => {
  try {
    const token = await obtenerAutenticacionToken();
    return !!token;
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    return false;
  }
};

/**
 * Get all stored data
 */export { esUsuarioLoggedEn };
const obtenerTodosAlmacenadoDatos = async (): Promise<Record<string, any>> => {
  try {
    const token = await obtenerAutenticacionToken();
    const usuarioDatos = await obtenerUsuarioDatos();
    const firebaseUid = await obtenerFirebaseUid();
    const telefonoNumero = await obtenerTelefonoNumero();
    const ultimoIngresar = await obtenerUltimoIngresar();

    return {
      token,
      userData: usuarioDatos,
      firebaseUid,
      phoneNumber: telefonoNumero,
      lastLogin: ultimoIngresar
    };
  } catch (error) {
    console.error('❌ Error getting all stored data:', error);
    return {};
  }
};export { obtenerTodosAlmacenadoDatos as obtenerTodosLosDatosAlmacenados };
