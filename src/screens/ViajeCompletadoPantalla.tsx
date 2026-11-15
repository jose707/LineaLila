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
import { Banknote, Car, CheckCircle, Clock, QrCode, Route, Star, User as Usuario, X } from 'lucide-react-native';
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
import { usarAjustes } from '../context/AjustesContexto';
import { InsigniaPerfilVerificado } from '../theme/icons';

const Colores = {
  primary: '#7514C5',
  black: '#111118',
  gray600: '#666675',
  gray200: '#EAEAF0',
  gray100: '#F7F7F9',
  white: '#FFFFFF',
  success: '#167348'
};

interface CompletadoViaje {
  driverId: string;
  passengerId: string;
  driverName: string;
  driverRating: number;
  driverProfilePicture?: string;
  driverApproved: boolean;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  passengerName: string;
  passengerRating: number;
  passengerProfilePicture?: string;
  passengerVerified: boolean;
  pickupLocation: string;
  dropoffLocation: string;
  waypoints: {address: string;sequence: number;}[];
  fare: number;
  distance: number;
  duration: number;
  paymentMethod: string;
}

const nombresParticipante = (persona?: { firstNames?: string | null; name?: string | null }) => {
  const nombres = persona?.firstNames?.trim() || persona?.name?.trim().split(/\s+/)[0] || '';
  return nombres.toLowerCase().split(/\s+/).map(nombre => nombre.charAt(0).toUpperCase() + nombre.slice(1)).join(' ');
};

const ViajeCompletadoPantalla = () => {
  const navegacion = usarNavegacion();
  const ruta = usarRuta<RutaProp<RaizPilaParametroLista, 'RideCompleted'>>();
  const { user: usuario, isDriverMode: esConductorModo, updateUser: actualizarUsuario } = usarAutenticacion();
  const { settings: { darkMode: oscuro } } = usarAjustes();

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
      establecerViaje({
        driverId: viajeDatos.driverId || '',
        passengerId: viajeDatos.passengerId || '',
        driverName: nombresParticipante(viajeDatos.driver?.User) || 'Conductor',
        driverRating:
        viajeDatos.driverRatingValue ?? viajeDatos.driver?.rating ?? 5,
        driverProfilePicture: viajeDatos.driver?.User?.profilePhoto,
        driverApproved: viajeDatos.driver?.status === 'aprobado',
        vehicleModel: viajeDatos.driver?.vehicleModel,
        vehicleColor: viajeDatos.driver?.vehicleColor,
        licensePlate: viajeDatos.driver?.vehiclePlate,
        passengerName: nombresParticipante(viajeDatos.passenger) || 'Pasajero',
        passengerRating:
        viajeDatos.passengerRatingValue ?? viajeDatos.passenger?.rating ?? 5,
        passengerProfilePicture: viajeDatos.passenger?.profilePhoto,
        passengerVerified: viajeDatos.passenger?.identidadVerificada === true,
        pickupLocation:
        viajeDatos.pickupLocation?.address || 'Ubicación de recogida',
        dropoffLocation:
        viajeDatos.dropoffLocation?.address || 'Ubicación de destino',
        waypoints: (viajeDatos.waypoints ?? []).
        map((parada: {address: string;sequence: number;}) => ({ address: parada.address, sequence: parada.sequence })).
        sort((primero: {sequence: number;}, segundo: {sequence: number;}) => primero.sequence - segundo.sequence),
        fare: Number(viajeDatos.finalFare ?? viajeDatos.totalFare ?? 0),
        distance: (viajeDatos.distance || 0) / 1000,
        duration: Math.floor((viajeDatos.duration || 0) / 60),
        paymentMethod: viajeDatos.paymentMethod || 'efectivo'
      });
    } catch (error) {
      console.error('Error loading ride details:', error);
      Alert.alert('Error', 'No se pudo cargar los detalles del viaje');
    } finally {
      establecerEsCargando(false);
    }
  }, [viajeId]);

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

  const pantalla = [s.container, oscuro && s.pantallaOscura];
  const tarjeta = [s.card, oscuro && s.tarjetaOscura];
  const divisor = [s.divisor, oscuro && s.divisorOscuro];
  const tinta = { color: oscuro ? Colores.white : Colores.black };
  const secundario = { color: oscuro ? '#BDBDC7' : Colores.gray600 };
  const acento = oscuro ? '#D5A6FF' : Colores.primary;
  const verde = oscuro ? '#81DBAB' : Colores.success;

  if (esCargando || !viaje || revisionEnviado) {
    return (
      <SeguraZonaVista style={pantalla}>
        <Vista style={s.centered}>
          {esCargando ? (
            <>
              <ActividadIndicador size="large" color={acento} />
              <Texto style={secundario}>Cargando el resumen del viaje…</Texto>
            </>
          ) : revisionEnviado ? (
            <>
              <CheckCircle size={44} color={verde} strokeWidth={2.4} />
              <Texto style={[s.titulo, tinta]} accessibilityRole="header">Reseña enviada</Texto>
            </>
          ) : (
            <>
              <Texto style={[s.subtitulo, tinta]} accessibilityRole="alert">No se pudo cargar el viaje</Texto>
              <PulsableOpacidad style={s.primaryBtn} onPress={cargarViajeDetalles} accessibilityRole="button">
                <Texto style={s.primaryBtnText}>Reintentar</Texto>
              </PulsableOpacidad>
            </>
          )}
        </Vista>
      </SeguraZonaVista>
    );
  }

  const foto = esConductorModo ? viaje.passengerProfilePicture : viaje.driverProfilePicture;
  const nombre = esConductorModo ? viaje.passengerName : viaje.driverName;
  const calificacion = esConductorModo ? viaje.passengerRating : viaje.driverRating;
  const verificado = esConductorModo ? viaje.passengerVerified : viaje.driverApproved;
  const vehiculo = [viaje.vehicleModel, viaje.vehicleColor].filter(Boolean).join(' ');
  const IconoParticipante = esConductorModo ? Usuario : Car;
  const pagoQr = viaje.paymentMethod.toLowerCase() === 'qr';
  const IconoPago = pagoQr ? QrCode : Banknote;
  const etiquetas = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
  const estrellas = (
    <Vista style={s.starsRow}>
      {[1, 2, 3, 4, 5].map(valor => {
        const marcada = valor <= seleccionadoCalificacion;
        return (
          <PulsableOpacidad key={valor} onPress={() => establecerSeleccionadoCalificacion(valor)}
            style={s.starBtn} accessibilityRole="button" accessibilityState={{ selected: valor === seleccionadoCalificacion }}
            accessibilityLabel={`${valor} ${valor === 1 ? 'estrella' : 'estrellas'}`}>
            <Star size={30} color={marcada ? acento : secundario.color}
              fill={marcada ? acento : 'transparent'} strokeWidth={2} />
          </PulsableOpacidad>
        );
      })}
    </Vista>
  );
  const etiquetaCalificacion = seleccionadoCalificacion > 0 && (
    <Texto style={[s.ratingLabel, { color: acento }]} accessibilityLiveRegion="polite">
      {etiquetas[seleccionadoCalificacion]}
    </Texto>
  );

  return (
    <SeguraZonaVista style={pantalla}>
      <DesplazableVista showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <Vista style={s.cabecera}>
          <CheckCircle size={25} color={verde} strokeWidth={2.5} />
          <Texto style={[s.titulo, tinta]} accessibilityRole="header">Viaje finalizado</Texto>
        </Vista>

        <Vista style={tarjeta}>
          <Vista style={s.resumen}>
            <Vista style={s.datos}>
              <Texto style={[s.secundario, secundario]}>{esConductorModo ? 'Tarifa del viaje' : 'Total a pagar'}</Texto>
              <Texto style={[s.importe, tinta]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                Bs {viaje.fare.toFixed(2)}
              </Texto>
            </Vista>
            <Vista style={s.metrica}>
              <IconoPago size={19} color={acento} strokeWidth={2.3} />
              <Texto style={[s.secundario, tinta]}>{pagoQr ? 'QR' : 'Efectivo'}</Texto>
            </Vista>
          </Vista>
        </Vista>

        <Vista style={tarjeta}>
          <Vista style={s.fila}>
            <PasajeroMapaIcono size={26} bare color={tinta.color} />
            <Texto style={[s.direccion, tinta]}>{viaje.pickupLocation}</Texto>
          </Vista>
          {viaje.waypoints.map((parada, indice) => (
            <Vista style={[s.fila, ...divisor]} key={`${parada.sequence}-${indice}`}>
              <Vista style={s.iconoRuta}><ParadaMapaIcon number={parada.sequence || indice + 1} size={22} /></Vista>
              <Texto style={[s.direccion, tinta]}>{parada.address}</Texto>
            </Vista>
          ))}
          <Vista style={[s.fila, ...divisor]}>
            <DestinoIndicadorIcon size={26} bare color={tinta.color} />
            <Texto style={[s.direccion, tinta]}>{viaje.dropoffLocation}</Texto>
          </Vista>
          <Vista style={[s.metricas, ...divisor]}>
            <Vista style={s.metrica} accessible accessibilityLabel={`Distancia: ${viaje.distance.toFixed(1)} kilómetros`}>
              <Route size={17} color={secundario.color} strokeWidth={2.2} />
              <Texto style={[s.secundario, tinta]}>{viaje.distance.toFixed(1)} km</Texto>
            </Vista>
            <Vista style={s.metrica} accessible accessibilityLabel={`Duración: ${viaje.duration} minutos`}>
              <Clock size={17} color={secundario.color} strokeWidth={2.2} />
              <Texto style={[s.secundario, tinta]}>{viaje.duration} min</Texto>
            </Vista>
          </Vista>
        </Vista>

        <Vista style={tarjeta}>
          <Vista style={s.participante}>
            <Vista style={s.datos}>
              <Texto style={[s.secundario, secundario]}>{esConductorModo ? 'Pasajero' : 'Conductor'}</Texto>
              <Vista style={s.nombreFila}>
                <Texto style={[s.nombre, tinta]} numberOfLines={2}>{nombre}</Texto>
                <Vista style={s.metrica}>
                  <Star size={14} color={acento} fill={acento} />
                  <Texto style={[s.secundario, { color: acento }]}>{calificacion.toFixed(1)}</Texto>
                </Vista>
              </Vista>
              {!esConductorModo && !!(vehiculo || viaje.licensePlate) && (
                <Texto style={[s.secundario, secundario]}>
                  {vehiculo}
                  {vehiculo && viaje.licensePlate ? ' · ' : null}
                  {viaje.licensePlate && <Texto style={s.placa}>{viaje.licensePlate.toUpperCase()}</Texto>}
                </Texto>
              )}
            </Vista>
            <Vista>
              <Vista style={[s.avatar, oscuro && s.campoOscuro]}>
                {foto ? <Imagen source={privadoImagenOrigen(foto)} style={s.avatarImage} /> :
                  <IconoParticipante size={29} color={acento} strokeWidth={2} />}
              </Vista>
              {verificado && <InsigniaPerfilVerificado etiqueta={esConductorModo ? 'Identidad verificada' : 'Conductor aprobado'} />}
            </Vista>
          </Vista>
        </Vista>

        <Vista style={[...tarjeta, s.calificar]}>
          <Texto style={[s.subtitulo, tinta]} accessibilityRole="header">¿Cómo fue tu viaje?</Texto>
          {estrellas}
          {etiquetaCalificacion}
        </Vista>
      </DesplazableVista>

      <Vista style={[s.footer, ...divisor]}>
        <PulsableOpacidad style={[s.ghostBtn, oscuro && s.campoOscuro]} onPress={manejarOmitirRevision} accessibilityRole="button">
          <Texto style={[s.ghostBtnText, tinta]}>Omitir</Texto>
        </PulsableOpacidad>
        <PulsableOpacidad style={[s.primaryBtn, s.footerPrimary, seleccionadoCalificacion === 0 && s.btnDisabled]}
          onPress={() => establecerMostrarRevisionModal(true)} disabled={seleccionadoCalificacion === 0}
          accessibilityRole="button" accessibilityState={{ disabled: seleccionadoCalificacion === 0 }}>
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

      <Modal visible={mostrarRevisionModal} transparent animationType="slide"
        onRequestClose={() => establecerMostrarRevisionModal(false)}>
        <Vista style={s.modalOverlay}>
          <SeguraZonaVista style={[s.modalSheet, oscuro && s.pantallaOscura]} edges={['bottom']}>
            <Vista style={[s.modalHandle, oscuro && s.modalHandleOscuro]} />
            <Vista style={s.modalHeader}>
              <Texto style={[s.subtitulo, tinta]} accessibilityRole="header">Tu reseña</Texto>
              <PulsableOpacidad onPress={() => establecerMostrarRevisionModal(false)} style={s.closeBtn}
                accessibilityRole="button" accessibilityLabel="Cerrar reseña">
                <X size={24} color={tinta.color} strokeWidth={2.7} />
              </PulsableOpacidad>
            </Vista>
            <DesplazableVista contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {estrellas}
              {etiquetaCalificacion}
              <TextoEntrada style={[s.reviewInput, tinta, oscuro && s.campoOscuro]}
                accessibilityLabel="Comentario opcional" placeholder="Escribe un comentario (opcional)"
                placeholderTextColor={secundario.color} multiline value={revisionTexto}
                onChangeText={establecerRevisionTexto} maxLength={250} />
              <Texto style={[s.charCount, secundario]}>{revisionTexto.length}/250</Texto>
            </DesplazableVista>
            <Vista style={s.modalFooter}>
              <PulsableOpacidad style={[s.primaryBtn, esEnviandoRevision && s.btnDisabled]}
                onPress={manejarEnviarRevision} disabled={esEnviandoRevision}
                accessibilityRole="button" accessibilityLabel="Enviar reseña"
                accessibilityState={{ disabled: esEnviandoRevision, busy: esEnviandoRevision }}>
                {esEnviandoRevision ? <ActividadIndicador color={Colores.white} /> :
                  <Texto style={s.primaryBtnText}>Enviar reseña</Texto>}
              </PulsableOpacidad>
            </Vista>
          </SeguraZonaVista>
        </Vista>
      </Modal>
    </SeguraZonaVista>
  );
};

const s = EstiloHoja.create({
  container: { flex: 1, backgroundColor: Colores.white },
  pantallaOscura: { backgroundColor: '#222222' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 12 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  titulo: { flexShrink: 1, fontSize: 27, fontWeight: '800' },
  subtitulo: { fontSize: 19, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: Colores.gray200, borderRadius: 16, paddingHorizontal: 14 },
  tarjetaOscura: { backgroundColor: '#2D2D2D', borderColor: '#414141' },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  datos: { flex: 1, minWidth: 0, gap: 3 },
  secundario: { fontSize: 14, fontWeight: '600' },
  importe: { fontSize: 36, fontWeight: '800', letterSpacing: -0.7 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  iconoRuta: { width: 26, alignItems: 'center' },
  direccion: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  divisor: { borderTopWidth: EstiloHoja.hairlineWidth, borderColor: Colores.gray200 },
  divisorOscuro: { borderColor: '#414141' },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingVertical: 11 },
  metrica: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  participante: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { flexShrink: 1, fontSize: 22, fontWeight: '700' },
  placa: { fontWeight: '800' },
  avatar: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: Colores.gray100,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  calificar: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center', gap: 2 },
  starBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ratingLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  footer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  ghostBtn: {
    flex: 1, minHeight: 54, borderRadius: 12, backgroundColor: Colores.gray100,
    alignItems: 'center', justifyContent: 'center'
  },
  ghostBtnText: { fontSize: 16, fontWeight: '700' },
  primaryBtn: {
    minHeight: 54, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center'
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: Colores.white },
  footerPrimary: { flex: 1 },
  btnDisabled: { opacity: 0.4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colores.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '90%' },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colores.gray200,
    alignSelf: 'center', marginTop: 10
  },
  modalHandleOscuro: { backgroundColor: '#414141' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 16, gap: 8 },
  reviewInput: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    textAlignVertical: 'top', minHeight: 104, backgroundColor: Colores.gray100
  },
  campoOscuro: { backgroundColor: '#333333' },
  charCount: { fontSize: 12, textAlign: 'right' },
  modalFooter: { paddingHorizontal: 16, paddingVertical: 12 }
});

export default ViajeCompletadoPantalla;
