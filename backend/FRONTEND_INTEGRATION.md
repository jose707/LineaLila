# 🔗 Integración Backend-Frontend

## Configuración del Cliente API (Frontend)

### 1. Actualizar `src/services/api.client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api'; // ← Cambiar según entorno

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor para agregar token JWT
apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Interceptor para refrescar token si expira
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const token = await AsyncStorage.getItem('authToken');
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const newToken = response.data.token;
        await AsyncStorage.setItem('authToken', newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Token refresh falló, redirigir a login
        await AsyncStorage.removeItem('authToken');
        // Llamar a logout action
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
```

### 2. Actualizar `src/services/auth.service.ts`

```typescript
import apiClient from './api.client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async signup(data: SignupData) {
    const response = await apiClient.post('/auth/signup', data);
    const { token } = response.data;
    await AsyncStorage.setItem('authToken', token);
    return response.data;
  },

  async login(data: LoginData) {
    const response = await apiClient.post('/auth/login', data);
    const { token } = response.data;
    await AsyncStorage.setItem('authToken', token);
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  },

  async logout() {
    await AsyncStorage.removeItem('authToken');
  },

  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    const { token } = response.data;
    await AsyncStorage.setItem('authToken', token);
    return token;
  },
};
```

### 3. Actualizar `src/services/rides.service.ts`

```typescript
import apiClient from './api.client';

export const ridesService = {
  async createRide(rideData: {
    pickupLocation: any;
    dropoffLocation: any;
    distance: number;
    duration: number;
  }) {
    const response = await apiClient.post('/rides', rideData);
    return response.data.ride;
  },

  async getActiveRide() {
    try {
      const response = await apiClient.get('/rides/active');
      return response.data.ride;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No hay viaje activo
      }
      throw error;
    }
  },

  async getRideById(rideId: string) {
    const response = await apiClient.get(`/rides/${rideId}`);
    return response.data.ride;
  },

  async getRideHistory(limit = 10, offset = 0) {
    const response = await apiClient.get('/rides/history', {
      params: { limit, offset },
    });
    return response.data;
  },

  async acceptRide(rideId: string) {
    const response = await apiClient.put(`/rides/${rideId}/accept`);
    return response.data.ride;
  },

  async completeRide(
    rideId: string,
    rideData: {
      driverRating?: number;
      driverReview?: string;
    },
  ) {
    const response = await apiClient.put(`/rides/${rideId}/complete`, rideData);
    return response.data.ride;
  },

  async cancelRide(
    rideId: string,
    data: {
      reason: string;
      cancelledBy: 'passenger' | 'driver' | 'system';
    },
  ) {
    const response = await apiClient.put(`/rides/${rideId}/cancel`, data);
    return response.data.ride;
  },
};
```

### 4. Actualizar `src/services/user.service.ts`

```typescript
import apiClient from './api.client';

export const userService = {
  async getUserProfile(userId?: string) {
    const endpoint = userId ? `/users/${userId}` : '/users/profile';
    const response = await apiClient.get(endpoint);
    return response.data.user;
  },

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
    },
  ) {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data.user;
  },

  async updateProfilePhoto(userId: string, photoUrl: string) {
    const response = await apiClient.put(`/users/${userId}/photo`, {
      photoUrl,
    });
    return response.data;
  },

  async verifyPhone(userId: string, verificationCode: string) {
    const response = await apiClient.post(`/users/${userId}/verify-phone`, {
      verificationCode,
    });
    return response.data;
  },
};
```

## Manejo de Errores

### Estructura de respuesta de error del backend:

```typescript
// Error response
{
  error: "Descripción del error",
  status?: 400 | 401 | 403 | 404 | 500
}
```

### En el frontend, envolver llamadas API:

```typescript
try {
  const user = await authService.login({ email, password });
  // Éxito
} catch (error: any) {
  if (error.response?.status === 401) {
    Alert.alert('Error', 'Email o contraseña incorrectos');
  } else if (error.response?.status === 400) {
    Alert.alert('Error', error.response?.data?.error);
  } else {
    Alert.alert('Error', 'Error del servidor');
  }
}
```

## Testing de Endpoints

### Con Insomnia o Postman:

```bash
# 1. Signup
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "name": "Juan Test",
  "email": "juan@test.com",
  "phone": "+573001234567",
  "password": "password123",
  "confirmPassword": "password123"
}

# Respuesta esperada:
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-aquí",
    "name": "Juan Test",
    "email": "juan@test.com",
    "role": "user"
  }
}

# 2. Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "juan@test.com",
  "password": "password123"
}

# 3. Get Current User (protegido)
GET http://localhost:3000/api/auth/me
Authorization: Bearer <TOKEN_AQUÍ>

# 4. Create Ride
POST http://localhost:3000/api/rides
Authorization: Bearer <TOKEN_AQUÍ>
Content-Type: application/json

{
  "pickupLocation": {
    "latitude": 4.7110,
    "longitude": -74.0087,
    "address": "Carrera 7, Bogotá"
  },
  "dropoffLocation": {
    "latitude": 4.7169,
    "longitude": -74.0076,
    "address": "Calle 85, Bogotá"
  },
  "distance": 2.5,
  "duration": 12
}
```

## Variables de Entorno del Frontend

En archivo `.env` (o en las pantallas):

```env
# Para desarrollo
REACT_APP_API_URL=http://localhost:3000/api

# Para producción
REACT_APP_API_URL=https://api.linealila.com/api
```

## Context API para Estados Globales

```typescript
// src/context/AuthContext.tsx
import { createContext, useState, useCallback } from 'react';
import { authService } from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { user, token } = await authService.login({ email, password });
      setUser(user);
      setToken(token);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Flujo de Autenticación en Pantallas

```typescript
// LoginScreen.tsx
const handleLogin = async () => {
  try {
    setLoading(true);
    const result = await authService.login({
      email,
      password,
    });

    if (result) {
      // Guardar token
      await AsyncStorage.setItem('authToken', result.token);

      // Navegar según rol
      if (result.user.role === 'admin') {
        navigation.navigate('AdminNavigator');
      } else if (result.user.role === 'driver') {
        navigation.navigate('DriverNavigator');
      } else {
        navigation.navigate('ClientNavigator');
      }
    }
  } catch (error) {
    Alert.alert('Error', 'No se pudo iniciar sesión');
  } finally {
    setLoading(false);
  }
};
```

## Checklist de Integración

- [ ] Backend corriendo en localhost:3000
- [ ] Base de datos PostgreSQL sincronizada
- [ ] Actualizar API_BASE_URL en api.client.ts
- [ ] Probar endpoint /health
- [ ] Probar signup/login con Insomnia
- [ ] Conectar AuthContext al backend
- [ ] Guardar token en AsyncStorage
- [ ] Configurar JWT en headers (apiClient)
- [ ] Probar con pantalla de login real
- [ ] Verificar role-based navigation
- [ ] Probar refresh token
- [ ] Implementar manejo de errores 401

## Debugging

```typescript
// Agregar logs temporales
console.log('API Base URL:', API_BASE_URL);
console.log('Token:', await AsyncStorage.getItem('authToken'));
console.log('Response:', response.data);

// Usar Network tab en DevTools
// Usar Redux DevTools para inspeccionar estado
// Usar Reactotron para inspeccionar async storage
```

---

✅ **Frontend y Backend listos para integración**
