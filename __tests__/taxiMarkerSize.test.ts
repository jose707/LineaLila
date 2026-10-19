import { taxiMarkerSize } from '../src/utils/taxiMarkerSize';

test('uses a balanced size at the usual zoom', () => {
  expect(taxiMarkerSize(0.02)).toBe(38);
});

test('grows gradually as the map zooms in', () => {
  expect(taxiMarkerSize(0.04)).toBe(34);
  expect(taxiMarkerSize(0.02)).toBe(38);
  expect(taxiMarkerSize(0.01)).toBe(42);
  expect(taxiMarkerSize(0.005)).toBe(46);
});

test('stays visible when zoomed out and does not become oversized when zoomed in', () => {
  expect(taxiMarkerSize(100)).toBe(30);
  expect(taxiMarkerSize(0.000001)).toBe(46);
});

test.each([0, -1, NaN, Infinity])('handles an invalid map span: %s', latitudeDelta => {
  expect(taxiMarkerSize(latitudeDelta)).toBe(38);
});

test('ignores imperceptible zoom changes', () => {
  expect(taxiMarkerSize(0.02001)).toBe(taxiMarkerSize(0.02));
});

