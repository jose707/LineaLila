import React from 'react';
import {
  ActivityIndicator as ActividadIndicador,
  Modal,
  Pressable,
  StyleSheet as EstiloHoja,
  Text as Texto,
  View as Vista } from
'react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';

interface ConfirmarInferiorHojaPropiedades {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string | null;
  loading?: boolean;
  error?: string;
  stackedActions?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmarInferiorHoja({
  visible,
  title: titulo,
  message: mensaje,
  confirmLabel: confirmarEtiqueta,
  cancelLabel: cancelarEtiqueta = 'Volver',
  loading: cargando = false,
  error,
  stackedActions: stackedAcciones = false,
  onConfirm: alConfirmar,
  onCancel: alCancelar
}: ConfirmarInferiorHojaPropiedades) {
  const margenes = usarSeguraZonaMargenes();
  const dismiss = () => {
    if (!cargando) alCancelar();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismiss}>

      <Vista style={s.root}>
        <Pressable style={s.backdrop} onPress={dismiss} accessibilityLabel="Cerrar confirmación" />
        <Vista style={[s.sheet, { paddingBottom: Math.max(margenes.bottom, 16) + 16 }]}>
          <Vista style={s.handle} />
          <Texto style={s.title}>{titulo}</Texto>
          <Texto style={s.message}>{mensaje}</Texto>
          {!!error && <Texto style={s.error}>{error}</Texto>}
          <Vista style={[s.actions, stackedAcciones && s.stackedActions]}>
            <Pressable
              style={[s.confirmButton, (stackedAcciones || cancelarEtiqueta === null) && s.fullWidthButton, cargando && s.disabledButton]}
              onPress={alConfirmar}
              disabled={cargando}
              accessibilityRole="button">

              {cargando ?
              <ActividadIndicador size="small" color="#FFFFFF" /> :

              <Texto style={s.confirmText}>{confirmarEtiqueta}</Texto>
              }
            </Pressable>
            {cancelarEtiqueta !== null && <Pressable
              style={[s.cancelButton, stackedAcciones && s.fullWidthButton]}
              onPress={dismiss}
              disabled={cargando}
              accessibilityRole="button">

              <Texto style={s.cancelText}>{cancelarEtiqueta}</Texto>
            </Pressable>}
          </Vista>
        </Vista>
      </Vista>
    </Modal>);

}export { ConfirmarInferiorHoja as default };

const s = EstiloHoja.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...EstiloHoja.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 22
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111118', textAlign: 'center' },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: '#7A7A8A',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16
  },
  actions: { flexDirection: 'row-reverse', gap: 10 },
  stackedActions: { flexDirection: 'column' },
  fullWidthButton: { width: '100%', flex: 0 },
  cancelButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#F2F2F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  cancelText: { fontSize: 19, fontWeight: '700', color: '#111118', textAlign: 'center' },
  confirmButton: {
    flex: 1.4,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#7514C5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  confirmText: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  disabledButton: { opacity: 0.65 }
});
