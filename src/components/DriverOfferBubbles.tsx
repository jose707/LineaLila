import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Icon } from '../theme/icons';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

interface DriverOffer {
  offerId?: string;
  createdAt?: string | number;
  driverProfilePicture?: string;
  vehicleModel?: string;
  driverName?: string;
  driverRating?: number | string;
  proposedPrice?: number;
  fare?: number;
}

interface Props {
  offers: DriverOffer[];
  onReject: (offerId: string) => void;
  onAccept: (offer: DriverOffer) => void;
}

export const DriverOfferBubbles: React.FC<Props> = ({ offers, onReject, onAccept }) => {
  if (offers.length === 0) return null;

  return (
    <View style={s.offersBubblesContainer} pointerEvents="box-none">
      <View style={s.offersBubbles} pointerEvents="box-none">
        {offers.map((offer, i) => {
          const created =
            typeof offer.createdAt === 'string'
              ? new Date(offer.createdAt).getTime()
              : offer.createdAt || Date.now();
          const rem = Math.max(0, 30 - (Date.now() - created) / 1000);
          if (rem <= 5) return null;

          return (
            <View
              key={offer.offerId || i}
              style={s.offerBubble}
              pointerEvents="auto"
            >
              <View style={s.offerTopBar}>
                <View
                  style={[
                    s.offerProgressFill,
                    { width: `${Math.max(0, (rem - 5) / 25) * 100}%` as any },
                  ]}
                />
              </View>

              <View style={s.offerContent}>
                <View style={s.offerHeader}>
                  {offer.driverProfilePicture ? (
                    <Image
                      source={{ uri: offer.driverProfilePicture }}
                      style={s.offerAvatar}
                    />
                  ) : (
                    <View style={s.offerAvatar}>
                      <Icon.Car size={24} color={'#9CA3AF'} />
                    </View>
                  )}

                  <View style={s.offerInfo}>
                    <Text style={s.offerVehicleText} numberOfLines={1}>
                      {offer.vehicleModel || 'Vehículo'}
                    </Text>
                    <Text style={s.offerDriverName} numberOfLines={1}>
                      {offer.driverName || 'Conductor'}
                    </Text>
                    <View style={s.offerRatingRow}>
                      <Icon.Star size={14} color="#F59E0B" />
                      <Text style={s.offerRatingText}>
                        {offer.driverRating || '5.0'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.offerRightStats}>
                    <Text style={s.offerPrice}>
                      Bs {(offer.proposedPrice || offer.fare || 0).toFixed(2)}
                    </Text>
                    <Text style={s.offerStatText}>{Math.round(rem)}s</Text>
                  </View>
                </View>

                <View style={s.offerActions}>
                  <TouchableOpacity
                    style={s.offerRejectBtn}
                    onPress={() => onReject(offer.offerId!)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.offerRejectText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.offerAcceptBtn}
                    onPress={() => onAccept(offer)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.offerAcceptText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  offersBubblesContainer: { position: 'absolute', top: 140, left: 16, right: 16, alignItems: 'center', justifyContent: 'flex-start', zIndex: 999, pointerEvents: 'box-none' },
  offersBubbles: { width: '100%', maxWidth: 400, alignItems: 'center', pointerEvents: 'box-none', gap: 12 },
  offerBubble: { width: '100%', backgroundColor: T.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  offerTopBar: { height: 4, backgroundColor: '#E5E7EB', width: '100%' },
  offerProgressFill: { height: '100%', backgroundColor: T.accent },
  offerContent: { padding: 16 },
  offerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  offerAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  offerInfo: { flex: 1, justifyContent: 'center' },
  offerVehicleText: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 2 },
  offerDriverName: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  offerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerRatingText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  offerRightStats: { alignItems: 'flex-end' },
  offerPrice: { fontSize: 22, fontWeight: '800', color: T.accent, marginBottom: 4 },
  offerStatText: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  offerActions: { flexDirection: 'row', gap: 12 },
  offerRejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  offerRejectText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  offerAcceptBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  offerAcceptText: { fontSize: 16, fontWeight: '700', color: T.white },
});
