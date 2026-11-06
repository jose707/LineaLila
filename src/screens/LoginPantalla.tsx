// src/screens/LoginPantalla.tsx
import React, { useState as usarEstado, useEffect as usarEfecto, useMemo as usarMemoria } from 'react';
import {
  View as Vista,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  Text as Texto,
  Image as Imagen,
  ScrollView as DesplazableVista,
  ActivityIndicator as ActividadIndicador,
  Alert,
  StatusBar as EstadoBar,
  Animated as Animado,
  Dimensions } from
'react-native';
import Svg, { Path as Ruta } from 'react-native-svg';
import * as firebaseServicio from "../services/firebase.servicio";
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { LOGINSCREEN_COLORS as C } from '../theme/colors';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';

const { height: alto } = Dimensions.get('window');

type IngresarPantallaPropiedades = NativoPilaPantallaPropiedades<any, 'Login'>;

function IngresarPantalla({ navigation: navegacion }: IngresarPantallaPropiedades) {
  const [cargando, establecerCargando] = usarEstado(false);
  const { loginWithToken: ingresarConToken } = usarAutenticacion();
  const margenes = usarSeguraZonaMargenes();

  const anims = usarMemoria(
    () => ({
      fade: new Animado.Value(0),
      slide: new Animado.Value(28),
      scale: new Animado.Value(0.88),
      btn1: new Animado.Value(36),
      btn2: new Animado.Value(36)
    }),
    []
  );

  usarEfecto(() => {
    Animado.sequence([
    Animado.parallel([
    Animado.timing(anims.fade, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true
    }),
    Animado.spring(anims.scale, {
      toValue: 1,
      tension: 55,
      friction: 8,
      useNativeDriver: true
    }),
    Animado.timing(anims.slide, {
      toValue: 0,
      duration: 550,
      useNativeDriver: true
    })]
    ),
    Animado.stagger(90, [
    Animado.timing(anims.btn1, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true
    }),
    Animado.timing(anims.btn2, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true
    })]
    )]
    ).start();
  }, [anims]);

  const manejarGoogleSignoEn = async () => {
    try {
      establecerCargando(true);
      await firebaseServicio.configurarAccesoGoogle();
      const usuarioCredencial = await firebaseServicio.iniciarSesionConGoogle();
      const firebaseUsuario = usuarioCredencial.user;

      if (!firebaseUsuario.email)
      throw new Error('No se pudo obtener el correo de Google');

      const existenteUsuarioComprobar = await autenticacionServicio.comprobarUsuarioFirebase(
        firebaseUsuario.uid
      );

      if (existenteUsuarioComprobar.exists && existenteUsuarioComprobar.needsPhoneVerification) {
        navegacion.navigate('GooglePhoneVerification', {
          email: firebaseUsuario.email || '',
          firebaseUid: firebaseUsuario.uid,
          displayName: firebaseUsuario.displayName || '',
          photoURL: firebaseUsuario.photoURL || ''
        });
        return;
      }

      if (existenteUsuarioComprobar.exists) {
        await ingresarConToken(
          existenteUsuarioComprobar.token || '',
          existenteUsuarioComprobar.user || {} as any
        );
      } else {
        navegacion.navigate('GooglePhoneVerification', {
          email: firebaseUsuario.email || '',
          firebaseUid: firebaseUsuario.uid,
          displayName: firebaseUsuario.displayName || '',
          photoURL: firebaseUsuario.photoURL || ''
        });
      }
    } catch (error: any) {
      const errorMensaje = error?.message || 'No se pudo iniciar sesión con Google';
      Alert.alert('Error', errorMensaje, [
      { text: 'Reintentar', onPress: () => manejarGoogleSignoEn() },
      { text: 'Cancelar', onPress: () => establecerCargando(false), style: 'cancel' }]
      );
    } finally {
      establecerCargando(false);
    }
  };

  return (
    <Vista style={estilos.root}>
      <EstadoBar barStyle="light-content" backgroundColor={C.bg} />

      <DesplazableVista
        style={estilos.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
        estilos.contentContainer,
        { paddingBottom: 36 + margenes.bottom }]
        }>

        {/* ── Grupo Superior: Logo ── */}
        <Vista>
          <Animado.View
            style={[
            estilos.header,
            {
              opacity: anims.fade,
              transform: [{ translateY: anims.slide }, { scale: anims.scale }]
            }]
            }>

            <Vista style={estilos.logoWrapper}>
              <Imagen
                source={require('../../assets/logo.png')}
                style={estilos.logoImage}
                resizeMode="contain" />

            </Vista>
            <Texto style={estilos.tagline}>Transporte seguro por mujeres</Texto>
          </Animado.View>
        </Vista>

        {/* ── Grupo Inferior: Botones + Legal ── */}
        <Vista>
          {/* Google — blanco puro, contraste máximo */}
          <Animado.View
            style={{
              opacity: anims.fade,
              transform: [{ translateY: anims.btn1 }]
            }}>

            <PulsableOpacidad
              style={estilos.googleBtn}
              onPress={manejarGoogleSignoEn}
              disabled={cargando}
              activeOpacity={0.88}>

              {cargando ?
              <ActividadIndicador color={C.googleText} size="small" /> :

              <Vista style={estilos.btnInner}>
                  {/* ── Logo oficial Google SVG ── */}
                  <Vista style={estilos.googleIconWrap}>
                    <Svg width={18} height={18} viewBox="0 0 48 48">
                      <Ruta
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />

                      <Ruta
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />

                      <Ruta
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />

                      <Ruta
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />

                      <Ruta fill="none" d="M0 0h48v48H0z" />
                    </Svg>
                  </Vista>
                  <Texto style={estilos.googleBtnText}>Continuar con Google</Texto>
                </Vista>
              }
            </PulsableOpacidad>
          </Animado.View>

          {/* Email — lila claro con borde, texto blanco */}
          <Animado.View
            style={{
              opacity: anims.fade,
              transform: [{ translateY: anims.btn2 }]
            }}>

            <PulsableOpacidad
              style={estilos.emailBtn}
              onPress={() => navegacion.navigate('EmailLogin')}
              disabled={cargando}
              activeOpacity={0.88}>

              <Vista style={estilos.btnInner}>
                <Texto style={estilos.emailBtnText}>Continuar con correo</Texto>
              </Vista>
            </PulsableOpacidad>
          </Animado.View>

          {/* ── Legal ── */}
          <Animado.View style={[estilos.legalWrap, { opacity: anims.fade, marginTop: 24 }]}>
            <Texto style={estilos.legalText}>
              Al continuar, aceptas nuestros{' '}
              <Texto style={estilos.legalLink}>Términos de uso</Texto> y{' '}
              <Texto style={estilos.legalLink}>Privacidad</Texto>
            </Texto>
          </Animado.View>
        </Vista>
      </DesplazableVista>
    </Vista>);

}export { IngresarPantalla as default };

const estilos = EstiloHoja.create({
  // ── Raíz ──
  root: {
    flex: 1,
    backgroundColor: C.bg
  },

  container: { flex: 1 },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 36
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingTop: alto * 0.08,
    paddingBottom: 40
  },

  logoWrapper: {
    paddingTop: 50
  },
  logoImage: {
    width: 160,
    height: 160
  },

  tagline: {
    fontSize: 15,
    color: C.tagline,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center'
  },

  // ── Botones ──
  actionsContainer: {
    marginBottom: 32
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
    elevation: 6
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center'
  },

  googleBtnText: {
    color: C.googleText,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1
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
    elevation: 3
  },

  emailBtnText: {
    color: C.emailText,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    padding: 4
  },

  // ── Legal ──
  legalWrap: {
    alignItems: 'center',
    paddingHorizontal: 16
  },
  legalText: {
    fontSize: 11.5,
    color: C.legal,
    textAlign: 'center',
    lineHeight: 17
  },
  legalLink: {
    color: C.legalLink,
    fontWeight: '600'
  }
});
