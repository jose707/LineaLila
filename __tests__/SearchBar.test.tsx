import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import SearchBar, { SearchBarRef } from '../src/components/SearchBar';
import {
  placesService,
  newPlacesSession,
} from '../src/services/places.service';

jest.mock('lucide-react-native', () => ({ X: 'X' }));
jest.mock('../src/services/places.service', () => ({
  newPlacesSession: jest.fn(() => 'test_session_123456'),
  placesService: { autocomplete: jest.fn(), details: jest.fn() },
}));
const suggestion = {
  placeId: 'ChIJ123',
  address: 'Plaza Murillo',
  sessionToken: 'test_session_123456',
};
const result = {
  ...suggestion,
  display_name: 'Plaza Murillo',
  lat: '-16.495',
  lon: '-68.133',
};
let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (newPlacesSession as jest.Mock)
    .mockReset()
    .mockReturnValue('test_session_123456');
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.useRealTimers();
});

test('espera a que termine la escritura y resuelve coordenadas solo al seleccionar', async () => {
  (placesService.autocomplete as jest.Mock).mockResolvedValue([suggestion]);
  (placesService.details as jest.Mock).mockResolvedValue(result);
  const onSelect = jest.fn();
  const ref = React.createRef<SearchBarRef>();
  await act(() => {
    tree = Renderer.create(
      <SearchBar
        ref={ref}
        placeholder="Destino"
        onResultSelect={onSelect}
        hideResults
      />,
    );
  });
  await act(() => tree.root.findByType(TextInput).props.onChangeText('Pl'));
  await act(() => jest.advanceTimersByTime(200));
  await act(() => tree.root.findByType(TextInput).props.onChangeText('Plaza'));
  await act(() => jest.advanceTimersByTime(400));
  expect(placesService.autocomplete).toHaveBeenCalledTimes(1);
  expect(placesService.details).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () => {
    await ref.current?.select(suggestion);
  });
  expect(placesService.details).toHaveBeenCalledWith(suggestion);
  expect(onSelect).toHaveBeenCalledWith(result);
});

test('ignora una respuesta anterior que llega después de la búsqueda nueva', async () => {
  let resolveOld: (value: any) => void = () => {};
  (placesService.autocomplete as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce([
      { ...suggestion, placeId: 'new', address: 'Destino nuevo' },
    ]);
  const onResults = jest.fn();
  await act(() => {
    tree = Renderer.create(
      <SearchBar
        placeholder="Destino"
        onResultSelect={jest.fn()}
        hideResults
        onResultsChange={onResults}
      />,
    );
  });
  await act(() => tree.root.findByType(TextInput).props.onFocus());
  await act(() => tree.root.findByType(TextInput).props.onChangeText('Plaza'));
  await act(() => jest.advanceTimersByTime(400));
  await act(() =>
    tree.root.findByType(TextInput).props.onChangeText('Aeropuerto'),
  );
  await act(() => jest.advanceTimersByTime(400));
  await act(async () => {
    resolveOld([suggestion]);
  });
  expect(onResults.mock.calls.at(-1)[0][0].placeId).toBe('new');
});

test('un fallo al obtener detalles muestra error sin seleccionar coordenadas falsas', async () => {
  (placesService.details as jest.Mock).mockRejectedValue({
    data: { error: 'Lugar no disponible' },
  });
  const onSelect = jest.fn();
  const onResults = jest.fn();
  const ref = React.createRef<SearchBarRef>();
  await act(() => {
    tree = Renderer.create(
      <SearchBar
        ref={ref}
        placeholder="Destino"
        onResultSelect={onSelect}
        hideResults
        onResultsChange={onResults}
      />,
    );
  });
  await act(() => tree.root.findByType(TextInput).props.onFocus());
  await act(async () => {
    await ref.current?.select(suggestion);
  });
  expect(onSelect).not.toHaveBeenCalled();
  expect(onResults.mock.calls.at(-1)[2]).toBe('Lugar no disponible');
});

test('reutiliza el token al escribir y lo renueva después de seleccionar', async () => {
  (newPlacesSession as jest.Mock)
    .mockReturnValueOnce('test_session_123456')
    .mockReturnValue('next_session_123456');
  (placesService.autocomplete as jest.Mock).mockResolvedValue([suggestion]);
  (placesService.details as jest.Mock).mockResolvedValue(result);
  const ref = React.createRef<SearchBarRef>();
  await act(() => {
    tree = Renderer.create(
      <SearchBar
        ref={ref}
        placeholder="Destino"
        onResultSelect={jest.fn()}
        hideResults
      />,
    );
  });
  for (const text of ['Plaza', 'Plaza Murillo']) {
    await act(() => tree.root.findByType(TextInput).props.onChangeText(text));
    await act(() => jest.advanceTimersByTime(400));
  }
  expect(
    (placesService.autocomplete as jest.Mock).mock.calls.map(call => call[1]),
  ).toEqual(['test_session_123456', 'test_session_123456']);
  await act(async () => {
    await ref.current?.select(suggestion);
  });
  expect(placesService.details).toHaveBeenCalledWith(
    expect.objectContaining({ sessionToken: 'test_session_123456' }),
  );
  await act(() =>
    tree.root.findByType(TextInput).props.onChangeText('Aeropuerto'),
  );
  await act(() => jest.advanceTimersByTime(400));
  expect((placesService.autocomplete as jest.Mock).mock.calls.at(-1)[1]).toBe(
    'next_session_123456',
  );
});
