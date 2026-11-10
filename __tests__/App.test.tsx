/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StatusBar } from 'react-native';
import Aplicacion from '../App';
import { configurarAccesoGoogle } from '../src/services/firebase.servicio';
import { AlmacenamientoAuxiliar } from '../src/services/storage';

jest.mock('../src/services/firebase-iniciar', () => ({}));
jest.mock('../src/services/firebase.servicio', () => ({
  configurarAccesoGoogle: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/autenticacion.servicio', () => ({
  autenticacionServicio: {},
}));
jest.mock('../src/services/storage', () => ({
  AlmacenamientoAuxiliar: {
    obtenerElemento: jest.fn(),
  },
}));
jest.mock('../src/services/socket.servicio', () => ({
  __esModule: true,
  default: {},
  socketServicio: {},
}));
jest.mock('../src/services/conductorDisponibilidad.servicio', () => ({
  desconectarConductorEnSegundoPlano: jest.fn(),
}));

// La prueba cubre el arranque y sus proveedores. Las pantallas se prueban aparte.
jest.mock('../src/navigation/RootNavegador', () => {
  const { Text } = require('react-native');
  const { usarAutenticacion } = require('../src/hooks/usarAutenticacion');
  return function NavegadorDePrueba() {
    const { isLoading, isAuthenticated } = usarAutenticacion();
    return <Text>{isLoading ? 'Cargando' : isAuthenticated ? 'Sesión activa' : 'Sin sesión'}</Text>;
  };
});

let tree: ReactTestRenderer.ReactTestRenderer;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AlmacenamientoAuxiliar.obtenerElemento).mockReturnValue(null);
});

afterEach(async () => {
  if (tree) {
    await ReactTestRenderer.act(async () => tree.unmount());
  }
  jest.restoreAllMocks();
});

test('inicia Google y termina de cargar una sesión vacía', async () => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Aplicacion />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Sin sesión');
  expect(configurarAccesoGoogle).toHaveBeenCalledTimes(1);
});

test('aplica el tema oscuro guardado al iniciar', async () => {
  jest.mocked(AlmacenamientoAuxiliar.obtenerElemento).mockImplementation(clave =>
    clave === '@settings' ? JSON.stringify({ darkMode: true }) : null,
  );
  const estiloBarra = jest.spyOn(StatusBar, 'setBarStyle');
  const fondoBarra = jest.spyOn(StatusBar, 'setBackgroundColor');
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Aplicacion />);
  });
  expect(estiloBarra).toHaveBeenLastCalledWith('light-content');
  expect(fondoBarra).toHaveBeenLastCalledWith('#121212');
});
