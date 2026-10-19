// src/components/CiResultModal.tsx
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScanLine, Check, AlertTriangle, X } from 'lucide-react-native';

const C = {
  primary: '#7514C5',
  primaryGlow: '#7514C510',
  primaryBorder: '#7514C530',
  bg: '#FFFFFF',
  border: '#E5E5E5',
  surfaceHigh: '#F3F3F3',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#ADADAD',
  success: '#16A34A',
  successGlow: '#16A34A10',
  successBorder: '#16A34A35',
  error: '#DC2626',
  errorGlow: '#DC262610',
  errorBorder: '#DC262635',
  warn: '#D97706',
  warnGlow: '#D9770612',
  warnBorder: '#D9770635',
  white: '#FFFFFF',
};

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Nombre completo',
  ciNumber: 'Nº de CI',
  birthDate: 'Fecha de nacimiento',
  issueDate: 'Fecha de emisión',
  expiryDate: 'Fecha de expiración',
  birthPlace: 'Lugar de nacimiento',
  address: 'Domicilio',
  occupation: 'Profesión',
  maritalStatus: 'Estado civil',
  bloodType: 'Grupo sanguíneo',
};

interface OcrSide {
  fields: Record<string, string>;
  missing: string[];
}

interface Props {
  visible: boolean;
  front: OcrSide | null;
  back: OcrSide | null;
  onContinue: () => void;
  onRepeatBack: () => void;
  onClose: () => void;
}

function MatchBadge({ kind }: { kind: 'ok' | 'bad' | 'none' }) {
  if (kind === 'none') {
    return (
      <View style={[b.wrap, { backgroundColor: C.surfaceHigh, borderColor: C.border }]}>
        <Text style={[b.txt, { color: C.textMuted }]}>Sin comparar</Text>
      </View>
    );
  }
  const ok = kind === 'ok';
  const Icon = ok ? Check : AlertTriangle;
  return (
    <View
      style={[
        b.wrap,
        ok
          ? { backgroundColor: C.successGlow, borderColor: C.successBorder }
          : { backgroundColor: C.warnGlow, borderColor: C.warnBorder },
      ]}
    >
      <Icon size={10} color={ok ? C.success : C.warn} strokeWidth={2.5} />
      <Text style={[b.txt, { color: ok ? C.success : C.warn }]}>
        {ok ? 'Coincide' : 'No coincide'}
      </Text>
    </View>
  );
}
const b = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  txt: { fontSize: 10, fontWeight: '700' },
});

export const CiResultModal: React.FC<Props> = ({
  visible,
  front,
  back,
  onContinue,
  onRepeatBack,
  onClose,
}) => {
  const f = front?.fields || {};
  const bk = back?.fields || {};
  const legacy = bk.format === 'legacy';
  const missing = [
    ...(front?.missing || []),
    ...(back?.missing || []).filter((k) => !(front?.missing || []).includes(k)),
  ];

  const ciMatch: 'ok' | 'bad' | 'none' = !f.ciNumber
    ? 'none'
    : !bk.ciNumber
    ? 'none'
    : f.ciNumber === bk.ciNumber
    ? 'ok'
    : 'bad';
  const birthMatch: 'ok' | 'bad' | 'none' = !f.birthDate
    ? 'none'
    : !bk.birthDate
    ? 'none'
    : f.birthDate.slice(0, 6) + f.birthDate.slice(-2) === bk.birthDate.slice(0, 6) + bk.birthDate.slice(-2)
    ? 'ok'
    : 'bad';

  const rows: Array<{ label: string; value: string; badge?: 'ok' | 'bad' | 'none' }> = [
    { label: FIELD_LABELS.fullName, value: legacy ? bk.fullName || '' : f.fullName || '' },
    { label: `${FIELD_LABELS.ciNumber} (frontal)`, value: f.ciNumber || '', badge: ciMatch },
    { label: `${FIELD_LABELS.ciNumber} (${legacy ? 'reverso' : 'MRZ trasera'})`, value: bk.ciNumber || '' },
    ...(legacy
      ? [{ label: `${FIELD_LABELS.birthDate} (reverso)`, value: bk.birthDate || '' }]
      : [
          { label: `${FIELD_LABELS.birthDate} (frontal)`, value: f.birthDate || '', badge: birthMatch },
          { label: `${FIELD_LABELS.birthDate} (MRZ trasera)`, value: bk.birthDate || '' },
        ]),
    { label: FIELD_LABELS.issueDate, value: f.issueDate || '' },
    { label: FIELD_LABELS.expiryDate, value: f.expiryDate || '' },
    { label: FIELD_LABELS.birthPlace, value: bk.birthPlace || '' },
    { label: FIELD_LABELS.address, value: bk.address || '' },
    { label: FIELD_LABELS.occupation, value: bk.occupation || '' },
    { label: FIELD_LABELS.maritalStatus, value: bk.maritalStatus || '' },
    { label: FIELD_LABELS.bloodType, value: bk.bloodType || '' },
  ];

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
            <X size={16} color={C.textSub} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>
            Resultado de la cédula
          </Text>
          <View style={s.closeBtn} />
        </View>

        <View style={s.badgeRow}>
          <ScanLine size={14} color={C.primary} strokeWidth={2} />
          <Text style={s.badgeTxt}>Datos de ambos lados</Text>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator
        >
          <View style={s.card}>
            {rows.map((r) => (
              <View key={r.label} style={s.row}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <View style={s.rowRight}>
                  {r.badge && <MatchBadge kind={r.badge} />}
                  <Text style={[s.rowValue, !r.value && s.rowValueEmpty]}>
                    {r.value || '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {missing.length > 0 && (
            <View style={s.warnRow}>
              <AlertTriangle size={14} color={C.warn} strokeWidth={2.2} />
              <Text style={s.warnTxt}>
                No se detectó:{' '}
                {missing.map((k) => FIELD_LABELS[k] || k).join(', ')}. Si falta un
                dato importante, repite la foto de ese lado.
              </Text>
            </View>
          )}

          {(ciMatch === 'bad' || birthMatch === 'bad') && (
            <View style={s.warnRow}>
              <AlertTriangle size={14} color={C.warn} strokeWidth={2.2} />
              <Text style={s.warnTxt}>
                Los datos del frente y la parte trasera no coinciden. Verifica que
                ambas fotos sean de la misma cédula.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={s.primaryBtn}
            disabled={!f.ciNumber || !f.fullName || !f.birthDate || ciMatch === 'bad' || birthMatch === 'bad'}
            onPress={onContinue}
            activeOpacity={0.85}
          >
            <Text style={s.primaryTxt}>Continuar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={onRepeatBack}
            activeOpacity={0.85}
          >
            <Text style={s.secondaryTxt}>Repetir parte trasera</Text>
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
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 3,
  },
  rowValue: { fontSize: 15, color: C.text, fontWeight: '700', flexShrink: 1 },
  rowValueEmpty: { color: C.textMuted, fontWeight: '400' },
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
