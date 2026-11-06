import React from 'react';
import {
  Modal,
  Image as Imagen,
  ScrollView as DesplazableVista,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista } from
'react-native';
import { AlertTriangle, Check as Comprobar, ScanLine as ScanLinea, X } from 'lucide-react-native';

const C = {
  primary: '#7514C5',
  primarySoft: '#F5EDFC',
  text: '#17131C',
  muted: '#77717D',
  border: '#E8E4EB',
  surface: '#F8F7F9',
  warning: '#B45309',
  warningSoft: '#FFF7ED',
  white: '#FFFFFF'
};

export interface FilaCampoExtraido {
  label: string;
  value: string;
}

interface Propiedades {
  visible: boolean;
  title: string;
  fields: FilaCampoExtraido[];
  missing?: string[];
  notice?: string;
  image?: string;
  images?: {label: string;uri: string;}[];
  continueLabel: string;
  onContinue: () => void;
  onRepeat?: () => void;
  onClose: () => void;
}

const ExtraidoCamposModal: React.FC<Propiedades> = ({
  visible,
  title: titulo,
  fields: campos,
  missing: faltante = [],
  notice: aviso,
  image: imagen,
  images: imagenes = [],
  continueLabel: continuarEtiqueta,
  onContinue: alContinuar,
  onRepeat: alRepetir,
  onClose: alCerrar
}) =>
<Modal
  visible={visible}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={alCerrar}>

    <Vista style={s.backdrop}>
      <Vista style={s.card}>
        <Vista style={s.header}>
          <Vista style={s.icon}>
            <ScanLinea size={17} color={C.primary} strokeWidth={2.2} />
          </Vista>
          <Vista style={s.heading}>
            <Texto style={s.eyebrow}>LECTURA DEL DOCUMENTO</Texto>
            <Texto style={s.title} numberOfLines={2}>{titulo}</Texto>
          </Vista>
          <PulsableOpacidad onPress={alCerrar} style={s.close} accessibilityLabel="Cerrar">
            <X size={17} color={C.muted} />
          </PulsableOpacidad>
        </Vista>

        <DesplazableVista style={s.scroll} showsVerticalScrollIndicator={campos.length > 4}>
          {!!imagen && <Vista style={s.preview}>
            <Texto style={s.previewLabel}>Vista previa de la imagen enviada a Vision</Texto>
            <Imagen source={{ uri: imagen }} style={s.previewImage} resizeMode="contain" />
          </Vista>}
          {imagenes.map((vista) => <Vista key={vista.label} style={s.preview}>
            <Texto style={s.previewLabel}>{vista.label}</Texto>
            <Imagen source={{ uri: vista.uri }} style={s.previewImage} resizeMode="contain" />
          </Vista>)}
          {campos.length ?
        <Vista style={s.fieldList}>
              {campos.map((campo, indice) =>
          <Vista key={`${campo.label}-${indice}`} style={s.fieldRow}>
                  <Texto style={s.label}>{campo.label}</Texto>
                  <Texto style={s.value}>{campo.value}</Texto>
                </Vista>
          )}
            </Vista> :

        <Texto style={s.empty}>No se detectaron datos en esta foto.</Texto>
        }

          {faltante.length > 0 &&
        <Vista style={s.warning}>
              <AlertTriangle size={15} color={C.warning} strokeWidth={2.2} />
              <Texto style={s.warningText}>
                No se detectó: {faltante.join(', ')}. Puedes repetir la foto.
              </Texto>
            </Vista>
        }
          {!!aviso &&
        <Vista style={s.warning}>
              <AlertTriangle size={15} color={C.warning} strokeWidth={2.2} />
              <Texto style={s.warningText}>{aviso}</Texto>
            </Vista>
        }
        </DesplazableVista>

        <Vista style={s.actions}>
          <PulsableOpacidad style={s.primaryButton} onPress={alContinuar} activeOpacity={0.85}>
            <Comprobar size={16} color={C.white} strokeWidth={2.5} />
            <Texto style={s.primaryText}>{continuarEtiqueta}</Texto>
          </PulsableOpacidad>
          {!!alRepetir && <PulsableOpacidad style={s.secondaryButton} onPress={alRepetir} activeOpacity={0.8}>
            <Texto style={s.secondaryText}>Repetir foto</Texto>
          </PulsableOpacidad>}
        </Vista>
      </Vista>
    </Vista>
  </Modal>;export { ExtraidoCamposModal };


const s = EstiloHoja.create({
  preview: { marginBottom: 14 },
  previewLabel: { color: C.muted, fontSize: 12, marginBottom: 6 },
  previewImage: { width: '100%', height: 160, backgroundColor: C.surface, borderRadius: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 28, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '78%',
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heading: { flex: 1 },
  eyebrow: { color: C.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  fieldList: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: C.white
  },
  fieldRow: { paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  label: { color: C.muted, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  value: { color: C.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  warning: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.warningSoft,
    borderRadius: 11,
    padding: 10,
    marginTop: 10
  },
  warningText: { color: C.warning, flex: 1, fontSize: 12, lineHeight: 17 },
  actions: { gap: 8, marginTop: 15 },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7
  },
  primaryText: { color: C.white, fontSize: 14, fontWeight: '700' },
  secondaryButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: C.muted, fontSize: 13, fontWeight: '600' }
});
