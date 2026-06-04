import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const VEHICLE_TYPES = [
  { id: 'taxi', label: 'Taxi', pax: 'Hasta 4 pasajeros' },
  { id: 'minibus', label: 'Minibús', pax: 'Hasta 8 pasajeros' },
  { id: 'motorcycle', label: 'Moto', pax: '1 pasajero' },
  { id: 'bus', label: 'Bus', pax: 'Hasta 20 pasajeros' },
];

interface VehiclePickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

export const VehiclePicker: React.FC<VehiclePickerProps> = ({ selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const current = VEHICLE_TYPES.find(v => v.id === selected);

  return (
    <>
      <TouchableOpacity
        style={s.card}
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
      >
        <View style={s.info}>
          <Text style={s.name}>{current?.label}</Text>
          <Text style={s.pax}>{current?.pax}</Text>
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
                <View style={s.itemInfo}>
                  <Text style={[s.itemName, selected === type.id && s.itemNameActive]}>
                    {type.label}
                  </Text>
                  <Text style={s.itemPax}>{type.pax}</Text>
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
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: T.ink, marginBottom: 2 },
  pax: { fontSize: 11, color: T.inkLight, fontWeight: '500' },

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
  itemActive: { backgroundColor: T.accent + '10' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: T.ink, marginBottom: 2 },
  itemNameActive: { color: T.accent },
  itemPax: { fontSize: 12, color: T.inkLight, fontWeight: '500' },
});
