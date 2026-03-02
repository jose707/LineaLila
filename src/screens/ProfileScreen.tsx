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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getMyRequestStatus } from '../services/admin.service';
import { COLORS } from '../theme/colors';

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

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout, isDriverMode, setIsDriverMode, token } = useAuth();

  const [profile, setProfile] = useState<DriverProfile>({
    name: 'Usuario',
    email: 'usuario@email.com',
    phone: '+591 7123456',
    vehicle: 'Toyota Corolla 2020',
    plate: 'ABC-1234',
    documentId: '1234567',
    rating: 4.8,
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

  // Actualizar perfil cuando cambia el usuario desde la BD
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user?.name ?? prev.name,
        email: user?.email ?? prev.email,
        phone: user?.phone ?? prev.phone,
        rating: user?.rating ?? prev.rating,
        totalRides: user?.totalRides ?? prev.totalRides,
      }));
    }
  }, [user]);

  // Cargar estado de conductor al abrir la pantalla
  useEffect(() => {
    loadDriverStatus();
  }, []);

  // También cargar cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('ProfileScreen focused, reloading driver status');
      loadDriverStatus();
    }, []),
  );

  const loadDriverStatus = async () => {
    try {
      setLoadingDriverStatus(true);
      console.log('Loading driver request status...');
      const status = await getMyRequestStatus();
      console.log('Driver request status loaded:', status);
      setDriverStatus(status);
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      setLoadingDriverStatus(false);
    }
  };

  const handleSave = async () => {
    try {
      // 🔥 TODO: Conectar con backend para guardar cambios
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
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
        // Si no está aprobado, mostrar opciones
        handleBecomeDriver();
        return;
      }

      const newMode = !isDriverMode;
      setIsDriverMode(newMode);

      Alert.alert(
        newMode ? 'Modo Conductor Activado 🚗' : 'Modo Pasajero Activado 👤',
        newMode
          ? 'Ahora puedes aceptar viajes como conductor'
          : 'Ahora puedes solicitar viajes como pasajero',
        [
          {
            text: 'Ok',
            onPress: () => {
              if (newMode) {
                // Si cambia a modo conductor, navegar a DriverHome
                (navigation as any).navigate('DriverHome' as never);
              } else {
                // Si cambia a modo pasajero, navegar a MapScreen
                (navigation as any).navigate('Map' as never);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error toggling mode:', error);
      Alert.alert('Error', 'Ocurrió un error al cambiar de modo');
    }
  };

  const handleBecomeDriver = async () => {
    try {
      // Cargar el estado actual primero
      setLoadingDriverStatus(true);
      console.log('Loading driver request status in handleBecomeDriver...');
      const status = await getMyRequestStatus();
      console.log('Driver request status loaded:', status);
      setDriverStatus(status);
      setLoadingDriverStatus(false);

      // Si ya tiene una solicitud
      if (status?.hasApplication) {
        const { status: requestStatus } = status;

        if (requestStatus === 'pending') {
          Alert.alert(
            'Solicitud en Revisión',
            'Tu solicitud está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada. Esto generalmente toma 24-48 horas.',
            [{ text: 'Ok', onPress: () => {} }],
          );
        } else if (requestStatus === 'approved') {
          // ¡Está aprobado! Cambiar a modo conductor
          setIsDriverMode(true);
          Alert.alert(
            '¡Aprobado! 🎉',
            'Has cambiado a modo conductor. Ahora puedes aceptar viajes.',
            [
              {
                text: 'Ok',
                onPress: () => {
                  (navigation as any).navigate('DriverHome' as never);
                },
              },
            ],
          );
        } else if (requestStatus === 'rejected') {
          // Obtener documentos rechazados del nuevo sistema
          const rejectionReason =
            status?.request?.rejectionReason || 'No especificada';
          const rejectedDocsList = status?.request?.rejectedDocuments || [];

          // Mapear documentos técnicos a nombres en español
          const docKeyToName: { [key: string]: string } = {
            profilePhoto: 'Foto Perfil',
            ciFront: 'CI Frente',
            ciBack: 'CI Dorso',
            antecedentsPhoto: 'Antecedentes',
            carFront: 'Auto Frente',
            carBack: 'Auto Dorso',
            carLeft: 'Auto Izquierda',
            carRight: 'Auto Derecha',
            soatPhoto: 'SOAT',
            ruatPhoto: 'RUAT',
          };

          // Convertir claves de documentos rechazados a nombres en español
          const rejectedDocNames = rejectedDocsList
            .map((docKey: string) => docKeyToName[docKey] || docKey)
            .filter(Boolean);

          // Obtener documentos que fueron aprobados (en estado 'approved')
          const documents = status?.request?.documents || {};
          const approvedDocs = Object.entries(documents)
            .filter(([_, doc]: [string, any]) => doc?.status === 'approved')
            .map(([key, _]) => docKeyToName[key] || key)
            .filter(Boolean);

          // Crear mensaje de documentos observados
          const docsObservadosMsg =
            rejectedDocNames.length > 0
              ? `Documentos observados:\n• ${rejectedDocNames.join('\n• ')}`
              : 'Se observaron algunos documentos en tu solicitud';

          Alert.alert(
            'Solicitud Rechazada',
            `Tu solicitud fue rechazada.\n\nRazón: ${rejectionReason}\n\n${docsObservadosMsg}`,
            [
              {
                text: 'Reenviar Documentos',
                onPress: () => {
                  setDriverStatus(null);
                  (navigation as any).navigate(
                    'DocumentResubmission' as never,
                    {
                      rejectedDocs: rejectedDocsList,
                      approvedDocs: approvedDocs,
                      rejectionReason: rejectionReason,
                    },
                  );
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ],
          );
        }
      } else {
        // No tiene solicitud, ir a registrarse
        Alert.alert(
          'Solicitar Acceso como Conductor',
          'Para ser conductor, debes completar un formulario de solicitud. Esta será revisada por nuestro equipo de administración.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: () => {
                (navigation as any).navigate('DriverRegistration' as never, {
                  user,
                });
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error in handleBecomeDriver:', error);
      Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo.');
    }
  };

  const currentProfile = isEditing ? editedProfile : profile;
  const isApprovedDriver =
    driverStatus?.hasApplication && driverStatus.status === 'approved';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* AVATAR Y INFORMACIÓN BÁSICA */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image
                source={{ uri: user.photoURL }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatar}>👤</Text>
            )}
          </View>
          <Text style={styles.profileName}>{currentProfile.name}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {currentProfile.rating}</Text>
            <Text style={styles.tripCount}>
              {currentProfile.totalRides} viajes
            </Text>
          </View>
        </View>

        {/* BOTÓN CAMBIAR MODO - Principal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo de Operación</Text>
          <TouchableOpacity
            style={[styles.modeButton, isDriverMode && styles.modeButtonActive]}
            onPress={handleToggleMode}
            disabled={loadingDriverStatus}
          >
            <View style={styles.modeButtonContent}>
              <View style={styles.modeButtonInfo}>
                <Text style={styles.modeButtonTitle}>
                  {isDriverMode ? '🚗 Modo Conductor' : '👤 Modo Pasajero'}
                </Text>
                <Text style={styles.modeButtonDescription}>
                  {driverStatus?.hasApplication
                    ? driverStatus.status === 'approved'
                      ? isDriverMode
                        ? 'Aceptando viajes'
                        : 'Solicitando viajes'
                      : driverStatus.status === 'pending'
                      ? 'Solicitud en Revisión'
                      : 'Solicitud Rechazada - Ver detalles'
                    : 'Solicitar ser Conductor'}
                </Text>
              </View>
              {loadingDriverStatus ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.modeButtonArrow}>→</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* INFORMACIÓN PERSONAL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                value={editedProfile.name}
                onChangeText={text =>
                  setEditedProfile({ ...editedProfile, name: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={editedProfile.email}
                onChangeText={text =>
                  setEditedProfile({ ...editedProfile, email: text })
                }
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Teléfono"
                value={editedProfile.phone}
                onChangeText={text =>
                  setEditedProfile({ ...editedProfile, phone: text })
                }
              />
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{currentProfile.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Correo</Text>
                <Text style={styles.infoValue}>{currentProfile.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{currentProfile.phone}</Text>
              </View>
            </>
          )}
        </View>

        {/* INFORMACIÓN DEL VEHÍCULO - Solo si es conductor */}
        {isDriverMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Vehículo</Text>

            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Vehículo"
                  value={editedProfile.vehicle}
                  onChangeText={text =>
                    setEditedProfile({ ...editedProfile, vehicle: text })
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Placa"
                  value={editedProfile.plate}
                  onChangeText={text =>
                    setEditedProfile({ ...editedProfile, plate: text })
                  }
                />
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vehículo</Text>
                  <Text style={styles.infoValue}>{currentProfile.vehicle}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Placa</Text>
                  <Text style={styles.infoValue}>{currentProfile.plate}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* BOTONES DE ACCIÓN */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BOTÓN DE CERRAR SESIÓN */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Cerrar sesión',
              '¿Estás segura de que deseas cerrar sesión?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar sesión',
                  style: 'destructive',
                  onPress: async () => {
                    await logout();
                  },
                },
              ],
            );
          }}
        >
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    fontSize: 28,
    color: '#7C3AED',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatar: {
    fontSize: 48,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  tripCount: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    color: '#2D2D2D',
  },
  modeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  modeButtonActive: {
    backgroundColor: '#F0E6FF',
    borderColor: '#7C3AED',
  },
  modeButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  modeButtonInfo: {
    flex: 1,
    marginRight: 12,
  },
  modeButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  modeButtonDescription: {
    fontSize: 12,
    color: '#999',
  },
  modeButtonArrow: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  requestButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  requestButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  requestButtonIcon: {
    fontSize: 32,
  },
  requestButtonInfo: {
    flex: 1,
  },
  requestButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 2,
  },
  requestButtonDescription: {
    fontSize: 12,
    color: '#999',
  },
  requestButtonArrow: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default ProfileScreen;
