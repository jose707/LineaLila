// src/screens/EmailLoginPantalla.tsx
import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  StyleSheet as EstiloHoja,
  TextInput as TextoEntrada,
  TouchableOpacity as PulsableOpacidad,
  Text as Texto,
  ScrollView as DesplazableVista,
  ActivityIndicator as ActividadIndicador,
  Alert,
  StatusBar as EstadoBar } from
'react-native';
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { COLORS as Colores } from '../theme/colors';

type CorreoIngresarPantallaPropiedades = NativoPilaPantallaPropiedades<any, 'EmailLogin'>;

const TEST_CONDUCTOR = {
  email: 'conductor.prueba@linealila.test',
  password: 'Conductor123!',
  phone: '+59179990001'
};

function CorreoIngresarPantalla({
  navigation: navegacion
}: CorreoIngresarPantallaPropiedades) {
  const [correo, establecerCorreo] = usarEstado('admin@linealila.com');
  const [contrasena, establecerContrasena] = usarEstado('admin123');
  const [telefono, establecerTelefono] = usarEstado('+573001234567');
  const [mostrarContrasena, establecerMostrarContrasena] = usarEstado(false);
  const [cargando, establecerCargando] = usarEstado(false);
  const { loginWithToken: ingresarConToken } = usarAutenticacion();

  const manejarIngresar = async (credenciales = { email: correo, password: contrasena, phone: telefono }) => {
    if (cargando) return;
    if (!credenciales.email.trim() || !credenciales.password.trim() || !credenciales.phone.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      establecerCargando(true);
      console.log(`📧 Iniciando sesión con email: ${credenciales.email}`);

      // Login usando el backend
      const respuesta = await autenticacionServicio.ingresar({
        email: credenciales.email,
        password: credenciales.password
      });

      console.log('✅ Login exitoso:', respuesta.user.correo);

      // Usar loginWithToken para establecer la sesión
      await ingresarConToken(respuesta.token, respuesta.user);

      Alert.alert('Éxito', '¡Bienvenido a Línea Lila!');
      // RootNavigator manejará la navegación automáticamente
    } catch (error: any) {
      console.error('❌ Error de login:', error);
      const errorMensaje =
      error.response?.data?.error ||
      error.message ||
      'No se pudo iniciar sesión';
      Alert.alert('Error de inicio de sesión', errorMensaje);
    } finally {
      establecerCargando(false);
    }
  };

  return (
    <DesplazableVista
      style={estilos.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={estilos.contentContainer}>

      <EstadoBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Vista style={estilos.header}>
        <PulsableOpacidad
          onPress={() => navegacion.goBack()}
          style={estilos.backButton}>

          <Texto style={estilos.backButtonText}>← Atrás</Texto>
        </PulsableOpacidad>

        <Texto style={estilos.title}>Iniciar con Correo</Texto>
        <Texto style={estilos.subtitle}>
          Ingresa tus credenciales para continuar
        </Texto>
      </Vista>

      {/* Form */}
      <Vista style={estilos.form}>
        {/* Email Input */}
        <Vista style={estilos.inputGroup}>
          <Texto style={estilos.label}>Correo Electrónico</Texto>
          <TextoEntrada
            style={estilos.input}
            placeholder="admin@linealila.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            value={correo}
            onChangeText={establecerCorreo}
            editable={!cargando}
            autoCapitalize="none" />

        </Vista>

        {/* Password Input */}
        <Vista style={estilos.inputGroup}>
          <Texto style={estilos.label}>Contraseña</Texto>
          <Vista style={estilos.passwordContainer}>
            <TextoEntrada
              style={estilos.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry={!mostrarContrasena}
              value={contrasena}
              onChangeText={establecerContrasena}
              editable={!cargando} />

            <PulsableOpacidad
              onPress={() => establecerMostrarContrasena(!mostrarContrasena)}
              disabled={cargando}
              style={estilos.eyeIcon}>

              <Texto style={estilos.eyeText}>{mostrarContrasena ? '👁️' : '👁️‍🗨️'}</Texto>
            </PulsableOpacidad>
          </Vista>
        </Vista>

        {/* Phone Input */}
        <Vista style={estilos.inputGroup}>
          <Texto style={estilos.label}>Número de Celular</Texto>
          <TextoEntrada
            style={estilos.input}
            placeholder="+573001234567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={establecerTelefono}
            editable={!cargando} />

        </Vista>

        {/* Forgot Password */}
        <PulsableOpacidad
          disabled={cargando}
          onPress={() => navegacion.navigate('ForgotPassword')}
          style={estilos.forgotContainer}>

          <Texto style={estilos.forgotText}>¿Olvidaste tu contraseña?</Texto>
        </PulsableOpacidad>

        {/* Login Button */}
        <PulsableOpacidad
          style={[estilos.button, cargando && estilos.buttonDisabled]}
          onPress={() => manejarIngresar()}
          disabled={cargando}
          activeOpacity={0.8}>

          {cargando ?
          <ActividadIndicador color="#FFF" size="small" /> :

          <Texto style={estilos.buttonText}>Continuar</Texto>
          }
        </PulsableOpacidad>

        <PulsableOpacidad
          style={[estilos.quickAccessButton, cargando && estilos.buttonDisabled]}
          disabled={cargando}
          accessibilityRole="button"
          accessibilityLabel="Entrar como conductor de prueba"
          activeOpacity={0.8}
          onPress={() => {
            establecerCorreo(TEST_CONDUCTOR.email);
            establecerContrasena(TEST_CONDUCTOR.password);
            establecerTelefono(TEST_CONDUCTOR.phone);
            manejarIngresar(TEST_CONDUCTOR);
          }}>

          <Texto style={estilos.quickAccessText}>Entrar como conductor de prueba</Texto>
        </PulsableOpacidad>

      </Vista>
    </DesplazableVista>);

}export { CorreoIngresarPantalla as default };

const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40
  },
  backButton: {
    marginBottom: 20
  },
  backButtonText: {
    color: Colores.primary,
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400'
  },
  form: {
    flex: 1
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333'
  },
  eyeIcon: {
    paddingHorizontal: 12
  },
  eyeText: {
    fontSize: 18
  },
  forgotContainer: {
    marginBottom: 28,
    alignItems: 'flex-end'
  },
  forgotText: {
    color: Colores.primary,
    fontSize: 14,
    fontWeight: '500'
  },
  button: {
    backgroundColor: Colores.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colores.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.6
  },
  quickAccessButton: {
    borderWidth: 1,
    borderColor: Colores.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 24
  },
  quickAccessText: {
    color: Colores.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
