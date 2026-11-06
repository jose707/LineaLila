import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Modal,
  Image as Imagen } from
'react-native';
import { Check as Comprobar, ChevronRight as ChevronDerecha, Users as Usuarios, X } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const VEHICULO_TIPOS = [
{ id: 'taxi', label: 'Taxi', desc: 'Ideal para el día a día', capacity: 4 },
{ id: 'minibus', label: 'Minibús', desc: 'Viaje en grupo', capacity: 8 },
{ id: 'motocicleta', label: 'Moto', desc: 'Entrega inmediata y viaje express', capacity: 1 },
{ id: 'bus', label: 'Bus', desc: 'Máxima capacidad, eventos y excursiones', capacity: 20 }];


interface VehiculoSelectorPropiedades {
  selected: string;
  onSelect: (id: string) => void;
}

const taxiImagen = require('../../assets/taxi.png');
const motoImagen = require('../../assets/moto.png');
const busImagen = require('../../assets/bus.png');
const minibusImagen = require('../../assets/minibus.png');

const VEHICULO_IMAGES: Record<string, any> = {
  taxi: taxiImagen,
  motocicleta: motoImagen,
  bus: busImagen,
  minibus: minibusImagen
};

const VehiculoSelector: React.FC<VehiculoSelectorPropiedades> = ({ selected: seleccionado, onSelect: alSeleccionar }) => {
  const [abrir, establecerAbrir] = usarEstado(false);
  const margenes = usarSeguraZonaMargenes();

  const real = VEHICULO_TIPOS.find((v) => v.id === seleccionado);

  return (
    <>
      <PulsableOpacidad
        style={[
        s.card,
        s.cardWithImg]
        }
        onPress={() => establecerAbrir(true)}
        activeOpacity={0.9}>

        {VEHICULO_IMAGES[seleccionado] &&
        <Imagen source={VEHICULO_IMAGES[seleccionado]} style={s.vehicleImg} />
        }
        <Vista style={s.info}>
          <Vista style={s.nameRow}>
            <Texto style={s.name}>{real?.label}</Texto>
            <Vista style={s.capacityRow}>
              <Usuarios size={13} color={T.ink} />
              <Texto style={s.capacity}>{real?.capacity} pasajeros</Texto>
            </Vista>
          </Vista>
          <Texto style={s.desc}>{real?.desc}</Texto>
        </Vista>
        <ChevronDerecha size={16} color={T.inkLight} />
      </PulsableOpacidad>

      <Modal
        visible={abrir}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => establecerAbrir(false)}>

        <Vista style={s.modalRoot}>
          <PulsableOpacidad
            style={s.overlay}
            activeOpacity={1}
            onPress={() => establecerAbrir(false)} />

          <Vista style={[s.sheet, { paddingBottom: margenes.bottom + 24 }]}>
            <Vista style={s.handle} />
            <Vista style={s.header}>
              <Texto style={s.title}>Seleccionar vehículo</Texto>
              <PulsableOpacidad
                style={s.closeBtn}
                onPress={() => establecerAbrir(false)}
                activeOpacity={0.7}>

                <X size={20} color={T.inkLight} />
              </PulsableOpacidad>
            </Vista>
            {VEHICULO_TIPOS.map((tipo) =>
            <PulsableOpacidad
              key={tipo.id}
              style={[s.item, seleccionado === tipo.id && s.itemActive]}
              onPress={() => {
                alSeleccionar(tipo.id);
                establecerAbrir(false);
              }}
              activeOpacity={0.7}>

                <Imagen source={VEHICULO_IMAGES[tipo.id]} style={s.itemImg} />
                <Vista style={s.itemInfo}>
                  <Vista style={s.nameRow}>
                    <Texto style={[s.itemName, seleccionado === tipo.id && s.itemNameActive]}>
                      {tipo.label}
                    </Texto>
                    <Vista style={s.capacityRow}>
                      <Usuarios size={13} color={T.ink} />
                      <Texto style={s.itemCapacity}>{tipo.capacity} pasajeros</Texto>
                    </Vista>
                  </Vista>
                  <Texto style={s.itemDesc}>{tipo.desc}</Texto>
                </Vista>
                {seleccionado === tipo.id &&
              <Comprobar size={18} color={T.accent} />
              }
              </PulsableOpacidad>
            )}
          </Vista>
        </Vista>
      </Modal>
    </>);

};export { VehiculoSelector };

const s = EstiloHoja.create({
  card: {
    backgroundColor: '#F7F7F9',
    borderRadius: 12,
    minHeight: 72,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardWithImg: { paddingLeft: 82 },
  vehicleImg: {
    position: 'absolute',
    left: 6,
    width: 70,
    height: 64,
    resizeMode: 'contain'

  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  name: { fontSize: 16, fontWeight: '700', color: T.ink },
  desc: { fontSize: 11, color: T.inkLight, fontWeight: '500' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacity: { fontSize: 11, color: T.ink, fontWeight: '500' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
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
    marginBottom: 16
  },
  title: {
    fontSize: 15,
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4
  },
  itemImg: {
    width: 56,
    height: 48,
    resizeMode: 'contain',
    marginRight: 12
  },
  itemActive: { backgroundColor: T.accent + '10' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700', color: T.ink },
  itemNameActive: { color: T.accent },
  itemDesc: { fontSize: 12, color: T.inkLight, fontWeight: '500' },
  itemCapacity: { fontSize: 12, color: T.ink, fontWeight: '500' }
});
