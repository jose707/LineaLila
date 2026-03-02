// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import * as firebaseService from '../services/firebase.service';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type LoginScreenProps = NativeStackScreenProps<any, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const { loginWithToken } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // Initialize Google Sign-In before attempting sign in
      console.log('🔄 Iniciando Google Sign-In...');
      await firebaseService.initializeGoogleSignIn();

      // Inicia sesión con Google (con reintentos automáticos)
      const userCredential = await firebaseService.signInWithGoogle();
      const firebaseUser = userCredential.user;

      console.log('🔐 LoginScreen - Firebase User:', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      });

      if (!firebaseUser.email) {
        throw new Error('No se pudo obtener el correo de Google');
      }

      // Check if user already exists in backend
      console.log('🔍 Verificando si el usuario existe...');
      const existingUserCheck = await authService.checkFirebaseUser(
        firebaseUser.uid,
      );

      if (existingUserCheck.exists) {
        // User already exists, login directly without OTP
        console.log('✅ Usuario encontrado, iniciando sesión...');
        await loginWithToken(
          existingUserCheck.token || '',
          existingUserCheck.user || ({} as any),
        );
      } else {
        // User is new, go to phone verification
        console.log('📱 Usuario nuevo, requiere verificación de teléfono');
        navigation.navigate('GooglePhoneVerification', {
          email: firebaseUser.email || '',
          firebaseUid: firebaseUser.uid,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'No se pudo iniciar sesión con Google';
      console.error('❌ Google Sign-In error:', errorMsg);

      Alert.alert('Error de Google Sign-In', errorMsg, [
        {
          text: 'Reintentar',
          onPress: () => handleGoogleSignIn(),
        },
        {
          text: 'Cancelar',
          onPress: () => setLoading(false),
          style: 'cancel',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    navigation.navigate('EmailLogin');
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
        <View style={styles.logoLarge}>
          <View style={styles.logoCircle} />
        </View>
        <Text style={styles.title}>Línea Lila</Text>
        <Text style={styles.subtitle}>Transporte seguro para mujeres</Text>
      </View>

      {/* Main CTA Buttons */}
      <View style={styles.mainButtonsContainer}>
        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.primaryButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Text style={styles.buttonIcon}>🔍</Text>
              <Text style={styles.primaryButtonText}>Iniciar con Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Email Sign-In Button */}
        <TouchableOpacity
          style={[styles.primaryButton, styles.emailButton]}
          onPress={handleEmailSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>✉️</Text>
          <Text style={styles.primaryButtonText}>Iniciar con Correo</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
        <TouchableOpacity
          disabled={loading}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupLink}>Regístrate aquí</Text>
        </TouchableOpacity>
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
  },
  header: {
    paddingTop: 80,
    paddingBottom: 80,
    alignItems: 'center',
  },
  logoLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  mainButtonsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    marginBottom: 40,
    gap: 16,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  googleButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  emailButton: {
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonIcon: {
    fontSize: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  signupLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
