jest.mock('../src/services/storage', () => ({ AlmacenamientoAuxiliar: {} }));

import { cacheRutaServicio } from '../src/services/cache.servicio';

describe('Cálculo de distancia', () => {
  test('PU-01: las mismas coordenadas dan cero', () => {
    expect(cacheRutaServicio.calcularDistancia(-16.5, -68.15, -16.5, -68.15)).toBe(0);
  });

  test('PU-02: un grado en el ecuador mide aproximadamente 111,195 km', () => {
    const distancia = cacheRutaServicio.calcularDistancia(0, 0, 0, 1);
    expect(Math.abs(distancia - 111.195)).toBeLessThan(0.001);
  });
});
