import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ConductorOfertaBubbles } from "../src/components/ConductorOfertaBubbles";
import { ofertaSegundosIzquierda, desfaseRelojServidor as servidorRelojDesplazamiento } from "../src/utils/ofertaCountdown";

jest.mock('../src/theme/icons', () => ({
  Icon: { Car: 'Car', Star: 'Star', Reloj: 'Clock' }
}));

test('conductor y pasajero muestran el mismo plazo aunque la oferta llegue tarde', async () => {
  const enviadoEn = Date.parse('2026-10-13T12:00:00.000Z');
  const venceEn = new Date(enviadoEn + 60_000).toISOString();

  jest.useFakeTimers();
  jest.setSystemTime(enviadoEn + 8_000 - 30_000);
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <ConductorOfertaBubbles
        offers={[{ offerId: 'offer-1', expiresAt: venceEn, proposedPrice: 20, serverOffsetMs: 30_000 }]}
        onAccept={jest.fn()}
        onReject={jest.fn()} />

    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain('"children":["52","s"]');
  await act(async () => tree.unmount());
  jest.useRealTimers();
  expect(ofertaSegundosIzquierda(venceEn, enviadoEn + 20_000)).toBe(40);
  expect(ofertaSegundosIzquierda(venceEn, enviadoEn + 60_000)).toBe(0);
});

test('corrige la hora del teléfono sin sumar el retraso de red o del servidor', () => {
  const inicio = Date.parse('2026-10-13T12:00:00.000Z');
  const desplazamiento = servidorRelojDesplazamiento(inicio - 30_000, inicio + 8_000 - 30_000, {
    receivedAt: new Date(inicio).toISOString(),
    sentAt: new Date(inicio + 8_000).toISOString()
  });
  expect(desplazamiento).toBe(30_000);
  expect(ofertaSegundosIzquierda(new Date(inicio + 60_000).toISOString(), inicio + 8_000 - 30_000, desplazamiento)).toBe(52);
});

test('el tiempo restante se recalcula tras una pausa, sin reiniciar 60 segundos', () => {
  const creadoEn = Date.parse('2026-10-13T12:00:00.000Z');
  const venceEn = new Date(creadoEn + 60_000).toISOString();

  expect(ofertaSegundosIzquierda(venceEn, creadoEn + 52_000)).toBe(8);
  expect(ofertaSegundosIzquierda(venceEn, creadoEn + 65_000)).toBe(0);
});
