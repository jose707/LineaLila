import type { GuardadoLugar } from '../components/SavedPlacesModal';
import { AlmacenamientoAuxiliar } from '../services/storage';

const clave = (usuarioId: string) => `linealila_saved_places:${usuarioId}`;

export function leerLugaresGuardados(usuarioId: string): GuardadoLugar[] {
  try {
    const lugares = JSON.parse(AlmacenamientoAuxiliar.obtenerElemento(clave(usuarioId)) ?? '[]');
    return Array.isArray(lugares) ? lugares.filter(lugar =>
      lugar && ['home', 'work', 'favorite'].includes(lugar.type) &&
      typeof lugar.id === 'string' && typeof lugar.label === 'string' && typeof lugar.address === 'string' &&
      Number.isFinite(lugar.latitude) && Number.isFinite(lugar.longitude)) : [];
  } catch {
    return [];
  }
}

export function guardarLugares(usuarioId: string, lugares: GuardadoLugar[]) {
  AlmacenamientoAuxiliar.establecerElemento(clave(usuarioId), JSON.stringify(lugares));
}

export function idLugarFavorito({ latitude, longitude }: Pick<GuardadoLugar, 'latitude' | 'longitude'>) {
  return `fav:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}
