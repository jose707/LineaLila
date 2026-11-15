import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowUpRight, Clock, Facebook, FileText, Globe, Mail, MapPin, Phone, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';

const correoAdministracion = 'admin@linealila.com';
const contactosDeEjemplo = [
  { etiqueta: 'Teléfono', valor: '+591 0000 0000', Icono: Phone },
  { etiqueta: 'Facebook', valor: 'facebook.com/linealila.ejemplo', Icono: Facebook },
  { etiqueta: 'Sitio web', valor: 'linealila.example', Icono: Globe }
];

export default function SoportePantalla() {
  const navegacion = useNavigation();
  const { settings } = usarAjustes();
  const oscuro = settings.darkMode;
  const acento = oscuro ? '#D5A6FF' : '#7514C5';
  const colorTexto = oscuro ? '#FFFFFF' : '#111118';
  const colorSecundario = oscuro ? '#BDBDC7' : '#666675';
  const [errorCorreo, establecerErrorCorreo] = useState(false);

  const abrirCorreo = async () => {
    establecerErrorCorreo(false);
    try {
      await Linking.openURL('mailto:' + correoAdministracion);
    } catch {
      establecerErrorCorreo(true);
    }
  };

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <TouchableOpacity style={s.cerrar} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={colorTexto} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[s.tituloCabecera, { color: colorTexto }]}>Soporte</Text>
        <View style={s.cerrar} />
      </View>

      <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={[s.titulo, { color: colorTexto }]}>Contacto de administración</Text>
        <TouchableOpacity style={[s.tarjeta, oscuro && s.tarjetaOscura]} onPress={abrirCorreo}
          activeOpacity={0.75} accessibilityRole="link" accessibilityLabel={'Correo de administración: ' + correoAdministracion}
          accessibilityHint="Abre tu aplicación de correo">
          <Mail size={25} color={acento} strokeWidth={2.5} />
          <View style={s.datos}>
            <Text style={[s.etiqueta, { color: colorTexto }]}>Correo electrónico</Text>
            <Text style={[s.valorContacto, { color: acento }]}>{correoAdministracion}</Text>
            <Text style={[s.valorContacto, { color: colorSecundario }]}>Para consultas sobre viajes, pagos y comprobantes.</Text>
          </View>
          <ArrowUpRight size={20} color={acento} strokeWidth={2.5} />
        </TouchableOpacity>
        {errorCorreo && <Text accessibilityRole="alert" style={[s.error, { color: colorSecundario }]}>
          No pudimos abrir una aplicación de correo. Puedes escribir a la dirección que aparece arriba.
        </Text>}
        <View style={[s.tarjeta, oscuro && s.tarjetaOscura]}>
          <Clock size={25} color={acento} strokeWidth={2.5} />
          <View style={s.datos}>
            <Text style={[s.etiqueta, { color: colorTexto }]}>Horario de atención</Text>
            <Text style={[s.valorContacto, { color: colorSecundario }]}>Por confirmar</Text>
          </View>
        </View>
        <View style={[s.tarjeta, oscuro && s.tarjetaOscura]}>
          <MapPin size={25} color={acento} strokeWidth={2.5} />
          <View style={s.datos}>
            <Text style={[s.etiqueta, { color: colorTexto }]}>Oficinas físicas</Text>
            <Text style={[s.valorContacto, { color: colorSecundario }]}>Dirección por confirmar</Text>
          </View>
        </View>
        <View style={[s.tarjeta, oscuro && s.tarjetaOscura]}>
          <FileText size={25} color={acento} strokeWidth={2.5} />
          <View style={s.datos}>
            <Text style={[s.etiqueta, { color: colorTexto }]}>Qué incluir en tu mensaje</Text>
            <Text style={[s.valorContacto, { color: colorSecundario }]}>
              Describe brevemente lo ocurrido. Si la consulta es sobre un viaje, indica su ID y la fecha.
            </Text>
          </View>
        </View>
        <Text accessibilityRole="header" style={[s.tituloEjemplos, { color: colorSecundario }]}>Datos de ejemplo</Text>
        {contactosDeEjemplo.map(({ etiqueta, valor, Icono }) => (
          <View key={etiqueta} style={[s.tarjeta, oscuro && s.tarjetaOscura]}>
            <Icono size={25} color={acento} strokeWidth={2.5} />
            <View style={s.datos}>
              <Text style={[s.etiqueta, { color: colorTexto }]}>{etiqueta}</Text>
              <Text style={[s.valorContacto, { color: colorSecundario }]}>{valor}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  tituloCabecera: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
  titulo: { fontSize: 18, fontWeight: '700' },
  tituloEjemplos: { marginTop: 8, fontSize: 14, fontWeight: '700' },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#EAEAF0', padding: 14 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  datos: { flex: 1, gap: 4 },
  etiqueta: { fontSize: 15, fontWeight: '700' },
  valorContacto: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13, lineHeight: 19 }
});
