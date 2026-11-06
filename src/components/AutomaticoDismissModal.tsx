import React, { useEffect as usarEfecto } from 'react';
import {
  Modal,
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableWithoutFeedback as PulsableSinFeedback } from
'react-native';

interface AutomaticoDismissModalPropiedades {
  visible: boolean;
  title: string;
  subtitle?: string;
  durationMs?: number;
  onDismiss: () => void;
}

function AutomaticoDismissModal({
  visible,
  title: titulo,
  subtitle: subtitulo,
  durationMs: duracionMilisegundos = 2000,
  onDismiss: alDismiss
}: AutomaticoDismissModalPropiedades) {
  usarEfecto(() => {
    if (!visible) return;
    const temporizador = setTimeout(() => {
      alDismiss();
    }, duracionMilisegundos);
    return () => clearTimeout(temporizador);
  }, [visible, duracionMilisegundos, alDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={alDismiss}>

      <PulsableSinFeedback onPress={alDismiss}>
        <Vista style={estilos.overlay}>
          <PulsableSinFeedback>
            <Vista style={estilos.card}>
              <Texto style={estilos.title}>{titulo}</Texto>
              {!!subtitulo && <Texto style={estilos.subtitle}>{subtitulo}</Texto>}
            </Vista>
          </PulsableSinFeedback>
        </Vista>
      </PulsableSinFeedback>
    </Modal>);

}export { AutomaticoDismissModal as default };

const estilos = EstiloHoja.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
    maxWidth: 300
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19
  }
});
