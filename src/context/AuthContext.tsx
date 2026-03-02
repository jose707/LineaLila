// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { authService } from '../services/auth.service';
import { StorageHelper } from '../services/storage';
import { User, UserRole } from '../types/models';
import { LoginRequest, SignupRequest } from '../types/api';

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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDriverMode, setIsDriverMode] = useState(false);

  // Inicializar sesión al montar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUserStr = StorageHelper.getItem('user');
        const savedToken = StorageHelper.getItem('authToken');
        const savedDriverMode = StorageHelper.getItem('driverMode');

        if (savedUserStr) {
          setUser(JSON.parse(savedUserStr));
        }
        if (savedToken) {
          setToken(savedToken);
        }
        if (savedDriverMode === 'true') {
          setIsDriverMode(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);

      setToken(response.token);
      setUser(response.user);
      StorageHelper.setItem('user', JSON.stringify(response.user));
      StorageHelper.setItem('authToken', response.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithToken = useCallback(
    async (authToken: string, userData: User) => {
      try {
        setIsLoading(true);
        setToken(authToken);
        setUser(userData);
        StorageHelper.setItem('user', JSON.stringify(userData));
        StorageHelper.setItem('authToken', authToken);
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
      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(
    (updatedData: Partial<User>) => {
      if (user) {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        StorageHelper.setItem('user', JSON.stringify(newUser));
      }
    },
    [user],
  );

  const setIsDriverModeCallback = useCallback((mode: boolean) => {
    setIsDriverMode(mode);
    StorageHelper.setItem('driverMode', mode ? 'true' : 'false');
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
