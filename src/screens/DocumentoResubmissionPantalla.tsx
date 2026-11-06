// src/screens/DocumentoResubmissionPantalla.tsx
import React, { useEffect as usarEfecto, useState as usarEstado } from 'react';
import {
  View as Vista,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Text as Texto,
  ScrollView as DesplazableVista,
  Alert,
  StatusBar as EstadoBar } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { CargaEnvioSolicitud, ConfirmacionEnvioSolicitud } from '../components/EstadoEnvioSolicitud';
import { DocumentoCamaraModal, type DocumentoTipo, type RectanguloFotograma } from '../components/DocumentoCamaraModal';
import { DomicilioEntrada, type DomicilioPunto } from '../components/DomicilioEntrada';
import {
  X,
  Camera as Camara,
  Check } from
'lucide-react-native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { API_BASE_URL } from "../config/constantes";
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceHigh: '#F3F3F3',
  border: '#EBEBEB',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#ADADAD',
  rojoAviso: '#E11D2E',
  white: '#FFFFFF'
};

type Propiedades = NativoPilaPantallaPropiedades<any, 'DocumentResubmission'>;

interface RechazadoDocumento {
  name: string;
  displayName: string;
  fieldName: string;
  photo: string | null;
  frame?: RectanguloFotograma;
}

const documentoMapping: Record<string, {display: string;field: string;}> = {
  profilePhoto: { display: 'Foto del rostro (selfie)', field: 'profilePhoto' },
  ciFront: { display: 'CI — parte frontal', field: 'ciFront' },
  ciBack: { display: 'CI — parte posterior', field: 'ciBack' },
  licenseFront: {
    display: 'Licencia de conducir — frente',
    field: 'licenseFront'
  },
  licenseBack: {
    display: 'Licencia de conducir — dorso',
    field: 'licenseBack'
  },
  antecedentsPhoto: {
    display: 'Certificado de antecedentes',
    field: 'antecedentsPhoto'
  },
  carFront: { display: 'Vehículo — vista delantera', field: 'carFront' },
  carBack: { display: 'Vehículo — vista trasera', field: 'carBack' },
  carLeft: { display: 'Vehículo — lateral izquierda', field: 'carLeft' },
  carRight: { display: 'Vehículo — lateral derecha', field: 'carRight' },
  soatPhoto: { display: 'SOAT — póliza de seguro', field: 'soatPhoto' },
  ruatPhoto: { display: 'RUAT del vehículo', field: 'ruatPhoto' },
  ticPhoto: { display: 'Tarjeta de identificación del conductor', field: 'ticPhoto' },
  domicileProof: { display: 'Comprobante de domicilio', field: 'domicileProof' }
};

function tipoDeDocumento(campo: string): DocumentoTipo {
  if (campo.startsWith('car')) return 'vehicle';
  if (campo === 'antecedentsPhoto' || campo === 'domicileProof') return 'certificate';
  if (campo === 'ruatPhoto') return 'ruat';
  if (campo === 'soatPhoto') return 'soat';
  if (campo === 'ciFront' || campo === 'ciBack') return 'ci';
  return 'card';
}

// ─── DocRow ───────────────────────────────────────────────────────────────────
function DocumentoFila({
  doc: documento,
  reverso,
  onPress: alPulsar,
  disabled: deshabilitado




}: {doc: RechazadoDocumento;reverso?: string | null;onPress: () => void;disabled: boolean;}) {
  return (
    <PulsableOpacidad
      style={dr.row}
      onPress={alPulsar}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={`${documento.photo ? 'Volver a fotografiar' : 'Fotografiar'} ${documento.displayName}`}
      activeOpacity={0.7}>

      <Vista style={[dr.indicador, documento.photo && dr.indicadorListo]}>
        {documento.photo ? <Check size={18} color={C.primary} strokeWidth={2.5} /> : <Camara size={17} color={C.primary} />}
      </Vista>
      <Vista style={{ flex: 1 }}>
        <Texto style={dr.name}>{documento.displayName}</Texto>
        <Texto style={dr.status}>
          {reverso ? 'Frente y dorso' : documento.photo ? 'Foto capturada' : 'Pendiente de captura'}
        </Texto>
      </Vista>

    </PulsableOpacidad>);

}
const dr = EstiloHoja.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border
  },
  name: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 3 },
  status: { fontSize: 13, color: C.textSub },
  indicadorListo: { backgroundColor: C.white, borderWidth: 2, borderColor: C.primary },
  indicador: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

// ─── Screen ───────────────────────────────────────────────────────────────────
function DocumentoResubmissionPantalla({
  navigation: navegacion,
  route: ruta
}: Propiedades) {
  const { token } = usarAutenticacion();

  const [estadoEnvio, establecerEstadoEnvio] = usarEstado<'pendiente' | 'enviando' | 'enviada'>('pendiente');
  const cargando = estadoEnvio === 'enviando';
  usarEfecto(() => {
    if (estadoEnvio !== 'enviada') return;
    const volverAlMapa = setTimeout(() => navegacion.popTo('Map'), 4000);
    return () => clearTimeout(volverAlMapa);
  }, [estadoEnvio, navegacion]);
  const rechazoMotivo: string = ruta.params?.rejectionReason || '';
  const [documentos, establecerDocumentos] = usarEstado<RechazadoDocumento[]>(() => {
    const rechazados: string[] = ruta.params?.rejectedDocs ?? [];
    const campos = rechazados.flatMap(campo => campo === 'licenseFront' || campo === 'licenseBack'
      ? ['licenseFront', 'licenseBack'] : [campo]);
    return [...new Set(campos)]
      .filter(campo => Object.prototype.hasOwnProperty.call(documentoMapping, campo))
      .map(campo => ({
        name: campo,
        displayName: documentoMapping[campo].display,
        fieldName: documentoMapping[campo].field,
        photo: null
      }));
  });
  const [indiceCamara, establecerIndiceCamara] = usarEstado<number | null>(documentos.length ? 0 : null);
  const domicilioGuardado = ruta.params?.domicilio;
  const [domicilio, establecerDomicilio] = usarEstado<DomicilioPunto | null>(() => {
    const { latitude, longitude } = domicilioGuardado ?? {};
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  });
  const requiereDomicilio = documentos.some(documento => documento.name === 'domicileProof');
  const documentoActivo = indiceCamara === null ? null : documentos[indiceCamara];

  const guardarCapturas = (capturas: Partial<Record<string, { photo: string; frame?: RectanguloFotograma }>>) => {
    const actualizados = documentos.map(documento => ({ ...documento, ...capturas[documento.name] }));
    establecerDocumentos(actualizados);
    const siguiente = actualizados.findIndex(documento => !documento.photo);
    establecerIndiceCamara(siguiente === -1 ? null : siguiente);
  };

  const capturarDocumento = (photo: string, frame?: RectanguloFotograma) => {
    if (indiceCamara === null) return;
    guardarCapturas({ [documentos[indiceCamara].name]: { photo, frame } });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const manejarEnviar = async () => {
    if (estadoEnvio !== 'pendiente' || !documentos.length || (requiereDomicilio && !domicilio)) return;
    const faltante = documentos.filter((d) => !d.photo);
    if (faltante.length > 0) {
      Alert.alert(
        'Fotos incompletas',
        `Faltan ${faltante.length} foto(s) por cargar.`
      );
      return;
    }
    establecerEstadoEnvio('enviando');
    try {
      const formulario = new FormData();
      if (requiereDomicilio && domicilio) {
        const direccion = domicilio.latitude === domicilioGuardado?.latitude && domicilio.longitude === domicilioGuardado?.longitude
          ? domicilioGuardado?.address
          : undefined;
        formulario.append('domicileAddress', direccion || `Ubicación marcada: ${domicilio.latitude.toFixed(6)}, ${domicilio.longitude.toFixed(6)}`);
        formulario.append('domicileLatitude', String(domicilio.latitude));
        formulario.append('domicileLongitude', String(domicilio.longitude));
      }
      documentos.forEach((documento) => {
        if (documento.photo) {
          formulario.append(documento.fieldName, {
            uri: documento.photo,
            type: 'image/jpeg',
            name: `${documento.fieldName}.jpg`
          } as any);
          if (documento.frame) {
            for (const clave of ['x', 'y', 'w', 'h', 'screenW', 'screenH'] as const) {
              formulario.append(`${documento.fieldName}Crop${clave[0].toUpperCase()}${clave.slice(1)}`, String(documento.frame[clave]));
            }
          }
        }
      });
      const respuesta = await fetch(`${API_BASE_URL}/solicitudes/reenviar`, {
        method: 'POST',
        body: formulario,
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      if (!respuesta.ok) {
        const error = await respuesta.json().catch(() => ({}));
        throw new Error(error.error || `Error ${respuesta.status}`);
      }
      establecerEstadoEnvio('enviada');
    } catch (error: any) {
      establecerEstadoEnvio('pendiente');
      Alert.alert('Error', error?.message || 'No se pudo reenviar los documentos.');
    }
  };

  if (estadoEnvio === 'enviada') return <ConfirmacionEnvioSolicitud />;

  const relleno = documentos.filter((d) => d.photo).length;
  const total = documentos.length;
  const todosRelleno = relleno === total && total > 0;
  const puedeEnviar = todosRelleno && (!requiereDomicilio || domicilio !== null);

  return (
    <SeguraZonaVista style={s.container}>
      <EstadoBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Vista style={s.header}>
        <PulsableOpacidad onPress={() => navegacion.goBack()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={s.headerTitle}>{todosRelleno ? 'Resumen del reenvío' : 'Captura de documentos'}</Texto>
        <Vista style={s.headerSpacer} />
      </Vista>

      <DesplazableVista
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, todosRelleno && s.contentResumen]}
        showsVerticalScrollIndicator={false}>

        {!todosRelleno && (
          <Texto style={s.descripcion}>
            {total ? `${relleno} de ${total} fotos capturadas` : 'No hay documentos disponibles para reenviar.'}
          </Texto>
        )}
        {documentos.map((documento, indice) => documento.name !== 'licenseBack' &&
          <DocumentoFila
            key={documento.name}
            doc={documento.name === 'licenseFront' ? { ...documento, displayName: 'Licencia de conducir' } : documento}
            reverso={documento.name === 'licenseFront' ? documentos.find(cara => cara.name === 'licenseBack')?.photo : undefined}
            onPress={() => establecerIndiceCamara(indice)}
            disabled={cargando} />
        )}

        {todosRelleno && requiereDomicilio && (
          <DomicilioEntrada point={domicilio} onPointChange={establecerDomicilio} />
        )}
        {!!rechazoMotivo && (
          <Vista style={[s.reasonBox, todosRelleno && s.reasonBoxResumen]}>
            <Vista style={[dr.indicador, dr.indicadorListo, s.reasonIcon]}>
              <Texto style={s.reasonIconText}>!</Texto>
            </Vista>
            <Vista style={s.reasonContent}>
              <Texto style={s.reasonTitle}>Motivo del rechazo</Texto>
              <Texto style={s.descripcion}>{rechazoMotivo}</Texto>
            </Vista>
          </Vista>
        )}
      </DesplazableVista>
      {todosRelleno && (
        <Vista style={s.submitWrap}>
          {!puedeEnviar && <Texto style={s.submitHint}>Marca la ubicación del domicilio para continuar.</Texto>}
          <PulsableOpacidad
            style={[s.submitBtn, !puedeEnviar && s.submitBtnOff]}
            onPress={manejarEnviar}
            disabled={!puedeEnviar || cargando}
            accessibilityRole="button">
            <Texto style={[s.submitTxt, !puedeEnviar && s.submitTxtOff]}>Reenviar</Texto>
          </PulsableOpacidad>
        </Vista>
      )}

      {documentoActivo && (
        <DocumentoCamaraModal
          key={documentoActivo.name}
          visible
          title={documentoActivo.name === 'licenseFront' ? 'Licencia de conducir' : documentoActivo.displayName}
          documentType={tipoDeDocumento(documentoActivo.name)}
          cameraPosition={documentoActivo.name === 'profilePhoto' ? 'front' : 'back'}
          frameLabel={documentoActivo.name === 'licenseFront' ? 'Coloca el frente de la licencia dentro del recuadro' : `Encuadra: ${documentoActivo.displayName}`}
          twoSided={documentoActivo.name === 'licenseFront'}
          onCaptureBoth={(frente, dorso) => guardarCapturas({
            licenseFront: { photo: frente.uri, frame: frente.frame },
            licenseBack: { photo: dorso.uri, frame: dorso.frame }
          })}
          onCapture={capturarDocumento}
          onClose={() => establecerIndiceCamara(null)} />
      )}

      <CargaEnvioSolicitud visible={cargando} />
    </SeguraZonaVista>);

}

// ─── Styles ───────────────────────────────────────────────────────────────────
export { DocumentoResubmissionPantalla as default };const s = EstiloHoja.create({
  container: { flex: 1, backgroundColor: C.bg },


  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.text },
  headerSpacer: { width: 44 },
  content: { padding: 20, gap: 10 },
  contentResumen: { flexGrow: 1, paddingBottom: 10 },
  descripcion: { fontSize: 14, lineHeight: 20, color: C.textSub },

  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 6
  },
  reasonContent: { flex: 1 },
  reasonIcon: { borderColor: C.rojoAviso },
  reasonIconText: { color: C.rojoAviso, fontSize: 19, fontWeight: '800', includeFontPadding: false },
  reasonBoxResumen: { marginTop: 'auto' },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4
  },
  submitWrap: { paddingHorizontal: 20, paddingVertical: 12 },
  submitHint: {
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 10
  },
  submitBtn: {
    backgroundColor: '#000000',
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnOff: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border
  },
  submitTxt: {
    fontSize: 19,
    fontWeight: '700',
    color: C.white,
    textAlign: 'center'
  },
  submitTxtOff: { color: C.textMuted }
});
