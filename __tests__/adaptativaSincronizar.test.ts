import { AppState as AplicacionEstado, AppStateStatus as AplicacionEstadoEstado } from 'react-native';
import socketServicio from "../src/services/socket.servicio";
import { iniciarAdaptativaSincronizacion as inicioAdaptiveSincronizar } from "../src/utils/adaptativaSincronizar";
jest.mock("../src/services/socket.servicio", () => ({
  __esModule: true,
  default: { al: jest.fn(), desactivado: jest.fn(), esConectado: jest.fn() }
}));
let parada: () => void;
let primerPlano: (state: AplicacionEstadoEstado) => void;
const fire = (evento: string) =>
(socketServicio.al as jest.Mock).mock.calls.find(
  (llamada) => llamada[0] === evento
)![1]();
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.
  spyOn(AplicacionEstado, 'addEventListener').
  mockImplementation((_Evento, funcionRetorno) => {
    primerPlano = funcionRetorno;
    return { remove: jest.fn() };
  });
});
afterEach(() => {
  parada?.();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('socket sano sin polling; caída activa respaldo; reconexión sincroniza y lo detiene', async () => {
  let conectado = true;
  const renovar = jest.fn().mockResolvedValue(undefined);
  parada = inicioAdaptiveSincronizar(renovar, () => conectado ? null : 5000);
  await flush();
  jest.advanceTimersByTime(30000);
  expect(renovar).toHaveBeenCalledTimes(1);
  conectado = false;
  fire('disconnect');
  jest.advanceTimersByTime(2000);
  fire('connect_error');
  jest.advanceTimersByTime(3000);
  await flush();
  expect(renovar).toHaveBeenCalledTimes(2);
  conectado = true;
  fire('connect');
  await flush();
  jest.advanceTimersByTime(30000);
  expect(renovar).toHaveBeenCalledTimes(3);
});
test('reserva consulta cada dos segundos, pausa en segundo plano y termina al liberarse', async () => {
  let reservado = true;
  const renovar = jest.fn().mockResolvedValue(undefined);
  parada = inicioAdaptiveSincronizar(renovar, () => reservado ? 2000 : null, [
  'ride:assignment']
  );
  await flush();
  jest.advanceTimersByTime(2000);
  await flush();
  expect(renovar).toHaveBeenCalledTimes(2);
  primerPlano('background');
  jest.advanceTimersByTime(10000);
  expect(renovar).toHaveBeenCalledTimes(2);
  primerPlano('active');
  await flush();
  expect(renovar).toHaveBeenCalledTimes(3);
  reservado = false;
  fire('ride:assignment');
  await flush();
  jest.advanceTimersByTime(10000);
  expect(renovar).toHaveBeenCalledTimes(4);
});
test('no solapa consultas y limpia temporizadores al salir de pantalla', async () => {
  let resolver!: () => void;
  const renovar = jest.fn(
    () =>
    new Promise<void>((terminado) => {
      resolver = terminado;
    })
  );
  parada = inicioAdaptiveSincronizar(renovar, () => 5000);
  fire('connect');
  jest.advanceTimersByTime(20000);
  expect(renovar).toHaveBeenCalledTimes(1);
  parada();
  resolver();
  await flush();
  jest.advanceTimersByTime(20000);
  expect(renovar).toHaveBeenCalledTimes(1);
  expect(socketServicio.desactivado).toHaveBeenCalledWith(
    'connect',
    expect.any(Function)
  );
});
