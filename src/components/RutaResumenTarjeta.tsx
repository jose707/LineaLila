import React from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Animated as Animado } from
'react-native';
import { Plus } from 'lucide-react-native';
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "./MapUbicacionIcons";
import { MAPSCREEN_COLORS as T, COLORS as Colores } from '../theme/colors';

interface RutaInformacion {
  distance: number;
  duration: number;
}

interface Propiedades {
  slideOffset: Animado.Value;
  disabled?: boolean;
  pickupAddress: string;
  tempPickupAddress: string;
  destinationAddress: string;
  waypoints: any[];
  routeInfo: RutaInformacion | null;
  onPressOrigin: () => void;
  onPressStops: () => void;
  onAddStop: () => void;
  insetsTop: number;
  fmtDist: (m: number) => string;
  fmtTime: (sec: number) => string;
}

const ICONO_TAMANO = 30;
const CONNECTOR_ANCHO = 1.5;
const CONNECTOR_ALTO = 12;
const TIMELINE_IZQUIERDA = ICONO_TAMANO / 2 - CONNECTOR_ANCHO / 2;
const TEXTO_IZQUIERDA = 10;

const RutaResumenTarjeta: React.FC<Propiedades> = ({
  slideOffset: slideDesplazamiento,
  disabled: deshabilitado = false,
  pickupAddress: recogidaDireccion,
  tempPickupAddress: temporalRecogidaDireccion,
  destinationAddress: destinoDireccion,
  waypoints: paradas,
  routeInfo: rutaInformacion,
  onPressOrigin: alPulsarOrigen,
  onPressStops: alPulsarParadas,
  onAddStop: alAgregarParada,
  insetsTop: margenesSuperior,
  fmtDist: formatoDistancia,
  fmtTime: formatoTiempo
}) => {
  const tieneParadas = paradas.length > 0;
  const origenEtiqueta = (recogidaDireccion || temporalRecogidaDireccion || '').split(',')[0];
  const destEtiqueta = (destinoDireccion || '').split(',')[0];
  const rutaInformacionSufijo = rutaInformacion ?
  <Texto style={s.routeInfoSuffix}>
      {' '}· {formatoDistancia(rutaInformacion.distance)} · {formatoTiempo(rutaInformacion.duration)}
    </Texto> :
  null;

  return (
    <Animado.View pointerEvents={deshabilitado ? 'none' : 'auto'} style={[s.card, { top: 8 + margenesSuperior, transform: [{ translateY: slideDesplazamiento }] }]}>
      <Vista>

        {/* Origin */}
        <PulsableOpacidad
          style={s.timelineRow}
          onPress={alPulsarOrigen}
          activeOpacity={0.6}>

          <Vista style={s.iconSlot}>
            <PasajeroMapaIcono size={ICONO_TAMANO} bare />
          </Vista>
          <Texto style={s.address} numberOfLines={1}>
            {origenEtiqueta}
          </Texto>
        </PulsableOpacidad>

        {/* Connector */}
        <Vista style={s.connector} />

        {/* Second line: destination or stops */}
        <Vista style={s.timelineRow}>
          {tieneParadas ?
          <PulsableOpacidad
            style={s.destRow}
            onPress={alPulsarParadas}
            activeOpacity={0.6}>

              <Vista style={s.routeIcons}>
                {paradas.map((_, indice) => <ParadaMapaIcon key={indice} number={indice + 1} size={22} />)}
                <DestinoIndicadorIcon size={ICONO_TAMANO} bare />
              </Vista>
              <Texto style={s.address} numberOfLines={1}>
                {destEtiqueta}{rutaInformacionSufijo}
              </Texto>
            </PulsableOpacidad> :

          <PulsableOpacidad
            style={s.destRow}
            onPress={alPulsarParadas}
            activeOpacity={0.6}>

              <Vista style={s.iconSlot}>
                <DestinoIndicadorIcon size={ICONO_TAMANO} bare />
              </Vista>
              <Texto style={s.address} numberOfLines={1}>
                {destEtiqueta}{rutaInformacionSufijo}
              </Texto>
            </PulsableOpacidad>
          }

          {/* Add stop button */}
          <PulsableOpacidad
            style={s.addBtn}
            onPress={alAgregarParada}
            activeOpacity={0.8}>

            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          </PulsableOpacidad>
        </Vista>
      </Vista>
    </Animado.View>);

};export { RutaResumenTarjeta };

const s = EstiloHoja.create({
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
    borderWidth: EstiloHoja.hairlineWidth,
    borderColor: Colores.border
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32
  },
  iconSlot: {
    width: ICONO_TAMANO,
    height: ICONO_TAMANO,
    alignItems: 'center',
    justifyContent: 'center'
  },
  routeIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connector: {
    width: CONNECTOR_ANCHO,
    height: CONNECTOR_ALTO,
    backgroundColor: Colores.border,
    marginLeft: TIMELINE_IZQUIERDA
  },
  address: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: T.ink,
    marginLeft: TEXTO_IZQUIERDA
  },
  routeInfoSuffix: {
    fontSize: 11,
    fontWeight: '500',
    color: T.inkLight
  },
  destRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  }
});
