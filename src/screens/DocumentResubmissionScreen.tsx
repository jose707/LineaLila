// src/screens/DocumentResubmissionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { getMyRequestStatus } from '../services/admin.service';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type DocumentResubmissionScreenProps = NativeStackScreenProps<
  any,
  'DocumentResubmission'
>;

interface RejectedDocument {
  name: string;
  displayName: string;
  fieldName: string;
  photo: string | null;
}

export default function DocumentResubmissionScreen({
  navigation,
  route,
}: DocumentResubmissionScreenProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Procesando...');
  const [initialLoading, setInitialLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documents, setDocuments] = useState<RejectedDocument[]>([]);

  // Obtener datos de los parámetros de navegación
  const rejectedDocs = route?.params?.rejectedDocs || [];
  const rejectionReasonParam = route?.params?.rejectionReason || '';

  // Mapeo de documentos
  const documentMapping: { [key: string]: { display: string; field: string } } =
    {
      'Foto Perfil': {
        display: '📸 Foto del Rostro (Selfie)',
        field: 'profilePhoto',
      },
      'CI Frente': { display: '📷 Foto Frontal de la CI', field: 'ciFront' },
      'CI Dorso': { display: '📷 Foto Posterior de la CI', field: 'ciBack' },
      Antecedentes: {
        display: '📄 Certificado de Antecedentes',
        field: 'antecedentsPhoto',
      },
      'Auto Frente': {
        display: '📷 Vista Frontal del Auto',
        field: 'carFront',
      },
      'Auto Dorso': { display: '📷 Vista Trasera del Auto', field: 'carBack' },
      'Auto Izquierda': {
        display: '📷 Vista Lateral Izquierda',
        field: 'carLeft',
      },
      'Auto Derecha': {
        display: '📷 Vista Lateral Derecha',
        field: 'carRight',
      },
      SOAT: { display: '📋 SOAT del Vehículo', field: 'soatPhoto' },
      RUAT: { display: '📋 RUAT del Vehículo', field: 'ruatPhoto' },
    };

  // Cargar información de documentos rechazados
  useEffect(() => {
    const loadRejectedDocuments = async () => {
      try {
        setInitialLoading(true);
        setRejectionReason(rejectionReasonParam);

        console.log('Rejected docs received:', rejectedDocs);
        console.log('Rejection reason:', rejectionReasonParam);

        if (rejectedDocs.length > 0) {
          // Crear array de documentos con estado inicial vacío
          const docArray: RejectedDocument[] = rejectedDocs.map(
            (docKey: string) => ({
              name: docKey,
              displayName: documentMapping[docKey]?.display || docKey,
              fieldName: documentMapping[docKey]?.field || docKey,
              photo: null,
            }),
          );

          setDocuments(docArray);
        } else {
          // No hay documentos específicos
          Alert.alert(
            'Solicitud Rechazada',
            `Motivo del rechazo:\n\n${
              rejectionReasonParam || 'No especificado'
            }\n\nPor favor, contacta al administrador para más detalles.`,
            [{ text: 'Volver', onPress: () => navigation.goBack() }],
          );
        }
      } catch (error) {
        console.error('Error loading rejected documents:', error);
        Alert.alert(
          'Error',
          'No se pudo cargar la información de documentos rechazados',
          [{ text: 'Volver', onPress: () => navigation.goBack() }],
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadRejectedDocuments();
  }, [rejectedDocs, rejectionReasonParam]);

  const extractRejectedDocuments = (rejectionReason: string): string[] => {
    if (!rejectionReason) return [];

    try {
      // Lista de todos los nombres de documentos que podemos detectar
      const allDocNames = Object.keys(documentMapping);

      // Intenta el formato estándar primero
      if (
        rejectionReason.includes(
          'Documentos rechazados que deben ser reenviados:',
        )
      ) {
        const parts = rejectionReason.split(
          'Documentos rechazados que deben ser reenviados:',
        );
        if (parts.length > 1) {
          const docsList = parts[1]
            .split(/[,\n]/)
            .map(doc => doc.trim())
            .filter(doc => doc.length > 0);
          return docsList;
        }
      }

      // Si no encuentra el formato estándar, buscar nombres de documentos en el texto
      const foundDocs = allDocNames.filter(docName =>
        rejectionReason.includes(docName),
      );

      if (foundDocs.length > 0) {
        console.log('Documents found by name matching:', foundDocs);
        return foundDocs;
      }

      // Si no encuentra documentos específicos, retorna array vacío
      console.warn('Could not parse rejection reason format:', rejectionReason);
      return [];
    } catch (error) {
      console.error('Error extracting documents:', error);
      return [];
    }
  };

  const pickImage = async (index: number) => {
    Alert.alert('Seleccionar imagen', 'Elige una opción', [
      {
        text: 'Cámara',
        onPress: () =>
          launchCamera({ mediaType: 'photo' }, resp => {
            if (resp.assets?.[0]?.uri) {
              const newDocuments = [...documents];
              newDocuments[index].photo = resp.assets[0].uri;
              setDocuments(newDocuments);
            }
          }),
      },
      {
        text: 'Galería',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo' }, resp => {
            if (resp.assets?.[0]?.uri) {
              const newDocuments = [...documents];
              newDocuments[index].photo = resp.assets[0].uri;
              setDocuments(newDocuments);
            }
          }),
      },
      { text: 'Cancelar', onPress: () => {} },
    ]);
  };

  const handleSubmit = async () => {
    // Validar que todos los documentos tengan foto
    const missingDocuments = documents.filter(doc => !doc.photo);
    if (missingDocuments.length > 0) {
      Alert.alert(
        'Documentos incompletos',
        `Falta subir: ${missingDocuments.map(d => d.name).join(', ')}`,
      );
      return;
    }

    setLoading(true);
    setLoadingMessage('Preparando documentos...');
    try {
      const formData = new FormData();

      // Agregar cada documento al FormData
      let index = 0;
      for (const doc of documents) {
        if (doc.photo) {
          index++;
          setLoadingMessage(
            `Subiendo documento ${index}/${documents.length}...`,
          );
          formData.append(doc.fieldName, {
            uri: doc.photo,
            type: 'image/jpeg',
            name: `${doc.fieldName}.jpg`,
          } as any);
        }
      }

      setLoadingMessage('Enviando solicitud al servidor...');

      const response = await fetch(
        'http://192.168.100.133:3000/api/requests/resubmit',
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${token || ''}`,
          },
        },
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(
          errorData.error || `Error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log('Resubmission response:', result);

      Alert.alert(
        '¡Éxito! ✅',
        'Tus documentos han sido reenviados correctamente. Un administrador revisará los cambios en 24-48 horas.',
        [
          {
            text: 'Volver',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      console.error('Resubmission error:', error);
      Alert.alert(
        'Error',
        error?.message ||
          'No se pudo reenviar los documentos. Intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Cargando documentos rechazados...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const allFilled = documents.every(doc => doc.photo);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reenvío de Documentos</Text>
        </View>

        {rejectionReason && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Motivo del Rechazo:</Text>
            <Text style={styles.infoText}>{rejectionReason}</Text>
          </View>
        )}

        <View style={styles.documentsList}>
          <Text style={styles.sectionTitle}>
            Documentos a Reenviar ({documents.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            {documents.filter(d => !d.photo).length} pendientes
          </Text>

          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{doc.displayName}</Text>
                {doc.photo && (
                  <Text style={styles.uploadedText}>✓ Cargado</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.photoButton,
                  doc.photo && styles.photoButtonFilled,
                ]}
                onPress={() => pickImage(index)}
                disabled={loading}
              >
                {doc.photo ? (
                  <Image
                    source={{ uri: doc.photo }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <Text style={styles.photoButtonText}>
                    {loading ? '⏳' : '📷'} {loading ? 'Enviando...' : 'Cargar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !allFilled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!allFilled || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                Reenviar Documentos ({documents.filter(d => d.photo).length}/
                {documents.length})
              </Text>
            )}
          </TouchableOpacity>

          {!allFilled && (
            <Text style={styles.helpText}>
              Debes cargar todos los documentos antes de reenviar
            </Text>
          )}
        </View>
      </ScrollView>

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
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  infoBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  documentsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  uploadedText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '600',
  },
  photoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoButtonFilled: {
    borderStyle: 'solid',
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  photoButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  submitSection: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[500],
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  helpText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: COLORS.white,
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
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});
