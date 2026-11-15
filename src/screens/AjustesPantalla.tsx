import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Car, Check, ChevronRight, Globe, Moon, Shield, Smartphone, Trash2, X } from 'lucide-react-native';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import ConfirmarInferiorHoja from '../components/ConfirmarInferiorSheet';
import { usarAjustes } from '../context/AjustesContexto';
import type { UsuarioAjustes } from '../context/AjustesContexto';
import { usarAutenticacion } from '../hooks/usarAutenticacion';

const lila = '#7514C5';
const vehiculos: { valor: UsuarioAjustes['preferredVehicleType']; etiqueta: string }[] = [
  { valor: 'taxi', etiqueta: 'Taxi' },
  { valor: 'minibus', etiqueta: 'Minibús' },
  { valor: 'bus', etiqueta: 'Bus' },
  { valor: 'motocicleta', etiqueta: 'Motocicleta' }
];

type FilaProps = {
  Icono: typeof Moon;
  etiqueta: string;
  detalle?: string;
  alPulsar?: () => void;
  interruptor?: React.ReactNode;
  separador?: boolean;
  color?: string;
  oscuro: boolean;
};

function Fila({ Icono, etiqueta, detalle, alPulsar, interruptor, separador, color, oscuro }: FilaProps) {
  const texto = oscuro ? '#FFFFFF' : '#111118';
  const secundario = oscuro ? '#BDBDC7' : '#666675';
  const acento = color ?? (oscuro ? '#D5A6FF' : lila);
  const estilo = [s.fila, separador && s.separador, separador && oscuro && s.separadorOscuro];
  const contenido = (
    <>
      <Icono size={23} color={acento} strokeWidth={2.5} />
      <View style={s.datosFila}>
        <Text style={[s.etiqueta, { color: color ?? texto }]}>{etiqueta}</Text>
        {!!detalle && <Text style={[s.detalle, { color: secundario }]}>{detalle}</Text>}
      </View>
      {interruptor}
      {alPulsar && <ChevronRight size={20} color={secundario} strokeWidth={2.3} />}
    </>
  );

  return alPulsar ? (
    <TouchableOpacity style={estilo} onPress={alPulsar} accessibilityRole="button" activeOpacity={0.75}>{contenido}</TouchableOpacity>
  ) : (
    <View style={estilo}>{contenido}</View>
  );
}

export default function AjustesPantalla() {
  const navegacion = useNavigation<NativeStackNavigationProp<RaizPilaParametroLista>>();
  const { isDriverMode: modoConductor } = usarAutenticacion();
  const { settings: ajustes, updateSettings: actualizarAjustes } = usarAjustes();
  const [mostrarVehiculos, establecerMostrarVehiculos] = useState(false);
  const [mostrarEliminar, establecerMostrarEliminar] = useState(false);

  const oscuro = ajustes.darkMode;
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const acento = oscuro ? '#D5A6FF' : lila;
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];
  const vehiculoPreferido = vehiculos.find(({ valor }) => valor === ajustes.preferredVehicleType)?.etiqueta ?? 'Taxi';
  const coloresInterruptor = { false: '#D5D5DF', true: lila };

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <TouchableOpacity style={s.cerrar} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[s.tituloCabecera, texto]}>Ajustes</Text>
        <View style={s.cerrar} />
      </View>

      <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
        <View style={s.seccion}>
          <Text accessibilityRole="header" style={[s.titulo, texto]}>Preferencias</Text>
          <View style={tarjeta}>
            <Fila oscuro={oscuro} Icono={Moon} etiqueta="Modo oscuro"
              interruptor={<Switch accessibilityLabel="Modo oscuro" value={oscuro}
                onValueChange={darkMode => actualizarAjustes({ darkMode })} trackColor={coloresInterruptor} thumbColor="#FFFFFF" />} />
            <Fila oscuro={oscuro} Icono={Globe} etiqueta="Idioma" detalle="Español" separador />
            {!modoConductor && (
              <Fila oscuro={oscuro} Icono={Car} etiqueta="Vehículo preferido" detalle={vehiculoPreferido}
                alPulsar={() => establecerMostrarVehiculos(true)} separador />
            )}
          </View>
        </View>

        {modoConductor && (
          <View style={s.seccion}>
            <Text accessibilityRole="header" style={[s.titulo, texto]}>Ofertas como conductor</Text>
            <View style={tarjeta}>
              <Fila oscuro={oscuro} Icono={Smartphone} etiqueta="Vibrar con nuevas ofertas"
                detalle="Mientras el panel de conductor está abierto"
                interruptor={<Switch accessibilityLabel="Vibrar con nuevas ofertas" value={ajustes.vibrarNuevasOfertas}
                  onValueChange={vibrarNuevasOfertas => actualizarAjustes({ vibrarNuevasOfertas })}
                  trackColor={coloresInterruptor} thumbColor="#FFFFFF" />} />
            </View>
          </View>
        )}

        <View style={s.seccion}>
          <Text accessibilityRole="header" style={[s.titulo, texto]}>Privacidad y seguridad</Text>
          <View style={tarjeta}>
            <Fila oscuro={oscuro} Icono={Shield} etiqueta="Contactos de emergencia"
              alPulsar={() => navegacion.navigate('ContactosEmergencia')} />
            <Fila oscuro={oscuro} Icono={Trash2} etiqueta="Eliminar cuenta" color={oscuro ? '#FCA5A5' : '#B91C1C'}
              alPulsar={() => establecerMostrarEliminar(true)} separador />
          </View>
        </View>
      </ScrollView>

      <Modal visible={mostrarVehiculos} transparent animationType="fade" onRequestClose={() => establecerMostrarVehiculos(false)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => establecerMostrarVehiculos(false)}
            accessibilityLabel="Cerrar selección de vehículo" />
          <View style={[s.selector, oscuro && s.tarjetaOscura]} accessibilityViewIsModal>
            <View style={s.cabeceraSelector}>
              <Text accessibilityRole="header" style={[s.titulo, texto]}>Vehículo preferido</Text>
              <TouchableOpacity style={s.cerrar} onPress={() => establecerMostrarVehiculos(false)}
                accessibilityRole="button" accessibilityLabel="Cerrar">
                <X size={22} color={texto.color} strokeWidth={2.8} />
              </TouchableOpacity>
            </View>
            {vehiculos.map(({ valor, etiqueta }, indice) => {
              const seleccionado = ajustes.preferredVehicleType === valor;
              return (
                <TouchableOpacity key={valor} accessibilityRole="radio" accessibilityState={{ checked: seleccionado }}
                  style={[s.fila, indice > 0 && s.separador, indice > 0 && oscuro && s.separadorOscuro]}
                  onPress={() => {
                    actualizarAjustes({ preferredVehicleType: valor });
                    establecerMostrarVehiculos(false);
                  }}>
                  <Text style={[s.etiqueta, s.datosFila, { color: seleccionado ? acento : texto.color }]}>{etiqueta}</Text>
                  {seleccionado && <Check size={20} color={acento} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
      <ConfirmarInferiorHoja visible={mostrarEliminar} title="Eliminar cuenta"
        message="Contacta a administración desde Soporte para solicitar la eliminación de tu cuenta."
        confirmLabel="Ir a Soporte" cancelLabel="Cancelar"
        onCancel={() => establecerMostrarEliminar(false)}
        onConfirm={() => { establecerMostrarEliminar(false); navegacion.navigate('Support'); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  tituloCabecera: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 20 },
  seccion: { gap: 10 },
  titulo: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  tarjeta: { borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  separadorOscuro: { borderTopColor: '#4A4A4A' },
  datosFila: { flex: 1, gap: 3 },
  etiqueta: { fontSize: 15, fontWeight: '600' },
  detalle: { fontSize: 13, lineHeight: 18 },
  overlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  selector: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, borderColor: '#EAEAF0', paddingHorizontal: 16, paddingBottom: 6, backgroundColor: '#FFFFFF' },
  cabeceraSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }
});
