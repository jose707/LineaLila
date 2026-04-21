// src/services/auth.service.ts
import api from './api.client';
import { StorageHelper } from './storage';
import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '../types/api';
import { User } from '../types/models';
import {
  getFCMToken,
  requestNotificationPermission,
} from './firebase.service';

export const authService = {
  // Login
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Llamar al backend real
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    // Guardar tokens
    StorageHelper.setItem('authToken', response.token);
    StorageHelper.setItem('user', JSON.stringify(response.user));

    return response;
  },

  // Signup
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    // Llamar al backend real para registrar usuario
    const response = await api.post<SignupResponse>('/auth/signup', data);

    // Guardar tokens y usuario
    StorageHelper.setItem('authToken', response.token);
    StorageHelper.setItem('user', JSON.stringify(response.user));

    return response;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      // Intentar llamar a API solo si no es un token mock
      const token = StorageHelper.getItem('authToken');
      if (token && !token.startsWith('mock_token_')) {
        await api.post('/auth/logout');
      }
    } catch {
      // No fallar si la API no responde
      console.log('Logout API call skipped or failed, clearing local data');
    } finally {
      // Siempre limpiar tokens locales
      StorageHelper.removeItem('authToken');
      StorageHelper.removeItem('refreshToken');
      StorageHelper.removeItem('user');
    }
  },

  // Refresh Token
  refreshToken: async (): Promise<string> => {
    // El backend espera el token en Authorization header
    const response = await api.post<{ token: string }>('/auth/refresh');

    StorageHelper.setItem('authToken', response.token);
    return response.token;
  },

  // Register FCM Token
  registerFCMToken: async (): Promise<void> => {
    try {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const token = await getFCMToken();
      if (!token) return;

      await authService.registerFCMTokenValue(token);
    } catch (e: any) {
      console.error('[FCM] Error registering token:', e.message);
    }
  },

  registerFCMTokenValue: async (token: string): Promise<void> => {
    if (!token) return;
    await api.post('/notifications/register-token', { token });
    console.log('[FCM] Token registered with backend via API client');
  },

  // Get Current User from Local Storage
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userJson = StorageHelper.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  },

  // Fetch Current User from Server (refreshes data)
  fetchCurrentUser: async (): Promise<User | null> => {
    try {
      console.log(
        'ðŸ“¡ [fetchCurrentUser] Obteniendo datos actualizados del servidor...',
      );
      const response = await api.get<{ user: User }>('/auth/me');
      console.log('ðŸ“¡ [fetchCurrentUser] Respuesta del servidor:', response);

      if (response && response.user) {
        // Actualizar localStorage con los datos nuevos
        console.log(
          'âœ… [fetchCurrentUser] Guardando usuario en localStorage:',
          {
            id: response.user.id,
            name: response.user.name,
            rating: response.user.rating,
            totalTrips: response.user.totalTrips,
          },
        );
        StorageHelper.setItem('user', JSON.stringify(response.user));
        return response.user;
      }
      return null;
    } catch (error: any) {
      console.error(
        'âŒ [fetchCurrentUser] Error:',
        error?.response?.data || error.message,
      );
      return null;
    }
  },

  // Forgot Password
  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  // Reset Password
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  },

  // Verify Email
  verifyEmail: async (token: string): Promise<void> => {
    await api.post('/auth/verify-email', { token });
  },

  // Register via Phone or Google
  register: async (data: {
    email: string;
    phone: string;
    displayName?: string;
    firebaseUid?: string;
    photoURL?: string;
    role?: string;
  }): Promise<{ token: string; user: User }> => {
    const registerData = {
      email: data.email,
      phone: data.phone,
      name: data.displayName, // Backend expects 'name' field
      firebaseUid: data.firebaseUid,
      photoURL: data.photoURL, // Add photo URL
      // Note: Backend will set role as 'user' for all new users
      // Roles are managed through the Driver table for conductors
    };

    console.log(
      'ðŸ“¡ Enviando registro al backend:',
      JSON.stringify(registerData, null, 2),
    );

    try {
      const response = await api.post<{ token: string; user: User }>(
        '/auth/verify-phone',
        registerData,
      );

      // Guardar token y usuario
      StorageHelper.setItem('authToken', response.token);
      StorageHelper.setItem('user', JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      console.error('âŒ Backend registration error:', error);
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      throw error;
    }
  },

  // Check if phone number is already registered
  checkPhoneExists: async (
    phoneNumber: string,
    firebaseUid?: string,
    email?: string,
  ): Promise<boolean> => {
    try {
      console.log(`ðŸ” Verificando si el telÃ©fono existe: ${phoneNumber}`);

      // Hacer una llamada al endpoint verify-phone con los datos necesarios
      // El backend debe retornar un error 409 si el telÃ©fono ya estÃ¡ registrado
      try {
        const response = await api.post<any>('/auth/verify-phone', {
          phone: phoneNumber,
          firebaseUid,
          email,
          checkOnly: true, // Indica que solo queremos verificar, no registrar
        });

        console.log('ðŸ“± Respuesta verificaciÃ³n telÃ©fono:', response);

        // Si no hay error, el telÃ©fono NO existe
        return false;
      } catch (error: any) {
        // Si hay error, verificar si es por telÃ©fono duplicado
        console.log(
          'ðŸ“± Respuesta error completa:',
          JSON.stringify(error, null, 2),
        );
        console.log('ðŸ“± error.status:', error?.status);
        console.log('ðŸ“± error.data:', error?.data);
        console.log('ðŸ“± error.message:', error?.message);
        console.log('ðŸ“± error.data?.message:', error?.data?.message);
        console.log('ðŸ“± error.data?.error:', error?.data?.error);

        // Detectar si es un error por telÃ©fono duplicado (debe venir explÃ­citamente del backend)
        const isDuplicatePhone =
          error?.status === 409 || // Conflict (telÃ©fono duplicado)
          (error?.data?.message &&
            (error.data.message.toLowerCase().includes('telÃ©fono') ||
              error.data.message.toLowerCase().includes('phone') ||
              error.data.message.toLowerCase().includes('already') ||
              error.data.message.toLowerCase().includes('registrado') ||
              error.data.message.toLowerCase().includes('existe'))) ||
          (error?.data?.error &&
            (error.data.error.toLowerCase().includes('telÃ©fono') ||
              error.data.error.toLowerCase().includes('phone') ||
              error.data.error.toLowerCase().includes('already') ||
              error.data.error.toLowerCase().includes('registrado') ||
              error.data.error.toLowerCase().includes('existe')));

        console.log('ðŸ“± Â¿Es duplicado? isDuplicatePhone:', isDuplicatePhone);

        if (isDuplicatePhone) {
          console.log('âœ… TelÃ©fono YA existe en BD');
          return true;
        }

        // Si es otro error (campos faltantes, etc), asumir que no existe
        console.log(
          'ðŸ“± Error detectado, pero NO es duplicado:',
          error?.data?.error,
        );
        return false;
      }
    } catch (error: any) {
      console.error('âŒ Error checking phone number:');
      console.error('   Status:', error?.status);
      console.error('   Data:', error?.data);
      console.error('   Message:', error?.message);
      // Si hay error en la validaciÃ³n, asumir que NO existe para permitir el flujo
      return false;
    }
  },

  // Check if Firebase user exists
  checkFirebaseUser: async (
    firebaseUid: string,
  ): Promise<{
    exists: boolean;
    needsPhoneVerification?: boolean;
    token?: string;
    user?: User;
  }> => {
    try {
      const response = await api.get<any>(
        `/auth/check-firebase/${firebaseUid}`,
      );

      if (response.exists && response.needsPhoneVerification) {
        return {
          exists: true,
          needsPhoneVerification: true,
        };
      }

      if (response.exists && response.token && response.user) {
        // User exists, save token and user data
        StorageHelper.setItem('authToken', response.token);
        StorageHelper.setItem('user', JSON.stringify(response.user));
      }

      return {
        exists: response.exists,
        needsPhoneVerification: response.needsPhoneVerification,
        token: response.token,
        user: response.user,
      };
    } catch (error: any) {
      console.error('âŒ Error checking Firebase user:');
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      console.error('   Message:', error.message);
      // If there's an error, assume user doesn't exist
      return { exists: false };
    }
  },

  // Change user mode (passenger or driver)
  changeMode: async (mode: 'passenger' | 'driver'): Promise<User> => {
    try {
      const userStr = StorageHelper.getItem('user');
      if (!userStr) {
        throw new Error('No user found in storage');
      }

      const user = JSON.parse(userStr) as User;
      const userId = user.id;

      console.log(`ðŸ”„ Cambiando modo a: ${mode}`);

      const response = await api.put<any>(`/users/${userId}/current-mode`, {
        currentMode: mode,
      });

      console.log('âœ… Respuesta cambio de modo:', response);

      if (response.user) {
        // Update user in storage with new mode
        StorageHelper.setItem('user', JSON.stringify(response.user));
      }

      return response.user;
    } catch (error: any) {
      console.error('âŒ Error changing mode:');
      console.error('   Status:', error?.status);
      console.error('   Data:', error?.data);
      console.error('   Message:', error?.message);

      // Check if it's a driver approval error
      if (error?.status === 403) {
        throw new Error(
          error?.data?.error || 'No tienes permisos para ser conductor',
        );
      }

      throw new Error(
        error?.data?.error || `Error al cambiar el modo a ${mode}`,
      );
    }
  },
};

