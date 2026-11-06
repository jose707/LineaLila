import autenticacion from '@react-native-firebase/auth';
import { FirebaseAuthTypes as FirebaseAutenticacionTipos } from '@react-native-firebase/auth';
import { GoogleSignin as GoogleIngresar } from '@react-native-google-signin/google-signin';
import messaging from '@react-native-firebase/messaging';
import { Platform as Plataforma, PermissionsAndroid as PermisosAndroid } from 'react-native';

const GOOGLE_WEB_CLIENTE_ID = '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com';

/**
 * Send OTP to phone number
 */
const enviarTelefonoOtp = async (telefonoNumero: string, forzarReenvio = false): Promise<string> => {
  try {
    console.log(`ðŸ“± Sending OTP to: ${telefonoNumero}`);

    let esperaId: ReturnType<typeof setTimeout> | undefined;
    const espera = new Promise<never>((_, rechazar) => {
      esperaId = setTimeout(
        () => rechazar(new Error('La solicitud del código tardó demasiado. Intenta de nuevo.')),
        30000
      );
    });
    const confirmacion = await Promise.race([
    autenticacion().signInWithPhoneNumber(telefonoNumero, Plataforma.OS === 'android' && forzarReenvio),
    espera]
    ).finally(() => {
      if (esperaId) clearTimeout(esperaId);
    });
    console.log('âœ… OTP sent successfully');

    if (!confirmacion.verificationId) {
      throw new Error('No verification ID received');
    }

    return confirmacion.verificationId;
  } catch (error: any) {
    console.error('[Firebase] Error sending OTP:', error);
    throw new Error(`Error sending OTP: ${error.message}`);
  }
};

/**
 * Verify OTP code
 */export { enviarTelefonoOtp as enviarTelefonoOTP };
const verificarTelefonoOtp = async (
verificacionId: string,
codigo: string)
: Promise<FirebaseAutenticacionTipos.UserCredential> => {
  try {
    console.log(`ðŸ” Verifying OTP code`);
    console.log(`   Verification ID: ${verificacionId?.substring(0, 20)}...`);
    console.log(`   Code: ${codigo}`);
    console.log(`   Code length: ${codigo.length}`);

    const credencial = autenticacion.PhoneAuthProvider.credential(verificacionId, codigo);
    const usuarioCredencial = await autenticacion().signInWithCredential(credencial);

    console.log('âœ… OTP verified successfully');
    return usuarioCredencial;
  } catch (error: any) {
    console.error('[Firebase] Error verifying OTP:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Full error:', JSON.stringify(error));

    // Mensajes de error mÃ¡s claros
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error(
        'El cÃ³digo de verificaciÃ³n es incorrecto. Verifica que sea el nÃºmero de 6 dÃ­gitos correcto.'
      );
    } else if (error.code === 'auth/session-expired') {
      throw new Error('El cÃ³digo expirÃ³. Solicita uno nuevo.');
    } else if (error.code === 'auth/invalid-verification-id') {
      throw new Error(
        'ID de verificaciÃ³n invÃ¡lido. Intenta enviar el cÃ³digo nuevamente.'
      );
    } else if (error.code === 'auth/missing-verification-code') {
      throw new Error(
        'El cÃ³digo no se proporcionÃ³. Verifica e intenta de nuevo.'
      );
    }

    throw new Error(`Error verificando OTP: ${error.message}`);
  }
};

/**
 * Login with email and password
 */export { verificarTelefonoOtp as verificarTelefonoOTP };
const ingresarConCorreoContrasena = async (
correo: string,
contrasena: string)
: Promise<FirebaseAutenticacionTipos.UserCredential> => {
  try {
    console.log(`ðŸ“§ Logging in with email: ${correo}`);

    const usuarioCredencial = await autenticacion().signInWithEmailAndPassword(
      correo,
      contrasena
    );
    console.log('âœ… Login successful');

    return usuarioCredencial;
  } catch (error: any) {
    console.error('[Firebase] Error logging in:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
};

/**
 * Create user with email and password
 */export { ingresarConCorreoContrasena };
const crearUsuarioConCorreoContrasena = async (
correo: string,
contrasena: string)
: Promise<FirebaseAutenticacionTipos.UserCredential> => {
  try {
    console.log(`ðŸ“§ Creating user with email: ${correo}`);

    const usuarioCredencial = await autenticacion().createUserWithEmailAndPassword(
      correo,
      contrasena
    );
    console.log('âœ… User created successfully');

    return usuarioCredencial;
  } catch (error: any) {
    console.error('[Firebase] Error creating user:', error);
    throw new Error(`User creation failed: ${error.message}`);
  }
};

/**
 * Update user phone number
 */export { crearUsuarioConCorreoContrasena };
const actualizarUsuarioTelefonoNumero = async (
verificacionId: string,
codigo: string)
: Promise<void> => {
  try {
    const credencial = autenticacion.PhoneAuthProvider.credential(verificacionId, codigo);
    const usuario = autenticacion().currentUser;

    if (!usuario) {
      throw new Error('No user logged in');
    }

    await usuario.linkWithCredential(credencial);
    console.log('âœ… Phone number linked successfully');
  } catch (error: any) {
    console.error('[Firebase] Error linking phone number:', error);
    throw new Error(`Error linking phone: ${error.message}`);
  }
};

/**
 * Complete multi-factor authentication
 */export { actualizarUsuarioTelefonoNumero };
const completarTelefonoAutenticacion = async (
correo: string,
contrasena: string,
telefonoNumero: string,
verificacionId: string,
codigo: string)
: Promise<FirebaseAutenticacionTipos.UserCredential> => {
  try {
    // Step 1: Sign in with email and password
    const usuarioCredencial = await ingresarConCorreoContrasena(correo, contrasena);

    // Step 2: Link phone number to the account
    const credencial = autenticacion.PhoneAuthProvider.credential(verificacionId, codigo);
    await usuarioCredencial.user.linkWithCredential(credencial);

    console.log('âœ… Phone authentication completed');
    return usuarioCredencial;
  } catch (error: any) {
    console.error('[Firebase] Error in phone authentication:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Get current user
 */export { completarTelefonoAutenticacion };
const obtenerRealUsuario = (): FirebaseAutenticacionTipos.User | null => {
  return autenticacion().currentUser;
};

/**
 * Sign out
 */export { obtenerRealUsuario as obtenerUsuarioActual };
const signoFuera = async (): Promise<void> => {
  try {
    await autenticacion().signOut();
    console.log('âœ… Signed out successfully');
  } catch (error: any) {
    console.error('[Firebase] Error signing out:', error);
    throw error;
  }
};

/**
 * Get auth token
 */export { signoFuera as signOut };
const obtenerAutenticacionToken = async (): Promise<string | null> => {
  try {
    const usuario = autenticacion().currentUser;
    if (!usuario) {
      return null;
    }
    const token = await usuario.getIdToken();
    return token;
  } catch (error: any) {
    console.error('[Firebase] Error getting token:', error);
    return null;
  }
};

/**
 * Initialize Google Sign-In
 */export { obtenerAutenticacionToken as obtenerTokenAutenticacion };
const configurarAccesoGoogle = async (): Promise<void> => {
  try {
    await GoogleIngresar.configure({
      webClientId:
      '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      profileImageSize: 120
    });
    console.log('âœ… Google Sign-In configured');
  } catch (error: any) {
    console.error('[Firebase] Error configuring Google Sign-In:', error);
  }
};

/**
 * Sign in with Google
 */export { configurarAccesoGoogle };
const iniciarSesionConGoogle =
async (): Promise<FirebaseAutenticacionTipos.UserCredential> => {
  try {
    // Ensure Google Sign-In is configured
    try {
      await GoogleIngresar.configure({
        webClientId: GOOGLE_WEB_CLIENTE_ID,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
        profileImageSize: 120
      });
    } catch {
      // Configuration might already exist, continue
      console.log('â„¹ï¸ Google Sign-In already configured');
    }

    // Check if Google Play Services are available
    const tieneReproducirServicios = await GoogleIngresar.hasPlayServices({
      showPlayServicesUpdateDialog: true
    });
    console.log(`ðŸ“± Google Play Services available: ${tieneReproducirServicios}`);

    // Ensure activity is ready - wait a bit before attempting sign in
    console.log('â³ Esperar a que el activity estÃ© listo...');
    await new Promise((resolver) => setTimeout(() => resolver(null), 800));

    // Try to get current user first to validate activity
    try {
      const realUsuario = await GoogleIngresar.getCurrentUser();
      if (realUsuario) {
        console.log('â„¹ï¸ Already signed in, signing out first');
        await GoogleIngresar.signOut();
      }
    } catch {
      // User not signed in, continue
      console.log('â„¹ï¸ No previous user session');
    }

    // Sign in with Google with retry logic built-in
    let signoEnResultado: any;
    let reintentos = 0;
    const maximoReintentos = 2;

    while (reintentos < maximoReintentos) {
      try {
        console.log(`ðŸ” Google Sign-In attempt ${reintentos + 1}/${maximoReintentos}`);
        signoEnResultado = await GoogleIngresar.signIn();
        console.log('âœ… Google Sign-In user retrieved');
        break;
      } catch (signoEnError: any) {
        const errorMensaje = signoEnError?.message || String(signoEnError);
        console.error(`[Firebase] Sign-in attempt ${reintentos + 1} failed:`, errorMensaje);

        if (
        errorMensaje.includes('current activity is null') ||
        errorMensaje.includes('Activity is null'))
        {
          reintentos++;
          if (reintentos < maximoReintentos) {
            console.log(
              `â³ Activity no disponible, reintentando en 1 segundo... (${reintentos}/${maximoReintentos})`
            );
            await new Promise((resolver) =>
            setTimeout(() => resolver(null), 1000)
            );
            continue;
          }
        }
        throw signoEnError;
      }
    }

    // Handle different response types
    const usuarioCorreo =
    signoEnResultado?.data?.user?.email ||
    signoEnResultado?.user?.email ||
    signoEnResultado?.email;

    const usuarioNombre =
    signoEnResultado?.data?.user?.name ||
    signoEnResultado?.user?.name ||
    signoEnResultado?.name ||
    signoEnResultado?.displayName ||
    'Usuario';

    const usuarioFoto =
    signoEnResultado?.data?.user?.photo ||
    signoEnResultado?.user?.photo ||
    signoEnResultado?.photo ||
    null;

    console.log(`ðŸ“§ Extracted Email: "${usuarioCorreo}"`);
    console.log(`ðŸ‘¤ Extracted Name: "${usuarioNombre}"`);
    console.log(`ðŸ–¼ï¸  Extracted Photo: "${usuarioFoto ? 'YES' : 'NO'}"`);

    if (!usuarioCorreo) {
      console.error(
        '[Firebase] No email found in Google response:',
        JSON.stringify(signoEnResultado)
      );
      throw new Error('No se pudo obtener el correo de Google');
    }

    console.log(`âœ… Google Sign-In: ${usuarioNombre} (${usuarioCorreo})`);

    // Get the ID token from Google
    const tokens: any = await GoogleIngresar.getTokens();
    console.log('âœ… Google tokens retrieved');

    const idToken = tokens?.idToken;

    if (!idToken) {
      console.error(
        '[Firebase] No ID token found in Google response:',
        JSON.stringify(tokens)
      );
      throw new Error('No se pudo obtener el ID token de Google');
    }

    console.log('ðŸ” Creating Firebase credential...');

    // Create Firebase credential with the Google ID token
    const googleCredencial = autenticacion.GoogleAuthProvider.credential(idToken);

    // Sign in with Firebase using the credential
    const usuarioCredencial = await autenticacion().signInWithCredential(
      googleCredencial
    );

    // Ensure the email from Google is preserved
    // Firebase may create a temporary email, so we use the one from Google
    if (!usuarioCredencial.user.email && usuarioCorreo) {
      // If Firebase didn't set an email, store the Google email
      try {
        await usuarioCredencial.user.updateProfile({
          displayName: usuarioNombre
        });
      } catch (error) {
        console.warn('Could not update profile:', error);
      }
    }

    console.log('âœ… Google Sign-In successful');
    console.log(`ðŸ“§ Firebase UID: ${usuarioCredencial.user.uid}`);
    console.log(`ðŸ“§ User Email: ${usuarioCorreo}`);
    console.log(`ðŸ“§ User Name: ${usuarioNombre}`);

    // Store the original Google email and name since Firebase might have created a temporary one
    return {
      ...usuarioCredencial,
      user: {
        ...usuarioCredencial.user,
        uid: usuarioCredencial.user.uid, // Ensure uid is preserved
        email: usuarioCorreo || usuarioCredencial.user.email,
        displayName: usuarioNombre,
        photoURL: usuarioFoto || usuarioCredencial.user.photoURL
      } as any
    };
  } catch (error: any) {
    console.error('[Firebase] Error in Google Sign-In:', error.message);
    throw error;
  }
};

// --- FCM Push Notifications ----------------------------------------------
export { iniciarSesionConGoogle };
const asegurarMessagingListo = async (): Promise<void> => {
  try {
    await messaging().setAutoInitEnabled(true);
    await messaging().registerDeviceForRemoteMessages();
  } catch (error: any) {
    // Android often works without explicit registerDeviceForRemoteMessages.
    console.log('[FCM] registerDeviceForRemoteMessages skipped:', error?.message);
  }
};

const solicitudNotificacionPermiso = async (): Promise<boolean> => {
  try {
    await asegurarMessagingListo();

    if (Plataforma.OS === 'android' && Number(Plataforma.Version) >= 33) {
      const concedido = await PermisosAndroid.request(
        PermisosAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (concedido !== PermisosAndroid.RESULTS.GRANTED) {
        console.log('[FCM] Native POST_NOTIFICATIONS permission denied');
        return false;
      }
    }

    const autenticacionEstado = await messaging().requestPermission();
    const habilitado =
    autenticacionEstado === messaging.AuthorizationStatus.AUTHORIZED ||
    autenticacionEstado === messaging.AuthorizationStatus.PROVISIONAL;

    console.log(
      habilitado ? '[FCM] Notification permission granted' : '[FCM] Notification permission denied'
    );
    return habilitado;
  } catch (error: any) {
    console.error('[FCM] Error requesting permission:', error.message);
    return false;
  }
};export { solicitudNotificacionPermiso };

const obtenerFcmToken = async (): Promise<string | null> => {
  try {
    await asegurarMessagingListo();
    const token = await messaging().getToken();
    console.log('[FCM] Token:', token.substring(0, 20) + '...');
    return token;
  } catch (error: any) {
    console.error('[FCM] Error getting token:', error.message);
    return null;
  }
};export { obtenerFcmToken };

const registrarFcmTokenConServidor = async (
apiBaseUrl: string,
jwtToken: string)
: Promise<void> => {
  try {
    const concedido = await solicitudNotificacionPermiso();
    if (!concedido) return;

    const fcmToken = await obtenerFcmToken();
    if (!fcmToken) return;

    const respuesta = await fetch(apiBaseUrl + '/api/notificaciones/registrar-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + jwtToken
      },
      body: JSON.stringify({ token: fcmToken })
    });

    if (respuesta.ok) console.log('[FCM] Token registered in backend');
  } catch (error: any) {
    console.error('[FCM] Error registering token in backend:', error.message);
  }
};export { registrarFcmTokenConServidor };

const alPrimerPlanoNotificacion = (
funcionRetorno: (
title: string,
body: string,
data: Record<string, string>)
=> void) =>

messaging().onMessage(async (mensaje) => {
  funcionRetorno(
    mensaje.notification?.title ?? '',
    mensaje.notification?.body ?? '',
    (mensaje.data ?? {}) as Record<string, string>
  );
});export { alPrimerPlanoNotificacion };

const alFcmTokenRenovar = (funcionRetorno: (token: string) => void) =>
messaging().onTokenRefresh((token: string) => {
  funcionRetorno(token);
});export { alFcmTokenRenovar };
