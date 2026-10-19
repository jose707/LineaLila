import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Polyline } from 'react-native-maps';
import { AnimatedRoutePolyline } from '../src/components/AnimatedRoutePolyline';

jest.mock('react-native-maps', () => ({ Polyline: 'Polyline' }));

test('mantiene la línea montada y completa el recorrido al volver a crearla', async () => {
  let nextFrame: ((timestamp: number) => void) | undefined;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    nextFrame = callback;
    return 1;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  const coordinates = [
    { latitude: -16.5, longitude: -68.1 },
    { latitude: -16.51, longitude: -68.11 },
    { latitude: -16.52, longitude: -68.12 },
  ];
  const onComplete = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  try {
    for (let generation = 0; generation < 2; generation++) {
      await act(() => {
        tree = Renderer.create(<AnimatedRoutePolyline coordinates={coordinates}
          strokeColor="purple" onComplete={onComplete} />);
      });
      const line = tree.root.findByType(Polyline);
      for (const timestamp of [0, 1000, 2000]) {
        await act(() => nextFrame?.(timestamp));
        expect(tree.root.findByType(Polyline)).toBe(line);
        expect(line.props.coordinates.length).toBeGreaterThanOrEqual(2);
      }
      expect(line.props.coordinates).toEqual(coordinates);
      await act(() => nextFrame?.(2016));
      expect(onComplete).toHaveBeenCalledTimes(generation + 1);
      await act(() => tree.unmount());
    }
  } finally {
    jest.restoreAllMocks();
  }
});
