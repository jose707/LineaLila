import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RapidoAsignacionPantalla from "../src/screens/RapidaAsignacionPantalla";
import { viajesServicio } from "../src/services/viajes.servicio";

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView'
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => void | (() => void)) => jest.requireActual('react').useEffect(efecto, [efecto])
}));
jest.mock("../src/services/viajes.servicio", () => ({
  viajesServicio: {
    obtenerAsignacionRapida: jest.fn(),
    confirmarAsignacionRapida: jest.fn(),
    cancelarAsignacionRapida: jest.fn()
  }
}));
jest.mock("../src/services/socket.servicio", () => ({
  __esModule: true,
  default: { al: jest.fn(), desactivado: jest.fn() }
}));
let tree: Renderer.ReactTestRenderer;
const navegacion = { replace: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };
const solicitud = {
  requestKey: 'quick_test_request_123',
  pickupLocation: { latitude: -16.5, longitude: -68.1, address: 'Origen' },
  dropoffLocation: { latitude: -16.6, longitude: -68.2, address: 'Destino' },
  waypoints: [{ latitude: -16.55, longitude: -68.15, address: 'Parada central' }]
};
const viaje = {
  id: 'ride1',
  status: 'solicitado',
  expiresAt: new Date(Date.now() + 20000).toISOString(),
  pickupDistance: 1200,
  pickupDuration: 180,
  totalFare: 15,
  finalFare: 17,
  pickupSurcharge: 2,
  pickup_address: 'Origen',
  dropoff_address: 'Destino',
  stops: [{ sequence: 1, address: 'Parada central' }],
  driverName: 'Ana',
  vehicle: { brand: 'Toyota', model: 'Yaris', plate: 'ABC123' }
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.useRealTimers();
});
const salida = () => JSON.stringify(tree.toJSON());
test('muestra la reserva asignada de inmediato y mantiene la cuenta del servidor', async () => {
  const datos = {
    ride: { ...viaje, expiresAt: new Date(Date.now() + 20000).toISOString() },
    serverTime: new Date().toISOString(),
    segundosRestantes: 20
  };
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos);
  await act(async () => {
    tree = Renderer.create(
      <RapidoAsignacionPantalla
        route={{ params: { rideId: viaje.id, request: solicitud, initialSnapshot: datos } } as any}
        navigation={navegacion as any} />

    );
  });
  expect(salida()).not.toContain('Creando solicitud');
  expect(salida()).not.toContain('Localizando conductores cercanos');
  expect(salida()).toContain('Viaje asignado');
  expect(salida()).toContain('ABC123');
  expect(salida()).toContain('Parada central');
  expect(salida()).toContain('P1');
  expect(salida()).not.toContain('PARADA 1');
  expect(salida()).toContain('00:20');
  // El reloj del teléfono avanza pero el contador conserva el valor del servidor.
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  expect(salida()).toContain('00:20');
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue({ ...datos, segundosRestantes: 13 });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  expect(salida()).toContain('00:13');
  expect(viajesServicio.obtenerAsignacionRapida).toHaveBeenCalledWith('ride1');
});
test('recupera y permite confirmar una reserva con la respuesta anterior del servidor', async () => {
  const vencimiento = '2026-11-06T17:00:20.000Z';
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue({
    ride: { ...viaje, expiresAt: vencimiento },
    serverTime: '2026-11-06T17:00:00.000Z'
  });
  await act(async () => {
    tree = Renderer.create(
      <RapidoAsignacionPantalla
        route={{ params: { rideId: viaje.id } } as any}
        navigation={navegacion as any} />

    );
  });
  expect(salida()).toContain('Viaje asignado');
  expect(salida()).toContain('00:20');
  const confirmar = tree.root.findAllByProps({ accessibilityRole: 'button' })[0];
  expect(confirmar.props.disabled).toBe(false);
  (viajesServicio.confirmarAsignacionRapida as jest.Mock).mockResolvedValue({
    ride: { ...viaje, status: 'aceptado' }, serverTime: vencimiento, segundosRestantes: 0
  });
  await act(async () => confirmar.props.onPress());
  expect(navegacion.replace).toHaveBeenCalledWith('ActiveRide', { rideId: viaje.id });
  expect(salida()).toContain('ABC123');
  expect(salida()).not.toContain('Creando solicitud');
});
