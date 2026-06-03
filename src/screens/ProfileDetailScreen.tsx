import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { getMyRequestStatus } from '../services/admin.service';
import { API_BASE_URL } from '../config/constants';
import {
  User,
  Mail,
  Phone,
  ChevronRight,
  Save,
  X,
  Car,
  CheckCircle,
  AlertCircle,
  Circle,
  Pencil,
  Star,
} from 'lucide-react-native';
import { ratingsService } from '../services/ratings.service';

const COLORS = {
  primary: '#7514C5',
  primaryLight: '#F3EAFC',
  background: '#F7F7F9',
  surface: '#FFFFFF',
  text: '#111118',
  textSecondary: '#7A7A8A',
  textTertiary: '#AFAFBF',
  border: '#EAEAF0',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
};

const ProfileDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateUser, token } = useAuth();
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  // Datos del vehículo pasados desde ProfileScreen
  const vehicleModel: string = route.params?.vehicleModel || '';
  const vehiclePlate: string = route.params?.vehiclePlate || '';
  const isApprovedDriver: boolean = route.params?.isApprovedDriver ?? false;

  const { isDriverMode } = useAuth();
  const profilePhotoUrl = user?.profilePhoto || (user as any)?.photoURL || null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [calculatedRating, setCalculatedRating] = useState<number>(5.0);
  const [totalRides, setTotalRides] = useState<number>(0);

  const loadMyRating = useCallback(async () => {
    try {
      const data = await ratingsService.getMyRating();
      const rating = isDriverMode && data.driverRating !== null
        ? data.driverRating
        : data.passengerRating;
      setCalculatedRating(rating ?? 5.0);

      const trips = isDriverMode && data.driverTrips !== undefined
        ? data.driverTrips
        : data.passengerTrips ?? 0;
      setTotalRides(trips);
    } catch (e) {
      console.error('Error loading rating:', e);
      setCalculatedRating(user?.rating ?? 5.0);
      setTotalRides((isDriverMode ? user?.totalTripsAsDriver : user?.totalTrips) ?? 0);
    }
  }, [isDriverMode, user]);

  const [driverStatus, setDriverStatus] = useState<{
    hasApplication: boolean;
    status?: string | null;
    driver?: any;
  } | null>(null);
  const [loadingDriverStatus, setLoadingDriverStatus] = useState(true);
  const [ruatUploading, setRuatUploading] = useState(false);

  const loadDriverStatus = useCallback(async () => {
    try {
      setLoadingDriverStatus(true);
      const status = await getMyRequestStatus();
      setDriverStatus(status);
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      setLoadingDriverStatus(false);
    }
  }, []);

  useEffect(() => {
    loadDriverStatus();
    loadMyRating();
  }, [loadDriverStatus, loadMyRating]);

  useFocusEffect(
    useCallback(() => {
      loadDriverStatus();
      loadMyRating();
    }, [loadDriverStatus, loadMyRating])
  );

  // RUAT upload logic
  const vehicle = driverStatus?.driver?.vehicle ?? null;
  const ruatVerified: boolean = vehicle?.ruatVerified ?? false;
  const ruatRequired: boolean = vehicle?.ruatRequired ?? false;
  const ruatPending: boolean = !!vehicle?.ruatFile && !ruatVerified;

  const handleRuatUpload = async (uri: string) => {
    if (!token) return;
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

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'El correo es requerido');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'El teléfono es requerido');
      return;
    }

    // Here you would call API to update user
    updateUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
    });

    setIsEditing(false);
    Alert.alert('Éxito', 'Perfil actualizado correctamente');
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  const InfoRow = ({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) => (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'No registrado'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <X size={24} color={COLORS.primary} strokeWidth={2.8} />
        </TouchableOpacity>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Pencil size={22} color={COLORS.primary} strokeWidth={2.8} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={[styles.avatarSection, isDark && styles.avatarSectionDark]}>
          <View style={[styles.avatarWrapper, isDark && styles.avatarWrapperDark]}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, isDark && styles.avatarFallbackDark]}>
                <User size={32} color={COLORS.primary} />
              </View>
            )}
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.userName, isDark && styles.userNameDark]}>{formData.name || 'Usuario'}</Text>
            <Text style={[styles.userEmail, isDark && styles.userEmailDark]}>{formData.email || 'Sin correo'}</Text>
            <View style={styles.statsRow}>
              <Star size={14} color={COLORS.primary} fill={COLORS.primary} />
              <Text style={[styles.ratingText, isDark && styles.ratingTextDark]}>{calculatedRating.toFixed(1)}</Text>
              <Text style={styles.ratingDot}>•</Text>
              <Text style={[styles.ridesText, isDark && styles.ridesTextDark]}>{totalRides} viajes</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN PERSONAL</Text>
          <View style={[styles.card, isDark && styles.cardDark]}>
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre completo</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Tu nombre"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo electrónico</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="+591 70000000"
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              </>
            ) : (
              <>
                <InfoRow label="Nombre" value={formData.name} />
                <InfoRow label="Correo" value={formData.email} />
                <InfoRow label="Teléfono" value={formData.phone} isLast />
              </>
            )}
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Save size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUENTA</Text>
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Activa</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Miembro desde</Text>
              <Text style={styles.infoValue}>
                {user?.createdAt 
                  ? new Date(user.createdAt).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
                  : 'Enero 2024'}
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle Info — solo conductores aprobados */}
        {isApprovedDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VEHÍCULO</Text>
            <View style={[styles.card, isDark && styles.cardDark, { marginBottom: 12 }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modelo</Text>
                <Text style={styles.infoValue}>{vehicleModel || 'No registrado'}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Placa</Text>
                <Text style={styles.infoValue}>{vehiclePlate || 'No registrada'}</Text>
              </View>
            </View>

            {/* RUAT Verification Section (no container card) */}
            <View style={{ marginTop: 12 }}>
              {/* Estado RUAT */}
              {ruatVerified ? (
                <View style={ruatStyles.row}>
                  <View style={[ruatStyles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <CheckCircle size={20} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ruatStyles.title, isDark && ruatStyles.titleDark]}>Vehículo Verificado</Text>
                    <Text style={ruatStyles.sub}>
                      Tu RUAT fue aprobado. Tu vehículo tiene el badge de verificado.
                    </Text>
                  </View>
                </View>
              ) : ruatPending ? (
                <View style={ruatStyles.row}>
                  <View style={[ruatStyles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Circle size={20} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ruatStyles.title, isDark && ruatStyles.titleDark]}>En revisión</Text>
                    <Text style={ruatStyles.sub}>
                      Tu documento fue enviado y está siendo revisado por el administrador.
                    </Text>
                  </View>
                </View>
              ) : ruatRequired ? (
                <View>
                  <View style={[ruatStyles.row, ruatStyles.alertRow]}>
                    <View style={[ruatStyles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                      <AlertCircle size={20} color={COLORS.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ruatStyles.title, { color: COLORS.danger }]}>
                        Verificación requerida
                      </Text>
                      <Text style={ruatStyles.sub}>
                        El administrador requiere que envíes el RUAT de tu vehículo
                        {vehicle?.ruatRequiredReason === 'accident' && ' (accidente registrado)'}
                        {vehicle?.ruatRequiredReason === 'vehicle_mismatch' && ' (vehículo no coincide)'}
                        {vehicle?.ruatRequiredReason === 'suspension_reactivation' && ' (reactivación de cuenta)'}
                        {vehicle?.ruatRequiredReason === 'criminal_record' && ' (verificación adicional)'}
                        .
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[ruatStyles.btn, { backgroundColor: COLORS.danger, marginTop: 12 }]}
                    onPress={openRuatPicker}
                    disabled={ruatUploading}
                    activeOpacity={0.8}
                  >
                    {ruatUploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={ruatStyles.btnTxt}>Subir RUAT ahora</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[ruatStyles.btn, { backgroundColor: COLORS.primary }]}
                  onPress={openRuatPicker}
                  disabled={ruatUploading}
                  activeOpacity={0.8}
                >
                  {ruatUploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={ruatStyles.btnTxt}>Verificar vehículo</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => Alert.alert('Eliminar cuenta', '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.')}
          >
            <Text style={styles.dangerBtnText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
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
  containerDark: {
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  headerDark: {
    backgroundColor: '#1A1A1A',
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  editBtn: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cancelBtn: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  avatarSectionDark: {
    backgroundColor: '#2D2D2D',
  },
  avatarWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarWrapperDark: {
    backgroundColor: '#3D3D3D',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackDark: {
    backgroundColor: '#3D3D3D',
  },
  avatarInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  userNameDark: {
    color: '#FFF',
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userEmailDark: {
    color: '#AAA',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  ratingTextDark: {
    color: '#FFF',
  },
  ratingDot: {
    marginHorizontal: 6,
    color: COLORS.textTertiary,
  },
  ridesText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ridesTextDark: {
    color: '#AAA',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#2D2D2D',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRowBorder: {
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  statusBadge: {
    backgroundColor: '#DFFFE0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputDark: {
    backgroundColor: '#3D3D3D',
    color: '#FFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },
});

const ruatStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  sub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnTxt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ProfileDetailScreen;