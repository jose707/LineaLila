import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React, { useState as usarEstado, useEffect as usarEfecto } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  Alert,
  Modal,
  Image as Imagen } from

'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion, useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { usarAjustes } from "../context/AjustesContexto";
import { obtenerMiSolicitudEstado as obtenerMySolicitudEstado } from "../services/admin.servicio";
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { calificacionesServicio } from "../services/ratings.servicio";
import {
  User as Usuario,
  History as Historial,
  Bell,
  Settings as Ajustes,
  Car,
  Wallet,
  ChevronRight as ChevronDerecha,
  Circle,
  X,
  Star,
  AlertCircle,
  Headphones } from
'lucide-react-native';

interface UsuarioPerfil {
  nombre: string;
  correo: string;
  telefono: string;
  calificacion: number;
  totalViajes: number;
}

interface ConductorPerfil extends UsuarioPerfil {
  vehicle: string;
  plate: string;
  documentId: string;
  joinDate: string;
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




const PerfilPantalla = () => {
  const navegacion = usarNavegacion<any>();
  const [detalleSolicitud, establecerDetalleSolicitud] = usarEstado<{
    titulo: string;
    documentos: string[];
    motivo: string;
    reenviar?: () => void;
  } | null>(null);
  const cerrarDetalleSolicitud = () => establecerDetalleSolicitud(null);
  const { user: usuario, logout: salir, isDriverMode: esConductorModo, setIsDriverMode: establecerEsConductorModo, updateUser: actualizarUsuario } =
  usarAutenticacion();
  const { settings: ajustes } = usarAjustes();
  const esOscuro = ajustes.darkMode;

  const [perfil, establecerPerfil] = usarEstado<ConductorPerfil>({
    nombre: 'Usuario',
    correo: 'usuario@email.com',
    telefono: '+591 7123456',
    vehicle: 'Toyota Corolla 2020',
    plate: 'ABC-1234',
    documentId: '1234567',
    calificacion: 5.0,
    totalViajes: 0,
    joinDate: 'Enero 2024'
  });

  const [conductorEstado, establecerConductorEstado] = usarEstado<{
    hasApplication: boolean;
    status?: string | null;
    driver?: any;
  } | null>(null);
  const [cargandoConductorEstado, establecerCargandoConductorEstado] = usarEstado(true);
  const [calculadoCalificacion, establecerCalculadoCalificacion] = usarEstado<number>(5.0);


  usarEfecto(() => {
    if (usuario) {
      const totalViajes =
      esConductorModo && usuario.totalViajesComoConductor ?
      usuario.totalViajesComoConductor :
      usuario.totalViajes;

      establecerPerfil((anterior) => ({
        ...anterior,
        nombre: usuario?.nombre ?? anterior.nombre,
        correo: usuario?.correo ?? anterior.correo,
        telefono: usuario?.telefono ?? anterior.telefono,
        calificacion: calculadoCalificacion,
        totalViajes: totalViajes ?? anterior.totalViajes
      }));
    }
  }, [usuario, esConductorModo, calculadoCalificacion]);

  const cargarConductorEstado = React.useCallback(async () => {
    try {
      establecerCargandoConductorEstado(true);
      const estado = await obtenerMySolicitudEstado();
      establecerConductorEstado(estado);
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      establecerCargandoConductorEstado(false);
    }
  }, [establecerCargandoConductorEstado, establecerConductorEstado]);

  const cargarMiCalificacion = React.useCallback(async () => {
    try {
      const datos = await calificacionesServicio.obtenerMiCalificacion();
      // Seleccionar rating según el modo actual
      const calificacion = esConductorModo && datos.driverRating !== null ?
      datos.driverRating :
      datos.passengerRating;
      const finalCalificacion = calificacion ?? 5.0;
      establecerCalculadoCalificacion(finalCalificacion);

      // Viajes completados según el modo actual
      const viajes = esConductorModo && datos.driverTrips !== undefined ?
      datos.driverTrips :
      datos.passengerTrips ?? 0;

      establecerPerfil((anterior) => ({ ...anterior, calificacion: finalCalificacion, totalViajes: viajes }));
    } catch (error) {
      console.error('Error loading calificacion:', error);
    }
  }, [esConductorModo, establecerCalculadoCalificacion, establecerPerfil]);

  usarEnfoqueEfecto(
    React.useCallback(() => {
      cargarConductorEstado();
      cargarMiCalificacion();
    }, [cargarConductorEstado, cargarMiCalificacion])
  );

  const manejarAlternarModo = async () => {
    try {
      if (!conductorEstado?.hasApplication || conductorEstado.status !== 'aprobado') {
        manejarBecomeConductor();
        return;
      }
      const nuevoModo = !esConductorModo;
      const cadenaModo = nuevoModo ? 'conductor' : 'pasajero';

      // Call backend to save the mode change
      const actualizadoUsuario = await autenticacionServicio.cambiarModo(cadenaModo);

      // Update auth context with new user data
      if (actualizadoUsuario) {
        actualizarUsuario(actualizadoUsuario);
      }

      // Update local state
      establecerEsConductorModo(nuevoModo);
      console.log('✅ [ProfileScreen] Modo cambiado y contexto actualizado:', {
        newMode: nuevoModo,
        userDriverRating: actualizadoUsuario?.calificacionConductor,
        userRating: actualizadoUsuario?.calificacion
      });

      Alert.alert(
        nuevoModo ? 'Modo Conductor' : 'Modo Pasajero',
        nuevoModo ?
        'Ahora puedes aceptar viajes' :
        'Ahora puedes solicitar viajes',
        [
        {
          text: 'Ok',
          onPress: () =>
          (navegacion as any).navigate(nuevoModo ? 'DriverHome' : 'Map')
        }]

      );
    } catch (error: any) {
      console.error('Error al cambiar modo:', error);
      Alert.alert(
        'Error',
        error.message || 'Ocurrió un error al cambiar de modo'
      );
    }
  };

  const manejarBecomeConductor = async () => {
    try {
      establecerCargandoConductorEstado(true);
      const estado = await obtenerMySolicitudEstado();
      establecerConductorEstado(estado);
      establecerCargandoConductorEstado(false);

      if (estado?.hasApplication) {
        const { status: solicitudEstado } = estado;
        if (solicitudEstado === 'pendiente') {
          Alert.alert(
            'Solicitud en revisión',
            'Tu solicitud está siendo revisada. Te notificaremos en 24–48 horas.',
            [{ text: 'Entendido' }]
          );
        } else if (solicitudEstado === 'aprobado') {
          // Save driver mode to backend
          const actualizadoUsuario = await autenticacionServicio.cambiarModo('conductor');
          if (actualizadoUsuario) {
            actualizarUsuario(actualizadoUsuario);
          }
          establecerEsConductorModo(true);
          console.log('✅ [ProfileScreen] Aprobado como conductor:', {
            userDriverRating: actualizadoUsuario?.calificacionConductor,
            userRating: actualizadoUsuario?.calificacion
          });
          Alert.alert('Acceso aprobado', 'Ya puedes operar como conductor.', [
          {
            text: 'Ok',
            onPress: () => (navegacion as any).navigate('DriverHome')
          }]
          );
        } else if (solicitudEstado === 'observado' || solicitudEstado === 'rechazado') {
          const rechazoMotivo =
          estado?.request?.rejectionReason || 'No especificada';
          const rechazadoDocumentosLista = estado?.request?.rejectedDocuments || [];
          const documentoClaveHastaNombre: {[key: string]: string;} = {
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
          const rechazadoDocumentoNames = rechazadoDocumentosLista.
          map((k: string) => documentoClaveHastaNombre[k] || k).
          filter(Boolean);
          const documentos = estado?.request?.documents || {};
          const aprobadoDocumentos = Object.entries(documentos).
          filter(([_, documento]: [string, any]) => documento?.status === 'verificado').
          map(([clave]) => documentoClaveHastaNombre[clave] || clave).
          filter(Boolean);
          const puedeResubmit = solicitudEstado === 'observado' || rechazadoDocumentosLista.length > 0 || !estado?.request?.metadata?.finalRejection;
          establecerDetalleSolicitud({
            titulo: solicitudEstado === 'observado' ? 'Solicitud observada' : 'Solicitud rechazada',
            motivo: rechazoMotivo,
            documentos: [...new Set(rechazadoDocumentoNames)],
            reenviar: puedeResubmit ? () => {
              cerrarDetalleSolicitud();
              establecerConductorEstado(null);
              navegacion.navigate('DocumentResubmission', {
                rejectedDocs: rechazadoDocumentosLista,
                approvedDocs: aprobadoDocumentos,
                rejectionReason: rechazoMotivo,
                domicilio: estado?.request?.metadata?.domicile,
                requestStatus: solicitudEstado
              });
            } : undefined
          });
        }
      } else {
        Alert.alert(
          'Solicitar acceso como conductor',
          'Completa el formulario de solicitud. Nuestro equipo lo revisará y te notificará.',
          [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: () =>
            (navegacion as any).navigate('DriverRegistration', { user: usuario })
          }]

        );
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo.');
    }
  };

  const esAprobadoConductor =
  conductorEstado?.hasApplication && conductorEstado.status === 'aprobado';

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
            <Vista style={[estilos.avatarWrapperNew, esOscuro && estilos.avatarWrapperDark]}>
              {perfilFotoUrl ?
              <Imagen
                source={privadoImagenOrigen(perfilFotoUrl)}
                style={estilos.avatarImage} /> :


              <Vista style={[estilos.avatarFallbackNew, esOscuro && estilos.avatarFallbackDark]}>
                  <Usuario size={32} color={Colores.primary} />
                </Vista>
              }
            </Vista>
            <Vista style={estilos.heroInfo}>
              <Texto style={[estilos.heroNameNew, esOscuro && estilos.heroNameDark]}>{perfil.nombre}</Texto>
              <Texto style={[estilos.heroEmail, esOscuro && estilos.heroEmailDark]}>{perfil.correo}</Texto>
              <Vista style={estilos.ratingRow}>
                <Star size={14} color={Colores.primary} fill={Colores.primary} />
                <Texto style={[estilos.ratingTextSmall, esOscuro && estilos.ratingTextDark]}>{perfil.calificacion || '5.0'}</Texto>
                <Texto style={[estilos.ratingDot]}>•</Texto>
                <Texto style={[estilos.ratingSubtext, esOscuro && estilos.ratingSubtextDark]}>{perfil.totalViajes} viajes</Texto>
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
        <Vista style={estilos.menuGrid}>
          <PulsableOpacidad
            style={estilos.menuGridItem}
            onPress={() => navegacion.navigate('ProfileDetail', {
              vehicleModel: conductorEstado?.driver?.vehicle?.model ?? perfil.vehicle,
              vehiclePlate: conductorEstado?.driver?.vehicle?.plate ?? perfil.plate,
              isApprovedDriver: esAprobadoConductor
            })}>

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

            {!esAprobadoConductor && !conductorEstado?.hasApplication &&
            <PulsableOpacidad
              style={estilos.menuItemNew}
              onPress={manejarBecomeConductor}>

                <Vista style={estilos.menuItemLeftNew}>
                  <Vista style={estilos.menuItemIcon}>
                    <Car size={25} color={Colores.primary} />
                  </Vista>
                  <Texto style={estilos.menuItemTextNew}>Conviértete en conductor</Texto>
                </Vista>
                <ChevronDerecha size={20} color={Colores.textTertiary} />
              </PulsableOpacidad>
            }

            {(esAprobadoConductor || esConductorModo || usuario?.rol === 'conductor') && (
              <PulsableOpacidad style={estilos.menuItemNew} onPress={() => navegacion.navigate('DriverCommissions')} accessibilityRole="button">
                <Vista style={estilos.menuItemLeftNew}>
                  <Vista style={estilos.menuItemIcon}><Wallet size={25} color={Colores.primary} /></Vista>
                  <Texto style={estilos.menuItemTextNew}>Comisiones</Texto>
                </Vista>
                <ChevronDerecha size={20} color={Colores.textTertiary} />
              </PulsableOpacidad>
            )}

            {(conductorEstado?.status === 'observado' || conductorEstado?.status === 'rechazado') &&
            <PulsableOpacidad
              style={estilos.menuItemNew}
              onPress={manejarBecomeConductor}>

                <Vista style={estilos.menuItemLeftNew}>
                  <Vista style={estilos.menuItemIcon}>
                    <AlertCircle size={25} color={Colores.danger} />
                  </Vista>
                  <Texto style={estilos.menuItemTextNew}>
                    {conductorEstado.status === 'observado' ? 'Solicitud observada' : 'Solicitud rechazada'}
                  </Texto>
                </Vista>
                <ChevronDerecha size={20} color={Colores.textTertiary} />
              </PulsableOpacidad>
            }

            {conductorEstado?.status === 'pendiente' &&
            <PulsableOpacidad
              style={estilos.menuItemNew}
              onPress={() => {}}>

                <Vista style={estilos.menuItemLeftNew}>
                  <Vista style={estilos.menuItemIcon}>
                    <Circle size={25} color={Colores.warning} />
                  </Vista>
                  <Texto style={estilos.menuItemTextNew}>Solicitud en revisión</Texto>
                </Vista>
              </PulsableOpacidad>
            }
          </Vista>
        </Vista>

      </DesplazableVista>

      {/* BOTTOM ACTIONS (fixed at the bottom) */}
      <Vista style={[estilos.logoutContainer, esOscuro && estilos.logoutContainerDark]}>
        {esAprobadoConductor &&
        <PulsableOpacidad
          style={[estilos.driverCard, esConductorModo && estilos.driverCardActive]}
          onPress={manejarAlternarModo}
          disabled={cargandoConductorEstado}
          activeOpacity={0.7}>

            <Texto style={[estilos.driverTitle, esConductorModo && estilos.driverTitleActive]}>
              {esConductorModo ? 'Modo Pasajero' : 'Modo Conductor'}
            </Texto>
          </PulsableOpacidad>
        }

        <PulsableOpacidad
          style={[estilos.logoutBtn, estilos.logoutBtnSinMargen]}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert('Cerrar sesión', 'Serás desconectado de tu cuenta.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Cerrar sesión',
              style: 'destructive',
              onPress: async () => {
                await salir();
              }
            }]
            );
          }}>

          <Texto style={estilos.logoutText}>Cerrar sesión</Texto>
        </PulsableOpacidad>
      </Vista>
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
  logoutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: '#FFFFFF'
  },
  logoutContainerDark: { backgroundColor: '#1A1A1A' },
  logoutBtnSinMargen: { marginTop: 0 },
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
  driverCard: {
    backgroundColor: '#F7F7F9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  driverCardActive: {
    backgroundColor: '#F3EAFC'
  },
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
  driverTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colores.textSecondary
  },
  driverTitleActive: {
    color: Colores.primary
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

  /* LOGOUT */
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colores.dangerLight,
    alignItems: 'center'
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colores.danger
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
    borderWidth: 2,
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
    borderRadius: 30,
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
    borderRadius: 30
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colores.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colores.surface
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
