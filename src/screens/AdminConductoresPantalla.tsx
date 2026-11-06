import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Car, Check, ChevronRight, Menu, Search, X } from 'lucide-react-native';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { cambiarPermisoConductor, listarConductoresOperativos, obtenerFichaConductor } from '../services/admin.servicio';
import type { ConductorOperativo, EstadoConduccion, FichaConductorOperativo } from '../services/admin.servicio';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';
import { estadosComision } from '../services/comisiones.servicio';

const C = { blanco: '#FFFFFF', fondo: '#F7F7F9', tinta: '#111118', gris: '#666673', borde: '#EAEAF0', morado: '#7514C5', lila: '#F3EAFC', verde: '#16A34A', rojo: '#DC2626' };
const LIMITE = 25;
const filtroOpciones: { estado: EstadoConduccion | undefined; etiqueta: string }[] = [
  { estado: undefined, etiqueta: 'Todos' }, { estado: 'aprobado', etiqueta: 'Habilitados' }, { estado: 'suspendido', etiqueta: 'Suspendidos' }
];
const vehiculoTipos: Record<string, string> = { taxi: 'Taxi', minibus: 'Minibús', bus: 'Bus', motocicleta: 'Motocicleta' };
const formatoDinero = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoFecha = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz' });
const formatoMes = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function dinero(valor: number) { return `Bs ${formatoDinero.format(valor)}`; }

function fecha(valor: string | null) {
  if (!valor) return 'Sin registrar';
  const dia = new Date(valor.length === 10 ? `${valor}T12:00:00Z` : valor);
  return Number.isNaN(dia.getTime()) ? 'Sin registrar' : formatoFecha.format(dia);
}

function estadoTexto(conductor: ConductorOperativo) {
  if (conductor.estado === 'suspendido') return 'Conducción suspendida';
  if (!conductor.cuentaActiva) return 'Cuenta inactiva';
  return conductor.disponible ? 'Disponible' : 'Habilitado · no disponible';
}

function Avatar({ conductor, grande = false }: { conductor: ConductorOperativo; grande?: boolean }) {
  const [fallida, setFallida] = useState<string | null>(null);
  const iniciales = conductor.nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
  return <View style={[s.avatar, grande && s.avatarGrande]}>
    {conductor.foto && fallida !== conductor.foto ? (
      <Image style={s.foto} source={privadoImagenOrigen(conductor.foto)} onError={() => setFallida(conductor.foto)} />
    ) : <Text style={[s.iniciales, grande && s.inicialesGrandes]}>{iniciales}</Text>}
  </View>;
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return <View style={s.dato}>
    <Text style={s.secundario}>{etiqueta}</Text>
    <Text style={s.valor}>{valor || 'Sin registrar'}</Text>
  </View>;
}

export default function AdminConductoresPantalla({ navigation }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminDrivers'>) {
  const [conductores, setConductores] = useState<ConductorOperativo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [consulta, setConsulta] = useState('');
  const [buscar, setBuscar] = useState(false);
  const [filtros, setFiltros] = useState(false);
  const [estado, setEstado] = useState<EstadoConduccion>();
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState(false);
  const [recargar, setRecargar] = useState(0);
  const [seleccionado, setSeleccionado] = useState<ConductorOperativo | null>(null);
  const [ficha, setFicha] = useState<FichaConductorOperativo | null>(null);
  const [errorFicha, setErrorFicha] = useState(false);
  const [recargarFicha, setRecargarFicha] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorCambio, setErrorCambio] = useState('');

  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setErrorLista(false);
    const espera = setTimeout(() => {
      listarConductoresOperativos(LIMITE, pagina * LIMITE, consulta.trim(), estado)
        .then(resultado => {
          if (!vigente) return;
          setConductores(resultado.conductores);
          setTotal(resultado.total);
          const ultima = Math.max(0, Math.ceil(resultado.total / LIMITE) - 1);
          if (pagina > ultima) setPagina(ultima);
        })
        .catch(() => { if (vigente) setErrorLista(true); })
        .finally(() => { if (vigente) setCargando(false); });
    }, consulta.trim() ? 250 : 0);
    return () => { vigente = false; clearTimeout(espera); };
  }, [pagina, consulta, estado, recargar]));

  const seleccionadoId = seleccionado?.id;
  useEffect(() => {
    if (!seleccionadoId) return;
    let vigente = true;
    setErrorFicha(false);
    obtenerFichaConductor(seleccionadoId)
      .then(resultado => { if (vigente) setFicha(resultado); })
      .catch(() => { if (vigente) setErrorFicha(true); });
    return () => { vigente = false; };
  }, [seleccionadoId, recargarFicha]);

  const conductor = ficha ?? seleccionado;
  const suspender = conductor?.estado === 'aprobado';
  const cerrarDetalle = () => { if (!enviando) { setSeleccionado(null); setFicha(null); } };
  const abrir = (item: ConductorOperativo) => {
    setFicha(null);
    setErrorFicha(false);
    setConfirmando(false);
    setMotivo('');
    setErrorCambio('');
    setSeleccionado(item);
  };

  const guardar = async () => {
    if (!conductor || enviando || !motivo.trim()) return;
    setEnviando(true);
    setErrorCambio('');
    try {
      const resultado = await cambiarPermisoConductor(conductor.id, suspender, motivo.trim());
      const cambio = { estado: resultado.driver.status, disponible: resultado.driver.isAvailable };
      setFicha(actual => actual && { ...actual, ...cambio });
      setSeleccionado(actual => actual && { ...actual, ...cambio });
      setConfirmando(false);
      setMotivo('');
      setRecargarFicha(actual => actual + 1);
      setRecargar(actual => actual + 1);
    } catch (problema) {
      setErrorCambio(problema instanceof Error ? problema.message : 'No se pudo cambiar el permiso.');
    } finally {
      setEnviando(false);
    }
  };

  return <SafeAreaView style={s.pantalla}>
    <StatusBar barStyle="dark-content" />
    <View style={s.cabecera}>
      <Pressable style={s.control} accessibilityRole="button" accessibilityLabel="Cerrar gestión de conductores" onPress={() => navigation.goBack()}><X size={24} color={C.tinta} strokeWidth={2.8} /></Pressable>
      <Text style={s.titulo}>Gestión de conductores</Text>
      <Pressable style={s.control} accessibilityRole="button" accessibilityLabel={buscar ? 'Cerrar búsqueda' : 'Buscar conductores'} onPress={() => { setBuscar(!buscar); setConsulta(''); setPagina(0); }}><Search size={20} color={buscar ? C.morado : C.tinta} strokeWidth={2.8} /></Pressable>
      <Pressable style={s.control} accessibilityRole="button" accessibilityLabel="Filtrar conductores" onPress={() => setFiltros(true)}><Menu size={22} color={estado ? C.morado : C.tinta} strokeWidth={2.8} /></Pressable>
    </View>
    {buscar && <View style={s.buscador}>
      <Search size={16} color={C.gris} />
      <TextInput style={s.entrada} autoFocus autoCapitalize="none" placeholder="Nombre, placa, correo o teléfono" placeholderTextColor={C.gris}
        accessibilityLabel="Buscar conductores" value={consulta} onChangeText={texto => { setConsulta(texto); setPagina(0); }} />
    </View>}
    <FlatList
      data={cargando || errorLista ? [] : conductores} keyExtractor={item => item.id} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<Text style={s.resumen}>{filtroOpciones.find(opcion => opcion.estado === estado)?.etiqueta}{!cargando && !errorLista ? ` · ${total}` : ''}</Text>}
      ListEmptyComponent={cargando ? <ActivityIndicator color={C.morado} style={s.espacio} /> : <View style={s.vacio}>
        <Car size={26} color={C.morado} /><Text style={s.nombre}>{errorLista ? 'No se pudieron cargar los conductores.' : 'Sin conductores para mostrar'}</Text>
        {errorLista && <Pressable onPress={() => setRecargar(actual => actual + 1)} accessibilityRole="button"><Text style={s.enlaceTexto}>Reintentar</Text></Pressable>}
      </View>}
      ListFooterComponent={!cargando && !errorLista && total > LIMITE ? <View style={s.paginacion}>
        <Pressable disabled={!pagina} onPress={() => setPagina(actual => actual - 1)} accessibilityRole="button"><Text style={[s.enlaceTexto, !pagina && s.atenuado]}>Anterior</Text></Pressable>
        <Text style={s.secundario}>{pagina + 1} de {Math.ceil(total / LIMITE)}</Text>
        <Pressable disabled={(pagina + 1) * LIMITE >= total} onPress={() => setPagina(actual => actual + 1)} accessibilityRole="button"><Text style={[s.enlaceTexto, (pagina + 1) * LIMITE >= total && s.atenuado]}>Siguiente</Text></Pressable>
      </View> : null}
      renderItem={({ item }) => {
        const vehiculo = item.vehiculos.find(actual => actual.status === 'activo') ?? item.vehiculos[0];
        return <Pressable style={s.tarjeta} onPress={() => abrir(item)} accessibilityRole="button">
          <Avatar conductor={item} />
          <View style={s.flex}>
            <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
            <Text style={s.secundario} numberOfLines={1}>{vehiculo ? `${vehiculo.plate} · ${vehiculo.brand} ${vehiculo.model}` : 'Sin vehículo registrado'}</Text>
            <Text style={s.secundario}>{estadoTexto(item)}</Text>
          </View>
          <View style={[s.punto, { backgroundColor: item.estado === 'suspendido' || !item.cuentaActiva ? C.rojo : item.disponible ? C.verde : C.gris }]} />
        </Pressable>;
      }}
    />

    <Modal visible={filtros} transparent animationType="fade" onRequestClose={() => setFiltros(false)}>
      <SafeAreaView style={s.fondoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltros(false)} accessibilityLabel="Cerrar filtros" />
        <View style={s.panelFiltros}>
          <View style={s.cabecera}>
            <Text style={[s.titulo, s.izquierda]}>Estado de conducción</Text>
            <Pressable style={s.control} onPress={() => setFiltros(false)} accessibilityRole="button" accessibilityLabel="Cerrar filtros"><X size={24} color={C.tinta} strokeWidth={2.8} /></Pressable>
          </View>
          {filtroOpciones.map(opcion => <Pressable key={opcion.etiqueta} style={[s.opcion, estado === opcion.estado && s.lila]}
            accessibilityRole="radio" accessibilityState={{ checked: estado === opcion.estado }} onPress={() => { setEstado(opcion.estado); setPagina(0); setFiltros(false); }}>
            <Text style={s.nombre}>{opcion.etiqueta}</Text>
            {estado === opcion.estado && <Check size={18} color={C.morado} strokeWidth={2.8} />}
          </Pressable>)}
        </View>
      </SafeAreaView>
    </Modal>

    <Modal visible={seleccionado !== null} animationType="slide" onRequestClose={cerrarDetalle}>
      {conductor && <SafeAreaView style={s.pantalla}>
        <StatusBar barStyle="dark-content" />
        <View style={s.cabecera}>
          <Pressable style={s.control} onPress={cerrarDetalle} disabled={enviando} accessibilityRole="button" accessibilityLabel="Cerrar ficha"><X size={24} color={C.tinta} strokeWidth={2.8} /></Pressable>
          <Text style={s.titulo}>Ficha del conductor</Text><View style={s.control} />
        </View>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
          <View style={s.perfil}>
            <Avatar conductor={conductor} grande />
            <View style={s.flex}><Text style={s.nombrePerfil}>{conductor.nombre}</Text><Text style={s.secundario}>{estadoTexto(conductor)}</Text></View>
          </View>
          <View style={s.bloque}>
            <Text style={s.nombre}>Contacto y licencia</Text>
            <FilaDato etiqueta="Correo" valor={conductor.correo} />
            <FilaDato etiqueta="Teléfono" valor={conductor.telefono} />
            <FilaDato etiqueta="Licencia de conducir" valor={conductor.licencia} />
            <FilaDato etiqueta="Vencimiento de licencia" valor={fecha(conductor.vencimientoLicencia)} />
            <Pressable style={s.enlace} accessibilityRole="button" onPress={() => { cerrarDetalle(); navigation.navigate('AdminDriverRegistration', { usuarioId: conductor.usuarioId }); }}>
              <Text style={s.enlaceTexto}>Ver solicitud y documentos</Text><ChevronRight size={18} color={C.morado} />
            </Pressable>
          </View>
          <View style={s.bloque}>
            <Text style={s.nombre}>Vehículos</Text>
            {conductor.vehiculos.length ? conductor.vehiculos.map(vehiculo => <View key={vehiculo.id} style={s.dato}>
              <Text style={s.valor}>{vehiculo.plate} · {vehiculo.brand} {vehiculo.model}</Text>
              <Text style={s.secundario}>{[vehiculoTipos[vehiculo.vehicle_type], vehiculo.year, vehiculo.color].filter(Boolean).join(' · ')}</Text>
              <Text style={s.secundario}>SOAT · {fecha(vehiculo.soatExpiryDate)}</Text>
              <Text style={s.secundario}>RUAT · {vehiculo.ruatRequired ? 'Revisión requerida' : vehiculo.ruatVerified ? 'Verificado' : 'Sin verificar'}</Text>
            </View>) : <Text style={s.secundario}>Sin vehículos registrados.</Text>}
          </View>
          {errorFicha ? <View style={s.bloque}>
            <Text style={s.secundario}>No se pudieron cargar las comisiones ni el historial.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setErrorFicha(false); setRecargarFicha(actual => actual + 1); }}><Text style={s.enlaceTexto}>Reintentar</Text></Pressable>
          </View> : ficha ? <>
            <View style={s.bloque}>
              <Text style={s.nombre}>Comisiones mensuales</Text>
              <Text style={s.secundario}>Saldo pendiente</Text><Text style={s.saldo}>{dinero(ficha.saldoPendiente)}</Text>
              {ficha.comisiones.length ? ficha.comisiones.map(comision => <Pressable key={comision.id} style={s.dato} accessibilityRole="button" onPress={() => {
                cerrarDetalle();
                navigation.navigate('AdminPayments', {
                  conductor: { id: conductor.id, nombre: conductor.nombre }, periodo: comision.periodo.slice(0, 7), liquidacionId: comision.id
                });
              }}>
                <Text style={[s.valor, s.mes]}>{formatoMes.format(new Date(`${comision.periodo}T12:00:00Z`))} · {estadosComision[comision.estado as keyof typeof estadosComision] || comision.estado}</Text>
                <Text style={s.secundario}>Comisión {dinero(comision.total)} · Pagado {dinero(comision.pagado)}</Text>
                <Text style={s.secundario}>Saldo {dinero(comision.saldo)}{comision.vence ? ` · Vence ${fecha(comision.vence)}` : ''}</Text>
              </Pressable>) : <Text style={s.secundario}>Sin liquidaciones registradas.</Text>}
              <Pressable style={s.enlace} accessibilityRole="button" onPress={() => {
                cerrarDetalle();
                navigation.navigate('AdminPayments', { conductor: { id: conductor.id, nombre: conductor.nombre }, periodo: ficha.comisiones[0]?.periodo.slice(0, 7) });
              }}>
                <Text style={s.enlaceTexto}>Ir a Pagos e ingresos</Text><ChevronRight size={18} color={C.morado} />
              </Pressable>
            </View>
            <View style={s.bloque}>
              <Text style={s.nombre}>Historial de conducción</Text>
              {ficha.historial.length ? ficha.historial.map(cambio => <View key={cambio.id} style={s.dato}>
                <Text style={s.valor}>{cambio.estado === 'suspendido' ? 'Conducción suspendida' : 'Conducción reactivada'}</Text>
                <Text style={s.secundario}>{fecha(cambio.fecha)} · {cambio.administrador || 'Administrador sin identificar'}</Text>
                <Text style={s.secundario}>{cambio.motivo}</Text>
              </View>) : <Text style={s.secundario}>Sin cambios registrados.</Text>}
            </View>
          </> : <ActivityIndicator color={C.morado} style={s.espacio} />}
        </ScrollView>
        <View style={s.pie}>
          {confirmando && <View style={[s.bloque, s.formulario]}>
            <Text style={s.nombre}>{suspender ? 'Motivo de suspensión' : 'Motivo de reactivación'}</Text>
            <Text style={s.secundario}>{suspender ? 'El conductor podrá seguir usando su cuenta como pasajero.' : 'El conductor podrá ponerse disponible y aceptar viajes.'}</Text>
            <TextInput style={s.motivo} multiline autoFocus maxLength={500} editable={!enviando} placeholder="Escribe el motivo" placeholderTextColor={C.gris}
              accessibilityLabel="Motivo del cambio de conducción" value={motivo} onChangeText={setMotivo} />
            {!!errorCambio && <Text style={s.error}>{errorCambio}</Text>}
            <Pressable accessibilityRole="button" disabled={enviando} onPress={() => { setConfirmando(false); setMotivo(''); setErrorCambio(''); }}><Text style={s.enlaceTexto}>Cancelar</Text></Pressable>
          </View>}
          <Pressable style={[s.accion, suspender && s.accionSecundaria, confirmando && !motivo.trim() && s.atenuado]}
            disabled={enviando || (confirmando && !motivo.trim())} accessibilityRole="button" onPress={() => confirmando ? void guardar() : setConfirmando(true)}>
            {enviando ? <ActivityIndicator color={suspender ? C.tinta : C.blanco} /> : <Text style={[s.accionTexto, suspender && s.accionTextoSecundario]}>
              {confirmando ? (suspender ? 'Confirmar suspensión' : 'Confirmar reactivación') : (suspender ? 'Suspender conducción' : 'Reactivar conducción')}
            </Text>}
          </Pressable>
        </View>
      </SafeAreaView>}
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.blanco },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  control: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blanco },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.tinta },
  izquierda: { textAlign: 'left' },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginHorizontal: 16, borderRadius: 12, backgroundColor: C.fondo },
  entrada: { flex: 1, minHeight: 46, color: C.tinta, fontSize: 15 },
  contenido: { padding: 16, gap: 10, flexGrow: 1 },
  resumen: { fontSize: 13, fontWeight: '700', color: C.gris },
  espacio: { marginTop: 24 },
  vacio: { alignItems: 'center', padding: 24, gap: 10 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, backgroundColor: C.fondo, borderRadius: 18 },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: C.lila, justifyContent: 'center', alignItems: 'center' },
  avatarGrande: { width: 64, height: 64, borderRadius: 32 },
  foto: { width: '100%', height: '100%' },
  iniciales: { color: C.morado, fontWeight: '800', fontSize: 16 },
  inicialesGrandes: { fontSize: 22 },
  flex: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '800', color: C.tinta },
  secundario: { fontSize: 13, color: C.gris, lineHeight: 19 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  paginacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  atenuado: { opacity: 0.4 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'center', padding: 20 },
  panelFiltros: { backgroundColor: C.blanco, borderRadius: 20, padding: 12 },
  opcion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, borderRadius: 12, paddingHorizontal: 12 },
  lila: { backgroundColor: C.lila },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6, marginBottom: 8 },
  nombrePerfil: { color: C.tinta, fontSize: 22, fontWeight: '800' },
  bloque: { backgroundColor: C.fondo, borderRadius: 18, padding: 16, gap: 10 },
  dato: { borderTopWidth: 1, borderTopColor: C.borde, paddingTop: 9, gap: 3 },
  valor: { color: C.tinta, fontWeight: '700', fontSize: 14 },
  enlace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, backgroundColor: C.lila, padding: 12 },
  enlaceTexto: { color: C.morado, fontSize: 14, fontWeight: '800' },
  saldo: { color: C.tinta, fontSize: 26, fontWeight: '800' },
  mes: { textTransform: 'capitalize' },
  formulario: { marginBottom: 10 },
  motivo: { backgroundColor: C.blanco, borderRadius: 12, borderWidth: 1, borderColor: C.borde, padding: 12, minHeight: 56, maxHeight: 105, color: C.tinta },
  error: { color: C.rojo, fontSize: 13 },
  pie: { paddingHorizontal: 16, paddingVertical: 12 },
  accion: { backgroundColor: C.tinta, borderRadius: 12, minHeight: 54, padding: 12, alignItems: 'center', justifyContent: 'center' },
  accionSecundaria: { backgroundColor: C.blanco, borderWidth: 1, borderColor: C.tinta },
  accionTexto: { color: C.blanco, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  accionTextoSecundario: { color: C.tinta }
});
