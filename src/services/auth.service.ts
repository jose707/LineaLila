// src/services/auth.service.ts
import api from './api.client';
import { StorageHelper } from './storage';
import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '../types/api';
import { User, UserRole } from '../types/models';

// Usuarios de prueba
const TEST_USERS = [
  {
    id: 'admin-001',
    email: 'admin@linealiła.com',
    password: 'admin123',
    name: 'Admin Línea Lila',
    phone: '+57 300 123 0001',
    role: UserRole.ADMIN,
    profileImage:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=7C3AED',
  },
  {
    id: 'user-001',
    email: 'usuario@linealiła.com',
    password: 'usuario123',
    name: 'María López',
    phone: '+57 300 123 0002',
    role: UserRole.USER,
    profileImage:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=user&backgroundColor=EC4899',
  },
];

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
    } catch (error) {
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

  // Get Current User
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userJson = StorageHelper.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
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
  }): Promise<User> => {
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
      '📡 Enviando registro al backend:',
      JSON.stringify(registerData, null, 2),
    );

    try {
      const response = await api.post<{ user: User }>(
        '/auth/verify-phone',
        registerData,
      );

      // Guardar usuario
      StorageHelper.setItem('user', JSON.stringify(response.user));

      return response.user;
    } catch (error: any) {
      console.error('❌ Backend registration error:', error);
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
      console.log(`🔍 Verificando si el teléfono existe: ${phoneNumber}`);

      // Hacer una llamada al endpoint verify-phone con los datos necesarios
      // El backend debe retornar un error 409 si el teléfono ya está registrado
      try {
        const response = await api.post<any>('/auth/verify-phone', {
          phone: phoneNumber,
          firebaseUid,
          email,
          checkOnly: true, // Indica que solo queremos verificar, no registrar
        });

        console.log('📱 Respuesta verificación teléfono:', response);

        // Si no hay error, el teléfono NO existe
        return false;
      } catch (error: any) {
        // Si hay error, verificar si es por teléfono duplicado
        console.log(
          '📱 Respuesta error completa:',
          JSON.stringify(error, null, 2),
        );
        console.log('📱 error.status:', error?.status);
        console.log('📱 error.data:', error?.data);
        console.log('📱 error.message:', error?.message);
        console.log('📱 error.data?.message:', error?.data?.message);
        console.log('📱 error.data?.error:', error?.data?.error);

        // Detectar si es un error por teléfono duplicado (debe venir explícitamente del backend)
        const isDuplicatePhone =
          error?.status === 409 || // Conflict (teléfono duplicado)
          (error?.data?.message &&
            (error.data.message.toLowerCase().includes('teléfono') ||
              error.data.message.toLowerCase().includes('phone') ||
              error.data.message.toLowerCase().includes('already') ||
              error.data.message.toLowerCase().includes('registrado') ||
              error.data.message.toLowerCase().includes('existe'))) ||
          (error?.data?.error &&
            (error.data.error.toLowerCase().includes('teléfono') ||
              error.data.error.toLowerCase().includes('phone') ||
              error.data.error.toLowerCase().includes('already') ||
              error.data.error.toLowerCase().includes('registrado') ||
              error.data.error.toLowerCase().includes('existe')));

        console.log('📱 ¿Es duplicado? isDuplicatePhone:', isDuplicatePhone);

        if (isDuplicatePhone) {
          console.log('✅ Teléfono YA existe en BD');
          return true;
        }

        // Si es otro error (campos faltantes, etc), asumir que no existe
        console.log(
          '📱 Error detectado, pero NO es duplicado:',
          error?.data?.error,
        );
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error checking phone number:');
      console.error('   Status:', error?.status);
      console.error('   Data:', error?.data);
      console.error('   Message:', error?.message);
      // Si hay error en la validación, asumir que NO existe para permitir el flujo
      return false;
    }
  },

  // Check if Firebase user exists
  checkFirebaseUser: async (
    firebaseUid: string,
  ): Promise<{
    exists: boolean;
    token?: string;
    user?: User;
  }> => {
    try {
      console.log(`🔍 Verificando si usuario Firebase existe: ${firebaseUid}`);
      const response = await api.get<any>(
        `/auth/check-firebase/${firebaseUid}`,
      );

      console.log('✅ Respuesta del backend:', response);

      if (response.exists && response.token && response.user) {
        // User exists, save token and user data
        StorageHelper.setItem('authToken', response.token);
        StorageHelper.setItem('user', JSON.stringify(response.user));
      }

      return {
        exists: response.exists,
        token: response.token,
        user: response.user,
      };
    } catch (error: any) {
      console.error('❌ Error checking Firebase user:');
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      console.error('   Message:', error.message);
      // If there's an error, assume user doesn't exist
      return { exists: false };
    }
  },
};
