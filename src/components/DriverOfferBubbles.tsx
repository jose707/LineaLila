import { privateImageSource } from '../utils/privateImageSource';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Icon } from '../theme/icons';
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import { offerSecondsLeft } from '../utils/offerCountdown';

interface DriverOffer {
  offerId?: string;
  expiresAt?: string;
  serverOffsetMs?: number;
  driverProfilePicture?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  driverName?: string;
  driverRating?: number | string;
  proposedPrice?: number;
  fare?: number;
}

interface Props {
  offers: DriverOffer[];
  onReject: (offerId: string) => void;
  onAccept: (offer: DriverOffer) => void;
  bottomOffset?: number;
}

export const DriverOfferBubbles: React.FC<Props> = ({ offers, onReject, onAccept, bottomOffset = 340 }) => {
  if (offers.length === 0) return null;

  return (
    <View style={[s.offersBubblesContainer, { bottom: bottomOffset }]} pointerEvents="box-none">
      <ScrollView
        style={s.offersScroll}
        contentContainerStyle={s.offersBubbles}
        showsVerticalScrollIndicator={offers.length > 1}
      >
        {offers.map((offer, i) => {
          const rem = offerSecondsLeft(offer.expiresAt, Date.now(), offer.serverOffsetMs);
          if (rem <= 0) return null;
          const price = Number(offer.proposedPrice ?? offer.fare ?? 0);

          return (
            <View
              key={offer.offerId || i}
              style={s.offerBubble}
              pointerEvents="auto"
            >
              <View style={s.offerContent}>
                <View style={s.offerHeader}>
                  {offer.driverProfilePicture ? (
                    <Image
                      source={privateImageSource(offer.driverProfilePicture)}
                      style={s.offerAvatar}
                    />
                  ) : (
                    <View style={s.offerAvatar}>
                      <Icon.Car size={28} color="#7514C5" />
                    </View>
                  )}

                  <View style={s.offerInfo}>
                    <View style={s.offerNameRow}>
                      <Text style={s.offerDriverName} numberOfLines={1}>
                        {offer.driverName || 'Conductor'}
                      </Text>
                      <Text style={s.offerPrice}>Bs {Number.isFinite(price) ? price.toFixed(2) : '0.00'}</Text>
                    </View>
                    <View style={s.offerVehicleRow}>
                      <Text style={s.offerVehicleText} numberOfLines={1}>
                        {offer.vehicleModel || 'Vehículo'}
                        {offer.vehicleColor ? ` · ${offer.vehicleColor}` : ''}
                      </Text>
                      <View style={s.offerRatingRow}>
                        <Icon.Star size={13} color={T.accent} />
                        <Text style={s.offerRatingText}>{offer.driverRating ?? '5.0'}</Text>
                      </View>
                    </View>
                    <View style={s.offerBottomRow}>
                      <View style={s.offerPlateBadge}>
                        <Text style={s.offerPlateText}>{offer.licensePlate || '—'}</Text>
                      </View>
                      <View style={[s.offerTimerRow, rem <= 10 && s.offerTimerUrgent]}>
                        <Icon.Clock size={14} color={rem <= 10 ? '#B45309' : '#64748B'} />
                        <Text style={[s.offerStatText, rem <= 10 && s.offerStatUrgent]}>{rem}s</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={s.offerActions}>
                  <TouchableOpacity
                    style={s.offerRejectBtn}
                    onPress={() => offer.offerId && onReject(offer.offerId)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.offerRejectText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.offerAcceptBtn}
                    onPress={() => onAccept(offer)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.offerAcceptText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  offersBubblesContainer: { position: 'absolute', top: 112, left: 16, right: 16, zIndex: 50, elevation: 22, alignItems: 'center' },
  offersScroll: { flex: 1, width: '100%', maxWidth: 400 },
  offersBubbles: { gap: 12, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 12 },
  offerBubble: { width: '100%', backgroundColor: T.white, borderRadius: 24, borderWidth: 1, borderColor: '#EEE8F4', shadowColor: '#170B22', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 8 },
  offerContent: { padding: 18 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F3EAFC', alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 4 }] },
  offerInfo: { flex: 1, minWidth: 0, justifyContent: 'center' },
  offerNameRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  offerDriverName: { flex: 1, minWidth: 0, fontSize: 18, lineHeight: 22, includeFontPadding: false, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  offerVehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 0 },
  offerVehicleText: { flexShrink: 1, fontSize: 13, lineHeight: 16, includeFontPadding: false, fontWeight: '500', color: '#64748B' },
  offerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3EAFC', borderRadius: 9, paddingHorizontal: 6 },
  offerRatingText: { fontSize: 12, fontWeight: '800', color: T.accent },
  offerBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 },
  offerPlateBadge: { backgroundColor: '#111118', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 },
  offerPlateText: { fontSize: 12, lineHeight: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  offerTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  offerTimerUrgent: { backgroundColor: '#FEF3C7' },
  offerStatText: { fontSize: 12, lineHeight: 14, color: '#475569', fontWeight: '700' },
  offerStatUrgent: { color: '#B45309' },
  offerPrice: { fontSize: 31, lineHeight: 31, fontWeight: '800', color: '#0F172A', letterSpacing: -0.8 },
  offerActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  offerRejectBtn: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: '#F7F7F9', alignItems: 'center', justifyContent: 'center' },
  offerRejectText: { fontSize: 19, fontWeight: '700', color: '#000000' },
  offerAcceptBtn: { flex: 1.35, minHeight: 52, borderRadius: 14, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  offerAcceptText: { fontSize: 18, fontWeight: '800', color: T.white },
});
