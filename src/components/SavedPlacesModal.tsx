import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { X, Home, Briefcase, MapPin, Navigation, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

export interface SavedPlace {
  id: string;
  type: 'home' | 'work' | 'recent' | 'favorite';
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  subtext?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: SavedPlace) => void;
  onAdd: () => void;
  onDelete?: (placeId: string) => void;
  savedPlaces: SavedPlace[];
}

const ICON_COLOR = '#7C3AED';
const ICON_BG = '#EDE9FE';

const SavedPlacesModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelect,
  onAdd,
  onDelete,
  savedPlaces,
}) => {
  const insets = useSafeAreaInsets();

  const renderIcon = (type: SavedPlace['type']) => {
    switch (type) {
      case 'home':
        return <Home size={22} color={ICON_COLOR} />;
      case 'work':
        return <Briefcase size={22} color={ICON_COLOR} />;
      case 'recent':
        return <MapPin size={22} color={ICON_COLOR} />;
      case 'favorite':
        return <MapPin size={22} color={ICON_COLOR} />;
    }
  };

  const renderItem = ({ item }: { item: SavedPlace }) => (
    <TouchableOpacity
      style={s.item}
      activeOpacity={0.7}
      onPress={() => onSelect(item)}
      onLongPress={item.type === 'favorite' && onDelete ? () => onDelete(item.id) : undefined}
    >
      <View style={s.itemIcon}>{renderIcon(item.type)}</View>
      <View style={s.itemContent}>
        <Text style={s.itemLabel} numberOfLines={1}>{item.label}</Text>
        <Text style={s.itemAddress} numberOfLines={1}>{item.address}</Text>
      </View>
      <Navigation size={18} color={T.inkLight} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.modalRoot}>
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.title}>Lugares guardados</Text>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={T.inkLight} />
            </TouchableOpacity>
          </View>

          {savedPlaces.length === 0 ? (
            <View style={s.empty}>
              <MapPin size={40} color={T.border} />
              <Text style={s.emptyText}>
                No hay lugares guardados.{'\n'}
                Guarda tu casa o trabajo desde los accesos directos.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedPlaces}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={s.separator} />}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity
            style={s.addButton}
            onPress={() => {
              onClose();
              onAdd();
            }}
            activeOpacity={0.7}
          >
            <View style={s.addIcon}>
              <Plus size={22} color={ICON_COLOR} />
            </View>
            <Text style={s.addLabel}>Agregar favorito</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
    maxHeight: '70%',
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
    fontSize: 17,
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
    paddingVertical: 12,
    gap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ICON_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: T.ink,
  },
  itemAddress: {
    fontSize: 13,
    color: T.inkLight,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: T.border,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: T.inkLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: 8,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ICON_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ICON_COLOR,
  },
});

export default SavedPlacesModal;
