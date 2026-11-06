import React, { useCallback as usarFuncionRetorno, useEffect as usarEfecto, useRef as usarReferencia, useState as usarEstado } from 'react';
import {
  ActivityIndicator as ActividadIndicador,
  Alert,
  Animated as Animado,
  Easing,
  Image as Imagen,
  Modal,
  StatusBar as EstadoBar,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista,
  useWindowDimensions as usarWindowDimensions } from
'react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import {
  Camera as Camara,
  CommonResolutions,
  useCameraDevice as usarCamaraDevice,
  useCameraPermission as usarCamaraPermiso,
  usePhotoOutput as usarFotoSalida } from
'react-native-vision-camera';
import {
  X,
  Zap,
  ZapOff,
  ScanLine as ScanLinea,
  Camera as CamaraIcon,
  FileText as ArchivoTexto,
  Car,
  Shield,
  RotateCcw,
  IdCard } from
'lucide-react-native';
import { COLORS as Colores } from '../theme/colors';

// Proporción estándar de cédula / tarjeta de identidad (ISO/IEC 7810 ID-1: 85.6mm x 53.98mm)
const TARJETA_ASPECTO = 1.585;
// Proporción estándar de hoja Carta boliviana vertical (certificado de antecedentes).
const CERTIFICATE_ASPECTO = 216 / 279;
// Roseta digital SOAT UNIVIDA de referencia: 720 × 1281 px.
const SOAT_ASPECTO = 720 / 1281;
// RUAT/CRPVA de la muestra: documento vertical (ancho / alto ≈ 585 / 765).
const RUAT_ASPECTO = 585 / 765;
// Proporción óptima para encuadre de vehículo (vista delantera y trasera)
const VEHICULO_ASPECTO = 1.38;

export interface RectanguloFotograma {
  screenW: number;
  screenH: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DocumentoTipo = 'card' | 'certificate' | 'ruat' | 'vehicle' | 'soat' | 'ci';

export interface DocumentoCamaraModalPropiedades {
  visible: boolean;
  title: string;
  /** Tipo de documento: tarjeta horizontal ('card'), cédula ('ci'), certificado ('certificate'), RUAT ('ruat'), vehículo ('vehicle') o SOAT ('soat') */
  documentType?: DocumentoTipo;
  /** Usa la cámara frontal para una selfie común. */
  cameraPosition?: 'front' | 'back';
  /** Sobrescribe la proporción ancho/alto si se especifica */
  aspectRatio?: number;
  /** Texto guía del molde (ej: "Coloca el frente de la cédula en el recuadro") */
  frameLabel?: string;
  /** @deprecated Captura manual únicamente */
  autoCapture?: boolean;
  onCapture: (uri: string, frame?: RectanguloFotograma) => void;
  onClose: () => void;
  /** Si es true, captura frente y luego reverso consecutivamente sin salir de la cámara */
  twoSided?: boolean;
  /** Lado inicial forzado ('front' o 'back') */
  initialSide?: 'front' | 'back';
  /** Callback invocado cuando se capturan ambos lados en un solo flujo */
  onCaptureBoth?: (
  front: {uri: string;frame?: RectanguloFotograma;},
  back: {uri: string;frame?: RectanguloFotograma;})
  => void;
}

function hastaArchivoUri(archivoRuta: string): string {
  if (archivoRuta.startsWith('file://') || archivoRuta.startsWith('content://')) {
    return archivoRuta;
  }
  return 'file://' + archivoRuta;
}

const DocumentoCamaraModal: React.FC<DocumentoCamaraModalPropiedades> = ({
  visible,
  title: titulo,
  documentType: documentoTipo = 'card',
  cameraPosition: camaraPosicion = 'back',
  aspectRatio: aspectoProporcion,
  frameLabel: fotogramaEtiqueta = '',
  twoSided,
  initialSide: inicialLado,
  onCapture: alCapturar,
  onCaptureBoth: alCapturarAmbos,
  onClose: alCerrar
}) => {
  const margenes = usarSeguraZonaMargenes();
  const { width: winW, height: winH } = usarWindowDimensions();

  const esAutorretratoCamara = camaraPosicion === 'front';
  const device = usarCamaraDevice(camaraPosicion);
  const { hasPermission: tienePermiso, requestPermission: solicitudPermiso } = usarCamaraPermiso();

  const fotoSalida = usarFotoSalida({
    targetResolution: CommonResolutions.UHD_4_3,
    quality: 0.92,
    qualityPrioritization: 'balanced'
  });
  const fotoSalidaReferencia = usarReferencia(fotoSalida);
  fotoSalidaReferencia.current = fotoSalida;

  const [linternaAl, establecerLinternaAl] = usarEstado(false);
  const [capturando, establecerCapturando] = usarEstado(false);
  const [camaraListo, establecerCamaraListo] = usarEstado(false);
  const [modalShown, establecerModalShown] = usarEstado(false);

  // Detección de CI (Cédula de Identidad)
  const esCiDocumento =
  documentoTipo === 'ci' ||
  documentoTipo === 'card' && (
  /\bci\b|cédula|cedula|carnet/i.test(titulo) || /\bci\b|cédula|cedula|carnet/i.test(fotogramaEtiqueta));

  const esReversoPredeterminado =
  inicialLado === 'back' ||
  /posterior|reverso|atrás|dorso|back/i.test(titulo) ||
  /posterior|reverso|atrás|dorso|back/i.test(fotogramaEtiqueta);

  const esTwoSidedFlow = Boolean(
    twoSided !== undefined ?
    twoSided :
    esCiDocumento && !esReversoPredeterminado && (!inicialLado || inicialLado === 'front')
  );
  const mostrarTarjetaAnimada = esCiDocumento || esTwoSidedFlow;

  const [activoLado, establecerActivoLado] = usarEstado<'front' | 'back'>(
    inicialLado ?? (esReversoPredeterminado ? 'back' : 'front')
  );
  const [frontalCapturar, establecerFrontalCapturar] = usarEstado<{uri: string;frame?: RectanguloFotograma;} | null>(null);
  const [esFlipping, establecerEsFlipping] = usarEstado(false);

  const capturandoReferencia = usarReferencia(false);
  const alCapturarReferencia = usarReferencia(alCapturar);
  alCapturarReferencia.current = alCapturar;
  const alCapturarAmbosReferencia = usarReferencia(alCapturarAmbos);
  alCapturarAmbosReferencia.current = alCapturarAmbos;

  // Dimensiones del recuadro del documento según tipo de documento
  const objetivoAspecto =
  aspectoProporcion ?? (
  esAutorretratoCamara ?
  0.78 :
  documentoTipo === 'certificate' ?
  CERTIFICATE_ASPECTO :
  documentoTipo === 'soat' ?
  SOAT_ASPECTO :
  documentoTipo === 'ruat' ?
  RUAT_ASPECTO :
  documentoTipo === 'vehicle' ?
  VEHICULO_ASPECTO :
  TARJETA_ASPECTO);
  const esRetratoDocumento = objetivoAspecto < 1;
  // A full-screen "cover" preview hides part of the 4:3 photo's field of view.
  // Use a 3:4 viewport to align the guide with the 4:3 photo target.
  const mostrarFotoZona = !esAutorretratoCamara && documentoTipo !== 'vehicle';
  const cabeceraInferior = Math.max(margenes.top + 68, 80);
  const controlsSuperior = winH - Math.max(margenes.bottom + 140, 168);
  const etiquetaSpace = fotogramaEtiqueta ? 42 : 10;
  const disponibleFotoH = Math.max(260, controlsSuperior - cabeceraInferior - etiquetaSpace);
  const fotoZonaW = mostrarFotoZona ? Math.min(winW, Math.floor(disponibleFotoH * 3 / 4)) : winW;
  const fotoZonaH = mostrarFotoZona ? Math.round(fotoZonaW * 4 / 3) : winH;
  const fotoZonaIzquierda = mostrarFotoZona ? Math.round((winW - fotoZonaW) / 2) : 0;
  const fotoZonaSuperior = mostrarFotoZona ?
  cabeceraInferior + Math.max(0, Math.round((disponibleFotoH - fotoZonaH) / 2)) :
  0;

  let fotogramaW: number;
  let fotogramaH: number;
  let fotogramaIzquierda: number;
  let fotogramaSuperior: number;

  if (mostrarFotoZona) {
    const maximoW = fotoZonaW - 24;
    const maximoH = fotoZonaH - 24;
    fotogramaW = Math.min(maximoW, Math.round(maximoH * objetivoAspecto));
    fotogramaH = Math.round(fotogramaW / objetivoAspecto);
    fotogramaIzquierda = fotoZonaIzquierda + Math.round((fotoZonaW - fotogramaW) / 2);
    fotogramaSuperior = fotoZonaSuperior + Math.round((fotoZonaH - fotogramaH) / 2);
  } else if (esRetratoDocumento) {
    // Para certificados en hoja vertical (Carta boliviana: 216mm x 279mm)
    const headerBottom = Math.max(margenes.top + 68, 80);
    const controlsTop = winH - Math.max(margenes.bottom + 140, 168);
    const labelSpace = fotogramaEtiqueta ? 42 : 10;
    const maximoDisponibleH = Math.max(260, controlsTop - headerBottom - labelSpace);
    const maximoDisponibleW = winW - 56;

    let testH = Math.min(maximoDisponibleH, Math.round(maximoDisponibleW / objetivoAspecto));
    let testW = Math.round(testH * objetivoAspecto);

    if (testW > maximoDisponibleW) {
      testW = maximoDisponibleW;
      testH = Math.round(testW / objetivoAspecto);
    }

    fotogramaW = testW;
    fotogramaH = testH;
    fotogramaIzquierda = Math.round((winW - fotogramaW) / 2);
    const disponibleSlot = controlsTop - labelSpace - headerBottom;
    fotogramaSuperior = headerBottom + Math.max(4, Math.round((disponibleSlot - fotogramaH) / 2));
  } else {
    // Dimensiones para documentos y fotos horizontales (cédula, vehículo)
    fotogramaW = Math.min(winW - 48, 380);
    fotogramaH = Math.round(fotogramaW / objetivoAspecto);
    fotogramaIzquierda = Math.round((winW - fotogramaW) / 2);
    fotogramaSuperior = Math.max(margenes.top + 70, Math.round((winH - fotogramaH) / 2 - 40));
  }

  const esquinaTamano = esRetratoDocumento ? 28 : documentoTipo === 'vehicle' ? 32 : 26;
  const esquinaThickness = 3.5;
  const esquinaRadio =
  esRetratoDocumento || documentoTipo === 'ruat' || documentoTipo === 'soat' ?
  8 :
  documentoTipo === 'vehicle' ?
  14 :
  10;

  const fotogramaReferencia = usarReferencia<RectanguloFotograma>({
    screenW: fotoZonaW,
    screenH: fotoZonaH,
    x: fotogramaIzquierda - fotoZonaIzquierda,
    y: fotogramaSuperior - fotoZonaSuperior,
    w: fotogramaW,
    h: fotogramaH
  });

  fotogramaReferencia.current = {
    screenW: fotoZonaW,
    screenH: fotoZonaH,
    x: fotogramaIzquierda - fotoZonaIzquierda,
    y: fotogramaSuperior - fotoZonaSuperior,
    w: fotogramaW,
    h: fotogramaH
  };

  usarEfecto(() => {
    if (visible && !tienePermiso) {
      solicitudPermiso().catch(() => {});
    }
  }, [visible, tienePermiso, solicitudPermiso]);

  const ciIconoOpacidad = usarReferencia(new Animado.Value(0)).current;
  const ciIconoGirarY = usarReferencia(new Animado.Value(0)).current;

  const reproducirInicioAnimacion = usarFuncionRetorno(() => {
    ciIconoGirarY.setValue(0);
    ciIconoOpacidad.setValue(0.85);
    Animado.sequence([
    Animado.delay(1200),
    Animado.timing(ciIconoOpacidad, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    })]
    ).start();
  }, [ciIconoOpacidad, ciIconoGirarY]);

  const reproducirFlipAnimacion = usarFuncionRetorno(() => {
    establecerEsFlipping(true);
    ciIconoGirarY.setValue(0);
    ciIconoOpacidad.setValue(0);

    Animado.sequence([
    // 1. Aparece
    Animado.timing(ciIconoOpacidad, {
      toValue: 0.9,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }),
    // 2. Gira
    Animado.timing(ciIconoGirarY, {
      toValue: 180,
      duration: 900,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }),
    Animado.delay(350),
    // 3. Se desvanece
    Animado.timing(ciIconoOpacidad, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    })]
    ).start(({ finished: terminado }) => {
      if (terminado) {
        establecerActivoLado('back');
        establecerEsFlipping(false);
      }
    });
  }, [ciIconoOpacidad, ciIconoGirarY]);

  usarEfecto(() => {
    if (visible) {
      capturandoReferencia.current = false;
      establecerCapturando(false);
      establecerLinternaAl(false);
      establecerCamaraListo(false);
      establecerEsFlipping(false);
      establecerFrontalCapturar(null);
      establecerActivoLado(inicialLado ?? (esReversoPredeterminado ? 'back' : 'front'));
      if (mostrarTarjetaAnimada) {
        reproducirInicioAnimacion();
      } else {
        ciIconoOpacidad.setValue(0);
        ciIconoGirarY.setValue(0);
      }
    } else {
      establecerCamaraListo(false);
      establecerModalShown(false);
      establecerEsFlipping(false);
      establecerFrontalCapturar(null);
      ciIconoOpacidad.setValue(0);
      ciIconoGirarY.setValue(0);
    }
  }, [visible, inicialLado, esReversoPredeterminado, mostrarTarjetaAnimada, reproducirInicioAnimacion, ciIconoOpacidad, ciIconoGirarY]);

  const capturarAhora = usarFuncionRetorno(async () => {
    if (capturandoReferencia.current || esFlipping) return;
    if (!camaraListo || !device || !tienePermiso) return;

    capturandoReferencia.current = true;
    establecerCapturando(true);

    try {
      let ultimoError = null;
      for (let intento = 0; intento < 2; intento++) {
        try {
          const archivo = await fotoSalidaReferencia.current.capturePhotoToFile(
            { flashMode: linternaAl ? 'on' : 'off' },
            {}
          );
          const uri = hastaArchivoUri(archivo.filePath);
          const realFotograma = { ...fotogramaReferencia.current };
          Imagen.getSize(
            uri,
            (ancho, alto) => {
              console.log(`[DocumentCamera] Captura: ${ancho}x${alto} píxeles`);
            },
            () => {}
          );

          // Si estamos en flujo de dos lados y capturando el frente:
          if (esTwoSidedFlow && activoLado === 'front') {
            establecerFrontalCapturar({ uri, frame: realFotograma });
            establecerCapturando(false);
            capturandoReferencia.current = false;
            reproducirFlipAnimacion();
            return;
          }

          // Si estamos en flujo de dos lados y capturando el dorso:
          if (esTwoSidedFlow && activoLado === 'back' && frontalCapturar) {
            establecerCapturando(false);
            capturandoReferencia.current = false;
            if (alCapturarAmbosReferencia.current) {
              alCapturarAmbosReferencia.current(frontalCapturar, { uri, frame: realFotograma });
            } else {
              alCapturarReferencia.current(uri, realFotograma);
            }
            return;
          }

          // Flujo estándar de un solo lado:
          alCapturarReferencia.current(uri, realFotograma);
          return;
        } catch (error: any) {
          ultimoError = error;
          const mensaje = String(error?.message || '');
          const inactivo = /not active|canceled|cancelled/i.test(mensaje);
          if (inactivo && intento === 0) {
            await new Promise<void>((r) => setTimeout(r, 250));
            continue;
          }
          throw error;
        }
      }
      if (ultimoError) throw ultimoError;
    } catch (error: any) {
      capturandoReferencia.current = false;
      establecerCapturando(false);
      Alert.alert(
        'Error',
        `No se pudo capturar la foto. Inténtalo de nuevo.\n\n${error?.message || ''}`
      );
    }
  }, [camaraListo, device, tienePermiso, linternaAl, esFlipping, esTwoSidedFlow, activoLado, frontalCapturar]);

  const shutterDeshabilitado = capturando || esFlipping || !camaraListo || !device || !tienePermiso;

  const mostrarTitulo = esCiDocumento ? 'Cédula de identidad' : titulo;
  const mostrarSubtitulo = esCiDocumento || esTwoSidedFlow ?
  activoLado === 'front' ? 'Vista frontal' : 'Vista trasera' :
  null;

  const mostrarEtiqueta =
  esCiDocumento && activoLado === 'back' ?
  'Coloca la parte trasera de tu cédula dentro del recuadro' :
  esTwoSidedFlow && activoLado === 'back' ?
  'Coloca el reverso del documento dentro del recuadro' :
  fotogramaEtiqueta;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      hardwareAccelerated
      onShow={() => establecerModalShown(true)}
      onRequestClose={alCerrar}>

      <EstadoBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Vista style={s.root}>
        {/* Cámara o Vista de espera/permisos */}
        {device && tienePermiso ?
        <Camara
          style={mostrarFotoZona ? {
            position: 'absolute', left: fotoZonaIzquierda, top: fotoZonaSuperior,
            width: fotoZonaW, height: fotoZonaH
          } : EstiloHoja.absoluteFill}
          device={device}
          isActive={visible && modalShown}
          outputs={[fotoSalida]}
          orientationSource="interface"
          torchMode={camaraListo ? linternaAl ? 'on' : 'off' : undefined}
          resizeMode="cover"
          onStarted={() => establecerCamaraListo(true)}
          onStopped={() => establecerCamaraListo(false)} /> :

        !tienePermiso ?
        <Vista style={s.permissionBox}>
            <Vista style={s.permissionIconWrap}>
              <CamaraIcon size={36} color={Colores.primaryLight} strokeWidth={1.8} />
            </Vista>
            <Texto style={s.permissionTitle}>Permiso de cámara requerido</Texto>
            <Texto style={s.permissionSub}>
              {esAutorretratoCamara ?
            'Necesitamos acceso a la cámara para tomar una selfie.' :
            'Para fotografiar y validar tu documento necesitamos acceso a la cámara.'}
            </Texto>
            <PulsableOpacidad style={s.permissionBtn} onPress={solicitudPermiso}>
              <Texto style={s.permissionBtnText}>Dar permiso</Texto>
            </PulsableOpacidad>
          </Vista> :

        <Vista style={s.loaderBox}>
            <ActividadIndicador size="large" color={Colores.primaryLight} />
            <Texto style={s.loaderText}>Iniciando cámara…</Texto>
          </Vista>
        }

        {/* Máscara oscura con recorte transparente para el documento */}
        <Vista pointerEvents="none" style={EstiloHoja.absoluteFill}>
          {/* Parte superior */}
          <Vista style={[s.mask, { top: 0, left: 0, right: 0, height: fotogramaSuperior, opacity: esAutorretratoCamara ? 0 : 1 }]} />
          {/* Lado izquierdo */}
          <Vista
            style={[s.mask, { top: fotogramaSuperior, height: fotogramaH, left: 0, width: fotogramaIzquierda, opacity: esAutorretratoCamara ? 0 : 1 }]} />

          {/* Lado derecho */}
          <Vista
            style={[
            s.mask,
            { top: fotogramaSuperior, height: fotogramaH, left: fotogramaIzquierda + fotogramaW, right: 0, opacity: esAutorretratoCamara ? 0 : 1 }]
            } />

          {/* Parte inferior */}
          <Vista
            style={[
            s.mask,
            { top: fotogramaSuperior + fotogramaH, bottom: 0, left: 0, right: 0, opacity: esAutorretratoCamara ? 0 : 1 }]
            } />


          {/* Borde sutil del contorno del documento */}
          <Vista
            style={[
            s.frameOutline,
            {
              top: fotogramaSuperior,
              left: fotogramaIzquierda,
              width: fotogramaW,
              height: fotogramaH,
              borderRadius: esAutorretratoCamara ? Math.round(fotogramaW / 2) : esquinaRadio,
              borderWidth: esAutorretratoCamara ? 3 : 1,
              borderColor: esAutorretratoCamara ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.2)'
            }]
            } />


          {/* Esquinas estilizadas */}
          <Vista
            style={[
            s.corner,
            {
              top: fotogramaSuperior,
              left: fotogramaIzquierda,
              width: esquinaTamano,
              height: esquinaTamano,
              opacity: esAutorretratoCamara ? 0 : 1,
              borderTopWidth: esquinaThickness,
              borderLeftWidth: esquinaThickness,
              borderTopLeftRadius: esquinaRadio
            }]
            } />

          <Vista
            style={[
            s.corner,
            {
              top: fotogramaSuperior,
              left: fotogramaIzquierda + fotogramaW - esquinaTamano,
              width: esquinaTamano,
              height: esquinaTamano,
              opacity: esAutorretratoCamara ? 0 : 1,
              borderTopWidth: esquinaThickness,
              borderRightWidth: esquinaThickness,
              borderTopRightRadius: esquinaRadio
            }]
            } />

          <Vista
            style={[
            s.corner,
            {
              top: fotogramaSuperior + fotogramaH - esquinaTamano,
              left: fotogramaIzquierda,
              width: esquinaTamano,
              height: esquinaTamano,
              opacity: esAutorretratoCamara ? 0 : 1,
              borderBottomWidth: esquinaThickness,
              borderLeftWidth: esquinaThickness,
              borderBottomLeftRadius: esquinaRadio
            }]
            } />

          <Vista
            style={[
            s.corner,
            {
              top: fotogramaSuperior + fotogramaH - esquinaTamano,
              left: fotogramaIzquierda + fotogramaW - esquinaTamano,
              width: esquinaTamano,
              height: esquinaTamano,
              opacity: esAutorretratoCamara ? 0 : 1,
              borderBottomWidth: esquinaThickness,
              borderRightWidth: esquinaThickness,
              borderBottomRightRadius: esquinaRadio
            }]
            } />


          {/* Silueta / Marca de agua central suave con icono Lucide para otros documentos */}
          {!mostrarTarjetaAnimada &&
          <Vista
            style={[
            s.frameCenterWatermark,
            {
              top: fotogramaSuperior,
              left: fotogramaIzquierda,
              width: fotogramaW,
              height: fotogramaH,
              opacity: esAutorretratoCamara ? 0 : 1
            }]
            }>

              {documentoTipo === 'soat' ?
            <Shield size={50} color="rgba(255, 255, 255, 0.2)" strokeWidth={1.4} /> :
            documentoTipo === 'certificate' || documentoTipo === 'ruat' ?
            <ArchivoTexto size={48} color="rgba(255, 255, 255, 0.18)" strokeWidth={1.4} /> :
            documentoTipo === 'vehicle' ?
            <Car size={54} color="rgba(255, 255, 255, 0.22)" strokeWidth={1.4} /> :

            <ScanLinea size={44} color="rgba(255, 255, 255, 0.18)" strokeWidth={1.5} />
            }
            </Vista>
          }

          {/* La tarjeta aparece al abrir la cámara y gira al pasar al reverso. */}
          {mostrarTarjetaAnimada &&
          <Animado.View
            pointerEvents="none"
            style={[
            s.ciIconContainer,
            {
              top: fotogramaSuperior,
              left: fotogramaIzquierda,
              width: fotogramaW,
              height: fotogramaH,
              opacity: ciIconoOpacidad,
              transform: [
              { perspective: 1000 },
              {
                rotateY: ciIconoGirarY.interpolate({
                  inputRange: [0, 180],
                  outputRange: ['0deg', '180deg']
                })
              },
              {
                scale: ciIconoGirarY.interpolate({
                  inputRange: [0, 90, 180],
                  outputRange: [1, 1.1, 1]
                })
              }]

            }]
            }>

              <Vista style={s.idCardIconWrap}>
                <IdCard size={Math.min(fotogramaW * 0.28, 92)} color="#FFFFFF" strokeWidth={1.4} />
              </Vista>

            </Animado.View>
          }
        </Vista>

        {/* Header superior */}
        <Vista style={[s.header, { paddingTop: Math.max(margenes.top + 10, 24) }]}>
          <PulsableOpacidad
            onPress={alCerrar}
            style={s.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}>

            <X size={20} color="#FFFFFF" strokeWidth={2.2} />
          </PulsableOpacidad>

          <Vista style={s.titleContainer}>
            <Texto style={s.title} numberOfLines={1}>
              {mostrarTitulo}
            </Texto>
            {mostrarSubtitulo && <Texto style={s.titleSubtitle}>{mostrarSubtitulo}</Texto>}
            {esTwoSidedFlow && activoLado === 'back' && !esFlipping &&
            <PulsableOpacidad
              onPress={() => {
                establecerActivoLado('front');
                establecerFrontalCapturar(null);
                reproducirInicioAnimacion();
              }}
              style={s.redoFrontChip}
              activeOpacity={0.75}>

                <RotateCcw size={11} color="#DDD6FE" strokeWidth={2.4} />
                <Texto style={s.redoFrontText}>Repetir frente</Texto>
              </PulsableOpacidad>
            }
          </Vista>

          {esAutorretratoCamara ? <Vista style={s.iconBtn} /> :
          <PulsableOpacidad
            onPress={() => establecerLinternaAl((v) => !v)}
            style={[s.iconBtn, linternaAl && s.iconBtnActive]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}>

              {linternaAl ?
            <Zap size={20} color="#111827" strokeWidth={2.4} fill="#111827" /> :

            <ZapOff size={20} color="#FFFFFF" strokeWidth={2} />
            }
            </PulsableOpacidad>
          }
        </Vista>

        {/* Indicador / Etiqueta guía */}
        {!!mostrarEtiqueta &&
        <Vista
          pointerEvents="none"
          style={[
          s.labelWrap,
          { top: fotogramaSuperior + fotogramaH + (esRetratoDocumento ? 12 : 18) }]
          }>

            <Vista style={s.labelBadge}>
              <Texto style={s.labelText}>{mostrarEtiqueta}</Texto>
            </Vista>
          </Vista>
        }

        {/* Controles inferiores (disparador manual minimalista) */}
        <Vista
          style={[
          s.bottomControls,
          { paddingBottom: Math.max(margenes.bottom + 24, 38) }]
          }>

          <PulsableOpacidad
            style={[s.shutterOuter, shutterDeshabilitado && s.shutterDisabled]}
            onPress={capturarAhora}
            disabled={shutterDeshabilitado}
            activeOpacity={0.75}>

            {capturando ?
            <ActividadIndicador size="small" color={Colores.primary} /> :

            <Vista style={s.shutterInner} />
            }
          </PulsableOpacidad>

          <Texto style={s.footerHint}>
            {capturando ?
            'Procesando captura…' :
            esFlipping ?
            'Volteando al reverso…' :
            esCiDocumento || esTwoSidedFlow ?
            activoLado === 'front' ?
            'Presiona el botón para capturar el frente' :
            'Presiona el botón para capturar el reverso' :
            esAutorretratoCamara ?
            'Centra tu rostro dentro del óvalo y toma la selfie' :
            'Presiona el botón para capturar el documento'}
          </Texto>
        </Vista>
      </Vista>
    </Modal>);

};export { DocumentoCamaraModal };

const s = EstiloHoja.create({
  root: {
    flex: 1,
    backgroundColor: '#000000'
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loaderText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500'
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36
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
    borderColor: 'rgba(167, 139, 250, 0.3)'
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8
  },
  permissionSub: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  permissionBtn: {
    backgroundColor: Colores.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)'
  },
  frameOutline: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#FFFFFF'
  },
  frameCenterWatermark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
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
    paddingBottom: 14
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(24, 24, 27, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBtnActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B'
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  titleSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2
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
    marginTop: 4
  },
  redoFrontText: {
    color: '#DDD6FE',
    fontSize: 10,
    fontWeight: '700'
  },
  labelWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center'
  },
  labelBadge: {
    backgroundColor: 'rgba(18, 18, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    maxWidth: '100%'
  },
  labelText: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)'
  },
  shutterDisabled: {
    opacity: 0.45
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF'
  },
  footerHint: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1
  },
  ciIconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
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
    shadowRadius: 10
  }
});
