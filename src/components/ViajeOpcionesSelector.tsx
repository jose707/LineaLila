import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Modal } from
'react-native';
import { Plus, SlidersHorizontal, X } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

interface ViajeOpcionesSelectorPropiedades {
  onAddStop: () => void;
}

const ViajeOpcionesSelector: React.FC<ViajeOpcionesSelectorPropiedades> = ({ onAddStop: alAgregarParada }) => {
  const [abrir, establecerAbrir] = usarEstado(false);
  const margenes = usarSeguraZonaMargenes();

  return (
    <>
      <PulsableOpacidad
        style={s.trigger}
        onPress={() => establecerAbrir(true)}
        activeOpacity={0.8}>

        <SlidersHorizontal size={20} color="#000000" strokeWidth={2.8} />
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
              <Texto style={s.title}>Opciones de viaje</Texto>
              <PulsableOpacidad
                style={s.closeBtn}
                onPress={() => establecerAbrir(false)}
                activeOpacity={0.7}>

                <X size={20} color={T.inkLight} />
              </PulsableOpacidad>
            </Vista>

            <PulsableOpacidad
              style={s.item}
              onPress={() => {
                alAgregarParada();
                establecerAbrir(false);
              }}
              activeOpacity={0.7}>

              <Vista style={s.itemInfo}>
                <Texto style={s.itemName}>Agregar parada</Texto>
                <Texto style={s.itemDesc}>Añadir punto intermedio</Texto>
              </Vista>
              <Vista style={s.itemIconWrap}>
                <Plus size={20} color={T.inkMid} />
              </Vista>
            </PulsableOpacidad>
          </Vista>
        </Vista>
      </Modal>
    </>);

};export { ViajeOpcionesSelector };

const s = EstiloHoja.create({
  trigger: {
    width: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F9'
  },

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
  title: { fontSize: 15, fontWeight: '700', color: T.ink },
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
    marginRight: 10
  }
});
