import { manejarRetrocesoSinHistorial, obtenerPantallaInicio } from '../src/navigation/retrocesoAplicacion';

const crearNavegacion = (name: string, routeNames: string[], conHistorial = false) => ({
  isReady: () => true,
  canGoBack: () => conHistorial,
  getCurrentRoute: () => ({ name }),
  getRootState: () => ({ routeNames }),
  resetRoot: jest.fn()
});

test('deja que Notificaciones vuelva a la pantalla anterior cuando hay historial', () => {
  const navegacion = crearNavegacion('Notifications', ['Map', 'Profile', 'Notifications'], true);
  expect(manejarRetrocesoSinHistorial(navegacion, 'Map')).toBe(false);
  expect(navegacion.resetRoot).not.toHaveBeenCalled();
});

test.each(['user', 'conductor', 'administrador'])('vuelve al inicio del rol %s si Notificaciones quedó sin historial', rol => {
  const inicio = obtenerPantallaInicio(rol);
  const navegacion = crearNavegacion('Notifications', [inicio, 'Notifications']);
  expect(manejarRetrocesoSinHistorial(navegacion, inicio)).toBe(true);
  expect(navegacion.resetRoot).toHaveBeenCalledWith({ index: 0, routes: [{ name: inicio }] });
});

test('delega la salida al mapa y la impide en los demás inicios', () => {
  expect(manejarRetrocesoSinHistorial(crearNavegacion('Map', ['Map']), 'Map')).toBe(false);
  for (const inicio of ['DriverHome', 'AdminDashboard'] as const) {
    const navegacion = crearNavegacion(inicio, [inicio]);
    expect(manejarRetrocesoSinHistorial(navegacion, inicio)).toBe(true);
    expect(navegacion.resetRoot).not.toHaveBeenCalled();
  }
});
