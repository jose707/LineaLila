import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { usarRutaViajeActivo } from '../src/hooks/usarRutaViajeActivo';
import type { ActivoViaje } from '../src/hooks/usarConexionViajeActivo';
import { viajesServicio } from '../src/services/viajes.servicio';

jest.mock('../src/services/viajes.servicio', () => ({
  viajesServicio: { obtenerRutaViaje: jest.fn() }
}));

const viaje = {
  rideId: 'viaje', status: 'llegado',
  pickupLocation: { latitude: -16.5, longitude: -68.15 },
  dropoffLocation: { latitude: -16.52, longitude: -68.15 }
} as ActivoViaje;

let resultado: ReturnType<typeof usarRutaViajeActivo>;
let pantalla: Renderer.ReactTestRenderer;
function Pantalla({ enfocado = true, datos = viaje, pasajero = false }: {
  enfocado?: boolean; datos?: ActivoViaje; pasajero?: boolean;
}) {
  const montado = React.useRef(true);
  resultado = usarRutaViajeActivo(datos, enfocado, montado, pasajero);
  return null;
}

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(async () => {
  await act(() => pantalla?.unmount());
  jest.useRealTimers();
});

test('recupera automáticamente el trazado tras un fallo al marcar la llegada', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje)
    .mockRejectedValueOnce(new Error('Conexión temporal'))
    .mockResolvedValue({ polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' });
  await act(() => { pantalla = Renderer.create(<Pantalla />); });
  expect(resultado.rutaError).toBe(true);
  await act(() => jest.advanceTimersByTime(5000));
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(2);
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenLastCalledWith('viaje', false, false);
  expect(resultado.rutaError).toBe(false);
  expect(resultado.rutaCoordenadas).toHaveLength(3);
});

test('detiene los reintentos al salir de la pantalla y recupera al regresar', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockRejectedValue(new Error('Sin conexión'));
  await act(() => { pantalla = Renderer.create(<Pantalla />); });
  await act(() => pantalla.update(<Pantalla enfocado={false} />));
  await act(() => jest.advanceTimersByTime(10000));
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(1);
  await act(() => pantalla.update(<Pantalla />));
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(2);
});


test('traza hacia la recogida desde que el conductor acepta y obtiene su tiempo de llegada', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockResolvedValue({
    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', duration: 180
  });
  await act(() => {
    pantalla = Renderer.create(<Pantalla datos={{ ...viaje, status: 'aceptado' }} />);
  });
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(1);
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledWith('viaje', false, true);
  expect(resultado.rutaCoordenadas).toHaveLength(3);
  expect(resultado.minutosEstimados).toBe(3);
  expect(resultado.rutaError).toBe(false);
});

test('al llegar descarta el trazado a recogida mientras carga el recorrido del viaje', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockResolvedValue({
    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
  });
  await act(() => {
    pantalla = Renderer.create(<Pantalla datos={{ ...viaje, status: 'aceptado' }} />);
  });
  let resolver!: (ruta: { polyline: string }) => void;
  jest.mocked(viajesServicio.obtenerRutaViaje).mockImplementationOnce(() => new Promise(res => { resolver = res; }));
  await act(() => pantalla.update(<Pantalla datos={{ ...viaje, status: 'llegado' }} />));
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenLastCalledWith('viaje', false, false);
  expect(resultado.rutaCoordenadas).toBeNull();
  await act(() => resolver({ polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }));
  expect(resultado.rutaCoordenadas).toHaveLength(3);
});

test('el pasajero conserva solo la estimación de recogida antes de la llegada', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockResolvedValue({
    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', duration: 240
  });
  await act(() => {
    pantalla = Renderer.create(<Pantalla datos={{ ...viaje, status: 'aceptado' }} pasajero />);
  });
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(1);
  expect(resultado.rutaCoordenadas).toBeNull();
  expect(resultado.minutosEstimados).toBe(4);
});

test('acepta el trazado de un punto cuando Google confirma distancia cero hasta la recogida', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockResolvedValue({
    polyline: '_p~iF~ps|U', duration: 0, distance: 0
  });
  await act(() => {
    pantalla = Renderer.create(<Pantalla datos={{ ...viaje, status: 'aceptado',
      driverLocation: { latitude: 38.5, longitude: -120.2 } }} />);
  });
  expect(resultado.rutaError).toBe(false);
  expect(resultado.rutaCoordenadas).toHaveLength(1);
  await act(() => jest.advanceTimersByTime(10000));
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(1);
});

test('un punto aislado con distancia mayor que cero sigue siendo un trazado inválido', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockResolvedValue({
    polyline: '_p~iF~ps|U', duration: 100, distance: 200
  });
  await act(() => {
    pantalla = Renderer.create(<Pantalla datos={{ ...viaje, status: 'aceptado' }} />);
  });
  expect(resultado.rutaError).toBe(true);
  expect(resultado.rutaCoordenadas).toBeNull();
});

test('recalcula si el conductor se aleja del punto de una ruta de distancia cero', async () => {
  jest.mocked(viajesServicio.obtenerRutaViaje).mockResolvedValueOnce({
    polyline: '_p~iF~ps|U', duration: 0, distance: 0
  }).mockResolvedValue({ polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', duration: 180, distance: 500 });
  const datos = { ...viaje, status: 'aceptado', driverLocation: { latitude: 38.5, longitude: -120.2 } } as ActivoViaje;
  await act(() => { pantalla = Renderer.create(<Pantalla datos={datos} />); });
  for (let i = 0; i < 3; i++) {
    await act(() => pantalla.update(<Pantalla datos={{ ...datos,
      driverLocation: { latitude: 38.501 + i * 0.0001, longitude: -120.2 } }} />));
  }
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenCalledTimes(2);
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenLastCalledWith('viaje', false, true);
  expect(resultado.rutaCoordenadas).toHaveLength(3);
  expect(resultado.rutaError).toBe(false);
});
