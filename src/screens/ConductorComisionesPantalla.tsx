import React, { useCallback, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { ChevronRight, FileText, X } from 'lucide-react-native';
import ZoomableDocumentModal from '../components/ZoomableDocumentModal';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { abrirPdfComprobante, elegirPdf, enviarComprobante, estadosComision, imagenComprobante, metodosComision, obtenerMisComisiones, origenComprobante, pdfComprobantesEnAndroid } from '../services/comisiones.servicio';
import type { ArchivoComprobante, LiquidacionComision, MetodoComision } from '../services/comisiones.servicio';

const C = { blanco: '#FFFFFF', fondo: '#F7F7F9', tinta: '#111118', gris: '#666673', borde: '#EAEAF0', morado: '#7514C5', lila: '#F3EAFC', rojo: '#DC2626' };
const moneda = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mes = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dia = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'America/La_Paz' });
const dinero = (valor: number) => `Bs ${moneda.format(valor)}`;
const periodo = (valor: string) => mes.format(new Date(`${valor.slice(0, 7)}-01T12:00:00Z`));
const fecha = (valor: string) => dia.format(new Date(valor.length === 10 ? `${valor}T12:00:00Z` : valor));

export default function ConductorComisionesPantalla({ navigation }: NativeStackScreenProps<RaizPilaParametroLista, 'DriverCommissions'>) {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionComision[]>([]);
  const [instrucciones, setInstrucciones] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [seleccion, setSeleccion] = useState<string>();
  const [archivo, setArchivo] = useState<ArchivoComprobante | null>(null);
  const [metodo, setMetodo] = useState<MetodoComision>('qr');
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [verImagen, setVerImagen] = useState(false);

  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setErrorCarga(false);
    obtenerMisComisiones()
      .then(datos => { if (vigente) { setLiquidaciones(datos.liquidaciones); setInstrucciones(datos.instrucciones); } })
      .catch(() => { if (vigente) setErrorCarga(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [recarga]));

  const volver = useCallback(() => {
    if (enviando) return;
    if (seleccion) setSeleccion(undefined);
    else navigation.goBack();
  }, [enviando, seleccion, navigation]);

  useFocusEffect(useCallback(() => {
    const evento = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!seleccion) return false;
      volver();
      return true;
    });
    return () => evento.remove();
  }, [seleccion, volver]));

  const detalle = liquidaciones.find(liquidacion => liquidacion.id === seleccion);
  const comprobante = detalle?.comprobante;
  const puedeEnviar = !!detalle && !cargando && !errorCarga && detalle.saldo > 0 && ['pendiente_pago', 'atrasado'].includes(detalle.estado);

  const adjuntar = async (pdf: boolean) => {
    setError('');
    try {
      if (pdf) {
        const seleccionado = await elegirPdf();
        if (seleccionado) setArchivo(seleccionado);
      } else {
        const respuesta = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, assetRepresentationMode: 'compatible' });
        if (respuesta.errorCode) throw new Error('No se pudo abrir la galería.');
        const foto = respuesta.assets?.[0];
        if (foto?.uri) setArchivo(imagenComprobante(foto.uri, foto.type, foto.fileSize));
      }
    } catch (problema) { setError(problema instanceof Error ? problema.message : 'No se pudo adjuntar el archivo.'); }
  };

  const enviar = async () => {
    if (!detalle || !archivo || enviando || !puedeEnviar) return;
    setEnviando(true);
    setError('');
    try {
      await enviarComprobante(detalle.id, archivo, metodo, referencia);
      setArchivo(null);
      setCargando(true);
      setRecarga(actual => actual + 1);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo enviar el comprobante.');
    } finally { setEnviando(false); }
  };

  const abrirComprobante = async () => {
    if (!detalle || !comprobante) return;
    setError('');
    try {
      if (comprobante.tipoArchivo === 'application/pdf') await abrirPdfComprobante(detalle.id, comprobante.id, false);
      else setVerImagen(true);
    } catch (problema) { setError(problema instanceof Error ? problema.message : 'No se pudo abrir el comprobante.'); }
  };

  return <SafeAreaView style={s.pantalla}>
    <StatusBar barStyle="dark-content" />
    <View style={s.cabecera}>
      <Pressable style={s.control} onPress={volver} disabled={enviando} accessibilityRole="button" accessibilityLabel="Cerrar"><X size={24} color={C.tinta} strokeWidth={2.8} /></Pressable>
      <Text style={s.titulo}>{detalle ? 'Liquidación de comisión' : 'Comisiones'}</Text><View style={s.control} />
    </View>
    <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={cargando} enabled={!enviando} colors={[C.morado]} onRefresh={() => setRecarga(actual => actual + 1)} />}>
      {cargando && !detalle && <ActivityIndicator color={C.morado} />}
      {errorCarga && <View style={s.tarjeta}><Text style={s.secundario}>No se pudieron cargar tus liquidaciones.</Text>
        <Pressable accessibilityRole="button" onPress={() => setRecarga(actual => actual + 1)}><Text style={s.enlace}>Reintentar</Text></Pressable>
      </View>}
      {!detalle && !cargando && !errorCarga && (
        liquidaciones.length ? liquidaciones.map(liquidacion => <Pressable key={liquidacion.id} style={[s.tarjeta, s.fila]} accessibilityRole="button" onPress={() => {
          setArchivo(null); setMetodo('qr'); setReferencia(''); setError(''); setSeleccion(liquidacion.id);
        }}>
          <FileText size={23} color={C.morado} />
          <View style={s.flex}>
            <Text style={[s.nombre, s.periodo]}>{periodo(liquidacion.periodo)}</Text>
            <Text style={s.secundario}>{liquidacion.esPrueba ? 'Prueba · ' : ''}{estadosComision[liquidacion.estado]}{liquidacion.vence && liquidacion.estado !== 'pagado' ? ` · Vence ${fecha(liquidacion.vence)}` : ''}</Text>
          </View>
          <Text style={s.nombre}>{dinero(liquidacion.comision)}</Text><ChevronRight size={17} color={C.gris} />
        </Pressable>) : <View style={s.tarjeta}><Text style={s.nombre}>Aún no tienes liquidaciones.</Text></View>
      )}
      {detalle && <>
        <View style={[s.tarjeta, s.lila]}>
          <Text style={[s.nombre, s.periodo]}>{periodo(detalle.periodo)} · {estadosComision[detalle.estado]}</Text>
          {detalle.esPrueba && <Text style={s.secundario}>Liquidación de prueba</Text>}
          <Text style={s.importe}>{dinero(detalle.estado === 'pagado' ? detalle.pagado : detalle.saldo)}</Text>
          <Text style={s.secundario}>{detalle.estado === 'pagado' ? 'Pago confirmado' : 'Saldo total por pagar'}</Text>
          <Text style={s.secundario}>{detalle.viajes} {detalle.viajes === 1 ? 'viaje incluido' : 'viajes incluidos'}{detalle.vence ? ` · Fecha límite ${fecha(detalle.vence)}` : ''}</Text>
        </View>
        {!!comprobante && <View style={s.tarjeta}>
          <Text style={s.nombre}>{comprobante.estado === 'rechazado' ? 'Comprobante rechazado' : 'Comprobante enviado'}</Text>
          <Text style={s.secundario}>{fecha(comprobante.fecha)} · {metodosComision[comprobante.metodo]}{comprobante.aTiempo === true ? ' · Dentro del plazo' : comprobante.aTiempo === false ? ' · Fuera de plazo' : ''}</Text>
          {!!comprobante.referencia && <Text style={s.secundario}>Referencia {comprobante.referencia}</Text>}
          {!!comprobante.motivo && <Text style={s.error}>Motivo: {comprobante.motivo}</Text>}
          {comprobante.estado === 'under_review' && <Text style={s.secundario}>Administración verificará la recepción del pago.</Text>}
          <Pressable onPress={() => void abrirComprobante()} accessibilityRole="button"><Text style={s.enlace}>Ver comprobante</Text></Pressable>
        </View>}
        {puedeEnviar && <>
          <View style={s.tarjeta}>
            <Text style={s.nombre}>Instrucciones de pago</Text>
            <Text style={s.secundario}>{instrucciones || 'Consulta con Soporte los datos para pagar tu comisión.'}</Text>
            <Text style={s.secundario}>Paga el saldo completo y adjunta el comprobante.</Text>
          </View>
          <View style={s.tarjeta}>
            <Text style={s.nombre}>Método de pago</Text>
            <View style={s.metodos}>
              {(Object.entries(metodosComision) as [MetodoComision, string][]).map(([valor, etiqueta]) => <Pressable key={valor} style={[s.opcion, metodo === valor && s.lila]} disabled={enviando}
                accessibilityRole="radio" accessibilityState={{ checked: metodo === valor }} onPress={() => setMetodo(valor)}><Text style={s.secundario}>{etiqueta}</Text></Pressable>)}
            </View>
            <TextInput style={s.campo} value={referencia} onChangeText={setReferencia} editable={!enviando} maxLength={100} placeholder="Número de operación (opcional)" placeholderTextColor={C.gris} accessibilityLabel="Número de operación" />
            {!!archivo && <Text style={s.nombre}>{archivo.type === 'application/pdf' ? 'PDF adjunto' : 'Foto adjunta'}</Text>}
            <View style={s.metodos}>
              <Pressable style={s.opcion} disabled={enviando} onPress={() => void adjuntar(false)} accessibilityRole="button"><Text style={s.enlace}>{archivo ? 'Cambiar foto' : 'Adjuntar foto'}</Text></Pressable>
              {pdfComprobantesEnAndroid && <Pressable style={s.opcion} disabled={enviando} onPress={() => void adjuntar(true)} accessibilityRole="button"><Text style={s.enlace}>{archivo ? 'Cambiar PDF' : 'Adjuntar PDF'}</Text></Pressable>}
            </View>
            <Text style={s.secundario}>{pdfComprobantesEnAndroid ? 'JPG, PNG o PDF' : 'JPG o PNG'} de hasta 8 MB.</Text>
          </View>
        </>}
        {cargando && <ActivityIndicator color={C.morado} />}
        {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
      </>}
    </ScrollView>
    {puedeEnviar && <View style={s.pie}>
      <Pressable style={[s.boton, !archivo && s.atenuado]} disabled={!archivo || enviando} onPress={() => void enviar()} accessibilityRole="button">
        {enviando ? <ActivityIndicator color={C.blanco} /> : <Text style={s.botonTexto}>Enviar comprobante</Text>}
      </Pressable>
    </View>}
    {detalle && comprobante && <ZoomableDocumentModal visible={verImagen} title="Comprobante de pago"
      source={verImagen ? origenComprobante(detalle.id, comprobante.id, false) : undefined} onClose={() => setVerImagen(false)} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.blanco },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  control: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blanco },
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: C.tinta, textAlign: 'center' },
  contenido: { padding: 16, gap: 10 },
  tarjeta: { backgroundColor: C.fondo, borderRadius: 18, padding: 16, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center' }, flex: { flex: 1 }, lila: { backgroundColor: C.lila },
  nombre: { fontSize: 15, color: C.tinta, fontWeight: '800' }, periodo: { textTransform: 'capitalize' },
  secundario: { fontSize: 13, color: C.gris, lineHeight: 19 }, importe: { fontSize: 32, fontWeight: '800', color: C.tinta },
  metodos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderColor: C.borde, borderRadius: 12, padding: 10, backgroundColor: C.blanco },
  campo: { minHeight: 46, paddingHorizontal: 12, color: C.tinta, backgroundColor: C.blanco, borderRadius: 12, borderWidth: 1, borderColor: C.borde },
  enlace: { color: C.morado, fontWeight: '800', fontSize: 14 }, error: { color: C.rojo, fontSize: 14 },
  pie: { paddingHorizontal: 16, paddingVertical: 12 }, boton: { minHeight: 54, borderRadius: 12, backgroundColor: C.tinta, alignItems: 'center', justifyContent: 'center', padding: 12 },
  atenuado: { opacity: 0.45 }, botonTexto: { color: C.blanco, fontSize: 19, fontWeight: '700', textAlign: 'center' }
});
