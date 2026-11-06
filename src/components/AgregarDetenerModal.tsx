import React, { useEffect as usarEfecto, useRef as usarReferencia } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Modal,
  KeyboardAvoidingView as KeyboardAvoidingVista,
  ScrollView as DesplazableVista,
  Platform as Plataforma } from
'react-native';
import { X, MapPin as MapaPin, Search as Buscar } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import BuscarBar, { BusquedaResultado as BuscarResultado, BusquedaBarReferencia as BuscarBarReferencia } from "./BuscarBar";
import { MAPSCREEN_COLORS as T } from '../theme/colors';

interface Propiedades {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: BuscarResultado) => void;
  onPickOnMap?: () => void;
  currentLat?: number;
  currentLon?: number;
}

const AgregarParadaModal: React.FC<Propiedades> = ({
  visible,
  onClose: alCerrar,
  onConfirm: alConfirmar,
  onPickOnMap: alPickAlMapa,
  currentLat: realLatitud,
  currentLon: realLongitud
}) => {
  const margenes = usarSeguraZonaMargenes();
  const buscarReferencia = usarReferencia<BuscarBarReferencia>(null);

  usarEfecto(() => {
    if (visible) {
      setTimeout(() => {
        buscarReferencia.current?.focus();
      }, 350);
    }
  }, [visible]);

  const manejarSeleccionar = (resultado: BuscarResultado) => {
    alConfirmar(resultado);
    alCerrar();
  };

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

        <KeyboardAvoidingVista
          behavior={Plataforma.OS === 'ios' ? 'padding' : undefined}>

          <Vista style={[s.sheet, { paddingBottom: margenes.bottom + 24 }]}>
            <Vista style={s.handle} />

            <Vista style={s.header}>
              <Texto style={s.title}>Agregar Ruta</Texto>
              <PulsableOpacidad
                style={s.closeBtn}
                onPress={alCerrar}
                activeOpacity={0.7}>

                <X size={20} color={T.inkLight} />
              </PulsableOpacidad>
            </Vista>

            <DesplazableVista
              style={s.scrollArea}
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>

              <BuscarBar
                key={visible ? 'abierto' : 'closed'}
                ref={buscarReferencia}
                onResultSelect={manejarSeleccionar}
                placeholder="Buscar ubicación..."
                currentLat={realLatitud}
                currentLon={realLongitud}
                prefixIcon={<Buscar size={22} color="#000000" strokeWidth={2.8} />}
                suffixIcon={<MapaPin size={22} color="#7C3AED" strokeWidth={2.5} />}
                onSuffixIconPress={alPickAlMapa} />

            </DesplazableVista>
          </Vista>
        </KeyboardAvoidingVista>
      </Vista>
    </Modal>);

};export { AgregarParadaModal };

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
    height: '82%'
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
    justifyContent: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: T.ink,
    textAlign: 'center'
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  }
});
