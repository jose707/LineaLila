import auth from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

const GOOGLE_WEB_CLIENT_ID = '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com';

/**
 * Send OTP to phone number
 */
export const sendPhoneOTP = async (phoneNumber: string): Promise<string> => {
  try {
    console.log(`ðŸ“± Sending OTP to: ${phoneNumber}`);

    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    console.log('âœ… OTP sent successfully');

    if (!confirmation.verificationId) {
      throw new Error('No verification ID received');
    }

    return confirmation.verificationId;
  } catch (error: any) {
    console.error('âŒ Error sending OTP:', error);
    throw new Error(`Error sending OTP: ${error.message}`);
  }
};

/**
 * Verify OTP code
 */
export const verifyPhoneOTP = async (
  verificationId: string,
  code: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  try {
    console.log(`ðŸ” Verifying OTP code`);
    console.log(`   Verification ID: ${verificationId?.substring(0, 20)}...`);
    console.log(`   Code: ${code}`);
    console.log(`   Code length: ${code.length}`);

    const credential = auth.PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await auth().signInWithCredential(credential);

    console.log('âœ… OTP verified successfully');
    return userCredential;
  } catch (error: any) {
    console.error('âŒ Error verifying OTP:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Full error:', JSON.stringify(error));

    // Mensajes de error mÃ¡s claros
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error(
        'El cÃ³digo de verificaciÃ³n es incorrecto. Verifica que sea el nÃºmero de 6 dÃ­gitos correcto.',
      );
    } else if (error.code === 'auth/session-expired') {
      throw new Error('El cÃ³digo expirÃ³. Solicita uno nuevo.');
    } else if (error.code === 'auth/invalid-verification-id') {
      throw new Error(
        'ID de verificaciÃ³n invÃ¡lido. Intenta enviar el cÃ³digo nuevamente.',
      );
    } else if (error.code === 'auth/missing-verification-code') {
      throw new Error(
        'El cÃ³digo no se proporcionÃ³. Verifica e intenta de nuevo.',
      );
    }

    throw new Error(`Error verificando OTP: ${error.message}`);
  }
};

/**
 * Login with email and password
 */
export const loginWithEmailPassword = async (
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  try {
    console.log(`ðŸ“§ Logging in with email: ${email}`);

    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password,
    );
    console.log('âœ… Login successful');

    return userCredential;
  } catch (error: any) {
    console.error('âŒ Error logging in:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
};

/**
 * Create user with email and password
 */
export const createUserWithEmailPassword = async (
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  try {
    console.log(`ðŸ“§ Creating user with email: ${email}`);

    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );
    console.log('âœ… User created successfully');

    return userCredential;
  } catch (error: any) {
    console.error('âŒ Error creating user:', error);
    throw new Error(`User creation failed: ${error.message}`);
  }
};

/**
 * Update user phone number
 */
export const updateUserPhoneNumber = async (
  verificationId: string,
  code: string,
): Promise<void> => {
  try {
    const credential = auth.PhoneAuthProvider.credential(verificationId, code);
    const user = auth().currentUser;

    if (!user) {
      throw new Error('No user logged in');
    }

    await user.linkWithCredential(credential);
    console.log('âœ… Phone number linked successfully');
  } catch (error: any) {
    console.error('âŒ Error linking phone number:', error);
    throw new Error(`Error linking phone: ${error.message}`);
  }
};

/**
 * Complete multi-factor authentication
 */
export const completePhoneAuth = async (
  email: string,
  password: string,
  phoneNumber: string,
  verificationId: string,
  code: string,
): Promise<FirebaseAuthTypes.UserCredential> => {
  try {
    // Step 1: Sign in with email and password
    const userCredential = await loginWithEmailPassword(email, password);

    // Step 2: Link phone number to the account
    const credential = auth.PhoneAuthProvider.credential(verificationId, code);
    await userCredential.user.linkWithCredential(credential);

    console.log('âœ… Phone authentication completed');
    return userCredential;
  } catch (error: any) {
    console.error('âŒ Error in phone authentication:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): FirebaseAuthTypes.User | null => {
  return auth().currentUser;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  try {
    await auth().signOut();
    console.log('âœ… Signed out successfully');
  } catch (error: any) {
    console.error('âŒ Error signing out:', error);
    throw error;
  }
};

/**
 * Get auth token
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth().currentUser;
    if (!user) {
      return null;
    }
    const token = await user.getIdToken();
    return token;
  } catch (error: any) {
    console.error('âŒ Error getting token:', error);
    return null;
  }
};

/**
 * Initialize Google Sign-In
 */
export const initializeGoogleSignIn = async (): Promise<void> => {
  try {
    await GoogleSignin.configure({
      webClientId:
        '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      profileImageSize: 120,
    });
    console.log('âœ… Google Sign-In configured');
  } catch (error: any) {
    console.error('âŒ Error configuring Google Sign-In:', error);
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle =
  async (): Promise<FirebaseAuthTypes.UserCredential> => {
    try {
      // Ensure Google Sign-In is configured
      try {
        await GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          profileImageSize: 120,
        });
      } catch {
        // Configuration might already exist, continue
        console.log('â„¹ï¸ Google Sign-In already configured');
      }

      // Check if Google Play Services are available
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      console.log(`ðŸ“± Google Play Services available: ${hasPlayServices}`);

      // Ensure activity is ready - wait a bit before attempting sign in
      console.log('â³ Esperar a que el activity estÃ© listo...');
      await new Promise(resolve => setTimeout(() => resolve(null), 800));

      // Try to get current user first to validate activity
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          console.log('â„¹ï¸ Already signed in, signing out first');
          await GoogleSignin.signOut();
        }
      } catch {
        // User not signed in, continue
        console.log('â„¹ï¸ No previous user session');
      }

      // Sign in with Google with retry logic built-in
      let signInResult: any;
      let retries = 0;
      const maxRetries = 2;

      while (retries < maxRetries) {
        try {
          console.log(`ðŸ” Google Sign-In attempt ${retries + 1}/${maxRetries}`);
          signInResult = await GoogleSignin.signIn();
          console.log('âœ… Google Sign-In user retrieved');
          break;
        } catch (signInError: any) {
          const errorMsg = signInError?.message || String(signInError);
          console.error(`âŒ Sign-in attempt ${retries + 1} failed:`, errorMsg);

          if (
            errorMsg.includes('current activity is null') ||
            errorMsg.includes('Activity is null')
          ) {
            retries++;
            if (retries < maxRetries) {
              console.log(
                `â³ Activity no disponible, reintentando en 1 segundo... (${retries}/${maxRetries})`,
              );
              await new Promise(resolve =>
                setTimeout(() => resolve(null), 1000),
              );
              continue;
            }
          }
          throw signInError;
        }
      }

      // Handle different response types
      const userEmail =
        signInResult?.data?.user?.email ||
        signInResult?.user?.email ||
        signInResult?.email;

      const userName =
        signInResult?.data?.user?.name ||
        signInResult?.user?.name ||
        signInResult?.name ||
        signInResult?.displayName ||
        'Usuario';

      const userPhoto =
        signInResult?.data?.user?.photo ||
        signInResult?.user?.photo ||
        signInResult?.photo ||
        null;

      console.log(`ðŸ“§ Extracted Email: "${userEmail}"`);
      console.log(`ðŸ‘¤ Extracted Name: "${userName}"`);
      console.log(`ðŸ–¼ï¸  Extracted Photo: "${userPhoto ? 'YES' : 'NO'}"`);

      if (!userEmail) {
        console.error(
          'âŒ No email found in Google response:',
          JSON.stringify(signInResult),
        );
        throw new Error('No se pudo obtener el correo de Google');
      }

      console.log(`âœ… Google Sign-In: ${userName} (${userEmail})`);

      // Get the ID token from Google
      const tokens: any = await GoogleSignin.getTokens();
      console.log('âœ… Google tokens retrieved');

      const idToken = tokens?.idToken;

      if (!idToken) {
        console.error(
          'âŒ No ID token found in Google response:',
          JSON.stringify(tokens),
        );
        throw new Error('No se pudo obtener el ID token de Google');
      }

      console.log('ðŸ” Creating Firebase credential...');

      // Create Firebase credential with the Google ID token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign in with Firebase using the credential
      const userCredential = await auth().signInWithCredential(
        googleCredential,
      );

      // Ensure the email from Google is preserved
      // Firebase may create a temporary email, so we use the one from Google
      if (!userCredential.user.email && userEmail) {
        // If Firebase didn't set an email, store the Google email
        try {
          await userCredential.user.updateProfile({
            displayName: userName,
          });
        } catch (e) {
          console.warn('Could not update profile:', e);
        }
      }

      console.log('âœ… Google Sign-In successful');
      console.log(`ðŸ“§ Firebase UID: ${userCredential.user.uid}`);
      console.log(`ðŸ“§ User Email: ${userEmail}`);
      console.log(`ðŸ“§ User Name: ${userName}`);

      // Store the original Google email and name since Firebase might have created a temporary one
      return {
        ...userCredential,
        user: {
          ...userCredential.user,
          uid: userCredential.user.uid, // Ensure uid is preserved
          email: userEmail || userCredential.user.email,
          displayName: userName,
          photoURL: userPhoto || userCredential.user.photoURL,
        } as any,
      };
    } catch (error: any) {
      console.error('âŒ Error in Google Sign-In:', error.message);
      throw error;
    }
  };

// --- FCM Push Notifications ----------------------------------------------

const ensureMessagingReady = async (): Promise<void> => {
  try {
    await messaging().setAutoInitEnabled(true);
    await messaging().registerDeviceForRemoteMessages();
  } catch (error: any) {
    // Android often works without explicit registerDeviceForRemoteMessages.
    console.log('[FCM] registerDeviceForRemoteMessages skipped:', error?.message);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    await ensureMessagingReady();

    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[FCM] Native POST_NOTIFICATIONS permission denied');
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log(
      enabled ? '[FCM] Notification permission granted' : '[FCM] Notification permission denied',
    );
    return enabled;
  } catch (error: any) {
    console.error('[FCM] Error requesting permission:', error.message);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    await ensureMessagingReady();
    const token = await messaging().getToken();
    console.log('[FCM] Token:', token.substring(0, 20) + '...');
    return token;
  } catch (error: any) {
    console.error('[FCM] Error getting token:', error.message);
    return null;
  }
};

export const registerFCMTokenWithBackend = async (
  apiBaseUrl: string,
  jwtToken: string,
): Promise<void> => {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const fcmToken = await getFCMToken();
    if (!fcmToken) return;

    const res = await fetch(apiBaseUrl + '/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + jwtToken,
      },
      body: JSON.stringify({ token: fcmToken }),
    });

    if (res.ok) console.log('[FCM] Token registered in backend');
  } catch (error: any) {
    console.error('[FCM] Error registering token in backend:', error.message);
  }
};

export const onForegroundNotification = (
  callback: (
    title: string,
    body: string,
    data: Record<string, string>,
  ) => void,
) =>
  messaging().onMessage(async msg => {
    callback(
      msg.notification?.title ?? '',
      msg.notification?.body ?? '',
      (msg.data ?? {}) as Record<string, string>,
    );
  });

export const onFCMTokenRefresh = (callback: (token: string) => void) =>
  messaging().onTokenRefresh((token: string) => {
    callback(token);
  });
