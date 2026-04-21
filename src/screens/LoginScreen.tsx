// src/screens/LoginScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as firebaseService from '../services/firebase.service';
import { authService } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import { LOGINSCREEN_COLORS as C } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const { height } = Dimensions.get('window');

type LoginScreenProps = NativeStackScreenProps<any, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const { loginWithToken } = useAuth();
  const insets = useSafeAreaInsets();

  const anims = useMemo(
    () => ({
      fade: new Animated.Value(0),
      slide: new Animated.Value(28),
      scale: new Animated.Value(0.88),
      btn1: new Animated.Value(36),
      btn2: new Animated.Value(36),
    }),
    [],
  );

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(anims.fade, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.spring(anims.scale, {
          toValue: 1,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(anims.slide, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(90, [
        Animated.timing(anims.btn1, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(anims.btn2, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [anims]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await firebaseService.initializeGoogleSignIn();
      const userCredential = await firebaseService.signInWithGoogle();
      const firebaseUser = userCredential.user;

      if (!firebaseUser.email)
        throw new Error('No se pudo obtener el correo de Google');

      const existingUserCheck = await authService.checkFirebaseUser(
        firebaseUser.uid,
      );

      if (existingUserCheck.exists && existingUserCheck.needsPhoneVerification) {
        navigation.navigate('GooglePhoneVerification', {
          email: firebaseUser.email || '',
          firebaseUid: firebaseUser.uid,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
        });
        return;
      }

      if (existingUserCheck.exists) {
        await loginWithToken(
          existingUserCheck.token || '',
          existingUserCheck.user || ({} as any),
        );
      } else {
        navigation.navigate('GooglePhoneVerification', {
          email: firebaseUser.email || '',
          firebaseUid: firebaseUser.uid,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'No se pudo iniciar sesión con Google';
      Alert.alert('Error', errorMsg, [
        { text: 'Reintentar', onPress: () => handleGoogleSignIn() },
        { text: 'Cancelar', onPress: () => setLoading(false), style: 'cancel' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 36 + insets.bottom },
        ]}
      >
        {/* ── Grupo Superior: Logo ── */}
        <View>
          <Animated.View
            style={[
              styles.header,
              {
                opacity: anims.fade,
                transform: [{ translateY: anims.slide }, { scale: anims.scale }],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.tagline}>Transporte seguro por mujeres</Text>
          </Animated.View>
        </View>

        {/* ── Grupo Inferior: Botones + Legal ── */}
        <View>
          {/* Google — blanco puro, contraste máximo */}
          <Animated.View
            style={{
              opacity: anims.fade,
              transform: [{ translateY: anims.btn1 }],
            }}
          >
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={C.googleText} size="small" />
              ) : (
                <View style={styles.btnInner}>
                  {/* ── Logo oficial Google SVG ── */}
                  <View style={styles.googleIconWrap}>
                    <Svg width={18} height={18} viewBox="0 0 48 48">
                      <Path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <Path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <Path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <Path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <Path fill="none" d="M0 0h48v48H0z" />
                    </Svg>
                  </View>
                  <Text style={styles.googleBtnText}>Continuar con Google</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Email — lila claro con borde, texto blanco */}
          <Animated.View
            style={{
              opacity: anims.fade,
              transform: [{ translateY: anims.btn2 }],
            }}
          >
            <TouchableOpacity
              style={styles.emailBtn}
              onPress={() => navigation.navigate('EmailLogin')}
              disabled={loading}
              activeOpacity={0.88}
            >
              <View style={styles.btnInner}>
                <Text style={styles.emailBtnText}>Continuar con correo</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Legal ── */}
          <Animated.View style={[styles.legalWrap, { opacity: anims.fade, marginTop: 24 }]}>
            <Text style={styles.legalText}>
              Al continuar, aceptas nuestros{' '}
              <Text style={styles.legalLink}>Términos de uso</Text> y{' '}
              <Text style={styles.legalLink}>Privacidad</Text>
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Raíz ──
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  container: { flex: 1 },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 36,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },

  logoWrapper: {
    paddingTop: 50,
  },
  logoImage: {
    width: 160,
    height: 160,
  },

  tagline: {
    fontSize: 15,
    color: C.tagline,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── Botones ──
  actionsContainer: {
    marginBottom: 32,
  },

  // Google: blanco puro
  googleBtn: {
    backgroundColor: C.googleBtn,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  googleBtnText: {
    color: C.googleText,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Email: lila medio
  emailBtn: {
    backgroundColor: C.emailBtn,
    marginTop: 15,
    borderRadius: 10,
    paddingVertical: 13,
    borderColor: C.emailBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  
  emailBtnText: {
    color: C.emailText,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    padding: 4,
  },

  // ── Legal ──
  legalWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  legalText: {
    fontSize: 11.5,
    color: C.legal,
    textAlign: 'center',
    lineHeight: 17,
  },
  legalLink: {
    color: C.legalLink,
    fontWeight: '600',
  },
});