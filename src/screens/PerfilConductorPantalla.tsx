import { privadoImagenOrigen } from '../utils/privateImageOrigen';
import React, { useState as usarEstado, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  ActivityIndicator as ActividadIndicador,
  Image as Imagen } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion, useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { usarAjustes } from "../context/AjustesContexto";
import ConfirmarInferiorHoja from '../components/ConfirmarInferiorSheet';
import { launchCamera as launchCamara, launchImageLibrary as launchImagenLibrary } from 'react-native-image-picker';
import { obtenerMiConductorEstado, obtenerMiSolicitudEstado } from "../services/admin.servicio";
import { autenticacionServicio } from '../services/autenticacion.servicio';
import { API_BASE_URL } from "../config/constantes";
import {
  User as Usuario,
  X,
  CheckCircle,
  AlertCircle,
  ArrowLeftRight,
  Clock,
  Star,
  Bell,
  History,
  Settings,
  Wallet,
  ChevronRight } from
'lucide-react-native';
import { calificacionesServicio } from "../services/ratings.servicio";
import { InsigniaPerfilVerificado } from '../theme/icons';

const Colores = {
  primary: '#7514C5',
  primaryLight: '#F3EAFC',
  surface: '#FFFFFF',
  text: '#111118',
  textSecondary: '#666675',
  border: '#EAEAF0',
  danger: '#DC2626',
  success: '#167348',
  warning: '#8B4A08'
};

const documentosConductor = [
  { tipo: 'licencia', nombre: 'Licencia', claves: ['licenseFront', 'licenseBack'], campoVencimiento: 'licenseExpiryDate', campoInicio: 'licenseIssueDate' },
  { tipo: 'soat', nombre: 'SOAT', claves: ['soatPhoto'], campoVencimiento: 'soatExpiryDate', campoInicio: 'soatStartDate' }
] as const;

const formatoDiaBolivia = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit'
});

function normalizarVencimiento(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
  const iso = local ? [local[3], local[2].padStart(2, '0'), local[1].padStart(2, '0')].join('-') : texto;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const fecha = new Date(iso + 'T00:00:00Z');
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === iso ? iso : null;
}

const accesosConductor = [
  { nombre: 'Mis viajes', ruta: 'RideHistory', Icono: History },
  { nombre: 'Ajustes', ruta: 'Settings', Icono: Settings },
  { nombre: 'Notificaciones', ruta: 'Notifications', Icono: Bell },
  { nombre: 'Comisiones', ruta: 'DriverCommissions', Icono: Wallet }
] as const;

const motivosRuat: Record<string, string> = {
  accidente: 'Accidente registrado',
  vehiculo_no_coincide: 'El vehículo no coincide',
  reactivacion_tras_suspension: 'Reactivación de cuenta',
  antecedentes_penales: 'Verificación adicional'
};

export default function PerfilConductorPantalla() {
  const navegacion = usarNavegacion<NativeStackNavigationProp<RaizPilaParametroLista>>();
  const { user: usuario, updateUser: actualizarUsuario, token, logout: salir, setIsDriverMode: establecerModoConductor } = usarAutenticacion();
  const { settings: ajustes } = usarAjustes();
  const esOscuro = ajustes.darkMode;
  const acento = esOscuro ? '#D5A6FF' : Colores.primary;
  const colorTexto = esOscuro ? '#FFFFFF' : Colores.text;
  const colorSecundario = esOscuro ? '#BDBDC7' : Colores.textSecondary;

  const perfilFotoUrl = usuario?.fotoPerfil || usuario?.urlFoto || null;

  const [cambiandoModo, establecerCambiandoModo] = usarEstado(false);
  const [confirmarSalida, establecerConfirmarSalida] = usarEstado(false);
  const [saliendo, establecerSaliendo] = usarEstado(false);
  const [errorSalida, establecerErrorSalida] = usarEstado('');
  const [estadisticas, establecerEstadisticas] = usarEstado<Awaited<ReturnType<typeof calificacionesServicio.obtenerMiCalificacion>> | null>(null);

  const cargarMiCalificacion = usarFuncionRetorno(async () => {
    try {
      establecerEstadisticas(await calificacionesServicio.obtenerMiCalificacion());
    } catch (error) {
      console.error('Error loading rating:', error);
    }
  }, []);
  const calculadoCalificacion = estadisticas?.driverRating ?? usuario?.calificacionConductor;
  const totalViajes = estadisticas?.driverTrips ?? usuario?.totalViajesComoConductor ?? 0;

  const [conductorEstado, establecerConductorEstado] = usarEstado<Awaited<ReturnType<typeof obtenerMiConductorEstado>> | null>(null);
  const [solicitudEstado, establecerSolicitudEstado] = usarEstado<Awaited<ReturnType<typeof obtenerMiSolicitudEstado>> | null>(null);
  const [cargandoConductorEstado, establecerCargandoConductorEstado] = usarEstado(true);
  const [errorConductorEstado, establecerErrorConductorEstado] = usarEstado(false);
  const [ruatUploading, establecerRuatUploading] = usarEstado(false);

  const cargarConductorEstado = usarFuncionRetorno(async () => {
    try {
      establecerCargandoConductorEstado(true);
      establecerErrorConductorEstado(false);
      const [estado, solicitud] = await Promise.all([obtenerMiConductorEstado(), obtenerMiSolicitudEstado()]);
      establecerConductorEstado(estado);
      establecerSolicitudEstado(solicitud);
    } catch (error) {
      console.error('Error loading driver status:', error);
      establecerErrorConductorEstado(true);
    } finally {
      establecerCargandoConductorEstado(false);
    }
  }, []);

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      cargarConductorEstado();
      cargarMiCalificacion();
    }, [cargarConductorEstado, cargarMiCalificacion])
  );

  // RUAT upload logic
  const vehiculo = conductorEstado?.driver?.vehicle ?? null;
  const datosSolicitud = solicitudEstado?.request?.metadata;
  const vehiculoModelo = vehiculo?.model || datosSolicitud?.vehicleModel || '';
  const vehiculoPlaca = vehiculo?.plate || conductorEstado?.driver?.vehiclePlate || datosSolicitud?.vehiclePlate || '';
  const ruatVerificado: boolean = vehiculo?.ruatStatus === 'verificado' ||
    (!vehiculo?.ruatStatus && !!vehiculo?.ruatVerified);
  const ruatRequerido: boolean = vehiculo?.ruatRequired ?? false;
  const ruatPendiente: boolean = vehiculo?.ruatStatus === 'pendiente' || (!!vehiculo?.ruatFile && !ruatVerificado);
  const manejarRuatSubir = async (uri: string, origen: 'captura_camara' | 'archivo_subido') => {
    if (!token) return;
    establecerRuatUploading(true);
    try {
      const formulario = new FormData();
      if (vehiculo?.id) formulario.append('vehicleId', vehiculo.id);
      formulario.append('ruatPhotoOrigen', origen);
      formulario.append('ruatPhoto', {
        uri,
        type: 'image/jpeg',
        name: 'ruat.jpg'
      } as any);

      const respuesta = await fetch(`${API_BASE_URL}/conductores/enviar-ruat`, {
        method: 'POST',
        body: formulario,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!respuesta.ok) {
        const error = await respuesta.json();
        throw new Error(error.error || `Error ${respuesta.status}`);
      }

      Alert.alert(
        '✅ RUAT enviado',
        'Tu RUAT fue enviado correctamente. El administrador lo revisará pronto.'
      );
      cargarConductorEstado();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo enviar el RUAT.');
    } finally {
      establecerRuatUploading(false);
    }
  };

  const abrirRuatSelector = () => {
    Alert.alert('Subir RUAT', 'Selecciona una opción', [
    {
      text: 'Cámara',
      onPress: () =>
      launchCamara({ mediaType: 'photo', quality: 0.7 }, (r) => {
        if (r.assets?.[0]?.uri) manejarRuatSubir(r.assets[0].uri!, 'captura_camara');
      })
    },
    {
      text: 'Galería',
      onPress: () =>
      launchImagenLibrary({ mediaType: 'photo', quality: 0.7 }, (r) => {
        if (r.assets?.[0]?.uri) manejarRuatSubir(r.assets[0].uri!, 'archivo_subido');
      })
    },
    { text: 'Cancelar', style: 'cancel' }]
    );
  };

  const volverAModoPasajero = async () => {
    if (cambiandoModo || saliendo) return;
    establecerCambiandoModo(true);
    try {
      const actualizado = await autenticacionServicio.cambiarModo('pasajero');
      if (actualizado) actualizarUsuario(actualizado);
      establecerModoConductor(false);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cambiar a modo pasajero.');
    } finally {
      establecerCambiandoModo(false);
    }
  };

  const cerrarSesion = async () => {
    if (saliendo) return;
    establecerSaliendo(true);
    establecerErrorSalida('');
    try {
      await salir();
      establecerConfirmarSalida(false);
    } catch {
      establecerErrorSalida('No se pudo cerrar sesión. Intenta nuevamente.');
    } finally {
      establecerSaliendo(false);
    }
  };

  const tarjeta = [estilos.tarjeta, esOscuro && estilos.tarjetaOscura];
  const texto = { color: colorTexto };
  const secundario = { color: colorSecundario };
  const verde = esOscuro ? '#81DBAB' : Colores.success;
  const rojo = esOscuro ? '#FCA5A5' : Colores.danger;
  const ambar = esOscuro ? '#F7BF76' : Colores.warning;
  const partesHoy = formatoDiaBolivia.formatToParts(new Date());
  const hoy = ['year', 'month', 'day'].map(tipo => partesHoy.find(parte => parte.type === tipo)?.value).join('-');
  const archivosSolicitud = solicitudEstado?.request?.documents;
  const documentosVerificados = conductorEstado?.driver?.documentosVerificados;
  const documentosVisibles = documentosConductor.map(({ tipo, nombre, claves, campoVencimiento, campoInicio }) => {
    const estados = claves.map(clave => archivosSolicitud?.[clave]?.status);
    const documentoActivo = documentosVerificados?.[tipo];
    const verificado = documentosVerificados ? !!documentoActivo : estados.every(estado => estado === 'verificado');
    const vencimiento = normalizarVencimiento(documentosVerificados
      ? documentoActivo?.vencimiento
      : datosSolicitud?.[campoVencimiento]);
    const inicio = normalizarVencimiento(documentosVerificados ? documentoActivo?.inicio : datosSolicitud?.[campoInicio]);

    let etiqueta = 'Sin registrar';
    let color = colorSecundario;
    if (verificado) {
      if (!vencimiento) {
        etiqueta = 'Vigencia sin registrar';
      } else if (vencimiento < hoy) {
        etiqueta = 'Vencido';
        color = rojo;
      } else if (inicio && inicio > hoy) {
        etiqueta = 'Aún no vigente';
        color = ambar;
      } else {
        etiqueta = 'Vigente';
        color = verde;
      }
    } else if (estados.includes('rechazado')) {
      etiqueta = 'Rechazado';
      color = rojo;
    } else if (estados.includes('pendiente')) {
      etiqueta = 'En revisión';
      color = ambar;
    }
    return { nombre, etiqueta, color, verificado };
  });

  const estadoRuat = ruatPendiente
    ? { titulo: 'RUAT en revisión', Icono: Clock, color: ambar }
    : ruatRequerido
      ? { titulo: 'Verificación del RUAT requerida', Icono: AlertCircle, color: rojo }
      : null;
  const motivoRuat = ruatRequerido && !ruatVerificado && !ruatPendiente
    ? motivosRuat[vehiculo?.ruatRequiredReason ?? '']
    : undefined;
  const accionRuat = ruatRequerido ? 'Subir RUAT ahora' : 'Verificar vehículo';
  const colorAccionRuat = ruatRequerido ? rojo : acento;

  return (
    <SeguraZonaVista style={[estilos.pantalla, esOscuro && estilos.pantallaOscura]}>
      <Vista style={estilos.cabecera}>
        <PulsableOpacidad style={estilos.cerrar} onPress={() => navegacion.goBack()}
          accessibilityRole="button" accessibilityLabel="Cerrar">
          <X size={24} color={colorTexto} strokeWidth={2.8} />
        </PulsableOpacidad>
      </Vista>

      <DesplazableVista style={estilos.desplazable} contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Vista style={estilos.perfil}>
          <Vista>
            <Vista style={[estilos.avatar, esOscuro && estilos.avatarOscuro]}>
              {perfilFotoUrl ? (
                <Imagen source={privadoImagenOrigen(perfilFotoUrl)} style={estilos.foto} />
              ) : (
                <Vista style={[estilos.avatarSinFoto, esOscuro && estilos.avatarSinFotoOscuro]}>
                  <Usuario size={32} color={acento} strokeWidth={2.5} />
                </Vista>
              )}
            </Vista>
            {conductorEstado?.status === 'aprobado' && !!conductorEstado.driver && (
              <InsigniaPerfilVerificado etiqueta="Conductor aprobado" />
            )}
          </Vista>
          <Vista style={estilos.datosPerfil}>
            <Texto accessibilityRole="header" style={[estilos.nombre, texto]}>{usuario?.nombre || 'Conductor'}</Texto>
            <Vista style={estilos.estadisticas}>
              <Vista style={estilos.calificacion}>
                <Star size={15} color={acento} fill={acento} strokeWidth={2.5} />
                <Texto style={[estilos.valor, texto]}>{calculadoCalificacion?.toFixed(1) ?? 'Sin calificación'}</Texto>
              </Vista>
              <Texto style={[estilos.valor, secundario]}>
                {totalViajes} {totalViajes === 1 ? 'viaje' : 'viajes'} como conductor
              </Texto>
            </Vista>
          </Vista>
        </Vista>

        <Vista style={tarjeta}>
          {accesosConductor.map(({ nombre, ruta, Icono }, indice) => (
            <PulsableOpacidad key={ruta}
              style={[estilos.fila, indice > 0 && estilos.separador, indice > 0 && esOscuro && estilos.separadorOscuro]}
              onPress={() => navegacion.navigate(ruta)} activeOpacity={0.75} accessibilityRole="button">
              <Icono size={23} color={acento} strokeWidth={2.5} />
              <Texto style={[estilos.etiqueta, texto]}>{nombre}</Texto>
              <ChevronRight size={20} color={colorSecundario} strokeWidth={2.3} />
            </PulsableOpacidad>
          ))}
          <PulsableOpacidad style={[estilos.fila, estilos.separador, esOscuro && estilos.separadorOscuro]}
            onPress={volverAModoPasajero} disabled={cambiandoModo || saliendo}
            accessibilityRole="button" accessibilityState={{ disabled: cambiandoModo || saliendo }}>
            <ArrowLeftRight size={23} color={acento} strokeWidth={2.5} />
            <Texto style={[estilos.etiqueta, texto]}>Modo pasajero</Texto>
            {cambiandoModo ? <ActividadIndicador color={acento} size="small" />
              : <ChevronRight size={20} color={colorSecundario} strokeWidth={2.3} />}
          </PulsableOpacidad>
        </Vista>

        {cargandoConductorEstado && <ActividadIndicador color={acento} />}
        {!cargandoConductorEstado && errorConductorEstado && (
          <PulsableOpacidad style={[tarjeta, estilos.fila]} onPress={cargarConductorEstado} accessibilityRole="button">
            <AlertCircle size={23} color={rojo} strokeWidth={2.5} />
            <Texto style={[estilos.etiqueta, texto]}>No se pudo cargar el perfil. Toca para reintentar.</Texto>
          </PulsableOpacidad>
        )}
        {!cargandoConductorEstado && !errorConductorEstado && !conductorEstado?.driver && (
          <Texto style={[estilos.valor, secundario]}>Tu perfil de conductor estará disponible cuando se apruebe tu solicitud.</Texto>
        )}

        {conductorEstado?.driver && (
          <Vista style={estilos.seccion}>
            <Vista style={estilos.cabeceraSeccion}>
              <Texto accessibilityRole="header" style={[estilos.tituloSeccion, texto]}>Vehículo</Texto>
              {ruatVerificado && (
                <Vista style={estilos.verificado}>
                  <CheckCircle size={16} color={verde} strokeWidth={2.5} />
                  <Texto style={[estilos.estadoTexto, { color: verde }]}>Verificado</Texto>
                </Vista>
              )}
            </Vista>
            <Vista style={tarjeta}>
              <Vista style={estilos.fila}>
                <Texto style={[estilos.etiqueta, texto]}>Modelo</Texto>
                <Texto style={[estilos.detalle, secundario]}>{vehiculoModelo || 'No registrado'}</Texto>
              </Vista>
              <Vista style={[estilos.fila, estilos.separador, esOscuro && estilos.separadorOscuro]}>
                <Texto style={[estilos.etiqueta, texto]}>Placa</Texto>
                <Texto style={[estilos.detalle, secundario]}>{vehiculoPlaca || 'No registrada'}</Texto>
              </Vista>
              {vehiculo && !ruatVerificado && (
                <Vista style={[estilos.ruat, estilos.separador, esOscuro && estilos.separadorOscuro]}>
                  {estadoRuat && (
                    <Vista style={estilos.estadoRuat}>
                      <estadoRuat.Icono size={21} color={estadoRuat.color} strokeWidth={2.5} />
                      <Vista style={estilos.datosPerfil}>
                        <Texto style={[estilos.estadoTexto, { color: estadoRuat.color }]}>{estadoRuat.titulo}</Texto>
                        {!!motivoRuat && <Texto style={[estilos.valor, secundario]}>{motivoRuat}</Texto>}
                      </Vista>
                    </Vista>
                  )}
                  {!ruatPendiente && (
                    <PulsableOpacidad style={[estilos.boton, { borderColor: colorAccionRuat }]}
                      onPress={abrirRuatSelector} disabled={ruatUploading}
                      accessibilityRole="button" accessibilityState={{ disabled: ruatUploading, busy: ruatUploading }}>
                      {ruatUploading ? <ActividadIndicador color={acento} size="small" />
                        : <Texto style={[estilos.botonTexto, { color: colorAccionRuat }]}>{accionRuat}</Texto>}
                    </PulsableOpacidad>
                  )}
                </Vista>
              )}
            </Vista>
          </Vista>
        )}

        {!!conductorEstado?.driver && (
          <Vista style={estilos.seccion}>
            <Vista style={estilos.cabeceraSeccion}>
              <Texto accessibilityRole="header" style={[estilos.tituloSeccion, texto]}>Documentos</Texto>
              {documentosVisibles.every(documento => documento.verificado) && (
                <Vista style={estilos.verificado}>
                  <CheckCircle size={16} color={verde} strokeWidth={2.5} />
                  <Texto style={[estilos.estadoTexto, { color: verde }]}>Verificado</Texto>
                </Vista>
              )}
            </Vista>
            <Vista style={tarjeta}>
              {documentosVisibles.map(({ nombre, etiqueta, color }, indice) => (
                <Vista key={nombre} style={[estilos.fila, indice > 0 && estilos.separador, indice > 0 && esOscuro && estilos.separadorOscuro]}>
                  <Texto style={[estilos.etiqueta, texto]}>{nombre}</Texto>
                  <Texto style={[estilos.detalle, estilos.estadoTexto, { color }]}>{etiqueta}</Texto>
                </Vista>
              ))}
            </Vista>
          </Vista>
        )}
      </DesplazableVista>

      <Vista style={estilos.pie}>
        <PulsableOpacidad style={estilos.botonSalida}
          onPress={() => { establecerErrorSalida(''); establecerConfirmarSalida(true); }}
          disabled={cambiandoModo || saliendo} activeOpacity={0.85} accessibilityRole="button">
          <Texto style={estilos.textoSalida}>Cerrar sesión</Texto>
        </PulsableOpacidad>
      </Vista>
      <ConfirmarInferiorHoja visible={confirmarSalida} title="Cerrar sesión"
        message="¿Quieres cerrar sesión en tu cuenta?" confirmLabel="Cerrar sesión" cancelLabel="Cancelar"
        loading={saliendo} error={errorSalida} onConfirm={cerrarSesion}
        onCancel={() => establecerConfirmarSalida(false)} />
    </SeguraZonaVista>
  );
}

const estilos = EstiloHoja.create({
  pantalla: { flex: 1, backgroundColor: Colores.surface },
  pantallaOscura: { backgroundColor: '#1A1A1A' },
  cabecera: { paddingHorizontal: 16, paddingVertical: 10 },
  cerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  desplazable: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 20 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: Colores.primary, padding: 2, backgroundColor: Colores.surface },
  avatarOscuro: { backgroundColor: '#2D2D2D' },
  avatarSinFoto: { flex: 1, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.primaryLight },
  avatarSinFotoOscuro: { backgroundColor: '#3D3D3D' },
  foto: { width: '100%', height: '100%', borderRadius: 27 },
  datosPerfil: { flex: 1, gap: 4 },
  nombre: { fontSize: 22, fontWeight: '700' },
  estadisticas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 },
  calificacion: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  valor: { fontSize: 13, lineHeight: 19 },
  seccion: { gap: 10 },
  cabeceraSeccion: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4 },
  verificado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tituloSeccion: { fontSize: 18, fontWeight: '700' },
  tarjeta: { borderWidth: 1, borderColor: Colores.border, borderRadius: 14, paddingHorizontal: 14 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12 },
  separador: { borderTopWidth: EstiloHoja.hairlineWidth, borderTopColor: Colores.border },
  separadorOscuro: { borderTopColor: '#4A4A4A' },
  etiqueta: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  detalle: { flexShrink: 1, maxWidth: '50%', fontSize: 14, lineHeight: 20, textAlign: 'right' },
  ruat: { paddingVertical: 12, gap: 10 },
  estadoRuat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  estadoTexto: { fontSize: 13, fontWeight: '700' },
  pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  boton: { minHeight: 46, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  botonTexto: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  botonSalida: { minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: Colores.text, backgroundColor: Colores.surface, justifyContent: 'center', alignItems: 'center', padding: 12 },
  textoSalida: { fontSize: 19, fontWeight: '700', color: Colores.text, textAlign: 'center' }
});
