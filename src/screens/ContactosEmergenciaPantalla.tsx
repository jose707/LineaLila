import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, UsersRound, ShieldCheck, Trash2, UserRound, X } from 'lucide-react-native';
import { usarAjustes } from '../context/AjustesContexto';
import api from '../services/api.cliente';
import ConfirmarInferiorHoja from '../components/ConfirmarInferiorSheet';

type Contacto = { id: string; nombre: string; telefono: string; relacion?: string | null };
const ruta = '/usuarios/contactos-emergencia';
const principal = '#7514C5';
const opcionesRelacion = ['Madre', 'Padre', 'Hermana', 'Hermano', 'Hija', 'Hijo', 'Pareja', 'Esposa', 'Esposo', 'Abuela', 'Abuelo', 'Nieta', 'Nieto', 'Tía', 'Tío', 'Prima', 'Primo', 'Sobrina', 'Sobrino', 'Suegra', 'Suegro', 'Cuñada', 'Cuñado', 'Amiga', 'Amigo', 'Compañera de trabajo', 'Compañero de trabajo', 'Vecina', 'Vecino', 'Otra'];

const formatearTelefono = (valor: string) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 1) return digitos;
  if (digitos.length <= 4) return digitos.slice(0, 1) + ' ' + digitos.slice(1);
  return digitos.slice(0, 1) + ' ' + digitos.slice(1, 4) + ' ' + digitos.slice(4);
};

export default function ContactosEmergenciaPantalla() {
  const navegacion = useNavigation<any>();
  const { settings } = usarAjustes();
  const oscuro = settings.darkMode;
  const [contactos, establecerContactos] = useState<Contacto[]>([]);
  const [nombre, establecerNombre] = useState('');
  const [telefono, establecerTelefono] = useState('');
  const [relacion, establecerRelacion] = useState('');
  const [otraRelacion, establecerOtraRelacion] = useState('');
  const [selectorVisible, establecerSelectorVisible] = useState(false);
  const [contactoPorQuitar, establecerContactoPorQuitar] = useState<Contacto | null>(null);
  const [errorQuitar, establecerErrorQuitar] = useState('');
  const [ocupado, establecerOcupado] = useState(true);
  const [error, establecerError] = useState('');
  const [cargaFallida, establecerCargaFallida] = useState(false);

  const cargar = async () => {
    establecerOcupado(true);
    establecerError('');
    try {
      establecerContactos((await api.obtener<{ contactos: Contacto[] }>(ruta)).contactos);
      establecerCargaFallida(false);
    } catch {
      establecerCargaFallida(true);
      establecerError('No se pudieron cargar los contactos.');
    } finally {
      establecerOcupado(false);
    }
  };
  useEffect(() => { void cargar(); }, []);

  const agregar = async () => {
    if (ocupado) return;
    const numero = '+591' + telefono.replace(/\D/g, '');
    if (contactos.some(contacto => contacto.telefono.replace(/\D/g, '') === numero.slice(1))) {
      establecerError('Ese número ya está registrado.');
      return;
    }
    establecerOcupado(true);
    establecerError('');
    try {
      const { contacto } = await api.post<{ contacto: Contacto }>(ruta, { nombre, telefono: numero, relacion: (relacion === 'Otra' ? otraRelacion : relacion).trim() });
      establecerContactos(anterior => [...anterior, contacto]);
      establecerNombre('');
      establecerTelefono('');
      establecerRelacion('');
    } catch (fallo: any) {
      establecerError(fallo?.data?.error || 'No se pudo agregar el contacto.');
    } finally {
      establecerOcupado(false);
    }
  };
  const quitar = async () => {
    if (!contactoPorQuitar || ocupado) return;
    establecerOcupado(true);
    establecerErrorQuitar('');
    try {
      await api.eliminar(`${ruta}/${contactoPorQuitar.id}`);
      establecerContactos(anterior => anterior.filter(actual => actual.id !== contactoPorQuitar.id));
      establecerContactoPorQuitar(null);
    } catch {
      establecerErrorQuitar('No se pudo quitar el contacto. Intenta nuevamente.');
    } finally {
      establecerOcupado(false);
    }
  };
  const deshabilitado = ocupado || !nombre.trim() || !relacion.trim() || (relacion === 'Otra' && !otraRelacion.trim()) || telefono.replace(/\D/g, '').length !== 8 || !/^[67]/.test(telefono);
  return <SafeAreaView style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
    <View style={estilos.cabecera}>
      <TouchableOpacity onPress={() => navegacion.goBack()} style={estilos.volver} accessibilityRole="button" accessibilityLabel="Cerrar">
        <X size={24} color={oscuro ? "#FFFFFF" : "#0D0D0D"} strokeWidth={2.8} />
      </TouchableOpacity>
      <Text style={[estilos.tituloCabecera, oscuro && estilos.textoClaro]} numberOfLines={1}>Contactos de emergencia</Text>
      <View style={estilos.espacioCabecera} />
    </View>
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {contactos.length > 0 && <View style={estilos.seccionCabecera}>
        <Text style={[estilos.seccionTitulo, oscuro && estilos.textoClaro]}>Tus contactos</Text>
        {!cargaFallida && <Text style={[estilos.contador, oscuro && estilos.secundarioOscuro]}>{contactos.length} de 3</Text>}
      </View>}
      {contactos.map(contacto => <View key={contacto.id} style={[estilos.fila, oscuro && estilos.tarjetaOscura]}>
        <View style={estilos.avatar}><UserRound size={28} color={principal} strokeWidth={2.5} /></View>
        <View style={estilos.datos}>
          <Text style={[estilos.nombre, oscuro && estilos.textoClaro]}>{contacto.nombre}</Text>
          <Text style={[estilos.telefono, oscuro && estilos.secundarioOscuro]}>{contacto.telefono}{contacto.relacion ? ` · ${contacto.relacion}` : null}</Text>
        </View>
        <TouchableOpacity style={estilos.quitar} disabled={ocupado} onPress={() => { establecerErrorQuitar(''); establecerContactoPorQuitar(contacto); }} accessibilityRole="button" accessibilityLabel={`Quitar a ${contacto.nombre}`}>
          <Trash2 size={19} color="#DC2626" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>)}

      {!!error && <View style={estilos.errorCaja}><Text accessibilityRole="alert" style={estilos.error}>{error}</Text>
        {cargaFallida && <TouchableOpacity onPress={cargar} accessibilityRole="button"><Text style={estilos.reintentar}>Reintentar</Text></TouchableOpacity>}
      </View>}
      {ocupado && <View style={estilos.cargando}><ActivityIndicator color={principal} /><Text style={[estilos.cargandoTexto, oscuro && estilos.secundarioOscuro]}>Un momento…</Text></View>}
      {!cargaFallida && contactos.length < 3 && <View style={[estilos.formulario, oscuro && estilos.tarjetaOscura]}>
        <Text style={[estilos.formTitulo, oscuro && estilos.textoClaro]}>Agregar contacto</Text>
        <Text style={[estilos.formDescripcion, oscuro && estilos.secundarioOscuro]}>Añade hasta 3 personas de confianza.</Text>
        <View style={[estilos.campo, oscuro && estilos.campoOscuro]}><View style={estilos.iconoCampo}><UserRound size={20} color="#7A7A8A" strokeWidth={2.5} /></View><View style={[estilos.separadorCampo, oscuro && estilos.separadorOscuro]} /><TextInput style={[estilos.entrada, oscuro && estilos.textoClaro]} placeholder="Nombre del contacto" placeholderTextColor="#9292A0" accessibilityLabel="Nombre del contacto" value={nombre} maxLength={100} onChangeText={establecerNombre} /></View>
        <TouchableOpacity style={[estilos.campo, oscuro && estilos.campoOscuro]} onPress={() => establecerSelectorVisible(true)} accessibilityRole="button" accessibilityLabel={`Relación con el contacto: ${relacion || "seleccionar"}`}><View style={estilos.iconoCampo}><UsersRound size={20} color="#7A7A8A" strokeWidth={2.5} /></View><View style={[estilos.separadorCampo, oscuro && estilos.separadorOscuro]} /><Text style={[estilos.selectorTexto, !relacion && estilos.placeholder, oscuro && relacion && estilos.textoClaro]} numberOfLines={1}>{relacion || "Relación con el contacto"}</Text><ChevronDown size={20} color="#7A7A8A" strokeWidth={2.5} style={estilos.selectorFlecha} /></TouchableOpacity>
        {relacion === "Otra" && <TextInput style={[estilos.campo, estilos.entradaOtra, oscuro && estilos.campoOscuro, oscuro && estilos.textoClaro]} placeholder="Especifica la relación" placeholderTextColor="#9292A0" accessibilityLabel="Especifica la relación" value={otraRelacion} maxLength={50} onChangeText={establecerOtraRelacion} />}
 
        <View style={[estilos.campo, oscuro && estilos.campoOscuro]}><View style={[estilos.prefijo, oscuro && estilos.prefijoOscuro]}><Text style={estilos.bandera}>🇧🇴</Text><Text style={[estilos.prefijoTexto, oscuro && estilos.textoClaro]}>+591</Text></View><View style={[estilos.separadorCampo, oscuro && estilos.separadorOscuro]} /><TextInput style={[estilos.entrada, oscuro && estilos.textoClaro]} placeholder="Número de contacto" placeholderTextColor="#9292A0" accessibilityLabel="Número de celular" value={telefono} keyboardType="phone-pad" maxLength={11} onChangeText={valor => establecerTelefono(formatearTelefono(valor))} /></View>
        <TouchableOpacity style={[estilos.boton, deshabilitado && estilos.botonDeshabilitado]} disabled={deshabilitado} onPress={agregar} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ disabled: deshabilitado }}>
          <Text style={[estilos.botonTexto, deshabilitado && estilos.botonTextoDeshabilitado]}>Agregar contacto</Text>
        </TouchableOpacity>
      </View>}
      <View style={[estilos.aviso, oscuro && estilos.avisoOscuro]}>
        <View style={estilos.iconoAviso}><ShieldCheck size={30} color={principal} strokeWidth={2.5} /></View>
        <View style={estilos.flex}>
          <Text style={[estilos.avisoTitulo, oscuro && estilos.textoClaro]}>Tu seguridad es importante</Text>
          <Text style={[estilos.descripcion, oscuro && estilos.secundarioOscuro]}>Si activas el botón de emergencia, se intentará enviar un SMS a estos contactos con la ubicación disponible.</Text>
        </View>
      </View>

    </ScrollView>
    <Modal visible={selectorVisible} transparent animationType="fade" onRequestClose={() => establecerSelectorVisible(false)}><View style={estilos.modalFondo}><View style={[estilos.modalTarjeta, oscuro && estilos.tarjetaOscura]}><View style={estilos.modalCabecera}><Text style={[estilos.modalTitulo, oscuro && estilos.textoClaro]}>Selecciona la relación</Text><TouchableOpacity onPress={() => establecerSelectorVisible(false)} accessibilityRole="button" accessibilityLabel="Cerrar"><X size={24} color={oscuro ? "#FFFFFF" : "#0D0D0D"} strokeWidth={2.8} /></TouchableOpacity></View><ScrollView>{opcionesRelacion.map(opcion => <TouchableOpacity key={opcion} style={estilos.opcion} onPress={() => { establecerRelacion(opcion); establecerSelectorVisible(false); }} accessibilityRole="button" accessibilityState={{ selected: relacion === opcion }}><Text style={[estilos.opcionTexto, oscuro && estilos.textoClaro, relacion === opcion && estilos.opcionSeleccionada]}>{opcion}</Text></TouchableOpacity>)}</ScrollView></View></View></Modal>
    <ConfirmarInferiorHoja visible={contactoPorQuitar !== null} title="Quitar contacto" message={`¿Quieres quitar a ${contactoPorQuitar?.nombre ?? ""} de tus contactos de emergencia?`} confirmLabel="Quitar contacto" cancelLabel="Cancelar" loading={ocupado} error={errorQuitar} onConfirm={quitar} onCancel={() => establecerContactoPorQuitar(null)} />
  </SafeAreaView>;
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' }, pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  volver: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, espacioCabecera: { width: 42 },
  tituloCabecera: { flex: 1, textAlign: 'center', color: '#0D0D0D', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
  aviso: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0' }, avisoOscuro: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  iconoAviso: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 },
  avisoTitulo: { fontSize: 15, fontWeight: '700', color: '#111118', marginBottom: 5 }, descripcion: { fontSize: 13, color: '#625A6B', lineHeight: 19 },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 2 },
  seccionTitulo: { fontSize: 18, fontWeight: '700', color: '#111118' }, contador: { color: '#7A7A8A', fontSize: 13, fontWeight: '600' },
  fila: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 14, backgroundColor: '#FFFFFF', gap: 12 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' }, avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  datos: { flex: 1 }, nombre: { fontSize: 18, fontWeight: '700', color: '#111118' }, relacionContacto: { fontSize: 14, fontWeight: '500', color: '#7A7A8A' }, telefono: { fontSize: 13, color: '#7A7A8A', marginTop: 4 },
  quitar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  vacio: { borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, padding: 22, alignItems: 'center' }, vacioTitulo: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#111118' }, vacioTexto: { marginTop: 5, fontSize: 13, lineHeight: 19, color: '#7A7A8A', textAlign: 'center' },
  formulario: { marginTop: 10, padding: 16, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, backgroundColor: '#FFFFFF' }, formTitulo: { fontSize: 17, fontWeight: '700', color: '#111118' }, formDescripcion: { fontSize: 13, color: '#7A7A8A', marginTop: 4, marginBottom: 6 },
  campo: { marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 13, minHeight: 58, overflow: 'hidden' }, campoOscuro: { backgroundColor: '#222222', borderColor: '#414141' }, prefijo: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, minHeight: 58, backgroundColor: '#F7F7F9' }, prefijoOscuro: { backgroundColor: '#2D2D2D' }, bandera: { fontSize: 18 }, prefijoTexto: { fontSize: 17, fontWeight: '700', color: '#111118' }, iconoCampo: { width: 52, minHeight: 58, alignItems: 'center', justifyContent: 'center' }, separadorCampo: { width: 1, height: 28, backgroundColor: '#EAEAF0' }, separadorOscuro: { backgroundColor: '#414141' }, entrada: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, color: '#111118', fontSize: 18, fontWeight: '600', letterSpacing: 0.5 }, ayuda: { color: '#7A7A8A', fontSize: 12, marginTop: 7 },
  boton: { marginTop: 20, minHeight: 54, borderRadius: 12, backgroundColor: principal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, botonDeshabilitado: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0' }, botonTextoDeshabilitado: { color: '#9CA3AF' }, botonTexto: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  selectorTexto: { flex: 1, paddingHorizontal: 14, fontSize: 18, fontWeight: '600', color: '#111118', letterSpacing: 0.5 }, placeholder: { color: '#9292A0' }, selectorFlecha: { marginRight: 14 }, entradaOtra: { paddingHorizontal: 14, fontSize: 18, fontWeight: '600', color: '#111118' },
  modalFondo: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' }, modalTarjeta: { maxHeight: '80%', borderRadius: 20, padding: 20, backgroundColor: '#FFFFFF' }, modalCabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, modalTitulo: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111118' }, opcion: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#EAEAF0' }, opcionTexto: { fontSize: 16, color: '#111118' }, opcionSeleccionada: { color: principal, fontWeight: '700' },
  cargando: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 8 }, cargandoTexto: { color: '#7A7A8A', fontSize: 13 }, errorCaja: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, gap: 8 }, error: { color: '#9B1C1C', fontSize: 13 }, reintentar: { color: '#9B1C1C', fontWeight: '700' }, textoClaro: { color: '#FFFFFF' }, secundarioOscuro: { color: '#BDBDC7' }
});




















