const TAMANO_PREDETERMINADO = 38;
const TAMANO_MINIMO = 30;
const TAMANO_MAXIMO = 46;
const DELTA_LATITUD_REFERENCIA = 0.02;

function limitarTamano(tamano: number): number {
  return Math.round(Math.max(TAMANO_MINIMO, Math.min(TAMANO_MAXIMO, tamano)) * 2) / 2;
}

/** Ajuste gradual: cada nivel de acercamiento añade 4 puntos al largo del taxi. */
export function tamanoMarcadorTaxi(deltaLatitud: number): number {
  if (!Number.isFinite(deltaLatitud) || deltaLatitud <= 0) return TAMANO_PREDETERMINADO;
  const diferenciaAcercamiento = Math.log2(DELTA_LATITUD_REFERENCIA / deltaLatitud);
  // Evita redibujar el marcador por cambios imperceptibles mientras se mueve el mapa.
  return limitarTamano(TAMANO_PREDETERMINADO + diferenciaAcercamiento * 4);
}
