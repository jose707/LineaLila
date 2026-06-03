import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { getMyRequestStatus } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { ratingsService } from '../services/ratings.service';
import { API_BASE_URL } from '../config/constants';
import {
  User,
  Pencil,
  History,
  Bell,
  Settings,
  HelpCircle,
  Car,
  ChevronRight,
  Circle,
  X,
  Star,
  AlertCircle,
  FileText,
  Headphones,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  rating: number;
  totalRides: number;
}

interface DriverProfile extends UserProfile {
  vehicle: string;
  plate: string;
  documentId: string;
  joinDate: string;
}

const COLORS = {
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
  warning: '#D97706',
};




const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout, isDriverMode, setIsDriverMode, token, updateUser } =
    useAuth();
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  const [profile, setProfile] = useState<DriverProfile>({
    name: 'Usuario',
    email: 'usuario@email.com',
    phone: '+591 7123456',
    vehicle: 'Toyota Corolla 2020',
    plate: 'ABC-1234',
    documentId: '1234567',
    rating: 5.0,
    totalRides: 0,
    joinDate: 'Enero 2024',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [driverStatus, setDriverStatus] = useState<{
    hasApplication: boolean;
    status?: string | null;
    driver?: any;
  } | null>(null);
  const [loadingDriverStatus, setLoadingDriverStatus] = useState(true);
  const [calculatedRating, setCalculatedRating] = useState<number>(5.0);


  useEffect(() => {
    if (user) {
      const totalRides =
        isDriverMode && user.totalTripsAsDriver
          ? user.totalTripsAsDriver
          : user.totalTrips;

      setProfile(prev => ({
        ...prev,
        name: user?.name ?? prev.name,
        email: user?.email ?? prev.email,
        phone: user?.phone ?? prev.phone,
        rating: calculatedRating,
        totalRides: totalRides ?? prev.totalRides,
      }));
    }
  }, [user, isDriverMode, calculatedRating]);

  useEffect(() => {
    loadDriverStatus();
    loadMyRating();
  }, [isDriverMode]);

  useFocusEffect(
    React.useCallback(() => {
      loadDriverStatus();
      loadMyRating();
    }, [isDriverMode]),
  );

  const loadDriverStatus = async () => {
    try {
      setLoadingDriverStatus(true);
      const status = await getMyRequestStatus();
      setDriverStatus(status);
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      setLoadingDriverStatus(false);
    }
  };

  const loadMyRating = async () => {
    try {
      const data = await ratingsService.getMyRating();
      // Seleccionar rating según el modo actual
      const rating = isDriverMode && data.driverRating !== null
        ? data.driverRating
        : data.passengerRating;
      const finalRating = rating ?? 5.0;
      setCalculatedRating(finalRating);

      // Viajes completados según el modo actual
      const trips = isDriverMode && data.driverTrips !== undefined
        ? data.driverTrips
        : data.passengerTrips ?? 0;

      setProfile(prev => ({ ...prev, rating: finalRating, totalRides: trips }));
    } catch (e) {
      console.error('Error loading rating:', e);
    }
  };



  const handleSave = async () => {
    try {
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Perfil actualizado', 'Los cambios fueron guardados.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el perfil');
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleToggleMode = async () => {
    try {
      if (!driverStatus?.hasApplication || driverStatus.status !== 'approved') {
        handleBecomeDriver();
        return;
      }
      const newMode = !isDriverMode;
      const modeString = newMode ? 'driver' : 'passenger';

      // Call backend to save the mode change
      const updatedUser = await authService.changeMode(modeString);

      // Update auth context with new user data
      if (updatedUser) {
        updateUser(updatedUser);
      }

      // Update local state
      setIsDriverMode(newMode);
      console.log('✅ [ProfileScreen] Modo cambiado y contexto actualizado:', {
        newMode,
        userDriverRating: updatedUser?.driverRating,
        userRating: updatedUser?.rating,
      });

      Alert.alert(
        newMode ? 'Modo Conductor' : 'Modo Pasajero',
        newMode
          ? 'Ahora puedes aceptar viajes'
          : 'Ahora puedes solicitar viajes',
        [
          {
            text: 'Ok',
            onPress: () =>
              (navigation as any).navigate(newMode ? 'DriverHome' : 'Map'),
          },
        ],
      );
    } catch (error: any) {
      console.error('Error al cambiar modo:', error);
      Alert.alert(
        'Error',
        error.message || 'Ocurrió un error al cambiar de modo',
      );
    }
  };

  const handleBecomeDriver = async () => {
    try {
      setLoadingDriverStatus(true);
      const status = await getMyRequestStatus();
      setDriverStatus(status);
      setLoadingDriverStatus(false);

      if (status?.hasApplication) {
        const { status: requestStatus } = status;
        if (requestStatus === 'pending') {
          Alert.alert(
            'Solicitud en revisión',
            'Tu solicitud está siendo revisada. Te notificaremos en 24–48 horas.',
            [{ text: 'Entendido' }],
          );
        } else if (requestStatus === 'approved') {
          // Save driver mode to backend
          const updatedUser = await authService.changeMode('driver');
          if (updatedUser) {
            updateUser(updatedUser);
          }
          setIsDriverMode(true);
          console.log('✅ [ProfileScreen] Aprobado como conductor:', {
            userDriverRating: updatedUser?.driverRating,
            userRating: updatedUser?.rating,
          });
          Alert.alert('Acceso aprobado', 'Ya puedes operar como conductor.', [
            {
              text: 'Ok',
              onPress: () => (navigation as any).navigate('DriverHome'),
            },
          ]);
        } else if (requestStatus === 'rejected') {
          const rejectionReason =
            status?.request?.rejectionReason || 'No especificada';
          const rejectedDocsList = status?.request?.rejectedDocuments || [];
          const docKeyToName: { [key: string]: string } = {
            profilePhoto: 'Foto de perfil',
            ciFront: 'CI Frente',
            ciBack: 'CI Dorso',
            licenseFront: 'Licencia frente',
            licenseBack: 'Licencia dorso',
            antecedentsPhoto: 'Antecedentes',
            carFront: 'Auto frente',
            carBack: 'Auto dorso',
            carLeft: 'Auto lateral izquierdo',
            carRight: 'Auto lateral derecho',
            soatPhoto: 'SOAT',
            ruatPhoto: 'RUAT',
          };
          const rejectedDocNames = rejectedDocsList
            .map((k: string) => docKeyToName[k] || k)
            .filter(Boolean);
          const documents = status?.request?.documents || {};
          const approvedDocs = Object.entries(documents)
            .filter(([_, doc]: [string, any]) => doc?.status === 'approved')
            .map(([key]) => docKeyToName[key] || key)
            .filter(Boolean);
          Alert.alert(
            'Solicitud observada',
            `Razón: ${rejectionReason}\n\nDocumentos observados:\n${rejectedDocNames
              .map((d: string) => `• ${d}`)
              .join('\n')}`,
            [
              {
                text: 'Reenviar documentos',
                onPress: () => {
                  setDriverStatus(null);
                  (navigation as any).navigate('DocumentResubmission', {
                    rejectedDocs: rejectedDocsList,
                    approvedDocs,
                    rejectionReason,
                  });
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ],
          );
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
                (navigation as any).navigate('DriverRegistration', { user }),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo.');
    }
  };

  const currentProfile = isEditing ? editedProfile : profile;
  const isApprovedDriver =
    driverStatus?.hasApplication && driverStatus.status === 'approved';

  const profilePhotoUrl = user?.profilePhoto || (user as any)?.photoURL || null;

  // Format member since date from user.createdAt
  const getMemberSince = () => {
    let dateStr: string | undefined;
    // Si es conductor aprobado, mostrar fecha de aprobación del conductor
    if (isDriverMode && isApprovedDriver && driverStatus?.driver?.createdAt) {
      dateStr = driverStatus.driver.createdAt;
    } else {
      // Si es pasajero, mostrar fecha de creación de la cuenta
      dateStr = user?.createdAt;
    }
    if (!dateStr) return 'Nuevo usuario';
    const date = new Date(dateStr);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getModeDescription = () => {
    if (!driverStatus?.hasApplication) return 'Solicitar acceso como conductor';
    if (driverStatus.status === 'pending')
      return 'Solicitud pendiente de revisión';
    if (driverStatus.status === 'rejected')
      return 'Solicitud observada — ver detalles';
    return isDriverMode
      ? 'Aceptando solicitudes de viaje'
      : 'Solicitando viajes';
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* HEADER */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <X size={24} color={COLORS.primary} strokeWidth={2.8} />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO CARD - Avatar izquierda */}
        <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
          <View style={styles.heroRow}>
            <View style={[styles.avatarWrapperNew, isDark && styles.avatarWrapperDark]}>
              {profilePhotoUrl ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatarFallbackNew, isDark && styles.avatarFallbackDark]}>
                  <User size={32} color={COLORS.primary} />
                </View>
              )}
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroNameNew, isDark && styles.heroNameDark]}>{currentProfile.name}</Text>
              <Text style={[styles.heroEmail, isDark && styles.heroEmailDark]}>{currentProfile.email}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={COLORS.primary} fill={COLORS.primary} />
                <Text style={[styles.ratingTextSmall, isDark && styles.ratingTextDark]}>{currentProfile.rating || '5.0'}</Text>
                <Text style={[styles.ratingDot]}>•</Text>
                <Text style={[styles.ratingSubtext, isDark && styles.ratingSubtextDark]}>{currentProfile.totalRides} viajes</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addAccountBtnRight}
              onPress={() => Alert.alert('Agregar cuenta', 'Pantalla en desarrollo')}
            >
              <Text style={styles.addAccountText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MENÚ RÁPIDO - Grilla 2x2 */}
        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuGridItem}
            onPress={() => navigation.navigate('ProfileDetail', {
              vehicleModel: driverStatus?.driver?.vehicle?.model ?? currentProfile.vehicle,
              vehiclePlate: driverStatus?.driver?.vehicle?.plate ?? currentProfile.plate,
              isApprovedDriver,
            })}
          >
            <View style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 12, width: '100%' }}>
              <View style={styles.menuGridIcon}>
                <User size={25} color={COLORS.primary} />
              </View>
              <Text style={styles.menuGridText}>Mi perfil</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuGridItem}
            onPress={() => navigation.navigate('RideHistory')}
          >
            <View style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 12, width: '100%' }}>
              <View style={styles.menuGridIcon}>
                <History size={25} color={COLORS.primary} />
              </View>
              <Text style={styles.menuGridText}>Mis Viajes</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuGridItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 12, width: '100%' }}>
              <View style={styles.menuGridIcon}>
                <Settings size={25} color={COLORS.primary} />
              </View>
              <Text style={styles.menuGridText}>Ajustes</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuGridItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 12, width: '100%' }}>
              <View style={styles.menuGridIcon}>
                <Bell size={25} color={COLORS.primary} />
              </View>
              <Text style={styles.menuGridText}>Notificaciones</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* AYUDA Y SOPORTE */}
        <View style={styles.section}>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItemNew}
              onPress={() => navigation.navigate('Help')}
            >
              <View style={styles.menuItemLeftNew}>
                <View style={styles.menuItemIcon}>
                  <HelpCircle size={25} color={COLORS.primary} />
                </View>
                <Text style={styles.menuItemTextNew}>Ayuda</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItemNew}
              onPress={() => navigation.navigate('Support')}
            >
              <View style={styles.menuItemLeftNew}>
                <View style={styles.menuItemIcon}>
                  <Headphones size={25} color={COLORS.primary} />
                </View>
                <Text style={styles.menuItemTextNew}>Soporte</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItemNew}
              onPress={() => Alert.alert('Noticias', 'Pantalla en desarrollo')}
            >
              <View style={styles.menuItemLeftNew}>
                <View style={styles.menuItemIcon}>
                  <FileText size={25} color={COLORS.primary} />
                </View>
                <Text style={styles.menuItemTextNew}>Noticias</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>

            {!isApprovedDriver && !driverStatus?.hasApplication && (
              <TouchableOpacity
                style={styles.menuItemNew}
                onPress={handleBecomeDriver}
              >
                <View style={styles.menuItemLeftNew}>
                  <View style={styles.menuItemIcon}>
                    <Car size={25} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuItemTextNew}>Conviértete en conductor</Text>
                </View>
                <ChevronRight size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            {driverStatus?.status === 'rejected' && (
              <TouchableOpacity
                style={styles.menuItemNew}
                onPress={() => (navigation as any).navigate('DriverRegistration', { user })}
              >
                <View style={styles.menuItemLeftNew}>
                  <View style={styles.menuItemIcon}>
                    <AlertCircle size={25} color={COLORS.danger} />
                  </View>
                  <Text style={styles.menuItemTextNew}>Solicitud observada</Text>
                </View>
                <ChevronRight size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            {driverStatus?.status === 'pending' && (
              <TouchableOpacity
                style={styles.menuItemNew}
                onPress={() => { }}
              >
                <View style={styles.menuItemLeftNew}>
                  <View style={styles.menuItemIcon}>
                    <Circle size={25} color={COLORS.warning} />
                  </View>
                  <Text style={styles.menuItemTextNew}>Solicitud en revisión</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </ScrollView>

      {/* BOTTOM ACTIONS (fixed at the bottom) */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
        {isApprovedDriver && (
          <TouchableOpacity
            style={[styles.driverCard, isDriverMode && styles.driverCardActive]}
            onPress={handleToggleMode}
            disabled={loadingDriverStatus}
            activeOpacity={0.7}
          >
            <Text style={[styles.driverTitle, isDriverMode && styles.driverTitleActive]}>
              {isDriverMode ? 'Modo Pasajero' : 'Modo Conductor'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.logoutBtn, { marginTop: 0 }]}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert('Cerrar sesión', 'Serás desconectado de tu cuenta.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Cerrar sesión',
                style: 'destructive',
                onPress: async () => {
                  await logout();
                },
              },
            ]);
          }}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Subcomponent for clean info rows
const InfoRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={infoStyles.value}>{value}</Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '400' },
  value: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowLeft: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '-45deg' }, { translateY: -3.5 }],
  },
  backArrowRight: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '45deg' }, { translateY: 3.5 }],
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },

  /* HERO */
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 15,

  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: COLORS.primary,
    opacity: 0.06,
  },
  avatarWrapper: {
    marginTop: 28,
    marginBottom: 14,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%',
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  /* SECTION */
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  /* CARD */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },

  /* MODE CARD */
  modeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  modeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textTertiary,
  },
  modeIndicatorActive: {
    backgroundColor: COLORS.primary,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  modeDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  /* DRIVER CARD MEJORADO */
  driverCard: {
    backgroundColor: '#F7F7F9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCardActive: {
    backgroundColor: '#F3EAFC',
  },
  driverIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  driverInfo: {
    flex: 1,
  },
  driverTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  driverTitleActive: {
    color: COLORS.primary,
  },
  driverSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  driverRight: {
    alignItems: 'flex-end',
    gap: 8,
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
    gap: 8,
  },
  driverActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  /* INPUTS */
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* EDIT ACTIONS */
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  btnFill: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  btnFillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* MENU ITEMS */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.text,
  },

  /* LOGOUT */
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },

  /* NUEVOS ESTILOS PROFESIONALES - UBER/CABIFY STYLE */
  containerDark: {
    backgroundColor: '#1A1A1A',
  },
  headerDark: {
    backgroundColor: '#1A1A1A',
    borderBottomColor: '#333',
  },
  headerTitleDark: {
    color: '#FFF',
  },
  editProfileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3EAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardDark: {
    backgroundColor: '#2D2D2D',
  },
  heroCardNew: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  avatarSection: {
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  addAccountBtnRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginRight: 16,
  },
  addAccountText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666666',
  },
  heroEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  heroEmailDark: {
    color: '#AAA',
  },
  avatarWrapperNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 2,
    backgroundColor: COLORS.surface,
  },
  avatarWrapperDark: {
    backgroundColor: '#2D2D2D',
  },
  avatarFallbackNew: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackDark: {
    backgroundColor: '#3D3D3D',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  heroNameNew: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  heroNameDark: {
    color: '#FFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  ratingTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  ratingTextDark: {
    color: '#FFF',
  },
  ratingDot: {
    color: COLORS.textTertiary,
    marginHorizontal: 4,
  },
  ratingSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ratingSubtextDark: {
    color: '#AAA',
  },

  /* Section Titles profesionales */
  sectionLabelNew: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },

  /* Menu items profesionales */
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    gap: 12,
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
    padding: 12,
  },
  menuGridIcon: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  menuGridText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginVertical: 5,
  },
  menuItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,

  },
  menuItemLeftNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemIcon: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',

  },
  menuItemTextNew: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },

  /* Card moderno */
  cardModern: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  /* Driver card mejorado */
  driverCardNew: {
    backgroundColor: COLORS.surface,
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
    elevation: 0,
  },
  driverBigBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    gap: 16,
  },
  driverBigBtnContent: {
    flex: 1,
  },
  driverBigBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  driverBigBtnSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default ProfileScreen;
