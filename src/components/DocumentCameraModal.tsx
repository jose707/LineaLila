// src/components/DocumentCameraModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { X, Zap, ZapOff, ScanLine, Camera as CameraIcon, FileText, Car, Shield } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

// Proporción estándar de cédula / tarjeta de identidad (ISO/IEC 7810 ID-1: 85.6mm x 53.98mm)
const CARD_ASPECT = 1.585;
// Proporción estándar de hoja Carta boliviana vertical (Certificado de antecedentes / SOAT UNIVida: 216mm x 279mm)
const CERTIFICATE_ASPECT = 216 / 279;
// Proporción estándar de RUAT boliviano (Certificado CRPVA / Formulario RUAT-03: Carta horizontal: 279mm x 216mm)
const RUAT_ASPECT = 279 / 216;
// Proporción óptima para encuadre de vehículo (vista delantera y trasera)
const VEHICLE_ASPECT = 1.38;

export interface FrameRect {
  screenW: number;
  screenH: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DocumentType = 'card' | 'certificate' | 'ruat' | 'vehicle' | 'soat';

export interface DocumentCameraModalProps {
  visible: boolean;
  title: string;
  /** Tipo de documento: tarjeta horizontal ('card'), certificado ('certificate'), RUAT ('ruat'), vehículo ('vehicle') o SOAT ('soat') */
  documentType?: DocumentType;
  /** Usa la cámara frontal para una selfie común. */
  cameraPosition?: 'front' | 'back';
  /** Sobrescribe la proporción ancho/alto si se especifica */
  aspectRatio?: number;
  /** Texto guía del molde (ej: "Coloca el frente de la cédula en el recuadro") */
  frameLabel?: string;
  /** @deprecated Captura manual únicamente */
  autoCapture?: boolean;
  onCapture: (uri: string, frame?: FrameRect) => void;
  onClose: () => void;
}

function toFileUri(filePath: string): string {
  if (filePath.startsWith('file://') || filePath.startsWith('content://')) {
    return filePath;
  }
  return 'file://' + filePath;
}

export const DocumentCameraModal: React.FC<DocumentCameraModalProps> = ({
  visible,
  title,
  documentType = 'card',
  cameraPosition = 'back',
  aspectRatio,
  frameLabel = '',
  onCapture,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const isSelfieCamera = cameraPosition === 'front';
  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();

  const photoOutput = usePhotoOutput();
  const photoOutputRef = useRef(photoOutput);
  photoOutputRef.current = photoOutput;

  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modalShown, setModalShown] = useState(false);

  const capturingRef = useRef(false);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  // Dimensiones del recuadro del documento según tipo de documento
  const targetAspect =
    aspectRatio ??
    (isSelfieCamera
      ? 0.78
      : documentType === 'certificate' || documentType === 'soat'
      ? CERTIFICATE_ASPECT
      : documentType === 'ruat'
      ? RUAT_ASPECT
      : documentType === 'vehicle'
      ? VEHICLE_ASPECT
      : CARD_ASPECT);
  const isPortraitDoc = targetAspect < 1;

  let frameW: number;
  let frameH: number;
  let frameLeft: number;
  let frameTop: number;

  if (isPortraitDoc) {
    // Para certificados en hoja vertical (Carta boliviana: 216mm x 279mm)
    const headerBottom = Math.max(insets.top + 68, 80);
    const controlsTop = winH - Math.max(insets.bottom + 140, 168);
    const labelSpace = frameLabel ? 42 : 10;
    const maxAvailableH = Math.max(260, controlsTop - headerBottom - labelSpace);
    const maxAvailableW = winW - 56;

    let testH = Math.min(maxAvailableH, Math.round(maxAvailableW / targetAspect));
    let testW = Math.round(testH * targetAspect);

    if (testW > maxAvailableW) {
      testW = maxAvailableW;
      testH = Math.round(testW / targetAspect);
    }

    frameW = testW;
    frameH = testH;
    frameLeft = Math.round((winW - frameW) / 2);
    const availableSlot = controlsTop - labelSpace - headerBottom;
    frameTop = headerBottom + Math.max(4, Math.round((availableSlot - frameH) / 2));
  } else {
    // Dimensiones para documentos y fotos horizontales (cédula, RUAT, vehículo)
    frameW = Math.min(winW - 48, 380);
    frameH = Math.round(frameW / targetAspect);
    frameLeft = Math.round((winW - frameW) / 2);
    frameTop = Math.max(insets.top + 70, Math.round((winH - frameH) / 2 - 40));
  }

  const cornerSize = isPortraitDoc ? 28 : documentType === 'vehicle' ? 32 : 26;
  const cornerThickness = 3.5;
  const cornerRadius =
    isPortraitDoc || documentType === 'ruat' || documentType === 'soat'
      ? 8
      : documentType === 'vehicle'
      ? 14
      : 10;

  const frameRef = useRef<FrameRect>({
    screenW: winW,
    screenH: winH,
    x: frameLeft,
    y: frameTop,
    w: frameW,
    h: frameH,
  });

  frameRef.current = {
    screenW: winW,
    screenH: winH,
    x: frameLeft,
    y: frameTop,
    w: frameW,
    h: frameH,
  };

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(() => {});
    }
  }, [visible, hasPermission, requestPermission]);

  useEffect(() => {
    if (visible) {
      capturingRef.current = false;
      setCapturing(false);
      setTorchOn(false);
      setCameraReady(false);
    } else {
      setCameraReady(false);
      setModalShown(false);
    }
  }, [visible]);

  const captureNow = useCallback(async () => {
    if (capturingRef.current) return;
    if (!cameraReady || !device || !hasPermission) return;

    capturingRef.current = true;
    setCapturing(true);

    try {
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const file = await photoOutputRef.current.capturePhotoToFile(
            { flashMode: torchOn ? 'on' : 'off' },
            {},
          );
          onCaptureRef.current(toFileUri(file.filePath), frameRef.current);
          return;
        } catch (e: any) {
          lastError = e;
          const msg = String(e?.message || '');
          const inactive = /not active|canceled|cancelled/i.test(msg);
          if (inactive && attempt === 0) {
            await new Promise<void>(r => setTimeout(r, 250));
            continue;
          }
          throw e;
        }
      }
      if (lastError) throw lastError;
    } catch (e: any) {
      capturingRef.current = false;
      setCapturing(false);
      Alert.alert(
        'Error',
        `No se pudo capturar la foto. Inténtalo de nuevo.\n\n${e?.message || ''}`,
      );
    }
  }, [cameraReady, device, hasPermission, torchOn]);

  const shutterDisabled = capturing || !cameraReady || !device || !hasPermission;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      hardwareAccelerated
      onShow={() => setModalShown(true)}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.root}>
        {/* Cámara o Vista de espera/permisos */}
        {device && hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible && modalShown}
            outputs={[photoOutput]}
            torchMode={cameraReady ? (torchOn ? 'on' : 'off') : undefined}
            resizeMode="cover"
            onStarted={() => setCameraReady(true)}
            onStopped={() => setCameraReady(false)}
          />
        ) : !hasPermission ? (
          <View style={s.permissionBox}>
            <View style={s.permissionIconWrap}>
              <CameraIcon size={36} color={COLORS.primaryLight} strokeWidth={1.8} />
            </View>
            <Text style={s.permissionTitle}>Permiso de cámara requerido</Text>
            <Text style={s.permissionSub}>
              {isSelfieCamera
                ? 'Necesitamos acceso a la cámara para tomar una selfie.'
                : 'Para fotografiar y validar tu documento necesitamos acceso a la cámara.'}
            </Text>
            <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
              <Text style={s.permissionBtnText}>Dar permiso</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
            <Text style={s.loaderText}>Iniciando cámara…</Text>
          </View>
        )}

        {/* Máscara oscura con recorte transparente para el documento */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Parte superior */}
          <View style={[s.mask, { top: 0, left: 0, right: 0, height: frameTop, opacity: isSelfieCamera ? 0 : 1 }]} />
          {/* Lado izquierdo */}
          <View
            style={[s.mask, { top: frameTop, height: frameH, left: 0, width: frameLeft, opacity: isSelfieCamera ? 0 : 1 }]}
          />
          {/* Lado derecho */}
          <View
            style={[
              s.mask,
              { top: frameTop, height: frameH, left: frameLeft + frameW, right: 0, opacity: isSelfieCamera ? 0 : 1 },
            ]}
          />
          {/* Parte inferior */}
          <View
            style={[
              s.mask,
              { top: frameTop + frameH, bottom: 0, left: 0, right: 0, opacity: isSelfieCamera ? 0 : 1 },
            ]}
          />

          {/* Borde sutil del contorno del documento */}
          <View
            style={[
              s.frameOutline,
              {
                top: frameTop,
                left: frameLeft,
                width: frameW,
                height: frameH,
                borderRadius: isSelfieCamera ? Math.round(frameW / 2) : cornerRadius,
                borderWidth: isSelfieCamera ? 3 : 1,
                borderColor: isSelfieCamera ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          />

          {/* Esquinas estilizadas */}
          <View
            style={[
              s.corner,
              {
                top: frameTop,
                left: frameLeft,
                width: cornerSize,
                height: cornerSize,
                opacity: isSelfieCamera ? 0 : 1,
                borderTopWidth: cornerThickness,
                borderLeftWidth: cornerThickness,
                borderTopLeftRadius: cornerRadius,
              },
            ]}
          />
          <View
            style={[
              s.corner,
              {
                top: frameTop,
                left: frameLeft + frameW - cornerSize,
                width: cornerSize,
                height: cornerSize,
                opacity: isSelfieCamera ? 0 : 1,
                borderTopWidth: cornerThickness,
                borderRightWidth: cornerThickness,
                borderTopRightRadius: cornerRadius,
              },
            ]}
          />
          <View
            style={[
              s.corner,
              {
                top: frameTop + frameH - cornerSize,
                left: frameLeft,
                width: cornerSize,
                height: cornerSize,
                opacity: isSelfieCamera ? 0 : 1,
                borderBottomWidth: cornerThickness,
                borderLeftWidth: cornerThickness,
                borderBottomLeftRadius: cornerRadius,
              },
            ]}
          />
          <View
            style={[
              s.corner,
              {
                top: frameTop + frameH - cornerSize,
                left: frameLeft + frameW - cornerSize,
                width: cornerSize,
                height: cornerSize,
                opacity: isSelfieCamera ? 0 : 1,
                borderBottomWidth: cornerThickness,
                borderRightWidth: cornerThickness,
                borderBottomRightRadius: cornerRadius,
              },
            ]}
          />

          {/* Marca de agua central suave */}
          <View
            style={[
              s.frameCenterWatermark,
              {
                top: frameTop,
                left: frameLeft,
                width: frameW,
                height: frameH,
                opacity: isSelfieCamera ? 0 : 1,
              },
            ]}
          >
            {documentType === 'soat' ? (
              <Shield size={50} color="rgba(255, 255, 255, 0.2)" strokeWidth={1.4} />
            ) : documentType === 'certificate' || documentType === 'ruat' ? (
              <FileText size={48} color="rgba(255, 255, 255, 0.18)" strokeWidth={1.4} />
            ) : documentType === 'vehicle' ? (
              <Car size={54} color="rgba(255, 255, 255, 0.22)" strokeWidth={1.4} />
            ) : (
              <ScanLine size={44} color="rgba(255, 255, 255, 0.18)" strokeWidth={1.5} />
            )}
          </View>
        </View>

        {/* Header superior */}
        <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
          <TouchableOpacity
            onPress={onClose}
            style={s.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={20} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={s.titleContainer}>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {isSelfieCamera ? <View style={s.iconBtn} /> : (
            <TouchableOpacity
              onPress={() => setTorchOn(v => !v)}
              style={[s.iconBtn, torchOn && s.iconBtnActive]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              {torchOn ? (
                <Zap size={20} color="#111827" strokeWidth={2.4} fill="#111827" />
              ) : (
                <ZapOff size={20} color="#FFFFFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Indicador / Etiqueta guía */}
        {!!frameLabel && (
          <View
            pointerEvents="none"
            style={[
              s.labelWrap,
              { top: frameTop + frameH + (isPortraitDoc ? 12 : 18) },
            ]}
          >
            <View style={s.labelBadge}>
              <Text style={s.labelText}>{frameLabel}</Text>
            </View>
          </View>
        )}

        {/* Controles inferiores (disparador manual minimalista) */}
        <View
          style={[
            s.bottomControls,
            { paddingBottom: Math.max(insets.bottom + 24, 38) },
          ]}
        >
          <TouchableOpacity
            style={[s.shutterOuter, shutterDisabled && s.shutterDisabled]}
            onPress={captureNow}
            disabled={shutterDisabled}
            activeOpacity={0.75}
          >
            {capturing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <View style={s.shutterInner} />
            )}
          </TouchableOpacity>

          <Text style={s.footerHint}>
            {capturing
              ? 'Procesando captura…'
              : isSelfieCamera
                ? 'Centra tu rostro dentro del óvalo y toma la selfie'
                : 'Presiona el botón para capturar el documento'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  permissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSub: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  frameOutline: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#FFFFFF',
  },
  frameCenterWatermark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(24, 24, 27, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  labelBadge: {
    backgroundColor: 'rgba(18, 18, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    maxWidth: '100%',
  },
  labelText: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  footerHint: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
