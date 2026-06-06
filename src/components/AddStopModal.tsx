import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { X, MapPin, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar, { SearchResult, SearchBarRef } from './SearchBar';
import { MAPSCREEN_COLORS as T } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: SearchResult) => void;
  onPickOnMap?: () => void;
  currentLat?: number;
  currentLon?: number;
}

export const AddStopModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  onPickOnMap,
  currentLat,
  currentLon,
}) => {
  const insets = useSafeAreaInsets();
  const searchRef = useRef<SearchBarRef>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        searchRef.current?.focus();
      }, 350);
    }
  }, [visible]);

  const handleSelect = (result: SearchResult) => {
    onConfirm(result);
    onClose();
  };

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.title}>Agregar Ruta</Text>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color={T.inkLight} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.scrollArea}
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <SearchBar
                ref={searchRef}
                onResultSelect={handleSelect}
                placeholder="Buscar ubicación..."
                currentLat={currentLat}
                currentLon={currentLon}
                prefixIcon={<Search size={22} color="#000000" strokeWidth={2.8} />}
                suffixIcon={<MapPin size={22} color="#7C3AED" strokeWidth={2.5} />}
                onSuffixIconPress={onPickOnMap}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    height: '82%',
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
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: T.ink,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
