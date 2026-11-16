import type { NavigationContainerRef } from '@react-navigation/native';
import type { RaizPilaParametroLista } from './AplicacionNavegador';

export function obtenerPantallaInicio(rol?: string | null) {
  if (rol === 'administrador') return 'AdminDashboard';
  if (rol === 'conductor') return 'DriverHome';
  return 'Map';
}

type Navegacion = Pick<NavigationContainerRef<RaizPilaParametroLista>,
  'isReady' | 'canGoBack' | 'resetRoot'> & {
  getCurrentRoute(): { name: string } | undefined;
  getRootState(): { routeNames: readonly string[] } | undefined;
};

export function manejarRetrocesoSinHistorial(navegacion: Navegacion, inicio: ReturnType<typeof obtenerPantallaInicio>) {
  if (!navegacion.isReady()) return true;
  if (navegacion.canGoBack()) return false;

  const actual = navegacion.getCurrentRoute()?.name;
  if (actual === 'Map') return false;
  if (actual !== inicio && navegacion.getRootState()?.routeNames.includes(inicio)) {
    navegacion.resetRoot({ index: 0, routes: [{ name: inicio }] });
  }
  return true;
}
