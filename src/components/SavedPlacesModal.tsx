import React from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Modal,
  FlatList as FlatLista } from
'react-native';
import { X, Home, Briefcase, MapPin as MapaPin, Navigation as Navegacion, Plus } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

export interface GuardadoLugar {
  id: string;
  type: 'home' | 'work' | 'recent' | 'favorite';
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  subtext?: string;
}

interface Propiedades {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: GuardadoLugar) => void;
  onAdd: () => void;
  onDelete?: (placeId: string) => void;
  savedPlaces: GuardadoLugar[];
}

const ICONO_COLOR = '#7C3AED';
const ICONO_BG = '#EDE9FE';

const GuardadoLugaresModal: React.FC<Propiedades> = ({
  visible,
  onClose: alCerrar,
  onSelect: alSeleccionar,
  onAdd: alAgregar,
  onDelete: alEliminar,
  savedPlaces: guardadoLugares
}) => {
  const margenes = usarSeguraZonaMargenes();

  const representarIcono = (tipo: GuardadoLugar['type']) => {
    switch (tipo) {
      case 'home':
        return <Home size={22} color={ICONO_COLOR} />;
      case 'work':
        return <Briefcase size={22} color={ICONO_COLOR} />;
      case 'recent':
        return <MapaPin size={22} color={ICONO_COLOR} />;
      case 'favorite':
        return <MapaPin size={22} color={ICONO_COLOR} />;
    }
  };

  const representarElemento = ({ item: elemento }: {item: GuardadoLugar;}) =>
  <PulsableOpacidad
    style={s.item}
    activeOpacity={0.7}
    onPress={() => alSeleccionar(elemento)}
    onLongPress={elemento.type === 'favorite' && alEliminar ? () => alEliminar(elemento.id) : undefined}>

      <Vista style={s.itemIcon}>{representarIcono(elemento.type)}</Vista>
      <Vista style={s.itemContent}>
        <Texto style={s.itemLabel} numberOfLines={1}>{elemento.label}</Texto>
        <Texto style={s.itemAddress} numberOfLines={1}>{elemento.address}</Texto>
      </Vista>
      <Navegacion size={18} color={T.inkLight} />
    </PulsableOpacidad>;


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
          <Vista style={s.handle} />

          <Vista style={s.header}>
            <Texto style={s.title}>Lugares guardados</Texto>
            <PulsableOpacidad
              style={s.closeBtn}
              onPress={alCerrar}
              activeOpacity={0.7}>

              <X size={20} color={T.inkLight} />
            </PulsableOpacidad>
          </Vista>

          {guardadoLugares.length === 0 ?
          <Vista style={s.empty}>
              <MapaPin size={40} color={T.border} />
              <Texto style={s.emptyText}>
                No hay lugares guardados.{'\n'}
                Guarda tu casa o trabajo desde los accesos directos.
              </Texto>
            </Vista> :

          <FlatLista
            data={guardadoLugares}
            keyExtractor={(elemento) => elemento.id}
            renderItem={representarElemento}
            ItemSeparatorComponent={() => <Vista style={s.separator} />}
            showsVerticalScrollIndicator={false} />

          }

          <PulsableOpacidad
            style={s.addButton}
            onPress={() => {
              alCerrar();
              alAgregar();
            }}
            activeOpacity={0.7}>

            <Vista style={s.addIcon}>
              <Plus size={22} color={ICONO_COLOR} />
            </Vista>
            <Texto style={s.addLabel}>Agregar favorito</Texto>
          </PulsableOpacidad>
        </Vista>
      </Vista>
    </Modal>);

};

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
    paddingTop: 12,
    maxHeight: '70%'
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ICONO_BG,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemContent: {
    flex: 1
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: T.ink
  },
  itemAddress: {
    fontSize: 13,
    color: T.inkLight,
    marginTop: 2
  },
  separator: {
    height: 1,
    backgroundColor: T.border
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12
  },
  emptyText: {
    fontSize: 14,
    color: T.inkLight,
    textAlign: 'center',
    lineHeight: 20
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: 8
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ICONO_BG,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ICONO_COLOR
  }
});

export default GuardadoLugaresModal;
