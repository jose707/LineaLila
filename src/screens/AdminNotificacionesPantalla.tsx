import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, Check, ChevronDown, ChevronRight, History, MessageSquare, Pencil, RefreshCw, Search, UserRound, UsersRound, X } from 'lucide-react-native';
import api from '../services/api.cliente';
import { usarAjustes } from '../context/AjustesContexto';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';

const color = '#7514C5';
const ruta = '/administracion/notificaciones';
const alcances = {
  individual: 'Una persona', pasajeros: 'Pasajeros', conductores: 'Conductores aprobados'
};
type Alcance = keyof typeof alcances;
type Destinatario = { id: string; nombre: string; telefono: string | null; perfil: string };
type VistaPrevia = { token: string; total: number };
type Envio = {
  id: string; alcance: Alcance | 'todos'; titulo: string; mensaje: string; creadoEn: string; administrador: string;
  destinatario: string | null; total: number; aceptados: number; fallidos: number;
  pendientes: number; omitidos: number; sinConfirmar: number;
};

const formatoDia = new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' });
const formatoHora = new Intl.DateTimeFormat('es-BO', { timeStyle: 'short', timeZone: 'America/La_Paz' });

function mensajeError(error: unknown, alternativa: string) {
  const datos = (error as { data?: { error?: string } } | null)?.data;
  return datos?.error || alternativa;
}

export default function AdministradorNotificacionesPantalla() {
  const navegacion = useNavigation<NativeStackNavigationProp<RaizPilaParametroLista>>();
  const { settings: { darkMode: oscuro } } = usarAjustes();
  const [pestana, establecerPestana] = useState<'redactar' | 'historial'>('redactar');
  const [alcance, establecerAlcance] = useState<Alcance>('individual');
  const [alcanceAbierto, establecerAlcanceAbierto] = useState(false);
  const [busqueda, establecerBusqueda] = useState('');
  const [destinatarios, establecerDestinatarios] = useState<Destinatario[]>([]);
  const [seleccionado, establecerSeleccionado] = useState<Destinatario | null>(null);
  const [buscando, establecerBuscando] = useState(false);
  const [errorBusqueda, establecerErrorBusqueda] = useState('');
  const [titulo, establecerTitulo] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [previa, establecerPrevia] = useState<VistaPrevia | null>(null);
  const [ocupado, establecerOcupado] = useState(false);
  const operacion = useRef(false);
  const [error, establecerError] = useState('');
  const [resultado, establecerResultado] = useState('');
  const [historial, establecerHistorial] = useState<Envio[]>([]);
  const [cargandoHistorial, establecerCargandoHistorial] = useState(false);
  const [hayMas, establecerHayMas] = useState(false);
  const [errorHistorial, establecerErrorHistorial] = useState('');

  useEffect(() => {
    const consulta = busqueda.trim();
    establecerDestinatarios([]);
    establecerErrorBusqueda('');
    if (alcance !== 'individual' || seleccionado || consulta.length < 2) {
      establecerBuscando(false);
      return;
    }
    let vigente = true;
    establecerBuscando(true);
    const espera = setTimeout(async () => {
      try {
        const datos = await api.obtener<{ destinatarios: Destinatario[] }>(ruta + '/destinatarios', { params: { q: consulta } });
        if (vigente) establecerDestinatarios(datos.destinatarios);
      } catch {
        if (vigente) establecerErrorBusqueda('No se pudo realizar la búsqueda. Vuelve a intentarlo.');
      } finally {
        if (vigente) establecerBuscando(false);
      }
    }, 300);
    return () => { vigente = false; clearTimeout(espera); };
  }, [alcance, busqueda, seleccionado]);

  async function cargarHistorial(offset = 0) {
    if (cargandoHistorial) return;
    establecerCargandoHistorial(true);
    establecerErrorHistorial('');
    try {
      const datos = await api.obtener<{ envios: Envio[]; hayMas: boolean }>(ruta, { params: { offset } });
      establecerHistorial(anterior => offset
        ? [...new Map([...anterior, ...datos.envios].map(envio => [envio.id, envio])).values()]
        : datos.envios);
      establecerHayMas(datos.hayMas);
    } catch (error) {
      establecerErrorHistorial(mensajeError(error, 'No se pudo consultar el historial.'));
    } finally {
      establecerCargandoHistorial(false);
    }
  }

  const preparar = async () => {
    if (operacion.current) return;
    operacion.current = true;
    establecerOcupado(true);
    establecerError('');
    establecerResultado('');
    try {
      const datos = await api.post<VistaPrevia>(ruta + '/vista-previa', {
        alcance, destinatarioId: alcance === 'individual' ? seleccionado?.id : null,
        titulo: titulo.trim(), mensaje: mensaje.trim()
      });
      establecerPrevia(datos);
    } catch (error) {
      establecerError(mensajeError(error, 'No se pudo preparar la vista previa.'));
    } finally {
      operacion.current = false;
      establecerOcupado(false);
    }
  };

  const enviar = async () => {
    if (!previa || operacion.current) return;
    operacion.current = true;
    establecerOcupado(true);
    establecerError('');
    try {
      const { total } = await api.post<{ total: number }>(ruta, { token: previa.token });
      establecerPrevia(null);
      establecerTitulo('');
      establecerMensaje('');
      establecerSeleccionado(null);
      establecerBusqueda('');
      establecerResultado(total === 1 ? 'Aviso guardado en 1 bandeja.' : 'Aviso guardado en ' + total + ' bandejas.');
      establecerPestana('historial');
      void cargarHistorial();
    } catch (error) {
      establecerError(mensajeError(error, 'No se pudo confirmar el envío. Reintenta desde esta vista previa.'));
    } finally {
      operacion.current = false;
      establecerOcupado(false);
    }
  };

  const destinatario = alcance === 'individual' ? seleccionado?.nombre : alcances[alcance];
  const formularioListo = !!titulo.trim() && !!mensaje.trim() && (alcance !== 'individual' || !!seleccionado);
  const acento = oscuro ? '#D5A6FF' : color;
  const tonoTexto = { color: oscuro ? '#FFFFFF' : '#111118' };
  const tonoSecundario = { color: oscuro ? '#BDBDC7' : '#666675' };
  const tarjeta = [s.tarjeta, oscuro && s.tarjetaOscura];
  const separador = [s.separador, oscuro && s.separadorOscuro];
  const campo = [s.campo, oscuro && s.campoOscuro];
  const separadorCampo = [s.separadorCampo, oscuro && s.separadorCampoOscuro];
  const tonoError = { color: oscuro ? '#FCA5A5' : '#B91C1C' };
  const tonoExito = { color: oscuro ? '#81DBAB' : '#167348' };
  const viendoHistorial = pestana === 'historial';
  const IconoCambio = viendoHistorial ? Pencil : History;
  const etiquetaCambio = viendoHistorial ? 'Redactar' : 'Historial';

  const hoy = formatoDia.format(new Date());
  const historialPorDia = new Map<string, { envio: Envio; hora: string }[]>();
  for (const envio of historial) {
    const fecha = new Date(envio.creadoEn);
    const fechaValida = Number.isFinite(fecha.getTime());
    const dia = fechaValida ? formatoDia.format(fecha) : 'Sin fecha';
    const grupo = historialPorDia.get(dia) ?? [];
    grupo.push({ envio, hora: fechaValida ? formatoHora.format(fecha) : '' });
    historialPorDia.set(dia, grupo);
  }

  return (
    <SafeAreaView style={[s.pantalla, oscuro && s.pantallaOscura]}>
      <View style={s.cabecera}>
        <Pressable style={s.control} onPress={() => navegacion.goBack()} disabled={ocupado}
          accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={tonoTexto.color} strokeWidth={2.8} />
        </Pressable>
        <Text accessibilityRole="header" style={[s.tituloCabecera, tonoTexto]} numberOfLines={1}>Notificaciones</Text>
        <Pressable style={s.control} onPress={() => navegacion.navigate('Notifications')} disabled={ocupado}
          accessibilityRole="button" accessibilityLabel="Mis notificaciones">
          <Bell size={23} color={tonoTexto.color} strokeWidth={2.5} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={s.cuerpo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView key={viendoHistorial ? 'historial' : previa ? 'previa' : 'redactar'}
          contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {viendoHistorial ? (
            <>
              {!!resultado && (
                <View style={[tarjeta, s.aviso]}>
                  <Check size={20} color={tonoExito.color} strokeWidth={2.8} />
                  <Text style={[s.avisoTexto, tonoExito]} accessibilityLiveRegion="polite">{resultado}</Text>
                </View>
              )}
              <View style={s.cabeceraSeccion}>
                <Text accessibilityRole="header" style={[s.seccion, tonoTexto]}>Envíos realizados</Text>
                <Pressable style={s.accion} disabled={cargandoHistorial} onPress={() => cargarHistorial()} accessibilityRole="button">
                  <RefreshCw size={17} color={acento} strokeWidth={2.5} />
                  <Text style={[s.enlace, { color: acento }]}>Actualizar</Text>
                </Pressable>
              </View>
              {!!errorHistorial && <Text style={[s.error, tonoError]} accessibilityRole="alert">{errorHistorial}</Text>}
              {cargandoHistorial && <ActivityIndicator color={acento} />}
              {!cargandoHistorial && !historial.length && !errorHistorial && (
                <View style={[tarjeta, s.vacio]}>
                  <History size={29} color={acento} strokeWidth={2.5} />
                  <Text style={[s.etiqueta, tonoTexto]}>Todavía no hay envíos manuales</Text>
                </View>
              )}
              {Array.from(historialPorDia, ([dia, grupo]) => (
                <View key={dia} style={s.grupo}>
                  <Text accessibilityRole="header" style={[s.etiqueta, tonoTexto]}>{dia === hoy ? 'Hoy' : dia}</Text>
                  <View style={tarjeta}>
                    {grupo.map(({ envio, hora }, indice) => (
                      <View key={envio.id} style={[s.filaHistorial, indice > 0 && separador]}>
                        <Bell size={22} color={acento} strokeWidth={2.5} />
                        <View style={s.datos}>
                          <Text style={[s.etiqueta, tonoTexto]}>{envio.titulo}</Text>
                          <Text style={[s.texto, tonoTexto]}>{envio.mensaje}</Text>
                          <Text style={[s.secundario, tonoSecundario]}>
                            {envio.destinatario ?? (envio.alcance === 'todos' ? 'Todos los usuarios activos' : alcances[envio.alcance])} · {envio.total} {envio.total === 1 ? 'destinatario' : 'destinatarios'}
                          </Text>
                          <Text style={[s.secundario, tonoSecundario]}>
                            {[envio.administrador, hora].filter(Boolean).join(' · ')}
                          </Text>
                          <View style={s.metricas}>
                            <Text style={[s.secundario, tonoSecundario]}>Push aceptados por Firebase: {envio.aceptados}</Text>
                            {envio.pendientes > 0 && <Text style={[s.secundario, tonoSecundario]}>Pendientes: {envio.pendientes}</Text>}
                            {envio.sinConfirmar > 0 && <Text style={[s.secundario, tonoSecundario]}>Sin confirmar: {envio.sinConfirmar}</Text>}
                            {envio.fallidos > 0 && <Text style={[s.secundario, tonoError]}>Fallidos: {envio.fallidos}</Text>}
                            {envio.omitidos > 0 && <Text style={[s.secundario, tonoSecundario]}>Sin push disponible: {envio.omitidos}</Text>}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {hayMas && (
                <Pressable style={[tarjeta, s.anteriores]} disabled={cargandoHistorial}
                  onPress={() => cargarHistorial(historial.length)} accessibilityRole="button">
                  <Text style={[s.enlace, { color: acento }]}>Ver envíos anteriores</Text>
                  <ChevronDown size={18} color={acento} strokeWidth={2.5} />
                </Pressable>
              )}
            </>
          ) : previa ? (
            <>
              <View style={s.grupo}>
                <Text accessibilityRole="header" style={[s.seccion, tonoTexto]}>Vista previa</Text>
                <Text style={[s.secundario, tonoSecundario]}>
                  {destinatario} · {previa.total} {previa.total === 1 ? 'destinatario' : 'destinatarios'}
                </Text>
                <View style={[tarjeta, s.filaHistorial]}>
                  <Bell size={23} color={acento} strokeWidth={2.5} />
                  <View style={s.datos}>
                    <Text style={[s.etiqueta, tonoTexto]}>{titulo.trim()}</Text>
                    <Text style={[s.texto, tonoTexto]}>{mensaje.trim()}</Text>
                  </View>
                </View>
              </View>
              {!!error && <Text style={[s.error, tonoError]} accessibilityRole="alert">{error}</Text>}
              <Pressable style={[s.boton, ocupado && s.desactivado]} disabled={ocupado}
                onPress={enviar} accessibilityRole="button">
                {ocupado ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={s.botonTexto}>{previa.total === 1 ? 'Enviar a 1 persona' : 'Enviar a ' + previa.total + ' personas'}</Text>
                )}
              </Pressable>
              <Pressable style={s.editar} disabled={ocupado}
                onPress={() => { establecerPrevia(null); establecerError(''); }} accessibilityRole="button">
                <Text style={[s.enlace, { color: acento }]}>Volver a editar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={s.grupo}>
                <Text accessibilityRole="header" style={[s.seccion, tonoTexto]}>Destinatarios</Text>
                <Pressable style={campo} disabled={ocupado}
                  onPress={() => establecerAlcanceAbierto(abierto => !abierto)}
                  accessibilityRole="button" accessibilityLabel={`Destinatarios, ${alcances[alcance]}`}
                  accessibilityState={{ expanded: alcanceAbierto, disabled: ocupado }}>
                  <View style={s.iconoCampo}><UsersRound size={20} color="#7A7A8A" strokeWidth={2.5} /></View>
                  <View style={separadorCampo} />
                  <Text style={[s.entrada, tonoTexto]}>{alcances[alcance]}</Text>
                  <View style={s.flechaSelector}>
                    <ChevronDown size={20} color="#7A7A8A" strokeWidth={2.5}
                      style={alcanceAbierto ? s.chevronAbierto : undefined} />
                  </View>
                </Pressable>
                {alcanceAbierto && (
                  <View style={tarjeta}>
                    {(Object.keys(alcances) as Alcance[]).map((opcion, indice) => {
                      const activa = alcance === opcion;
                      return (
                        <Pressable key={opcion} style={[s.filaOpcion, indice > 0 && separador]}
                          disabled={ocupado} onPress={() => {
                            establecerAlcance(opcion);
                            establecerAlcanceAbierto(false);
                          }}
                          accessibilityRole="radio" accessibilityState={{ checked: activa, disabled: ocupado }}>
                          <Text style={[s.etiqueta, s.datos, { color: activa ? acento : tonoTexto.color }]}>{alcances[opcion]}</Text>
                          {activa && <Check size={20} color={acento} strokeWidth={2.8} />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {alcance === 'individual' && (seleccionado ? (
                  <View style={[tarjeta, s.seleccionado]}>
                    <View style={s.filaOpcion}>
                      <UserRound size={22} color={acento} strokeWidth={2.5} />
                      <View style={s.datos}>
                        <Text style={[s.etiqueta, tonoTexto]}>{seleccionado.nombre}</Text>
                        <Text style={[s.secundario, tonoSecundario]}>
                          {[seleccionado.perfil, seleccionado.telefono].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <Pressable style={s.accion} disabled={ocupado} onPress={() => establecerSeleccionado(null)} accessibilityRole="button">
                      <Text style={[s.enlace, { color: acento }]}>Cambiar destinatario</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={campo}>
                      <View style={s.iconoCampo}><Search size={20} color="#7A7A8A" strokeWidth={2.5} /></View>
                      <View style={separadorCampo} />
                      <TextInput style={[s.entrada, tonoTexto]} value={busqueda} onChangeText={establecerBusqueda}
                        editable={!ocupado} autoCorrect={false} maxLength={100} placeholder="Nombre o teléfono"
                        placeholderTextColor="#9292A0" accessibilityLabel="Buscar por nombre o teléfono" />
                    </View>
                    {buscando && <ActivityIndicator color={acento} />}
                    {!!errorBusqueda && <Text style={[s.error, tonoError]} accessibilityRole="alert">{errorBusqueda}</Text>}
                    {!buscando && !errorBusqueda && busqueda.trim().length >= 2 && !destinatarios.length && (
                      <Text style={[s.secundario, tonoSecundario]}>No se encontraron usuarios activos.</Text>
                    )}
                    {destinatarios.length > 0 && (
                      <View style={tarjeta}>
                        {destinatarios.map((persona, indice) => (
                          <Pressable key={persona.id} style={[s.filaOpcion, indice > 0 && separador]} disabled={ocupado}
                            onPress={() => establecerSeleccionado(persona)} accessibilityRole="button">
                            <UserRound size={22} color={acento} strokeWidth={2.5} />
                            <View style={s.datos}>
                              <Text style={[s.etiqueta, tonoTexto]}>{persona.nombre}</Text>
                              <Text style={[s.secundario, tonoSecundario]}>
                                {[persona.perfil, persona.telefono].filter(Boolean).join(' · ')}
                              </Text>
                            </View>
                            <ChevronRight size={20} color={tonoSecundario.color} strokeWidth={2.3} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                ))}
              </View>

              <View style={s.grupo}>
                <Text accessibilityRole="header" style={[s.seccion, tonoTexto]}>Mensaje</Text>
                <View style={campo}>
                  <View style={s.iconoCampo}><Pencil size={20} color="#7A7A8A" strokeWidth={2.5} /></View>
                  <View style={separadorCampo} />
                  <TextInput style={[s.entrada, tonoTexto]} value={titulo}
                    onChangeText={establecerTitulo} editable={!ocupado} maxLength={100}
                    placeholder="Título" placeholderTextColor="#9292A0" accessibilityLabel="Título" />
                </View>
                <View style={[campo, s.campoMultilinea]}>
                  <View style={s.iconoCampo}><MessageSquare size={20} color="#7A7A8A" strokeWidth={2.5} /></View>
                  <View style={[separadorCampo, s.separadorMultilinea]} />
                  <TextInput style={[s.entrada, s.mensaje, tonoTexto]} value={mensaje}
                    onChangeText={establecerMensaje} editable={!ocupado} multiline maxLength={1000}
                    placeholder="Escribe el mensaje" placeholderTextColor="#9292A0" accessibilityLabel="Mensaje" />
                </View>
              </View>

              {!!error && <Text style={[s.error, tonoError]} accessibilityRole="alert">{error}</Text>}
              <Pressable style={[s.boton, !formularioListo && s.botonInactivo, !formularioListo && oscuro && s.tarjetaOscura]}
                disabled={!formularioListo || ocupado} onPress={() => {
                  establecerAlcanceAbierto(false);
                  void preparar();
                }} accessibilityRole="button">
                {ocupado ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={[s.botonTexto, !formularioListo && tonoSecundario]}>Ver vista previa</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
        <Pressable style={[s.botonFlotante, ocupado && s.desactivado]} disabled={ocupado}
          accessibilityRole="button" accessibilityLabel={viendoHistorial ? 'Redactar notificación' : 'Ver historial de envíos'}
          accessibilityState={{ disabled: ocupado }}
          onPress={() => {
            Keyboard.dismiss();
            establecerAlcanceAbierto(false);
            establecerPestana(viendoHistorial ? 'redactar' : 'historial');
            if (!viendoHistorial) void cargarHistorial();
          }}>
          <IconoCambio size={21} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={[s.etiqueta, s.textoFlotante]}>{etiquetaCambio}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFFFF' },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cuerpo: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tituloCabecera: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  contenido: { gap: 18, padding: 16, paddingBottom: 88 },
  botonFlotante: {
    position: 'absolute', right: 16, bottom: 16, minHeight: 52, borderRadius: 26,
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: color, elevation: 5, shadowColor: '#000000', shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 6,
  },
  textoFlotante: { color: '#FFFFFF' },
  grupo: { gap: 10 },
  seccion: { fontSize: 18, fontWeight: '700' },
  cabeceraSeccion: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tarjeta: { paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EAEAF0', backgroundColor: '#FFFFFF' },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EAEAF0' },
  separadorOscuro: { borderTopColor: '#4A4A4A', borderBottomColor: '#4A4A4A' },
  filaOpcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 12 },
  chevronAbierto: { transform: [{ rotate: '180deg' }] },
  flechaSelector: { marginRight: 14 },
  filaHistorial: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  datos: { flex: 1, gap: 5 },
  etiqueta: { fontSize: 15, fontWeight: '700' },
  texto: { fontSize: 14, lineHeight: 21 },
  secundario: { fontSize: 13, lineHeight: 18 },
  metricas: { marginTop: 4, gap: 3 },
  enlace: { fontSize: 14, fontWeight: '700' },
  accion: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  anteriores: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  aviso: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  avisoTexto: { flex: 1, fontSize: 14, fontWeight: '600' },
  vacio: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  seleccionado: { paddingBottom: 4 },
  campo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0', borderRadius: 13, minHeight: 58, overflow: 'hidden' },
  campoOscuro: { backgroundColor: '#222222', borderColor: '#414141' },
  campoMultilinea: { alignItems: 'flex-start' },
  iconoCampo: { width: 52, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  separadorCampo: { width: 1, height: 28, backgroundColor: '#EAEAF0' },
  separadorCampoOscuro: { backgroundColor: '#414141' },
  separadorMultilinea: { marginTop: 15 },
  entrada: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
  mensaje: { minHeight: 120, textAlignVertical: 'top' },
  boton: { backgroundColor: color, borderRadius: 12, minHeight: 54, alignItems: 'center', justifyContent: 'center', padding: 12 },
  botonTexto: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  botonInactivo: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAF0' },
  desactivado: { opacity: 0.65 },
  editar: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 14, lineHeight: 20 }
});
