import { cacheViajeHistorialGestor } from "../src/utils/cacheGestor";
import { AlmacenamientoAuxiliar } from '../src/services/storage';

jest.mock('../src/services/storage', () => ({
  AlmacenamientoAuxiliar: {
    obtenerElemento: jest.fn(),
    establecerElemento: jest.fn(),
    quitarElemento: jest.fn()
  }
}));

const almacenado = new Map<string, string>();

beforeEach(() => {
  almacenado.clear();
  (AlmacenamientoAuxiliar.obtenerElemento as jest.Mock).mockImplementation((clave: string) => almacenado.get(clave) ?? null);
  (AlmacenamientoAuxiliar.establecerElemento as jest.Mock).mockImplementation((clave: string, valor: string) => {
    almacenado.set(clave, valor);
  });
  (AlmacenamientoAuxiliar.quitarElemento as jest.Mock).mockImplementation((clave: string) => {
    almacenado.delete(clave);
  });
});

test('migra rutas antiguas a destinos únicos sin guardar sus orígenes', async () => {
  almacenado.set('linealila_trip_history', JSON.stringify([
  {
    id: 'reciente',
    pickupAddress: 'Origen A',
    pickupLocation: { latitude: -16.5, longitude: -68.1 },
    destinationAddress: 'Destino',
    destinationLocation: { latitude: -16.51, longitude: -68.12 },
    timestamp: 2
  },
  {
    id: 'favorito',
    pickupAddress: 'Origen B',
    pickupLocation: { latitude: -16.6, longitude: -68.2 },
    destinationAddress: 'Destino',
    destinationLocation: { latitude: -16.51, longitude: -68.12 },
    timestamp: 1
  }]
  ));
  almacenado.set('favoriteTripIds', JSON.stringify(['favorito']));

  const viajes = await cacheViajeHistorialGestor.obtenerViajes();

  expect(viajes).toEqual([{
    id: 'reciente',
    destinationLocation: { latitude: -16.51, longitude: -68.12 },
    destinationAddress: 'Destino',
    count: 2,
    timestamp: 2
  }]);
  expect(JSON.parse(almacenado.get('linealila_trip_history')!)[0]).not.toHaveProperty('pickupAddress');
  expect(JSON.parse(almacenado.get('favoriteTripIds')!)).toEqual(['reciente']);
});

test('volver a elegir el mismo destino no crea otra entrada', async () => {
  const destino = {
    destinationLocation: { latitude: -16.51, longitude: -68.12 },
    destinationAddress: 'Destino'
  };

  await cacheViajeHistorialGestor.agregarViaje(destino);
  await cacheViajeHistorialGestor.agregarViaje(destino);

  const viajes = await cacheViajeHistorialGestor.obtenerViajes();
  expect(viajes).toHaveLength(1);
  expect(viajes[0].count).toBe(2);
  expect(viajes[0]).not.toHaveProperty('pickupLocation');
});
