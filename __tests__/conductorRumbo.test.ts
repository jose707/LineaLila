import { normalizarRumbo, resolverConductorRumbo, actualizarConductorRumbo } from "../src/utils/conductorRumbo";

const anterior = { latitude: -16.5, longitude: -68.15, heading: 0 };

test('normalizes valid headings and rejects unavailable values', () => {
  expect(normalizarRumbo(450)).toBe(90);
  expect(normalizarRumbo('270')).toBe(270);
  expect(normalizarRumbo(-1)).toBeUndefined();
  expect(normalizarRumbo(null)).toBeUndefined();
});

test.each([
['north', -16.4999, -68.15, 0],
['east', -16.5, -68.1499, 90],
['south', -16.5001, -68.15, 180],
['west', -16.5, -68.1501, 270]]
)('follows %s movement', (_Direccion, latitud, longitud, rumbo) => {
  expect(resolverConductorRumbo(anterior, {
    latitude: Number(latitud), longitude: Number(longitud)
  })).toBeCloseTo(Number(rumbo), 0);
});

test('does not guess a heading before the first movement', () => {
  expect(actualizarConductorRumbo(null, { latitude: -16.5, longitude: -68.15 }, 1000).heading).
  toBeUndefined();
});

test('keeps the last heading while stopped or when the GPS only drifts', () => {
  const northbound = { ...anterior, heading: 90 };
  const pequenoDrift = { latitude: -16.5, longitude: -68.14999 };
  expect(resolverConductorRumbo(northbound, pequenoDrift)).toBe(90);
  expect(resolverConductorRumbo(northbound, northbound)).toBe(90);
});

test('accumulates short movements until there is enough displacement', () => {
  let estado = actualizarConductorRumbo(null, anterior, 1000);
  for (let paso = 1; paso <= 4; paso++) {
    estado = actualizarConductorRumbo(estado, {
      latitude: -16.5, longitude: -68.15 + paso * 0.00001
    }, 1000 + paso);
    expect(estado.heading).toBe(0);
    expect(estado.anchor).toBe(anterior);
  }
  estado = actualizarConductorRumbo(estado, { latitude: -16.5, longitude: -68.14995 }, 1005);
  expect(estado.heading).toBeCloseTo(90, 0);
});

test('ignores jumps smaller than the reported GPS accuracy', () => {
  const estado = actualizarConductorRumbo(null, { ...anterior, accuracy: 20 }, 1000);
  const siguiente = actualizarConductorRumbo(estado, {
    latitude: -16.5, longitude: -68.1499, accuracy: 20
  }, 1001);
  expect(siguiente.heading).toBe(0);
  expect(siguiente.anchor).toBe(estado.anchor);
});

test('rejects repeated and out-of-order fixes without changing the heading', () => {
  const estado = actualizarConductorRumbo(null, anterior, 2000);
  const real = { latitude: -16.5, longitude: -68.1499 };
  expect(actualizarConductorRumbo(estado, real, 2000)).toBe(estado);
  expect(actualizarConductorRumbo(estado, real, 1000)).toBe(estado);
});

test('updates the heading on a turn and preserves it after stopping', () => {
  let estado = actualizarConductorRumbo(null, anterior, 1000);
  const east = { latitude: -16.5, longitude: -68.1499 };
  estado = actualizarConductorRumbo(estado, east, 2000);
  expect(estado.heading).toBeCloseTo(90, 0);
  const south = { ...east, latitude: -16.5001 };
  estado = actualizarConductorRumbo(estado, south, 3000);
  expect(estado.heading).toBeCloseTo(180, 0);
  expect(actualizarConductorRumbo(estado, south, 4000).heading).toBe(estado.heading);
});

test('follows coordinates even when the supplied heading points elsewhere', () => {
  const estado = actualizarConductorRumbo(null, anterior, 1000);
  expect(actualizarConductorRumbo(estado, {
    latitude: -16.5, longitude: -68.1499, heading: 270
  }, 2000).heading).toBeCloseTo(90, 0);
});

test('rebases an inaccurate initial fix without treating improved precision as motion', () => {
  const estado = actualizarConductorRumbo(null, { ...anterior, accuracy: 100 }, 1000);
  const precise = { latitude: -16.5, longitude: -68.1499, accuracy: 5 };
  const siguiente = actualizarConductorRumbo(estado, precise, 2000);
  expect(siguiente.anchor).toBe(precise);
  expect(siguiente.heading).toBe(estado.heading);
  expect(actualizarConductorRumbo(siguiente, { ...precise, longitude: -68.1498 }, 3000).heading).
  toBeCloseTo(90, 0);
});
