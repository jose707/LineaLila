import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ConfirmBottomSheetProps {
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

export default function ConfirmBottomSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Volver',
  loading = false,
  error,
  stackedActions = false,
  onConfirm,
  onCancel,
}: ConfirmBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const dismiss = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={dismiss} accessibilityLabel="Cerrar confirmación" />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <View style={s.handle} />
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          {!!error && <Text style={s.error}>{error}</Text>}
          <View style={[s.actions, stackedActions && s.stackedActions]}>
            <Pressable
              style={[s.confirmButton, (stackedActions || cancelLabel === null) && s.fullWidthButton, loading && s.disabledButton]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
            {cancelLabel !== null && <Pressable
              style={[s.cancelButton, stackedActions && s.fullWidthButton]}
              onPress={dismiss}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </Pressable>}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111118', textAlign: 'center' },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: '#7A7A8A',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
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
    paddingHorizontal: 12,
  },
  cancelText: { fontSize: 19, fontWeight: '700', color: '#111118', textAlign: 'center' },
  confirmButton: {
    flex: 1.4,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#7514C5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmText: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  disabledButton: { opacity: 0.65 },
});
