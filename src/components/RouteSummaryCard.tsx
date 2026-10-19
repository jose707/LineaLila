import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { DestinationFlagIcon, PassengerMapIcon, WaypointMapIcon } from './MapLocationIcons';
import { MAPSCREEN_COLORS as T, COLORS } from '../theme/colors';

interface RouteInfo {
  distance: number;
  duration: number;
}

interface Props {
  slideOffset: Animated.Value;
  disabled?: boolean;
  pickupAddress: string;
  tempPickupAddress: string;
  destinationAddress: string;
  waypoints: any[];
  routeInfo: RouteInfo | null;
  onPressOrigin: () => void;
  onPressStops: () => void;
  onAddStop: () => void;
  insetsTop: number;
  fmtDist: (m: number) => string;
  fmtTime: (sec: number) => string;
}

const ICON_SIZE = 30;
const CONNECTOR_WIDTH = 1.5;
const CONNECTOR_HEIGHT = 12;
const TIMELINE_LEFT = ICON_SIZE / 2 - CONNECTOR_WIDTH / 2;
const TEXT_LEFT = 10;

export const RouteSummaryCard: React.FC<Props> = ({
  slideOffset,
  disabled = false,
  pickupAddress,
  tempPickupAddress,
  destinationAddress,
  waypoints,
  routeInfo,
  onPressOrigin,
  onPressStops,
  onAddStop,
  insetsTop,
  fmtDist,
  fmtTime,
}) => {
  const hasStops = waypoints.length > 0;
  const originLabel = (pickupAddress || tempPickupAddress || '').split(',')[0];
  const destLabel = (destinationAddress || '').split(',')[0];
  const routeInfoSuffix = routeInfo ? (
    <Text style={s.routeInfoSuffix}>
      {' '}· {fmtDist(routeInfo.distance)} · {fmtTime(routeInfo.duration)}
    </Text>
  ) : null;

  return (
    <Animated.View pointerEvents={disabled ? 'none' : 'auto'} style={[s.card, { top: 8 + insetsTop, transform: [{ translateY: slideOffset }] }]}>
      <View>

        {/* Origin */}
        <TouchableOpacity
          style={s.timelineRow}
          onPress={onPressOrigin}
          activeOpacity={0.6}
        >
          <View style={s.iconSlot}>
            <PassengerMapIcon size={ICON_SIZE} bare />
          </View>
          <Text style={s.address} numberOfLines={1}>
            {originLabel}
          </Text>
        </TouchableOpacity>

        {/* Connector */}
        <View style={s.connector} />

        {/* Second line: destination or stops */}
        <View style={s.timelineRow}>
          {hasStops ? (
            <TouchableOpacity
              style={s.destRow}
              onPress={onPressStops}
              activeOpacity={0.6}
            >
              <View style={s.routeIcons}>
                {waypoints.map((_, index) => <WaypointMapIcon key={index} number={index + 1} size={22} />)}
                <DestinationFlagIcon size={ICON_SIZE} bare />
              </View>
              <Text style={s.address} numberOfLines={1}>
                {destLabel}{routeInfoSuffix}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.destRow}
              onPress={onPressStops}
              activeOpacity={0.6}
            >
              <View style={s.iconSlot}>
                <DestinationFlagIcon size={ICON_SIZE} bare />
              </View>
              <Text style={s.address} numberOfLines={1}>
                {destLabel}{routeInfoSuffix}
              </Text>
            </TouchableOpacity>
          )}

          {/* Add stop button */}
          <TouchableOpacity
            style={s.addBtn}
            onPress={onAddStop}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connector: {
    width: CONNECTOR_WIDTH,
    height: CONNECTOR_HEIGHT,
    backgroundColor: COLORS.border,
    marginLeft: TIMELINE_LEFT,
  },
  address: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: T.ink,
    marginLeft: TEXT_LEFT,
  },
  routeInfoSuffix: {
    fontSize: 11,
    fontWeight: '500',
    color: T.inkLight,
  },
  destRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
