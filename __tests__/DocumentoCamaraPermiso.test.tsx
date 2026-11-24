import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking, Modal } from 'react-native';
import { VisionCamera, useCameraPermission } from 'react-native-vision-camera';
import { DocumentoCamaraModal } from '../src/components/DocumentoCamaraModal';
import ConfirmarInferiorHoja from '../src/components/ConfirmarInferiorSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  VisionCamera: { cameraPermissionStatus: 'not-determined' },
  CommonResolutions: { UHD_4_3: {} },
  useCameraDevice: () => undefined,
  useCameraPermission: jest.fn(),
  usePhotoOutput: () => ({})
}));

let pantalla: Renderer.ReactTestRenderer;
const solicitar = jest.fn();
const propiedades = { title: 'Licencia', onCapture: jest.fn(), onClose: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(VisionCamera, { cameraPermissionStatus: 'not-determined' });
  jest.mocked(useCameraPermission).mockImplementation(() => ({
    status: VisionCamera.cameraPermissionStatus,
    hasPermission: VisionCamera.cameraPermissionStatus === 'authorized',
    canRequestPermission: VisionCamera.cameraPermissionStatus === 'not-determined',
    requestPermission: solicitar
  }));
  solicitar.mockResolvedValue(false);
});
afterEach(async () => {
  await act(() => pantalla?.unmount());
  jest.restoreAllMocks();
});

async function abrirCamara() {
  await act(() => { pantalla = Renderer.create(<DocumentoCamaraModal {...propiedades} visible />); });
  await act(() => pantalla.root.findAllByType(Modal)[0].props.onShow());
}

test('pide permiso en cada apertura y no vuelve a pedirlo en bucle tras denegarlo', async () => {
  await abrirCamara();
  expect(solicitar).toHaveBeenCalledTimes(1);
  await act(() => pantalla.update(<DocumentoCamaraModal {...propiedades} visible={false} />));
  await act(() => pantalla.update(<DocumentoCamaraModal {...propiedades} visible />));
  await act(() => pantalla.root.findAllByType(Modal)[0].props.onShow());
  expect(solicitar).toHaveBeenCalledTimes(2);
});

test('ofrece abrir ajustes si Android bloqueó las solicitudes de permiso', async () => {
  Object.assign(VisionCamera, { cameraPermissionStatus: 'denied' });
  const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  await abrirCamara();
  const confirmacion = pantalla.root.findByType(ConfirmarInferiorHoja);
  expect(confirmacion.props.visible).toBe(true);
  await act(() => confirmacion.props.onConfirm());
  expect(ajustes).toHaveBeenCalledTimes(1);
  expect(pantalla.root.findByType(ConfirmarInferiorHoja).props.visible).toBe(false);
});
