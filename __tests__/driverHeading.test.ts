import { normalizeHeading, resolveDriverHeading, updateDriverHeading } from '../src/utils/driverHeading';

const previous = { latitude: -16.5, longitude: -68.15, heading: 0 };

test('normalizes valid headings and rejects unavailable values', () => {
  expect(normalizeHeading(450)).toBe(90);
  expect(normalizeHeading('270')).toBe(270);
  expect(normalizeHeading(-1)).toBeUndefined();
  expect(normalizeHeading(null)).toBeUndefined();
});

test.each([
  ['north', -16.4999, -68.15, 0],
  ['east', -16.5, -68.1499, 90],
  ['south', -16.5001, -68.15, 180],
  ['west', -16.5, -68.1501, 270],
])('follows %s movement', (_direction, latitude, longitude, heading) => {
  expect(resolveDriverHeading(previous, {
    latitude: Number(latitude), longitude: Number(longitude),
  })).toBeCloseTo(Number(heading), 0);
});

test('does not guess a heading before the first movement', () => {
  expect(updateDriverHeading(null, { latitude: -16.5, longitude: -68.15 }, 1000).heading)
    .toBeUndefined();
});

test('keeps the last heading while stopped or when the GPS only drifts', () => {
  const northbound = { ...previous, heading: 90 };
  const smallDrift = { latitude: -16.5, longitude: -68.14999 };
  expect(resolveDriverHeading(northbound, smallDrift)).toBe(90);
  expect(resolveDriverHeading(northbound, northbound)).toBe(90);
});

test('accumulates short movements until there is enough displacement', () => {
  let state = updateDriverHeading(null, previous, 1000);
  for (let step = 1; step <= 4; step++) {
    state = updateDriverHeading(state, {
      latitude: -16.5, longitude: -68.15 + step * 0.00001,
    }, 1000 + step);
    expect(state.heading).toBe(0);
    expect(state.anchor).toBe(previous);
  }
  state = updateDriverHeading(state, { latitude: -16.5, longitude: -68.14995 }, 1005);
  expect(state.heading).toBeCloseTo(90, 0);
});

test('ignores jumps smaller than the reported GPS accuracy', () => {
  const state = updateDriverHeading(null, { ...previous, accuracy: 20 }, 1000);
  const next = updateDriverHeading(state, {
    latitude: -16.5, longitude: -68.1499, accuracy: 20,
  }, 1001);
  expect(next.heading).toBe(0);
  expect(next.anchor).toBe(state.anchor);
});

test('rejects repeated and out-of-order fixes without changing the heading', () => {
  const state = updateDriverHeading(null, previous, 2000);
  const current = { latitude: -16.5, longitude: -68.1499 };
  expect(updateDriverHeading(state, current, 2000)).toBe(state);
  expect(updateDriverHeading(state, current, 1000)).toBe(state);
});

test('updates the heading on a turn and preserves it after stopping', () => {
  let state = updateDriverHeading(null, previous, 1000);
  const east = { latitude: -16.5, longitude: -68.1499 };
  state = updateDriverHeading(state, east, 2000);
  expect(state.heading).toBeCloseTo(90, 0);
  const south = { ...east, latitude: -16.5001 };
  state = updateDriverHeading(state, south, 3000);
  expect(state.heading).toBeCloseTo(180, 0);
  expect(updateDriverHeading(state, south, 4000).heading).toBe(state.heading);
});

test('follows coordinates even when the supplied heading points elsewhere', () => {
  const state = updateDriverHeading(null, previous, 1000);
  expect(updateDriverHeading(state, {
    latitude: -16.5, longitude: -68.1499, heading: 270,
  }, 2000).heading).toBeCloseTo(90, 0);
});

test('rebases an inaccurate initial fix without treating improved precision as motion', () => {
  const state = updateDriverHeading(null, { ...previous, accuracy: 100 }, 1000);
  const precise = { latitude: -16.5, longitude: -68.1499, accuracy: 5 };
  const next = updateDriverHeading(state, precise, 2000);
  expect(next.anchor).toBe(precise);
  expect(next.heading).toBe(state.heading);
  expect(updateDriverHeading(next, { ...precise, longitude: -68.1498 }, 3000).heading)
    .toBeCloseTo(90, 0);
});
