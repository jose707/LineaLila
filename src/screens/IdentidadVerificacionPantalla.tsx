import { consultarConSesion } from '../services/api.cliente';
import React, { useCallback as usarFuncionRetorno, useEffect as usarEfecto, useState as usarEstado, useRef as usarReferencia } from 'react';
import { ActivityIndicator as ActividadIndicador, NativeModules as NativoModules, ScrollView as DesplazableVista, SafeAreaView as SeguraZonaVista, StatusBar as EstadoBar, StyleSheet as EstiloHoja, Text as Texto, TouchableOpacity as PulsableOpacidad, View as Vista } from 'react-native';
import { Camera as Camara, ShieldCheck as ShieldComprobar, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import type { RectanguloRecorteOcr } from "../services/ocr.servicio";
import api from "../services/api.cliente";
import { API_BASE_URL, ROSTRO_VITALIDAD_HABILITADO as FACE_LIVENESS_HABILITADO } from "../config/constantes";

import { DocumentoCamaraModal, type RectanguloFotograma } from "../components/DocumentoCamaraModal";
import ConfirmarInferiorHoja from "../components/ConfirmarInferiorSheet";
import Toast from "../components/Aviso";
import { ExtraidoCamposModal, type FilaCampoExtraido as ExtraidoCampoFila } from "../components/ExtraidoCamposModal";

type ConsentimientoDocumento = {version: string;texto: string;};
type Lado = 'ciFront' | 'ciBack';
type MrzComparacion = 'match' | 'mismatch' | 'invalid' | 'unsupported' | 'unavailable' | 'incomplete' | 'not_applicable';
const MRZ_OBSERVACIONES: Partial<Record<MrzComparacion, string>> = {
  mismatch: 'Los datos de la zona MRZ no coinciden completamente con el frente del CI.',
  invalid: 'La zona MRZ tiene dígitos de control incorrectos.',
  unsupported: 'El formato de la zona MRZ no permitió compararla con el frente del CI.',
  unavailable: 'No se pudo leer la zona MRZ del reverso.',
  incomplete: 'No se pudo completar la comparación de la zona MRZ con el frente del CI.'
};
type ComprobadoCi = {ocrTicket: string;fields: Record<string, string>;};
type ExtraidoCiResultado = {fields: ExtraidoCampoFila[];failed?: boolean;notice?: string;canRepeat?: boolean;};
type Observacion = {title: string;message: string;rescan?: boolean;};
type CiCapturar = {front: string;back: string;crops: Record<Lado, RectanguloRecorteOcr | null>;};
const MAXIMO_CI_INTENTOS = 3;
const ESPERA_IDENTIDAD_MS = 2 * 60 * 60 * 1000;
const CI_CAMPO_ETIQUETAS: Record<string, string> = {
  firstNames: 'Nombres',
  paternalSurname: 'Apellido paterno',
  maternalSurname: 'Apellido materno',
  fullName: 'Nombre completo',
  ciNumber: 'Nº de CI',
  birthDate: 'Fecha de nacimiento',
  issueDate: 'Fecha de emisión',
  expiryDate: 'Fecha de expiración',
  birthPlace: 'Lugar de nacimiento',
  address: 'Domicilio',
  occupation: 'Profesión',
  maritalStatus: 'Estado civil',
  nationality: 'Nacionalidad'
};
const ciLeerFalloMensaje = (restante: number) =>
`No se pudo verificar tu cédula de identidad. Toma las fotos en un lugar con buena luz y encuadra el documento correctamente. Te quedan ${restante} ${restante === 1 ? 'intento' : 'intentos'}.`;

function IdentidadVerificacionPantalla() {
  const { user: usuario, token, updateUser: actualizarUsuario } = usarAutenticacion();
  const navegacion = useNavigation<any>();
  const ruta = useRoute();
  const [reintentarEn, establecerReintentarEn] = usarEstado<string | null>(null);
  const margenes = usarSeguraZonaMargenes();
  const [lado, establecerLado] = usarEstado<Lado | null>(null);
  const [fotos, establecerFotos] = usarEstado<Record<Lado, string | null>>({ ciFront: null, ciBack: null });
  const [fotoRecortes, establecerFotoRecortes] = usarEstado<Record<Lado, RectanguloRecorteOcr | null>>({ ciFront: null, ciBack: null });
  const [autorretratoVisible, establecerAutorretratoVisible] = usarEstado(false);
  const [autorretratoFoto, establecerAutorretratoFoto] = usarEstado<string | null>(null);
  const [guardando, establecerGuardando] = usarEstado(false);
  const [consentimientoDocumento, establecerConsentimientoDocumento] = usarEstado<ConsentimientoDocumento | null>(null);
  const [consentimientoError, establecerConsentimientoError] = usarEstado(false);
  const [consentimientoRecarga, establecerConsentimientoRecarga] = usarEstado(0);
  const [consentimiento, establecerConsentimiento] = usarEstado(false);
  const [consentimientoAvisoVisible, establecerConsentimientoAvisoVisible] = usarEstado(false);
  const [limiteAvisoVisible, establecerLimiteAvisoVisible] = usarEstado(false);
  const [tieneScannedCi, establecerTieneScannedCi] = usarEstado(false);
  const [comprobadoCi, establecerComprobadoCi] = usarEstado<ComprobadoCi | null>(null);
  const [extraidoCiCampos, establecerExtraidoCiCampos] = usarEstado<ExtraidoCiResultado | null>(null);
  const [observacion, establecerObservacion] = usarEstado<Observacion | null>(null);
  const [intentos, establecerIntentos] = usarEstado(0);
  const [intentosCargado, establecerIntentosCargado] = usarEstado(false);
  const intentosReferencia = usarReferencia(0);
  const rescanTemporizador = usarReferencia<ReturnType<typeof setTimeout> | null>(null);
  const enviando = usarReferencia(false);
  const claveIntentos = usuario?.id ? 'intentos-identidad:' + usuario.id : null;

  usarEfecto(() => {
    let activo = true;
    establecerConsentimiento(false);
    establecerConsentimientoDocumento(null);
    establecerConsentimientoError(false);
    api.obtener('/autenticacion/verificar-identidad/consentimiento').then((datos: any) => {
      if (!activo) return;
      if (typeof datos?.version !== 'string' || !datos.version || typeof datos.texto !== 'string' || !datos.texto.trim()) throw new Error('Consentimiento no disponible');
      establecerConsentimientoDocumento({version: datos.version, texto: datos.texto});
    }).catch(() => {if (activo) establecerConsentimientoError(true);});
    return () => {activo = false;};
  }, [token, consentimientoRecarga]);

  usarEfecto(() => () => {
    if (rescanTemporizador.current) clearTimeout(rescanTemporizador.current);
  }, []);
  const aplicarIntentos = usarFuncionRetorno((cantidad: number, hasta: string | null) => {
    intentosReferencia.current = cantidad;
    establecerIntentos(cantidad);
    establecerReintentarEn(hasta);
    establecerLimiteAvisoVisible(cantidad >= MAXIMO_CI_INTENTOS);
  }, []);

  usarEfecto(() => {
    let vigente = true;
    establecerIntentosCargado(false);
    aplicarIntentos(0, null);
    if (!claveIntentos) return;
    AsyncStorage.getItem(claveIntentos).then(async valor => {
      const datos = valor ? JSON.parse(valor) : {};
      const hasta = typeof datos.reintentarEn === "string" && Number.isFinite(Date.parse(datos.reintentarEn))
        ? datos.reintentarEn : null;
      const vencido = hasta !== null && Date.parse(hasta) <= Date.now();
      const cantidad = !vencido && Number.isInteger(datos.fallidos)
        ? Math.min(MAXIMO_CI_INTENTOS, Math.max(0, datos.fallidos)) : 0;
      if (vencido) await AsyncStorage.removeItem(claveIntentos);
      if (!vigente) return;
      aplicarIntentos(cantidad, vencido ? null : hasta);
      establecerIntentosCargado(true);
    }).catch(() => {
      if (vigente) establecerObservacion({ title: "No se pudo cargar la verificación", message: "Vuelve a abrir esta pantalla para reintentar." });
    });
    return () => { vigente = false; };
  }, [claveIntentos, aplicarIntentos]);

  usarEfecto(() => {
    if (!reintentarEn || !claveIntentos) return;
    let vigente = true;
    const espera = setTimeout(() => {
      AsyncStorage.removeItem(claveIntentos).then(() => {
        if (vigente) aplicarIntentos(0, null);
      }).catch(() => {
        if (vigente) establecerObservacion({ title: "No se pudo actualizar la verificación", message: "Vuelve a abrir esta pantalla para reintentar." });
      });
    }, Math.max(0, Date.parse(reintentarEn) - Date.now()));
    return () => { vigente = false; clearTimeout(espera); };
  }, [reintentarEn, claveIntentos, aplicarIntentos]);

  const registrarFalloIdentidad = async () => {
    if (!claveIntentos) return;
    const cantidad = Math.min(MAXIMO_CI_INTENTOS, intentosReferencia.current + 1);
    const hasta = cantidad >= MAXIMO_CI_INTENTOS ? new Date(Date.now() + ESPERA_IDENTIDAD_MS).toISOString() : null;
    await AsyncStorage.setItem(claveIntentos, JSON.stringify({ fallidos: cantidad, reintentarEn: hasta }));
    aplicarIntentos(cantidad, hasta);
  };

  const scan = (siguiente: Lado) => {
    if (guardando || !intentosCargado) return;
    if (intentosReferencia.current >= MAXIMO_CI_INTENTOS) {
      establecerLimiteAvisoVisible(true);
      return;
    }
    if (!consentimiento || !consentimientoDocumento) {
      establecerConsentimientoAvisoVisible(true);
      return;
    }
    establecerLado(siguiente);
  };

  const aplicarCapturar = (uri: string, recorte?: RectanguloRecorteOcr) => {
    const real = lado;
    establecerLado(null);
    if (!real) return;
    establecerComprobadoCi(null);
    establecerObservacion(null);
    const siguienteFotos = { ...fotos, [real]: uri };
    const siguienteRecortes = { ...fotoRecortes, [real]: recorte || null };
    establecerFotos(siguienteFotos);
    establecerFotoRecortes(siguienteRecortes);
    if (siguienteFotos.ciFront && siguienteFotos.ciBack) {
      establecerTieneScannedCi(true);
      verificarCi({ front: siguienteFotos.ciFront, back: siguienteFotos.ciBack, crops: siguienteRecortes });
    }
  };

  const aplicarAmbosCaptures = (
  frontal: {uri: string;frame?: RectanguloFotograma;},
  reverso: {uri: string;frame?: RectanguloFotograma;}) =>
  {
    establecerLado(null);
    establecerComprobadoCi(null);
    establecerObservacion(null);
    const recortes = {
      ciFront: frontal.frame as unknown as RectanguloRecorteOcr || null,
      ciBack: reverso.frame as unknown as RectanguloRecorteOcr || null
    };
    establecerFotos((anterior) => ({ ...anterior, ciFront: frontal.uri, ciBack: reverso.uri }));
    establecerFotoRecortes(recortes);
    establecerTieneScannedCi(true);
    verificarCi({ front: frontal.uri, back: reverso.uri, crops: recortes });
  };

  const aplicarAutorretratoCapturar = (uri: string) => {
    establecerAutorretratoVisible(false);
    establecerAutorretratoFoto(uri);
  };

  const appendCiHastaFormulario = (formulario: FormData, capturar: CiCapturar) => {
    for (const imagenLado of ['ciFront', 'ciBack'] as const) {
      formulario.append(`${imagenLado}Origen`, 'captura_camara');
      const recorte = capturar.crops[imagenLado];
      if (!recorte) continue;
      formulario.append(`${imagenLado}CropX`, String(recorte.x));
      formulario.append(`${imagenLado}CropY`, String(recorte.y));
      formulario.append(`${imagenLado}CropW`, String(recorte.w));
      formulario.append(`${imagenLado}CropH`, String(recorte.h));
      formulario.append(`${imagenLado}CropScreenW`, String(recorte.screenW));
      formulario.append(`${imagenLado}CropScreenH`, String(recorte.screenH));
    }
    formulario.append('ciFront', { uri: capturar.front, type: 'image/jpeg', name: 'ci-front.jpg' } as any);
    formulario.append('ciBack', { uri: capturar.back, type: 'image/jpeg', name: 'ci-back.jpg' } as any);
  };

  const limpiarCapturar = () => {
    establecerFotos({ ciFront: null, ciBack: null });
    establecerFotoRecortes({ ciFront: null, ciBack: null });
    establecerComprobadoCi(null);
  };

  const completarVerificacion = async (comprobante: string | null, capturar: CiCapturar) => {
    try {
      const formulario = new FormData();
      if (!consentimiento || !consentimientoDocumento) throw new Error('Lee y acepta la autorización antes de continuar.');
      formulario.append('consent', 'true');
      formulario.append('consentVersion', consentimientoDocumento.version);
      if (FACE_LIVENESS_HABILITADO) {
        formulario.append('ocrTicket', comprobante!);
        const detector = NativoModules.FaceLivenessModule;
        if (!detector?.startFaceLivenessDetection) throw new Error('La prueba de vida nativa no está disponible en esta versión de la app.');
        const liveness: any = await api.post('/autenticacion/prueba-vida/sesion');
        await detector.startFaceLivenessDetection(liveness.sessionId, liveness.region, liveness.credentials);
        formulario.append('livenessSessionId', liveness.sessionId);
        formulario.append('livenessTicket', liveness.ticket);
      } else {
        formulario.append('selfie', { uri: autorretratoFoto!, type: 'image/jpeg', name: 'identity-selfie.jpg' } as any);
      }
      appendCiHastaFormulario(formulario, capturar);
      const respuesta = await consultarConSesion(`${API_BASE_URL}/autenticacion/verificar-identidad`, {
        method: 'POST', body: formulario,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const datos: any = await respuesta.json();
      if (!respuesta.ok) {
        throw Object.assign(new Error(datos.error || 'No se pudo completar la verificación.'), { data: datos, status: respuesta.status });
      }
      // Un 200 de este endpoint se envía solo después de aprobar y guardar
      // CI, prueba de vida y comparación facial en el servidor.
      if (claveIntentos) await AsyncStorage.removeItem(claveIntentos).catch(() => {});
      aplicarIntentos(0, null);
      actualizarUsuario({ ...datos.user, estadoVerificacionIdentidad: 'verificado', documentosIdentidadEnviados: true, motivoRechazoIdentidad: null });
      if (ruta.name === 'IdentityVerification') navegacion.goBack();
      limpiarCapturar();
      establecerObservacion(null);
      establecerAutorretratoFoto(null);
    } catch (error: any) {
      if (error?.status === 422 || error?.status === 409 && error?.data?.error === 'La cédula ya está registrada.') {
        await registrarFalloIdentidad();
      }
      if (error?.code === 'E_LIVENESS_CANCELLED' || /UserCancelledException|CancelledException/i.test(String(error?.message || ''))) {
        establecerObservacion(null);
        return;
      }
      if (error?.status === 409 && String(error?.data?.error || '').includes('ya está verificada')) {
        const actual = await api.obtener<{ user: import('../types/modelos').Usuario }>('/autenticacion/sesion');
        actualizarUsuario(actual.user);
        if (ruta.name === 'IdentityVerification') navegacion.goBack();
        return;
      }
      if (error?.data?.code === 'CONSENT_VERSION_MISMATCH') {
        limpiarCapturar();
        establecerConsentimiento(false);
        establecerConsentimientoRecarga(valor => valor + 1);
      }
      const comprobanteVencido = String(error?.data?.error || error?.message || '').includes('lectura del CI expiró');
      if (comprobanteVencido) limpiarCapturar();
      const pruebaVidaFallida = error?.data?.code === 'LIVENESS_NOT_CONFIRMED' ||
        String(error?.data?.error || error?.message || '').includes('No se pudo confirmar la prueba de vida');
      const comparacionFallida = error?.data?.code === 'FACE_MATCH_NOT_CONFIRMED' ||
        String(error?.data?.error || error?.message || '').includes('no coincide suficientemente');
      establecerObservacion({
        title: pruebaVidaFallida ? 'No pudimos confirmar la prueba de vida' :
          comparacionFallida ? 'No pudimos confirmar tu rostro' :
            error?.data?.code === 'UNDERAGE' ? 'Menor de edad' : error?.status === 422 ? 'Observación del CI' : 'No pudimos verificar tu identidad',
        message: pruebaVidaFallida ?
          'Repite la prueba en un lugar bien iluminado, con el rostro despejado y siguiendo las indicaciones de la cámara.' :
          error?.data?.error || error?.message || 'No se pudo completar la verificación.',
        rescan: comprobanteVencido && (intentosReferencia.current < MAXIMO_CI_INTENTOS)
      });
    }
  };

  const verificarCi = async (capturar: CiCapturar) => {
    if (enviando.current || !consentimiento || !consentimientoDocumento || !intentosCargado || intentosReferencia.current >= MAXIMO_CI_INTENTOS) return;
    enviando.current = true;
    establecerGuardando(true);
    establecerObservacion(null);
    try {
      if (!FACE_LIVENESS_HABILITADO) {
        if (!autorretratoFoto) return;
        await completarVerificacion(null, capturar);
        return;
      }
      const formulario = new FormData();
      if (!consentimiento || !consentimientoDocumento) throw new Error('Lee y acepta la autorización antes de continuar.');
      formulario.append('consent', 'true');
      formulario.append('consentVersion', consentimientoDocumento.version);
      appendCiHastaFormulario(formulario, capturar);
      const respuesta = await consultarConSesion(`${API_BASE_URL}/autenticacion/verificar-identidad/ocr`, {
        method: 'POST', body: formulario,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const comprobado: any = await respuesta.json();
      if (respuesta.status === 409 && String(comprobado.error || '').includes('ya está verificada')) {
        const actual = await api.obtener<{ user: import('../types/modelos').Usuario }>('/autenticacion/sesion');
        actualizarUsuario(actual.user);
        if (ruta.name === 'IdentityVerification') navegacion.goBack();
        return;
      }
      const mrzObservacion = respuesta.ok ? MRZ_OBSERVACIONES[comprobado.mrzComparison as MrzComparacion] : null;
      if (respuesta.status === 422 || mrzObservacion) {
        await registrarFalloIdentidad();
        const cantidad = intentosReferencia.current;
        limpiarCapturar();
        const restante = MAXIMO_CI_INTENTOS - cantidad;
        const underage = comprobado.code === 'UNDERAGE';
        const vistaPreviaFilas: ExtraidoCampoFila[] = (['ciFront', 'ciBack'] as const).flatMap((side) =>
        Object.entries(comprobado.ocrPreview?.[side]?.fields || {}).
        filter(([, valor]) => String(valor || '').trim()).
        map(([clave, valor]) => ({
          label: `${CI_CAMPO_ETIQUETAS[clave] || clave} (${side === 'ciFront' ? 'frente' : 'reverso'})`,
          value: String(valor)
        }))
        );
        if (restante <= 0) establecerLimiteAvisoVisible(true);
        const motivo = comprobado.error || mrzObservacion || 'No se pudieron verificar los datos de la cédula.';
        establecerExtraidoCiCampos({
          fields: vistaPreviaFilas,
          failed: true,
          notice: underage ? motivo : `${motivo}\n\n${ciLeerFalloMensaje(restante)}`,
          canRepeat: !underage && (restante > 0)
        });
        return;
      }
      if (!respuesta.ok) {
        if (respuesta.status === 409 && comprobado.error === 'La cédula ya está registrada.') await registrarFalloIdentidad();
        if (comprobado.code === 'CONSENT_VERSION_MISMATCH') {
          limpiarCapturar();
          establecerConsentimiento(false);
          establecerConsentimientoRecarga(valor => valor + 1);
        }
        establecerObservacion({ title: 'No pudimos verificar tu identidad', message: comprobado.error || 'Intenta nuevamente.' });
        return;
      }
      if (!comprobado.ocrTicket) throw new Error('No se recibió la confirmación de lectura del CI. Intenta nuevamente.');
      const campos = comprobado.fields || {};
      establecerComprobadoCi({ ocrTicket: comprobado.ocrTicket, fields: campos });
      const filasValidadas: ExtraidoCampoFila[] = Object.entries(campos).
      filter(([, valor]) => String(valor || '').trim()).
      map(([clave, valor]) => ({
        label: CI_CAMPO_ETIQUETAS[clave] || clave,
        value: String(valor)
      }));
      const filasVistaPrevia: ExtraidoCampoFila[] = (['ciFront', 'ciBack'] as const).flatMap((imagenLado) =>
      Object.entries(comprobado.ocrPreview?.[imagenLado]?.fields || {}).
      filter(([, valor]) => String(valor || '').trim()).
      map(([clave, valor]) => ({
        label: `${CI_CAMPO_ETIQUETAS[clave] || clave} (${imagenLado === 'ciFront' ? 'frente' : 'reverso'})`,
        value: String(valor)
      }))
      );
      establecerExtraidoCiCampos({ fields: filasValidadas.length ? filasValidadas : filasVistaPrevia });
    } catch (error: any) {
      establecerObservacion({ title: 'No pudimos verificar tu identidad', message: error?.message || 'Revisa tu conexión e intenta nuevamente.' });
    } finally {
      establecerGuardando(false);
      enviando.current = false;
    }
  };

  const reintentarVerificacion = async () => {
    if (!intentosCargado || intentosReferencia.current >= MAXIMO_CI_INTENTOS || enviando.current || !fotos.ciFront || !fotos.ciBack || !consentimiento) return;
    const capturar = { front: fotos.ciFront, back: fotos.ciBack, crops: fotoRecortes };
    if (!FACE_LIVENESS_HABILITADO || !comprobadoCi) {
      await verificarCi(capturar);
      return;
    }
    enviando.current = true;
    establecerGuardando(true);
    establecerObservacion(null);
    try {await completarVerificacion(comprobadoCi.ocrTicket, capturar);} finally
    {establecerGuardando(false);enviando.current = false;}
  };

  const continuarDespuesCiLeer = () => {
    if (extraidoCiCampos?.failed) {
      establecerExtraidoCiCampos(null);
      return;
    }
    establecerExtraidoCiCampos(null);
    void reintentarVerificacion();
  };

  const repetirCiDespuesLeer = () => {
    const puedeReintentar = intentosReferencia.current < MAXIMO_CI_INTENTOS;
    establecerExtraidoCiCampos(null);
    if (puedeReintentar) {
      limpiarCapturar();
      establecerTieneScannedCi(false);
      establecerLado('ciFront');
    }
  };

  const cerrarObservacion = () => {
    const rescan = observacion?.rescan && (intentosReferencia.current < MAXIMO_CI_INTENTOS);
    establecerObservacion(null);
    if (intentosReferencia.current >= MAXIMO_CI_INTENTOS) establecerLimiteAvisoVisible(true);
    if (rescan) {
      if (rescanTemporizador.current) clearTimeout(rescanTemporizador.current);
      rescanTemporizador.current = setTimeout(() => {establecerLado('ciFront');rescanTemporizador.current = null;}, 400);
    }
  };

  const listo = !!fotos.ciFront && !!fotos.ciBack;
  return (
    <SeguraZonaVista style={s.safe}>
      <EstadoBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Vista style={[s.topBar, { paddingTop: margenes.top + 12 }]}>
        <PulsableOpacidad style={s.closeButton} onPress={() => navegacion.goBack()} disabled={guardando}
          activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cerrar verificación de identidad"
          accessibilityState={{ disabled: guardando }}>
          <X size={24} color="#111118" strokeWidth={2.8} />
        </PulsableOpacidad>
      </Vista>
      <DesplazableVista style={s.mainScroll} contentContainerStyle={s.content}>
        <Vista style={s.icon}><ShieldComprobar size={32} color="#7514C5" /></Vista>
        <Texto style={s.title}>Verifica tu identidad</Texto>
        <Texto style={s.slogan}>Escanea tu CI y completa la prueba de vida</Texto>
        {reintentarEn && <Texto style={s.cardSub}>Agotaste tus tres intentos. Podrás volver a intentarlo el {new Date(reintentarEn).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}.</Texto>}
        {usuario?.estadoVerificacionIdentidad === 'rechazado' && <Texto style={s.cardSub}>{usuario.motivoRechazoIdentidad || 'La verificación anterior fue rechazada. Captura nuevamente ambas caras del CI.'}</Texto>}
        {listo && !FACE_LIVENESS_HABILITADO && <Vista style={s.card}>
          <Camara size={24} color="#7514C5" />
          <Vista style={s.selfieContent}>
            <Texto style={s.cardTitle}>Selfie</Texto>
            <Texto style={s.cardSub}>{autorretratoFoto ? 'Selfie capturada' : 'Toma una foto normal de tu rostro'}</Texto>
          </Vista>
          <PulsableOpacidad style={s.selfieButton} disabled={guardando} onPress={() => establecerAutorretratoVisible(true)}>
            <Texto style={s.selfieButtonText}>{autorretratoFoto ? 'Repetir' : 'Tomar'}</Texto>
          </PulsableOpacidad>
        </Vista>}
        {guardando && <ActividadIndicador
          style={s.ocrSpinner}
          size="large"
          color="#7514C5"
          accessibilityLabel="Verificación en curso" />
        }
        {listo && !guardando && FACE_LIVENESS_HABILITADO && !comprobadoCi && <PulsableOpacidad style={s.complete} onPress={() => {reintentarVerificacion();}} disabled={!consentimiento}><Texto style={s.primaryText}>Reintentar lectura</Texto></PulsableOpacidad>}
        {listo && !FACE_LIVENESS_HABILITADO && !!autorretratoFoto && <PulsableOpacidad style={s.complete} onPress={() => {reintentarVerificacion();}} disabled={guardando || !consentimiento}><Texto style={s.primaryText}>Confirmar y verificar identidad</Texto></PulsableOpacidad>}
      </DesplazableVista>
      {!listo && !comprobadoCi && (intentos < MAXIMO_CI_INTENTOS) && !guardando && <Vista style={[s.footer, { paddingBottom: Math.max(margenes.bottom, 12) + 12 }]}>
        {(!tieneScannedCi || !consentimiento) && <PulsableOpacidad
          disabled={!consentimientoDocumento}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentimiento }}
          style={s.consentRow}
          onPress={() => {establecerConsentimiento((valor) => !valor);establecerConsentimientoAvisoVisible(false);establecerObservacion(null);}}>

          <Vista style={[s.consentBox, consentimiento && s.consentBoxChecked]}>
            {consentimiento && <Texto style={s.consentCheck}>✓</Texto>}
          </Vista>
          <Texto style={s.consentText}>{consentimientoDocumento?.texto || (consentimientoError ? 'No se pudo cargar la autorización.' : 'Cargando autorización…')}</Texto>
        </PulsableOpacidad>}
        {consentimientoError && <PulsableOpacidad onPress={() => establecerConsentimientoRecarga(valor => valor + 1)}><Texto style={s.consentText}>Reintentar</Texto></PulsableOpacidad>}
        <PulsableOpacidad style={[s.footerButton, !consentimiento && s.footerButtonUnauthorised]} onPress={() => scan(fotos.ciFront ? 'ciBack' : 'ciFront')} disabled={!intentosCargado || !consentimientoDocumento} accessibilityRole="button">
          <Texto style={[s.footerButtonText, !consentimiento && s.footerButtonTextUnauthorised]}>Continuar</Texto>
        </PulsableOpacidad>
      </Vista>}
      {listo && comprobadoCi && !guardando && FACE_LIVENESS_HABILITADO && intentos < MAXIMO_CI_INTENTOS && <Vista style={[s.footer, { paddingBottom: Math.max(margenes.bottom, 12) + 12 }]}>
        <PulsableOpacidad style={s.footerButton} onPress={() => {reintentarVerificacion();}} accessibilityRole="button">
          <Texto style={s.footerButtonText}>Continuar prueba de vida</Texto>
        </PulsableOpacidad>
      </Vista>}
      <DocumentoCamaraModal
        visible={lado !== null}
        documentType="ci"
        title={lado === 'ciBack' ? 'CI — parte posterior' : 'CI — parte frontal'}
        frameLabel={
        lado === 'ciBack' ?
        'Coloca la parte trasera de tu cédula dentro del recuadro' :
        'Coloca el frente de tu cédula dentro del recuadro'
        }
        twoSided={lado === 'ciFront' && !fotos.ciBack}
        initialSide={lado === 'ciBack' ? 'back' : 'front'}
        onCapture={aplicarCapturar}
        onCaptureBoth={aplicarAmbosCaptures}
        onClose={() => establecerLado(null)} />

      <DocumentoCamaraModal visible={autorretratoVisible} title="Toma una selfie" cameraPosition="front" frameLabel="Centra tu rostro y mira hacia la cámara" onCapture={aplicarAutorretratoCapturar} onClose={() => establecerAutorretratoVisible(false)} />
      <ExtraidoCamposModal
        visible={extraidoCiCampos !== null}
        title="Cédula de identidad"
        fields={extraidoCiCampos?.fields || []}
        notice={extraidoCiCampos?.notice}
        continueLabel={extraidoCiCampos?.failed ? 'Cerrar' : 'Continuar prueba de vida'}
        onContinue={continuarDespuesCiLeer}
        onRepeat={extraidoCiCampos?.failed && !extraidoCiCampos.canRepeat ? undefined : repetirCiDespuesLeer}
        onClose={() => establecerExtraidoCiCampos(null)} />

      <ConfirmarInferiorHoja
        visible={observacion !== null}
        title={observacion?.title || ''}
        message={observacion?.message || ''}
        confirmLabel="Entendido"
        cancelLabel={null}
        onConfirm={cerrarObservacion}
        onCancel={cerrarObservacion} />

      <Toast
        visible={consentimientoAvisoVisible}
        message="Autoriza la verificación de identidad para continuar"
        icon="!"
        onHide={() => establecerConsentimientoAvisoVisible(false)} />

      <Toast
        visible={limiteAvisoVisible && observacion === null}
        message="Agotaste tus tres intentos. Espera dos horas para volver a intentarlo."
        icon="!"
        duration={5000}
        onHide={() => establecerLimiteAvisoVisible(false)} />

    </SeguraZonaVista>);

}export { IdentidadVerificacionPantalla as default };

const s = EstiloHoja.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  mainScroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, alignItems: 'flex-start' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3EAFC', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 25, fontWeight: '800', color: '#111118', textAlign: 'center' },
  slogan: { marginTop: 10, color: '#7A7A8A', fontSize: 15, textAlign: 'center' },
  card: { flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 16, padding: 18, marginBottom: 16 }, cardTitle: { fontSize: 16, fontWeight: '700', color: '#111118' }, cardSub: { fontSize: 13, color: '#7A7A8A', marginTop: 3 },
  complete: { backgroundColor: '#16A34A', height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  selfieButton: { backgroundColor: '#7514C5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }, selfieButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  selfieContent: { flex: 1 },
  ocrSpinner: { marginTop: 16, alignSelf: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#FFFFFF' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingVertical: 6 },
  consentBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#9A9AA3', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentBoxChecked: { backgroundColor: '#111118', borderColor: '#111118' },
  consentCheck: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 17 },
  consentText: { flex: 1, color: '#666670', fontSize: 12, lineHeight: 17 },
  footerButton: { minHeight: 56, borderRadius: 12, backgroundColor: '#111118', alignItems: 'center', justifyContent: 'center' },
  footerButtonUnauthorised: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8D8DE' },
  footerButtonText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  footerButtonTextUnauthorised: { color: '#111118' }
});
