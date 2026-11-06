import {
  GoogleSignin as GoogleIngresar,
  statusCodes as estadoCodes } from
'@react-native-google-signin/google-signin';
import { API_HOST } from "../config/constantes";

const API_URL = API_HOST;

GoogleIngresar.configure({
  webClientId:
  '807854350071-3f5c1vk0ghju94qrrghaiiqaml8ss555.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true
});

const googleServicio = {
  iniciarSesion: async () => {
    try {
      await GoogleIngresar.hasPlayServices();
      const respuesta = await GoogleIngresar.signIn();

      const datos = respuesta.data;
      if (!datos) {
        throw new Error('No data in response');
      }

      const idToken = datos.idToken;
      const usuario = datos.user;

      if (!idToken || !usuario) {
        throw new Error(`Missing idToken or user`);
      }

      const servidorRespuesta = await fetch(`${API_URL}/api/autenticacion/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: usuario.email,
          name: usuario.name,
          photo: usuario.photo
        })
      });

      if (!servidorRespuesta.ok) {
        const errorDatos = await servidorRespuesta.json();
        throw new Error(errorDatos.error || 'Google auth failed');
      }
      return await servidorRespuesta.json();
    } catch (error: any) {
      console.error('Google Sign-In Error:', error.message);
      if (error.code === estadoCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in cancelled');
      } else if (error.code === estadoCodes.IN_PROGRESS) {
        throw new Error('Sign in in progress');
      } else if (error.code === estadoCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Play Services not available');
      }
      throw error;
    }
  },

  cerrarSesion: async () => {
    try {
      await GoogleIngresar.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  obtenerUsuarioActual: async () => {
    try {
      const usuario = await GoogleIngresar.getCurrentUser();
      return usuario;
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  }
};export { googleServicio };
