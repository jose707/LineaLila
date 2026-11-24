import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import api, { consultarConSesion } from '../src/services/api.cliente';
import { AlmacenamientoAuxiliar } from '../src/services/storage';
import { autenticacionServicio } from '../src/services/autenticacion.servicio';
import { AutenticacionProvider } from '../src/context/ContextoAutenticacion';
import { usarAutenticacion } from '../src/hooks/usarAutenticacion';

jest.mock('../src/config/constantes', () => ({ API_HOST: 'https://backend.test' }));
jest.mock('../src/services/storage', () => {
  const datos = new Map();
  return { AlmacenamientoAuxiliar: {
    obtenerElemento: jest.fn(clave => datos.get(clave) ?? null),
    establecerElemento: jest.fn((clave, valor) => datos.set(clave, valor)),
    quitarElemento: jest.fn(clave => datos.delete(clave))
  } };
});
jest.mock('../src/services/firebase.servicio', () => ({
  alFcmTokenRenovar: () => () => {},
  alPrimerPlanoNotificacion: () => () => {}
}));
jest.mock('../src/services/socket.servicio', () => ({
  socketServicio: { conectar: jest.fn(), desconectar: jest.fn() }
}));
jest.mock('../src/services/autenticacion.servicio', () => ({
  autenticacionServicio: {
    consultarUsuarioActual: jest.fn(), obtenerUsuarioActual: jest.fn(), registrarTokenFCM: jest.fn()
  }
}));

const originalFetch = globalThis.fetch;
const usuario = { id: 'usuario', nombre: 'Ana', rol: 'user' };
const respuesta = (status: number, datos = {}) => ({
  status, ok: status >= 200 && status < 300,
  json: async () => datos,
  clone: () => ({ json: async () => datos })
}) as Response;
let pantalla: Renderer.ReactTestRenderer | undefined;

function PantallaProtegida() {
  const { isAuthenticated, isLoading } = usarAutenticacion();
  return <Text>{isLoading ? 'Cargando' : isAuthenticated ? 'Pantalla protegida' : 'Inicio de sesión'}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const clave of ['authToken', 'refreshToken', 'user', 'activeRideState']) AlmacenamientoAuxiliar.quitarElemento(clave);
  globalThis.fetch = jest.fn().mockResolvedValue(respuesta(200, { user: usuario }));
  jest.mocked(autenticacionServicio.consultarUsuarioActual).mockImplementation(async () =>
    (await api.obtener<{ user: typeof usuario }>('/autenticacion/sesion')).user as any);
  jest.mocked(autenticacionServicio.obtenerUsuarioActual).mockResolvedValue(usuario as any);
  jest.mocked(autenticacionServicio.registrarTokenFCM).mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(() => pantalla?.unmount());
  pantalla = undefined;
  globalThis.fetch = originalFetch;
});

async function iniciar() {
  AlmacenamientoAuxiliar.establecerElemento('authToken', 'token-A');
  AlmacenamientoAuxiliar.establecerElemento('refreshToken', 'renovar-A');
  AlmacenamientoAuxiliar.establecerElemento('user', JSON.stringify(usuario));
  await act(() => { pantalla = Renderer.create(<AutenticacionProvider><PantallaProtegida /></AutenticacionProvider>); });
}

test('un 401 por usuario eliminado cierra la sesión en memoria y elimina las credenciales', async () => {
  await iniciar();
  expect(JSON.stringify(pantalla!.toJSON())).toContain('Pantalla protegida');
  jest.mocked(fetch).mockResolvedValueOnce(respuesta(401));
  await act(async () => { await expect(api.obtener('/notificaciones')).rejects.toMatchObject({ status: 401 }); });
  expect(JSON.stringify(pantalla!.toJSON())).toContain('Inicio de sesión');
  for (const clave of ['authToken', 'refreshToken', 'user']) expect(AlmacenamientoAuxiliar.obtenerElemento(clave)).toBeNull();
});

test('si falta el token vuelve al inicio de sesión sin enviar una consulta protegida', async () => {
  await iniciar();
  AlmacenamientoAuxiliar.quitarElemento('authToken');
  jest.mocked(fetch).mockClear();
  await act(async () => { await expect(api.obtener('/notificaciones')).rejects.toMatchObject({ status: 401 }); });
  expect(fetch).not.toHaveBeenCalled();
  expect(JSON.stringify(pantalla!.toJSON())).toContain('Inicio de sesión');
});

test('las cargas de documentos también cierran la sesión ante un 401', async () => {
  await iniciar();
  jest.mocked(fetch).mockResolvedValueOnce(respuesta(401));
  await act(async () => {
    await expect(consultarConSesion('https://backend.test/api/autenticacion/verificar-identidad', {
      method: 'POST', body: new FormData(), headers: { Authorization: 'Bearer token-A' }
    })).rejects.toMatchObject({ status: 401 });
  });
  expect(JSON.stringify(pantalla!.toJSON())).toContain('Inicio de sesión');
});

test('un 401 tardío de la sesión anterior conserva el token de una sesión nueva', async () => {
  AlmacenamientoAuxiliar.establecerElemento('authToken', 'token-A');
  let finalizar!: (valor: Response) => void;
  jest.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finalizar = resolve; }));
  const consulta = api.obtener('/notificaciones');
  await Promise.resolve();
  AlmacenamientoAuxiliar.establecerElemento('authToken', 'token-B');
  finalizar(respuesta(401));
  await expect(consulta).rejects.toMatchObject({ status: 401 });
  expect(AlmacenamientoAuxiliar.obtenerElemento('authToken')).toBe('token-B');
});

test.each(['red', 'servidor'])('conserva la sesión ante un fallo de %s', async tipo => {
  await iniciar();
  if (tipo === 'red') jest.mocked(fetch).mockRejectedValueOnce(new Error('Sin conexión'));
  else jest.mocked(fetch).mockResolvedValueOnce(respuesta(503));
  await act(async () => { await expect(api.obtener('/notificaciones')).rejects.toBeDefined(); });
  expect(AlmacenamientoAuxiliar.obtenerElemento('authToken')).toBe('token-A');
  expect(JSON.stringify(pantalla!.toJSON())).toContain('Pantalla protegida');
});

test('restaura el usuario guardado si al iniciar no hay conexión', async () => {
  jest.mocked(fetch).mockRejectedValue(new Error('Sin conexión'));
  await iniciar();
  expect(JSON.stringify(pantalla!.toJSON())).toContain('Pantalla protegida');
  expect(AlmacenamientoAuxiliar.obtenerElemento('authToken')).toBe('token-A');
});

test('permite iniciar sesión sin token previo y conserva el 401 de credenciales incorrectas', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(respuesta(401, { error: 'Credenciales incorrectas' }));
  await expect(api.post('/autenticacion/iniciar-sesion', {})).rejects.toMatchObject({ status: 401 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
