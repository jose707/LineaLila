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
function Pantalla({ enfocado = true }: { enfocado?: boolean }) {
  const montado = React.useRef(true);
  resultado = usarRutaViajeActivo(viaje, enfocado, montado, false);
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
  expect(viajesServicio.obtenerRutaViaje).toHaveBeenLastCalledWith('viaje', false);
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
