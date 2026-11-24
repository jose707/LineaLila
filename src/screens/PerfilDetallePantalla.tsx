import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle, User, X } from 'lucide-react-native';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import ConfirmarInferiorHoja from '../components/ConfirmarInferiorSheet';
import { usarAjustes } from '../context/AjustesContexto';
import { usarAutenticacion } from '../hooks/usarAutenticacion';
import api from '../services/api.cliente';
import { InsigniaPerfilVerificado } from '../theme/icons';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

const lila = '#7514C5';
const formatoAlta = new Intl.DateTimeFormat('es-BO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/La_Paz'
});

export default function PerfilDetallePantalla() {
  const navegacion = useNavigation<NativeStackNavigationProp<RaizPilaParametroLista>>();
  const { user: usuario, updateUser: actualizarUsuario, logout: salir } = usarAutenticacion();
  const { settings: ajustes } = usarAjustes();
  const oscuro = ajustes.darkMode;
  const acento = oscuro ? '#D5A6FF' : lila;
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };
  const verde = oscuro ? '#81DBAB' : '#167348';
  const rojo = oscuro ? '#FCA5A5' : '#B91C1C';
  const ambar = oscuro ? '#F7BF76' : '#8B4A08';
  const foto = usuario?.fotoPerfil || usuario?.urlFoto;
  const tarjeta = [estilos.tarjeta, oscuro && estilos.tarjetaOscura];
  const separador = [estilos.separador, oscuro && estilos.separadorOscuro];

  const [dialogo, establecerDialogo] = useState<'salir' | 'eliminar' | null>(null);
  const [saliendo, establecerSaliendo] = useState(false);
  const [errorSalida, establecerErrorSalida] = useState('');
  const [cargandoFechaRegistro, establecerCargandoFechaRegistro] = useState(false);
  const identidadVerificada = usuario?.estadoVerificacionIdentidad === 'verificado';
  const identidadRechazada = usuario?.estadoVerificacionIdentidad === 'rechazado';
  const identidadEnRevision = usuario?.estadoVerificacionIdentidad === 'pendiente' && usuario.documentosIdentidadEnviados;
  const estadoIdentidad = identidadVerificada ? 'Verificada'
    : identidadRechazada ? 'Rechazada' : identidadEnRevision ? 'En revisión' : 'Sin verificar';
  const colorIdentidad = identidadVerificada ? verde : identidadRechazada ? rojo : identidadEnRevision ? ambar : secundario.color;
  const idCuenta = usuario?.id;
  const fechaRegistro = usuario?.createdAt;
  const alta = fechaRegistro ? new Date(fechaRegistro) : null;

  useFocusEffect(useCallback(() => {
    if (!idCuenta || (fechaRegistro && Number.isFinite(Date.parse(fechaRegistro)))) return;
    let vigente = true;
    establecerCargandoFechaRegistro(true);
    api.obtener<{ user: { id: string; createdAt?: string } }>('/autenticacion/sesion')
      .then(({ user }) => {
        if (vigente && user.id === idCuenta && user.createdAt && Number.isFinite(Date.parse(user.createdAt))) {
          actualizarUsuario({ createdAt: user.createdAt });
        }
      })
      .catch(() => { /* Se puede volver a consultar al abrir el perfil. */ })
      .finally(() => { if (vigente) establecerCargandoFechaRegistro(false); });
    return () => { vigente = false; };
  }, [actualizarUsuario, fechaRegistro, idCuenta]));

  const cerrarSesion = async () => {
    if (saliendo) return;
    establecerSaliendo(true);
    establecerErrorSalida('');
    try {
      await salir();
      establecerDialogo(null);
    } catch {
      establecerErrorSalida('No se pudo cerrar sesión. Intenta nuevamente.');
    } finally {
      establecerSaliendo(false);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, oscuro && estilos.pantallaOscura]}>
      <View style={estilos.cabecera}>
        <TouchableOpacity style={estilos.cerrar} onPress={() => navegacion.goBack()}
          accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[estilos.tituloCabecera, texto]}>Mi perfil</Text>
        <View style={estilos.cerrar} />
      </View>

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.perfil}>
          <View>
            <View style={[estilos.avatar, oscuro && estilos.avatarOscuro, !identidadVerificada && { borderWidth: 0 }]}>
              {foto ? (
                <Image source={privadoImagenOrigen(foto)} style={estilos.foto} />
              ) : (
                <View style={estilos.avatarSinFoto}>
                  <User size={32} color={lila} />
                </View>
              )}
            </View>
            {identidadVerificada && <InsigniaPerfilVerificado etiqueta="Identidad verificada" />}
          </View>
          <View style={estilos.datosPerfil}>
            <Text style={[estilos.nombre, texto]}>{usuario?.nombre || 'Usuario'}</Text>
            {identidadVerificada && (
              <View style={estilos.verificado}>
                <CheckCircle size={15} color={verde} strokeWidth={2.5} />
                <Text style={[estilos.estado, { color: verde }]}>Identidad verificada</Text>
              </View>
            )}
          </View>
        </View>

        <View style={estilos.seccion}>
          <Text accessibilityRole="header" style={[estilos.titulo, texto]}>Cuenta</Text>
          <View style={tarjeta}>
            <View style={estilos.fila}>
              <View style={estilos.datos}>
                <Text style={[estilos.etiqueta, texto]}>Correo electrónico</Text>
                <Text style={[estilos.detalle, secundario]} selectable>{usuario?.correo || 'No registrado'}</Text>
              </View>
            </View>
            <View style={[estilos.fila, separador]}>
              <View style={estilos.datos}>
                <Text style={[estilos.etiqueta, texto]}>Celular</Text>
                <Text style={[estilos.detalle, secundario]} selectable>{usuario?.telefono || 'No registrado'}</Text>
              </View>
            </View>
            {!identidadVerificada && (
              <View style={[estilos.fila, separador]}>
                <View style={estilos.datos}>
                  <Text style={[estilos.etiqueta, texto]}>Identidad</Text>
                  <Text style={[estilos.estado, { color: colorIdentidad }]}>{estadoIdentidad}</Text>
                </View>
              </View>
            )}
            <View style={[estilos.fila, separador]}>
              <View style={estilos.datos}>
                <Text style={[estilos.etiqueta, texto]}>Fecha de registro</Text>
                <Text style={[estilos.detalle, secundario]}>
                  {alta && Number.isFinite(alta.getTime()) ? formatoAlta.format(alta)
                    : cargandoFechaRegistro ? 'Cargando…' : 'No disponible'}
                </Text>
              </View>
            </View>
            {!!usuario?.id && (
              <View style={[estilos.fila, separador]}>
                <View style={estilos.datos}>
                  <Text style={[estilos.etiqueta, texto]}>ID de cuenta</Text>
                  <Text style={[estilos.detalle, secundario]} selectable>{usuario.id}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={[estilos.botonCuenta, estilos.botonEliminar, oscuro && estilos.botonEliminarOscuro]}
          onPress={() => establecerDialogo('eliminar')} accessibilityRole="button" activeOpacity={0.85}>
          <Text style={[estilos.textoBotonCuenta, { color: rojo }]}>Eliminar mi cuenta</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={estilos.pie}>
        <TouchableOpacity style={[estilos.botonCuenta, estilos.botonSalida]} activeOpacity={0.85}
          accessibilityRole="button" disabled={saliendo}
          onPress={() => { establecerErrorSalida(''); establecerDialogo('salir'); }}>
          <Text style={[estilos.textoBotonCuenta, estilos.textoSalida]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
      <ConfirmarInferiorHoja visible={dialogo !== null}
        title={dialogo === 'eliminar' ? 'Eliminar mi cuenta' : 'Cerrar sesión'}
        message={dialogo === 'eliminar' ? 'Contacta a administración desde Soporte para solicitar la eliminación de tu cuenta.' : '¿Quieres cerrar sesión en tu cuenta?'}
        confirmLabel={dialogo === 'eliminar' ? 'Ir a Soporte' : 'Cerrar sesión'}
        cancelLabel="Cancelar" loading={saliendo} error={dialogo === 'salir' ? errorSalida : undefined}
        onCancel={() => establecerDialogo(null)}
        onConfirm={dialogo === 'eliminar' ? () => { establecerDialogo(null); navegacion.navigate('Support'); } : cerrarSesion} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  tituloCabecera: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 20 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#F3EAFC', overflow: 'hidden' },
  avatarOscuro: { backgroundColor: '#3D3D3D' },
  avatarSinFoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  foto: { width: '100%', height: '100%' },
  datosPerfil: { flex: 1, gap: 4 },
  nombre: { fontSize: 22, fontWeight: '700' },
  verificado: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seccion: { gap: 10 },
  titulo: { fontSize: 18, fontWeight: '700' },
  tarjeta: { borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 14, paddingHorizontal: 14 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  separadorOscuro: { borderTopColor: '#4A4A4A' },
  datos: { flex: 1, gap: 4 },
  etiqueta: { fontSize: 15, fontWeight: '600' },
  detalle: { fontSize: 14, lineHeight: 20 },
  estado: { fontSize: 13, fontWeight: '700' },
  pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  botonCuenta: { minHeight: 54, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },
  textoBotonCuenta: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  botonEliminar: { backgroundColor: '#FEF2F2', borderColor: 'transparent' },
  botonEliminarOscuro: { backgroundColor: '#3D2424' },
  botonSalida: { borderColor: '#111118', backgroundColor: '#FFFFFF' },
  textoSalida: { color: '#111118' }
});
