// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { authService } from '../services/auth.service';
import { onFCMTokenRefresh } from '../services/firebase.service';
import { StorageHelper } from '../services/storage';
import { User, UserRole } from '../types/models';
import { LoginRequest, SignupRequest } from '../types/api';
import { socketService } from '../services/socket.service';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  isDriverMode: boolean;
  setIsDriverMode: (mode: boolean) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithToken: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: SignupRequest) => Promise<User>;
  updateUser: (user: Partial<User>) => void;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const requestInitialPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación',
          message:
            'LineaLila necesita acceder a tu ubicación para conectarte de forma precisa.',
          buttonNeutral: 'Después',
          buttonNegative: 'No',
          buttonPositive: 'OK',
        },
      );
    } catch (e) {
      console.warn('Error pidiendo ubicación:', e);
    }
  }
  await authService.registerFCMToken().catch(() => {});
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // MODO DISEÑO: Forzar SplashScreen siempre visible
  const [isLoading, setIsLoading] = useState(true);

  // DESCOMENTAR ESTA LÍNEA PARA VOLVER AL COMPORTAMIENTO NORMAL
  // const [isLoading, setIsLoading] = useState(true);

  // Forzar isLoading a true siempre
  // Esto hace que RootNavigator muestre SplashScreen todo el tiempo
  // Puedes quitarlo cuando termines de ajustar el diseño
  // eslint-disable-next-line
  useEffect(() => {
    setIsLoading(true);
  }, []);
  const [isDriverMode, setIsDriverMode] = useState(false);

  // Inicializar sesión al montar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = StorageHelper.getItem('authToken');
        console.log(
          '🔐 [INIT] Inicializando auth desde storage. hasToken:',
          !!savedToken,
        );

        if (savedToken) {
          // Intentar validar el token con el backend
          setToken(savedToken);
          const freshUser = await authService.fetchCurrentUser();

          if (freshUser) {
            console.log(
              '🔐 [INIT] Sesión válida, usuario refrescado desde /auth/me',
            );
            setUser(freshUser);
            // Sincronizar isDriverMode con currentMode de la BD
            setIsDriverMode(freshUser.currentMode === 'driver');
            StorageHelper.setItem('user', JSON.stringify(freshUser));
            // 🔌 Reconectar WebSocket con sesión restaurada
            socketService.connect();

            // Register FCM Token implicitly in the background
            authService.registerFCMToken().catch(() => {});
          } else {
            console.log(
              '🔐 [INIT] Token inválido o expirado. Limpiando sesión local.',
            );
            StorageHelper.removeItem('authToken');
            StorageHelper.removeItem('user');
            setUser(null);
            setToken(null);
            setIsDriverMode(false);
            Alert.alert(
              'Sesión caducada',
              'Por seguridad, vuelve a iniciar sesión.',
            );
          }
        } else {
          // No hay token guardado: asegurarse de que no quede usuario colgado
          setUser(null);
          setToken(null);
          setIsDriverMode(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // MODO DISEÑO: Comentado para mantener SplashScreen visible
        setIsLoading(false);
        console.log(
          '🔐 [INIT] Inicialización completada - isLoading=true (MODO DISEÑO)',
        );
      }
    };

    initializeAuth();
  }, []);

  // Mantener token FCM sincronizado cuando Firebase lo renueva.
  useEffect(() => {
    if (!token) return;

    const unsubscribe = onFCMTokenRefresh((newToken: string) => {
      authService.registerFCMTokenValue(newToken).catch((err: any) => {
        console.error('[FCM] Error syncing refreshed token:', err?.message);
      });
    });

    return unsubscribe;
  }, [token]);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);

      setToken(response.token);
      setUser(response.user);
      StorageHelper.setItem('user', JSON.stringify(response.user));
      StorageHelper.setItem('authToken', response.token);
      // 🔌 Conectar WebSocket
      socketService.connect();

      // Sincronizar isDriverMode con currentMode del usuario
      if (response.user?.currentMode === 'driver') {
        setIsDriverMode(true);
      } else {
        setIsDriverMode(false);
      }

      await requestInitialPermissions();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithToken = useCallback(
    async (authToken: string, userData: User) => {
      try {
        setIsLoading(true);

        console.log('🔐 [LOGIN] Sesión iniciada:', {
          userId: userData?.id,
          email: userData?.email,
        });

        setToken(authToken);
        setUser(userData);
        StorageHelper.setItem('user', JSON.stringify(userData));
        StorageHelper.setItem('authToken', authToken);
        // 🔌 Conectar WebSocket
        socketService.connect();

        // Sincronizar isDriverMode con currentMode del usuario
        if (userData?.currentMode === 'driver') {
          setIsDriverMode(true);
        } else {
          setIsDriverMode(false);
        }

        await requestInitialPermissions();
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      setToken(null);
      setIsDriverMode(false);

      // 🗑️ Limpiar estado de solicitud activa
      StorageHelper.removeItem('activeRideState');
      // 🔌 Desconectar WebSocket
      socketService.disconnect();
      console.log('🗑️ [AuthContext] Estado de solicitud limpiado en logout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupRequest): Promise<User> => {
    try {
      setIsLoading(true);
      const response = await authService.signup(data);

      setUser(response.user);
      StorageHelper.setItem('user', JSON.stringify(response.user));

      await requestInitialPermissions();

      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        const newUser = { ...prevUser, ...updatedData };
        StorageHelper.setItem('user', JSON.stringify(newUser));

        // Sincronizar isDriverMode si currentMode cambió
        if (updatedData.currentMode) {
          setIsDriverMode(updatedData.currentMode === 'driver');
        }

        return newUser;
      }
      return prevUser;
    });
  }, []);

  const setIsDriverModeCallback = useCallback((mode: boolean) => {
    setIsDriverMode(mode);
    // Actualizar el user.currentMode también
    setUser(prevUser => {
      if (prevUser) {
        const updatedUser: User = {
          ...prevUser,
          currentMode: mode ? 'driver' : 'passenger',
        };
        StorageHelper.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
      return prevUser;
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      await authService.refreshToken();
      // El interceptor se encargará de actualizar el token
    } catch (error) {
      console.error('Error refreshing auth:', error);
      await logout();
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    role: user?.role || null,
    isDriverMode,
    setIsDriverMode: setIsDriverModeCallback,
    login,
    loginWithToken,
    logout,
    signup,
    updateUser,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
