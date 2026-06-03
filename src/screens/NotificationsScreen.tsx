import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronRight, CheckCircle, X, Mail } from 'lucide-react-native';

const COLORS = {
  primary: '#7514C5',
  primaryLight: '#F3EAFC',
  background: '#F7F7F9',
  surface: '#FFFFFF',
  text: '#111118',
  textSecondary: '#7A7A8A',
  textTertiary: '#AFAFBF',
  border: '#EAEAF0',
  success: '#16A34A',
  danger: '#DC2626',
};

interface NotificationItemProps {
  title: string;
  message: string;
  time: string;
  read: boolean;
  onPress?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  title,
  message,
  time,
  read,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.notificationItem, !read && styles.notificationUnread]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.notificationIcon, { backgroundColor: read ? '#F3F4F6' : '#F3EAFC' }]}>
      <Bell size={20} color={read ? COLORS.textTertiary : COLORS.primary} />
    </View>
    <View style={styles.notificationContent}>
      <Text style={[styles.notificationTitle, !read && styles.notificationTitleBold]}>
        {title}
      </Text>
      <Text style={styles.notificationMessage} numberOfLines={2}>
        {message}
      </Text>
      <Text style={styles.notificationTime}>{time}</Text>
    </View>
    {!read && <View style={styles.unreadDot} />}
  </TouchableOpacity>
);

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [notifications, setNotifications] = React.useState([
    { id: '1', title: 'Viaje completado', message: 'Tu viaje a Plaza Murillo ha sido completado exitosamente.', time: 'Hace 2 horas', read: false },
    { id: '2', title: 'Nuevo conductor disponible', message: 'Conductores disponibles cerca de tu ubicación.', time: 'Hace 5 horas', read: false },
    { id: '3', title: 'Promoción especial', message: '20% de descuento en tus próximos 3 viajes.', time: 'Ayer', read: true },
    { id: '4', title: 'Viaje cancelado', message: 'El conductor canceló el viaje. Busca otro conductor.', time: 'Ayer', read: true },
    { id: '5', title: 'Bienvenido a LineaLila', message: 'Gracias por registrarte. Comienza a viajar seguro.', time: 'Hace 3 días', read: true },
  ]);



  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <X size={24} color={COLORS.primary} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Lista de notificaciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECIENTES</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}>
                <Text style={styles.markAllRead}>Marcar todo como leído</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No tienes notificaciones</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {notifications.map((notification, index) => (
                <NotificationItem
                  key={notification.id}
                  title={notification.title}
                  message={notification.message}
                  time={notification.time}
                  read={notification.read}
                  onPress={() => {
                    setNotifications(prev =>
                      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                    );
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    fontSize: 18,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  markAllRead: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  notificationUnread: {
    backgroundColor: '#F3EAFC',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationTitleBold: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});

export default NotificationsScreen;