import { cacheTripHistoryManager } from '../src/utils/cacheManager';
import { StorageHelper } from '../src/services/storage';

jest.mock('../src/services/storage', () => ({
  StorageHelper: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const stored = new Map<string, string>();

beforeEach(() => {
  stored.clear();
  (StorageHelper.getItem as jest.Mock).mockImplementation((key: string) => stored.get(key) ?? null);
  (StorageHelper.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    stored.set(key, value);
  });
  (StorageHelper.removeItem as jest.Mock).mockImplementation((key: string) => {
    stored.delete(key);
  });
});

test('migra rutas antiguas a destinos únicos sin guardar sus orígenes', async () => {
  stored.set('linealila_trip_history', JSON.stringify([
    {
      id: 'reciente',
      pickupAddress: 'Origen A',
      pickupLocation: { latitude: -16.5, longitude: -68.1 },
      destinationAddress: 'Destino',
      destinationLocation: { latitude: -16.51, longitude: -68.12 },
      timestamp: 2,
    },
    {
      id: 'favorito',
      pickupAddress: 'Origen B',
      pickupLocation: { latitude: -16.6, longitude: -68.2 },
      destinationAddress: 'Destino',
      destinationLocation: { latitude: -16.51, longitude: -68.12 },
      timestamp: 1,
    },
  ]));
  stored.set('favoriteTripIds', JSON.stringify(['favorito']));

  const trips = await cacheTripHistoryManager.getTrips();

  expect(trips).toEqual([{
    id: 'reciente',
    destinationLocation: { latitude: -16.51, longitude: -68.12 },
    destinationAddress: 'Destino',
    count: 2,
    timestamp: 2,
  }]);
  expect(JSON.parse(stored.get('linealila_trip_history')!)[0]).not.toHaveProperty('pickupAddress');
  expect(JSON.parse(stored.get('favoriteTripIds')!)).toEqual(['reciente']);
});

test('volver a elegir el mismo destino no crea otra entrada', async () => {
  const destination = {
    destinationLocation: { latitude: -16.51, longitude: -68.12 },
    destinationAddress: 'Destino',
  };

  await cacheTripHistoryManager.addTrip(destination);
  await cacheTripHistoryManager.addTrip(destination);

  const trips = await cacheTripHistoryManager.getTrips();
  expect(trips).toHaveLength(1);
  expect(trips[0].count).toBe(2);
  expect(trips[0]).not.toHaveProperty('pickupLocation');
});
