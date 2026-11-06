import { tamanoMarcadorTaxi } from "../src/utils/taxiMarcadorSize";

test('uses a balanced size at the usual zoom', () => {
  expect(tamanoMarcadorTaxi(0.02)).toBe(38);
});

test('grows gradually as the map zooms in', () => {
  expect(tamanoMarcadorTaxi(0.04)).toBe(34);
  expect(tamanoMarcadorTaxi(0.02)).toBe(38);
  expect(tamanoMarcadorTaxi(0.01)).toBe(42);
  expect(tamanoMarcadorTaxi(0.005)).toBe(46);
});

test('stays visible when zoomed out and does not become oversized when zoomed in', () => {
  expect(tamanoMarcadorTaxi(100)).toBe(30);
  expect(tamanoMarcadorTaxi(0.000001)).toBe(46);
});

test.each([0, -1, NaN, Infinity])('handles an invalid map span: %s', (latitudDelta) => {
  expect(tamanoMarcadorTaxi(latitudDelta)).toBe(38);
});

test('ignores imperceptible zoom changes', () => {
  expect(tamanoMarcadorTaxi(0.02001)).toBe(tamanoMarcadorTaxi(0.02));
});
