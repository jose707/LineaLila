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
import { cambiarPermisoConductor, obtenerFichaConductor, type FichaConductorOperativo } from '../services/admin.servicio';
import { estadosComision } from '../services/comisiones.servicio';

const vehiculoTipos: Record<string, string> = { taxi: 'Taxi', minibus: 'Minibús', bus: 'Bus', motocicleta: 'Motocicleta' };
const formatoDinero = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoMes = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dinero = (valor: number) => 'Bs ' + formatoDinero.format(valor);
const mes = (periodo: string) => {
  const fecha = new Date(periodo.slice(0, 10) + 'T12:00:00Z');
  return Number.isFinite(fecha.getTime()) ? formatoMes.format(fecha) : periodo;
};

export default function AdminConductorDetallePantalla({ navigation, route }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminDriverDetails'>) {
  const { conductorId } = route.params;
  const [ficha, setFicha] = useState<FichaConductorOperativo | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [confirmacion, setConfirmacion] = useState<'suspender' | 'reactivar' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorCambio, setErrorCambio] = useState('');
  const [resultado, setResultado] = useState('');
  const operacion = useRef(false);

  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setError(false);
    obtenerFichaConductor(conductorId)
      .then(datos => { if (vigente) setFicha(datos); })
      .catch(() => { if (vigente) setError(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [conductorId, recarga]));

  const suspendido = ficha?.estado === 'suspendido';
  const enServicio = !!ficha?.cuentaActiva && !suspendido && ficha.disponible;
  const viajeActivo = ficha?.viajeActivo;
  const viajeEnCurso = viajeActivo?.estado === 'en_curso' ? viajeActivo : null;
  const estadoActual = !enServicio ? 'Fuera de servicio'
    : viajeActivo === null ? 'Recibiendo solicitudes' : null;
  const accion = suspendido ? 'Reactivar conducción' : 'Suspender conducción';
  const confirmarSuspension = confirmacion === 'suspender';
  const mensajeConfirmacion = confirmarSuspension
    ? 'Se suspenderá el permiso para ponerse disponible y aceptar viajes como conductor.'
    : ficha?.cuentaActiva
      ? 'El conductor podrá ponerse disponible y aceptar viajes.'
      : 'Para conducir, también debe habilitarse la cuenta desde Detalle del usuario.';
  const guardar = async () => {
    if (!confirmacion || operacion.current || !motivo.trim()) return;
    operacion.current = true;
    setEnviando(true);
    setErrorCambio('');
    try {
      const respuesta = await cambiarPermisoConductor(conductorId, confirmarSuspension, motivo.trim());
      setFicha(actual => actual && { ...actual, estado: respuesta.driver.status, disponible: respuesta.driver.isAvailable });
      setResultado(confirmarSuspension ? 'Conducción suspendida.' : 'Conducción reactivada.');
      setConfirmacion(null);
      setPidiendoMotivo(false);
      setMotivo('');
      setRecarga(actual => actual + 1);
    } catch (problema) {
      setErrorCambio(problema instanceof Error ? problema.message : 'No se pudo cambiar el permiso.');
    } finally {
      operacion.current = false;
      setEnviando(false);
    }
  };

  const abrirPagos = (conductor: FichaConductorOperativo, comision?: FichaConductorOperativo['comisiones'][number]) =>
    navigation.push('AdminPayments', {
      conductor: { id: conductor.id, nombre: conductor.nombre },
      periodo: (comision ?? conductor.comisiones[0])?.periodo.slice(0, 7),
      liquidacionId: comision?.id
    });

  return (
    <MarcoDetallePersona titulo="Detalle del conductor" cerrar={navigation.goBack} ocupado={enviando}>
      {cargando && !ficha && <ActivityIndicator color={C.lila} accessibilityLabel="Cargando conductor" />}
      {error && (
        <View style={s.aviso}>
          <Text style={s.error} accessibilityRole="alert">No se pudo cargar el detalle del conductor.</Text>
          <EnlaceDetallePersona etiqueta="Reintentar" onPress={() => setRecarga(actual => actual + 1)} />
        </View>
      )}
      {ficha && (
        <>
          <ResumenDetallePersona nombre={ficha.nombre} foto={ficha.foto}
            estado={!ficha.cuentaActiva ? 'Desactivado' : suspendido ? 'Suspendido' : 'Verificado'}
            disponible={enServicio} />
          {(estadoActual || viajeEnCurso) && (
            <SeccionDetallePersona titulo="Estado actual">
              {viajeEnCurso ? (
                <EnlaceDetallePersona etiqueta="Viaje en curso"
                  onPress={() => navigation.push('AdminRideDetails', { rideId: viajeEnCurso.id })} />
              ) : <Text style={[s.fila, s.valor]}>{estadoActual}</Text>}
            </SeccionDetallePersona>
          )}
          <SeccionDetallePersona titulo="Contacto y licencia">
            <DatoDetallePersona etiqueta="Correo" valor={ficha.correo} />
            <DatoDetallePersona etiqueta="Teléfono" valor={ficha.telefono} />
            <DatoDetallePersona etiqueta="Licencia de conducir" valor={ficha.licencia} />
            <DatoDetallePersona etiqueta="Vencimiento de licencia" valor={fechaDetalle(ficha.vencimientoLicencia)} />
            <EnlaceDetallePersona etiqueta="Ver documentos"
              onPress={() => navigation.push('AdminDocuments', { usuarioId: ficha.usuarioId, origen: 'conductor' })} />
            <EnlaceDetallePersona etiqueta="Ver detalle de usuario" onPress={() => navigation.push('AdminUserDetails', { usuarioId: ficha.usuarioId })} />
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Vehículos">
            {ficha.vehiculos.length ? ficha.vehiculos.map((vehiculo, indice) => (
              <View key={vehiculo.id} style={[s.fila, indice > 0 && s.separador]}>
                <Text style={s.valor}>{vehiculo.plate} · {vehiculo.brand} {vehiculo.model}</Text>
                <Text style={s.secundario}>{[vehiculoTipos[vehiculo.vehicle_type], vehiculo.year, vehiculo.color].filter(Boolean).join(' · ')}</Text>
                <Text style={s.secundario}>Vencimiento del SOAT · {fechaDetalle(vehiculo.soatExpiryDate)}</Text>
                <Text style={s.secundario}>RUAT · {vehiculo.ruatRequired ? 'Revisión requerida' : vehiculo.ruatVerified ? 'Verificado' : 'Sin verificar'}</Text>
              </View>
            )) : <Text style={[s.secundario, s.fila]}>Sin vehículos registrados.</Text>}
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Viajes">
            <EnlaceDetallePersona etiqueta="Ver viajes como conductor" onPress={() => navigation.push('AdminRides', { driverId: conductorId })} />
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Comisiones mensuales">
            <DatoDetallePersona etiqueta="Saldo pendiente" valor={dinero(ficha.saldoPendiente)} />
            {ficha.comisiones.length ? ficha.comisiones.map(comision => (
              <Pressable key={comision.id} style={[s.fila, s.separador]} accessibilityRole="button" onPress={() => abrirPagos(ficha, comision)}>
                <Text style={s.enlaceTexto}>{mes(comision.periodo)} · {estadosComision[comision.estado as keyof typeof estadosComision] || comision.estado}</Text>
                <Text style={s.secundario}>Comisión {dinero(comision.total)} · Pagado {dinero(comision.pagado)}</Text>
                <Text style={s.secundario}>Saldo {dinero(comision.saldo)}{comision.vence ? ' · Vence ' + fechaDetalle(comision.vence) : ''}</Text>
              </Pressable>
            )) : <Text style={[s.secundario, s.fila]}>Sin liquidaciones registradas.</Text>}
            <EnlaceDetallePersona etiqueta="Ir a Pagos e ingresos" onPress={() => abrirPagos(ficha)} />
          </SeccionDetallePersona>
          <SeccionDetallePersona titulo="Historial de conducción">
            {ficha.historial.length ? ficha.historial.map((cambio, indice) => (
              <View key={cambio.id} style={[s.fila, indice > 0 && s.separador]}>
                <Text style={s.valor}>{cambio.estado === 'suspendido' ? 'Conducción suspendida' : 'Conducción reactivada'}</Text>
                <Text style={s.secundario}>{fechaDetalle(cambio.fecha, true)} · {cambio.administrador || 'Administrador sin identificar'}</Text>
                <Text style={s.secundario}>{cambio.motivo}</Text>
              </View>
            )) : <Text style={[s.secundario, s.fila]}>Sin cambios registrados.</Text>}
          </SeccionDetallePersona>
          {!!resultado && <Text style={s.exito} accessibilityLiveRegion="polite">{resultado}</Text>}
          {pidiendoMotivo && (
            <>
              <Text style={s.valor}>{suspendido ? 'Motivo de reactivación' : 'Motivo de suspensión'}</Text>
              <TextInput style={s.motivo} value={motivo} onChangeText={setMotivo} maxLength={500} multiline
                placeholder="Escribe el motivo" placeholderTextColor={C.secundario} accessibilityLabel="Motivo del cambio de conducción" />
              <EnlaceDetallePersona etiqueta="Cancelar" onPress={() => { setPidiendoMotivo(false); setMotivo(''); }} />
            </>
          )}
          <Pressable style={[s.accion, !suspendido && s.accionSecundaria, (cargando || error || (pidiendoMotivo && !motivo.trim())) && s.atenuado]}
            accessibilityRole="button" disabled={cargando || error || enviando || (pidiendoMotivo && !motivo.trim())}
            onPress={() => {
              if (!pidiendoMotivo) {
                setPidiendoMotivo(true);
                return;
              }
              Keyboard.dismiss();
              setConfirmacion(suspendido ? 'reactivar' : 'suspender');
            }}>
            <Text style={[s.accionTexto, !suspendido && s.accionTextoSecundario]}>{pidiendoMotivo ? 'Revisar cambio' : accion}</Text>
          </Pressable>
        </>
      )}
      <ConfirmarInferiorHoja visible={confirmacion !== null} title={confirmarSuspension ? 'Suspender conducción' : 'Reactivar conducción'}
        message={mensajeConfirmacion}
        confirmLabel={confirmarSuspension ? 'Suspender' : 'Reactivar'} cancelLabel="Cancelar" stackedActions
        loading={enviando} error={errorCambio} onConfirm={guardar}
        onCancel={() => { setConfirmacion(null); setErrorCambio(''); }} />
    </MarcoDetallePersona>
  );
}
