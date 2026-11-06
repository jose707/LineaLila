// src/components/CiResultadoModal.tsx
import React from 'react';
import {
  Modal,
  ScrollView as DesplazableVista,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista } from
'react-native';
import { ScanLine as ScanLinea, Check as Comprobar, AlertTriangle, X } from 'lucide-react-native';

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
  white: '#FFFFFF'
};

const CAMPO_ETIQUETAS: Record<string, string> = {
  fullName: 'Nombre completo',
  ciNumber: 'Nº de CI',
  birthDate: 'Fecha de nacimiento',
  issueDate: 'Fecha de emisión',
  expiryDate: 'Fecha de expiración',
  birthPlace: 'Lugar de nacimiento',
  address: 'Domicilio',
  occupation: 'Profesión',
  maritalStatus: 'Estado civil'
};

interface OcrLado {
  fields: Record<string, string>;
  missing: string[];
}

interface Propiedades {
  visible: boolean;
  front: OcrLado | null;
  back: OcrLado | null;
  onContinue: () => void;
  onRepeatBack: () => void;
  onClose: () => void;
}

function CoincidenciaInsignia({ kind: clase }: {kind: 'ok' | 'bad' | 'none';}) {
  if (clase === 'none') {
    return (
      <Vista style={[segundo.wrap, { backgroundColor: C.surfaceHigh, borderColor: C.border }]}>
        <Texto style={[segundo.txt, { color: C.textMuted }]}>Sin comparar</Texto>
      </Vista>);

  }
  const ok = clase === 'ok';
  const Icono = ok ? Comprobar : AlertTriangle;
  return (
    <Vista
      style={[
      segundo.wrap,
      ok ?
      { backgroundColor: C.successGlow, borderColor: C.successBorder } :
      { backgroundColor: C.warnGlow, borderColor: C.warnBorder }]
      }>

      <Icono size={10} color={ok ? C.success : C.warn} strokeWidth={2.5} />
      <Texto style={[segundo.txt, { color: ok ? C.success : C.warn }]}>
        {ok ? 'Coincide' : 'No coincide'}
      </Texto>
    </Vista>);

}
const segundo = EstiloHoja.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1
  },
  txt: { fontSize: 10, fontWeight: '700' }
});

const CiResultadoModal: React.FC<Propiedades> = ({
  visible,
  front: frontal,
  back: reverso,
  onContinue: alContinuar,
  onRepeatBack: alRepetirReverso,
  onClose: alCerrar
}) => {
  const f = frontal?.fields || {};
  const bk = reverso?.fields || {};
  const antiguo = bk.format === 'legacy';
  const faltante = [
  ...(frontal?.missing || []),
  ...(reverso?.missing || []).filter((k) => !(frontal?.missing || []).includes(k))];


  const ciCoincidencia: 'ok' | 'bad' | 'none' = !f.ciNumber ?
  'none' :
  !bk.ciNumber ?
  'none' :
  f.ciNumber === bk.ciNumber ?
  'ok' :
  'bad';
  const nacimientoCoincidencia: 'ok' | 'bad' | 'none' = !f.birthDate ?
  'none' :
  !bk.birthDate ?
  'none' :
  f.birthDate.slice(0, 6) + f.birthDate.slice(-2) === bk.birthDate.slice(0, 6) + bk.birthDate.slice(-2) ?
  'ok' :
  'bad';

  const filas: Array<{label: string;value: string;badge?: 'ok' | 'bad' | 'none';}> = [
  { label: CAMPO_ETIQUETAS.fullName, value: antiguo ? bk.fullName || '' : f.fullName || '' },
  { label: `${CAMPO_ETIQUETAS.ciNumber} (frontal)`, value: f.ciNumber || '', badge: ciCoincidencia },
  { label: `${CAMPO_ETIQUETAS.ciNumber} (${antiguo ? 'reverso' : 'MRZ trasera'})`, value: bk.ciNumber || '' },
  ...(antiguo ?
  [{ label: `${CAMPO_ETIQUETAS.birthDate} (reverso)`, value: bk.birthDate || '' }] :
  [
  { label: `${CAMPO_ETIQUETAS.birthDate} (frontal)`, value: f.birthDate || '', badge: nacimientoCoincidencia },
  { label: `${CAMPO_ETIQUETAS.birthDate} (MRZ trasera)`, value: bk.birthDate || '' }]),

  { label: CAMPO_ETIQUETAS.issueDate, value: f.issueDate || '' },
  { label: CAMPO_ETIQUETAS.expiryDate, value: f.expiryDate || '' },
  { label: CAMPO_ETIQUETAS.birthPlace, value: bk.birthPlace || '' },
  { label: CAMPO_ETIQUETAS.address, value: bk.address || '' },
  { label: CAMPO_ETIQUETAS.occupation, value: bk.occupation || '' },
  { label: CAMPO_ETIQUETAS.maritalStatus, value: bk.maritalStatus || '' }];


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={alCerrar}>

      <Vista style={s.safe}>
        <Vista style={s.header}>
          <PulsableOpacidad onPress={alCerrar} style={s.closeBtn}>
            <X size={16} color={C.textSub} strokeWidth={2} />
          </PulsableOpacidad>
          <Texto style={s.title} numberOfLines={1}>
            Resultado de la cédula
          </Texto>
          <Vista style={s.closeBtn} />
        </Vista>

        <Vista style={s.badgeRow}>
          <ScanLinea size={14} color={C.primary} strokeWidth={2} />
          <Texto style={s.badgeTxt}>Datos de ambos lados</Texto>
        </Vista>

        <DesplazableVista
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator>

          <Vista style={s.card}>
            {filas.map((r) =>
            <Vista key={r.label} style={s.row}>
                <Texto style={s.rowLabel}>{r.label}</Texto>
                <Vista style={s.rowRight}>
                  {r.badge && <CoincidenciaInsignia kind={r.badge} />}
                  <Texto style={[s.rowValue, !r.value && s.rowValueEmpty]}>
                    {r.value || '—'}
                  </Texto>
                </Vista>
              </Vista>
            )}
          </Vista>

          {faltante.length > 0 &&
          <Vista style={s.warnRow}>
              <AlertTriangle size={14} color={C.warn} strokeWidth={2.2} />
              <Texto style={s.warnTxt}>
                No se detectó:{' '}
                {faltante.map((k) => CAMPO_ETIQUETAS[k] || k).join(', ')}. Si falta un
                dato importante, repite la foto de ese lado.
              </Texto>
            </Vista>
          }

          {(ciCoincidencia === 'bad' || nacimientoCoincidencia === 'bad') &&
          <Vista style={s.warnRow}>
              <AlertTriangle size={14} color={C.warn} strokeWidth={2.2} />
              <Texto style={s.warnTxt}>
                Los datos del frente y la parte trasera no coinciden. Verifica que
                ambas fotos sean de la misma cédula.
              </Texto>
            </Vista>
          }
        </DesplazableVista>

        <Vista style={s.footer}>
          <PulsableOpacidad
            style={s.primaryBtn}
            disabled={!f.ciNumber || !f.fullName || !f.birthDate || ciCoincidencia === 'bad' || nacimientoCoincidencia === 'bad'}
            onPress={alContinuar}
            activeOpacity={0.85}>

            <Texto style={s.primaryTxt}>Continuar</Texto>
          </PulsableOpacidad>
          <PulsableOpacidad
            style={s.secondaryBtn}
            onPress={alRepetirReverso}
            activeOpacity={0.85}>

            <Texto style={s.secondaryTxt}>Repetir parte trasera</Texto>
          </PulsableOpacidad>
        </Vista>
      </Vista>
    </Modal>);

};export { CiResultadoModal };

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
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 4
  },
  row: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  rowLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 3
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
