import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Plus, SlidersHorizontal, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

interface TripOptionsPickerProps {
  onAddStop: () => void;
}

export const TripOptionsPicker: React.FC<TripOptionsPickerProps> = ({ onAddStop }) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <TouchableOpacity
        style={s.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <SlidersHorizontal size={20} color="#000000" strokeWidth={2.8} />
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
              <Text style={s.title}>Opciones de viaje</Text>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setOpen(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={T.inkLight} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.item}
              onPress={() => {
                onAddStop();
                setOpen(false);
              }}
              activeOpacity={0.7}
            >
              <View style={s.itemInfo}>
                <Text style={s.itemName}>Agregar parada</Text>
                <Text style={s.itemDesc}>Añadir punto intermedio</Text>
              </View>
              <View style={s.itemIconWrap}>
                <Plus size={20} color={T.inkMid} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  trigger: {
    width: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

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
  title: { fontSize: 15, fontWeight: '700', color: T.ink },
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
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: T.ink, marginBottom: 2 },
  itemDesc: { fontSize: 12, color: T.inkLight, fontWeight: '500' },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
