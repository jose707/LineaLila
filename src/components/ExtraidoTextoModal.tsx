// src/components/ExtraidoTextoModal.tsx
import React from 'react';
import {
  Image as Imagen,
  Modal,
  ScrollView as DesplazableVista,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista } from
'react-native';
import { ScanLine as ScanLinea, AlertTriangle } from 'lucide-react-native';

const C = {
  primary: '#7514C5',
  primaryGlow: '#7514C510',
  bg: '#FFFFFF',
  border: '#E5E5E5',
  surfaceHigh: '#F3F3F3',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#ADADAD',
  warn: '#D97706',
  warnGlow: '#D9770612',
  white: '#FFFFFF'
};

interface Propiedades {
  visible: boolean;
  title: string;
  text: string;
  missing?: string[];
  continueLabel: string;
  /** Vista previa (data URI) de la imagen exacta que se analizó */
  image?: string;
  onContinue: () => void;
  onRepeat: () => void;
  onClose: () => void;
}

const ExtraidoTextoModal: React.FC<Propiedades> = ({
  visible,
  title: titulo,
  text: texto,
  missing: faltante = [],
  continueLabel: continuarEtiqueta,
  image: imagen,
  onContinue: alContinuar,
  onRepeat: alRepetir,
  onClose: alCerrar
}) => {
  const puedeContinuar = faltante.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={alCerrar}>

      <Vista style={s.safe}>
        <Vista style={s.header}>
          <PulsableOpacidad onPress={alCerrar} style={s.closeBtn}>
            <Texto style={s.closeTxt}>✕</Texto>
          </PulsableOpacidad>
          <Texto style={s.title} numberOfLines={1}>
            {titulo}
          </Texto>
          <Vista style={s.closeBtn} />
        </Vista>

        <Vista style={s.badgeRow}>
          <ScanLinea size={14} color={C.primary} strokeWidth={2} />
          <Texto style={s.badgeTxt}>Texto extraído automáticamente</Texto>
        </Vista>

        <DesplazableVista
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator>

          {!!imagen &&
          <Vista style={s.previewBox}>
              <Texto style={s.previewLabel}>
                Imagen analizada (después del recorte)
              </Texto>
              <Imagen source={{ uri: imagen }} style={s.previewImg} resizeMode="contain" />
            </Vista>
          }
          <Vista style={s.textBox}>
            <Texto style={s.rawText}>{texto || 'No se extrajo texto.'}</Texto>
          </Vista>
          {faltante.length > 0 &&
          <Vista style={s.warnRow}>
              <AlertTriangle size={14} color={C.warn} strokeWidth={2.2} />
              <Texto style={s.warnTxt}>
                No se detectó: {faltante.join(', ')}. Repite la foto.
              </Texto>
            </Vista>
          }
        </DesplazableVista>

        <Vista style={s.footer}>
          {puedeContinuar ?
          <PulsableOpacidad
            style={s.primaryBtn}
            onPress={alContinuar}
            activeOpacity={0.85}>

              <Texto style={s.primaryTxt}>{continuarEtiqueta}</Texto>
            </PulsableOpacidad> :

          <PulsableOpacidad
            style={s.primaryBtn}
            onPress={alRepetir}
            activeOpacity={0.85}>

              <Texto style={s.primaryTxt}>Repetir foto</Texto>
            </PulsableOpacidad>
          }
          <PulsableOpacidad
            style={s.secondaryBtn}
            onPress={puedeContinuar ? alRepetir : alCerrar}
            activeOpacity={0.85}>

            <Texto style={s.secondaryTxt}>
              {puedeContinuar ? 'Repetir foto' : 'Cancelar'}
            </Texto>
          </PulsableOpacidad>
        </Vista>
      </Vista>
    </Modal>);

};export { ExtraidoTextoModal };

const s = EstiloHoja.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeTxt: { fontSize: 13, color: C.textSub, fontWeight: '700' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    paddingHorizontal: 8
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: C.primaryGlow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: C.primary },
  content: { padding: 20, paddingBottom: 32 },
  previewBox: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden'
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  previewImg: {
    width: '100%',
    height: 180,
    backgroundColor: C.surfaceHigh
  },
  textBox: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16
  },
  rawText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    fontFamily: 'Courier New'
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: C.warnGlow,
    borderRadius: 10,
    padding: 12
  },
  warnTxt: { flex: 1, fontSize: 13, color: C.warn, lineHeight: 18 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: C.white },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#111118',
    backgroundColor: C.bg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: '#111118' }
});
