import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { TextInput as TextoEntrada } from 'react-native';
import BuscarBar, { BusquedaBarReferencia as BuscarBarReferencia } from "../src/components/BuscarBar";
import {
  lugaresServicio,
  nuevoLugaresSesion } from
"../src/services/places.servicio";

jest.mock('lucide-react-native', () => ({ X: 'X' }));
jest.mock("../src/services/places.servicio", () => ({
  nuevoLugaresSesion: jest.fn(() => 'test_session_123456'),
  lugaresServicio: { autocompletar: jest.fn(), detalles: jest.fn() }
}));
const sugerencia = {
  placeId: 'ChIJ123',
  address: 'Plaza Murillo',
  sessionToken: 'test_session_123456'
};
const resultado = {
  ...sugerencia,
  display_name: 'Plaza Murillo',
  lat: '-16.495',
  lon: '-68.133'
};
let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (nuevoLugaresSesion as jest.Mock).
  mockReset().
  mockReturnValue('test_session_123456');
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.useRealTimers();
});

test('espera a que termine la escritura y resuelve coordenadas solo al seleccionar', async () => {
  (lugaresServicio.autocompletar as jest.Mock).mockResolvedValue([sugerencia]);
  (lugaresServicio.detalles as jest.Mock).mockResolvedValue(resultado);
  const alSeleccionar = jest.fn();
  const referencia = React.createRef<BuscarBarReferencia>();
  await act(() => {
    tree = Renderer.create(
      <BuscarBar
        ref={referencia}
        placeholder="Destino"
        onResultSelect={alSeleccionar}
        hideResults />

    );
  });
  await act(() => tree.root.findByType(TextoEntrada).props.onChangeText('Pl'));
  await act(() => jest.advanceTimersByTime(200));
  await act(() => tree.root.findByType(TextoEntrada).props.onChangeText('Plaza'));
  await act(() => jest.advanceTimersByTime(400));
  expect(lugaresServicio.autocompletar).toHaveBeenCalledTimes(1);
  expect(lugaresServicio.detalles).not.toHaveBeenCalled();
  expect(alSeleccionar).not.toHaveBeenCalled();
  await act(async () => {
    await referencia.current?.select(sugerencia);
  });
  expect(lugaresServicio.detalles).toHaveBeenCalledWith(sugerencia);
  expect(alSeleccionar).toHaveBeenCalledWith(resultado);
});

test('ignora una respuesta anterior que llega después de la búsqueda nueva', async () => {
  let resolverAnterior: (value: any) => void = () => {};
  (lugaresServicio.autocompletar as jest.Mock).
  mockImplementationOnce(
    () =>
    new Promise((resolver) => {
      resolverAnterior = resolver;
    })
  ).
  mockResolvedValueOnce([
  { ...sugerencia, placeId: 'new', address: 'Destino nuevo' }]
  );
  const alResultados = jest.fn();
  await act(() => {
    tree = Renderer.create(
      <BuscarBar
        placeholder="Destino"
        onResultSelect={jest.fn()}
        hideResults
        onResultsChange={alResultados} />

    );
  });
  await act(() => tree.root.findByType(TextoEntrada).props.onFocus());
  await act(() => tree.root.findByType(TextoEntrada).props.onChangeText('Plaza'));
  await act(() => jest.advanceTimersByTime(400));
  await act(() =>
  tree.root.findByType(TextoEntrada).props.onChangeText('Aeropuerto')
  );
  await act(() => jest.advanceTimersByTime(400));
  await act(async () => {
    resolverAnterior([sugerencia]);
  });
  expect(alResultados.mock.calls.at(-1)[0][0].placeId).toBe('new');
});

test('un fallo al obtener detalles muestra error sin seleccionar coordenadas falsas', async () => {
  (lugaresServicio.detalles as jest.Mock).mockRejectedValue({
    data: { error: 'Lugar no disponible' }
  });
  const alSeleccionar = jest.fn();
  const alResultados = jest.fn();
  const referencia = React.createRef<BuscarBarReferencia>();
  await act(() => {
    tree = Renderer.create(
      <BuscarBar
        ref={referencia}
        placeholder="Destino"
        onResultSelect={alSeleccionar}
        hideResults
        onResultsChange={alResultados} />

    );
  });
  await act(() => tree.root.findByType(TextoEntrada).props.onFocus());
  await act(async () => {
    await referencia.current?.select(sugerencia);
  });
  expect(alSeleccionar).not.toHaveBeenCalled();
  expect(alResultados.mock.calls.at(-1)[2]).toBe('Lugar no disponible');
});

test('reutiliza el token al escribir y lo renueva después de seleccionar', async () => {
  (nuevoLugaresSesion as jest.Mock).
  mockReturnValueOnce('test_session_123456').
  mockReturnValue('next_session_123456');
  (lugaresServicio.autocompletar as jest.Mock).mockResolvedValue([sugerencia]);
  (lugaresServicio.detalles as jest.Mock).mockResolvedValue(resultado);
  const referencia = React.createRef<BuscarBarReferencia>();
  await act(() => {
    tree = Renderer.create(
      <BuscarBar
        ref={referencia}
        placeholder="Destino"
        onResultSelect={jest.fn()}
        hideResults />

    );
  });
  for (const texto of ['Plaza', 'Plaza Murillo']) {
    await act(() => tree.root.findByType(TextoEntrada).props.onChangeText(texto));
    await act(() => jest.advanceTimersByTime(400));
  }
  expect(
    (lugaresServicio.autocompletar as jest.Mock).mock.calls.map((llamada) => llamada[1])
  ).toEqual(['test_session_123456', 'test_session_123456']);
  await act(async () => {
    await referencia.current?.select(sugerencia);
  });
  expect(lugaresServicio.detalles).toHaveBeenCalledWith(
    expect.objectContaining({ sessionToken: 'test_session_123456' })
  );
  await act(() =>
  tree.root.findByType(TextoEntrada).props.onChangeText('Aeropuerto')
  );
  await act(() => jest.advanceTimersByTime(400));
  expect((lugaresServicio.autocompletar as jest.Mock).mock.calls.at(-1)[1]).toBe(
    'next_session_123456'
  );
});
