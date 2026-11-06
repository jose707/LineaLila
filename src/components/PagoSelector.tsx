import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Modal } from
'react-native';
import { Banknote, Check as Comprobar, ChevronRight as ChevronDerecha, QrCode as QrCodigo, X } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

const PAGO_METODOS = [
{ id: 'efectivo', label: 'Efectivo', desc: 'Pago en efectivo al conductor', icon: Banknote },
{ id: 'qr', label: 'QR', desc: 'Pago por código QR', icon: QrCodigo }];


interface PagoSelectorPropiedades {
  selected: string;
  onSelect: (id: string) => void;
}

const PagoSelector: React.FC<PagoSelectorPropiedades> = ({ selected: seleccionado, onSelect: alSeleccionar }) => {
  const [abrir, establecerAbrir] = usarEstado(false);
  const margenes = usarSeguraZonaMargenes();

  const real = PAGO_METODOS.find((m) => m.id === seleccionado);
  const RealIcono = real?.icon;

  return (
    <>
      <PulsableOpacidad
        style={s.card}
        onPress={() => establecerAbrir(true)}
        activeOpacity={0.9}>

        {RealIcono && <RealIcono size={22} color={T.ink} style={s.icon} />}
        <Vista style={s.info}>
          <Texto style={s.name}>{real?.label}</Texto>
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
              <Texto style={s.title}>Forma de pago</Texto>
              <PulsableOpacidad
                style={s.closeBtn}
                onPress={() => establecerAbrir(false)}
                activeOpacity={0.7}>

                <X size={20} color={T.inkLight} />
              </PulsableOpacidad>
            </Vista>
            {PAGO_METODOS.map((metodo) => {
              const MetodoIcono = metodo.icon;
              return (
                <PulsableOpacidad
                  key={metodo.id}
                  style={[s.item, seleccionado === metodo.id && s.itemActive]}
                  onPress={() => {
                    alSeleccionar(metodo.id);
                    establecerAbrir(false);
                  }}
                  activeOpacity={0.7}>

                  {MetodoIcono && <MetodoIcono size={22} color={seleccionado === metodo.id ? T.accent : T.ink} style={s.icon} />}
                  <Vista style={s.itemInfo}>
                    <Texto style={[s.itemName, seleccionado === metodo.id && s.itemNameActive]}>
                      {metodo.label}
                    </Texto>
                    <Texto style={s.itemDesc}>{metodo.desc}</Texto>
                  </Vista>
                  {seleccionado === metodo.id &&
                  <Comprobar size={18} color={T.accent} />
                  }
                </PulsableOpacidad>);

            })}
          </Vista>
        </Vista>
      </Modal>
    </>);

};export { PagoSelector };

const s = EstiloHoja.create({
  card: {
    backgroundColor: '#F7F7F9',
    borderRadius: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  info: { flex: 1 },
  icon: { marginRight: 10 },
  name: { fontSize: 16, fontWeight: '700', color: T.ink },
  desc: { fontSize: 11, color: T.inkLight, fontWeight: '500' },

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
  itemActive: { backgroundColor: T.accent + '10' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700', color: T.ink },
  itemNameActive: { color: T.accent },
  itemDesc: { fontSize: 12, color: T.inkLight, fontWeight: '500' }
});
