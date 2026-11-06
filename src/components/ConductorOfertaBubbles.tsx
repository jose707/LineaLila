import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Image as Imagen,
  ScrollView as DesplazableVista } from
'react-native';
import { Icon } from '../theme/icons';
import { MAPSCREEN_COLORS as T } from '../theme/colors';
import { ofertaSegundosIzquierda } from "../utils/ofertaCountdown";

interface ConductorOferta {
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

interface Propiedades {
  offers: ConductorOferta[];
  onReject: (offerId: string) => void;
  onAccept: (offer: ConductorOferta) => void;
  bottomOffset?: number;
}

const ConductorOfertaBubbles: React.FC<Propiedades> = ({ offers: ofertas, onReject: alRechazar, onAccept: alAceptar, bottomOffset: inferiorDesplazamiento = 340 }) => {
  if (ofertas.length === 0) return null;

  return (
    <Vista style={[s.offersBubblesContainer, { bottom: inferiorDesplazamiento }]} pointerEvents="box-none">
      <DesplazableVista
        style={s.offersScroll}
        contentContainerStyle={s.offersBubbles}
        showsVerticalScrollIndicator={ofertas.length > 1}>

        {ofertas.map((oferta, indice) => {
          const rem = ofertaSegundosIzquierda(oferta.expiresAt, Date.now(), oferta.serverOffsetMs);
          if (rem <= 0) return null;
          const precio = Number(oferta.proposedPrice ?? oferta.fare ?? 0);

          return (
            <Vista
              key={oferta.offerId || indice}
              style={s.offerBubble}
              pointerEvents="auto">

              <Vista style={s.offerContent}>
                <Vista style={s.offerHeader}>
                  {oferta.driverProfilePicture ?
                  <Imagen
                    source={privadoImagenOrigen(oferta.driverProfilePicture)}
                    style={s.offerAvatar} /> :


                  <Vista style={s.offerAvatar}>
                      <Icon.Car size={28} color="#7514C5" />
                    </Vista>
                  }

                  <Vista style={s.offerInfo}>
                    <Vista style={s.offerNameRow}>
                      <Texto style={s.offerDriverName} numberOfLines={1}>
                        {oferta.driverName || 'Conductor'}
                      </Texto>
                      <Texto style={s.offerPrice}>Bs {Number.isFinite(precio) ? precio.toFixed(2) : '0.00'}</Texto>
                    </Vista>
                    <Vista style={s.offerVehicleRow}>
                      <Texto style={s.offerVehicleText} numberOfLines={1}>
                        {oferta.vehicleModel || 'Vehículo'}
                        {oferta.vehicleColor ? ` · ${oferta.vehicleColor}` : ''}
                      </Texto>
                      <Vista style={s.offerRatingRow}>
                        <Icon.Star size={13} color={T.accent} />
                        <Texto style={s.offerRatingText}>{oferta.driverRating ?? '5.0'}</Texto>
                      </Vista>
                    </Vista>
                    <Vista style={s.offerBottomRow}>
                      <Vista style={s.offerPlateBadge}>
                        <Texto style={s.offerPlateText}>{oferta.licensePlate || '—'}</Texto>
                      </Vista>
                      <Vista style={[s.offerTimerRow, rem <= 10 && s.offerTimerUrgent]}>
                        <Icon.Reloj size={14} color={rem <= 10 ? '#B45309' : '#64748B'} />
                        <Texto style={[s.offerStatText, rem <= 10 && s.offerStatUrgent]}>{rem}s</Texto>
                      </Vista>
                    </Vista>
                  </Vista>
                </Vista>

                <Vista style={s.offerActions}>
                  <PulsableOpacidad
                    style={s.offerRejectBtn}
                    onPress={() => oferta.offerId && alRechazar(oferta.offerId)}
                    activeOpacity={0.8}>

                    <Texto style={s.offerRejectText}>Rechazar</Texto>
                  </PulsableOpacidad>
                  <PulsableOpacidad
                    style={s.offerAcceptBtn}
                    onPress={() => alAceptar(oferta)}
                    activeOpacity={0.8}>

                    <Texto style={s.offerAcceptText}>Aceptar</Texto>
                  </PulsableOpacidad>
                </Vista>
              </Vista>
            </Vista>);

        })}
      </DesplazableVista>
    </Vista>);

};export { ConductorOfertaBubbles };

const s = EstiloHoja.create({
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
  offerAcceptText: { fontSize: 18, fontWeight: '800', color: T.white }
});
