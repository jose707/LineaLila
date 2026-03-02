// src/screens/DriverRegistrationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';

type DriverRegistrationScreenProps = NativeStackScreenProps<
  any,
  'DriverRegistration'
>;

// Helper function to normalize document names
const normalizeDocName = (name: string): string => {
  return String(name)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export default function DriverRegistrationScreen({
  navigation,
}: DriverRegistrationScreenProps) {
  const { user: currentUser, token } = useAuth();
  const route = useRoute<any>();
  const navigationParams = route.params;

  // Paso 1: Datos Personales
  const [birthDate, setBirthDate] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Paso 2: Cédula de Identidad
  const [ciNumber, setCiNumber] = useState('');
  const [ciFront, setCiFront] = useState<string | null>(null);
  const [ciBack, setCiBack] = useState<string | null>(null);

  // Paso 3: Antecedentes
  const [antecedentsPhoto, setAntecedentsPhoto] = useState<string | null>(null);
  const [antecedentsDate, setAntecedentsDate] = useState('');

  // Paso 4: Vehículo
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [carFront, setCarFront] = useState<string | null>(null);
  const [carBack, setCarBack] = useState<string | null>(null);
  const [carLeft, setCarLeft] = useState<string | null>(null);
  const [carRight, setCarRight] = useState<string | null>(null);

  // Paso 5: SOAT y RUAT
  const [soatPhoto, setSoatPhoto] = useState<string | null>(null);
  const [ruatPhoto, setRuatPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Procesando...');
  const [step, setStep] = useState(1); // 1-6 pasos

  // Cargar información de solicitud rechazada si existe
  React.useEffect(() => {
    const checkRejectedApplication = async () => {
      try {
        // Primero verificar si vienen parámetros de navegación
        if (
          navigationParams?.isResubmission &&
          navigationParams?.rejectedDocs
        ) {
          console.log('Using navigation params for rejected documents');
          console.log(
            'navigationParams:',
            JSON.stringify(navigationParams, null, 2),
          );
          // Navegar a la pantalla de resubmisión
          navigation.navigate('DocumentResubmission' as never);
          return;
        }

        // Si no hay parámetros, hacer fetch del servidor
        const response = await fetch(
          'http://192.168.100.133:3000/api/drivers/status',
          {
            headers: {
              Authorization: `Bearer ${token || ''}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          console.log('Driver status data:', data);

          if (data.status === 'rejected') {
            console.log(
              'Driver has rejected application, navigating to DocumentResubmission',
            );
            console.log(
              'Rejection reason:',
              data.rejectionReason || data.driver?.rejectionReason,
            );
            // Navegar a la pantalla de resubmisión
            navigation.navigate('DocumentResubmission' as never);
          }
        }
      } catch (error) {
        console.error('Error checking rejected application:', error);
      }
    };

    if (token) {
      checkRejectedApplication();
    }
  }, [token, navigationParams?.isResubmission, navigation]);

  // Función para capturar imágenes
  const pickImage = async (setImage: Function) => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción',
      [
        {
          text: 'Tomar foto',
          onPress: async () => {
            try {
              const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.7,
                saveToPhotos: false,
              });

              if (result.errorCode) {
                console.error('Camera error:', result.errorMessage);
                if (result.errorCode === 'camera_unavailable') {
                  Alert.alert(
                    'Error',
                    'La cámara no está disponible en este dispositivo',
                  );
                } else if (result.errorCode === 'permission') {
                  Alert.alert(
                    'Permiso Denegado',
                    'Se denegó el acceso a la cámara. Por favor habilita el permiso en Configuración.',
                    [
                      {
                        text: 'Ir a Configuración',
                        onPress: () => Linking.openSettings(),
                      },
                      {
                        text: 'Cancelar',
                        style: 'cancel',
                      },
                    ],
                  );
                } else {
                  Alert.alert('Error', `Error: ${result.errorMessage}`);
                }
              } else if (result.assets && result.assets[0]) {
                setImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Error al tomar foto:', error);
              Alert.alert('Error', 'Ocurrió un error al tomar la foto');
            }
          },
        },
        {
          text: 'Elegir de galería',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.7,
              });

              if (result.errorCode) {
                console.error('Gallery error:', result.errorMessage);
                Alert.alert(
                  'Error',
                  `No se pudo acceder a la galería: ${result.errorMessage}`,
                );
              } else if (result.assets && result.assets[0]) {
                setImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Error al seleccionar imagen:', error);
              Alert.alert('Error', 'Ocurrió un error al seleccionar la imagen');
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  // Validaciones por paso
  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!birthDate.trim()) {
          Alert.alert('Error', 'Ingresa tu fecha de nacimiento');
          return false;
        }
        // Validar edad mayor de 18
        const age = calculateAge(birthDate);
        if (age < 18) {
          Alert.alert('Error', 'Debes ser mayor de 18 años');
          return false;
        }
        if (!profilePhoto) {
          Alert.alert('Error', 'Debes tomar una foto de tu rostro');
          return false;
        }
        return true;

      case 2:
        if (!ciNumber.trim()) {
          Alert.alert('Error', 'Ingresa tu número de CI');
          return false;
        }
        if (!ciFront) {
          Alert.alert('Error', 'Sube la foto frontal de tu CI');
          return false;
        }
        if (!ciBack) {
          Alert.alert('Error', 'Sube la foto posterior de tu CI');
          return false;
        }
        return true;

      case 3:
        if (!antecedentsPhoto) {
          Alert.alert('Error', 'Sube tu certificado de antecedentes');
          return false;
        }
        return true;

      case 4:
        if (!vehicleType) {
          Alert.alert('Error', 'Selecciona el tipo de vehículo');
          return false;
        }
        if (!vehiclePlate.trim()) {
          Alert.alert('Error', 'Ingresa la placa del vehículo');
          return false;
        }
        if (!vehicleYear.trim()) {
          Alert.alert('Error', 'Ingresa el año del vehículo');
          return false;
        }
        if (!carFront || !carBack || !carLeft || !carRight) {
          Alert.alert('Error', 'Debes subir todas las fotos del vehículo');
          return false;
        }
        return true;

      case 5:
        if (!soatPhoto) {
          Alert.alert('Error', 'Debes subir la foto del SOAT');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const calculateAge = (birthDateString: string): number => {
    const parts = birthDateString.split('/');
    if (parts.length !== 3) return 0;
    const birthDate = new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0]),
    );
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (step < 6) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Original submission logic for step 1-6
    setLoading(true);
    setLoadingMessage('Preparando solicitud...');
    try {
      // Crear FormData para enviar archivos
      const formData = new FormData();

      // Datos de texto
      formData.append('birthDate', birthDate);
      formData.append('ciNumber', ciNumber);
      formData.append('antecedentsDate', antecedentsDate);
      formData.append('vehicleType', vehicleType);
      formData.append('vehiclePlate', vehiclePlate);
      formData.append('vehicleYear', vehicleYear);
      formData.append('status', 'pending');

      // Agregar imágenes como archivos
      setLoadingMessage('Subiendo fotos (1/10)...');
      if (profilePhoto) {
        formData.append('profilePhoto', {
          uri: profilePhoto,
          type: 'image/jpeg',
          name: 'profilePhoto.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (2/10)...');
      if (ciFront) {
        formData.append('ciFront', {
          uri: ciFront,
          type: 'image/jpeg',
          name: 'ciFront.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (3/10)...');
      if (ciBack) {
        formData.append('ciBack', {
          uri: ciBack,
          type: 'image/jpeg',
          name: 'ciBack.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (4/10)...');
      if (antecedentsPhoto) {
        formData.append('antecedentsPhoto', {
          uri: antecedentsPhoto,
          type: 'image/jpeg',
          name: 'antecedentsPhoto.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (5/10)...');
      if (carFront) {
        formData.append('carFront', {
          uri: carFront,
          type: 'image/jpeg',
          name: 'carFront.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (6/10)...');
      if (carBack) {
        formData.append('carBack', {
          uri: carBack,
          type: 'image/jpeg',
          name: 'carBack.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (7/10)...');
      if (carLeft) {
        formData.append('carLeft', {
          uri: carLeft,
          type: 'image/jpeg',
          name: 'carLeft.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (8/10)...');
      if (carRight) {
        formData.append('carRight', {
          uri: carRight,
          type: 'image/jpeg',
          name: 'carRight.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (9/10)...');
      if (soatPhoto) {
        formData.append('soatPhoto', {
          uri: soatPhoto,
          type: 'image/jpeg',
          name: 'soatPhoto.jpg',
        } as any);
      }

      setLoadingMessage('Subiendo fotos (10/10)...');
      if (ruatPhoto) {
        formData.append('ruatPhoto', {
          uri: ruatPhoto,
          type: 'image/jpeg',
          name: 'ruatPhoto.jpg',
        } as any);
      }

      console.log('Sending driver registration with images');
      console.log(
        '📧 Token:',
        token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
      );
      console.log('👤 User:', currentUser?.id);
      setLoadingMessage('Enviando solicitud al servidor...');

      // Validar que hay token
      if (!token) {
        throw new Error(
          'No hay token de autenticación. Por favor inicia sesión nuevamente.',
        );
      }

      // Enviar solicitud al backend (nuevo endpoint versionado)
      const response = await fetch(
        'http://192.168.100.133:3000/api/requests/register',
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      setLoadingMessage('Validando respuesta del servidor...');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error:', errorData);
        throw new Error(
          errorData.error || `Error ${response.status}: ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log('Driver registration response:', result);

      Alert.alert(
        '¡Solicitud Enviada! ✅',
        'Tu solicitud para ser conductor ha sido recibida. Un administrador revisará tu aplicación en 24-48 horas. Te notificaremos cuando sea aprobada.',
        [
          {
            text: 'Volver al Inicio',
            onPress: () => navigation.navigate('Map' as never),
          },
        ],
      );
    } catch (error: any) {
      console.error('Driver registration error:', error);
      const errorMessage =
        error?.message || 'No se pudo enviar tu solicitud. Intenta de nuevo.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage('Procesando...');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const renderPhotoButton = (
    label: string,
    photo: string | null,
    setPhoto: Function,
  ) => (
    <View style={styles.photoGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.photoButton}
        onPress={() => pickImage(setPhoto)}
        disabled={loading}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoText}>Tomar foto</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>👤 Datos Personales</Text>
            <Text style={styles.stepDescription}>
              Información del conductor y verificación de identidad
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <Text style={styles.summaryText}>
                {currentUser?.name || 'Usuario'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Fecha de Nacimiento (DD/MM/YYYY) *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 15/06/1990"
                value={birthDate}
                onChangeText={setBirthDate}
                editable={!loading}
              />
            </View>

            {renderPhotoButton(
              '📸 Foto del Rostro (Selfie) *',
              profilePhoto,
              setProfilePhoto,
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🪪 Cédula de Identidad</Text>
            <Text style={styles.stepDescription}>
              Documentos de identificación oficial
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de CI *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 1234567 LP"
                value={ciNumber}
                onChangeText={setCiNumber}
                editable={!loading}
              />
            </View>

            {renderPhotoButton(
              '📷 Foto Frontal de la CI *',
              ciFront,
              setCiFront,
            )}
            {renderPhotoButton(
              '📷 Foto Posterior de la CI *',
              ciBack,
              setCiBack,
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📄 Antecedentes Policiales</Text>
            <Text style={styles.stepDescription}>
              Certificado de antecedentes vigente
            </Text>

            {renderPhotoButton(
              '📄 Certificado de Antecedentes *',
              antecedentsPhoto,
              setAntecedentsPhoto,
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha de Emisión (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                value={antecedentsDate}
                onChangeText={setAntecedentsDate}
                editable={!loading}
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🚗 Información del Vehículo</Text>
            <Text style={styles.stepDescription}>
              Detalles y fotos de tu vehículo
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Vehículo *</Text>
              <View style={styles.vehicleTypeContainer}>
                {['Sedan', 'SUV', 'Minivan'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.vehicleTypeButton,
                      vehicleType === type && styles.vehicleTypeButtonActive,
                    ]}
                    onPress={() => setVehicleType(type)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.vehicleTypeText,
                        vehicleType === type && styles.vehicleTypeTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Placa del Vehículo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 1234ABC"
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Año del Vehículo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 2022"
                keyboardType="number-pad"
                value={vehicleYear}
                onChangeText={setVehicleYear}
                editable={!loading}
              />
            </View>

            <Text style={styles.sectionTitle}>Fotos del Vehículo</Text>
            {renderPhotoButton('📷 Vista Frontal *', carFront, setCarFront)}
            {renderPhotoButton('📷 Vista Trasera *', carBack, setCarBack)}
            {renderPhotoButton(
              '📷 Vista Lateral Izquierda *',
              carLeft,
              setCarLeft,
            )}
            {renderPhotoButton(
              '📷 Vista Lateral Derecha *',
              carRight,
              setCarRight,
            )}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📋 SOAT y RUAT</Text>
            <Text style={styles.stepDescription}>
              Documentos legales del vehículo
            </Text>

            {renderPhotoButton('📄 Foto del SOAT *', soatPhoto, setSoatPhoto)}
            {renderPhotoButton(
              '📄 Foto del RUAT (Opcional)',
              ruatPhoto,
              setRuatPhoto,
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                El SOAT es obligatorio. El RUAT es opcional pero recomendado.
              </Text>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>✅ Revisión Final</Text>
            <Text style={styles.stepDescription}>
              Verifica que toda tu información sea correcta
            </Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Datos Personales</Text>
              <Text style={styles.summaryText}>
                {currentUser?.name || 'Usuario'}
              </Text>
              <Text style={styles.summaryText}>
                Fecha de nacimiento: {birthDate}
              </Text>
              <Text style={styles.summaryText}>CI: {ciNumber}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Vehículo</Text>
              <Text style={styles.summaryText}>Tipo: {vehicleType}</Text>
              <Text style={styles.summaryText}>Placa: {vehiclePlate}</Text>
              <Text style={styles.summaryText}>Año: {vehicleYear}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Documentos</Text>
              <Text style={styles.summaryText}>✅ Foto de rostro</Text>
              <Text style={styles.summaryText}>
                ✅ CI (frontal y posterior)
              </Text>
              <Text style={styles.summaryText}>✅ Antecedentes policiales</Text>
              <Text style={styles.summaryText}>✅ Fotos del vehículo (4)</Text>
              <Text style={styles.summaryText}>✅ SOAT</Text>
              {ruatPhoto && <Text style={styles.summaryText}>✅ RUAT</Text>}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>⏱️</Text>
              <Text style={styles.infoText}>
                Tu solicitud será revisada en 24-48 horas. Te notificaremos por
                correo cuando sea aprobada o si necesitamos información
                adicional.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitud de Conductor</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Paso {step} de 6</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${(step / 6) * 100}%` }]} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 7
                ? 'Reenviar Documentos'
                : step === 6
                ? 'Enviar Solicitud'
                : 'Siguiente'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            <Text style={styles.loadingSubtext}>
              Por favor, no cierres la aplicación
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  stepContent: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  photoGroup: {
    marginBottom: 20,
  },
  photoButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  vehicleTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  vehicleTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  vehicleTypeTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  documentStatusBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderColor: '#10B981',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  documentStatusItem: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
    marginLeft: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});
