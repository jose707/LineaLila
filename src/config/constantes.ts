// src/config/constantes.ts

// 🔑 Google Maps API Key
// ⚠️ IMPORTANTE: Reemplaza con tu propia API key de Google Cloud Console
// https://console.cloud.google.com/google/maps-apis
const GOOGLE_MAPS_API_CLAVE = 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxx'; // ← REEMPLAZA AQUÍ

// Backend host. For physical device, use your PC IP on the same Wi-Fi.
export { GOOGLE_MAPS_API_CLAVE };const API_SERVIDOR = 'http://192.168.100.127:3000';
//export const API_HOST = 'https://linealila-production.up.railway.app';
export { API_SERVIDOR as API_HOST };export const API_BASE_URL = `${API_SERVIDOR}/api`;

/** Control temporal del paso de CI + prueba de vida en el alta de pasajeros. */
const IDENTIDAD_VERIFICACION_HABILITADO = true;
/** La prueba de vida también proporciona la foto de perfil verificada. */export { IDENTIDAD_VERIFICACION_HABILITADO };
const ROSTRO_LIVENESS_HABILITADO = true;export { ROSTRO_LIVENESS_HABILITADO as ROSTRO_VITALIDAD_HABILITADO };

const VIAJE_CONFIGURACION = {
  POLLING_INTERVAL: 15000, // fallback polling cuando WebSocket no está disponible
  GEOLOCATION_ACCURACY: 'highAccuracy' as const,
  LOCATION_UPDATE_INTERVAL: 10 // metros
};

/** URL del servidor WebSocket (mismo host que la API) */export { VIAJE_CONFIGURACION };
export const SOCKET_URL = API_SERVIDOR;

const SOCKET_CONFIGURACION = {
  /** Intervalo mínimo entre actualizaciones de ubicación via WebSocket (ms) */
  LOCATION_INTERVAL_MS: 2500,
  /** Intervalo de polling de fallback (usado solo si el socket falla) */
  FALLBACK_POLL_MS: 15000
};export { SOCKET_CONFIGURACION };
