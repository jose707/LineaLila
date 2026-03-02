// src/screens/GooglePhoneVerificationScreen.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as firebaseService from '../services/firebase.service';
import * as storageService from '../services/storage.service';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

type GooglePhoneVerificationScreenProps = NativeStackScreenProps<
  any,
  'GooglePhoneVerification'
>;

export default function GooglePhoneVerificationScreen({
  navigation,
  route,
}: GooglePhoneVerificationScreenProps) {
  const { email, firebaseUid, displayName, photoURL } = route.params as {
    email: string;
    firebaseUid: string;
    displayName: string;
    photoURL?: string;
  };

  // Log the params received
  console.log('📱 GooglePhoneVerificationScreen - Route params:', {
    email,
    firebaseUid,
    displayName,
    photoURL: photoURL ? 'YES' : 'NO',
  });

  const { loginWithToken } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [resendTimer, setResendTimer] = useState(0);

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu número de teléfono');
      return;
    }

    // Validar formato E.164
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert(
        'Formato inválido',
        'Por favor ingresa un número con código de país (ej: +57 3001234567)',
      );
      return;
    }

    try {
      setLoading(true);
      console.log(
        `📱 Verificando si el teléfono está registrado: ${phoneNumber}`,
      );

      // ✅ NUEVA VALIDACIÓN: Verificar si el teléfono ya está registrado
      // Pasamos firebaseUid y email para que el backend pueda verificar correctamente
      const phoneExists = await authService.checkPhoneExists(
        phoneNumber,
        firebaseUid,
        email,
      );
      console.log(`📱 ¿Teléfono existe? ${phoneExists}`);

      if (phoneExists) {
        console.log('🚫 Teléfono ya registrado, bloqueando OTP');
        Alert.alert(
          'Teléfono registrado',
          'Este número de teléfono ya está registrado en el sistema. Por favor, usa otro número o inicia sesión con tu cuenta existente.',
        );
        return;
      }

      console.log(`✅ Teléfono disponible, enviando OTP a: ${phoneNumber}`);

      const verificationId = await firebaseService.sendPhoneOTP(phoneNumber);
      setVerificationId(verificationId);
      setStep('otp');
      setResendTimer(300); // 5 minutos
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar el OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    // Limpia espacios del código
    const cleanCode = otpCode.trim().replace(/\s/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa un código de 6 dígitos válido');
      return;
    }

    if (!verificationId) {
      Alert.alert('Error', 'No se encontró el ID de verificación');
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Verificando OTP...');
      console.log(`   Código limpio: ${cleanCode}`);

      // Verifica el OTP con Firebase
      const userCredential = await firebaseService.verifyPhoneOTP(
        verificationId,
        cleanCode,
      );

      // Obtiene el ID token
      const idToken = await userCredential.user.getIdToken();

      // Crea/actualiza el usuario en el backend
      console.log('📝 Creando usuario en el backend...');
      console.log(`   Email: "${email}"`);
      console.log(`   Phone: "${phoneNumber}"`);
      console.log(`   Firebase UID: "${firebaseUid}"`);
      console.log(`   Display Name: "${displayName}"`);
      console.log(`   Photo URL: "${photoURL ? 'YES' : 'NO'}"`);

      if (!email || !phoneNumber || !firebaseUid) {
        throw new Error(
          `Datos incompletos para registro. Email: ${email}, Phone: ${phoneNumber}, UID: ${firebaseUid}`,
        );
      }

      const response = await authService.register({
        email,
        phone: phoneNumber,
        displayName,
        firebaseUid,
        photoURL,
      });

      console.log('✅ Backend response:', JSON.stringify(response, null, 2));

      // Usa loginWithToken para actualizar AuthContext
      // El backend devuelve el usuario con su información correcta
      await loginWithToken(idToken, response);

      console.log('✅ Verificación completada');
      Alert.alert('Éxito', '¡Bienvenido a Línea Lila!');

      // El RootNavigator se actualiza automáticamente cuando isAuthenticated = true
      // No es necesario usar navigation.replace
    } catch (error: any) {
      console.error('❌ Error:', error);
      console.error('   Error response:', error.response?.data);
      console.error('   Full error:', JSON.stringify(error));

      // Mostrar error más específico
      const errorMessage = error.message || 'No se pudo verificar el código';
      Alert.alert('Error en Verificación', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    try {
      setLoading(true);
      setOtpCode('');
      const newVerificationId = await firebaseService.sendPhoneOTP(phoneNumber);
      setVerificationId(newVerificationId);
      setResendTimer(300);
      Alert.alert('Éxito', 'Se envió un nuevo código a tu teléfono');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo reenviar el OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtpCode('');
    setVerificationId(null);
  };

  // Timer para resend
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            step === 'otp' ? handleBackToPhone() : navigation.goBack()
          }
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {step === 'phone' ? 'Verifica tu teléfono' : 'Ingresa el código'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'phone'
            ? 'Necesitamos tu número para completar tu registro'
            : `Hemos enviado un código a ${phoneNumber}`}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {step === 'phone' ? (
          <>
            {/* Display Name (Read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>
                  {displayName || 'Usuario'}
                </Text>
              </View>
            </View>

            {/* Email (Read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{email}</Text>
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="+57 300 1234567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
              />
              <Text style={styles.helperText}>
                Incluye el código de país (ej: +57 para Colombia)
              </Text>
            </View>

            {/* Send OTP Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Enviar Código OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* OTP Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Verificación</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={text => {
                  setOtpCode(text);
                  // Auto-submit cuando llegue a 6 dígitos
                  if (text.length === 6 && !loading) {
                    handleVerifyOTP();
                  }
                }}
                editable={!loading}
              />
              <Text style={styles.helperText}>
                Ingresa el código de 6 dígitos que recibiste por SMS
              </Text>
            </View>

            {/* Timer */}
            {resendTimer > 0 ? (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  Reenviar código en {formatTimer(resendTimer)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={loading || resendTimer > 0}
              >
                <Text style={styles.resendLink}>Reenviar código</Text>
              </TouchableOpacity>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading || otpCode.length !== 6}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verificar Código</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  resendLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
});
