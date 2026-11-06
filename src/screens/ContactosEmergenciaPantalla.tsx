import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api.cliente';

type Contacto = { id: string; nombre: string; telefono: string };
const ruta = '/usuarios/contactos-emergencia';

export default function ContactosEmergenciaPantalla() {
  const [contactos, establecerContactos] = useState<Contacto[]>([]);
  const [nombre, establecerNombre] = useState('');
  const [telefono, establecerTelefono] = useState('');
  const [ocupado, establecerOcupado] = useState(true);
  const [error, establecerError] = useState('');

  const cargar = async () => {
    establecerOcupado(true);
    establecerError('');
    try {
      establecerContactos((await api.obtener<{ contactos: Contacto[] }>(ruta)).contactos);
    } catch {
      establecerError('No se pudieron cargar los contactos.');
    } finally {
      establecerOcupado(false);
    }
  };
  useEffect(() => { void cargar(); }, []);

  const agregar = async () => {
    establecerOcupado(true);
    establecerError('');
    try {
      const { contacto } = await api.post<{ contacto: Contacto }>(ruta, { nombre, telefono });
      establecerContactos(anterior => [...anterior, contacto]);
      establecerNombre('');
      establecerTelefono('');
    } catch (fallo: any) {
      establecerError(fallo?.data?.error || 'No se pudo agregar el contacto.');
    } finally {
      establecerOcupado(false);
    }
  };
  const quitar = (contacto: Contacto) => Alert.alert('Quitar contacto', `¿Quitar a ${contacto.nombre}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Quitar', style: 'destructive', onPress: async () => {
      establecerOcupado(true);
      establecerError('');
      try {
        await api.eliminar(`${ruta}/${contacto.id}`);
        establecerContactos(anterior => anterior.filter(actual => actual.id !== contacto.id));
      } catch {
        establecerError('No se pudo quitar el contacto.');
      } finally {
        establecerOcupado(false);
      }
    } }
  ]);

  return <SafeAreaView style={estilos.pantalla} edges={['bottom']}>
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Text style={estilos.descripcion}>Si activas el botón de emergencia, se intentará enviar un SMS a estos contactos con la ubicación disponible.</Text>
      {contactos.map(contacto => <View key={contacto.id} style={estilos.fila}>
        <View style={estilos.datos}><Text style={estilos.nombre}>{contacto.nombre}</Text><Text>{contacto.telefono}</Text></View>
        <Button title="Quitar" disabled={ocupado} onPress={() => quitar(contacto)} />
      </View>)}
      {!ocupado && !error && !contactos.length && <Text>Todavía no tienes contactos registrados.</Text>}
      {contactos.length < 5 && <>
        <TextInput style={estilos.campo} placeholder="Nombre del contacto" accessibilityLabel="Nombre del contacto" value={nombre} maxLength={100} onChangeText={establecerNombre} />
        <TextInput style={estilos.campo} placeholder="Teléfono con código de país" accessibilityLabel="Teléfono con código de país" value={telefono} keyboardType="phone-pad" maxLength={30} onChangeText={establecerTelefono} />
        <Button title="Agregar contacto" color="#7514C5" disabled={ocupado || !nombre.trim() || !telefono.trim()} onPress={agregar} />
      </>}
      {ocupado && <Text>Un momento…</Text>}
      {!!error && <Text accessibilityRole="alert" style={estilos.error}>{error}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#fff' },
  contenido: { padding: 20, gap: 14 },
  descripcion: { color: '#444', lineHeight: 21 },
  fila: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#F7F7F9' },
  datos: { flex: 1 }, nombre: { fontWeight: '600', color: '#222' },
  campo: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, color: '#222' },
  error: { color: '#9B1C1C' }
});
