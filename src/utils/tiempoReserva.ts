import type { RapidaAsignacionRespuesta } from '../types/rapidaAsignacion';

export function tiempoRestanteReserva(respuesta: RapidaAsignacionRespuesta | null): number | null {
  if (!respuesta?.ride || respuesta.ride.status !== 'solicitado') return null;
  if (typeof respuesta.segundosRestantes === 'number' && Number.isFinite(respuesta.segundosRestantes)) {
    return Math.max(0, Math.ceil(respuesta.segundosRestantes));
  }

  // Las versiones anteriores ya devuelven el vencimiento y la hora del servidor.
  const diferencia = Date.parse(respuesta.ride.expiresAt) - Date.parse(respuesta.serverTime);
  return Number.isFinite(diferencia) ? Math.max(0, Math.ceil(diferencia / 1000)) : null;
}
