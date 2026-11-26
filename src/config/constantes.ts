// src/config/constantes.ts

// Para un dispositivo físico, usar la IP de la computadora en la misma red Wi-Fi.
//export const API_HOST = 'https://linealila-production.up.railway.app';
export const API_HOST = 'http://192.168.100.127:3000';
export const API_BASE_URL = `${API_HOST}/api`;

const ROSTRO_LIVENESS_HABILITADO = true;export { ROSTRO_LIVENESS_HABILITADO as ROSTRO_VITALIDAD_HABILITADO };

/** URL del servidor WebSocket (mismo host que la API) */
export const SOCKET_URL = API_HOST;

const SOCKET_CONFIGURACION = {
  /** Intervalo mínimo entre actualizaciones de ubicación via WebSocket (ms) */
  LOCATION_INTERVAL_MS: 2500
};export { SOCKET_CONFIGURACION };
