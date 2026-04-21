import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { API_HOST } from '../config/constants';

const API_URL = API_HOST;

GoogleSignin.configure({
  webClientId:
    '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export const googleService = {
  signIn: async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const data = response.data;
      if (!data) {
        throw new Error('No data in response');
      }

      const idToken = data.idToken;
      const user = data.user;

      if (!idToken || !user) {
        throw new Error(`Missing idToken or user`);
      }

      const backendResponse = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: user.email,
          name: user.name,
          photo: user.photo,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.error || 'Google auth failed');
      }
      return await backendResponse.json();
    } catch (error: any) {
      console.error('Google Sign-In Error:', error.message);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Play Services not available');
      }
      throw error;
    }
  },

  signOut: async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const user = await GoogleSignin.getCurrentUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  },
};
