import { distanciaARuta, actualizarDesvio } from '../src/utils/desvioRuta';

test('mide contra los segmentos y tolera vértices duplicados', () => {
  const a = {latitude: -16.5, longitude: -68.1};
  const b = {latitude: -16.5, longitude: -68.08};
  expect(distanciaARuta({latitude: -16.5, longitude: -68.09}, [a, a, b])).toBeLessThan(1);
  expect(distanciaARuta({latitude: -16.501, longitude: -68.09}, [a, b])).toBeGreaterThan(100);
});

test('confirma tres muestras, reinicia al volver y limita reintentos', () => {
  const estado = {muestras: 0, ultimoIntento: 0};
  expect(actualizarDesvio(estado, 90, 100000)).toBe(false);
  expect(actualizarDesvio(estado, 10, 102500)).toBe(false);
  expect(actualizarDesvio(estado, 90, 105000)).toBe(false);
  expect(actualizarDesvio(estado, 90, 107500)).toBe(false);
  expect(actualizarDesvio(estado, 90, 110000)).toBe(true);
  for (let i = 1; i <= 11; i++) expect(actualizarDesvio(estado, 90, 110000 + i * 2500)).toBe(false);
  expect(actualizarDesvio(estado, 90, 140000)).toBe(true);
});
