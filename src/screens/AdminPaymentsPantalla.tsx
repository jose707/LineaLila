import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, ChevronLeft, ChevronRight, Menu, Search, X } from 'lucide-react-native';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import api from '../services/api.cliente';
import ZoomableDocumentModal from '../components/ZoomableDocumentModal';
import { abrirPdfComprobante, estadosComision, metodosComision as metodos, origenComprobante } from '../services/comisiones.servicio';
import type { LiquidacionComision as Comision, MetodoComision as Metodo } from '../services/comisiones.servicio';

const C = { blanco: '#FFFFFF', fondo: '#F7F7F9', texto: '#111118', gris: '#666673', borde: '#EAEAF0', morado: '#7514C5', lila: '#F3EAFC', rojo: '#DC2626', verde: '#15803D' };
const LIMITE = 20;
const estadosViaje = { completado: 'Completado', pendiente: 'Pendiente', fallido: 'Fallido', reembolsado: 'Reembolsado' };
type Pestaña = 'comisiones' | 'viajes';
type DetalleComision = Comision & {
  historial: { id: string; importe: number; metodo: Metodo; referencia: string | null; fecha: string; administrador: string | null }[];
};
type Pago = {
  id: string; rideId: string; amount: number; currency: string; payment_method: string;
  payment_status: keyof typeof estadosViaje; transaction_id: string | null; paid_at: string | null; createdAt: string;
  passenger?: { name: string; phone: string };
  ride?: { pickup_address: string; dropoff_address: string; finalFare: number };
};
type Resumen = { comision: number; pagado: number; saldo: number; conductoresPendientes?: number };
type ResumenViajes = { completedRevenue: number; pendingAmount: number; pendingCount: number };
type Fila = { tipo: 'comision'; dato: Comision } | { tipo: 'viaje'; dato: Pago };
type Props = NativeStackScreenProps<RaizPilaParametroLista, 'AdminPayments'>;

const formatoNumero = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoMes = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatoFecha = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'America/La_Paz' });
const formatoHora = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' });

function dinero(valor: number, moneda = 'BOB') { return `${moneda === 'BOB' ? 'Bs' : moneda} ${formatoNumero.format(Number(valor))}`; }
function fecha(valor: string | null) {
  if (!valor) return '—';
  return valor.length === 10 ? formatoFecha.format(new Date(`${valor}T12:00:00Z`)) : formatoHora.format(new Date(valor));
}
function mesActual() {
  const partes = new Intl.DateTimeFormat('es-BO', { year: 'numeric', month: '2-digit', timeZone: 'America/La_Paz' }).formatToParts();
  return `${partes.find(parte => parte.type === 'year')?.value}-${partes.find(parte => parte.type === 'month')?.value}`;
}
function moverMes(periodo: string, direccion: number) {
  const [anio, mes] = periodo.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1 + direccion, 1)).toISOString().slice(0, 7);
}
function nombreMes(periodo: string) { return formatoMes.format(new Date(`${periodo.slice(0, 7)}-01T12:00:00Z`)); }

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return <View style={s.dato}><Text style={s.secundario}>{etiqueta}</Text><Text style={s.valor}>{valor || '—'}</Text></View>;
}

export default function AdministradorPagosPantalla({ navigation, route }: Props) {
  const [pestaña, setPestaña] = useState<Pestaña>('comisiones');
  const [periodo, setPeriodo] = useState(() => route.params?.periodo || moverMes(mesActual(), -1));
  const [conductor, setConductor] = useState(route.params?.conductor);
  const [busqueda, setBusqueda] = useState('');
  const [buscar, setBuscar] = useState(false);
  const [filtros, setFiltros] = useState(false);
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [resumenViajes, setResumenViajes] = useState<ResumenViajes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [generando, setGenerando] = useState(false);
  const [cierreSimulado, setCierreSimulado] = useState(false);
  const generacionEnCurso = useRef(false);
  const [comisionId, setComisionId] = useState(route.params?.liquidacionId);
  const [pagoViaje, setPagoViaje] = useState<Pago | null>(null);
  const [detalle, setDetalle] = useState<DetalleComision | null>(null);
  const [errorDetalle, setErrorDetalle] = useState(false);
  const [revisionDetalle, setRevisionDetalle] = useState(0);
  const [formulario, setFormulario] = useState(false);
  const [metodo, setMetodo] = useState<Metodo>('qr');
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorPago, setErrorPago] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [verComprobanteImagen, setVerComprobanteImagen] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const consultaComision = pestaña === 'comisiones' ? busqueda.trim() : '';
  const conductorId = conductor?.id;

  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setError(false);
    const cargar = async () => {
      const params: Record<string, string | number> = { limit: LIMITE, offset: pagina * LIMITE };
      if (estado) params.status = estado;
      try {
        if (pestaña === 'comisiones') {
          params.period = periodo;
          if (conductorId) params.driverId = conductorId;
          if (consultaComision) params.search = consultaComision;
          const datos = await api.obtener<{ liquidaciones: Comision[]; total: number; resumen: Resumen; cierreSimulado?: boolean }>('/administracion/liquidaciones', { params });
          if (!vigente) return;
          setFilas(datos.liquidaciones.map(dato => ({ tipo: 'comision', dato })));
          setTotal(datos.total);
          setResumen(datos.resumen);
          setCierreSimulado(datos.cierreSimulado === true);
        } else {
          const datos = await api.obtener<{ payments: Pago[]; total: number; summary: ResumenViajes }>('/administracion/pagos', { params });
          if (!vigente) return;
          setFilas(datos.payments.map(dato => ({ tipo: 'viaje', dato })));
          setTotal(datos.total);
          setResumenViajes(datos.summary);
        }
      } catch {
        if (vigente) setError(true);
      } finally {
        if (vigente) setCargando(false);
      }
    };
    const espera = setTimeout(cargar, consultaComision ? 250 : 0);
    return () => { vigente = false; clearTimeout(espera); };
  }, [pestaña, pagina, periodo, estado, conductorId, consultaComision, revision]));

  useEffect(() => {
    if (!comisionId) return;
    let vigente = true;
    setErrorDetalle(false);
    api.obtener<DetalleComision>(`/administracion/liquidaciones/${encodeURIComponent(comisionId)}`)
      .then(datos => { if (vigente) setDetalle(datos); })
      .catch(() => { if (vigente) setErrorDetalle(true); });
    return () => { vigente = false; };
  }, [comisionId, revisionDetalle]);

  const abrirComision = (id: string) => {
    setDetalle(null); setErrorDetalle(false); setFormulario(false); setRechazando(false); setErrorPago(''); setConfirmado(false); setComisionId(id);
  };
  const cerrar = () => { if (!enviando) { setComisionId(undefined); setPagoViaje(null); setDetalle(null); setFormulario(false); } };
  const cambiarPestaña = (valor: Pestaña) => {
    setPestaña(valor); setEstado(''); setPagina(0); setBusqueda(''); setBuscar(false);
  };
  const cambiarMes = (direccion: number) => { setPeriodo(actual => moverMes(actual, direccion)); setPagina(0); };

  const generarLiquidaciones = async (mesElegido: string) => {
    const simular = mesElegido === mesActual() && cierreSimulado;
    if (generacionEnCurso.current || (!simular && mesElegido >= mesActual())) return;
    generacionEnCurso.current = true;
    setGenerando(true);
    const [year, month] = mesElegido.split('-').map(Number);
    try {
      if (simular) {
        const resultado = await api.post<{ conductores: number; generadas: number; existentes: number }>('/administracion/liquidaciones/simular-cierre', { periodo: mesElegido });
        setEstado('');
        setBusqueda('');
        setPagina(0);
        setRevision(actual => actual + 1);
        Alert.alert('Cierre de prueba completado', `Conductores: ${resultado.conductores}\nNuevas liquidaciones: ${resultado.generadas}\nYa tenían liquidación: ${resultado.existentes}`);
        return;
      }
      const resultado = await api.post<{ results: { settlementId: string | null; error?: string }[] }>('/administracion/liquidaciones/generar', { year, month });
      const generadas = resultado.results.filter(fila => fila.settlementId).length;
      const errores = resultado.results.filter(fila => fila.error).length;
      setRevision(actual => actual + 1);
      Alert.alert('Generación de liquidaciones', generadas || errores
        ? `${nombreMes(mesElegido)}\nLiquidaciones generadas: ${generadas}\nCon errores: ${errores}`
        : 'No hay nuevas comisiones por liquidar en el mes seleccionado.');
    } catch (problema) {
      const errorApi = problema as { data?: { error?: string; message?: string } };
      Alert.alert('No se pudo generar', errorApi.data?.error || errorApi.data?.message || 'Revisa la conexión e intenta de nuevo.');
    } finally {
      generacionEnCurso.current = false;
      setGenerando(false);
    }
  };
  const comprobante = detalle?.comprobante;
  const enRevision = detalle?.estado === 'under_review' && comprobante?.estado === 'under_review';
  const puedePagar = !!detalle && detalle.saldo > 0 && ['pendiente_pago', 'atrasado', 'under_review'].includes(detalle.estado);

  const actualizarLiquidacion = () => {
    setFormulario(false);
    setRechazando(false);
    setDetalle(null);
    setRevisionDetalle(actual => actual + 1);
    setRevision(actual => actual + 1);
  };

  const abrirComprobante = async () => {
    if (!detalle || !comprobante) return;
    setErrorPago('');
    try {
      if (comprobante.tipoArchivo === 'application/pdf') await abrirPdfComprobante(detalle.id, comprobante.id, true);
      else setVerComprobanteImagen(true);
    } catch (problema) { setErrorPago(problema instanceof Error ? problema.message : 'No se pudo abrir el comprobante.'); }
  };

  const rechazarComprobante = async () => {
    if (!detalle || !comprobante || !enRevision || enviando || !motivoRechazo.trim()) return;
    setEnviando(true);
    setErrorPago('');
    try {
      await api.put(`/administracion/liquidaciones/${encodeURIComponent(detalle.id)}/comprobantes/${encodeURIComponent(comprobante.id)}/rechazar`, { motivo: motivoRechazo.trim() });
      actualizarLiquidacion();
    } catch (problema) {
      const errorApi = problema as { data?: { error?: string }; status?: number };
      setErrorPago(errorApi.data?.error || 'No se pudo rechazar el comprobante.');
      if (errorApi.status === 409 || !errorApi.status || errorApi.status >= 500) actualizarLiquidacion();
    } finally { setEnviando(false); }
  };

  const registrar = async () => {
    if (!detalle || enviando || !puedePagar) return;
    setEnviando(true);
    setErrorPago('');
    try {
      await api.post(`/administracion/liquidaciones/${encodeURIComponent(detalle.id)}/pagar`, {
        amount: detalle.saldo, payment_method: enRevision ? comprobante.metodo : metodo,
        reference: enRevision ? comprobante.referencia : referencia.trim(), expectedPaid: detalle.pagado,
        ...(enRevision ? { comprobanteId: comprobante.id } : {})
      });
      setConfirmado(true);
      actualizarLiquidacion();
    } catch (problema) {
      const errorApi = problema as { data?: { error?: string }; status?: number };
      setErrorPago(errorApi.data?.error || 'No se pudo confirmar el pago. Revisa el saldo antes de volver a intentarlo.');
      if (errorApi.status === 409 || !errorApi.status || errorApi.status >= 500) actualizarLiquidacion();
    } finally { setEnviando(false); }
  };

  const consultaViaje = busqueda.trim().toLowerCase();
  const visibles = filas.filter(fila => fila.tipo === 'comision' || !consultaViaje ||
    [fila.dato.id, fila.dato.passenger?.name, fila.dato.transaction_id].some(valor => valor?.toLowerCase().includes(consultaViaje)));
  const opcionesEstado = Object.entries(pestaña === 'comisiones' ? estadosComision : estadosViaje);

  return <SafeAreaView style={s.pantalla}>
    <StatusBar barStyle="dark-content" />
    <View style={s.cabecera}>
      <Pressable style={s.control} onPress={navigation.goBack} accessibilityRole="button" accessibilityLabel="Cerrar pagos e ingresos"><X size={24} color={C.texto} strokeWidth={2.8} /></Pressable>
      <Text style={s.titulo}>Pagos e ingresos</Text>
      <Pressable style={s.control} onPress={() => { setBuscar(!buscar); setBusqueda(''); setPagina(0); }} accessibilityRole="button" accessibilityLabel={buscar ? 'Cerrar búsqueda' : 'Buscar'}><Search size={20} color={buscar ? C.morado : C.texto} strokeWidth={2.8} /></Pressable>
      <Pressable style={s.control} onPress={() => setFiltros(true)} accessibilityRole="button" accessibilityLabel="Filtrar por estado"><Menu size={22} color={estado ? C.morado : C.texto} strokeWidth={2.8} /></Pressable>
    </View>

    <View style={s.pestañas}>
      {([['comisiones', 'Comisiones'], ['viajes', 'Pagos de viajes']] as const).map(([valor, nombre]) => (
        <Pressable key={valor} style={[s.pestaña, pestaña === valor && s.pestañaActiva]} accessibilityRole="tab" accessibilityState={{ selected: pestaña === valor }} onPress={() => { if (pestaña !== valor) cambiarPestaña(valor); }}>
          <Text style={[s.valor, pestaña === valor && s.morado]}>{nombre}</Text>
        </Pressable>
      ))}
    </View>
    {buscar && <View style={s.buscador}><Search size={16} color={C.gris} />
      <TextInput style={s.entrada} autoFocus autoCapitalize="none" placeholder={pestaña === 'comisiones' ? 'Nombre o correo del conductor' : 'ID, pasajero o transacción'} placeholderTextColor={C.gris}
        value={busqueda} onChangeText={texto => { setBusqueda(texto); if (pestaña === 'comisiones') setPagina(0); }} />
    </View>}

    <FlatList
      data={cargando || error ? [] : visibles} keyExtractor={fila => fila.dato.id} contentContainerStyle={s.contenido}
      keyboardShouldPersistTaps="handled" refreshing={cargando} onRefresh={() => setRevision(actual => actual + 1)}
      ListHeaderComponent={<View style={s.espaciado}>
        {pestaña === 'comisiones' && <>
          <View style={s.periodo}>
            <Pressable style={s.control} onPress={() => cambiarMes(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior"><ChevronLeft size={21} color={C.texto} strokeWidth={2.8} /></Pressable>
            <Text style={[s.titulo, s.mes]}>{nombreMes(periodo)}</Text>
            <Pressable style={s.control} onPress={() => cambiarMes(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" disabled={periodo >= mesActual()}><ChevronRight size={21} color={periodo >= mesActual() ? C.borde : C.texto} strokeWidth={2.8} /></Pressable>
          </View>
          <Text style={[s.secundario, s.centrado]}>Plazo de pago del 1 al 7 de {nombreMes(moverMes(periodo, 1))}</Text>
          {(periodo < mesActual() || (periodo === mesActual() && cierreSimulado)) && !conductor && (
            <Pressable style={[s.botonGenerar, generando && s.atenuado]} disabled={generando} accessibilityRole="button" onPress={() => {
              const mesElegido = periodo;
              const simular = mesElegido === mesActual();
              const mensaje = simular
                ? `Se simulará el cierre de ${nombreMes(mesElegido)} para todos los conductores registrados. Las cuentas sin comisión tendrán un importe de prueba de Bs 25.`
                : `Se generarán los cobros de ${nombreMes(mesElegido)} para todos los conductores con comisiones por liquidar.`;
              Alert.alert(simular ? 'Simular cierre del mes' : 'Generar liquidaciones', mensaje, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Generar', onPress: () => void generarLiquidaciones(mesElegido) }
              ]);
            }}>
              {generando ? <ActivityIndicator color={C.morado} /> : <Text style={[s.valor, s.morado]}>Generar liquidaciones</Text>}
            </Pressable>
          )}
          {!!conductor && <Pressable style={s.chipConductor} accessibilityRole="button" accessibilityLabel={`Quitar filtro de ${conductor.nombre}`} onPress={() => { setConductor(undefined); setPagina(0); }}>
            <Text style={[s.valor, s.morado]}>{conductor.nombre}</Text><X size={16} color={C.morado} />
          </Pressable>}
          {!!resumen && !cargando && !error && <View style={s.resumen}>
            <Text style={s.secundario}>Saldo pendiente del período</Text><Text style={s.importeGrande}>{dinero(resumen.saldo)}</Text>
            <View style={s.filaResumen}><Dato etiqueta="Comisión generada" valor={dinero(resumen.comision)} /><Dato etiqueta="Comisión total pagada" valor={dinero(resumen.pagado)} /></View>
            {resumen.conductoresPendientes !== undefined && (
              <Dato etiqueta="Conductores con pago pendiente" valor={String(resumen.conductoresPendientes)} />
            )}
          </View>}
        </>}
        {pestaña === 'viajes' && resumenViajes && !cargando && !error && <View style={s.resumen}>
          <Text style={s.secundario}>Pagos de viajes completados</Text><Text style={s.importeGrande}>{dinero(resumenViajes.completedRevenue)}</Text>
          <Dato etiqueta={`Pendiente · ${resumenViajes.pendingCount} pagos`} valor={dinero(resumenViajes.pendingAmount)} />
        </View>}
        {!cargando && !error && <Text style={s.secundario}>{total} {pestaña === 'comisiones' ? (total === 1 ? 'liquidación' : 'liquidaciones') : (total === 1 ? 'pago' : 'pagos')}</Text>}
      </View>}
      ListEmptyComponent={cargando ? <ActivityIndicator color={C.morado} style={s.carga} /> : <View style={s.vacio}>
        <Text style={s.valor}>{error ? 'No se pudieron cargar los datos.' : pestaña === 'comisiones' ? 'Sin liquidaciones para este período y filtro.' : 'Sin pagos para mostrar en esta página.'}</Text>
        {error && <Pressable onPress={() => setRevision(actual => actual + 1)} accessibilityRole="button"><Text style={s.enlace}>Reintentar</Text></Pressable>}
      </View>}
      ListFooterComponent={!cargando && !error && total > LIMITE ? <View style={s.periodo}>
        <Pressable onPress={() => setPagina(actual => actual - 1)} disabled={!pagina} accessibilityRole="button"><Text style={[s.enlace, !pagina && s.atenuado]}>Anterior</Text></Pressable>
        <Text style={s.secundario}>{pagina + 1} de {Math.ceil(total / LIMITE)}</Text>
        <Pressable onPress={() => setPagina(actual => actual + 1)} disabled={(pagina + 1) * LIMITE >= total} accessibilityRole="button"><Text style={[s.enlace, (pagina + 1) * LIMITE >= total && s.atenuado]}>Siguiente</Text></Pressable>
      </View> : null}
      renderItem={({ item }) => {
        if (item.tipo === 'comision') {
          const fila = item.dato;
          return <Pressable style={s.tarjeta} accessibilityRole="button" onPress={() => abrirComision(fila.id)}>
            <View style={s.flex}><Text style={s.valor}>{fila.conductor}</Text><Text style={s.secundario}>{fila.esPrueba ? 'Prueba · ' : ''}{estadosComision[fila.estado]}{fila.vence ? ` · Vence ${fecha(fila.vence)}` : ''}</Text></View>
            <View><Text style={[s.valor, fila.estado === 'atrasado' && s.error]}>{dinero(fila.saldo)}</Text><Text style={[s.secundario, s.derecha]}>Saldo</Text></View>
            <ChevronRight size={16} color={C.gris} />
          </Pressable>;
        }
        const fila = item.dato;
        return <Pressable style={s.tarjeta} accessibilityRole="button" onPress={() => setPagoViaje(fila)}>
          <View style={s.flex}><Text style={s.valor}>{fila.passenger?.name || `Pago #${fila.id.slice(0, 8)}`}</Text><Text style={s.secundario}>{fecha(fila.createdAt)} · {metodos[fila.payment_method as Metodo] || fila.payment_method}</Text></View>
          <View><Text style={s.valor}>{dinero(fila.amount, fila.currency)}</Text><Text style={[s.secundario, s.derecha]}>{estadosViaje[fila.payment_status] || fila.payment_status}</Text></View>
          <ChevronRight size={16} color={C.gris} />
        </Pressable>;
      }}
    />

    <Modal visible={filtros} transparent animationType="fade" onRequestClose={() => setFiltros(false)}>
      <SafeAreaView style={s.fondoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltros(false)} accessibilityLabel="Cerrar filtros" />
        <View style={s.panelFiltros} accessibilityViewIsModal>
          <View style={s.cabecera}><Text style={[s.titulo, s.izquierda]}>Estado</Text><Pressable style={s.control} accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={() => setFiltros(false)}><X size={24} color={C.texto} strokeWidth={2.8} /></Pressable></View>
          {[['', 'Todos'], ...opcionesEstado].map(([valor, nombre]) => <Pressable key={valor} style={[s.opcion, estado === valor && s.lila]}
            accessibilityRole="radio" accessibilityState={{ checked: estado === valor }} onPress={() => { setEstado(valor); setPagina(0); setFiltros(false); }}>
            <Text style={s.valor}>{nombre}</Text>{estado === valor && <Check size={18} color={C.morado} strokeWidth={2.8} />}
          </Pressable>)}
        </View>
      </SafeAreaView>
    </Modal>

    <Modal visible={!!comisionId || !!pagoViaje} animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView style={s.pantalla}>
        <StatusBar barStyle="dark-content" />
        <View style={s.cabecera}>
          <Pressable style={s.control} disabled={enviando} onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar detalle"><X size={24} color={C.texto} strokeWidth={2.8} /></Pressable>
          <Text style={s.titulo}>{comisionId ? 'Liquidación de comisión' : 'Detalle del pago'}</Text><View style={s.control} />
        </View>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
          {!!errorPago && !formulario && !rechazando && <Text style={s.error} accessibilityLiveRegion="polite">{errorPago}</Text>}
          {pagoViaje && <>
            <View style={s.resumen}><Text style={s.secundario}>{estadosViaje[pagoViaje.payment_status]}</Text><Text style={s.importeGrande}>{dinero(pagoViaje.amount, pagoViaje.currency)}</Text></View>
            <View style={s.bloque}>
              <Dato etiqueta="Pasajero" valor={pagoViaje.passenger?.name} /><Dato etiqueta="Teléfono" valor={pagoViaje.passenger?.phone} />
              <Dato etiqueta="Método" valor={metodos[pagoViaje.payment_method as Metodo] || pagoViaje.payment_method} />
              <Dato etiqueta="Transacción" valor={pagoViaje.transaction_id} /><Dato etiqueta="ID del pago" valor={pagoViaje.id} />
              <Dato etiqueta="Registrado" valor={fecha(pagoViaje.createdAt)} /><Dato etiqueta="Pagado" valor={fecha(pagoViaje.paid_at)} />
            </View>
            <View style={s.bloque}>
              <Text style={s.valor}>Viaje</Text><Dato etiqueta="ID del viaje" valor={pagoViaje.rideId} />
              {pagoViaje.ride && <><Dato etiqueta="Recogida" valor={pagoViaje.ride.pickup_address} /><Dato etiqueta="Destino" valor={pagoViaje.ride.dropoff_address} /><Dato etiqueta="Tarifa" valor={dinero(pagoViaje.ride.finalFare, pagoViaje.currency)} /></>}
            </View>
          </>}
          {comisionId && (errorDetalle ? <View style={s.vacio}>
            <Text style={s.valor}>No se pudo cargar la liquidación.</Text>
            <Pressable onPress={() => setRevisionDetalle(actual => actual + 1)} accessibilityRole="button"><Text style={s.enlace}>Reintentar</Text></Pressable>
          </View> : detalle ? <>
            <View style={s.resumen}>
              <Text style={s.valor}>{detalle.conductor}</Text><Text style={[s.secundario, s.mes]}>{nombreMes(detalle.periodo)} · {estadosComision[detalle.estado]}</Text>
              {detalle.esPrueba && <Text style={s.secundario}>Liquidación de prueba</Text>}
              <Text style={s.secundario}>Saldo pendiente</Text><Text style={s.importeGrande}>{dinero(detalle.saldo)}</Text>
              <View style={s.filaResumen}><Dato etiqueta="Comisión" valor={dinero(detalle.comision)} /><Dato etiqueta="Pagado" valor={dinero(detalle.pagado)} /></View>
            </View>
            <View style={s.bloque}>
              <Dato etiqueta="Viajes incluidos" valor={String(detalle.viajes)} /><Dato etiqueta="Vencimiento" valor={fecha(detalle.vence)} />
              {!!detalle.fechaPago && <Dato etiqueta="Liquidada el" valor={fecha(detalle.fechaPago)} />}
            </View>
            {!!comprobante && <View style={s.bloque}>
              <Text style={s.valor}>{comprobante.estado === 'under_review' ? 'Comprobante en revisión' : comprobante.estado === 'rechazado' ? 'Comprobante rechazado' : 'Comprobante aceptado'}</Text>
              <Dato etiqueta="Enviado" valor={`${fecha(comprobante.fecha)}${comprobante.aTiempo === true ? ' · Dentro del plazo' : comprobante.aTiempo === false ? ' · Fuera de plazo' : ''}`} />
              <Dato etiqueta="Método informado" valor={metodos[comprobante.metodo]} />
              {!!comprobante.referencia && <Dato etiqueta="Número de operación" valor={comprobante.referencia} />}
              {!!comprobante.motivo && <Dato etiqueta="Motivo del rechazo" valor={comprobante.motivo} />}
              <Pressable disabled={enviando} onPress={() => void abrirComprobante()} accessibilityRole="button"><Text style={s.enlace}>Ver comprobante</Text></Pressable>
            </View>}
            <View style={s.bloque}>
              <Text style={s.valor}>Historial de pagos</Text>
              {confirmado && <Text style={s.exito}>Pago registrado.</Text>}
              {detalle.historial.length ? detalle.historial.map(registro => <View key={registro.id} style={s.dato}>
                <Text style={s.valor}>{dinero(registro.importe)} · {metodos[registro.metodo]}</Text>
                <Text style={s.secundario}>{fecha(registro.fecha)} · {registro.administrador || 'Administrador sin identificar'}</Text>
                {!!registro.referencia && <Text style={s.secundario}>Referencia {registro.referencia}</Text>}
              </View>) : detalle.pagado > 0 ? <Text style={s.secundario}>Pago anterior de {dinero(detalle.pagado)}{detalle.metodo ? ` · ${metodos[detalle.metodo]}` : ''}.</Text> : <Text style={s.secundario}>Sin pagos registrados.</Text>}
            </View>
          </> : <ActivityIndicator color={C.morado} style={s.carga} />)}
        </ScrollView>
        {puedePagar && !errorDetalle && <View style={s.pie}>
          {rechazando ? <View style={s.formulario}>
            <Text style={s.valor}>Motivo del rechazo</Text>
            <TextInput style={[s.campo, s.campoMotivo]} autoFocus multiline maxLength={500} editable={!enviando} accessibilityLabel="Motivo del rechazo"
              placeholder="Explica qué debe corregir el conductor" placeholderTextColor={C.gris} value={motivoRechazo} onChangeText={setMotivoRechazo} />
            {!!errorPago && <Text style={s.error}>{errorPago}</Text>}
          </View> : formulario && <View style={s.formulario}>
            <Dato etiqueta="Importe total a registrar" valor={dinero(detalle?.saldo ?? 0)} />
            <View style={s.metodos}>
              {(Object.entries(metodos) as [Metodo, string][]).map(([valor, nombre]) => <Pressable key={valor} style={[s.metodo, metodo === valor && s.lila]} disabled={enviando}
                accessibilityRole="radio" accessibilityState={{ checked: metodo === valor }} onPress={() => setMetodo(valor)}><Text style={[s.secundario, metodo === valor && s.morado]}>{nombre}</Text></Pressable>)}
            </View>
            <TextInput style={s.campo} accessibilityLabel="Referencia del pago" placeholder="Referencia (opcional)" placeholderTextColor={C.gris} value={referencia} onChangeText={setReferencia} editable={!enviando} maxLength={100} />
            {!!errorPago && <Text style={s.error}>{errorPago}</Text>}
          </View>}
          <Pressable style={[s.accion, rechazando && !motivoRechazo.trim() && s.atenuado]} disabled={enviando || (rechazando && !motivoRechazo.trim())} accessibilityRole="button" onPress={() => {
            if (!detalle) return;
            if (rechazando) {
              void rechazarComprobante();
            } else if (!formulario && !enRevision) {
              setReferencia(''); setMetodo('qr'); setErrorPago(''); setFormulario(true);
            } else {
              const metodoPago = enRevision ? comprobante.metodo : metodo;
              Alert.alert('Confirmar pago total recibido', `${dinero(detalle.saldo)} · ${metodos[metodoPago]}\n${detalle.conductor}\n\nConfirma solo si el dinero ya fue recibido.`, [
                { text: 'Cancelar', style: 'cancel' }, { text: 'Registrar', onPress: () => void registrar() }
              ]);
            }
          }}>
            {enviando ? <ActivityIndicator color={C.blanco} /> : <Text style={s.accionTexto}>
              {rechazando ? 'Confirmar rechazo' : formulario || enRevision ? 'Confirmar pago total' : 'Registrar pago total'}
            </Text>}
          </Pressable>
          {!enviando && (formulario || rechazando ? (
            <Pressable style={s.cancelar} accessibilityRole="button" onPress={() => { setFormulario(false); setRechazando(false); setErrorPago(''); }}><Text style={s.secundario}>Cancelar</Text></Pressable>
          ) : enRevision ? (
            <Pressable style={s.cancelar} accessibilityRole="button" onPress={() => { setMotivoRechazo(''); setErrorPago(''); setRechazando(true); }}><Text style={s.error}>Rechazar comprobante</Text></Pressable>
          ) : null)}
        </View>}
        {detalle && comprobante && <ZoomableDocumentModal visible={verComprobanteImagen} title="Comprobante de pago"
          source={verComprobanteImagen ? origenComprobante(detalle.id, comprobante.id, true) : undefined} onClose={() => setVerComprobanteImagen(false)} />}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.blanco },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  control: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blanco },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.texto },
  izquierda: { textAlign: 'left' }, derecha: { textAlign: 'right' }, centrado: { textAlign: 'center' }, mes: { textTransform: 'capitalize' }, flex: { flex: 1 },
  pestañas: { flexDirection: 'row', marginHorizontal: 16, padding: 4, borderRadius: 14, backgroundColor: C.fondo },
  pestaña: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 11, borderRadius: 11 },
  pestañaActiva: { backgroundColor: C.blanco }, morado: { color: C.morado },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginHorizontal: 16, marginTop: 10, borderRadius: 12, backgroundColor: C.fondo },
  entrada: { flex: 1, minHeight: 46, fontSize: 15, color: C.texto },
  contenido: { padding: 16, gap: 10, flexGrow: 1 }, espaciado: { gap: 10 },
  periodo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 },
  botonGenerar: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.lila, padding: 10 },
  chipConductor: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, backgroundColor: C.lila },
  resumen: { borderRadius: 18, padding: 16, gap: 6, backgroundColor: C.lila },
  importeGrande: { fontSize: 30, fontWeight: '800', color: C.texto },
  filaResumen: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 6 },
  secundario: { fontSize: 13, lineHeight: 19, color: C.gris },
  valor: { fontSize: 15, fontWeight: '800', color: C.texto },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.fondo, borderRadius: 16, padding: 14 },
  carga: { marginTop: 24 }, vacio: { alignItems: 'center', gap: 10, padding: 20 },
  enlace: { color: C.morado, fontSize: 14, fontWeight: '800', paddingVertical: 8 }, atenuado: { opacity: 0.45 },
  fondoModal: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.32)' },
  panelFiltros: { padding: 12, borderRadius: 20, backgroundColor: C.blanco },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 12, borderRadius: 12 },
  lila: { backgroundColor: C.lila }, bloque: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: C.fondo },
  dato: { gap: 3 }, error: { color: C.rojo, fontSize: 14 }, exito: { color: C.verde, fontWeight: '700' },
  pie: { paddingHorizontal: 16, paddingVertical: 12 }, formulario: { gap: 8, marginBottom: 10 },
  campo: { minHeight: 44, borderColor: C.borde, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: C.texto },
  campoMotivo: { minHeight: 56, maxHeight: 105, paddingVertical: 10 },
  metodos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, metodo: { borderRadius: 10, backgroundColor: C.fondo, padding: 8 },
  accion: { minHeight: 54, borderRadius: 12, backgroundColor: C.texto, alignItems: 'center', justifyContent: 'center', padding: 12 },
  accionTexto: { color: C.blanco, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  cancelar: { alignItems: 'center', paddingTop: 10 }
});
