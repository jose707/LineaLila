// src/screens/GooglePhoneVerificationScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Phone,
  ShieldCheck,
  Mail,
  User,
  RefreshCw,
} from 'lucide-react-native';
import * as firebaseService from '../services/firebase.service';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const D = {
  brand: '#7514C5',
  brandDeep: '#5C0FA3',
  brandSoft: '#9333EA',
  brandBorder: '#B06EF0',
  white: '#FFFFFF',
  textHigh: 'rgba(255,255,255,0.82)',
  textMid: 'rgba(255,255,255,0.65)',
  textLow: 'rgba(255,255,255,0.45)',
  ink: '#0F0A1E',
  inkMid: '#4B4561',
  inkSoft: '#8E88A0',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F3FF',
  border: '#EDE8FA',
  radius: 16,
};

// ─────────────────────────────────────────────────────────────
// ICONOS — wrappers delgados sobre lucide-react-native
// ─────────────────────────────────────────────────────────────
const Icons = {
  back: (color = D.brand, size = 20) => (
    <ChevronLeft color={color} size={size} strokeWidth={2.2} />
  ),
  phone: (color = D.inkSoft, size = 18) => (
    <Phone color={color} size={size} strokeWidth={2} />
  ),
  shield: (color = D.brand, size = 18) => (
    <ShieldCheck color={color} size={size} strokeWidth={2} />
  ),
  mail: (color = D.inkSoft, size = 18) => (
    <Mail color={color} size={size} strokeWidth={2} />
  ),
  user: (color = D.inkSoft, size = 18) => (
    <User color={color} size={size} strokeWidth={2} />
  ),
  refresh: (color = D.brand, size = 16) => (
    <RefreshCw color={color} size={size} strokeWidth={2} />
  ),
};

// ─────────────────────────────────────────────────────────────
// PREFIJO BOLIVIA
// ─────────────────────────────────────────────────────────────
const BOLIVIA_PREFIX = '+591';

// Formatea número boliviano: 7XXXXXXX → +591 7X XXX XXXX
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
    justifyContent: 'center',
    position: 'relative',
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: D.border,
    backgroundColor: D.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: D.brand,
    backgroundColor: D.white,
    shadowColor: D.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  boxFilled: {
    borderColor: D.brandSoft,
    backgroundColor: D.white,
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

  const { loginWithToken } = useAuth();

  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneError, setPhoneError] = useState('');

  // Animaciones
  const slideAnim = useRef(new Animated.Value(0)).current;
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
    if (!isValidBolivian(phoneFormatted)) {
      setPhoneError('Ingresa un número boliviano válido (ej: 7X XXX XXXX)');
      return;
    }
    const e164 = toE164(phoneFormatted);
    try {
      setLoading(true);
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
      const newVId = await firebaseService.sendPhoneOTP(e164);
      setVerificationId(newVId);
      animateTransition(() => {
        setStep('otp');
        setResendTimer(300);
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;
    if (!verificationId) {
      Alert.alert('Error', 'Solicita un nuevo código');
      return;
    }
    try {
      setLoading(true);
      await firebaseService.verifyPhoneOTP(verificationId, otpCode);
      const e164 = toE164(phoneFormatted);
      const response = await authService.register({
        email,
        phone: e164,
        displayName,
        firebaseUid,
        photoURL,
      });
      await loginWithToken(response.token, response.user);
    } catch (e: any) {
      Alert.alert(
        'Código incorrecto',
        e.message || 'Verifica el código e intenta de nuevo',
      );
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      setLoading(true);
      setOtpCode('');
      const e164 = toE164(phoneFormatted);
      const newVId = await firebaseService.sendPhoneOTP(e164);
      setVerificationId(newVId);
      setResendTimer(300);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo reenviar el código');
    } finally {
      setLoading(false);
    }
  };

  // Auto-verificar cuando completen 6 dígitos
  useEffect(() => {
    if (otpCode.length === 6 && !loading) handleVerifyOTP();
  }, [otpCode]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: D.brand }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={D.brand} />

      {/* ── HEADER LILA ─────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            step === 'otp'
              ? animateTransition(() => {
                  setStep('phone');
                  setOtpCode('');
                  setVerificationId(null);
                })
              : navigation.goBack()
          }
          activeOpacity={0.75}
        >
          {Icons.back(D.white)}
        </TouchableOpacity>

        {/* Icono central */}
        <View style={styles.headerIcon}>
          {step === 'phone' ? Icons.phone(D.brand) : Icons.shield(D.brand)}
        </View>

        <Text style={styles.headerTitle}>
          {step === 'phone' ? 'Tu número de teléfono' : 'Verifica tu código'}
        </Text>
        <Text style={styles.headerSub}>
          {step === 'phone'
            ? 'Ingresa tu número boliviano para recibir el código'
            : `Código enviado a +591 ${phoneFormatted}`}
        </Text>
      </View>

      {/* ── CARD BLANCA ──────────────────────────────────── */}
      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.cardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {step === 'phone' ? (
            <>
              {/* Campo nombre (read-only) */}
              <FieldReadOnly
                icon={Icons.user()}
                label="Nombre"
                value={displayName || 'Usuario'}
              />

              {/* Campo email (read-only) */}
              <FieldReadOnly
                icon={Icons.mail()}
                label="Correo electrónico"
                value={email}
              />

              {/* Teléfono Bolivia */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Número de teléfono</Text>
                <View
                  style={[
                    styles.phoneRow,
                    phoneError ? styles.inputError : null,
                  ]}
                >
                  {/* Prefijo */}
                  <View style={styles.prefixBadge}>
                    <Text style={styles.flagText}>🇧🇴</Text>
                    <Text style={styles.prefixText}>+591</Text>
                  </View>
                  <View style={styles.phoneSep} />
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="7X XXX XXXX"
                    placeholderTextColor={D.inkSoft}
                    keyboardType="phone-pad"
                    value={phoneFormatted}
                    onChangeText={handlePhoneChange}
                    editable={!loading}
                    maxLength={11}
                  />
                  {Icons.phone(phoneError ? '#EF4444' : D.inkSoft)}
                </View>
                {phoneError ? (
                  <Text style={styles.errorText}>{phoneError}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    Celulares Tigo, Viva o Entel (7X o 6X)
                  </Text>
                )}
              </View>

              {/* Botón enviar */}
              <TouchableOpacity
                style={[
                  styles.cta,
                  (!isValidBolivian(phoneFormatted) || loading) &&
                    styles.ctaDisabled,
                ]}
                onPress={handleSendOTP}
                disabled={!isValidBolivian(phoneFormatted) || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color={D.white} size="small" />
                ) : (
                  <Text style={styles.ctaText}>Enviar código OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Número confirmado */}
              <View style={styles.phoneConfirm}>
                <View style={styles.phoneConfirmIcon}>
                  {Icons.phone(D.brand)}
                </View>
                <View>
                  <Text style={styles.phoneConfirmLabel}>Enviado a</Text>
                  <Text style={styles.phoneConfirmValue}>
                    +591 {phoneFormatted}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    animateTransition(() => {
                      setStep('phone');
                      setOtpCode('');
                      setVerificationId(null);
                    })
                  }
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Cambiar</Text>
                </TouchableOpacity>
              </View>

              {/* OTP boxes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Código de 6 dígitos</Text>
                <OtpBoxes
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={loading}
                />
                <Text style={styles.helperText}>
                  El código expira en 5 minutos
                </Text>
              </View>

              {/* Timer / reenvío */}
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
                    {Icons.refresh(D.brand)}
                    <Text style={styles.resendBtnText}>Reenviar código</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Botón verificar */}
              <TouchableOpacity
                style={[
                  styles.cta,
                  (otpCode.length !== 6 || loading) && styles.ctaDisabled,
                ]}
                onPress={handleVerifyOTP}
                disabled={otpCode.length !== 6 || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color={D.white} size="small" />
                ) : (
                  <Text style={styles.ctaText}>Verificar y continuar</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Footer */}
          <Text style={styles.footerNote}>
            Al continuar aceptas nuestros Términos de servicio y Política de
            privacidad
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// CAMPO READ-ONLY
// ─────────────────────────────────────────────────────────────
const FieldReadOnly = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.readOnly}>
      {icon}
      <Text style={styles.readOnlyText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: D.brand,
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 36,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: D.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: D.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 14,
    color: D.textMid,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Card blanca
  card: {
    flex: 1,
    backgroundColor: D.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -4,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },

  // Grupos de campo
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: D.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // Read-only
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: D.border,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 15,
    color: D.inkMid,
  },

  // Fila teléfono
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.white,
    borderRadius: D.radius,
    borderWidth: 1.5,
    borderColor: D.border,
    overflow: 'hidden',
    paddingRight: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  prefixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: D.surfaceAlt,
  },
  flagText: {
    fontSize: 18,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: D.brand,
  },
  phoneSep: {
    width: 1,
    height: 24,
    backgroundColor: D.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '600',
    color: D.ink,
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 12,
    color: D.inkSoft,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },

  // Número confirmado
  phoneConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: D.surfaceAlt,
    borderRadius: D.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: D.border,
  },
  phoneConfirmIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: D.border,
  },
  phoneConfirmLabel: {
    fontSize: 11,
    color: D.inkSoft,
    fontWeight: '500',
  },
  phoneConfirmValue: {
    fontSize: 15,
    fontWeight: '700',
    color: D.ink,
    letterSpacing: 0.5,
  },
  changeBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: D.white,
    borderWidth: 1,
    borderColor: D.border,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: D.brand,
  },

  // Reenvío
  resendRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendTimer: {
    fontSize: 13,
    color: D.inkSoft,
  },
  resendTimerBold: {
    fontWeight: '700',
    color: D.inkMid,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: D.surfaceAlt,
    borderWidth: 1,
    borderColor: D.border,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: D.brand,
  },

  // CTA
  cta: {
    backgroundColor: D.brand,
    borderRadius: D.radius,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: D.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 20,
  },
  ctaDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: D.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footerNote: {
    fontSize: 11,
    color: D.inkSoft,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
