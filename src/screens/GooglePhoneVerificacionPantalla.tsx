// src/screens/GooglePhoneVerificacionPantalla.tsx
import React, { useState as usarEstado, useRef as usarReferencia, useEffect as usarEfecto, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  StyleSheet as EstiloHoja,
  TextInput as TextoEntrada,
  TouchableOpacity as PulsableOpacidad,
  Text as Texto,
  ScrollView as DesplazableVista,
  ActivityIndicator as ActividadIndicador,
  Alert,
  StatusBar as EstadoBar,
  Animated as Animado,
  KeyboardAvoidingView as KeyboardAvoidingVista,
  Keyboard,
  Platform as Plataforma } from
'react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';
import { ChevronLeft as ChevronIzquierda, Phone as Telefono, ShieldCheck as ShieldComprobar, RefreshCw as RenovarCw } from 'lucide-react-native';
import * as firebaseServicio from "../services/firebase.servicio";
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { usarAutenticacion } from "../hooks/usarAutenticacion";

const D = {
  brand: '#7514C5',
  white: '#FFFFFF',
  ink: '#111118',
  inkSoft: '#72727E',
  border: '#E5E5EA',
  surfaceAlt: '#F7F7F9',
  lilacSoft: '#F3EAFC'
};

// ─────────────────────────────────────────────────────────────
// PREFIJO BOLIVIA
// ─────────────────────────────────────────────────────────────
const BOLIVIA_PREFIJO = '+591';

// Formatea los ocho dígitos del número boliviano para su lectura.
const formatearTelefonoBoliviano = (bruto: string): string => {
  const digitos = bruto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 1) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 1)} ${digitos.slice(1)}`;
  return `${digitos.slice(0, 1)} ${digitos.slice(1, 4)} ${digitos.slice(4)}`;
};

const hastaError164 = (formateado: string): string => {
  const digitos = formateado.replace(/\D/g, '').slice(0, 8);
  return `${BOLIVIA_PREFIJO}${digitos}`;
};

const esValidoBoliviano = (formateado: string): boolean => {
  const digitos = formateado.replace(/\D/g, '');
  return digitos.length === 8 && /^[67]/.test(digitos);
};

// ─────────────────────────────────────────────────────────────
// OTP DOTS — 6 cuadros individuales
// ─────────────────────────────────────────────────────────────
const OtpCajas = ({
  value: valor,
  onChange: alCambio,
  disabled: deshabilitado




}: {value: string;onChange: (v: string) => void;disabled: boolean;}) => {
  const entradaReferencia = usarReferencia<TextoEntrada>(null);

  return (
    <PulsableOpacidad
      activeOpacity={1}
      onPress={() => entradaReferencia.current?.focus()}
      style={otpEstilos.wrap}>

      {Array.from({ length: 6 }).map((_, indice) => {
        const caracter = valor[indice] ?? '';
        const activo = valor.length === indice;
        return (
          <Vista
            key={indice}
            style={[
            otpEstilos.box,
            activo && otpEstilos.boxActive,
            caracter && otpEstilos.boxFilled]
            }>

            <Texto style={otpEstilos.char}>{caracter || (activo ? '|' : '')}</Texto>
          </Vista>);

      })}
      <TextoEntrada
        ref={entradaReferencia}
        value={valor}
        onChangeText={(t) => alCambio(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        editable={!deshabilitado}
        style={otpEstilos.hidden}
        caretHidden />

    </PulsableOpacidad>);

};

const otpEstilos = EstiloHoja.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    position: 'relative'
  },
  box: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    backgroundColor: D.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  boxActive: {
    borderColor: D.ink,
    borderWidth: 1.5
  },
  boxFilled: {
    borderColor: D.ink
  },
  char: {
    fontSize: 22,
    fontWeight: '700',
    color: D.ink
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0
  }
});

// ─────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────
type Propiedades = NativoPilaPantallaPropiedades<any, 'GooglePhoneVerification'>;

function GoogleTelefonoVerificacionPantalla({
  navigation: navegacion,
  route: ruta
}: Propiedades) {
  const { email: correo, firebaseUid, displayName: mostrarNombre, photoURL: fotoUrl } = ruta.params as {
    email: string;
    firebaseUid: string;
    displayName: string;
    photoURL?: string;
  };

  const { loginWithToken: ingresarConToken, showPhoneVerifiedToast: mostrarTelefonoVerificadoAviso } = usarAutenticacion();
  const margenes = usarSeguraZonaMargenes();

  const [telefonoFormateado, establecerTelefonoFormateado] = usarEstado('');
  const [cargando, establecerCargando] = usarEstado(false);
  const [cargandoAccion, establecerCargandoAccion] = usarEstado<'send' | 'verify' | 'resend' | null>(null);
  const [verificacionId, establecerVerificacionId] = usarEstado<string | null>(null);
  const [otpCodigo, establecerOtpCodigo] = usarEstado('');
  const [paso, establecerPaso] = usarEstado<'phone' | 'otp'>('phone');
  const [reenviarTemporizador, establecerReenviarTemporizador] = usarEstado(0);
  const [telefonoError, establecerTelefonoError] = usarEstado('');
  const verifyingOtpReferencia = usarReferencia(false);
  const otpCompletadoReferencia = usarReferencia(false);
  const enviandoOtpReferencia = usarReferencia(false);
  const ultimoSolicitadoTelefonoReferencia = usarReferencia<string | null>(null);

  // Animaciones
  const fadeAnimacion = usarReferencia(new Animado.Value(1)).current;

  const animarTransicion = (funcionRetorno: () => void) => {
    Animado.sequence([
    Animado.timing(fadeAnimacion, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true
    })]
    ).start(() => {
      funcionRetorno();
      Animado.timing(fadeAnimacion, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    });
  };

  // Timer reenvío
  usarEfecto(() => {
    if (reenviarTemporizador <= 0) return;
    const t = setInterval(
      () => establecerReenviarTemporizador((p) => p <= 1 ? 0 : p - 1),
      1000
    );
    return () => clearInterval(t);
  }, [reenviarTemporizador]);

  const formatearTemporizador = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Handlers ──────────────────────────────────────────────
  const manejarTelefonoCambio = (texto: string) => {
    establecerTelefonoError('');
    const digitos = texto.replace(/\D/g, '').slice(0, 8);
    establecerTelefonoFormateado(formatearTelefonoBoliviano(digitos));
  };

  const manejarEnviarOtp = async () => {
    if (enviandoOtpReferencia.current) return;
    if (!esValidoBoliviano(telefonoFormateado)) {
      establecerTelefonoError('Ingresa un número boliviano válido.');
      return;
    }
    const error164 = hastaError164(telefonoFormateado);
    enviandoOtpReferencia.current = true;
    try {
      establecerCargando(true);
      establecerCargandoAccion('send');
      const existe = await autenticacionServicio.comprobarTelefonoExistente(
        error164,
        firebaseUid,
        correo
      );
      if (existe) {
        establecerTelefonoError(
          'Este número ya está registrado. Usa otro o inicia sesión.'
        );
        return;
      }
      const forzarReenvio = ultimoSolicitadoTelefonoReferencia.current === error164;
      ultimoSolicitadoTelefonoReferencia.current = error164;
      const nuevoVId = await firebaseServicio.enviarTelefonoOTP(error164, forzarReenvio);
      establecerVerificacionId(nuevoVId);
      animarTransicion(() => {
        establecerPaso('otp');
        establecerReenviarTemporizador(300);
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar el código');
    } finally {
      enviandoOtpReferencia.current = false;
      establecerCargando(false);
      establecerCargandoAccion(null);
    }
  };

  const manejarVerificarOtp = usarFuncionRetorno(async () => {
    if (otpCodigo.length !== 6 || cargando || verifyingOtpReferencia.current || otpCompletadoReferencia.current) return;
    if (!verificacionId) {
      Alert.alert('Error', 'Solicita un nuevo código');
      return;
    }
    verifyingOtpReferencia.current = true;
    try {
      establecerCargando(true);
      establecerCargandoAccion('verify');
      await firebaseServicio.verificarTelefonoOTP(verificacionId, otpCodigo);
      const error164 = hastaError164(telefonoFormateado);
      const respuesta = await autenticacionServicio.registrar({
        email: correo,
        phone: error164,
        displayName: mostrarNombre,
        firebaseUid,
        photoURL: fotoUrl
      });
      Keyboard.dismiss();
      await ingresarConToken(respuesta.token, respuesta.user);
      mostrarTelefonoVerificadoAviso();
      otpCompletadoReferencia.current = true;
    } catch (error: any) {
      Alert.alert(
        'Código incorrecto',
        error.message || 'Verifica el código e intenta de nuevo'
      );
      establecerOtpCodigo('');
    } finally {
      verifyingOtpReferencia.current = false;
      establecerCargando(false);
      establecerCargandoAccion(null);
    }
  }, [otpCodigo, cargando, verificacionId, telefonoFormateado, correo, mostrarNombre, firebaseUid, fotoUrl, ingresarConToken, mostrarTelefonoVerificadoAviso]);

  const manejarReenviarOtp = async () => {
    if (reenviarTemporizador > 0 || enviandoOtpReferencia.current) return;
    enviandoOtpReferencia.current = true;
    try {
      establecerCargando(true);
      establecerCargandoAccion('resend');
      establecerOtpCodigo('');
      const error164 = hastaError164(telefonoFormateado);
      const nuevoVId = await firebaseServicio.enviarTelefonoOTP(error164, true);
      establecerVerificacionId(nuevoVId);
      establecerReenviarTemporizador(300);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo reenviar el código');
    } finally {
      enviandoOtpReferencia.current = false;
      establecerCargando(false);
      establecerCargandoAccion(null);
    }
  };

  // Auto-verificar cuando completen 6 dígitos
  usarEfecto(() => {
    if (otpCodigo.length === 6) manejarVerificarOtp();
  }, [otpCodigo, manejarVerificarOtp]);

  const ctaInvalido = paso === 'phone' ?
  !esValidoBoliviano(telefonoFormateado) :
  otpCodigo.length !== 6;
  const ctaCargando = cargandoAccion === (paso === 'phone' ? 'send' : 'verify');

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingVista
      style={estilos.root}
      behavior={Plataforma.OS === 'ios' ? 'padding' : undefined}>

      <EstadoBar barStyle="dark-content" backgroundColor={D.white} />

      <Vista style={[estilos.header, { paddingTop: Math.max(margenes.top, 16) + 8 }]}>
        <PulsableOpacidad
          style={estilos.backBtn}
          onPress={() =>
          paso === 'otp' ?
          animarTransicion(() => {
            establecerPaso('phone');
            establecerOtpCodigo('');
            establecerVerificacionId(null);
            establecerReenviarTemporizador(0);
          }) :
          navegacion.goBack()
          }
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Volver">

          <ChevronIzquierda color={D.ink} size={24} strokeWidth={2.2} />
        </PulsableOpacidad>
      </Vista>

      <DesplazableVista
        style={estilos.scroll}
        contentContainerStyle={estilos.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Animado.View style={{ opacity: fadeAnimacion }}>
          <Vista style={estilos.heroIcon}>
            {paso === 'phone' ? <Telefono color={D.brand} size={30} strokeWidth={2} /> : <ShieldComprobar color={D.brand} size={30} strokeWidth={2} />}
          </Vista>
          <Texto style={estilos.title}>{paso === 'phone' ? 'Tu número de celular' : 'Verifica tu número'}</Texto>
          <Texto style={estilos.subtitle}>{paso === 'phone' ?
            'Te enviaremos un código para confirmar que te pertenece.' :
            'Ingresa el código de 6 dígitos que te enviamos por SMS.'}</Texto>
          {paso === 'phone' ?
          <>
              <Vista style={estilos.fieldGroup}>
                <Vista
                style={[
                estilos.phoneRow,
                telefonoError ? estilos.inputError : null]
                }>

                  <Vista style={estilos.prefixBadge}>
                    <Texto style={estilos.flagText}>🇧🇴</Texto>
                    <Texto style={estilos.prefixText}>+591</Texto>
                  </Vista>
                  <Vista style={estilos.phoneSep} />
                  <TextoEntrada
                  style={estilos.phoneInput}
                  placeholder="Ingresa tu número"
                  placeholderTextColor={D.inkSoft}
                  keyboardType="phone-pad"
                  value={telefonoFormateado}
                  onChangeText={manejarTelefonoCambio}
                  editable={!cargando}
                  maxLength={11}
                  accessibilityLabel="Número de celular" />

                </Vista>
                {!!telefonoError && <Texto style={estilos.errorText}>{telefonoError}</Texto>}
              </Vista>
            </> :

          <>
              <Vista style={estilos.fieldGroup}>
                <Texto style={estilos.fieldLabel}>Código de verificación</Texto>
                <OtpCajas
                value={otpCodigo}
                onChange={establecerOtpCodigo}
                disabled={cargando} />

              </Vista>

              <Vista style={estilos.resendRow}>
                {reenviarTemporizador > 0 ?
              <Texto style={estilos.resendTimer}>
                    Reenviar en{' '}
                    <Texto style={estilos.resendTimerBold}>
                      {formatearTemporizador(reenviarTemporizador)}
                    </Texto>
                  </Texto> :

              <PulsableOpacidad
                onPress={manejarReenviarOtp}
                disabled={cargando}
                style={estilos.resendBtn}
                activeOpacity={0.75}>

                    {cargandoAccion === 'resend' ?
                <ActividadIndicador color={D.ink} size="small" /> :
                <><RenovarCw color={D.ink} size={16} strokeWidth={2} /><Texto style={estilos.resendBtnText}>Reenviar código</Texto></>}
                  </PulsableOpacidad>
              }
              </Vista>
              <PulsableOpacidad
              onPress={() => animarTransicion(() => {
                establecerPaso('phone');
                establecerOtpCodigo('');
                establecerVerificacionId(null);
                establecerReenviarTemporizador(0);
              })}
              style={estilos.changeBtn}
              disabled={cargando}
              accessibilityRole="button">

                <Texto style={estilos.changeBtnText}>Usar otro número</Texto>
              </PulsableOpacidad>
            </>
          }
        </Animado.View>
      </DesplazableVista>
      <Vista style={[estilos.footer, { paddingBottom: Math.max(margenes.bottom, 12) + 12 }]}>
        <PulsableOpacidad
          style={[estilos.cta, ctaInvalido && !ctaCargando && estilos.ctaDisabled]}
          onPress={paso === 'phone' ? manejarEnviarOtp : manejarVerificarOtp}
          disabled={cargando || ctaInvalido}
          accessibilityRole="button"
          activeOpacity={0.88}>

          {ctaCargando ?
          <ActividadIndicador color={D.white} size="small" /> :
          <Texto style={[estilos.ctaText, ctaInvalido && estilos.ctaTextDisabled]}>{paso === 'phone' ? 'Enviar código' : 'Verificar'}</Texto>}
        </PulsableOpacidad>
        {paso === 'phone' && <Texto style={estilos.footerNote}>Solo usaremos tu número para verificar tu cuenta.</Texto>}
      </Vista>
    </KeyboardAvoidingVista>);

}export { GoogleTelefonoVerificacionPantalla as default };

const estilos = EstiloHoja.create({
  root: { flex: 1, backgroundColor: D.white },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 44, paddingBottom: 24 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: D.lilacSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { color: D.ink, fontSize: 27, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: D.inkSoft, fontSize: 15, lineHeight: 22, marginBottom: 40 },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { color: D.ink, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: D.border,
    overflow: 'hidden'
  },
  inputError: { borderColor: '#DC2626' },
  prefixBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, minHeight: 58, backgroundColor: D.surfaceAlt },
  flagText: { fontSize: 18 },
  prefixText: { fontSize: 17, fontWeight: '700', color: D.ink },
  phoneSep: { width: 1, height: 28, backgroundColor: D.border },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 20,
    fontWeight: '600',
    color: D.ink,
    letterSpacing: 0.5
  },
  errorText: { fontSize: 13, color: '#DC2626', marginTop: 10, lineHeight: 18 },
  changeBtn: { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  changeBtnText: { fontSize: 14, fontWeight: '700', color: D.ink },
  resendRow: { alignItems: 'center', marginTop: 8 },
  resendTimer: { fontSize: 14, color: D.inkSoft },
  resendTimerBold: { fontWeight: '700', color: D.ink },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  resendBtnText: { fontSize: 14, fontWeight: '700', color: D.ink },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: D.white },
  cta: {
    backgroundColor: D.ink,
    borderRadius: 12,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ctaDisabled: { backgroundColor: D.white, borderWidth: 1, borderColor: D.border },
  ctaText: { color: D.white, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  ctaTextDisabled: { color: D.inkSoft },
  footerNote: { color: D.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 12 }
});
