const DEFAULT_SIZE = 38;
const MIN_SIZE = 30;
const MAX_SIZE = 46;
const REFERENCE_LATITUDE_DELTA = 0.02;

function boundedSize(size: number): number {
  return Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, size)) * 2) / 2;
}

/** Ajuste gradual: cada nivel de acercamiento añade 4 puntos al largo del taxi. */
export function taxiMarkerSize(latitudeDelta: number): number {
  if (!Number.isFinite(latitudeDelta) || latitudeDelta <= 0) return DEFAULT_SIZE;
  const zoomDifference = Math.log2(REFERENCE_LATITUDE_DELTA / latitudeDelta);
  // Evita redibujar el marcador por cambios imperceptibles mientras se mueve el mapa.
  return boundedSize(DEFAULT_SIZE + zoomDifference * 4);
}

