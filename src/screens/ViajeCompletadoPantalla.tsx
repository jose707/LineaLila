import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React, { useState as usarEstado, useEffect as usarEfecto, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  TouchableOpacity as PulsableOpacidad,
  ScrollView as DesplazableVista,
  Alert,
  ActivityIndicator as ActividadIndicador,
  TextInput as TextoEntrada,
  Modal,
  Image as Imagen,
  BackHandler as ReversoManejador } from
'react-native';
import { Banknote, Car, Check as Comprobar, CreditCard, Star, User as Usuario, X } from 'lucide-react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import {
  useNavigation as usarNavegacion,
  useRoute as usarRuta,
  RouteProp as RutaProp,
  useFocusEffect as usarEnfoqueEfecto,
  CommonActions } from
'@react-navigation/native';
import { RaizPilaParametroLista } from "../navigation/AplicacionNavegador";
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { viajesServicio } from "../services/viajes.servicio";
import { autenticacionServicio } from "../services/autenticacion.servicio";
import { calificacionesServicio } from "../services/ratings.servicio";
import { DestinoIndicadorIcono as DestinoIndicadorIcon, PasajeroMapaIcono, ParadaMapaIcono as ParadaMapaIcon } from "../components/MapUbicacionIcons";
import ConfirmarInferiorHoja from "../components/ConfirmarInferiorSheet";

const Colores = {
  primary: '#7514C5',
  primaryLight: '#9B45E4',
  primaryUltraLight: '#F3EAFC',
  primaryMuted: '#F3EAFC',
  black: '#111118',
  gray900: '#1A1A1A',
  gray600: '#7A7A8A',
  gray400: '#AFAFBF',
  gray200: '#E5E5EA',
  gray100: '#F7F7F9',
  white: '#FFFFFF',
  success: '#10B981'
};

interface CompletadoViaje {
  rideId: string;
  driverId: string;
  passengerId: string;
  driverName: string;
  driverRating: number;
  driverProfilePicture?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  passengerName: string;
  passengerRating: number;
  passengerProfilePicture?: string;
  otherUserName: string;
  otherUserRating: number;
  pickupLocation: string;
  dropoffLocation: string;
  waypoints: {address: string;sequence: number;}[];
  fare: number;
  distance: number;
  duration: number;
  totalTime: string;
  paymentMethod: string;
  completedAt: string;
}

const StarIcono = ({ filled: relleno, size: tamano = 28 }: {filled: boolean;size?: number;}) =>
<Star
  size={tamano}
  color={relleno ? Colores.primary : Colores.gray400}
  fill={relleno ? Colores.primary : 'transparent'}
  strokeWidth={1.8} />;



const ViajeCompletadoPantalla = () => {
  const navegacion = usarNavegacion();
  const ruta = usarRuta<RutaProp<RaizPilaParametroLista, 'RideCompleted'>>();
  const { user: usuario, isDriverMode: esConductorModo, updateUser: actualizarUsuario } = usarAutenticacion();

  const { rideId: viajeId } = ruta.params || { rideId: 'demo' };

  const [viaje, establecerViaje] = usarEstado<CompletadoViaje | null>(null);
  const [esCargando, establecerEsCargando] = usarEstado(true);
  const [seleccionadoCalificacion, establecerSeleccionadoCalificacion] = usarEstado(0);
  const [revisionTexto, establecerRevisionTexto] = usarEstado('');
  const [esEnviandoRevision, establecerEsEnviandoRevision] = usarEstado(false);
  const [mostrarRevisionModal, establecerMostrarRevisionModal] = usarEstado(false);
  const [mostrarOmitirConfirmar, establecerMostrarOmitirConfirmar] = usarEstado(false);
  const [revisionEnviado, establecerRevisionEnviado] = usarEstado(false);

  // 🔥 RESETEAR NAVEGACIÓN AL IR A INICIO
  const irHastaInicio = usarFuncionRetorno(() => {
    const destino = esConductorModo ? 'DriverHome' : 'Map';
    navegacion.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: destino as any }]
      })
    );
  }, [esConductorModo, navegacion]);

  // 🔥 MANEJAR BOTÓN ATRÁS NATIVO DEL DISPOSITIVO
  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      const alReversoPulsar = () => {
        irHastaInicio();
        return true;
      };

      const suscripcion = ReversoManejador.addEventListener(
        'hardwareBackPress',
        alReversoPulsar
      );
      return () => suscripcion.remove();
    }, [irHastaInicio])
  );

  const cargarViajeDetalles = usarFuncionRetorno(async () => {
    try {
      establecerEsCargando(true);
      const viajeDatos: any = await viajesServicio.obtenerViajePorId(viajeId);
      if (!viajeDatos) {
        Alert.alert('Error', 'No se pudo cargar el viaje');
        return;
      }
      const otroUsuario = esConductorModo ?
      viajeDatos.passenger :
      viajeDatos.driver?.User;
      const otroUsuarioCalificacion = esConductorModo ?
      viajeDatos.passenger?.rating ?? 5 :
      viajeDatos.driverRatingValue ?? viajeDatos.driver?.rating ?? 5;

      establecerViaje({
        rideId: viajeDatos.id,
        driverId: viajeDatos.driverId || '',
        passengerId: viajeDatos.passengerId || '',
        driverName: viajeDatos.driver?.User?.name || 'Conductor',
        driverRating:
        viajeDatos.driverRatingValue ?? viajeDatos.driver?.rating ?? 5,
        driverProfilePicture: viajeDatos.driver?.User?.profilePhoto,
        vehicleModel: viajeDatos.driver?.vehicleModel,
        vehicleColor: viajeDatos.driver?.vehicleColor,
        licensePlate: viajeDatos.driver?.vehiclePlate,
        passengerName: viajeDatos.passenger?.name || 'Pasajero',
        passengerRating:
        viajeDatos.passengerRatingValue ?? viajeDatos.passenger?.rating ?? 5,
        passengerProfilePicture: viajeDatos.passenger?.profilePhoto,
        otherUserName: otroUsuario?.name || 'Usuario',
        otherUserRating: otroUsuarioCalificacion,
        pickupLocation:
        viajeDatos.pickupLocation?.address || 'Ubicación de recogida',
        dropoffLocation:
        viajeDatos.dropoffLocation?.address || 'Ubicación de destino',
        waypoints: (viajeDatos.waypoints ?? []).
        map((parada: {address: string;sequence: number;}) => ({ address: parada.address, sequence: parada.sequence })).
        sort((primero: {sequence: number;}, segundo: {sequence: number;}) => primero.sequence - segundo.sequence),
        fare: viajeDatos.finalFare || viajeDatos.totalFare || 0,
        distance: (viajeDatos.distance || 0) / 1000,
        duration: Math.floor((viajeDatos.duration || 0) / 60),
        totalTime: `${Math.floor((viajeDatos.duration || 0) / 60)} min`,
        paymentMethod: viajeDatos.paymentMethod || 'Efectivo',
        completedAt: viajeDatos.completedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading ride details:', error);
      Alert.alert('Error', 'No se pudo cargar los detalles del viaje');
    } finally {
      establecerEsCargando(false);
    }
  }, [viajeId, esConductorModo]);

  usarEfecto(() => {
    cargarViajeDetalles();
  }, [cargarViajeDetalles]);
  const manejarEnviarRevision = async () => {
    if (seleccionadoCalificacion === 0) {
      Alert.alert('', 'Por favor selecciona una calificación');
      return;
    }
    establecerEsEnviandoRevision(true);
    try {
      // 🔥 NUEVO FLUJO: Usar el nuevo endpoint de ratings
      // Si soy PASAJERO (!isDriverMode) → califico al CONDUCTOR
      // Si soy CONDUCTOR (isDriverMode) → califico al PASAJERO

      let conductorId: string;
      let pasajeroId: string;

      if (!esConductorModo) {
        // Pasajero: yo califico al conductor
        conductorId = viaje?.driverId || '';
        pasajeroId = usuario?.id || '';
      } else {
        // Conductor: yo califico al pasajero
        // ride.driverId = drivers.id (FK correcto), NO user.id (users.id)
        conductorId = viaje?.driverId || '';
        pasajeroId = viaje?.passengerId || '';
      }

      console.log('📤 [RideCompleted] Enviando calificación:', {
        rideId: viajeId,
        driverId: conductorId,
        passengerId: pasajeroId,
        rating: seleccionadoCalificacion,
        comment: revisionTexto,
        isDriverMode: esConductorModo
      });

      await calificacionesServicio.enviarCalificacion(
        viajeId,
        conductorId,
        pasajeroId,
        seleccionadoCalificacion,
        revisionTexto,
        esConductorModo ? 'conductor' : 'pasajero'
      );

      // Refrescar datos del usuario para obtener el nuevo rating
      console.log('🔄 [RideCompleted] Refrescando datos del usuario...');
      const actualizadoUsuario = await autenticacionServicio.consultarUsuarioActual();
      console.log('🔄 [RideCompleted] Usuario obtenido del servidor:', {
        id: actualizadoUsuario?.id,
        name: actualizadoUsuario?.nombre,
        rating: actualizadoUsuario?.calificacion,
        totalViajes: actualizadoUsuario?.totalViajes
      });

      if (actualizadoUsuario) {
        try {
          console.log(
            '🔄 [RideCompleted] Llamando updateUser con:',
            actualizadoUsuario
          );
          actualizarUsuario(actualizadoUsuario);
          console.log('✅ [RideCompleted] Usuario actualizado en contexto');
        } catch (actualizarError) {
          console.warn(
            '⚠️ [RideCompleted] Error actualizando contexto:',
            actualizarError
          );
        }
      }

      establecerRevisionEnviado(true);
      establecerMostrarRevisionModal(false);
      setTimeout(() => irHastaInicio(), 2000);
    } catch (error: any) {
      console.error('❌ [RideCompleted] Error al enviar calificación:', error);
      Alert.alert('Error', error?.message || 'No se pudo enviar la reseña');
    } finally {
      establecerEsEnviandoRevision(false);
    }
  };

  const manejarOmitirRevision = () => {
    establecerMostrarOmitirConfirmar(true);
  };

  if (esCargando) {
    return (
      <SeguraZonaVista style={s.container}>
        <Vista style={s.centered}>
          <ActividadIndicador size="large" color={Colores.primary} />
          <Texto style={s.loadingText}>Finalizando viaje…</Texto>
        </Vista>
      </SeguraZonaVista>);

  }

  if (!viaje) {
    return (
      <SeguraZonaVista style={s.container}>
        <Vista style={s.centered}>
          <Texto style={s.errorText}>No se pudo cargar el viaje</Texto>
          <PulsableOpacidad style={s.retryBtn} onPress={cargarViajeDetalles}>
            <Texto style={s.retryBtnText}>Reintentar</Texto>
          </PulsableOpacidad>
        </Vista>
      </SeguraZonaVista>);

  }

  if (revisionEnviado) {
    return (
      <SeguraZonaVista style={s.container}>
        <Vista style={s.centered}>
          <Vista style={s.successRing}>
            <Comprobar size={38} color={Colores.primary} strokeWidth={2.5} />
          </Vista>
          <Texto style={s.successTitle}>¡Viaje completado!</Texto>
          <Texto style={s.successSub}>Tu reseña fue enviada exitosamente</Texto>
          <PulsableOpacidad style={s.primaryBtn} onPress={irHastaInicio}>
            <Texto style={s.primaryBtnText}>Ir a inicio</Texto>
          </PulsableOpacidad>
        </Vista>
      </SeguraZonaVista>);

  }

  const calificacionEtiquetas = [
  '',
  'Malo',
  'Regular',
  'Bueno',
  'Muy bueno',
  'Excelente'];


  return (
    <SeguraZonaVista style={s.container}>
      <DesplazableVista
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}>

        {/* RESUMEN DEL VIAJE */}
        <Vista style={s.hero}>
          <Vista style={s.heroText}>
            <Texto style={s.heroTitle}>Viaje completado</Texto>
            <Texto style={s.heroFare} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Bs. {viaje.fare}
            </Texto>
            <Texto style={s.heroLabel}>Total a pagar</Texto>
          </Vista>
          <Vista style={s.heroStatusIcon}>
            <Comprobar size={38} color={Colores.white} strokeWidth={2.8} />
          </Vista>
        </Vista>

        {/* ROUTE CARD */}
        <Vista style={s.card}>
          <Vista style={s.routeRow}>
            <Vista style={s.routeDots}>
              <PasajeroMapaIcono size={30} bare />
              {viaje.waypoints.map((parada, indice) =>
              <React.Fragment key={`${parada.sequence}-${indice}`}>
                  <Vista style={s.routeLine} />
                  <ParadaMapaIcon number={indice + 1} size={28} />
                </React.Fragment>
              )}
              <Vista style={s.routeLine} />
              <DestinoIndicadorIcon size={30} bare />
            </Vista>
            <Vista style={s.routeAddresses}>
              <Vista style={s.routeAddress}>
                <Texto style={s.routeAddressText} numberOfLines={1}>
                  {viaje.pickupLocation}
                </Texto>
              </Vista>
              {viaje.waypoints.map((parada, indice) =>
              <Vista key={`${parada.sequence}-${indice}`} style={s.routeAddress}>
                  <Texto style={s.routeAddressText} numberOfLines={1}>{parada.address}</Texto>
                </Vista>
              )}
              <Vista style={s.routeAddress}>
                <Texto style={s.routeAddressText} numberOfLines={1}>
                  {viaje.dropoffLocation}
                </Texto>
              </Vista>
            </Vista>
          </Vista>

          <Vista style={s.divider} />

          {/* STATS ROW */}
          <Vista style={s.statsRow}>
            <Vista style={s.stat} accessible accessibilityLabel={`Distancia: ${viaje.distance.toFixed(1)} kilómetros`}>
              <Texto style={s.statValue}>{viaje.distance.toFixed(1)}</Texto>
              <Texto style={s.statUnit}>km</Texto>
            </Vista>
            <Vista style={s.statSep} />
            <Vista style={s.stat} accessible accessibilityLabel={`Tiempo: ${viaje.duration} minutos`}>
              <Texto style={s.statValue}>{viaje.duration}</Texto>
              <Texto style={s.statUnit}>min</Texto>
            </Vista>
            <Vista style={s.statSep} />
            <Vista style={s.stat} accessible accessibilityLabel={`Método de pago: ${viaje.paymentMethod}`}>
              {viaje.paymentMethod === 'Efectivo' ?
              <Banknote size={26} color={Colores.primary} strokeWidth={1.8} /> :

              <CreditCard size={26} color={Colores.primary} strokeWidth={1.8} />
              }
            </Vista>
          </Vista>
        </Vista>

        {/* OTHER USER CARD */}
        <Vista style={s.card}>
          <Vista style={s.userRow}>
            <Vista style={s.userAvatar}>
              {esConductorModo ?
              viaje.passengerProfilePicture ?
              <Imagen
                source={privadoImagenOrigen(viaje.passengerProfilePicture)}
                style={s.userAvatarImage} /> :


              <Usuario size={27} color={Colores.primary} strokeWidth={1.8} /> :

              viaje.driverProfilePicture ?
              <Imagen
                source={privadoImagenOrigen(viaje.driverProfilePicture)}
                style={s.userAvatarImage} /> :


              <Car size={27} color={Colores.primary} strokeWidth={1.8} />
              }
            </Vista>
            <Vista style={s.userInfo}>
              <Texto style={s.userName}>
                {esConductorModo ? viaje.passengerName : viaje.driverName}
              </Texto>
              <Vista style={s.userRatingRow}>
                <Star size={14} color={Colores.primary} fill={Colores.primary} />
                <Texto style={s.userRating}>
                  {esConductorModo ? viaje.passengerRating.toFixed(1) : viaje.driverRating.toFixed(1)}
                </Texto>
                <Texto style={s.userRatingDot}>•</Texto>
                <Texto style={s.personRole}>{esConductorModo ? 'Pasajero' : 'Conductor'}</Texto>
              </Vista>
            </Vista>
          </Vista>
          {!esConductorModo && (
          viaje.vehicleModel || viaje.vehicleColor || viaje.licensePlate) &&
          <Vista style={s.vehicleSection}>
                {(viaje.vehicleModel || viaje.vehicleColor) &&
            <Texto style={s.vehicleText}>
                    {viaje.vehicleModel} {viaje.vehicleColor}
                  </Texto>
            }
                {viaje.licensePlate &&
            <Vista style={s.plateBadge}>
                    <Texto style={s.plateText}>
                      {viaje.licensePlate.toUpperCase()}
                    </Texto>
                  </Vista>
            }
              </Vista>
          }
        </Vista>

        {/* RATING CARD */}
        <Vista style={s.card}>
          <Texto style={s.ratingTitle}>¿Cómo fue tu viaje?</Texto>
          {seleccionadoCalificacion > 0 &&
          <Texto style={s.ratingLabelText}>
              {calificacionEtiquetas[seleccionadoCalificacion]}
            </Texto>
          }
          <Vista style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) =>
            <PulsableOpacidad
              key={star}
              onPress={() => establecerSeleccionadoCalificacion(star)}
              style={s.starBtn}
              accessibilityRole="button"
              accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}>

                <StarIcono filled={seleccionadoCalificacion >= star} size={36} />
              </PulsableOpacidad>
            )}
          </Vista>
        </Vista>
      </DesplazableVista>

      {/* FOOTER */}
      <Vista style={s.footer}>
        <PulsableOpacidad style={s.ghostBtn} onPress={manejarOmitirRevision}>
          <Texto style={s.ghostBtnText}>Omitir</Texto>
        </PulsableOpacidad>
        <PulsableOpacidad
          style={[
          s.primaryBtn,
          s.footerPrimary,
          seleccionadoCalificacion === 0 && s.btnDisabled]
          }
          onPress={() => establecerMostrarRevisionModal(true)}
          disabled={seleccionadoCalificacion === 0}>

          <Texto style={s.primaryBtnText}>Continuar</Texto>
        </PulsableOpacidad>
      </Vista>

      <ConfirmarInferiorHoja
        visible={mostrarOmitirConfirmar}
        title="¿Omitir reseña?"
        message="Puedes continuar sin calificar este viaje."
        confirmLabel="Omitir reseña"
        cancelLabel="Calificar"
        onConfirm={() => {
          establecerMostrarOmitirConfirmar(false);
          irHastaInicio();
        }}
        onCancel={() => establecerMostrarOmitirConfirmar(false)} />


      {/* REVIEW MODAL */}
      <Modal
        visible={mostrarRevisionModal}
        transparent
        animationType="slide"
        onRequestClose={() => establecerMostrarRevisionModal(false)}>

        <Vista style={s.modalOverlay}>
          <Vista style={s.modalSheet}>
            {/* HANDLE */}
            <Vista style={s.modalHandle} />

            <Vista style={s.modalHeader}>
              <Texto style={s.modalTitle}>Tu reseña</Texto>
              <PulsableOpacidad
                onPress={() => establecerMostrarRevisionModal(false)}
                style={s.closeBtn}>

                <X size={22} color={Colores.primary} strokeWidth={2.5} />
              </PulsableOpacidad>
            </Vista>

            <DesplazableVista
              style={s.modalBody}
              showsVerticalScrollIndicator={false}>

              {/* STARS */}
              <Vista style={s.modalStarsSection}>
                <Vista style={s.modalStarsRow}>
                  {[1, 2, 3, 4, 5].map((star) =>
                  <PulsableOpacidad
                    key={star}
                    onPress={() => establecerSeleccionadoCalificacion(star)}
                    style={s.starBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}>

                      <StarIcono filled={seleccionadoCalificacion >= star} size={40} />
                    </PulsableOpacidad>
                  )}
                </Vista>
                {seleccionadoCalificacion > 0 &&
                <Texto style={s.modalRatingLabel}>
                    {calificacionEtiquetas[seleccionadoCalificacion]}
                  </Texto>
                }
              </Vista>

              {/* TEXT INPUT */}
              <Texto style={s.sectionLabel}>Comentario</Texto>
              <TextoEntrada
                style={s.reviewInput}
                placeholder="Cuéntanos más sobre tu experiencia…"
                placeholderTextColor={Colores.gray400}
                multiline
                numberOfLines={4}
                value={revisionTexto}
                onChangeText={establecerRevisionTexto}
                maxLength={250} />

              <Texto style={s.charCount}>{revisionTexto.length}/250</Texto>
            </DesplazableVista>

            <Vista style={s.modalFooter}>
              <PulsableOpacidad
                style={[
                s.primaryBtn,
                s.modalConfirmBtn,
                esEnviandoRevision && s.btnDisabled]
                }
                onPress={manejarEnviarRevision}
                disabled={esEnviandoRevision}>

                {esEnviandoRevision ?
                <ActividadIndicador color={Colores.white} /> :

                <Texto style={s.primaryBtnText}>Enviar reseña</Texto>
                }
              </PulsableOpacidad>
            </Vista>
          </Vista>
        </Vista>
      </Modal>
    </SeguraZonaVista>);

};

const s = EstiloHoja.create({
  container: { flex: 1, backgroundColor: Colores.white },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },

  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colores.gray600,
    fontWeight: '500',
    letterSpacing: 0.2
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center'
  },

  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: Colores.primary,
    borderRadius: 14
  },
  retryBtnText: {
    color: Colores.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  },

  // SUCCESS
  successRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colores.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center'
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colores.black,
    marginTop: 20,
    marginBottom: 8
  },
  successSub: {
    fontSize: 15,
    color: Colores.gray600,
    marginBottom: 28,
    textAlign: 'center'
  },

  // SCROLL
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 12
  },

  // HERO
  hero: {
    backgroundColor: Colores.white,
    borderWidth: 1,
    borderColor: Colores.gray200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  heroText: { flex: 1, alignItems: 'flex-start' },
  heroStatusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colores.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colores.black,
    lineHeight: 21
  },
  heroFare: {
    fontSize: 48,
    fontWeight: '700',
    color: Colores.black,
    letterSpacing: -1.2,
    lineHeight: 52
  },
  heroLabel: {
    fontSize: 14,
    color: Colores.gray600,
    lineHeight: 18
  },

  // CARD
  card: {
    backgroundColor: Colores.white,
    borderWidth: 1,
    borderColor: Colores.gray200,
    borderRadius: 12,
    padding: 16
  },

  // ROUTE
  routeRow: { flexDirection: 'row', alignItems: 'stretch' },
  routeDots: { width: 30, alignItems: 'center', marginRight: 14, paddingVertical: 4 },
  routeLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: Colores.gray200,
    marginVertical: 4,
    minHeight: 12
  },
  routeAddresses: { flex: 1, justifyContent: 'space-between' },
  routeAddress: { paddingVertical: 4 },
  routeAddressText: { fontSize: 15, color: Colores.black, fontWeight: '500' },

  divider: { height: 1, backgroundColor: Colores.gray200, marginVertical: 14 },

  // STATS
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colores.black
  },
  statUnit: {
    fontSize: 13,
    color: Colores.gray600,
    fontWeight: '500'
  },
  statSep: { width: 1, height: 28, backgroundColor: Colores.gray200 },

  // PERSON
  personRow: { flexDirection: 'row', alignItems: 'center' },
  personAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colores.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  personAvatarEmoji: { fontSize: 26 },
  personInfo: { flex: 1 },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colores.black,
    marginBottom: 3
  },
  personRole: { fontSize: 12, color: Colores.gray400, fontWeight: '500' },
  personRating: {
    backgroundColor: Colores.primaryUltraLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  personRatingValue: { fontSize: 13, fontWeight: '700', color: Colores.primary },

  // USER CARDS
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colores.black,
    marginBottom: 14
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colores.primary,
    backgroundColor: Colores.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colores.black,
    marginBottom: 5
  },
  userRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  userRating: {
    fontSize: 14,
    fontWeight: '600',
    color: Colores.black
  },
  userRatingDot: { color: Colores.gray400, marginHorizontal: 4 },
  vehicleSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colores.gray200,
    alignItems: 'center'
  },
  vehicleText: {
    fontSize: 14,
    color: Colores.gray600,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'left'
  },
  plateBadge: {
    backgroundColor: Colores.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'center'
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colores.white,
    letterSpacing: 1
  },

  // RATING
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colores.black,
    marginBottom: 12
  },
  ratingLabelText: {
    fontSize: 14,
    color: Colores.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2
  },
  starBtn: { padding: 5, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  // FOOTER
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colores.white,
    gap: 12
  },
  ghostBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: Colores.gray100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ghostBtnText: { fontSize: 15, fontWeight: '600', color: Colores.gray600 },
  primaryBtn: {
    backgroundColor: Colores.primary,
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colores.white
  },
  footerPrimary: { flex: 1 },
  btnDisabled: { opacity: 0.35 },

  // MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  modalSheet: {
    backgroundColor: Colores.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '90%'
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colores.gray200,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colores.black
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 20 },

  modalStarsSection: { alignItems: 'center', marginBottom: 28 },
  modalStarsRow: { flexDirection: 'row', gap: 8 },
  modalRatingLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: Colores.primary
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colores.gray400,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12
  },

  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Colores.gray200,
    backgroundColor: Colores.white
  },
  catChipActive: {
    borderColor: Colores.primary,
    backgroundColor: Colores.primaryUltraLight
  },
  catIcon: { fontSize: 15, marginRight: 6 },
  catLabel: { fontSize: 13, fontWeight: '600', color: Colores.gray600 },
  catLabelActive: { color: Colores.primary },

  reviewInput: {
    borderWidth: 1,
    borderColor: Colores.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colores.black,
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: Colores.gray100
  },
  charCount: {
    fontSize: 11,
    color: Colores.gray400,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 20
  },

  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 8
  },
  modalConfirmBtn: { width: '100%' }
});

export default ViajeCompletadoPantalla;
