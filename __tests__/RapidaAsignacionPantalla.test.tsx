import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RapidoAsignacionPantalla from "../src/screens/RapidaAsignacionPantalla";
import RapidaReservaTarjeta from '../src/components/RapidaReservaTarjeta';
import type { RapidaAsignacionViaje } from '../src/types/rapidaAsignacion';
import { viajesServicio } from "../src/services/viajes.servicio";

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView'
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => void | (() => void)) => jest.requireActual('react').useEffect(efecto, [efecto])
}));
jest.mock('../src/context/AjustesContexto', () => ({
  usarAjustes: () => ({ settings: { darkMode: false } })
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
  driverName: 'Ana Rojas Loza',
  driverRating: 4.5,
  driverTrips: 0,
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

test.each([true, false])('muestra al pasajero en la reserva del conductor con verificación %s', async verified => {
  const reserva: RapidaAsignacionViaje = {
    ...viaje,
    status: 'solicitado',
    requestMode: 'asignacion_rapida',
    passenger: { name: 'María Elena Paz Flores', photo: 'https://example.com/pasajero.jpg', verified, rating: 4.8, trips: 1 }
  };
  await act(() => {
    tree = Renderer.create(<RapidaReservaTarjeta ride={reserva} segundosRestantes={10} driver />);
  });
  expect(salida()).toContain('María Elena Paz Flores');
  expect(salida()).toContain('Calificación 4.8 de 5');
  expect(salida()).toContain('"1"," ","viaje"');
  expect(salida()).toContain('https://example.com/pasajero.jpg');
  expect(salida().includes('Verificado')).toBe(verified);
  expect(salida()).not.toContain('ABC123');
  expect(salida()).toContain('Destino');
  expect(salida()).toContain('Parada central');
});

const datos = (segundosRestantes = 60, status = 'solicitado') => ({
  ride: { ...viaje, status, driverId: null, vehicle: null, driverName: null },
  serverTime: new Date().toISOString(), segundosRestantes
});
async function abrir() {
  await act(async () => {
    tree = Renderer.create(<RapidoAsignacionPantalla
      route={{ params: { rideId: viaje.id, request: solicitud, initialSnapshot: datos() } } as any}
      navigation={navegacion as any} />);
  });
}

test('espera al conductor sin pedir confirmación ni mostrar un temporizador al pasajero', async () => {
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos());
  await abrir();
  expect(salida()).toContain('Buscando conductor');
  expect(salida()).not.toContain('Tiempo restante');
  expect(salida()).not.toContain('ABC123');
  expect(salida()).not.toContain('Confirmar por');
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos(47));
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(salida()).toContain('Buscando conductor');
  expect(viajesServicio.confirmarAsignacionRapida).not.toHaveBeenCalled();
});

test('el pasajero puede cancelar la búsqueda', async () => {
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos());
  (viajesServicio.cancelarAsignacionRapida as jest.Mock).mockResolvedValue(datos(0, 'cancelado'));
  await abrir();
  const cancelar = tree.root.findAllByProps({ accessibilityRole: 'button' })[0];
  await act(async () => { await cancelar.props.onPress(); });
  expect(viajesServicio.cancelarAsignacionRapida).toHaveBeenCalledWith(viaje.id);
  expect(navegacion.navigate).toHaveBeenCalledWith('Map', expect.objectContaining({ quickAssignmentCancelled: true }));
});

test('abre el viaje cuando el servidor confirma que el conductor aceptó', async () => {
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos());
  await abrir();
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos(0, 'aceptado'));
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(navegacion.replace).toHaveBeenCalledWith('PassengerActiveRide', { rideId: viaje.id });
});

test('un contador en cero espera el estado definitivo del servidor antes de volver al mapa', async () => {
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos(0));
  await abrir();
  expect(navegacion.navigate).not.toHaveBeenCalled();
  expect(salida()).toContain('Buscando conductor');
  (viajesServicio.obtenerAsignacionRapida as jest.Mock).mockResolvedValue(datos(0, 'vencido'));
  await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
  expect(navegacion.navigate).toHaveBeenCalledWith('Map', expect.objectContaining({
    quickAssignmentNotice: 'No encontramos un conductor disponible. Puedes volver a intentarlo.'
  }));
});
