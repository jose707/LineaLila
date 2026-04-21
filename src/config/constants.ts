// src/config/constants.ts

// 🔑 Google Maps API Key
// ⚠️ IMPORTANTE: Reemplaza con tu propia API key de Google Cloud Console
// https://console.cloud.google.com/google/maps-apis
export const GOOGLE_MAPS_API_KEY = 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxx'; // ← REEMPLAZA AQUÍ

// Backend host. For physical device, use your PC IP on the same Wi-Fi.
// Example: http://192.168.100.133:3000
export const API_HOST = 'http://192.168.100.133:3000';
export const API_BASE_URL = `${API_HOST}/api`;

export const RIDE_CONFIG = {
  POLLING_INTERVAL: 15000, // fallback polling cuando WebSocket no está disponible
  GEOLOCATION_ACCURACY: 'highAccuracy' as const,
  LOCATION_UPDATE_INTERVAL: 10, // metros
};

/** URL del servidor WebSocket (mismo host que la API) */
export const SOCKET_URL = API_HOST;

export const SOCKET_CONFIG = {
  /** Intervalo mínimo entre actualizaciones de ubicación via WebSocket (ms) */
  LOCATION_INTERVAL_MS: 2500,
  /** Intervalo de polling de fallback (usado solo si el socket falla) */
  FALLBACK_POLL_MS: 15000,
};
