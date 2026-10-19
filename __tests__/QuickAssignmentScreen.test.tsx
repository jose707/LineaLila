import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import QuickAssignmentScreen from '../src/screens/QuickAssignmentScreen';
import { ridesService } from '../src/services/rides.service';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('../src/services/rides.service', () => ({
  ridesService: {
    getQuick: jest.fn(),
    confirmQuick: jest.fn(),
    cancelQuick: jest.fn(),
  },
}));
jest.mock('../src/services/socket.service', () => ({
  __esModule: true,
  default: { on: jest.fn(), off: jest.fn() },
}));
let tree: Renderer.ReactTestRenderer;
const navigation = { replace: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };
const request = {
  requestKey: 'quick_test_request_123',
  pickupLocation: { latitude: -16.5, longitude: -68.1, address: 'Origen' },
  dropoffLocation: { latitude: -16.6, longitude: -68.2, address: 'Destino' },
  waypoints: [{ latitude: -16.55, longitude: -68.15, address: 'Parada central' }],
};
const ride = {
  id: 'ride1',
  status: 'requested',
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
  vehicle: { brand: 'Toyota', model: 'Yaris', plate: 'ABC123' },
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.useRealTimers();
});
const output = () => JSON.stringify(tree.toJSON());
test('muestra la reserva asignada de inmediato y mantiene la cuenta del servidor', async () => {
  const data = {
    ride: { ...ride, expiresAt: new Date(Date.now() + 20000).toISOString() },
    serverTime: new Date().toISOString(),
  };
  (ridesService.getQuick as jest.Mock).mockImplementation(() =>
    Promise.resolve({ ...data, serverTime: new Date().toISOString() }),
  );
  await act(async () => {
    tree = Renderer.create(
      <QuickAssignmentScreen
        route={{ params: { rideId: ride.id, request, initialSnapshot: data } } as any}
        navigation={navigation as any}
      />,
    );
  });
  expect(output()).not.toContain('Creando solicitud');
  expect(output()).not.toContain('Localizando conductores cercanos');
  expect(output()).toContain('Viaje asignado');
  expect(output()).toContain('ABC123');
  expect(output()).toContain('Parada central');
  expect(output()).toContain('P1');
  expect(output()).not.toContain('PARADA 1');
  expect(output()).toContain('00:20');
  for (let second = 0; second < 5; second++)
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  expect(output()).toContain('00:15');
  expect(ridesService.getQuick).toHaveBeenCalledWith('ride1');
});
test('recupera una reserva activa al abrir la vista sin datos iniciales', async () => {
  (ridesService.getQuick as jest.Mock).mockResolvedValue({
    ride,
    serverTime: new Date().toISOString(),
  });
  await act(async () => {
    tree = Renderer.create(
      <QuickAssignmentScreen
        route={{ params: { rideId: ride.id } } as any}
        navigation={navigation as any}
      />,
    );
  });
  expect(output()).toContain('Viaje asignado');
  expect(output()).toContain('ABC123');
  expect(output()).not.toContain('Creando solicitud');
});
