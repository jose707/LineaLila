import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { DriverOfferBubbles } from '../src/components/DriverOfferBubbles';
import { offerSecondsLeft, serverClockOffset } from '../src/utils/offerCountdown';

jest.mock('../src/theme/icons', () => ({
  Icon: { Car: 'Car', Star: 'Star', Clock: 'Clock' },
}));

test('conductor y pasajero muestran el mismo plazo aunque la oferta llegue tarde', async () => {
  const sentAt = Date.parse('2026-10-13T12:00:00.000Z');
  const expiresAt = new Date(sentAt + 60_000).toISOString();

  jest.useFakeTimers();
  jest.setSystemTime(sentAt + 8_000 - 30_000);
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <DriverOfferBubbles
        offers={[{ offerId: 'offer-1', expiresAt, proposedPrice: 20, serverOffsetMs: 30_000 }]}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain('"children":["52","s"]');
  await act(async () => tree.unmount());
  jest.useRealTimers();
  expect(offerSecondsLeft(expiresAt, sentAt + 20_000)).toBe(40);
  expect(offerSecondsLeft(expiresAt, sentAt + 60_000)).toBe(0);
});

test('corrige la hora del teléfono sin sumar el retraso de red o del servidor', () => {
  const start = Date.parse('2026-10-13T12:00:00.000Z');
  const offset = serverClockOffset(start - 30_000, start + 8_000 - 30_000, {
    receivedAt: new Date(start).toISOString(),
    sentAt: new Date(start + 8_000).toISOString(),
  });
  expect(offset).toBe(30_000);
  expect(offerSecondsLeft(new Date(start + 60_000).toISOString(), start + 8_000 - 30_000, offset)).toBe(52);
});

test('el tiempo restante se recalcula tras una pausa, sin reiniciar 60 segundos', () => {
  const createdAt = Date.parse('2026-10-13T12:00:00.000Z');
  const expiresAt = new Date(createdAt + 60_000).toISOString();

  expect(offerSecondsLeft(expiresAt, createdAt + 52_000)).toBe(8);
  expect(offerSecondsLeft(expiresAt, createdAt + 65_000)).toBe(0);
});
