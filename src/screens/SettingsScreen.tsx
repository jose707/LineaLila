import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  Key,
  FileText,
  Trash2,
  Car,
  DollarSign,
  Star,
  Users,
  Moon,
  Bell,
  MessageCircle,
  CreditCard,
  Shield,
  CheckCircle,
  ChevronRight,
  X,
} from 'lucide-react-native';

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
  darkBg: '#1A1A1A',
  darkSurface: '#2D2D2D',
  darkText: '#FFFFFF',
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

interface SettingRowProps {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  value,
  onPress,
  rightElement,
  danger,
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress && !rightElement}>
    <View style={styles.settingRowLeft}>
      {icon && (
        <View style={styles.iconContainer}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, { size: 25 })
            : icon}
        </View>
      )}
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
    </View>
    <View style={styles.settingRowRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightElement}
      {onPress && <ChevronRight size={20} color={COLORS.textTertiary} />}
    </View>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();
  const { settings, updateSettings, setAppPin, clearSettings } = useSettings();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('set');

  const isDriver = role === 'driver' || role === 'admin';

  const handleSetPin = () => {
    if (pinValue.length === 4) {
      setAppPin(pinValue);
      setShowPinModal(false);
      setPinValue('');
      Alert.alert('Éxito', 'PIN de app establecido correctamente');
    } else {
      Alert.alert('Error', 'El PIN debe tener 4 dígitos');
    }
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Eliminar PIN',
      '¿Estás seguro de que quieres eliminar el PIN de la app?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => setAppPin(null),
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar Cuenta',
      '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Función en desarrollo', 'Contacta soporte para eliminar tu cuenta');
          },
        },
      ],
    );
  };

  const vehicleTypes = [
    { label: 'Taxi', value: 'taxi' },
    { label: 'Minibus', value: 'minibus' },
    { label: 'Bus', value: 'bus' },
    { label: 'Motocicleta', value: 'motorcycle' },
  ];

  const genderOptions = [
    { label: 'Cualquiera', value: 'any' },
    { label: 'Mujer', value: 'female' },
    { label: 'Hombre', value: 'male' },
  ];

  const showVehicleTypePicker = () => {
    Alert.alert(
      'Tipo de vehículo preferido',
      'Selecciona tu preferencia',
      vehicleTypes.map(t => ({
        text: t.label,
        onPress: () => updateSettings({ preferredVehicleType: t.value as any }),
      })),
    );
  };

  const showGenderFilterPicker = () => {
    Alert.alert(
      'Filtrar conductores por',
      'Selecciona preferencia',
      genderOptions.map(g => ({
        text: g.label,
        onPress: () => updateSettings({ driverGenderFilter: g.value as any }),
      })),
    );
  };

  const currentVehicleLabel = vehicleTypes.find(t => t.value === settings.preferredVehicleType)?.label || 'Taxi';
  const currentGenderLabel = genderOptions.find(g => g.value === settings.driverGenderFilter)?.label || 'Cualquiera';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <X size={24} color={COLORS.primary} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Section title="Cuenta">
          <SettingRow
            icon={<User size={20} color={COLORS.primary} />}
            label="Editar perfil"
            value={user?.name || 'Usuario'}
            onPress={() => Alert.alert('Edición de perfil', 'Pantalla en desarrollo')}
          />
          <SettingRow
            icon={<Mail size={20} color={COLORS.primary} />}
            label="Correo electrónico"
            value={user?.email || 'No registrado'}
          />
          <SettingRow
            icon={<Phone size={20} color={COLORS.primary} />}
            label="Teléfono"
            value={user?.phone || 'No registrado'}
          />
          <SettingRow
            icon={<Lock size={20} color={COLORS.primary} />}
            label="Cambiar contraseña"
            onPress={() => Alert.alert('Cambiar contraseña', 'Pantalla en desarrollo')}
          />
        </Section>

        <Section title="Seguridad">
          <SettingRow
            icon={<Key size={20} color={COLORS.primary} />}
            label="Clave de app (PIN)"
            value={settings.appPin ? '•••• Activado' : 'Desactivado'}
            onPress={() => {
              if (settings.appPin) {
                Alert.alert('PIN activo', '¿Qué deseas hacer?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Cambiar PIN', onPress: () => { setPinMode('set'); setShowPinModal(true); } },
                  { text: 'Eliminar PIN', onPress: handleRemovePin },
                ]);
              } else {
                setPinMode('set');
                setShowPinModal(true);
              }
            }}
          />
        </Section>

        <Section title="Privacidad">
          <SettingRow
            icon={<FileText size={20} color={COLORS.primary} />}
            label="Ver mis datos"
            onPress={() => Alert.alert('Mis datos', 'Pantalla en desarrollo')}
          />
          <SettingRow
            icon={<Trash2 size={20} color={COLORS.danger} />}
            label="Eliminar cuenta"
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <Section title="Preferencias de viaje">
          <SettingRow
            icon={<Car size={20} color={COLORS.primary} />}
            label="Tipo de vehículo preferido"
            value={currentVehicleLabel}
            onPress={showVehicleTypePicker}
          />
          <SettingRow
            icon={<DollarSign size={20} color={COLORS.primary} />}
            label="Precio mínimo"
            value={`${settings.priceMin} BOB`}
            onPress={() => Alert.alert('Precio mínimo', 'Pantalla en desarrollo')}
          />
          <SettingRow
            icon={<DollarSign size={20} color={COLORS.primary} />}
            label="Precio máximo"
            value={`${settings.priceMax} BOB`}
            onPress={() => Alert.alert('Precio máximo', 'Pantalla en desarrollo')}
          />
        </Section>

        <Section title="Filtro de conductores">
          <SettingRow
            icon={<Users size={20} color={COLORS.primary} />}
            label="Género del conductor"
            value={currentGenderLabel}
            onPress={showGenderFilterPicker}
          />
          <SettingRow
            icon={<Star size={20} color={COLORS.primary} />}
            label="Rating mínimo"
            value={`${settings.driverMinRating} estrellas`}
            onPress={() => Alert.alert('Rating mínimo', 'Pantalla en desarrollo')}
          />
        </Section>

        <Section title="Apariencia">
          <SettingRow
            icon={<Moon size={20} color={COLORS.primary} />}
            label="Modo oscuro"
            rightElement={
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => updateSettings({ darkMode: value })}
                trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Section>

        {isDriver && (
          <Section title="Conductor">
            <SettingRow
              icon={<Car size={20} color={COLORS.primary} />}
              label="Datos del vehículo"
              onPress={() => Alert.alert('Datos del vehículo', 'Pantalla en desarrollo')}
            />
            <SettingRow
              icon={<CreditCard size={20} color={COLORS.primary} />}
              label="Licencia de conducir"
              value={user?.licenseNumber || 'No registrado'}
            />
            <SettingRow
              icon={<Shield size={20} color={COLORS.primary} />}
              label="Estado de verificación"
              value={user?.isVerified ? 'Verificado' : 'Pendiente'}
            />
            <SettingRow
              icon={<DollarSign size={20} color={COLORS.primary} />}
              label="Estado de cuenta"
              onPress={() => Alert.alert('Estado de cuenta', 'Pantalla en desarrollo')}
            />
            <SettingRow
              icon={<CheckCircle size={20} color={COLORS.primary} />}
              label="Aceptar viajes automáticos"
              rightElement={
                <Switch
                  value={settings.autoAcceptRides}
                  onValueChange={(value) => updateSettings({ autoAcceptRides: value })}
                  trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingRow
              icon={<Users size={20} color={COLORS.primary} />}
              label="Permitir negociación"
              rightElement={
                <Switch
                  value={settings.allowNegotiation}
                  onValueChange={(value) => updateSettings({ allowNegotiation: value })}
                  trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </Section>
        )}

        <Section title="Notificaciones">
          <SettingRow
            icon={<Bell size={20} color={COLORS.primary} />}
            label="Notificaciones push"
            rightElement={
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
                trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            icon={<MessageCircle size={20} color={COLORS.primary} />}
            label="Sonido"
            rightElement={
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => updateSettings({ soundEnabled: value })}
                trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>LineaLila v1.0.0</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pinMode === 'set' ? 'Establecer PIN' : 'Verificar PIN'}
            </Text>
            <Text style={styles.modalSubtitle}>Ingresa un PIN de 4 dígitos</Text>
            <TextInput
              style={styles.pinInput}
              value={pinValue}
              onChangeText={setPinValue}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#AFAFBF"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPinModal(false);
                  setPinValue('');
                }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSetPin}>
                <Text style={styles.modalConfirmText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 20,
    color: COLORS.textTertiary,
    marginLeft: 4,
  },
  dangerText: {
    color: COLORS.danger,
  },
  logoutButton: {
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 10,
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  pinInput: {
    width: '100%',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SettingsScreen;