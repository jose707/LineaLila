import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Check, ChevronRight, Users, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const VEHICLE_TYPES = [
  { id: 'taxi', label: 'Taxi', desc: 'Ideal para el día a día', capacity: 4 },
  { id: 'minibus', label: 'Minibús', desc: 'Viaje en grupo', capacity: 8 },
  { id: 'motorcycle', label: 'Moto', desc: 'Entrega inmediata y viaje express', capacity: 1 },
  { id: 'bus', label: 'Bus', desc: 'Máxima capacidad, eventos y excursiones', capacity: 20 },
];

interface VehiclePickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

const taxiImg = require('../../assets/taxi.png');
const motoImg = require('../../assets/moto.png');
const busImg = require('../../assets/bus.png');
const minibusImg = require('../../assets/minibus.png');

const VEHICLE_IMAGES: Record<string, any> = {
  taxi: taxiImg,
  motorcycle: motoImg,
  bus: busImg,
  minibus: minibusImg,
};

export const VehiclePicker: React.FC<VehiclePickerProps> = ({ selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const current = VEHICLE_TYPES.find(v => v.id === selected);

  return (
    <>
      <TouchableOpacity
        style={[
          s.card,
          s.cardWithImg,
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
      >
        {VEHICLE_IMAGES[selected] && (
          <Image source={VEHICLE_IMAGES[selected]} style={s.vehicleImg} />
        )}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.name}>{current?.label}</Text>
            <View style={s.capacityRow}>
              <Users size={13} color={T.ink} />
              <Text style={s.capacity}>{current?.capacity} pasajeros</Text>
            </View>
          </View>
          <Text style={s.desc}>{current?.desc}</Text>
        </View>
        <ChevronRight size={16} color={T.inkLight} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.modalRoot}>
          <TouchableOpacity
            style={s.overlay}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.handle} />
            <View style={s.header}>
              <Text style={s.title}>Seleccionar vehículo</Text>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setOpen(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={T.inkLight} />
              </TouchableOpacity>
            </View>
            {VEHICLE_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[s.item, selected === type.id && s.itemActive]}
                onPress={() => {
                  onSelect(type.id);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Image source={VEHICLE_IMAGES[type.id]} style={s.itemImg} />
                <View style={s.itemInfo}>
                  <View style={s.nameRow}>
                    <Text style={[s.itemName, selected === type.id && s.itemNameActive]}>
                      {type.label}
                    </Text>
                    <View style={s.capacityRow}>
                      <Users size={13} color={T.ink} />
                      <Text style={s.itemCapacity}>{type.capacity} pasajeros</Text>
                    </View>
                  </View>
                  <Text style={s.itemDesc}>{type.desc}</Text>
                </View>
                {selected === type.id && (
                  <Check size={18} color={T.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardWithImg: { paddingLeft: 120 },
  vehicleImg: {
    position: 'absolute',
    left: 5,
    width: 110,
    height: 90,
    resizeMode: 'contain',

  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: T.ink },
  desc: { fontSize: 11, color: T.inkLight, fontWeight: '500' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capacity: { fontSize: 11, color: T.ink, fontWeight: '500' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: T.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  itemImg: {
    width: 56,
    height: 48,
    resizeMode: 'contain',
    marginRight: 12,
  },
  itemActive: { backgroundColor: T.accent + '10' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700', color: T.ink },
  itemNameActive: { color: T.accent },
  itemDesc: { fontSize: 12, color: T.inkLight, fontWeight: '500' },
  itemCapacity: { fontSize: 12, color: T.ink, fontWeight: '500' },
});
