import auth from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface LoginCredentials {
  email: string;
  password: string;
  phoneNumber: string;
}

interface OTPVerificationData {
  verificationId: string;
  code: string;
}

/**
 * Send OTP to phone number
 */
export const sendPhoneOTP = async (phoneNumber: string): Promise<string> => {
  try {
    console.log(`📱 Sending OTP to: ${phoneNumber}`);

    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    console.log('✅ OTP sent successfully');

    if (!confirmation.verificationId) {
      throw new Error('No verification ID received');
    }

    return confirmation.verificationId;
  } catch (error: any) {
    console.error('❌ Error sending OTP:', error);
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
    console.log(`🔐 Verifying OTP code`);
    console.log(`   Verification ID: ${verificationId?.substring(0, 20)}...`);
    console.log(`   Code: ${code}`);
    console.log(`   Code length: ${code.length}`);

    const credential = auth.PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await auth().signInWithCredential(credential);

    console.log('✅ OTP verified successfully');
    return userCredential;
  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Full error:', JSON.stringify(error));

    // Mensajes de error más claros
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error(
        'El código de verificación es incorrecto. Verifica que sea el número de 6 dígitos correcto.',
      );
    } else if (error.code === 'auth/session-expired') {
      throw new Error('El código expiró. Solicita uno nuevo.');
    } else if (error.code === 'auth/invalid-verification-id') {
      throw new Error(
        'ID de verificación inválido. Intenta enviar el código nuevamente.',
      );
    } else if (error.code === 'auth/missing-verification-code') {
      throw new Error(
        'El código no se proporcionó. Verifica e intenta de nuevo.',
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
    console.log(`📧 Logging in with email: ${email}`);

    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password,
    );
    console.log('✅ Login successful');

    return userCredential;
  } catch (error: any) {
    console.error('❌ Error logging in:', error);
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
    console.log(`📧 Creating user with email: ${email}`);

    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );
    console.log('✅ User created successfully');

    return userCredential;
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
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
    console.log('✅ Phone number linked successfully');
  } catch (error: any) {
    console.error('❌ Error linking phone number:', error);
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

    console.log('✅ Phone authentication completed');
    return userCredential;
  } catch (error: any) {
    console.error('❌ Error in phone authentication:', error);
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
    console.log('✅ Signed out successfully');
  } catch (error: any) {
    console.error('❌ Error signing out:', error);
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
    console.error('❌ Error getting token:', error);
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
    console.log('✅ Google Sign-In configured');
  } catch (error: any) {
    console.error('❌ Error configuring Google Sign-In:', error);
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
          webClientId:
            '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com',
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          profileImageSize: 120,
        });
      } catch (e) {
        // Configuration might already exist, continue
        console.log('ℹ️ Google Sign-In already configured');
      }

      // Check if Google Play Services are available
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      console.log(`📱 Google Play Services available: ${hasPlayServices}`);

      // Ensure activity is ready - wait a bit before attempting sign in
      console.log('⏳ Esperar a que el activity esté listo...');
      await new Promise(resolve => setTimeout(() => resolve(null), 800));

      // Try to get current user first to validate activity
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          console.log('ℹ️ Already signed in, signing out first');
          await GoogleSignin.signOut();
        }
      } catch (e) {
        // User not signed in, continue
        console.log('ℹ️ No previous user session');
      }

      // Sign in with Google with retry logic built-in
      let signInResult: any;
      let retries = 0;
      const maxRetries = 2;

      while (retries < maxRetries) {
        try {
          console.log(`🔐 Google Sign-In attempt ${retries + 1}/${maxRetries}`);
          signInResult = await GoogleSignin.signIn();
          console.log('✅ Google Sign-In user retrieved');
          break;
        } catch (signInError: any) {
          const errorMsg = signInError?.message || String(signInError);
          console.error(`❌ Sign-in attempt ${retries + 1} failed:`, errorMsg);

          if (
            errorMsg.includes('current activity is null') ||
            errorMsg.includes('Activity is null')
          ) {
            retries++;
            if (retries < maxRetries) {
              console.log(
                `⏳ Activity no disponible, reintentando en 1 segundo... (${retries}/${maxRetries})`,
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

      console.log(`📧 Extracted Email: "${userEmail}"`);
      console.log(`👤 Extracted Name: "${userName}"`);
      console.log(`🖼️  Extracted Photo: "${userPhoto ? 'YES' : 'NO'}"`);

      if (!userEmail) {
        console.error(
          '❌ No email found in Google response:',
          JSON.stringify(signInResult),
        );
        throw new Error('No se pudo obtener el correo de Google');
      }

      console.log(`✅ Google Sign-In: ${userName} (${userEmail})`);

      // Get the ID token from Google
      const tokens: any = await GoogleSignin.getTokens();
      console.log('✅ Google tokens retrieved');

      const idToken = tokens?.idToken;

      if (!idToken) {
        console.error(
          '❌ No ID token found in Google response:',
          JSON.stringify(tokens),
        );
        throw new Error('No se pudo obtener el ID token de Google');
      }

      console.log('🔐 Creating Firebase credential...');

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

      console.log('✅ Google Sign-In successful');
      console.log(`📧 Firebase UID: ${userCredential.user.uid}`);
      console.log(`📧 User Email: ${userEmail}`);
      console.log(`📧 User Name: ${userName}`);

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
      console.error('❌ Error in Google Sign-In:', error.message);
      throw error;
    }
  };
