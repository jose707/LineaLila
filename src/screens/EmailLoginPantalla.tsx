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
  KeyboardAvoidingView,
  Platform,
  StatusBar as EstadoBar } from
'react-native';
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, LockKeyhole, Mail, Phone, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import type { AutenticacionPilaParametroLista } from '../navigation/AutenticacionNavegador';
import { COLORS as Colores } from '../theme/colors';

type CorreoIngresarPantallaPropiedades = NativoPilaPantallaPropiedades<AutenticacionPilaParametroLista, 'EmailLogin'>;

const CONDUCTORES_PRUEBA = [
  { email: 'conductor.prueba@linealila.test', password: 'Conductor123!', phone: '+59179990001' },
  { email: 'conductor.prueba2@linealila.test', password: 'Conductor123!', phone: '+59179990002' }
];

function CorreoIngresarPantalla({
  navigation: navegacion
}: CorreoIngresarPantallaPropiedades) {
  const [correo, establecerCorreo] = usarEstado('admin@linealila.com');
  const [contrasena, establecerContrasena] = usarEstado('admin123');
  const [telefono, establecerTelefono] = usarEstado('+573001234567');
  const [mostrarContrasena, establecerMostrarContrasena] = usarEstado(false);
  const [cargando, establecerCargando] = usarEstado(false);
  const { loginWithToken: ingresarConToken, mostrarCuentaDesactivadaAlIngresar } = usarAutenticacion();
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const colorFondo = oscuro ? '#121212' : '#FFFFFF';
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const colorIcono = oscuro ? '#BDBDC7' : '#666675';
  const campo = [estilos.campo, oscuro && estilos.campoOscuro];
  const separador = [estilos.separador, oscuro && estilos.separadorOscuro];
  const IconoVisibilidad = mostrarContrasena ? EyeOff : Eye;

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

      const { rol, modoActual } = respuesta.user;
      if (rol !== 'administrador' && rol !== 'conductor' && modoActual !== 'conductor') {
        Alert.alert('Éxito', '¡Bienvenido a Línea Lila!');
      }
      // RootNavigator manejará la navegación automáticamente
    } catch (error: any) {
      if (mostrarCuentaDesactivadaAlIngresar(error)) return;
      console.error('❌ Error de login:', error);
      const errorMensaje =
      error?.data?.error ||
      error?.message ||
      'No se pudo iniciar sesión';
      Alert.alert('Error de inicio de sesión', errorMensaje);
    } finally {
      establecerCargando(false);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: colorFondo }]}>
      <EstadoBar barStyle={oscuro ? 'light-content' : 'dark-content'} backgroundColor={colorFondo} />
      <Vista style={estilos.cabecera}>
        <PulsableOpacidad onPress={() => navegacion.goBack()} style={estilos.control}
          accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={[estilos.titulo, texto]} accessibilityRole="header">Iniciar con correo</Texto>
        <Vista style={estilos.control} />
      </Vista>

      <KeyboardAvoidingView style={estilos.cuerpo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DesplazableVista contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Vista style={campo}>
            <Vista style={estilos.iconoCampo}><Mail size={21} color={colorIcono} strokeWidth={2.5} /></Vista>
            <Vista style={separador} />
            <TextoEntrada style={[estilos.entrada, texto]} accessibilityLabel="Correo electrónico"
              placeholder="Tu correo electrónico" placeholderTextColor={colorIcono} keyboardType="email-address"
              value={correo} onChangeText={establecerCorreo} editable={!cargando} autoCapitalize="none" autoCorrect={false} />
          </Vista>

          <Vista style={campo}>
            <Vista style={estilos.iconoCampo}><LockKeyhole size={21} color={colorIcono} strokeWidth={2.5} /></Vista>
            <Vista style={separador} />
            <TextoEntrada style={[estilos.entrada, texto]} accessibilityLabel="Contraseña"
              placeholder="Tu contraseña" placeholderTextColor={colorIcono} secureTextEntry={!mostrarContrasena}
              value={contrasena} onChangeText={establecerContrasena} editable={!cargando}
              autoCapitalize="none" autoCorrect={false} />
            <PulsableOpacidad style={estilos.control} disabled={cargando}
              onPress={() => establecerMostrarContrasena(visible => !visible)}
              accessibilityRole="button" accessibilityLabel={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <IconoVisibilidad size={21} color={colorIcono} strokeWidth={2.5} />
            </PulsableOpacidad>
          </Vista>

          <Vista style={campo}>
            <Vista style={estilos.iconoCampo}><Phone size={21} color={colorIcono} strokeWidth={2.5} /></Vista>
            <Vista style={separador} />
            <TextoEntrada style={[estilos.entrada, texto]} accessibilityLabel="Número de celular"
              placeholder="Tu número de celular" placeholderTextColor={colorIcono} keyboardType="phone-pad"
              value={telefono} onChangeText={establecerTelefono} editable={!cargando} />
          </Vista>

          <PulsableOpacidad style={estilos.recuperar} disabled={cargando}
            onPress={() => navegacion.navigate('ForgotPassword')} accessibilityRole="button">
            <Texto style={estilos.recuperarTexto}>¿Olvidaste tu contraseña?</Texto>
          </PulsableOpacidad>

          <Vista style={estilos.acciones}>
            <PulsableOpacidad style={[estilos.boton, estilos.continuar, cargando && estilos.botonOcupado]}
              onPress={() => manejarIngresar()} disabled={cargando} activeOpacity={0.8}
              accessibilityRole="button" accessibilityLabel="Continuar" accessibilityState={{ disabled: cargando, busy: cargando }}>
              {cargando ? <ActividadIndicador color="#FFFFFF" size="small" /> : (
                <Texto style={[estilos.botonTexto, estilos.continuarTexto]}>Continuar</Texto>
              )}
            </PulsableOpacidad>

            {CONDUCTORES_PRUEBA.map((credenciales, indice) => (
              <PulsableOpacidad key={credenciales.email}
                style={[estilos.boton, estilos.accesoPrueba, cargando && estilos.botonOcupado]}
                disabled={cargando} accessibilityRole="button" accessibilityState={{ disabled: cargando }} activeOpacity={0.8}
                onPress={() => {
                  establecerCorreo(credenciales.email);
                  establecerContrasena(credenciales.password);
                  establecerTelefono(credenciales.phone);
                  manejarIngresar(credenciales);
                }}>
                <Texto style={[estilos.botonTexto, estilos.accesoPruebaTexto]}>
                  Entrar como conductor de prueba {indice + 1}
                </Texto>
              </PulsableOpacidad>
            ))}
          </Vista>
        </DesplazableVista>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CorreoIngresarPantalla;

const estilos = EstiloHoja.create({
  pantalla: { flex: 1 },
  cuerpo: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 16 },
  campo: {
    flexDirection: 'row', alignItems: 'center', minHeight: 58, borderWidth: 1,
    borderColor: '#EAEAF0', borderRadius: 13, backgroundColor: '#FFFFFF', overflow: 'hidden'
  },
  campoOscuro: { borderColor: '#414141', backgroundColor: '#222222' },
  iconoCampo: { width: 52, alignItems: 'center', justifyContent: 'center' },
  separador: { width: 1, height: 28, backgroundColor: '#EAEAF0' },
  separadorOscuro: { backgroundColor: '#414141' },
  entrada: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 18, fontWeight: '600' },
  recuperar: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  recuperarTexto: { color: Colores.primary, fontSize: 14, fontWeight: '700' },
  acciones: { gap: 12 },
  boton: { minHeight: 54, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  botonOcupado: { opacity: 0.6 },
  continuar: { backgroundColor: Colores.primary },
  accesoPrueba: { borderWidth: 1, borderColor: Colores.primary, backgroundColor: '#FFFFFF' },
  botonTexto: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  continuarTexto: { color: '#FFFFFF' },
  accesoPruebaTexto: { color: Colores.primary }
});
