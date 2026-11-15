import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Check, MapPin, Pencil, RefreshCw, X } from 'lucide-react-native';
import ConfirmarInferiorHoja from '../components/ConfirmarInferiorSheet';
import { usarAjustes } from '../context/AjustesContexto';
import api from '../services/api.cliente';

const ruta = '/administracion/zonas-servicio';
const violeta = '#7514C5';
const tarifas = [
  { clave: 'tarifa_base', nombre: 'Tarifa base' },
  { clave: 'tarifa_km', nombre: 'Tarifa por km' },
  { clave: 'tarifa_minuto', nombre: 'Tarifa por minuto' }
] as const;
type Tarifa = typeof tarifas[number]['clave'];
type Zona = Record<Tarifa, number | null> & {
  id: string; nombre: string; activa: boolean; moneda: string; tasa_comision: number;
};
type Borrador = Record<Tarifa | 'comision', string>;
type Cambios = Partial<Record<Tarifa, number | null>> & { tasa_comision?: string };
type Confirmacion = { zona: Zona; cambios: Cambios; resumen: string };
const camposEdicion = [...tarifas, { clave: 'comision', nombre: 'Comisión' }] as const;
const formatoNumero = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 20 });
const porcentaje = (tasa: number) => Number((tasa * 100).toFixed(4));
const mostrarComision = (tasa: number) => `${formatoNumero.format(porcentaje(tasa))} %`;
const mostrarMoneda = (moneda: string) => moneda === 'BOB' ? 'Bs' : moneda;
const mostrarTarifa = (valor: number | null, moneda: string) =>
  valor == null ? 'Tarifa global' : `${mostrarMoneda(moneda)} ${formatoNumero.format(valor)}`;

export default function ZonasOperacionPantalla() {
  const navegacion = useNavigation();
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const [zonas, establecerZonas] = useState<Zona[]>([]);
  const [cargando, establecerCargando] = useState(true);
  const [guardando, establecerGuardando] = useState(false);
  const [zonaEditada, establecerZonaEditada] = useState<string | null>(null);
  const [borrador, establecerBorrador] = useState<Borrador | null>(null);
  const [error, establecerError] = useState('');
  const [zonaGuardada, establecerZonaGuardada] = useState<string | null>(null);
  const [confirmacion, establecerConfirmacion] = useState<Confirmacion | null>(null);
  const guardadoEnCurso = useRef(false);

  const acento = oscuro ? '#D5A6FF' : violeta;
  const texto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const secundario = { color: oscuro ? '#BDBDC7' : '#666675' };
  const verde = oscuro ? '#81DBAB' : '#167348';
  const rojo = { color: oscuro ? '#FCA5A5' : '#B91C1C' };
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];
  const borde = oscuro && s.bordeOscuro;

  const cargar = useCallback(async () => {
    establecerCargando(true);
    establecerError('');
    try {
      const datos = await api.obtener<{ zonas: Zona[] }>(ruta);
      establecerZonas(datos.zonas);
    } catch {
      establecerError('No se pudieron cargar las zonas de operación.');
    } finally {
      establecerCargando(false);
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const editar = (zona: Zona) => {
    establecerZonaGuardada(null);
    establecerError('');
    establecerZonaEditada(zona.id);
    establecerBorrador({
      tarifa_base: String(zona.tarifa_base ?? '').replace('.', ','),
      tarifa_km: String(zona.tarifa_km ?? '').replace('.', ','),
      tarifa_minuto: String(zona.tarifa_minuto ?? '').replace('.', ','),
      comision: String(porcentaje(zona.tasa_comision)).replace('.', ',')
    });
  };

  const revisarCambios = (zona: Zona) => {
    if (!borrador || guardando) return;
    const textoComision = borrador.comision.trim().replace(',', '.');
    const comision = Number(textoComision);
    if (!/^(?:\d+|\d*\.\d{1,4})$/.test(textoComision) || comision > 100) {
      establecerError('Escribe una comisión entre 0 % y 100 %, con hasta cuatro decimales.');
      return;
    }
    const cambios: Cambios = {};
    const resumen: string[] = [];
    for (const { clave, nombre } of tarifas) {
      const texto = borrador[clave].trim().replace(',', '.');
      const valor = texto === '' ? null : Number(texto);
      if (valor !== null && (!/^(?:\d+|\d*\.\d+)$/.test(texto) || !Number.isFinite(valor) || valor <= 0)) {
        establecerError(nombre + ' debe ser mayor que cero o quedar vacía para usar la tarifa global.');
        return;
      }
      if (valor !== zona[clave]) {
        cambios[clave] = valor;
        resumen.push(`${nombre}: ${mostrarTarifa(zona[clave], zona.moneda)} → ${mostrarTarifa(valor, zona.moneda)}`);
      }
    }
    if (comision !== porcentaje(zona.tasa_comision)) {
      cambios.tasa_comision = (comision / 100).toFixed(6);
      resumen.push(`Comisión: ${mostrarComision(zona.tasa_comision)} → ${mostrarComision(Number(cambios.tasa_comision))}`);
    }
    if (!resumen.length) {
      establecerZonaEditada(null);
      establecerError('');
      return;
    }
    Keyboard.dismiss();
    establecerError('');
    establecerConfirmacion({ zona, cambios, resumen: resumen.join('\n') });
  };

  const guardar = async () => {
    if (!confirmacion || guardadoEnCurso.current) return;
    const { zona, cambios } = confirmacion;
    guardadoEnCurso.current = true;
    establecerGuardando(true);
    establecerError('');
    try {
      const datos = await api.put<{ zona: Zona }>(ruta + '/' + encodeURIComponent(zona.id), cambios);
      establecerZonas(anteriores => anteriores.map(item => item.id === zona.id ? datos.zona : item));
      establecerZonaGuardada(zona.id);
      establecerZonaEditada(null);
      establecerConfirmacion(null);
    } catch (fallo) {
      establecerError((fallo as { data?: { error?: string } })?.data?.error || 'No se pudieron guardar los cambios.');
    } finally {
      guardadoEnCurso.current = false;
      establecerGuardando(false);
    }
  };

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <Pressable style={s.control} onPress={() => navegacion.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={texto.color} strokeWidth={2.8} />
        </Pressable>
        <Text style={[s.titulo, texto]} accessibilityRole="header" numberOfLines={1}>Zonas de operación</Text>
        <View style={s.control} />
      </View>
      <KeyboardAvoidingView style={s.cuerpo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {cargando && <ActivityIndicator color={acento} />}
          {!cargando && !zonas.length && <View style={[tarjeta, s.vacio]}>
            <MapPin size={31} color={acento} strokeWidth={2.5} />
            <Text style={[s.mensajeVacio, error ? rojo : texto]} accessibilityLiveRegion="polite">
              {error || 'Todavía no hay zonas de operación registradas.'}
            </Text>
            {!!error && (
              <Pressable style={s.accion} onPress={cargar} accessibilityRole="button">
                <RefreshCw size={17} color={acento} strokeWidth={2.5} />
                <Text style={[s.enlace, { color: acento }]}>Reintentar</Text>
              </Pressable>
            )}
          </View>}
          {zonas.map(zona => (
            <View key={zona.id} style={tarjeta}>
              <View style={s.cabeceraZona}>
                <MapPin size={26} color={acento} strokeWidth={2.5} />
                <Text style={[s.nombreZona, texto]} accessibilityRole="header">{zona.nombre}</Text>
                <Text style={[s.estado, zona.activa ? { color: verde } : secundario]}>{zona.activa ? 'Activa' : 'Inactiva'}</Text>
              </View>
              {zonaEditada === zona.id && borrador ? <View style={[s.formulario, s.divisor, borde]}>
                <Text style={[s.secundario, secundario]}>Deja una tarifa vacía para usar la tarifa global.</Text>
                {camposEdicion.map(({ clave, nombre }) => {
                  const esComision = clave === 'comision';
                  const unidad = esComision ? '%' : mostrarMoneda(zona.moneda);
                  return (
                    <View key={clave} style={s.campo}>
                      <Text style={[s.etiqueta, texto]}>{nombre}</Text>
                      <View style={[s.entradaContenedor, oscuro && s.entradaOscura]}>
                        <View style={s.unidad}>
                          <Text style={[s.unidadTexto, secundario]}>{unidad}</Text>
                        </View>
                        <View style={[s.separadorCampo, oscuro && s.separadorCampoOscuro]} />
                        <TextInput style={[s.entrada, texto]}
                          accessibilityLabel={esComision ? 'Comisión en porcentaje' : `${nombre} en ${unidad}`}
                          placeholder={esComision ? undefined : 'Tarifa global'} placeholderTextColor={secundario.color}
                          keyboardType="decimal-pad" editable={!guardando} value={borrador[clave]}
                          onChangeText={valor => establecerBorrador({ ...borrador, [clave]: valor })} />
                      </View>
                    </View>
                  );
                })}
                {!!error && !confirmacion && <Text style={[s.secundario, rojo]} accessibilityRole="alert">{error}</Text>}
                <View style={s.acciones}>
                  <Pressable style={[s.boton, s.cancelar, borde]} disabled={guardando} accessibilityRole="button"
                    onPress={() => { establecerZonaEditada(null); establecerError(''); }}>
                    <Text style={[s.botonTexto, texto]}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={[s.boton, s.guardar]} disabled={guardando} onPress={() => revisarCambios(zona)} accessibilityRole="button">
                    <Text style={[s.botonTexto, s.textoBlanco]}>Revisar cambios</Text>
                  </Pressable>
                </View>
              </View> : <>
                {tarifas.map(({ clave, nombre }, indice) => (
                  <View style={[s.fila, indice === 0 && s.divisor, borde]} key={clave}>
                    <Text style={[s.etiquetaFila, secundario]}>{nombre}</Text>
                    <Text style={[s.valor, zona[clave] == null ? secundario : texto]}>{mostrarTarifa(zona[clave], zona.moneda)}</Text>
                  </View>
                ))}
                <View style={[s.fila, s.divisor, borde]}>
                  <Text style={[s.etiquetaFila, texto]}>Comisión</Text>
                  <Text style={[s.valor, { color: acento }]}>{mostrarComision(zona.tasa_comision)}</Text>
                </View>
                {zonaGuardada === zona.id && <View style={[s.fila, s.aviso]}>
                  <Check size={18} color={verde} strokeWidth={2.8} />
                  <Text style={[s.secundario, { color: verde }]} accessibilityLiveRegion="polite">Cambios guardados.</Text>
                </View>}
                <Pressable style={[s.accion, s.divisor, borde]} disabled={guardando} onPress={() => editar(zona)} accessibilityRole="button"
                  accessibilityLabel={'Editar tarifas y comisión de ' + zona.nombre}>
                  <Pencil size={18} color={acento} strokeWidth={2.5} />
                  <Text style={[s.enlace, { color: acento }]}>Editar tarifas y comisión</Text>
                </Pressable>
              </>}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmarInferiorHoja visible={confirmacion !== null} title={confirmacion?.zona.nombre ?? ''}
        message={confirmacion?.resumen ?? ''} confirmLabel="Guardar cambios" cancelLabel="Volver"
        loading={guardando} error={error} stackedActions onConfirm={guardar}
        onCancel={() => { establecerConfirmacion(null); establecerError(''); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cuerpo: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  tarjeta: { paddingHorizontal: 16, borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 16, backgroundColor: '#FFFFFF' },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  cabeceraZona: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  nombreZona: { flex: 1, fontSize: 18, fontWeight: '700' },
  estado: { fontSize: 13, fontWeight: '700' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#EAEAF0', paddingTop: 12 },
  bordeOscuro: { borderColor: '#414141' },
  etiquetaFila: { flex: 1, fontSize: 14, fontWeight: '500' },
  valor: { flexShrink: 1, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  secundario: { fontSize: 13, lineHeight: 18 },
  aviso: { paddingBottom: 12 },
  accion: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8, paddingVertical: 12 },
  enlace: { flexShrink: 1, fontSize: 14, fontWeight: '700' },
  vacio: { alignItems: 'center', padding: 24, gap: 8 },
  mensajeVacio: { textAlign: 'center', fontSize: 15, fontWeight: '600' },
  formulario: { gap: 12, paddingBottom: 16 },
  campo: { gap: 6 },
  etiqueta: { fontSize: 14, fontWeight: '600' },
  entradaContenedor: {
    flexDirection: 'row', alignItems: 'center', minHeight: 58, borderWidth: 1, borderColor: '#EAEAF0',
    borderRadius: 13, backgroundColor: '#FFFFFF'
  },
  entradaOscura: { backgroundColor: '#222222', borderColor: '#414141' },
  unidad: { minWidth: 52, alignItems: 'center', paddingHorizontal: 8 },
  unidadTexto: { fontSize: 16, fontWeight: '700' },
  separadorCampo: { width: 1, height: 28, backgroundColor: '#EAEAF0' },
  separadorCampoOscuro: { backgroundColor: '#414141' },
  entrada: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 18, fontWeight: '600' },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 2 },
  boton: { minHeight: 54, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
  cancelar: { flex: 1, borderWidth: 1, borderColor: '#EAEAF0' },
  guardar: { flex: 1.5, backgroundColor: violeta },
  botonTexto: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  textoBlanco: { color: '#FFFFFF' }
});
