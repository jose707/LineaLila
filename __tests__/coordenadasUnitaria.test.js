'use strict';

const {
  validarPunto,
} = require('../../backend/src/services/rapidaAsignacionPolicy');

describe('Validación de coordenadas', () => {
  test('PU-06: acepta coordenadas válidas y sus límites', () => {
    expect(validarPunto({
      latitude: -16.5,
      longitude: -68.15,
      address: 'Origen',
    })).toBe(true);

    expect(validarPunto({
      latitude: 90,
      longitude: 180,
      address: 'Origen',
    })).toBe(true);
  });

  test('PU-06: rechaza coordenadas incompletas y fuera de rango', () => {
    const punto = { latitude: -16.5, longitude: -68.15, address: 'Origen' };

    expect(validarPunto({ latitude: punto.latitude, address: punto.address })).toBe(false);

    for (const invalido of [
      { ...punto, latitude: 91 },
      { ...punto, latitude: -91 },
      { ...punto, longitude: 181 },
      { ...punto, longitude: -181 },
    ]) {
      expect(validarPunto(invalido)).toBe(false);
    }
  });
});
