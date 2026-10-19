import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Icon } from '../theme/icons';
import { Clock } from 'lucide-react-native';
import { VehiclePicker } from './VehiclePicker';
import { PaymentPicker } from './PaymentPicker';
import { TripOptionsPicker } from './TripOptionsPicker';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const FARE_STEP = 0.5;

interface DriverOffer {
  offerId?: string;
  createdAt?: string | number;
  driverProfilePicture?: string;
  vehicleModel?: string;
  driverName?: string;
  driverRating?: number | string;
  proposedPrice?: number;
  fare?: number;
  timeLeftInSeconds?: number;
}

interface Props {
  bottomClearance?: number;
  rideRequested: boolean;
  requestTimeLeft: number;
  fmtTimer: (sec: number) => string;
  progress: number;
  suggestedFare: number | null;
  originalFare: number | null;
  negotiationMode: boolean;
  onToggleNegotiation: () => void;
  showFareEditor: boolean;
  onToggleFareEditor: () => void;
  onDecrementFare: () => void;
  onIncrementFare: () => void;
  selectedVehicleType: string;
  onSelectVehicle: (id: string) => void;
  scheduleRide: boolean;
  scheduledDate?: Date | null;
  onToggleSchedule: () => void;
  selectedPaymentMethod: string;
  onSelectPayment: (id: string) => void;
  toggleAnim: Animated.Value;
  isCreatingRide: boolean;
  routeLoading: boolean;
  onConfirmTrip: () => void;
  onCancelRide: () => void;
  driverOffers?: DriverOffer[];
  onRejectOffer?: (offerId: string) => void;
  onAcceptOffer?: (offer: DriverOffer) => void;
  fareAdjusted?: boolean;
}

export const RideRequestPanel: React.FC<Props> = ({
  bottomClearance = 0,
  rideRequested,
  requestTimeLeft,
  fmtTimer,
  progress,
  suggestedFare,
  originalFare,
  negotiationMode,
  onToggleNegotiation,
  showFareEditor,
  onToggleFareEditor,
  onDecrementFare,
  onIncrementFare,
  selectedVehicleType,
  onSelectVehicle,
  scheduleRide,
  scheduledDate,
  onToggleSchedule,
  selectedPaymentMethod,
  onSelectPayment,
  toggleAnim,
  isCreatingRide,
  routeLoading,
  onConfirmTrip,
  onCancelRide,
  driverOffers = [],
  onRejectOffer,
  onAcceptOffer,
  fareAdjusted = false,
}) => {
  return (
    <View style={[s.panel, { paddingBottom: 16 + bottomClearance }]}>
      <View style={s.handle} />

      {suggestedFare != null && !rideRequested && (
        <View style={s.fareRow}>
          <Text style={s.fareTitle}>{negotiationMode ? 'TU TARIFA' : 'TARIFA ESTIMADA'}</Text>
          <View style={s.fareTopRow}>
            <Text style={s.fareValue} numberOfLines={1} adjustsFontSizeToFit>Bs {suggestedFare.toFixed(2)}</Text>
            {negotiationMode && !rideRequested && (
              <TouchableOpacity
                style={s.fareEditBtn}
                onPress={onToggleFareEditor}
                activeOpacity={0.8}
              >
                <Icon.Pencil size={14} color={T.accent} strokeWidth={2.5} />
                <Text style={s.fareEditText}>Cambiar</Text>
              </TouchableOpacity>
            )}
          </View>
          {originalFare != null && (
            <Text style={s.fareHint}>Tarifa sugerida: Bs {originalFare.toFixed(2)}</Text>
          )}
          {showFareEditor && negotiationMode && (
            <View style={s.fareControls}>
              <TouchableOpacity
                style={s.fareBtn}
                onPress={onDecrementFare}
                accessibilityRole="button"
                accessibilityLabel="Disminuir tarifa"
              >
                <Icon.Minus size={22} color={T.accent} />
              </TouchableOpacity>
              <Text style={s.fareControlsLabel}>Ajustar tarifa</Text>
              <TouchableOpacity
                style={s.fareBtn}
                onPress={onIncrementFare}
                accessibilityRole="button"
                accessibilityLabel="Aumentar tarifa"
              >
                <Icon.Plus size={22} color={T.accent} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!rideRequested && (
        <>
          <View style={s.selectorsContainer}>
            <View style={s.vehicleRow}>
              <View style={s.vehiclePickerWrap}>
                <VehiclePicker
                  selected={selectedVehicleType}
                  onSelect={onSelectVehicle}
                />
              </View>
              <TouchableOpacity
                style={[s.scheduleIconBtn, scheduleRide && s.scheduleIconBtnActive]}
                onPress={onToggleSchedule}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Programar viaje"
              >
                <Icon.Clock size={22} color={scheduleRide ? T.accent : T.ink} strokeWidth={2.3} />
              </TouchableOpacity>
            </View>
            <View style={s.paymentRow}>
              <View style={s.paymentPickerWrap}>
                <PaymentPicker
                  selected={selectedPaymentMethod}
                  onSelect={onSelectPayment}
                />
              </View>
              <TripOptionsPicker
                onAddStop={() => { }}
              />
            </View>
            {scheduledDate && (
              <View style={s.scheduleBadge}>
                <Icon.Clock size={14} color={T.accent} />
                <Text style={s.scheduleBadgeText}>
                  Programado: {scheduledDate.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <View style={s.switchRow}>
              <View style={s.switchLabelWrap}>
                <Icon.Handshake size={22} color="#000000" strokeWidth={2.3} />
                <Text style={s.switchLabel}>Modo negociación</Text>
              </View>
              <TouchableOpacity
                style={[
                  s.negotiationToggle,
                  negotiationMode && s.negotiationToggleActive,
                ]}
                onPress={onToggleNegotiation}
                activeOpacity={0.85}
                accessibilityRole="switch"
                accessibilityState={{ checked: negotiationMode }}
                accessibilityLabel="Modo negociación"
              >
                <Animated.View
                  style={[
                    s.negotiationThumb,
                    {
                      transform: [{
                        translateX: toggleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 18],
                        }),
                      }],
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.ctaRow}>
            <TouchableOpacity
              style={[s.ctaBtn, isCreatingRide && { opacity: 0.7 }]}
              onPress={onConfirmTrip}
              activeOpacity={0.85}
              disabled={isCreatingRide}
            >
              {routeLoading || isCreatingRide ? (
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <Text style={s.ctaBtnText}>Solicitar viaje</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {rideRequested && (
        <View style={s.timerBar}>
          <Clock size={16} color={'#7A7A8A'} strokeWidth={2} />
          <Text style={s.timerBarLabel}>Tiempo restante estimado</Text>
          <Text style={s.timerBarValue}>{fmtTimer(requestTimeLeft)}</Text>
        </View>
      )}

       {rideRequested && negotiationMode && (
        <TouchableOpacity
          style={[s.fareEditBtnBottom, !fareAdjusted && s.fareEditBtnBottomDisabled]}
          onPress={fareAdjusted ? onToggleFareEditor : undefined}
          activeOpacity={fareAdjusted ? 0.8 : 1}
          disabled={!fareAdjusted}
        >
          <Text style={[s.fareEditBtnBottomText, !fareAdjusted && s.fareEditBtnBottomTextDisabled]}>
            Mejorar Tarifa
          </Text>
        </TouchableOpacity>
      )}

      {rideRequested && (
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={onCancelRide}
          activeOpacity={0.8}
        >
          <Text style={s.cancelBtnText}>Cancelar solicitud</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  panel: {
    backgroundColor: T.white,
    marginTop: -18,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 6,
  },
  fareRow: { gap: 0 },
  fareTitle: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: '#7A7A8A', letterSpacing: 0.8 },
  fareTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fareValue: { flexShrink: 1, fontSize: 42, lineHeight: 48, fontWeight: '800', color: '#111118', fontFamily: 'Montserrat', letterSpacing: -0.8 },
  fareHint: { fontSize: 13, lineHeight: 17, fontWeight: '500', color: '#7A7A8A' },
  fareEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F3EAFC',
  },
  fareEditText: { fontSize: 13, fontWeight: '700', color: T.accent },
  fareControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7F7F9', borderRadius: 12, padding: 6, marginTop: 8 },
  fareControlsLabel: { fontSize: 13, fontWeight: '600', color: '#7A7A8A' },
  fareBtn: { width: 40, height: 40, borderRadius: 9, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F7F7F9',
  },
  cancelBtnText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111118',
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  selectorsContainer: { marginTop: 10, marginBottom: 14, gap: 10 },
  selectorRow: { flexDirection: 'column', gap: 8 },
  vehicleRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  vehiclePickerWrap: { flex: 1 },
  scheduleIconBtn: {
    width: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F9',
  },
  scheduleIconBtnActive: { backgroundColor: '#F3EAFC' },
  paymentRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  paymentPickerWrap: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  switchLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: '#000000' },
  negotiationToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  negotiationToggleActive: { backgroundColor: T.accent },
  negotiationThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  ctaRow: { flexDirection: 'row' },
  ghostBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  ctaBtn: { flex: 1, minHeight: 54, borderRadius: 12, backgroundColor: T.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ctaBtnText: { fontSize: 19, fontWeight: '700', color: T.white, textAlign: 'center' },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: -4,
  },
  scheduleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.accent,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  timerBarLabel: {
    fontSize: 13,
    color: '#7A7A8A',
    fontWeight: '500',
  },
  timerBarValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111118',
    marginLeft: 4,
  },
  fareEditBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 10,
    backgroundColor: T.accent,
    marginBottom: 12,
  },
  fareEditBtnBottomText: {
    fontSize: 19,
    fontWeight: '700',
    color: T.white,
    letterSpacing: 0.2,
    textAlign: 'center',
    flex: 1,
  },
  fareEditBtnBottomDisabled: {
    backgroundColor: '#D1D5DB',
  },
  fareEditBtnBottomTextDisabled: {
    color: '#9CA3AF',
  },
});
