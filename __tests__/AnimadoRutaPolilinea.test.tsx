import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Polyline } from 'react-native-maps';
import { AnimadoRutaPolilinea } from "../src/components/AnimadoRutaPolilinea";

jest.mock('react-native-maps', () => ({ Polyline: 'Polyline' }));

test('mantiene la línea montada y completa el recorrido al volver a crearla', async () => {
  let siguienteFotograma: ((timestamp: number) => void) | undefined;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((funcionRetorno) => {
    siguienteFotograma = funcionRetorno;
    return 1;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  const coordenadas = [
  { latitude: -16.5, longitude: -68.1 },
  { latitude: -16.51, longitude: -68.11 },
  { latitude: -16.52, longitude: -68.12 }];

  const alCompletar = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  try {
    for (let generation = 0; generation < 2; generation++) {
      await act(() => {
        tree = Renderer.create(<AnimadoRutaPolilinea coordinates={coordenadas}
        strokeColor="purple" onComplete={alCompletar} />);
      });
      const linea = tree.root.findByType(Polyline);
      for (const marcaTiempo of [0, 1000, 2000]) {
        await act(() => siguienteFotograma?.(marcaTiempo));
        expect(tree.root.findByType(Polyline)).toBe(linea);
        expect(linea.props.coordinates.length).toBeGreaterThanOrEqual(2);
      }
      expect(linea.props.coordinates).toEqual(coordenadas);
      await act(() => siguienteFotograma?.(2016));
      expect(alCompletar).toHaveBeenCalledTimes(generation + 1);
      await act(() => tree.unmount());
    }
  } finally {
    jest.restoreAllMocks();
  }
});
