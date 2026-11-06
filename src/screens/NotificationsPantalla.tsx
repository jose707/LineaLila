import React from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion } from '@react-navigation/native';
import { Bell, ChevronRight as ChevronDerecha, CheckCircle as ComprobarCircle, X, Mail } from 'lucide-react-native';

const Colores = {
  primary: '#7514C5',
  primaryLight: '#F3EAFC',
  background: '#F7F7F9',
  surface: '#FFFFFF',
  text: '#111118',
  textSecondary: '#7A7A8A',
  textTertiary: '#AFAFBF',
  border: '#EAEAF0',
  success: '#16A34A',
  danger: '#DC2626'
};

interface NotificacionElementoPropiedades {
  title: string;
  message: string;
  time: string;
  read: boolean;
  onPress?: () => void;
}

const NotificacionElemento: React.FC<NotificacionElementoPropiedades> = ({
  title: titulo,
  message: mensaje,
  time: tiempo,
  read: leer,
  onPress: alPulsar
}) =>
<PulsableOpacidad
  style={[estilos.notificationItem, !leer && estilos.notificationUnread]}
  onPress={alPulsar}
  activeOpacity={0.7}>

    <Vista style={[estilos.notificationIcon, { backgroundColor: leer ? '#F3F4F6' : '#F3EAFC' }]}>
      <Bell size={20} color={leer ? Colores.textTertiary : Colores.primary} />
    </Vista>
    <Vista style={estilos.notificationContent}>
      <Texto style={[estilos.notificationTitle, !leer && estilos.notificationTitleBold]}>
        {titulo}
      </Texto>
      <Texto style={estilos.notificationMessage} numberOfLines={2}>
        {mensaje}
      </Texto>
      <Texto style={estilos.notificationTime}>{tiempo}</Texto>
    </Vista>
    {!leer && <Vista style={estilos.unreadDot} />}
  </PulsableOpacidad>;


const NotificacionesPantalla: React.FC = () => {
  const navegacion = usarNavegacion();

  const [notificaciones, establecerNotificaciones] = React.useState([
  { id: '1', title: 'Viaje completado', message: 'Tu viaje a Plaza Murillo ha sido completado exitosamente.', time: 'Hace 2 horas', read: false },
  { id: '2', title: 'Nuevo conductor disponible', message: 'Conductores disponibles cerca de tu ubicación.', time: 'Hace 5 horas', read: false },
  { id: '3', title: 'Recordatorio de viaje', message: 'Puedes consultar tus viajes recientes en el historial.', time: 'Ayer', read: true },
  { id: '4', title: 'Viaje cancelado', message: 'El conductor canceló el viaje. Busca otro conductor.', time: 'Ayer', read: true },
  { id: '5', title: 'Bienvenido a LineaLila', message: 'Gracias por registrarte. Comienza a viajar seguro.', time: 'Hace 3 días', read: true }]
  );



  const unreadCantidad = notificaciones.filter((cantidad) => !cantidad.read).length;

  return (
    <SeguraZonaVista style={estilos.container}>
      <Vista style={estilos.header}>
        <PulsableOpacidad style={estilos.backBtn} onPress={() => navegacion.goBack()}>
          <X size={24} color={Colores.primary} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={estilos.headerTitle}>Notificaciones</Texto>
        <Vista style={{ width: 40 }} />
      </Vista>

      <DesplazableVista style={estilos.scrollView} showsVerticalScrollIndicator={false}>
        {/* Lista de notificaciones */}
        <Vista style={estilos.section}>
          <Vista style={estilos.sectionHeader}>
            <Texto style={estilos.sectionTitle}>RECIENTES</Texto>
            {unreadCantidad > 0 &&
            <PulsableOpacidad onPress={() => establecerNotificaciones((anterior) => anterior.map((cantidad) => ({ ...cantidad, read: true })))}>
                <Texto style={estilos.markAllRead}>Marcar todo como leído</Texto>
              </PulsableOpacidad>
            }
          </Vista>

          {notificaciones.length === 0 ?
          <Vista style={estilos.emptyState}>
              <Bell size={48} color={Colores.textTertiary} />
              <Texto style={estilos.emptyText}>No tienes notificaciones</Texto>
            </Vista> :

          <Vista style={estilos.card}>
              {notificaciones.map((notificacion, indice) =>
            <NotificacionElemento
              key={notificacion.id}
              title={notificacion.title}
              message={notificacion.message}
              time={notificacion.time}
              read={notificacion.read}
              onPress={() => {
                establecerNotificaciones((anterior) =>
                anterior.map((cantidad) => cantidad.id === notificacion.id ? { ...cantidad, read: true } : cantidad)
                );
              }} />

            )}
            </Vista>
          }
        </Vista>
      </DesplazableVista>
    </SeguraZonaVista>);

};

const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colores.surface
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  backButton: {
    fontSize: 18,
    color: Colores.primary
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colores.text
  },
  scrollView: {
    flex: 1
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  markAllRead: {
    fontSize: 13,
    color: Colores.primary,
    fontWeight: '500'
  },
  card: {
    backgroundColor: Colores.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden'
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  notificationUnread: {
    backgroundColor: '#F3EAFC'
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colores.text,
    marginBottom: 4
  },
  notificationTitleBold: {
    fontWeight: '700'
  },
  notificationMessage: {
    fontSize: 13,
    color: Colores.textSecondary,
    marginBottom: 4
  },
  notificationTime: {
    fontSize: 12,
    color: Colores.textTertiary
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colores.primary,
    marginLeft: 8
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 15,
    color: Colores.textSecondary,
    marginTop: 12
  }
});

export default NotificacionesPantalla;
