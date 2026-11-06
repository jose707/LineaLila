import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ParadasModal } from "../src/components/ParadasModal";

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

test('permite eliminar una parada intermedia y renumera las restantes', async () => {
  const alQuitarParada = jest.fn();
  const propiedades = {
    visible: true,
    onClose: jest.fn(),
    pickupAddress: 'Origen',
    tempPickupAddress: '',
    destinationAddress: 'Destino',
    waypoints: [{ address: 'Primera' }, { address: 'Segunda' }],
    onRemoveWaypoint: alQuitarParada
  };
  let tree!: Renderer.ReactTestRenderer;

  await act(async () => {
    tree = Renderer.create(<ParadasModal {...propiedades} />);
  });

  const quitarSegundo = tree.root.findByProps({ accessibilityLabel: 'Eliminar P2' });
  await act(async () => quitarSegundo.props.onPress());
  expect(alQuitarParada).toHaveBeenCalledWith(1);

  await act(async () => {
    tree.update(<ParadasModal {...propiedades} waypoints={[propiedades.waypoints[1]]} />);
  });
  expect(tree.root.findAllByProps({ accessibilityLabel: 'Eliminar P1' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ accessibilityLabel: 'Eliminar P2' })).toHaveLength(0);

  await act(async () => tree.unmount());
}, 20000);
