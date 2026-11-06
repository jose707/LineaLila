import React from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  ActivityIndicator as ActividadIndicador,
  Animated as Animado } from
'react-native';
import { Icon } from '../theme/icons';
import { Clock as Reloj } from 'lucide-react-native';
import { VehiculoSelector } from "./VehiculoSelector";
import { PagoSelector } from "./PagoSelector";
import { ViajeOpcionesSelector } from "./ViajeOpcionesSelector";
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const TARIFA_PASO = 0.5;

interface ConductorOferta {
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

interface Propiedades {
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
  selectedPaymentMethod: string;
  onSelectPayment: (id: string) => void;
  toggleAnim: Animado.Value;
  isCreatingRide: boolean;
  routeLoading: boolean;
  onConfirmTrip: () => void;
  onCancelRide: () => void;
  driverOffers?: ConductorOferta[];
  onRejectOffer?: (offerId: string) => void;
  onAcceptOffer?: (offer: ConductorOferta) => void;
  fareAdjusted?: boolean;
}

const ViajeSolicitudPanel: React.FC<Propiedades> = ({
  bottomClearance: inferiorClearance = 0,
  rideRequested: viajeSolicitado,
  requestTimeLeft: solicitudTiempoIzquierda,
  fmtTimer: formatoTemporizador,
  progress: progreso,
  suggestedFare: sugeridoTarifa,
  originalFare: originalTarifa,
  negotiationMode: negociacionModo,
  onToggleNegotiation: alAlternarNegociacion,
  showFareEditor: mostrarTarifaEditor,
  onToggleFareEditor: alAlternarTarifaEditor,
  onDecrementFare: alDecrementTarifa,
  onIncrementFare: alIncrementTarifa,
  selectedVehicleType: seleccionadoVehiculoTipo,
  onSelectVehicle: alSeleccionarVehiculo,
  selectedPaymentMethod: seleccionadoPagoMetodo,
  onSelectPayment: alSeleccionarPago,
  toggleAnim: alternarAnimacion,
  isCreatingRide: esCreandoViaje,
  routeLoading: rutaCargando,
  onConfirmTrip: alConfirmarViaje,
  onCancelRide: alCancelarViaje,
  driverOffers: conductorOfertas = [],
  onRejectOffer: alRechazarOferta,
  onAcceptOffer: alAceptarOferta,
  fareAdjusted: tarifaAdjusted = false
}) => {
  return (
    <Vista style={[s.panel, { paddingBottom: 16 + inferiorClearance }]}>
      <Vista style={s.handle} />

      {sugeridoTarifa != null && !viajeSolicitado &&
      <Vista style={s.fareRow}>
          <Texto style={s.fareTitle}>{negociacionModo ? 'TU TARIFA' : 'TARIFA ESTIMADA'}</Texto>
          <Vista style={s.fareTopRow}>
            <Texto style={s.fareValue} numberOfLines={1} adjustsFontSizeToFit>Bs {sugeridoTarifa.toFixed(2)}</Texto>
            {negociacionModo && !viajeSolicitado &&
          <PulsableOpacidad
            style={s.fareEditBtn}
            onPress={alAlternarTarifaEditor}
            activeOpacity={0.8}>

                <Icon.Pencil size={14} color={T.accent} strokeWidth={2.5} />
                <Texto style={s.fareEditText}>Cambiar</Texto>
              </PulsableOpacidad>
          }
          </Vista>
          {originalTarifa != null &&
        <Texto style={s.fareHint}>Tarifa sugerida: Bs {originalTarifa.toFixed(2)}</Texto>
        }
          {mostrarTarifaEditor && negociacionModo &&
        <Vista style={s.fareControls}>
              <PulsableOpacidad
            style={s.fareBtn}
            onPress={alDecrementTarifa}
            accessibilityRole="button"
            accessibilityLabel="Disminuir tarifa">

                <Icon.Minus size={22} color={T.accent} />
              </PulsableOpacidad>
              <Texto style={s.fareControlsLabel}>Ajustar tarifa</Texto>
              <PulsableOpacidad
            style={s.fareBtn}
            onPress={alIncrementTarifa}
            accessibilityRole="button"
            accessibilityLabel="Aumentar tarifa">

                <Icon.Plus size={22} color={T.accent} />
              </PulsableOpacidad>
            </Vista>
        }
        </Vista>
      }

      {!viajeSolicitado &&
      <>
          <Vista style={s.selectorsContainer}>
            <Vista style={s.vehicleRow}>
              <Vista style={s.vehiclePickerWrap}>
                <VehiculoSelector
                selected={seleccionadoVehiculoTipo}
                onSelect={alSeleccionarVehiculo} />

              </Vista>
            </Vista>
            <Vista style={s.paymentRow}>
              <Vista style={s.paymentPickerWrap}>
                <PagoSelector
                selected={seleccionadoPagoMetodo}
                onSelect={alSeleccionarPago} />

              </Vista>
              <ViajeOpcionesSelector
              onAddStop={() => {}} />

            </Vista>
            <Vista style={s.switchRow}>
              <Vista style={s.switchLabelWrap}>
                <Icon.Handshake size={22} color="#000000" strokeWidth={2.3} />
                <Texto style={s.switchLabel}>Modo negociación</Texto>
              </Vista>
              <PulsableOpacidad
              style={[
              s.negotiationToggle,
              negociacionModo && s.negotiationToggleActive]
              }
              onPress={alAlternarNegociacion}
              activeOpacity={0.85}
              accessibilityRole="switch"
              accessibilityState={{ checked: negociacionModo }}
              accessibilityLabel="Modo negociación">

                <Animado.View
                style={[
                s.negotiationThumb,
                {
                  transform: [{
                    translateX: alternarAnimacion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 18]
                    })
                  }]
                }]
                } />

              </PulsableOpacidad>
            </Vista>
          </Vista>

          <Vista style={s.ctaRow}>
            <PulsableOpacidad
            style={[s.ctaBtn, esCreandoViaje && { opacity: 0.7 }]}
            onPress={alConfirmarViaje}
            activeOpacity={0.85}
            disabled={esCreandoViaje}>

              {rutaCargando || esCreandoViaje ?
            <ActividadIndicador size="small" color={T.white} /> :

            <Texto style={s.ctaBtnText}>Solicitar viaje</Texto>
            }
            </PulsableOpacidad>
          </Vista>
        </>
      }

      {viajeSolicitado &&
      <Vista style={s.timerBar}>
          <Reloj size={16} color={'#7A7A8A'} strokeWidth={2} />
          <Texto style={s.timerBarLabel}>Tiempo restante estimado</Texto>
          <Texto style={s.timerBarValue}>{formatoTemporizador(solicitudTiempoIzquierda)}</Texto>
        </Vista>
      }

       {viajeSolicitado && negociacionModo &&
      <PulsableOpacidad
        style={[s.fareEditBtnBottom, !tarifaAdjusted && s.fareEditBtnBottomDisabled]}
        onPress={tarifaAdjusted ? alAlternarTarifaEditor : undefined}
        activeOpacity={tarifaAdjusted ? 0.8 : 1}
        disabled={!tarifaAdjusted}>

          <Texto style={[s.fareEditBtnBottomText, !tarifaAdjusted && s.fareEditBtnBottomTextDisabled]}>
            Mejorar Tarifa
          </Texto>
        </PulsableOpacidad>
      }

      {viajeSolicitado &&
      <PulsableOpacidad
        style={s.cancelBtn}
        onPress={alCancelarViaje}
        activeOpacity={0.8}>

          <Texto style={s.cancelBtnText}>Cancelar solicitud</Texto>
        </PulsableOpacidad>
      }
    </Vista>);

};export { ViajeSolicitudPanel };

const s = EstiloHoja.create({
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
    elevation: 12
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 6
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
    backgroundColor: '#F3EAFC'
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
    backgroundColor: '#F7F7F9'
  },
  cancelBtnText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111118',
    textAlign: 'center',
    alignSelf: 'stretch'
  },
  selectorsContainer: { marginTop: 10, marginBottom: 14, gap: 10 },
  selectorRow: { flexDirection: 'column', gap: 8 },
  vehicleRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  vehiclePickerWrap: { flex: 1 },
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
    paddingHorizontal: 3
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
    elevation: 3
  },
  ctaRow: { flexDirection: 'row' },
  ghostBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  ctaBtn: { flex: 1, minHeight: 54, borderRadius: 12, backgroundColor: T.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ctaBtnText: { fontSize: 19, fontWeight: '700', color: T.white, textAlign: 'center' },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12
  },
  timerBarLabel: {
    fontSize: 13,
    color: '#7A7A8A',
    fontWeight: '500'
  },
  timerBarValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111118',
    marginLeft: 4
  },
  fareEditBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 10,
    backgroundColor: T.accent,
    marginBottom: 12
  },
  fareEditBtnBottomText: {
    fontSize: 19,
    fontWeight: '700',
    color: T.white,
    letterSpacing: 0.2,
    textAlign: 'center',
    flex: 1
  },
  fareEditBtnBottomDisabled: {
    backgroundColor: '#D1D5DB'
  },
  fareEditBtnBottomTextDisabled: {
    color: '#9CA3AF'
  }
});
