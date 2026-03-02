// src/config/constants.ts

// 🔑 Google Maps API Key
// ⚠️ IMPORTANTE: Reemplaza con tu propia API key de Google Cloud Console
// https://console.cloud.google.com/google/maps-apis
export const GOOGLE_MAPS_API_KEY = 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxx'; // ← REEMPLAZA AQUÍ

export const API_BASE_URL = 'http://192.168.1.100:3000/api';

export const RIDE_CONFIG = {
  POLLING_INTERVAL: 5000, // 5 segundos
  GEOLOCATION_ACCURACY: 'highAccuracy' as const,
  LOCATION_UPDATE_INTERVAL: 10, // metros
};
