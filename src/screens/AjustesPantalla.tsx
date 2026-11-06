import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  Switch,
  Alert,
  Modal,
  TextInput as TextoEntrada } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion } from '@react-navigation/native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { usarAjustes } from "../context/AjustesContexto";
import {
  User as Usuario,
  Mail,
  Phone as Telefono,
  Key as Clave,
  FileText as ArchivoTexto,
  Trash2,
  Car,
  DollarSign,
  Star,
  Users as Usuarios,
  Moon,
  Bell,
  MessageCircle as MensajeCircle,
  CreditCard,
  Shield,
  CheckCircle as ComprobarCircle,
  ChevronRight as ChevronDerecha,
  X } from
'lucide-react-native';

const Colores = {
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
  darkText: '#FFFFFF'
};

interface SeccionPropiedades {
  title: string;
  children: React.ReactNode;
}

const Seccion: React.FC<SeccionPropiedades> = ({ title: titulo, children: hijos }) =>
<Vista style={estilos.section}>
    <Texto style={estilos.sectionTitle}>{titulo}</Texto>
    <Vista style={estilos.sectionContent}>{hijos}</Vista>
  </Vista>;


interface SettingFilaPropiedades {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

const SettingFila: React.FC<SettingFilaPropiedades> = ({
  icon: icono,
  label: etiqueta,
  value: valor,
  onPress: alPulsar,
  rightElement: derechaElement,
  danger
}) =>
<PulsableOpacidad
  style={estilos.settingRow}
  onPress={alPulsar}
  disabled={!alPulsar && !derechaElement}>
    <Vista style={estilos.settingRowLeft}>
      {icono &&
    <Vista style={estilos.iconContainer}>
          {React.isValidElement(icono) ?
      React.cloneElement(icono as React.ReactElement<any>, { size: 25 }) :
      icono}
        </Vista>
    }
      <Texto style={[estilos.settingLabel, danger && estilos.dangerText]}>{etiqueta}</Texto>
    </Vista>
    <Vista style={estilos.settingRowRight}>
      {valor && <Texto style={estilos.settingValue}>{valor}</Texto>}
      {derechaElement}
      {alPulsar && <ChevronDerecha size={20} color={Colores.textTertiary} />}
    </Vista>
  </PulsableOpacidad>;


const AjustesPantalla: React.FC = () => {
  const navegacion = usarNavegacion<any>();
  const { user: usuario, role: rol } = usarAutenticacion();
  const { settings: ajustes, updateSettings: actualizarAjustes, setAppPin: establecerAplicacionPin, clearSettings: limpiarAjustes } = usarAjustes();

  const [mostrarPinModal, establecerMostrarPinModal] = usarEstado(false);
  const [pinValor, establecerPinValor] = usarEstado('');
  const [pinModo, establecerPinModo] = usarEstado<'set' | 'verify'>('set');

  const esConductor = rol === 'conductor' || rol === 'administrador';

  const manejarEstablecerPin = () => {
    if (pinValor.length === 4) {
      establecerAplicacionPin(pinValor);
      establecerMostrarPinModal(false);
      establecerPinValor('');
      Alert.alert('Éxito', 'PIN de app establecido correctamente');
    } else {
      Alert.alert('Error', 'El PIN debe tener 4 dígitos');
    }
  };

  const manejarQuitarPin = () => {
    Alert.alert(
      'Eliminar PIN',
      '¿Estás seguro de que quieres eliminar el PIN de la app?',
      [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => establecerAplicacionPin(null)
      }]

    );
  };

  const manejarEliminarCuenta = () => {
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
        }
      }]

    );
  };

  const generoOpciones = [
  { label: 'Cualquiera', value: 'any' },
  { label: 'Mujer', value: 'female' },
  { label: 'Hombre', value: 'male' }];


  const mostrarGeneroFiltroSelector = () => {
    Alert.alert(
      'Filtrar conductores por',
      'Selecciona preferencia',
      generoOpciones.map((g) => ({
        text: g.label,
        onPress: () => actualizarAjustes({ driverGenderFilter: g.value as any })
      }))
    );
  };

  const realGeneroEtiqueta = generoOpciones.find((g) => g.value === ajustes.driverGenderFilter)?.label || 'Cualquiera';

  return (
    <SeguraZonaVista style={estilos.container}>
      <Vista style={estilos.header}>
        <PulsableOpacidad style={estilos.backBtn} onPress={() => navegacion.goBack()}>
          <X size={24} color={Colores.primary} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={estilos.headerTitle}>Ajustes</Texto>
        <Vista style={{ width: 40 }} />
      </Vista>

      <DesplazableVista style={estilos.scrollView} showsVerticalScrollIndicator={false}>
        <Seccion title="Cuenta">
          <SettingFila
            icon={<Usuario size={20} color={Colores.primary} />}
            label="Editar perfil"
            value={usuario?.nombre || 'Usuario'}
            onPress={() => Alert.alert('Edición de perfil', 'Pantalla en desarrollo')} />

          <SettingFila
            icon={<Mail size={20} color={Colores.primary} />}
            label="Correo electrónico"
            value={usuario?.correo || 'No registrado'} />

          <SettingFila
            icon={<Telefono size={20} color={Colores.primary} />}
            label="Teléfono"
            value={usuario?.telefono || 'No registrado'} />
          <SettingFila
            icon={<Telefono size={20} color={Colores.primary} />}
            label="Contactos de emergencia"
            onPress={() => navegacion.navigate('ContactosEmergencia')} />


        </Seccion>

        <Seccion title="Seguridad">
          <SettingFila
            icon={<Clave size={20} color={Colores.primary} />}
            label="Clave de app (PIN)"
            value={ajustes.appPin ? '•••• Activado' : 'Desactivado'}
            onPress={() => {
              if (ajustes.appPin) {
                Alert.alert('PIN activo', '¿Qué deseas hacer?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cambiar PIN', onPress: () => {establecerPinModo('set');establecerMostrarPinModal(true);} },
                { text: 'Eliminar PIN', onPress: manejarQuitarPin }]
                );
              } else {
                establecerPinModo('set');
                establecerMostrarPinModal(true);
              }
            }} />

        </Seccion>

        <Seccion title="Privacidad">
          <SettingFila
            icon={<ArchivoTexto size={20} color={Colores.primary} />}
            label="Ver mis datos"
            onPress={() => Alert.alert('Mis datos', 'Pantalla en desarrollo')} />

          <SettingFila
            icon={<Trash2 size={20} color={Colores.danger} />}
            label="Eliminar cuenta"
            onPress={manejarEliminarCuenta}
            danger />

        </Seccion>

        <Seccion title="Filtro de conductores">
          <SettingFila
            icon={<Usuarios size={20} color={Colores.primary} />}
            label="Género del conductor"
            value={realGeneroEtiqueta}
            onPress={mostrarGeneroFiltroSelector} />

          <SettingFila
            icon={<Star size={20} color={Colores.primary} />}
            label="Rating mínimo"
            value={`${ajustes.driverMinRating} estrellas`}
            onPress={() => Alert.alert('Rating mínimo', 'Pantalla en desarrollo')} />

        </Seccion>

        <Seccion title="Apariencia">
          <SettingFila
            icon={<Moon size={20} color={Colores.primary} />}
            label="Modo oscuro"
            rightElement={
            <Switch
              value={ajustes.darkMode}
              onValueChange={(valor) => actualizarAjustes({ darkMode: valor })}
              trackColor={{ false: '#E0E0E0', true: Colores.primary }}
              thumbColor="#FFFFFF" />

            } />

        </Seccion>

        {esConductor &&
        <Seccion title="Conductor">
            <SettingFila
            icon={<Car size={20} color={Colores.primary} />}
            label="Datos del vehículo"
            onPress={() => Alert.alert('Datos del vehículo', 'Pantalla en desarrollo')} />

            <SettingFila
            icon={<CreditCard size={20} color={Colores.primary} />}
            label="Licencia de conducir"
            value={usuario?.licenseNumber || 'No registrado'} />

            <SettingFila
            icon={<Shield size={20} color={Colores.primary} />}
            label="Estado de verificación"
            value={usuario?.telefonoVerificado ? 'Verificado' : 'Pendiente'} />

            <SettingFila
            icon={<DollarSign size={20} color={Colores.primary} />}
            label="Estado de cuenta"
            onPress={() => Alert.alert('Estado de cuenta', 'Pantalla en desarrollo')} />

            <SettingFila
            icon={<ComprobarCircle size={20} color={Colores.primary} />}
            label="Aceptar viajes automáticos"
            rightElement={
            <Switch
              value={ajustes.autoAcceptRides}
              onValueChange={(valor) => actualizarAjustes({ autoAcceptRides: valor })}
              trackColor={{ false: '#E0E0E0', true: Colores.primary }}
              thumbColor="#FFFFFF" />

            } />

            <SettingFila
            icon={<Usuarios size={20} color={Colores.primary} />}
            label="Permitir negociación"
            rightElement={
            <Switch
              value={ajustes.allowNegotiation}
              onValueChange={(valor) => actualizarAjustes({ allowNegotiation: valor })}
              trackColor={{ false: '#E0E0E0', true: Colores.primary }}
              thumbColor="#FFFFFF" />

            } />

          </Seccion>
        }

        <Seccion title="Notificaciones">
          <SettingFila
            icon={<Bell size={20} color={Colores.primary} />}
            label="Notificaciones push"
            rightElement={
            <Switch
              value={ajustes.notificationsEnabled}
              onValueChange={(valor) => actualizarAjustes({ notificationsEnabled: valor })}
              trackColor={{ false: '#E0E0E0', true: Colores.primary }}
              thumbColor="#FFFFFF" />

            } />

          <SettingFila
            icon={<MensajeCircle size={20} color={Colores.primary} />}
            label="Sonido"
            rightElement={
            <Switch
              value={ajustes.soundEnabled}
              onValueChange={(valor) => actualizarAjustes({ soundEnabled: valor })}
              trackColor={{ false: '#E0E0E0', true: Colores.primary }}
              thumbColor="#FFFFFF" />

            } />

        </Seccion>

        <Vista style={estilos.footer}>
          <Texto style={estilos.footerText}>LineaLila v1.0.0</Texto>
        </Vista>
      </DesplazableVista>

      <Modal
        visible={mostrarPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => establecerMostrarPinModal(false)}>
        <Vista style={estilos.modalOverlay}>
          <Vista style={estilos.modalContent}>
            <Texto style={estilos.modalTitle}>
              {pinModo === 'set' ? 'Establecer PIN' : 'Verificar PIN'}
            </Texto>
            <Texto style={estilos.modalSubtitle}>Ingresa un PIN de 4 dígitos</Texto>
            <TextoEntrada
              style={estilos.pinInput}
              value={pinValor}
              onChangeText={establecerPinValor}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#AFAFBF" />

            <Vista style={estilos.modalButtons}>
              <PulsableOpacidad
                style={estilos.modalCancelButton}
                onPress={() => {
                  establecerMostrarPinModal(false);
                  establecerPinValor('');
                }}>
                <Texto style={estilos.modalCancelText}>Cancelar</Texto>
              </PulsableOpacidad>
              <PulsableOpacidad
                style={estilos.modalConfirmButton}
                onPress={manejarEstablecerPin}>
                <Texto style={estilos.modalConfirmText}>Aceptar</Texto>
              </PulsableOpacidad>
            </Vista>
          </Vista>
        </Vista>
      </Modal>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4
  },
  sectionContent: {
    backgroundColor: Colores.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colores.text
  },
  settingValue: {
    fontSize: 14,
    color: Colores.textSecondary,
    marginRight: 8
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  chevron: {
    fontSize: 20,
    color: Colores.textTertiary,
    marginLeft: 4
  },
  dangerText: {
    color: Colores.danger
  },
  logoutButton: {
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: Colores.primaryLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colores.primary,
    marginLeft: 10
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: Colores.textTertiary
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: Colores.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colores.text,
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colores.textSecondary,
    marginBottom: 24
  },
  pinInput: {
    width: '100%',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colores.border,
    borderRadius: 12,
    color: Colores.text
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%'
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: Colores.background,
    borderRadius: 10
  },
  modalCancelText: {
    fontSize: 16,
    color: Colores.textSecondary,
    fontWeight: '600'
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: Colores.primary,
    borderRadius: 10
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600'
  }
});

export default AjustesPantalla;
