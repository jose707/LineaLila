import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StopsModal } from '../src/components/StopsModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

test('permite eliminar una parada intermedia y renumera las restantes', async () => {
  const onRemoveWaypoint = jest.fn();
  const props = {
    visible: true,
    onClose: jest.fn(),
    pickupAddress: 'Origen',
    tempPickupAddress: '',
    destinationAddress: 'Destino',
    waypoints: [{ address: 'Primera' }, { address: 'Segunda' }],
    onRemoveWaypoint,
  };
  let tree!: Renderer.ReactTestRenderer;

  await act(async () => {
    tree = Renderer.create(<StopsModal {...props} />);
  });

  const removeSecond = tree.root.findByProps({ accessibilityLabel: 'Eliminar P2' });
  await act(async () => removeSecond.props.onPress());
  expect(onRemoveWaypoint).toHaveBeenCalledWith(1);

  await act(async () => {
    tree.update(<StopsModal {...props} waypoints={[props.waypoints[1]]} />);
  });
  expect(tree.root.findAllByProps({ accessibilityLabel: 'Eliminar P1' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ accessibilityLabel: 'Eliminar P2' })).toHaveLength(0);

  await act(async () => tree.unmount());
}, 20000);
