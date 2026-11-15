import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, Briefcase, Home, MapPin, Plus, Star, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const iconos = { home: Home, work: Briefcase, recent: MapPin, favorite: Star };

export default function GuardadoLugaresModal({ visible, onClose, onSelect, onAdd, onDelete, savedPlaces }: Propiedades) {
  const { bottom } = useSafeAreaInsets();
  const direcciones = savedPlaces.filter(lugar => lugar.type === 'home' || lugar.type === 'work');
  const favoritos = savedPlaces.filter(lugar => lugar.type !== 'home' && lugar.type !== 'work');

  const renderLugar = (lugar: GuardadoLugar) => {
    const Icono = iconos[lugar.type];
    const puedeEliminar = lugar.type === 'favorite' && !!onDelete;
    return (
      <View style={s.fila}>
        <Pressable style={s.lugar} onPress={() => onSelect(lugar)}
          onLongPress={puedeEliminar ? () => onDelete?.(lugar.id) : undefined}
          accessibilityRole="button" accessibilityHint="Usar como destino">
          <Icono size={24} color={T.accent} strokeWidth={2.3} />
          <View style={s.datos}>
            <Text style={s.nombre} numberOfLines={1}>{lugar.label}</Text>
            {lugar.address !== lugar.label && <Text style={s.direccion} numberOfLines={2}>{lugar.address}</Text>}
          </View>
          <ArrowUpRight size={18} color={T.ink} strokeWidth={2.3} />
        </Pressable>
        {puedeEliminar && (
          <Pressable style={s.control} onPress={() => onDelete?.(lugar.id)}
            accessibilityRole="button" accessibilityLabel={`Quitar ${lugar.label} de favoritos`}>
            <Trash2 size={19} color={T.inkMid} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent
      navigationBarTranslucent onRequestClose={onClose}>
      <View style={s.modal}>
        <Pressable style={s.fondo} onPress={onClose} accessible={false} />

        <View style={[s.panel, { paddingBottom: bottom + 16 }]} accessibilityViewIsModal>
          <View style={s.tirador} />
          <View style={s.cabecera}>
            <Pressable style={s.control} onPress={onClose}
              accessibilityRole="button" accessibilityLabel="Cerrar favoritos">
              <X size={24} color={T.ink} strokeWidth={2.7} />
            </Pressable>
            <Text style={s.titulo} accessibilityRole="header">Favoritos</Text>
            <View style={s.control} />
          </View>

          {(direcciones.length > 0 || favoritos.length > 0) && <FlatList
            style={s.lista}
            data={favoritos}
            keyExtractor={lugar => lugar.id}
            ItemSeparatorComponent={() => <View style={s.separador} />}
            ListHeaderComponent={direcciones.length > 0 ? (
              <View style={favoritos.length > 0 && s.direcciones}>
                {direcciones.map((lugar, indice) => (
                  <React.Fragment key={lugar.id}>
                    {indice > 0 && <View style={s.separador} />}
                    {renderLugar(lugar)}
                  </React.Fragment>
                ))}
              </View>
            ) : undefined}
            renderItem={({ item }) => renderLugar(item)}
          />}

          <Pressable style={s.agregar} accessibilityRole="button" onPress={() => { onClose(); onAdd(); }}>
            <Plus size={22} color={T.white} strokeWidth={2.5} />
            <Text style={s.agregarTexto}>Agregar favorito</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  fondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    maxHeight: '78%', backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 10
  },
  tirador: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: T.border },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 8 },
  titulo: { flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '700', color: T.ink },
  control: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  lista: { flexGrow: 0, flexShrink: 1, borderWidth: 1, borderColor: T.border, borderRadius: 16, paddingHorizontal: 12 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  lugar: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: 11, gap: 11 },
  datos: { flex: 1, minWidth: 0, gap: 2 },
  nombre: { color: T.ink, fontSize: 16, fontWeight: '700' },
  direccion: { color: T.inkMid, fontSize: 14, lineHeight: 19 },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: T.border },
  direcciones: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border, marginBottom: 4 },
  agregar: {
    minHeight: 54, borderRadius: 12, backgroundColor: '#000000', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, marginTop: 12
  },
  agregarTexto: { color: T.white, fontSize: 16, fontWeight: '700' }
});
