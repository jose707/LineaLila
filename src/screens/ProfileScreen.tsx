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
  Modal,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getMyRequestStatus } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { ratingsService } from '../services/ratings.service';
import { API_BASE_URL } from '../config/constants';

const { width } = Dimensions.get('window');

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

// Minimal icon components (SVG-like via View)
const ChevronRight = () => (
  <View style={iconStyles.chevron}>
    <View
      style={[
        iconStyles.chevronBar,
        { transform: [{ rotate: '45deg' }, { translateY: -2 }] },
      ]}
    />
    <View
      style={[
        iconStyles.chevronBar,
        { transform: [{ rotate: '-45deg' }, { translateY: 2 }] },
      ]}
    />
  </View>
);

const iconStyles = StyleSheet.create({
  chevron: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronBar: { width: 8, height: 1.5, backgroundColor: COLORS.primary },
});

// Status pill
const StatusPill = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: 'Aprobado', color: COLORS.success, bg: '#F0FDF4' },
    pending: { label: 'En revisión', color: COLORS.warning, bg: '#FFFBEB' },
    rejected: {
      label: 'Observado',
      color: COLORS.danger,
      bg: COLORS.dangerLight,
    },
  };
  const c = config[status] ?? {
    label: status,
    color: COLORS.textSecondary,
    bg: COLORS.background,
  };
  return (
    <View style={[pillStyles.pill, { backgroundColor: c.bg }]}>
      <View style={[pillStyles.dot, { backgroundColor: c.color }]} />
      <Text style={[pillStyles.label, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});

const ruatStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  alertRow: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout, isDriverMode, setIsDriverMode, token, updateUser } =
    useAuth();

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

  // ── RUAT verification ────────────────────────────────────────────────────
  const [ruatUploading, setRuatUploading] = useState(false);
  const [ruatPickerVisible, setRuatPickerVisible] = useState(false);

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

  // ── RUAT upload ──────────────────────────────────────────────────────────
  const vehicle = driverStatus?.driver?.vehicle ?? null;
  const ruatVerified: boolean = vehicle?.ruatVerified ?? false;
  const ruatRequired: boolean = vehicle?.ruatRequired ?? false;
  // ruatFile != null && !ruatVerified → conductor subió el RUAT, espera revisión del admin
  // ruatFile != null &&  ruatVerified → aprobado (referencia permanente)
  const ruatPending: boolean = !!vehicle?.ruatFile && !ruatVerified;

  const handleRuatUpload = async (uri: string) => {
    if (!token) return;
    setRuatPickerVisible(false);
    setRuatUploading(true);
    try {
      const form = new FormData();
      form.append('ruatPhoto', {
        uri,
        type: 'image/jpeg',
        name: 'ruat.jpg',
      } as any);

      const res = await fetch(`${API_BASE_URL}/drivers/submit-ruat`, {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error ${res.status}`);
      }

      Alert.alert(
        '✅ RUAT enviado',
        'Tu RUAT fue enviado correctamente. El administrador lo revisará pronto.',
      );
      loadDriverStatus();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo enviar el RUAT.');
    } finally {
      setRuatUploading(false);
    }
  };

  const openRuatPicker = () => {
    Alert.alert('Subir RUAT', 'Selecciona una opción', [
      {
        text: 'Cámara',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.7 }, r => {
            if (r.assets?.[0]?.uri) handleRuatUpload(r.assets[0].uri!);
          }),
      },
      {
        text: 'Galería',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, r => {
            if (r.assets?.[0]?.uri) handleRuatUpload(r.assets[0].uri!);
          }),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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

  const profilePhotoUrl = user?.profilePhoto;

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
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.backArrowLeft} />
          <View style={styles.backArrowRight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroBg} />
          <View style={styles.avatarWrapper}>
            {profilePhotoUrl ? (
              <Image
                source={{ uri: profilePhotoUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {currentProfile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.heroName}>{currentProfile.name}</Text>
          <Text style={styles.heroEmail}>{currentProfile.email}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {currentProfile.rating || '5.0'}
              </Text>
              <Text style={styles.statLabel}>
                {isDriverMode &&
                  driverStatus?.hasApplication &&
                  driverStatus.status === 'approved'
                  ? 'Cal. Conductor'
                  : 'Calificación'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentProfile.totalRides}</Text>
              <Text style={styles.statLabel}>
                {isDriverMode &&
                  driverStatus?.hasApplication &&
                  driverStatus.status === 'approved'
                  ? 'Viajes (Cond.)'
                  : 'Viajes'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getMemberSince()}</Text>
              <Text style={styles.statLabel}>Miembro desde</Text>
            </View>
          </View>
        </View>

        {/* VERIFICACIÓN DE VEHÍCULO (solo conductores aprobados) */}
        {isApprovedDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VEHÍCULO</Text>
            <View style={styles.card}>
              {/* Estado RUAT */}
              {ruatVerified ? (
                <View style={ruatStyles.row}>
                  <View
                    style={[
                      ruatStyles.iconWrap,
                      { backgroundColor: '#DCFCE7' },
                    ]}
                  >
                    <Text style={ruatStyles.icon}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ruatStyles.title}>Vehículo Verificado</Text>
                    <Text style={ruatStyles.sub}>
                      Tu RUAT fue aprobado. Tu vehículo tiene el badge de
                      verificado.
                    </Text>
                  </View>
                </View>
              ) : ruatPending ? (
                <View style={ruatStyles.row}>
                  <View
                    style={[
                      ruatStyles.iconWrap,
                      { backgroundColor: '#FEF3C7' },
                    ]}
                  >
                    <Text style={ruatStyles.icon}>⏳</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ruatStyles.title}>RUAT en revisión</Text>
                    <Text style={ruatStyles.sub}>
                      Tu documento fue enviado y está siendo revisado por el
                      administrador.
                    </Text>
                  </View>
                </View>
              ) : ruatRequired ? (
                <View>
                  <View style={[ruatStyles.row, ruatStyles.alertRow]}>
                    <View
                      style={[
                        ruatStyles.iconWrap,
                        { backgroundColor: '#FEE2E2' },
                      ]}
                    >
                      <Text style={ruatStyles.icon}>⚠️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[ruatStyles.title, { color: COLORS.danger }]}
                      >
                        Verificación requerida
                      </Text>
                      <Text style={ruatStyles.sub}>
                        El administrador requiere que envíes el RUAT de tu
                        vehículo
                        {vehicle?.ruatRequiredReason === 'accident' &&
                          ' (accidente registrado)'}
                        {vehicle?.ruatRequiredReason === 'vehicle_mismatch' &&
                          ' (vehículo no coincide)'}
                        {vehicle?.ruatRequiredReason ===
                          'suspension_reactivation' &&
                          ' (reactivación de cuenta)'}
                        {vehicle?.ruatRequiredReason === 'criminal_record' &&
                          ' (verificación adicional)'}
                        .
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[ruatStyles.btn, { backgroundColor: COLORS.danger }]}
                    onPress={openRuatPicker}
                    disabled={ruatUploading}
                    activeOpacity={0.8}
                  >
                    {ruatUploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={ruatStyles.btnTxt}>📄 Subir RUAT ahora</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={ruatStyles.row}>
                    <View
                      style={[
                        ruatStyles.iconWrap,
                        { backgroundColor: '#F3F4F6' },
                      ]}
                    >
                      <Text style={ruatStyles.icon}>○</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ruatStyles.title}>Sin verificar</Text>
                      <Text style={ruatStyles.sub}>
                        Sube el RUAT de tu vehículo para obtener el badge de
                        Vehículo Verificado.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      ruatStyles.btn,
                      { backgroundColor: COLORS.primary },
                    ]}
                    onPress={openRuatPicker}
                    disabled={ruatUploading}
                    activeOpacity={0.8}
                  >
                    {ruatUploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={ruatStyles.btnTxt}>
                        📄 Verificar vehículo (RUAT)
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* MODO DE OPERACIÓN */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MODO DE OPERACIÓN</Text>
          <TouchableOpacity
            style={[
              styles.modeCard,
              isDriverMode && isApprovedDriver && styles.modeCardActive,
            ]}
            onPress={handleToggleMode}
            disabled={loadingDriverStatus}
            activeOpacity={0.7}
          >
            <View style={styles.modeCardLeft}>
              <View
                style={[
                  styles.modeIndicator,
                  isDriverMode &&
                  isApprovedDriver &&
                  styles.modeIndicatorActive,
                ]}
              />
              <View>
                <Text style={styles.modeTitle}>
                  {isDriverMode && isApprovedDriver ? 'Conductor' : 'Pasajero'}
                </Text>
                <Text style={styles.modeDesc}>{getModeDescription()}</Text>
              </View>
            </View>
            <View style={styles.modeCardRight}>
              {driverStatus?.status && (
                <StatusPill status={driverStatus.status} />
              )}
              {loadingDriverStatus ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={{ marginLeft: 8 }}
                />
              ) : (
                <ChevronRight />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* INFORMACIÓN PERSONAL */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>INFORMACIÓN PERSONAL</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editLink}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre completo</Text>
                  <TextInput
                    style={styles.input}
                    value={editedProfile.name}
                    onChangeText={text =>
                      setEditedProfile({ ...editedProfile, name: text })
                    }
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo electrónico</Text>
                  <TextInput
                    style={styles.input}
                    value={editedProfile.email}
                    onChangeText={text =>
                      setEditedProfile({ ...editedProfile, email: text })
                    }
                    keyboardType="email-address"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.input}
                    value={editedProfile.phone}
                    onChangeText={text =>
                      setEditedProfile({ ...editedProfile, phone: text })
                    }
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              </>
            ) : (
              <>
                <InfoRow label="Nombre" value={currentProfile.name} />
                <InfoRow label="Correo" value={currentProfile.email} />
                <InfoRow label="Teléfono" value={currentProfile.phone} last />
              </>
            )}
          </View>
        </View>

        {/* VEHÍCULO - solo modo conductor */}
        {isDriverMode && isApprovedDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VEHÍCULO</Text>
            <View style={styles.card}>
              {isEditing ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Modelo</Text>
                    <TextInput
                      style={styles.input}
                      value={editedProfile.vehicle}
                      onChangeText={text =>
                        setEditedProfile({ ...editedProfile, vehicle: text })
                      }
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                  <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                    <Text style={styles.inputLabel}>Placa</Text>
                    <TextInput
                      style={styles.input}
                      value={editedProfile.plate}
                      onChangeText={text =>
                        setEditedProfile({ ...editedProfile, plate: text })
                      }
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                </>
              ) : (
                <>
                  <InfoRow label="Modelo" value={currentProfile.vehicle} />
                  <InfoRow label="Placa" value={currentProfile.plate} last />
                </>
              )}
            </View>
          </View>
        )}

        {/* EDIT ACTIONS */}
        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.btnOutlineText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnFill}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.btnFillText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutBtn}
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
      </ScrollView>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    paddingTop: 20,
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
    paddingBottom: 24,
    marginBottom: 8,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: COLORS.surface,
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
  heroEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnFillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* LOGOUT */
  logoutBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
});

export default ProfileScreen;
