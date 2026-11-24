import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React, { useState as usarEstado, useEffect as usarEfecto } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  AppState,
  Modal,
  Image as Imagen } from

'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion, useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { usarAjustes } from "../context/AjustesContexto";
import { obtenerMiSolicitudEstado } from "../services/admin.servicio";
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { alPrimerPlanoNotificacion } from '../services/firebase.servicio';
import { calificacionesServicio } from "../services/ratings.servicio";
import { InsigniaPerfilVerificado } from '../theme/icons';
import RecordatorioIdentidad from '../components/RecordatorioIdentidad';
import {
  User as Usuario,
  History as Historial,
  Bell,
  Car,
  Clock,
  FileWarning,
  CircleX,
  Settings as Ajustes,
  ChevronRight as ChevronDerecha,
  X,
  Star,
  Headphones } from
'lucide-react-native';

interface UsuarioPerfil {
  nombre: string;
  correo: string;
  telefono: string;
  calificacion: number;
}

const Colores = {
  primary: '#7514C5',
  primaryLight: '#F3EAFC',
  primaryMid: '#EAD5F8',
  background: '#F7F7F9',
  surface: '#FFFFFF',
  text: '#111118',
  textSecondary: '#7A7A8A',
  textTertiary: '#AFAFBF',
  border: '#EAEAF0',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  success: '#16A34A',
  warning: '#D97706'
};

const estadosSolicitud = {
  pendiente: { titulo: 'Solicitud en revisión', mensaje: 'Estamos revisando tu solicitud.', icono: Clock },
  observado: { titulo: 'Solicitud observada', mensaje: 'Hay documentos por corregir. Ver detalles.', icono: FileWarning },
  rechazado: { titulo: 'Solicitud rechazada', mensaje: 'Consulta el motivo del rechazo.', icono: CircleX }
};




const PerfilPantalla = () => {
  const navegacion = usarNavegacion<any>();
  const [detalleSolicitud, establecerDetalleSolicitud] = usarEstado<{
    titulo: string;
    documentos: string[];
    motivo: string;
    reenviar?: () => void;
  } | null>(null);
  const cerrarDetalleSolicitud = () => establecerDetalleSolicitud(null);
  const { user: usuario, setIsDriverMode: establecerEsConductorModo, updateUser: actualizarUsuario } =
  usarAutenticacion();
  const { settings: ajustes } = usarAjustes();
  const esOscuro = ajustes.darkMode;

  const [perfil, establecerPerfil] = usarEstado<UsuarioPerfil>({
    nombre: 'Usuario',
    correo: 'usuario@email.com',
    telefono: '+591 7123456',
    calificacion: 5.0
  });

  const [conductorEstado, establecerConductorEstado] = usarEstado<Awaited<ReturnType<typeof obtenerMiSolicitudEstado>> | null>(null);
  const usuarioId = usuario?.id;
  const [viajesCalculados, establecerViajesCalculados] = usarEstado<{ usuarioId: string; total: number } | null>(null);
  const totalViajes = viajesCalculados && viajesCalculados.usuarioId === usuarioId ? viajesCalculados.total :
    usuario?.viajesCompletadosPasajero ?? usuario?.totalViajes ?? 0;
  usarEnfoqueEfecto(React.useCallback(() => {
    let vigente = true;
    autenticacionServicio.consultarUsuarioActual().then(datos => {
      if (vigente && datos) actualizarUsuario(datos);
    }).catch(() => {});
    return () => { vigente = false; };
  }, [usuarioId, actualizarUsuario]));
  const [cambiandoModo, establecerCambiandoModo] = usarEstado(false);
  const [calculadoCalificacion, establecerCalculadoCalificacion] = usarEstado<number>(5.0);


  usarEfecto(() => {
    if (usuario) {
      establecerPerfil((anterior) => ({
        ...anterior,
        nombre: usuario?.nombre ?? anterior.nombre,
        correo: usuario?.correo ?? anterior.correo,
        telefono: usuario?.telefono ?? anterior.telefono,
        calificacion: calculadoCalificacion
      }));
    }
  }, [usuario, calculadoCalificacion]);

  const cargarMiCalificacion = React.useCallback(async () => {
    if (!usuarioId) return;
    try {
      const datos = await calificacionesServicio.obtenerMiCalificacion({ propagarError: true });
      const finalCalificacion = datos.passengerRating ?? 5.0;
      establecerCalculadoCalificacion(finalCalificacion);

      establecerPerfil((anterior) => ({ ...anterior, calificacion: finalCalificacion }));
      establecerViajesCalculados({ usuarioId, total: datos.passengerTrips });
    } catch (error) {
      console.error('Error loading calificacion:', error);
    }
  }, [usuarioId]);

  usarEnfoqueEfecto(
    React.useCallback(() => {
      if (!usuarioId) return;
      let version = 0;
      let visible = true;
      const actualizarSolicitud = async () => {
        const consulta = ++version;
        try {
          const estado = await obtenerMiSolicitudEstado({ propagarError: true });
          if (visible && consulta === version) establecerConductorEstado(estado);
        } catch {
          // Conservar el último estado confirmado si falla la consulta.
        }
      };
      void actualizarSolicitud();
      void cargarMiCalificacion();
      const app = AppState.addEventListener('change', estado => {
        if (estado === 'active') void actualizarSolicitud();
      });
      const notificacion = alPrimerPlanoNotificacion((_titulo, _cuerpo, datos) => {
        if (datos.request_id) void actualizarSolicitud();
      });
      return () => {
        visible = false;
        app.remove();
        notificacion();
      };
    }, [usuarioId, cargarMiCalificacion])
  );

  const activarModoConductor = async () => {
    if (cambiandoModo) return;
    establecerCambiandoModo(true);
    try {
      const actualizadoUsuario = await autenticacionServicio.cambiarModo('conductor');
      if (actualizadoUsuario) {
        actualizarUsuario(actualizadoUsuario);
      }

      establecerEsConductorModo(true);
    } catch (error: any) {
      if (error?.code === 'CONDUCTOR_SUSPENDIDO') {
        navegacion.navigate('ConductorSuspendido');
        return;
      }
      console.error('Error al cambiar modo:', error);
      Alert.alert(
        'Error',
        error.message || 'Ocurrió un error al cambiar de modo'
      );
    } finally {
      establecerCambiandoModo(false);
    }
  };

  const solicitudEstado = conductorEstado?.hasApplication ? conductorEstado.status : null;
  const esAprobadoConductor = solicitudEstado === 'aprobado';
  const estadoVisible = solicitudEstado && solicitudEstado !== 'aprobado' ? estadosSolicitud[solicitudEstado] : null;
  const IconoSolicitud = estadoVisible?.icono ?? Car;
  const tituloConductor = estadoVisible?.titulo ?? (esAprobadoConductor ? 'Modo conductor' : 'Conviértete en conductor');
  const colorConductor = solicitudEstado === 'rechazado' ? '#B91C1C' :
    solicitudEstado === 'observado' ? '#92400E' : Colores.primary;

  const abrirDetalleSolicitud = () => {
    if (solicitudEstado !== 'observado' && solicitudEstado !== 'rechazado') return;
    const solicitud = conductorEstado?.request;
    const motivo = solicitud?.rejectionReason?.trim() || 'Motivo no especificado';
    const rechazados = solicitud?.rejectedDocuments ?? [];
    const nombresDocumentos: Record<string, string> = {
      profilePhoto: 'Foto de perfil',
      ciFront: 'CI Frente',
      ciBack: 'CI Dorso',
      licenseFront: 'Licencia de conducir',
      licenseBack: 'Licencia de conducir',
      ticPhoto: 'TIC',
      antecedentsPhoto: 'Antecedentes',
      carFront: 'Auto frente',
      carBack: 'Auto dorso',
      carLeft: 'Auto lateral izquierdo',
      carRight: 'Auto lateral derecho',
      soatPhoto: 'SOAT',
      ruatPhoto: 'RUAT',
      domicileProof: 'Comprobante de domicilio'
    };
    const nombreDocumento = (clave: string) => nombresDocumentos[clave] || clave;
    const aprobados = Object.entries(solicitud?.documents ?? {})
      .filter(([, documento]) => documento.status === 'verificado')
      .map(([clave]) => nombreDocumento(clave));

    establecerDetalleSolicitud({
      titulo: estadosSolicitud[solicitudEstado].titulo,
      motivo,
      documentos: [...new Set(rechazados.map(nombreDocumento))],
      reenviar: rechazados.length > 0 ? () => {
        cerrarDetalleSolicitud();
        navegacion.navigate('DocumentoReenvio', {
          rejectedDocs: rechazados,
          approvedDocs: aprobados,
          rejectionReason: motivo,
          domicilio: solicitud?.metadata?.domicile,
          requestStatus: solicitudEstado
        });
      } : undefined
    });
  };

  const abrirOpcionConductor = esAprobadoConductor ? activarModoConductor : estadoVisible ? abrirDetalleSolicitud :
    () => navegacion.navigate('DriverRegistrationGuide', { user: usuario });

  const perfilFotoUrl = usuario?.fotoPerfil || usuario?.urlFoto || null;

  return (
    <SeguraZonaVista style={[estilos.container, esOscuro && estilos.containerDark]}>
      {/* HEADER */}
      <Vista style={[estilos.header, esOscuro && estilos.headerDark]}>
        <PulsableOpacidad
          style={estilos.backBtn}
          onPress={() => navegacion.goBack()}>

          <X size={24} color={Colores.primary} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Vista style={estilos.headerSpacer} />
        <Vista style={estilos.headerSpacer} />
      </Vista>

      <DesplazableVista
        style={estilos.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scrollContent}>

        {/* HERO CARD - Avatar izquierda */}
        <Vista style={[estilos.heroCard, esOscuro && estilos.heroCardDark]}>
          <Vista style={estilos.heroRow}>
            <Vista style={[estilos.avatarWrapperNew, esOscuro && estilos.avatarWrapperDark,
              usuario?.estadoVerificacionIdentidad !== 'verificado' && { borderWidth: 0 }]}>
              {perfilFotoUrl ?
              <Imagen
                source={privadoImagenOrigen(perfilFotoUrl)}
                style={estilos.avatarImage} /> :


              <Vista style={[estilos.avatarFallbackNew, esOscuro && estilos.avatarFallbackDark]}>
                  <Usuario size={32} color={Colores.primary} />
                </Vista>
              }
              {usuario?.estadoVerificacionIdentidad === 'verificado' && (
                <InsigniaPerfilVerificado etiqueta="Identidad verificada" />
              )}
            </Vista>
            <Vista style={estilos.heroInfo}>
              <Texto style={[estilos.heroNameNew, esOscuro && estilos.heroNameDark]}>{perfil.nombre}</Texto>
              <Texto style={[estilos.heroEmail, esOscuro && estilos.heroEmailDark]}>{perfil.correo}</Texto>
              <Vista style={estilos.ratingRow}>
                <Star size={14} color={Colores.primary} fill={Colores.primary} />
                <Texto style={[estilos.ratingTextSmall, esOscuro && estilos.ratingTextDark]}>{perfil.calificacion || '5.0'}</Texto>
                <Texto style={[estilos.ratingDot]}>•</Texto>
                <Texto style={[estilos.ratingSubtext, esOscuro && estilos.ratingSubtextDark]}>{totalViajes} {totalViajes === 1 ? 'viaje' : 'viajes'}</Texto>
              </Vista>
            </Vista>
            <PulsableOpacidad
              style={estilos.addAccountBtnRight}
              onPress={() => Alert.alert('Agregar cuenta', 'Pantalla en desarrollo')}>

              <Texto style={estilos.addAccountText}>+</Texto>
            </PulsableOpacidad>
          </Vista>
        </Vista>

        {/* MENÚ RÁPIDO - Grilla 2x2 */}
        <RecordatorioIdentidad usuario={usuario} oscuro={esOscuro}
          onVerificar={() => navegacion.navigate('IdentityVerification')} />
        <Vista style={estilos.menuGrid}>
          <PulsableOpacidad
            style={estilos.menuGridItem}
            onPress={() => navegacion.navigate('ProfileDetail')}
            accessibilityRole="button">

            <Vista style={estilos.menuCardContent}>
              <Vista style={estilos.menuGridIcon}>
                <Usuario size={25} color={Colores.primary} />
              </Vista>
              <Texto style={estilos.menuGridText}>Mi perfil</Texto>
            </Vista>
          </PulsableOpacidad>

          <PulsableOpacidad
            style={estilos.menuGridItem}
            onPress={() => navegacion.navigate('RideHistory')}>

            <Vista style={estilos.menuCardContent}>
              <Vista style={estilos.menuGridIcon}>
                <Historial size={25} color={Colores.primary} />
              </Vista>
              <Texto style={estilos.menuGridText}>Mis Viajes</Texto>
            </Vista>
          </PulsableOpacidad>

          <PulsableOpacidad
            style={estilos.menuGridItem}
            onPress={() => navegacion.navigate('Settings')}>

            <Vista style={estilos.menuCardContent}>
              <Vista style={estilos.menuGridIcon}>
                <Ajustes size={25} color={Colores.primary} />
              </Vista>
              <Texto style={estilos.menuGridText}>Ajustes</Texto>
            </Vista>
          </PulsableOpacidad>

          <PulsableOpacidad
            style={estilos.menuGridItem}
            onPress={() => navegacion.navigate('Notifications')}>

            <Vista style={estilos.menuCardContent}>
              <Vista style={estilos.menuGridIcon}>
                <Bell size={25} color={Colores.primary} />
              </Vista>
              <Texto style={estilos.menuGridText}>Notificaciones</Texto>
            </Vista>
          </PulsableOpacidad>
        </Vista>

        {/* AYUDA Y SOPORTE */}
        {usuario?.estadoVerificacionIdentidad !== 'verificado' && !usuario?.recordarVerificacionIdentidad &&
          !usuario?.verificacionIdentidadRequerida && (
          <PulsableOpacidad style={estilos.menuItemNew} onPress={() => navegacion.navigate('IdentityVerification')} accessibilityRole="button">
            <Texto style={estilos.menuItemTextNew}>Verificar identidad</Texto>
            <ChevronDerecha size={20} color={Colores.textTertiary} />
          </PulsableOpacidad>
        )}
        <Vista style={estilos.section}>
          <Vista style={estilos.menuContainer}>
            <PulsableOpacidad
              style={estilos.menuItemNew}
              onPress={() => navegacion.navigate('Support')}>

              <Vista style={estilos.menuItemLeftNew}>
                <Vista style={estilos.menuItemIcon}>
                  <Headphones size={25} color={Colores.primary} />
                </Vista>
                <Texto style={estilos.menuItemTextNew}>Soporte</Texto>
              </Vista>
              <ChevronDerecha size={20} color={Colores.textTertiary} />
            </PulsableOpacidad>
            {conductorEstado !== null && (
              <PulsableOpacidad
                style={estilos.menuItemNew}
                onPress={solicitudEstado === 'pendiente' ? undefined : abrirOpcionConductor}
                disabled={solicitudEstado === 'pendiente' || cambiandoModo}
                accessibilityRole={solicitudEstado === 'pendiente' ? undefined : 'button'}
                accessible
                accessibilityLiveRegion="polite">
                <Vista style={[estilos.menuItemLeftNew, estilos.solicitudFila]}>
                  <Vista style={estilos.menuItemIcon}>
                    <IconoSolicitud size={25} color={colorConductor} strokeWidth={2.5} />
                  </Vista>
                  <Vista style={estilos.solicitudTexto}>
                    <Texto style={estilos.menuItemTextNew}>{tituloConductor}</Texto>
                    {estadoVisible && <Texto style={estilos.solicitudMensaje}>{estadoVisible.mensaje}</Texto>}
                  </Vista>
                </Vista>
                {solicitudEstado !== 'pendiente' && <ChevronDerecha size={20} color={Colores.textTertiary} />}
              </PulsableOpacidad>
            )}
          </Vista>
        </Vista>

      </DesplazableVista>

      <Modal visible={detalleSolicitud !== null} transparent animationType="fade" onRequestClose={cerrarDetalleSolicitud}>
        {detalleSolicitud && (
          <Vista style={estilos.detalleFondo}>
            <Vista style={estilos.detalleTarjeta} accessibilityViewIsModal>
              <Vista style={estilos.detalleCabecera}>
                <Texto style={estilos.detalleTitulo}>{detalleSolicitud.titulo}</Texto>
                <PulsableOpacidad onPress={cerrarDetalleSolicitud} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10}>
                  <X size={24} color={Colores.text} strokeWidth={2.5} />
                </PulsableOpacidad>
              </Vista>
              <DesplazableVista style={estilos.detalleContenido}>
                <Texto style={estilos.detalleEtiqueta}>Motivo</Texto>
                <Texto style={estilos.detalleTexto}>{detalleSolicitud.motivo}</Texto>
                {detalleSolicitud.documentos.length > 0 && (
                  <Vista style={estilos.detalleDocumentos}>
                    <Texto style={estilos.detalleEtiqueta}>Documentos rechazados</Texto>
                    {detalleSolicitud.documentos.map((documento, indice) => (
                      <Texto key={`${documento}-${indice}`} style={estilos.detalleTexto}>• {documento}</Texto>
                    ))}
                  </Vista>
                )}
              </DesplazableVista>
              {detalleSolicitud.reenviar && (
                <PulsableOpacidad style={estilos.detalleBoton} accessibilityRole="button" onPress={detalleSolicitud.reenviar}>
                  <Texto style={estilos.detalleBotonTexto}>Reenviar</Texto>
                </PulsableOpacidad>
              )}
            </Vista>
          </Vista>
        )}
      </Modal>
    </SeguraZonaVista>);

};

const estilos = EstiloHoja.create({
  headerSpacer: { width: 40 },
  menuCardContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
    width: '100%'
  },
  detalleFondo: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.45)' },
  detalleTarjeta: { maxHeight: '85%', padding: 20, borderRadius: 24, backgroundColor: Colores.surface },
  detalleCabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detalleTitulo: { flex: 1, fontSize: 20, fontWeight: '800', color: Colores.text },
  detalleContenido: { flexGrow: 0, flexShrink: 1 },
  detalleEtiqueta: { marginBottom: 5, fontSize: 14, fontWeight: '700', color: Colores.text },
  detalleTexto: { fontSize: 15, lineHeight: 22, color: Colores.text },
  detalleDocumentos: { marginTop: 16 },
  detalleBoton: { marginTop: 20, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colores.text },
  detalleBotonTexto: { color: Colores.surface, fontSize: 16, fontWeight: '800' },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colores.surface
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backArrowLeft: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    backgroundColor: Colores.primary,
    transform: [{ rotate: '-45deg' }, { translateY: -3.5 }]
  },
  backArrowRight: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    backgroundColor: Colores.primary,
    transform: [{ rotate: '45deg' }, { translateY: 3.5 }]
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colores.text,
    letterSpacing: 0.1
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8
  },

  /* HERO */
  heroCard: {
    backgroundColor: Colores.surface,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 15

  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: Colores.primary,
    opacity: 0.06
  },
  avatarWrapper: {
    marginTop: 28,
    marginBottom: 14,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },

  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colores.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colores.text,
    letterSpacing: -0.3,
    marginBottom: 4
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colores.border,
    width: '100%',
    paddingHorizontal: 16
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colores.text
  },
  statLabel: {
    fontSize: 10,
    color: Colores.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colores.border
  },

  /* SECTION */
  section: {
    marginBottom: 4
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colores.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase'
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.primary
  },

  /* CARD */
  card: {
    backgroundColor: Colores.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 2
  },

  /* MODE CARD */
  modeCard: {
    backgroundColor: Colores.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colores.border
  },
  modeCardActive: {
    borderColor: Colores.primary,
    backgroundColor: Colores.primaryLight
  },
  modeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  modeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colores.textTertiary
  },
  modeIndicatorActive: {
    backgroundColor: Colores.primary
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colores.text,
    marginBottom: 2
  },
  modeDesc: {
    fontSize: 12,
    color: Colores.textSecondary
  },
  modeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },

  /* DRIVER CARD MEJORADO */
  driverIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  driverInfo: {
    flex: 1
  },
  driverSubtitle: {
    fontSize: 13,
    color: Colores.textSecondary,
    lineHeight: 18
  },

  driverRight: {
    alignItems: 'flex-end',
    gap: 8
  },
  driverActionBtn: {
    marginTop: 12,
    backgroundColor: '#F3EAFC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  driverActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colores.primary
  },

  /* INPUTS */
  inputGroup: {
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colores.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  input: {
    backgroundColor: Colores.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colores.text,
    borderWidth: 1,
    borderColor: Colores.border
  },

  /* EDIT ACTIONS */
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 4
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colores.primary,
    alignItems: 'center'
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colores.primary
  },
  btnFill: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colores.primary,
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  btnFillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },

  /* MENU ITEMS */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colores.border
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  menuItemText: {
    fontSize: 15,
    color: Colores.text
  },

  /* NUEVOS ESTILOS PROFESIONALES - UBER/CABIFY STYLE */
  containerDark: {
    backgroundColor: '#1A1A1A'
  },
  headerDark: {
    backgroundColor: '#1A1A1A',
    borderBottomColor: '#333'
  },
  headerTitleDark: {
    color: '#FFF'
  },
  editProfileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3EAFC',
    justifyContent: 'center',
    alignItems: 'center'
  },
  heroCardDark: {
    backgroundColor: '#2D2D2D'
  },
  heroCardNew: {
    backgroundColor: Colores.surface,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  avatarSection: {
    alignItems: 'center'
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16
  },
  addAccountBtnRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginRight: 16
  },
  addAccountText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666666'
  },
  heroEmail: {
    fontSize: 14,
    color: Colores.textSecondary,
    marginBottom: 6
  },
  heroEmailDark: {
    color: '#AAA'
  },
  avatarWrapperNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colores.primary,
    padding: 2,
    backgroundColor: Colores.surface
  },
  avatarWrapperDark: {
    backgroundColor: '#2D2D2D'
  },
  avatarFallbackNew: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: Colores.primaryLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarFallbackDark: {
    backgroundColor: '#3D3D3D'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27
  },
  heroNameNew: {
    fontSize: 22,
    fontWeight: '700',
    color: Colores.text,
    marginBottom: 2
  },
  heroNameDark: {
    color: '#FFF'
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colores.text
  },
  ratingTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: Colores.text
  },
  ratingTextDark: {
    color: '#FFF'
  },
  ratingDot: {
    color: Colores.textTertiary,
    marginHorizontal: 4
  },
  ratingSubtext: {
    fontSize: 13,
    color: Colores.textSecondary
  },
  ratingSubtextDark: {
    color: '#AAA'
  },

  /* Section Titles profesionales */
  sectionLabelNew: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4
  },

  /* Menu items profesionales */
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    gap: 12
  },
  menuGridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: 'flex-start',
    padding: 12
  },
  menuGridIcon: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  menuGridText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colores.text
  },
  menuContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginVertical: 5
  },
  menuItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: Colores.surface,
    borderRadius: 12

  },
  menuItemLeftNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  menuItemIcon: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center'

  },
  solicitudFila: { flex: 1 },
  solicitudTexto: { flex: 1 },
  solicitudMensaje: { marginTop: 3, color: '#666675', fontSize: 14, lineHeight: 19 },
  menuItemTextNew: {
    fontSize: 15,
    fontWeight: '500',
    color: Colores.text
  },

  /* Card moderno */
  cardModern: {
    backgroundColor: Colores.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },

  /* Driver card mejorado */
  driverCardNew: {
    backgroundColor: Colores.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  driverBigBtn: {
    backgroundColor: Colores.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    gap: 16
  },
  driverBigBtnContent: {
    flex: 1
  },
  driverBigBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colores.text
  },
  driverBigBtnSubtext: {
    fontSize: 12,
    color: Colores.textSecondary,
    marginTop: 2
  }
});

export default PerfilPantalla;




