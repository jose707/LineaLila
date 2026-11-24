import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  coloresDetalle as C, DatoDetallePersona, EnlaceDetallePersona, estilosDetallePersona as s, fechaDetalle,
  MarcoDetallePersona, ResumenDetallePersona, SeccionDetallePersona
} from '../components/AdminDetallePersona';
import ConfirmarInferiorHoja from '../components/ConfirmarInferiorSheet';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { eliminarUsuario, enableUsuario, obtenerDetalleUsuario, type DetalleAdministrativoUsuario } from '../services/admin.servicio';

const roles = { pasajero: 'Pasajero', conductor: 'Conductor', administrador: 'Administrador' };
const identidad: Record<string, string> = { verificado: 'Verificada', pendiente: 'Pendiente', rechazado: 'Rechazada' };
const solicitudes: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobada', rechazado: 'Rechazada', observado: 'Observada' };

export default function AdminUsuarioDetallePantalla({ navigation, route }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminUserDetails'>) {
  const { usuarioId } = route.params;
  const [detalle, setDetalle] = useState<DetalleAdministrativoUsuario | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [confirmacion, setConfirmacion] = useState<'habilitar' | 'desactivar' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState('');
  const [resultado, setResultado] = useState('');
  const operacion = useRef(false);

  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setError(false);
    obtenerDetalleUsuario(usuarioId)
      .then(datos => {
        if (!datos.usuario) throw new Error('El servidor no devolvió la ficha del usuario.');
        if (vigente) setDetalle(datos);
      })
      .catch(() => { if (vigente) setError(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuarioId, recarga]));

  const usuario = detalle?.usuario;
  const esActivo = usuario?.activo === true;
  const solicitud = detalle?.solicitudConductor;
  const habilitar = confirmacion === 'habilitar';
  const cancelar = () => { setConfirmacion(null); setErrorAcceso(''); };
  const guardar = async () => {
    if (!confirmacion || operacion.current) return;
    operacion.current = true;
    setEnviando(true);
    setErrorAcceso('');
    try {
      if (habilitar) await enableUsuario(usuarioId);
      else await eliminarUsuario(usuarioId, motivo.trim());
      setDetalle(actual => actual && { ...actual, usuario: { ...actual.usuario, activo: habilitar } });
      setResultado(habilitar ? 'Usuario habilitado.' : 'Usuario desactivado.');
      setConfirmacion(null);
      setPidiendoMotivo(false);
      setMotivo('');
      setRecarga(actual => actual + 1);
    } catch (problema) {
      setErrorAcceso(problema instanceof Error ? problema.message : 'No se pudo actualizar el acceso.');
    } finally {
      operacion.current = false;
      setEnviando(false);
    }
  };

  return (
    <MarcoDetallePersona titulo="Detalle del usuario" cerrar={navigation.goBack} ocupado={enviando}>
      {cargando && !usuario && <ActivityIndicator color={C.lila} accessibilityLabel="Cargando usuario" />}
      {error && (
        <View style={s.aviso}>
          <Text style={s.error} accessibilityRole="alert">No se pudo cargar el detalle del usuario.</Text>
          <EnlaceDetallePersona etiqueta="Reintentar" onPress={() => setRecarga(actual => actual + 1)} />
        </View>
      )}
      {usuario && detalle && (
        <>
          <ResumenDetallePersona nombre={usuario.nombre} foto={usuario.foto}
            estado={!esActivo ? 'Desactivado' : usuario.estadoIdentidad === 'verificado' ? 'Verificado' : 'Sin verificar'} />
          <SeccionDetallePersona titulo="Cuenta">
            <DatoDetallePersona etiqueta="Rol" valor={roles[usuario.rol]} />
            <DatoDetallePersona etiqueta="Correo" valor={usuario.correo} />
            <DatoDetallePersona etiqueta="Teléfono" valor={usuario.telefono} />
            <DatoDetallePersona etiqueta="Fecha de registro" valor={fechaDetalle(usuario.fechaRegistro)} />
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Verificación">
            <DatoDetallePersona etiqueta="Identidad" valor={usuario.estadoIdentidad ? identidad[usuario.estadoIdentidad] ?? usuario.estadoIdentidad : 'Sin registro'} />
            <DatoDetallePersona etiqueta="Viajes completados como pasajero" valor={String(usuario.viajesCompletadosPasajero)} />
            <DatoDetallePersona etiqueta="Verificación requerida para solicitar viajes" valor={usuario.verificacionIdentidadRequerida ? 'Sí' : 'No'} />
            <DatoDetallePersona etiqueta="Número de celular" valor={usuario.telefonoVerificado ? 'Verificado' : 'Sin verificar'} />
            <EnlaceDetallePersona etiqueta="Ver documentos"
              onPress={() => navigation.push('AdminDocuments', { usuarioId, origen: 'usuario' })} />
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Viajes">
            <EnlaceDetallePersona etiqueta="Ver viajes como pasajero" onPress={() => navigation.push('AdminRides', { passengerId: usuarioId })} />
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Solicitud de conductor">
            {solicitud ? (
              <>
                <DatoDetallePersona etiqueta="Estado" valor={solicitudes[solicitud.status] ?? solicitud.status} />
                <EnlaceDetallePersona etiqueta={solicitud.version > 1 ? 'Abrir revisión · V' + solicitud.version : 'Abrir revisión'}
                  onPress={() => navigation.push('AdminDriverRequestDetails', { usuarioId })} />
              </>
            ) : <Text style={[s.secundario, s.fila]}>El usuario aún no ha enviado una solicitud.</Text>}
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Historial de administración">
            {!esActivo && <DatoDetallePersona etiqueta="Motivo de desactivación" valor={detalle.historial.find(cambio => !cambio.activo)?.motivo} />}
            {detalle.historial.length ? detalle.historial.map((cambio, indice) => (
              <View key={cambio.id} style={[s.fila, (indice > 0 || !esActivo) && s.separador]}>
                <Text style={s.valor}>{cambio.activo ? 'Cuenta habilitada' : 'Cuenta desactivada'}</Text>
                <Text style={s.secundario}>{fechaDetalle(cambio.fecha, true)} · {cambio.administrador || 'Administrador sin identificar'}</Text>
                {!!cambio.motivo && <Text style={s.secundario}>{cambio.motivo}</Text>}
              </View>
            )) : <Text style={[s.secundario, s.fila]}>Sin cambios registrados.</Text>}
          </SeccionDetallePersona>
          {!!resultado && <Text style={s.exito} accessibilityLiveRegion="polite">{resultado}</Text>}
          {pidiendoMotivo && (
            <>
              <Text style={s.valor}>Motivo de desactivación</Text>
              <TextInput style={s.motivo} value={motivo} onChangeText={setMotivo} maxLength={500} multiline
                placeholder="Escribe el motivo" placeholderTextColor={C.secundario} accessibilityLabel="Motivo de desactivación" />
              <EnlaceDetallePersona etiqueta="Cancelar" onPress={() => { setPidiendoMotivo(false); setMotivo(''); }} />
            </>
          )}
          <Pressable style={[s.accion, esActivo && s.accionSecundaria, (cargando || error || (pidiendoMotivo && !motivo.trim())) && s.atenuado]}
            accessibilityRole="button" disabled={cargando || error || enviando || (pidiendoMotivo && !motivo.trim())}
            onPress={() => {
              if (esActivo && !pidiendoMotivo) {
                setPidiendoMotivo(true);
                return;
              }
              Keyboard.dismiss();
              setConfirmacion(esActivo ? 'desactivar' : 'habilitar');
            }}>
            <Text style={[s.accionTexto, esActivo && s.accionTextoSecundario]}>
              {esActivo ? pidiendoMotivo ? 'Revisar desactivación' : 'Desactivar usuario' : 'Habilitar usuario'}
            </Text>
          </Pressable>
        </>
      )}
      <ConfirmarInferiorHoja visible={confirmacion !== null} title={habilitar ? 'Habilitar usuario' : 'Desactivar usuario'}
        message={(usuario?.nombre ?? 'El usuario') + (habilitar ? ' recuperará el acceso a la aplicación.' : ' perderá el acceso a la aplicación.')}
        confirmLabel={habilitar ? 'Habilitar' : 'Desactivar'} cancelLabel="Cancelar" stackedActions
        loading={enviando} error={errorAcceso} onConfirm={guardar} onCancel={cancelar} />
    </MarcoDetallePersona>
  );
}
