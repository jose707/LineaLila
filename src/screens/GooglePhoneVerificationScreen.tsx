// src/screens/GooglePhoneVerificationScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Phone, ShieldCheck, RefreshCw } from 'lucide-react-native';
import * as firebaseService from '../services/firebase.service';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';

const D = {
  brand: '#7514C5',
  white: '#FFFFFF',
  ink: '#111118',
  inkSoft: '#72727E',
  border: '#E5E5EA',
  surfaceAlt: '#F7F7F9',
  lilacSoft: '#F3EAFC',
};

// ─────────────────────────────────────────────────────────────
// PREFIJO BOLIVIA
// ─────────────────────────────────────────────────────────────
const BOLIVIA_PREFIX = '+591';

// Formatea los ocho dígitos del número boliviano para su lectura.
const formatBolivianPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 1) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
  return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
};

const toE164 = (formatted: string): string => {
  const digits = formatted.replace(/\D/g, '').slice(0, 8);
  return `${BOLIVIA_PREFIX}${digits}`;
};

const isValidBolivian = (formatted: string): boolean => {
  const digits = formatted.replace(/\D/g, '');
  return digits.length === 8 && /^[67]/.test(digits);
};

// ─────────────────────────────────────────────────────────────
// OTP DOTS — 6 cuadros individuales
// ─────────────────────────────────────────────────────────────
const OtpBoxes = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) => {
  const inputRef = useRef<TextInput>(null);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={otpStyles.wrap}
    >
      {Array.from({ length: 6 }).map((_, i) => {
        const char = value[i] ?? '';
        const active = value.length === i;
        return (
          <View
            key={i}
            style={[
              otpStyles.box,
              active && otpStyles.boxActive,
              char && otpStyles.boxFilled,
            ]}
          >
            <Text style={otpStyles.char}>{char || (active ? '|' : '')}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        editable={!disabled}
        style={otpStyles.hidden}
        caretHidden
      />
    </TouchableOpacity>
  );
};

const otpStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    position: 'relative',
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
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: D.ink,
    borderWidth: 1.5,
  },
  boxFilled: {
    borderColor: D.ink,
  },
  char: {
    fontSize: 22,
    fontWeight: '700',
    color: D.ink,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
});

// ─────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<any, 'GooglePhoneVerification'>;

export default function GooglePhoneVerificationScreen({
  navigation,
  route,
}: Props) {
  const { email, firebaseUid, displayName, photoURL } = route.params as {
    email: string;
    firebaseUid: string;
    displayName: string;
    photoURL?: string;
  };

  const { loginWithToken, showPhoneVerifiedToast } = useAuth();
  const insets = useSafeAreaInsets();

  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'send' | 'verify' | 'resend' | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const verifyingOtpRef = useRef(false);
  const otpCompletedRef = useRef(false);
  const sendingOtpRef = useRef(false);
  const lastRequestedPhoneRef = useRef<string | null>(null);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      cb();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // Timer reenvío
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(
      () => setResendTimer(p => (p <= 1 ? 0 : p - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendTimer]);

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Handlers ──────────────────────────────────────────────
  const handlePhoneChange = (text: string) => {
    setPhoneError('');
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setPhoneFormatted(formatBolivianPhone(digits));
  };

  const handleSendOTP = async () => {
    if (sendingOtpRef.current) return;
    if (!isValidBolivian(phoneFormatted)) {
      setPhoneError('Ingresa un número boliviano válido.');
      return;
    }
    const e164 = toE164(phoneFormatted);
    sendingOtpRef.current = true;
    try {
      setLoading(true);
      setLoadingAction('send');
      const exists = await authService.checkPhoneExists(
        e164,
        firebaseUid,
        email,
      );
      if (exists) {
        setPhoneError(
          'Este número ya está registrado. Usa otro o inicia sesión.',
        );
        return;
      }
      const forceResend = lastRequestedPhoneRef.current === e164;
      lastRequestedPhoneRef.current = e164;
      const newVId = await firebaseService.sendPhoneOTP(e164, forceResend);
      setVerificationId(newVId);
      animateTransition(() => {
        setStep('otp');
        setResendTimer(300);
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el código');
    } finally {
      sendingOtpRef.current = false;
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleVerifyOTP = useCallback(async () => {
    if (otpCode.length !== 6 || loading || verifyingOtpRef.current || otpCompletedRef.current) return;
    if (!verificationId) {
      Alert.alert('Error', 'Solicita un nuevo código');
      return;
    }
    verifyingOtpRef.current = true;
    try {
      setLoading(true);
      setLoadingAction('verify');
      await firebaseService.verifyPhoneOTP(verificationId, otpCode);
      const e164 = toE164(phoneFormatted);
      const response = await authService.register({
        email,
        phone: e164,
        displayName,
        firebaseUid,
        photoURL,
      });
      Keyboard.dismiss();
      await loginWithToken(response.token, response.user);
      showPhoneVerifiedToast();
      otpCompletedRef.current = true;
    } catch (e: any) {
      Alert.alert(
        'Código incorrecto',
        e.message || 'Verifica el código e intenta de nuevo',
      );
      setOtpCode('');
    } finally {
      verifyingOtpRef.current = false;
      setLoading(false);
      setLoadingAction(null);
    }
  }, [otpCode, loading, verificationId, phoneFormatted, email, displayName, firebaseUid, photoURL, loginWithToken, showPhoneVerifiedToast]);

  const handleResendOTP = async () => {
    if (resendTimer > 0 || sendingOtpRef.current) return;
    sendingOtpRef.current = true;
    try {
      setLoading(true);
      setLoadingAction('resend');
      setOtpCode('');
      const e164 = toE164(phoneFormatted);
      const newVId = await firebaseService.sendPhoneOTP(e164, true);
      setVerificationId(newVId);
      setResendTimer(300);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo reenviar el código');
    } finally {
      sendingOtpRef.current = false;
      setLoading(false);
      setLoadingAction(null);
    }
  };

  // Auto-verificar cuando completen 6 dígitos
  useEffect(() => {
    if (otpCode.length === 6) handleVerifyOTP();
  }, [otpCode, handleVerifyOTP]);

  const ctaInvalid = step === 'phone'
    ? !isValidBolivian(phoneFormatted)
    : otpCode.length !== 6;
  const ctaLoading = loadingAction === (step === 'phone' ? 'send' : 'verify');

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={D.white} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            step === 'otp'
              ? animateTransition(() => {
                  setStep('phone');
                  setOtpCode('');
                  setVerificationId(null);
                  setResendTimer(0);
                })
              : navigation.goBack()
          }
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft color={D.ink} size={24} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.heroIcon}>
            {step === 'phone' ? <Phone color={D.brand} size={30} strokeWidth={2} /> : <ShieldCheck color={D.brand} size={30} strokeWidth={2} />}
          </View>
          <Text style={styles.title}>{step === 'phone' ? 'Tu número de celular' : 'Verifica tu número'}</Text>
          <Text style={styles.subtitle}>{step === 'phone'
            ? 'Te enviaremos un código para confirmar que te pertenece.'
            : 'Ingresa el código de 6 dígitos que te enviamos por SMS.'}</Text>
          {step === 'phone' ? (
            <>
              <View style={styles.fieldGroup}>
                <View
                  style={[
                    styles.phoneRow,
                    phoneError ? styles.inputError : null,
                  ]}
                >
                  <View style={styles.prefixBadge}>
                    <Text style={styles.flagText}>🇧🇴</Text>
                    <Text style={styles.prefixText}>+591</Text>
                  </View>
                  <View style={styles.phoneSep} />
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Ingresa tu número"
                    placeholderTextColor={D.inkSoft}
                    keyboardType="phone-pad"
                    value={phoneFormatted}
                    onChangeText={handlePhoneChange}
                    editable={!loading}
                    maxLength={11}
                    accessibilityLabel="Número de celular"
                  />
                </View>
                {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Código de verificación</Text>
                <OtpBoxes
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={loading}
                />
              </View>

              <View style={styles.resendRow}>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimer}>
                    Reenviar en{' '}
                    <Text style={styles.resendTimerBold}>
                      {formatTimer(resendTimer)}
                    </Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={loading}
                    style={styles.resendBtn}
                    activeOpacity={0.75}
                  >
                    {loadingAction === 'resend'
                      ? <ActivityIndicator color={D.ink} size="small" />
                      : <><RefreshCw color={D.ink} size={16} strokeWidth={2} /><Text style={styles.resendBtnText}>Reenviar código</Text></>}
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => animateTransition(() => {
                  setStep('phone');
                  setOtpCode('');
                  setVerificationId(null);
                  setResendTimer(0);
                })}
                style={styles.changeBtn}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text style={styles.changeBtnText}>Usar otro número</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <TouchableOpacity
          style={[styles.cta, ctaInvalid && !ctaLoading && styles.ctaDisabled]}
          onPress={step === 'phone' ? handleSendOTP : handleVerifyOTP}
          disabled={loading || ctaInvalid}
          accessibilityRole="button"
          activeOpacity={0.88}
        >
          {ctaLoading
            ? <ActivityIndicator color={D.white} size="small" />
            : <Text style={[styles.ctaText, ctaInvalid && styles.ctaTextDisabled]}>{step === 'phone' ? 'Enviar código' : 'Verificar'}</Text>}
        </TouchableOpacity>
        {step === 'phone' && <Text style={styles.footerNote}>Solo usaremos tu número para verificar tu cuenta.</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    overflow: 'hidden',
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
    letterSpacing: 0.5,
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
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: D.white, borderWidth: 1, borderColor: D.border },
  ctaText: { color: D.white, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  ctaTextDisabled: { color: D.inkSoft },
  footerNote: { color: D.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 12 },
});
