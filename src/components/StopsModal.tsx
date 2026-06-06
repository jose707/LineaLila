import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T, COLORS } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  pickupAddress: string;
  tempPickupAddress: string;
  destinationAddress: string;
  waypoints: any[];
}

const DOT_ORIGIN = COLORS.primary;
const DOT_STOP = COLORS.primaryLight;
const DOT_DEST = COLORS.secondary;
const DOT_SIZE = 10;
const LINE_WIDTH = 2;
const LINE_LEFT = DOT_SIZE / 2 - LINE_WIDTH / 2;

export const StopsModal: React.FC<Props> = ({
  visible,
  onClose,
  pickupAddress,
  tempPickupAddress,
  destinationAddress,
  waypoints,
}) => {
  const insets = useSafeAreaInsets();
  const originLabel = pickupAddress || tempPickupAddress || '';
  const destLabel = destinationAddress || '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.modalRoot}>
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>
              {waypoints.length + 1} {waypoints.length + 1 === 1 ? 'parada' : 'paradas'} de ruta
            </Text>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={T.inkLight} />
            </TouchableOpacity>
          </View>

          {/* Timeline */}
          <View style={s.timeline}>
            {/* Origin */}
            <View style={s.row}>
              <View style={[s.dot, { backgroundColor: DOT_ORIGIN }]} />
              <View style={s.rowContent}>
                <Text style={s.label}>Recogida</Text>
                <Text style={s.address} numberOfLines={2}>
                  {originLabel}
                </Text>
              </View>
            </View>

            {/* Waypoints */}
            {waypoints.map((wp: any, idx: number) => (
              <View key={`stop-${idx}`}>
                <View style={s.line} />
                <View style={s.row}>
                  <View style={[s.dot, { backgroundColor: DOT_STOP }]} />
                  <View style={s.rowContent}>
                    <Text style={s.label}>Parada {idx + 1}</Text>
                    <Text style={s.address} numberOfLines={2}>
                      {wp.address}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Destination */}
            <View style={s.line} />
            <View style={s.row}>
              <View style={[s.dot, { backgroundColor: DOT_DEST }]} />
              <View style={s.rowContent}>
                <Text style={s.label}>Destino</Text>
                <Text style={s.address} numberOfLines={2}>
                  {destLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: T.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    paddingLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginTop: 6,
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: T.inkLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  address: {
    fontSize: 15,
    fontWeight: '600',
    color: T.ink,
    lineHeight: 20,
  },
  line: {
    width: LINE_WIDTH,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: LINE_LEFT,
  },
});
