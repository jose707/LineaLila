import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '../theme/icons';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

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
  suggestedFare: number | null;
  expanded: boolean;
  onToggleExpand: () => void;
  insetsTop: number;
  fmtDist: (m: number) => string;
  fmtTime: (sec: number) => string;
}

export const RouteSummaryCard: React.FC<Props> = ({
  pickupAddress,
  tempPickupAddress,
  destinationAddress,
  waypoints,
  routeInfo,
  suggestedFare,
  expanded,
  onToggleExpand,
  insetsTop,
  fmtDist,
  fmtTime,
}) => {
  return (
    <TouchableOpacity
      style={[s.routeTopCard, { top: 5 + insetsTop }]}
      onPress={onToggleExpand}
      activeOpacity={0.95}
    >
      {expanded ? (
        <View>
          <View style={s.routeTopExpandedDetail}>
            <View style={s.routeTopDetailRow}>
              <View style={[s.routeTopDetailDot, { backgroundColor: '#22C55E' }]} />
              <Text style={s.routeTopDetailText} numberOfLines={2}>
                {pickupAddress || tempPickupAddress}
              </Text>
            </View>
            {waypoints.map((wp: any, idx: number) => (
              <View key={`wp-top-${idx}`}>
                <View style={s.routeTopDetailLine} />
                <View style={s.routeTopDetailRow}>
                  <View style={[s.routeTopDetailDot, { backgroundColor: '#A78BFA' }]} />
                  <Text style={s.routeTopDetailText} numberOfLines={1}>
                    {wp.address}
                  </Text>
                </View>
              </View>
            ))}
            <View style={s.routeTopDetailLine} />
            <View style={s.routeTopDetailRow}>
              <View style={[s.routeTopDetailDot, { backgroundColor: '#7C3AED' }]} />
              <Text style={s.routeTopDetailText} numberOfLines={2}>
                {destinationAddress}
              </Text>
            </View>
          </View>
          <View style={s.routeTopStatsInline}>
            {routeInfo && (
              <>
                <View style={s.routeTopStatItem}>
                  <Icon.Distance size={12} color={T.inkLight} />
                  <Text style={s.routeTopStatText}>{fmtDist(routeInfo.distance)}</Text>
                </View>
                <View style={s.routeTopStatDot} />
                <View style={s.routeTopStatItem}>
                  <Icon.Clock size={12} color={T.inkLight} />
                  <Text style={s.routeTopStatText}>{fmtTime(routeInfo.duration)}</Text>
                </View>
                <View style={s.routeTopStatDot} />
              </>
            )}
            <View style={s.routeTopStatItem}>
              <Icon.Money size={12} color={T.accent} />
              <Text style={[s.routeTopStatText, { color: T.accent, fontWeight: '700' }]}>
                {suggestedFare != null ? `Bs ${suggestedFare.toFixed(2)}` : '—'}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View>
          <View style={s.routeTopCollapsed}>
            <View style={s.routeTopOrigin}>
              <View style={[s.routeTopDot, s.routeTopDotGreen]} />
              <Text style={s.routeTopAddr} numberOfLines={1}>
                {(pickupAddress || tempPickupAddress || '').split(',')[0]}
              </Text>
            </View>
            <View style={s.routeTopArrow}>
              <Icon.Distance size={16} color={T.border} />
            </View>
            <View style={s.routeTopDest}>
              <View style={[s.routeTopDot, s.routeTopDotPurple]} />
              <Text style={s.routeTopAddr} numberOfLines={1}>
                {(destinationAddress || '').split(',')[0]}
              </Text>
            </View>
          </View>
          <View style={s.routeTopStatsInline}>
            {routeInfo && (
              <>
                <View style={s.routeTopStatItem}>
                  <Icon.Distance size={12} color={T.inkLight} />
                  <Text style={s.routeTopStatText}>{fmtDist(routeInfo.distance)}</Text>
                </View>
                <View style={s.routeTopStatDot} />
                <View style={s.routeTopStatItem}>
                  <Icon.Clock size={12} color={T.inkLight} />
                  <Text style={s.routeTopStatText}>{fmtTime(routeInfo.duration)}</Text>
                </View>
                <View style={s.routeTopStatDot} />
              </>
            )}
            <View style={s.routeTopStatItem}>
              <Icon.Money size={12} color={T.accent} />
              <Text style={[s.routeTopStatText, { color: T.accent, fontWeight: '700' }]}>
                {suggestedFare != null ? `Bs ${suggestedFare.toFixed(2)}` : '—'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  routeTopCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  routeTopCollapsed: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  routeTopOrigin: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  routeTopDest: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    justifyContent: 'flex-end',
  },
  routeTopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeTopDotGreen: { backgroundColor: '#22C55E' },
  routeTopDotPurple: { backgroundColor: '#7C3AED' },
  routeTopAddr: {
    fontSize: 13,
    fontWeight: '600',
    color: T.ink,
    marginLeft: 8,
  },
  routeTopArrow: {
    marginHorizontal: 6,
  },
  routeTopStatsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  routeTopStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeTopStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.inkMid,
  },
  routeTopStatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: T.border,
  },
  routeTopExpandedDetail: {
    marginTop: 4,
  },
  routeTopDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  routeTopDetailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 10,
  },
  routeTopDetailText: {
    flex: 1,
    fontSize: 13,
    color: T.ink,
    lineHeight: 18,
  },
  routeTopDetailLine: {
    width: 2,
    height: 14,
    backgroundColor: T.border,
    marginLeft: 3.8,
    marginVertical: 1,
  },
});
