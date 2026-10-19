import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Minus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T, COLORS } from '../theme/colors';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from './MapLocationIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  pickupAddress: string;
  tempPickupAddress: string;
  destinationAddress: string;
  waypoints: { address: string }[];
  onRemoveWaypoint: (index: number) => void;
}

const ICON_SIZE = 28;
const LINE_WIDTH = 2;
const LINE_LEFT = ICON_SIZE / 2 - LINE_WIDTH / 2;

export const StopsModal: React.FC<Props> = ({
  visible,
  onClose,
  pickupAddress,
  tempPickupAddress,
  destinationAddress,
  waypoints,
  onRemoveWaypoint,
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
              Recorrido
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
              <PassengerMapIcon size={ICON_SIZE} bare />
              <View style={s.rowContent}>
                <Text style={s.address} numberOfLines={2}>
                  {originLabel}
                </Text>
              </View>
            </View>

            {/* Waypoints */}
            {waypoints.map((wp, idx) => (
              <View key={`stop-${idx}`}>
                <View style={s.line} />
                <View style={s.row}>
                  <WaypointMapIcon number={idx + 1} size={28} />
                  <View style={s.rowContent}>
                    <Text style={s.address} numberOfLines={2}>
                      {wp.address}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => onRemoveWaypoint(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar P${idx + 1}`}
                    activeOpacity={0.7}
                  >
                    <Minus size={18} color={T.ink} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Destination */}
            <View style={s.line} />
            <View style={s.row}>
              <DestinationFlagIcon size={ICON_SIZE} bare />
              <View style={s.rowContent}>
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
  rowContent: {
    flex: 1,
    marginLeft: 14,
    paddingTop: 3,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
