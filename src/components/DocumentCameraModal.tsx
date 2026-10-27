import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import {
  X,
  Zap,
  ZapOff,
  ScanLine,
  Camera as CameraIcon,
  FileText,
  Car,
  Shield,
  RotateCcw,
  IdCard,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';

// Proporción estándar de cédula / tarjeta de identidad (ISO/IEC 7810 ID-1: 85.6mm x 53.98mm)
const CARD_ASPECT = 1.585;
// Proporción estándar de hoja Carta boliviana vertical (certificado de antecedentes).
const CERTIFICATE_ASPECT = 216 / 279;
// Roseta digital SOAT UNIVIDA de referencia: 720 × 1281 px.
const SOAT_ASPECT = 720 / 1281;
// RUAT/CRPVA de la muestra: documento vertical (ancho / alto ≈ 585 / 765).
const RUAT_ASPECT = 585 / 765;
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

export type DocumentType = 'card' | 'certificate' | 'ruat' | 'vehicle' | 'soat' | 'ci';

export interface DocumentCameraModalProps {
  visible: boolean;
  title: string;
  /** Tipo de documento: tarjeta horizontal ('card'), cédula ('ci'), certificado ('certificate'), RUAT ('ruat'), vehículo ('vehicle') o SOAT ('soat') */
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
  /** Si es true, captura frente y luego reverso consecutivamente sin salir de la cámara */
  twoSided?: boolean;
  /** Lado inicial forzado ('front' o 'back') */
  initialSide?: 'front' | 'back';
  /** Callback invocado cuando se capturan ambos lados en un solo flujo */
  onCaptureBoth?: (
    front: { uri: string; frame?: FrameRect },
    back: { uri: string; frame?: FrameRect },
  ) => void;
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
  twoSided,
  initialSide,
  onCapture,
  onCaptureBoth,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const isSelfieCamera = cameraPosition === 'front';
  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();

  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.UHD_4_3,
    quality: 0.92,
    qualityPrioritization: 'balanced',
  });
  const photoOutputRef = useRef(photoOutput);
  photoOutputRef.current = photoOutput;

  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modalShown, setModalShown] = useState(false);

  // Detección de CI (Cédula de Identidad)
  const isCiDoc =
    documentType === 'ci' ||
    (documentType === 'card' &&
      (/ci|cédula|cedula|carnet/i.test(title) || /ci|cédula|cedula|carnet/i.test(frameLabel)));

  const isBackDefault =
    initialSide === 'back' ||
    /posterior|reverso|atrás|dorso|back/i.test(title) ||
    /posterior|reverso|atrás|dorso|back/i.test(frameLabel);

  const isTwoSidedFlow = Boolean(
    twoSided !== undefined
      ? twoSided
      : isCiDoc && !isBackDefault && (!initialSide || initialSide === 'front'),
  );

  const [activeSide, setActiveSide] = useState<'front' | 'back'>(
    initialSide ?? (isBackDefault ? 'back' : 'front'),
  );
  const [frontCapture, setFrontCapture] = useState<{ uri: string; frame?: FrameRect } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const capturingRef = useRef(false);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const onCaptureBothRef = useRef(onCaptureBoth);
  onCaptureBothRef.current = onCaptureBoth;

  // Dimensiones del recuadro del documento según tipo de documento
  const targetAspect =
    aspectRatio ??
    (isSelfieCamera
      ? 0.78
      : documentType === 'certificate'
      ? CERTIFICATE_ASPECT
      : documentType === 'soat'
      ? SOAT_ASPECT
      : documentType === 'ruat'
      ? RUAT_ASPECT
      : documentType === 'vehicle'
      ? VEHICLE_ASPECT
      : CARD_ASPECT);
  const isPortraitDoc = targetAspect < 1;
  // A full-screen "cover" preview hides part of the 4:3 photo's field of view.
  // Use a 3:4 viewport to align the guide with the 4:3 photo target.
  const showPhotoArea = !isSelfieCamera && documentType !== 'vehicle';
  const headerBottom = Math.max(insets.top + 68, 80);
  const controlsTop = winH - Math.max(insets.bottom + 140, 168);
  const labelSpace = frameLabel ? 42 : 10;
  const availablePhotoH = Math.max(260, controlsTop - headerBottom - labelSpace);
  const photoAreaW = showPhotoArea ? Math.min(winW, Math.floor(availablePhotoH * 3 / 4)) : winW;
  const photoAreaH = showPhotoArea ? Math.round(photoAreaW * 4 / 3) : winH;
  const photoAreaLeft = showPhotoArea ? Math.round((winW - photoAreaW) / 2) : 0;
  const photoAreaTop = showPhotoArea
    ? headerBottom + Math.max(0, Math.round((availablePhotoH - photoAreaH) / 2))
    : 0;

  let frameW: number;
  let frameH: number;
  let frameLeft: number;
  let frameTop: number;

  if (showPhotoArea) {
    const maxW = photoAreaW - 24;
    const maxH = photoAreaH - 24;
    frameW = Math.min(maxW, Math.round(maxH * targetAspect));
    frameH = Math.round(frameW / targetAspect);
    frameLeft = photoAreaLeft + Math.round((photoAreaW - frameW) / 2);
    frameTop = photoAreaTop + Math.round((photoAreaH - frameH) / 2);
  } else if (isPortraitDoc) {
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
    // Dimensiones para documentos y fotos horizontales (cédula, vehículo)
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
    screenW: photoAreaW,
    screenH: photoAreaH,
    x: frameLeft - photoAreaLeft,
    y: frameTop - photoAreaTop,
    w: frameW,
    h: frameH,
  });

  frameRef.current = {
    screenW: photoAreaW,
    screenH: photoAreaH,
    x: frameLeft - photoAreaLeft,
    y: frameTop - photoAreaTop,
    w: frameW,
    h: frameH,
  };

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(() => {});
    }
  }, [visible, hasPermission, requestPermission]);

  const ciIconOpacity = useRef(new Animated.Value(0)).current;
  const ciIconRotateY = useRef(new Animated.Value(0)).current;

  const playStartAnimation = useCallback(() => {
    ciIconRotateY.setValue(0);
    ciIconOpacity.setValue(0.85);
    Animated.sequence([
      Animated.delay(1200),
      Animated.timing(ciIconOpacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [ciIconOpacity, ciIconRotateY]);

  const playFlipAnimation = useCallback(() => {
    setIsFlipping(true);
    ciIconRotateY.setValue(0);
    ciIconOpacity.setValue(0);

    Animated.sequence([
      // 1. Aparece
      Animated.timing(ciIconOpacity, {
        toValue: 0.9,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // 2. Gira
      Animated.timing(ciIconRotateY, {
        toValue: 180,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(350),
      // 3. Se desvanece
      Animated.timing(ciIconOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setActiveSide('back');
        setIsFlipping(false);
      }
    });
  }, [ciIconOpacity, ciIconRotateY]);

  useEffect(() => {
    if (visible) {
      capturingRef.current = false;
      setCapturing(false);
      setTorchOn(false);
      setCameraReady(false);
      setIsFlipping(false);
      setFrontCapture(null);
      setActiveSide(initialSide ?? (isBackDefault ? 'back' : 'front'));
      if (isCiDoc) {
        playStartAnimation();
      } else {
        ciIconOpacity.setValue(0);
        ciIconRotateY.setValue(0);
      }
    } else {
      setCameraReady(false);
      setModalShown(false);
      setIsFlipping(false);
      setFrontCapture(null);
      ciIconOpacity.setValue(0);
      ciIconRotateY.setValue(0);
    }
  }, [visible, initialSide, isBackDefault, isCiDoc, playStartAnimation, ciIconOpacity, ciIconRotateY]);

  const captureNow = useCallback(async () => {
    if (capturingRef.current || isFlipping) return;
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
          const uri = toFileUri(file.filePath);
          const currentFrame = { ...frameRef.current };
          Image.getSize(
            uri,
            (width, height) => {
              console.log(`[DocumentCamera] Captura: ${width}x${height} píxeles`);
            },
            () => {},
          );

          // Si estamos en flujo de dos lados y capturando el frente:
          if (isTwoSidedFlow && activeSide === 'front') {
            setFrontCapture({ uri, frame: currentFrame });
            setCapturing(false);
            capturingRef.current = false;
            playFlipAnimation();
            return;
          }

          // Si estamos en flujo de dos lados y capturando el dorso:
          if (isTwoSidedFlow && activeSide === 'back' && frontCapture) {
            setCapturing(false);
            capturingRef.current = false;
            if (onCaptureBothRef.current) {
              onCaptureBothRef.current(frontCapture, { uri, frame: currentFrame });
            } else {
              onCaptureRef.current(uri, currentFrame);
            }
            return;
          }

          // Flujo estándar de un solo lado:
          onCaptureRef.current(uri, currentFrame);
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
  }, [cameraReady, device, hasPermission, torchOn, isFlipping, isTwoSidedFlow, activeSide, frontCapture]);

  const shutterDisabled = capturing || isFlipping || !cameraReady || !device || !hasPermission;

  const displayTitle = isCiDoc ? 'Cédula de identidad' : title;
  const displaySubtitle = isCiDoc
    ? activeSide === 'front' ? 'Vista frontal' : 'Vista trasera'
    : null;

  const displayLabel =
    isCiDoc && activeSide === 'back'
      ? 'Coloca la parte trasera de tu cédula dentro del recuadro'
      : frameLabel;

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
            style={showPhotoArea ? {
              position: 'absolute', left: photoAreaLeft, top: photoAreaTop,
              width: photoAreaW, height: photoAreaH,
            } : StyleSheet.absoluteFill}
            device={device}
            isActive={visible && modalShown}
            outputs={[photoOutput]}
            orientationSource="interface"
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

          {/* Silueta / Marca de agua central suave con icono Lucide para otros documentos */}
          {!isCiDoc && (
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
          )}

          {/* Icono id_card animado para CI: se ve en el recuadro al iniciar y se desvanece; después de sacar la parte frontal aparece, gira y se desvanece */}
          {isCiDoc && (
            <Animated.View
              pointerEvents="none"
              style={[
                s.ciIconContainer,
                {
                  top: frameTop,
                  left: frameLeft,
                  width: frameW,
                  height: frameH,
                  opacity: ciIconOpacity,
                  transform: [
                    { perspective: 1000 },
                    {
                      rotateY: ciIconRotateY.interpolate({
                        inputRange: [0, 180],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                    {
                      scale: ciIconRotateY.interpolate({
                        inputRange: [0, 90, 180],
                        outputRange: [1, 1.1, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={s.idCardIconWrap}>
                <IdCard size={Math.min(frameW * 0.28, 92)} color="#FFFFFF" strokeWidth={1.4} />
              </View>

            </Animated.View>
          )}
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
              {displayTitle}
            </Text>
            {displaySubtitle && <Text style={s.titleSubtitle}>{displaySubtitle}</Text>}
            {isTwoSidedFlow && activeSide === 'back' && !isFlipping && (
              <TouchableOpacity
                onPress={() => {
                  setActiveSide('front');
                  setFrontCapture(null);
                  playStartAnimation();
                }}
                style={s.redoFrontChip}
                activeOpacity={0.75}
              >
                <RotateCcw size={11} color="#DDD6FE" strokeWidth={2.4} />
                <Text style={s.redoFrontText}>Repetir frente</Text>
              </TouchableOpacity>
            )}
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
        {!!displayLabel && (
          <View
            pointerEvents="none"
            style={[
              s.labelWrap,
              { top: frameTop + frameH + (isPortraitDoc ? 12 : 18) },
            ]}
          >
            <View style={s.labelBadge}>
              <Text style={s.labelText}>{displayLabel}</Text>
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
              : isFlipping
              ? 'Volteando al reverso…'
              : isCiDoc
              ? activeSide === 'front'
                ? 'Presiona el botón para capturar el frente'
                : 'Presiona el botón para capturar el reverso'
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
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  titleSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  redoFrontChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    marginTop: 4,
  },
  redoFrontText: {
    color: '#DDD6FE',
    fontSize: 10,
    fontWeight: '700',
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
  ciIconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  idCardIconWrap: {
    backgroundColor: 'rgba(25, 20, 35, 0.65)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});
