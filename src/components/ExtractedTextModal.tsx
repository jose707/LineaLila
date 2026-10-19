// src/components/ExtractedTextModal.tsx
import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScanLine, AlertTriangle } from 'lucide-react-native';

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
  white: '#FFFFFF',
};

interface Props {
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

export const ExtractedTextModal: React.FC<Props> = ({
  visible,
  title,
  text,
  missing = [],
  continueLabel,
  image,
  onContinue,
  onRepeat,
  onClose,
}) => {
  const canContinue = missing.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={s.closeBtn} />
        </View>

        <View style={s.badgeRow}>
          <ScanLine size={14} color={C.primary} strokeWidth={2} />
          <Text style={s.badgeTxt}>Texto extraído automáticamente</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator
        >
          {!!image && (
            <View style={s.previewBox}>
              <Text style={s.previewLabel}>
                Imagen analizada (después del recorte)
              </Text>
              <Image source={{ uri: image }} style={s.previewImg} resizeMode="contain" />
            </View>
          )}
          <View style={s.textBox}>
            <Text style={s.rawText}>{text || 'No se extrajo texto.'}</Text>
          </View>
          {missing.length > 0 && (
            <View style={s.warnRow}>
              <AlertTriangle size={14} color={C.warn} strokeWidth={2.2} />
              <Text style={s.warnTxt}>
                No se detectó: {missing.join(', ')}. Repite la foto.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          {canContinue ? (
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Text style={s.primaryTxt}>{continueLabel}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={onRepeat}
              activeOpacity={0.85}
            >
              <Text style={s.primaryTxt}>Repetir foto</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={canContinue ? onRepeat : onClose}
            activeOpacity={0.85}
          >
            <Text style={s.secondaryTxt}>
              {canContinue ? 'Repetir foto' : 'Cancelar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: C.textSub, fontWeight: '700' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    paddingHorizontal: 8,
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
    alignSelf: 'flex-start',
  },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: C.primary },
  content: { padding: 20, paddingBottom: 32 },
  previewBox: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewImg: {
    width: '100%',
    height: 180,
    backgroundColor: C.surfaceHigh,
  },
  textBox: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  rawText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    fontFamily: 'Courier New',
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: C.warnGlow,
    borderRadius: 10,
    padding: 12,
  },
  warnTxt: { flex: 1, fontSize: 13, color: C.warn, lineHeight: 18 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: C.white },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#111118',
    backgroundColor: C.bg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: '#111118' },
});
