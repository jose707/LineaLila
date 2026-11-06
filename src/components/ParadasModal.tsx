import React from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Modal } from
'react-native';
import { Minus, X } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T, COLORS as Colores } from '../theme/colors';
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "./MapUbicacionIcons";

interface Propiedades {
  visible: boolean;
  onClose: () => void;
  pickupAddress: string;
  tempPickupAddress: string;
  destinationAddress: string;
  waypoints: {address: string;}[];
  onRemoveWaypoint: (index: number) => void;
}

const ICONO_TAMANO = 28;
const LINEA_ANCHO = 2;
const LINEA_IZQUIERDA = ICONO_TAMANO / 2 - LINEA_ANCHO / 2;

const ParadasModal: React.FC<Propiedades> = ({
  visible,
  onClose: alCerrar,
  pickupAddress: recogidaDireccion,
  tempPickupAddress: temporalRecogidaDireccion,
  destinationAddress: destinoDireccion,
  waypoints: paradas,
  onRemoveWaypoint: alQuitarParada
}) => {
  const margenes = usarSeguraZonaMargenes();
  const origenEtiqueta = recogidaDireccion || temporalRecogidaDireccion || '';
  const destEtiqueta = destinoDireccion || '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={alCerrar}>

      <Vista style={s.modalRoot}>
        <PulsableOpacidad
          style={s.overlay}
          activeOpacity={1}
          onPress={alCerrar} />

        <Vista style={[s.sheet, { paddingBottom: margenes.bottom + 24 }]}>
          {/* Handle */}
          <Vista style={s.handle} />

          {/* Header */}
          <Vista style={s.header}>
            <Texto style={s.title}>
              Recorrido
            </Texto>
            <PulsableOpacidad
              style={s.closeBtn}
              onPress={alCerrar}
              activeOpacity={0.7}>

              <X size={20} color={T.inkLight} />
            </PulsableOpacidad>
          </Vista>

          {/* Timeline */}
          <Vista style={s.timeline}>
            {/* Origin */}
            <Vista style={s.row}>
              <PasajeroMapaIcono size={ICONO_TAMANO} bare />
              <Vista style={s.rowContent}>
                <Texto style={s.address} numberOfLines={2}>
                  {origenEtiqueta}
                </Texto>
              </Vista>
            </Vista>

            {/* Waypoints */}
            {paradas.map((parada, indice) =>
            <Vista key={`stop-${indice}`}>
                <Vista style={s.line} />
                <Vista style={s.row}>
                  <ParadaMapaIcon number={indice + 1} size={28} />
                  <Vista style={s.rowContent}>
                    <Texto style={s.address} numberOfLines={2}>
                      {parada.address}
                    </Texto>
                  </Vista>
                  <PulsableOpacidad
                  style={s.removeBtn}
                  onPress={() => alQuitarParada(indice)}
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar P${indice + 1}`}
                  activeOpacity={0.7}>

                    <Minus size={18} color={T.ink} strokeWidth={2.5} />
                  </PulsableOpacidad>
                </Vista>
              </Vista>
            )}

            {/* Destination */}
            <Vista style={s.line} />
            <Vista style={s.row}>
              <DestinoIndicadorIcon size={ICONO_TAMANO} bare />
              <Vista style={s.rowContent}>
                <Texto style={s.address} numberOfLines={2}>
                  {destEtiqueta}
                </Texto>
              </Vista>
            </Vista>
          </Vista>
        </Vista>
      </Vista>
    </Modal>);

};export { ParadasModal };

const s = EstiloHoja.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  overlay: {
    ...EstiloHoja.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: T.ink
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeline: {
    paddingLeft: 2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
    paddingTop: 3
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  address: {
    fontSize: 15,
    fontWeight: '600',
    color: T.ink,
    lineHeight: 20
  },
  line: {
    width: LINEA_ANCHO,
    height: 20,
    backgroundColor: Colores.border,
    marginLeft: LINEA_IZQUIERDA
  }
});
