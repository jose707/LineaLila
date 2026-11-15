import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';
import type { AutenticacionPilaParametroLista } from '../navigation/AutenticacionNavegador';
import { COLORS as Colores } from '../theme/colors';

export default function OlvidadaContrasenaPantalla({ navigation }: NativeStackScreenProps<AutenticacionPilaParametroLista, 'ForgotPassword'>) {
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const [correo, establecerCorreo] = useState('');
  const [aviso, establecerAviso] = useState('');
  const colorFondo = oscuro ? '#121212' : '#FFFFFF';
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };

  const solicitarEnlace = () => {
    if (!correo.trim()) {
      establecerAviso('Ingresa tu correo electrónico.');
      return;
    }

    Keyboard.dismiss();
    establecerAviso('La recuperación por correo aún no está disponible.');
  };

  return (
    <SafeAreaView style={[s.pantalla, { backgroundColor: colorFondo }]}>
      <StatusBar barStyle={oscuro ? 'light-content' : 'dark-content'} backgroundColor={colorFondo} />
      <View style={s.cabecera}>
        <Pressable onPress={() => navigation.goBack()} style={s.control} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </Pressable>
        <Text style={[s.titulo, texto]} accessibilityRole="header">Recuperar contraseña</Text>
        <View style={s.control} />
      </View>

      <KeyboardAvoidingView style={s.cuerpo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[s.descripcion, secundario]}>Ingresa el correo asociado a tu cuenta.</Text>
          <View style={s.grupo}>
            <Text style={[s.etiqueta, texto]}>Correo electrónico</Text>
            <View style={[s.campo, oscuro && s.campoOscuro]}>
              <View style={s.iconoCampo}><Mail size={21} color={secundario.color} strokeWidth={2.5} /></View>
              <View style={[s.separador, oscuro && s.separadorOscuro]} />
              <TextInput style={[s.entrada, texto]} accessibilityLabel="Correo electrónico"
                placeholder="Tu correo electrónico" placeholderTextColor={secundario.color}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
                value={correo} onChangeText={valor => { establecerCorreo(valor); establecerAviso(''); }} />
            </View>
          </View>

          <Pressable style={s.boton} onPress={solicitarEnlace} accessibilityRole="button">
            <Text style={s.botonTexto}>Enviar enlace</Text>
          </Pressable>

          {!!aviso && <Text style={[s.descripcion, secundario]} accessibilityRole="alert" accessibilityLiveRegion="polite">{aviso}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1 },
  cuerpo: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 16 },
  descripcion: { fontSize: 14, lineHeight: 20 },
  grupo: { gap: 6 },
  etiqueta: { fontSize: 14, fontWeight: '600' },
  campo: {
    flexDirection: 'row', alignItems: 'center', minHeight: 58, borderWidth: 1,
    borderColor: '#EAEAF0', borderRadius: 13, backgroundColor: '#FFFFFF', overflow: 'hidden'
  },
  campoOscuro: { borderColor: '#414141', backgroundColor: '#222222' },
  iconoCampo: { width: 52, alignItems: 'center', justifyContent: 'center' },
  separador: { width: 1, height: 28, backgroundColor: '#EAEAF0' },
  separadorOscuro: { backgroundColor: '#414141' },
  entrada: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 18, fontWeight: '600' },
  boton: {
    minHeight: 54, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colores.primary
  },
  botonTexto: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center' }
});
