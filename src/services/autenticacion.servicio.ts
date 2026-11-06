// src/services/autenticacion.servicio.ts
import api from "./api.cliente";
import { AlmacenamientoAuxiliar } from './storage';
import {
  IngresarSolicitud,
  IngresarRespuesta,
  RegistrarseSolicitud,
  RegistrarseRespuesta } from
'../types/api';
import { Usuario } from "../types/modelos";
import {
  obtenerFcmToken,
  solicitudNotificacionPermiso } from
"./firebase.servicio";

const autenticacionServicio = {
  // Login
  ingresar: async (credenciales: IngresarSolicitud): Promise<IngresarRespuesta> => {
    // Llamar al backend real
    const respuesta = await api.post<IngresarRespuesta>('/autenticacion/iniciar-sesion', credenciales);

    // Guardar tokens
    AlmacenamientoAuxiliar.establecerElemento('authToken', respuesta.token);
    AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));

    return respuesta;
  },

  // Signup
  registrarse: async (datos: RegistrarseSolicitud): Promise<RegistrarseRespuesta> => {
    // Llamar al backend real para registrar usuario
    const respuesta = await api.post<RegistrarseRespuesta>('/autenticacion/registro', datos);

    // Guardar tokens y usuario
    AlmacenamientoAuxiliar.establecerElemento('authToken', respuesta.token);
    AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));

    return respuesta;
  },

  // Logout
  salir: async (): Promise<void> => {
    try {
      // Intentar llamar a API solo si no es un token mock
      const token = AlmacenamientoAuxiliar.obtenerElemento('authToken');
      if (token && !token.startsWith('mock_token_')) {
        await api.post('/autenticacion/cerrar-sesion');
      }
    } catch {
      // No fallar si la API no responde
      console.log('Logout API call skipped or failed, clearing local data');
    } finally {
      // Siempre limpiar tokens locales
      AlmacenamientoAuxiliar.quitarElemento('authToken');
      AlmacenamientoAuxiliar.quitarElemento('refreshToken');
      AlmacenamientoAuxiliar.quitarElemento('user');
    }
  },

  // Refresh Token
  renovarToken: async (): Promise<string> => {
    // El backend espera el token en Authorization header
    const respuesta = await api.post<{token: string;}>('/autenticacion/renovar');

    AlmacenamientoAuxiliar.establecerElemento('authToken', respuesta.token);
    return respuesta.token;
  },

  // Register FCM Token
  registrarTokenFCM: async (): Promise<void> => {
    try {
      const concedido = await solicitudNotificacionPermiso();
      if (!concedido) return;

      const token = await obtenerFcmToken();
      if (!token) return;

      await autenticacionServicio.registrarValorTokenFCM(token);
    } catch (error: any) {
      console.error('[FCM] Error registering token:', error.message);
    }
  },

  registrarValorTokenFCM: async (token: string): Promise<void> => {
    if (!token) return;
    await api.post('/notificaciones/registrar-token', { token });
    console.log('[FCM] Token registered with backend via API client');
  },

  // Get Current User from Local Storage
  obtenerUsuarioActual: async (): Promise<Usuario | null> => {
    try {
      const usuarioJson = AlmacenamientoAuxiliar.obtenerElemento('user');
      return usuarioJson ? JSON.parse(usuarioJson) : null;
    } catch {
      return null;
    }
  },

  // Fetch Current User from Server (refreshes data)
  consultarUsuarioActual: async (): Promise<Usuario | null> => {
    try {
      console.log(
        '[fetchCurrentUser] Obteniendo datos actualizados del servidor...'
      );
      const respuesta = await api.obtener<{user: Usuario;}>('/autenticacion/sesion');
      if (respuesta && respuesta.user) {
        AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));
        return respuesta.user;
      }
      return null;
    } catch (error: any) {
      console.error(
        '[fetchCurrentUser] Error:',
        error?.response?.data || error.message
      );
      return null;
    }
  },

  // Forgot Password
  recuperarContrasena: async (correo: string): Promise<void> => {
    await api.post('/autenticacion/recuperar-contrasena', { email: correo });
  },

  // Reset Password
  restablecerContrasena: async (token: string, nuevoContrasena: string): Promise<void> => {
    await api.post('/autenticacion/restablecer-contrasena', { token, newPassword: nuevoContrasena });
  },

  // Verify Email
  verificarCorreo: async (token: string): Promise<void> => {
    await api.post('/autenticacion/verificar-correo', { token });
  },

  // Register via Phone or Google
  registrar: async (datos: {
    email: string;
    phone: string;
    displayName?: string;
    firebaseUid?: string;
    photoURL?: string;
    role?: string;
  }): Promise<{token: string;user: Usuario;}> => {
    const registrarDatos = {
      email: datos.email,
      phone: datos.phone,
      name: datos.displayName, // Backend expects 'name' field
      firebaseUid: datos.firebaseUid,
      photoURL: datos.photoURL // Add photo URL
      // Note: Backend will set role as 'user' for all new users
      // Roles are managed through the Driver table for conductors
    };

    console.log(
      'ðŸ“¡ Enviando registro al backend:',
      JSON.stringify(registrarDatos, null, 2)
    );

    try {
      const respuesta = await api.post<{token: string;user: Usuario;}>(
        '/autenticacion/verificar-telefono',
        registrarDatos
      );

      // Guardar token y usuario
      AlmacenamientoAuxiliar.establecerElemento('authToken', respuesta.token);
      AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));

      return respuesta;
    } catch (error: any) {
      console.error('[Auth] Backend registration error:', error);
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      throw error;
    }
  },

  // Check if phone number is already registered
  comprobarTelefonoExistente: async (
  telefonoNumero: string,
  firebaseUid?: string,
  correo?: string)
  : Promise<boolean> => {
    try {
      console.log(`ðŸ” Verificando si el telÃ©fono existe: ${telefonoNumero}`);

      // Hacer una llamada al endpoint verify-phone con los datos necesarios
      // El backend debe retornar un error 409 si el telÃ©fono ya estÃ¡ registrado
      try {
        const respuesta = await api.post<any>('/autenticacion/verificar-telefono', {
          phone: telefonoNumero,
          firebaseUid,
          email: correo,
          checkOnly: true // Indica que solo queremos verificar, no registrar
        });

        console.log('ðŸ“± Respuesta verificaciÃ³n telÃ©fono:', respuesta);

        // Si no hay error, el telÃ©fono NO existe
        return false;
      } catch (error: any) {
        // Si hay error, verificar si es por telÃ©fono duplicado
        console.log(
          'ðŸ“± Respuesta error completa:',
          JSON.stringify(error, null, 2)
        );
        console.log('ðŸ“± error.status:', error?.status);
        console.log('ðŸ“± error.data:', error?.data);
        console.log('ðŸ“± error.message:', error?.message);
        console.log('ðŸ“± error.data?.message:', error?.data?.message);
        console.log('ðŸ“± error.data?.error:', error?.data?.error);

        // Detectar si es un error por telÃ©fono duplicado (debe venir explÃ­citamente del backend)
        const esDuplicadoTelefono =
        error?.status === 409 || // Conflict (telÃ©fono duplicado)
        error?.data?.message && (
        error.data.message.toLowerCase().includes('telÃ©fono') ||
        error.data.message.toLowerCase().includes('phone') ||
        error.data.message.toLowerCase().includes('already') ||
        error.data.message.toLowerCase().includes('registrado') ||
        error.data.message.toLowerCase().includes('existe')) ||
        error?.data?.error && (
        error.data.error.toLowerCase().includes('telÃ©fono') ||
        error.data.error.toLowerCase().includes('phone') ||
        error.data.error.toLowerCase().includes('already') ||
        error.data.error.toLowerCase().includes('registrado') ||
        error.data.error.toLowerCase().includes('existe'));

        console.log('ðŸ“± Â¿Es duplicado? isDuplicatePhone:', esDuplicadoTelefono);

        if (esDuplicadoTelefono) {
          console.log('âœ… TelÃ©fono YA existe en BD');
          return true;
        }

        // Si es otro error (campos faltantes, etc), asumir que no existe
        console.log(
          'ðŸ“± Error detectado, pero NO es duplicado:',
          error?.data?.error
        );
        return false;
      }
    } catch (error: any) {
      console.error('[Auth] Error checking phone number:');
      console.error('   Status:', error?.status);
      console.error('   Data:', error?.data);
      console.error('   Message:', error?.message);
      // Si hay error en la validaciÃ³n, asumir que NO existe para permitir el flujo
      return false;
    }
  },

  // Check if Firebase user exists
  comprobarUsuarioFirebase: async (
  firebaseUid: string)
  : Promise<{
    exists: boolean;
    needsPhoneVerification?: boolean;
    token?: string;
    user?: Usuario;
  }> => {
    try {
      const respuesta = await api.obtener<any>(
        `/autenticacion/comprobar-firebase/${firebaseUid}`
      );

      if (respuesta.exists && respuesta.needsPhoneVerification) {
        return {
          exists: true,
          needsPhoneVerification: true
        };
      }

      if (respuesta.exists && respuesta.token && respuesta.user) {
        // User exists, save token and user data
        AlmacenamientoAuxiliar.establecerElemento('authToken', respuesta.token);
        AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));
      }

      return {
        exists: respuesta.exists,
        needsPhoneVerification: respuesta.needsPhoneVerification,
        token: respuesta.token,
        user: respuesta.user
      };
    } catch (error: any) {
      console.error('[Auth] Error checking Firebase user:');
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      console.error('   Message:', error.message);
      // If there's an error, assume user doesn't exist
      return { exists: false };
    }
  },

  // Change user mode (passenger or driver)
  cambiarModo: async (modo: 'pasajero' | 'conductor'): Promise<Usuario> => {
    try {
      const usuarioStr = AlmacenamientoAuxiliar.obtenerElemento('user');
      if (!usuarioStr) {
        throw new Error('No user found in storage');
      }

      const usuario = JSON.parse(usuarioStr) as Usuario;
      const usuarioId = usuario.id;

      console.log(`ðŸ”„ Cambiando modo a: ${modo}`);

      const respuesta = await api.put<any>(`/usuarios/${usuarioId}/modo-actual`, {
        modoActual: modo
      });

      console.log('âœ… Respuesta cambio de modo:', respuesta);

      if (respuesta.user) {
        // Update user in storage with new mode
        AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(respuesta.user));
      }

      return respuesta.user;
    } catch (error: any) {
      console.error('[Auth] Error changing mode:');
      console.error('   Status:', error?.status);
      console.error('   Data:', error?.data);
      console.error('   Message:', error?.message);

      // Check if it's a driver approval error
      if (error?.status === 403) {
        throw new Error(
          error?.data?.error || 'No tienes permisos para ser conductor'
        );
      }

      throw new Error(
        error?.data?.error || `Error al cambiar el modo a ${modo}`
      );
    }
  }
};export { autenticacionServicio };
