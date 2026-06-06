import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { MAPSCREEN_COLORS as T, COLORS } from '../theme/colors';

interface RouteInfo {
  distance: number;
  duration: number;
}

interface Props {
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

const DOT_ORIGIN = COLORS.primary;
const DOT_STOPS = COLORS.primary;
const DOT_DEST = COLORS.secondary;
const DOT_SIZE = 8;
const CONNECTOR_WIDTH = 1.5;
const CONNECTOR_HEIGHT = 20;
const TIMELINE_LEFT = DOT_SIZE / 2 - CONNECTOR_WIDTH / 2;
const TEXT_LEFT = DOT_SIZE + 10;

export const RouteSummaryCard: React.FC<Props> = ({
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
  const totalStops = waypoints.length + 1;

  const stopsLabel = `${totalStops} ${totalStops === 1 ? 'Parada' : 'Paradas'} de Ruta`;

  const routeInfoSuffix = routeInfo ? (
    <Text style={s.routeInfoSuffix}>
      {' '}· {fmtDist(routeInfo.distance)} · {fmtTime(routeInfo.duration)}
    </Text>
  ) : null;

  return (
    <View style={[s.card, { top: 8 + insetsTop }]}>
      <View style={s.timeline}>

        {/* Origin */}
        <TouchableOpacity
          style={s.timelineRow}
          onPress={onPressOrigin}
          activeOpacity={0.6}
        >
          <View style={[s.dot, { backgroundColor: DOT_ORIGIN }]} />
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
              <View style={[s.dot, { backgroundColor: DOT_STOPS }]} />
              <Text style={s.address} numberOfLines={1}>
                {stopsLabel}{routeInfoSuffix}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.destRow}
              onPress={onPressStops}
              activeOpacity={0.6}
            >
              <View style={[s.dot, { backgroundColor: DOT_DEST }]} />
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
    </View>
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
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  timeline: {
    paddingVertical: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
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
