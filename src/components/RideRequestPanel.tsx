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
import { VehiclePicker } from './VehiclePicker';
import { PaymentPicker } from './PaymentPicker';
import { TripOptionsPicker } from './TripOptionsPicker';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const FARE_STEP = 0.5;

interface Props {
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
  onToggleSchedule: () => void;
  selectedPaymentMethod: string;
  onSelectPayment: (id: string) => void;
  toggleAnim: Animated.Value;
  isCreatingRide: boolean;
  routeLoading: boolean;
  onConfirmTrip: () => void;
  onCancelRide: () => void;
}

export const RideRequestPanel: React.FC<Props> = ({
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
  onToggleSchedule,
  selectedPaymentMethod,
  onSelectPayment,
  toggleAnim,
  isCreatingRide,
  routeLoading,
  onConfirmTrip,
  onCancelRide,
}) => {
  return (
    <View style={[s.panel, { paddingBottom: 10 }]}>
      {rideRequested ? (
        <View style={s.timerWrap}>
          <View style={s.timerInfo}>
            <View style={s.timerDot} />
            <Text style={s.timerLabel}>Buscando conductor</Text>
            <Text style={s.timerVal}>{fmtTimer(requestTimeLeft)}</Text>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${progress * 100}%` as any },
              ]}
            />
          </View>
        </View>
      ) : null}

      {suggestedFare != null && (
        <View style={s.fareRow}>
          <Text style={s.fareTitle}>TU TARIFA</Text>
          <View style={s.fareTopRow}>
            <Text style={s.fareValue}>Bs {suggestedFare.toFixed(2)}</Text>
            {negotiationMode && (
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
            <View style={s.fareWarning}>
              <View style={s.fareWarningLeft}>
                <Icon.ArrowRight size={12} color={T.accent} />
                <Text style={s.fareWarningText}>
                  Tarifa sugerida: Bs {originalFare.toFixed(2)}
                </Text>
              </View>
              <Icon.AlertCircle size={14} color={T.accent} />
            </View>
          )}
          {showFareEditor && (
            <View style={s.fareControls}>
              <TouchableOpacity
                style={s.fareBtn}
                onPress={onDecrementFare}
              >
                <Icon.Minus size={24} color={T.inkMid} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.fareBtn}
                onPress={onIncrementFare}
              >
                <Icon.Plus size={24} color={T.inkMid} />
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
                style={[s.scheduleIconBtn, scheduleRide && { borderColor: T.accent, backgroundColor: T.accent + '10' }]}
                onPress={onToggleSchedule}
                activeOpacity={0.8}
              >
                <Icon.Clock size={22} color="#000000" strokeWidth={2.3} />
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
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={onCancelRide}
          activeOpacity={0.8}
        >
          <Icon.Close size={16} color={T.danger} />
          <Text style={s.cancelBtnText}>Cancelar solicitud</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  panel: {
    backgroundColor: T.white,
    marginTop: -24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  fareRow: { marginBottom: 10 },
  fareTitle: { fontSize: 13, fontWeight: '700', color: '#000000', letterSpacing: 1.2, lineHeight: 10 },
  fareWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.accent + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 2 },
  fareWarningLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fareWarningText: { fontSize: 11, fontWeight: '600', color: T.accent },
  fareTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareValue: { fontSize: 35, fontWeight: '800', color: T.accent, fontFamily: 'Montserrat', lineHeight: 38 },
  fareEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.accent + '40',
    backgroundColor: T.accentSoft,
  },
  fareEditText: { fontSize: 10, fontWeight: '700', color: T.accent, letterSpacing: 0.5 },
  fareControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  fareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  timerWrap: { gap: 10 },
  timerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.warn },
  timerLabel: { flex: 1, fontSize: 13, color: T.inkMid, fontWeight: '500' },
  timerVal: { fontSize: 15, fontWeight: '700', color: T.warn },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: T.border, overflow: 'hidden', marginHorizontal: 2 },
  progressFill: { height: '100%', backgroundColor: T.accent, borderRadius: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: T.danger },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: T.danger },
  selectorsContainer: { marginBottom: 16, gap: 12 },
  selectorRow: { flexDirection: 'column', gap: 8 },
  vehicleRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  vehiclePickerWrap: { flex: 1 },
  scheduleIconBtn: {
    width: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
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
  ctaRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  ctaBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: T.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: T.white, letterSpacing: 0.2 },
});
