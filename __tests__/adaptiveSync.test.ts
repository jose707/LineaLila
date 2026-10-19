import { AppState, AppStateStatus } from 'react-native';
import socketService from '../src/services/socket.service';
import { startAdaptiveSync } from '../src/utils/adaptiveSync';
jest.mock('../src/services/socket.service', () => ({
  __esModule: true,
  default: { on: jest.fn(), off: jest.fn(), isConnected: jest.fn() },
}));
let stop: () => void;
let foreground: (state: AppStateStatus) => void;
const fire = (event: string) =>
  (socketService.on as jest.Mock).mock.calls.find(
    call => call[0] === event,
  )![1]();
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      foreground = callback;
      return { remove: jest.fn() };
    });
});
afterEach(() => {
  stop?.();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('socket sano sin polling; caída activa respaldo; reconexión sincroniza y lo detiene', async () => {
  let connected = true;
  const refresh = jest.fn().mockResolvedValue(undefined);
  stop = startAdaptiveSync(refresh, () => (connected ? null : 5000));
  await flush();
  jest.advanceTimersByTime(30000);
  expect(refresh).toHaveBeenCalledTimes(1);
  connected = false;
  fire('disconnect');
  jest.advanceTimersByTime(2000);
  fire('connect_error');
  jest.advanceTimersByTime(3000);
  await flush();
  expect(refresh).toHaveBeenCalledTimes(2);
  connected = true;
  fire('connect');
  await flush();
  jest.advanceTimersByTime(30000);
  expect(refresh).toHaveBeenCalledTimes(3);
});
test('reserva consulta cada dos segundos, pausa en segundo plano y termina al liberarse', async () => {
  let reserved = true;
  const refresh = jest.fn().mockResolvedValue(undefined);
  stop = startAdaptiveSync(refresh, () => (reserved ? 2000 : null), [
    'ride:assignment',
  ]);
  await flush();
  jest.advanceTimersByTime(2000);
  await flush();
  expect(refresh).toHaveBeenCalledTimes(2);
  foreground('background');
  jest.advanceTimersByTime(10000);
  expect(refresh).toHaveBeenCalledTimes(2);
  foreground('active');
  await flush();
  expect(refresh).toHaveBeenCalledTimes(3);
  reserved = false;
  fire('ride:assignment');
  await flush();
  jest.advanceTimersByTime(10000);
  expect(refresh).toHaveBeenCalledTimes(4);
});
test('no solapa consultas y limpia temporizadores al salir de pantalla', async () => {
  let resolve!: () => void;
  const refresh = jest.fn(
    () =>
      new Promise<void>(done => {
        resolve = done;
      }),
  );
  stop = startAdaptiveSync(refresh, () => 5000);
  fire('connect');
  jest.advanceTimersByTime(20000);
  expect(refresh).toHaveBeenCalledTimes(1);
  stop();
  resolve();
  await flush();
  jest.advanceTimersByTime(20000);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(socketService.off).toHaveBeenCalledWith(
    'connect',
    expect.any(Function),
  );
});
