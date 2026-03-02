import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as AdminService from '../services/admin.service';

type AdminDriverRegistrationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDriverRegistration'
>;

interface AdminDriverRegistrationScreenProps {
  navigation: AdminDriverRegistrationScreenNavigationProp;
}

interface DriverApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleYear: number;
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  backgroundCheckDate: string;
  applicationDate: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  verificationNotes: string;
  photo?: string;
  // Nueva estructura con requests versionadas
  currentRequest?: {
    id: string;
    version: number;
    status: string;
    rejectionReason?: string;
    files: Record<
      string,
      {
        filename: string;
        url?: string;
        status: string;
        uploadedAt: string;
      }
    >;
    createdAt: string;
    updatedAt: string;
  };
  // Campos legacy para compatibilidad
  approvedDocuments?: Record<string, boolean>;
  documentStatus?: Record<string, 'pending' | 'approved'>;
  documents?: {
    profilePhoto?: string;
    ciFront?: string;
    ciBack?: string;
    antecedentsPhoto?: string;
    carFront?: string;
    carBack?: string;
    carLeft?: string;
    carRight?: string;
    soatPhoto?: string;
    ruatPhoto?: string;
  };
}

const AdminDriverRegistrationScreen: React.FC<
  AdminDriverRegistrationScreenProps
> = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [selectedApplication, setSelectedApplication] =
    useState<DriverApplication | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentImage, setSelectedDocumentImage] = useState<
    string | null
  >(null);
  const [documentImageModalVisible, setDocumentImageModalVisible] =
    useState(false);
  const [currentDocumentKey, setCurrentDocumentKey] = useState<string | null>(
    null,
  );
  const [documentApprovalStatus, setDocumentApprovalStatus] = useState<
    Record<string, 'pending' | 'approved' | 'rejected'>
  >({});

  const [applications, setApplications] = useState<DriverApplication[]>([]);

  // Load driver applications on component mount and when filter changes
  useEffect(() => {
    loadDriverApplications();
  }, []);

  // Recargar conductores cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('AdminDriverRegistrationScreen focused, reloading drivers');
      loadDriverApplications();
    }, []),
  );

  const loadDriverApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AdminService.getAllDrivers(50, 0);
      console.log('Response from getAllDrivers:', response);
      if (response && response.data && response.data.length > 0) {
        const applicationsData = response.data as DriverApplication[];
        setApplications(applicationsData);
        // Si hay un application seleccionado, actualizar sus datos del nuevo array
        if (selectedApplication) {
          const updated = applicationsData.find(
            app => app.id === selectedApplication.id,
          );
          if (updated) {
            console.log('Updating selectedApplication with fresh data');
            setSelectedApplication(updated);
          }
        }
      } else {
        setApplications([]);
      }
    } catch (err: any) {
      console.error('Error loading drivers:', err);
      setError('Error al cargar los conductores');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchText.toLowerCase()) ||
      app.email.toLowerCase().includes(searchText.toLowerCase()) ||
      app.licenseNumber.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      selectedStatus === 'all' || app.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#ECFDF5';
      case 'pending':
        return '#FFFBEB';
      case 'rejected':
        return '#FEF2F2';
      default:
        return '#F3F4F6';
    }
  };

  const renderDocumentButton = (
    docPath: string | undefined,
    docLabel: string,
    docKey: string,
  ) => {
    const status = documentApprovalStatus[docKey] || 'pending';
    const statusColor =
      status === 'approved'
        ? '#10B981'
        : status === 'rejected'
        ? '#EF4444'
        : '#F59E0B';

    // Verificar si el archivo existe en la solicitud actual
    const fileExists = selectedApplication?.currentRequest?.files?.[docKey];

    // Usar la URL del archivo desde el backend
    let imageUrl = '';
    if (fileExists && selectedApplication?.currentRequest?.files) {
      const file = selectedApplication.currentRequest.files[docKey] as any;
      console.log(`File data for ${docKey}:`, file);
      // El backend ahora proporciona la URL completa
      imageUrl =
        file.url ||
        `http://192.168.100.133:3000/uploads/drivers/${file.filename}`;
      console.log(`Final URL for ${docKey}:`, imageUrl);
    } else if (docPath) {
      imageUrl = docPath;
    }

    // Detectar si es una resubmisión
    const isResubmission =
      selectedApplication?.currentRequest?.version &&
      selectedApplication.currentRequest.version > 1;
    const isApprovedBefore =
      isResubmission && status === 'approved' && fileExists;

    const buttonStyles: any[] = [
      styles.documentButton,
      { borderColor: statusColor, borderWidth: 2 },
    ];
    if (isApprovedBefore) {
      buttonStyles.push({ opacity: 0.6 });
    }
    if (!fileExists) {
      buttonStyles.push({
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
        borderWidth: 1,
      });
    }

    const textStyles: any[] = [styles.documentButtonText];
    if (isApprovedBefore) {
      textStyles.push({ textDecorationLine: 'line-through' });
    }
    if (!fileExists) {
      textStyles.push({ color: '#999' });
    }

    return (
      <TouchableOpacity
        key={docLabel}
        style={buttonStyles}
        onPress={() => {
          if (imageUrl) {
            setSelectedDocumentImage(imageUrl);
            setCurrentDocumentKey(docKey);
            setDocumentImageModalVisible(true);
          }
        }}
        disabled={!imageUrl}
      >
        <Text style={textStyles}>{docLabel}</Text>
        <Text
          style={{
            fontSize: 10,
            color: !fileExists ? '#999' : statusColor,
            marginTop: 4,
          }}
        >
          {!fileExists
            ? 'No enviado'
            : isApprovedBefore
            ? '✓ Aprobado (anterior)'
            : status === 'approved'
            ? '✓ Aprobado'
            : status === 'rejected'
            ? '✗ Rechazado'
            : 'Pendiente'}
        </Text>
      </TouchableOpacity>
    );
  };

  const getApprovedAndRejectedDocs = () => {
    const approved: string[] = [];
    const rejected: string[] = [];

    const docMapping: { [key: string]: string } = {
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

    Object.entries(documentApprovalStatus).forEach(([key, status]) => {
      const label = docMapping[key];
      if (label) {
        if (status === 'approved') {
          approved.push(label);
        } else if (status === 'rejected') {
          rejected.push(label);
        }
      }
    });

    return { approved, rejected };
  };

  const initializeRejectedDocuments = (app: DriverApplication) => {
    const newStatus: Record<string, 'pending' | 'approved' | 'rejected'> = {};

    // Siempre inicializar todos los documentos posibles con 'pending' por defecto
    const allDocKeys = [
      'profilePhoto',
      'ciFront',
      'ciBack',
      'antecedentsPhoto',
      'carFront',
      'carBack',
      'carLeft',
      'carRight',
      'soatPhoto',
      'ruatPhoto',
    ];

    allDocKeys.forEach(key => {
      newStatus[key] = 'pending';
    });

    // Si tiene currentRequest, usar la nueva estructura (toma prioridad)
    if (app.currentRequest && app.currentRequest.files) {
      console.log(
        'InitializeRejectedDocuments - currentRequest.files:',
        app.currentRequest.files,
      );
      Object.entries(app.currentRequest.files).forEach(
        ([docKey, fileInfo]: [string, any]) => {
          console.log(`Setting ${docKey} to status: ${fileInfo.status}`);
          newStatus[docKey] = fileInfo.status as
            | 'pending'
            | 'approved'
            | 'rejected';
        },
      );
    } else if (
      app.documentStatus &&
      Object.keys(app.documentStatus).length > 0
    ) {
      // Fallback a estructura antigua
      if (app.approvedDocuments) {
        Object.entries(app.approvedDocuments).forEach(([key, wasApproved]) => {
          if (wasApproved) {
            newStatus[key] = 'approved';
          }
        });
      }

      Object.entries(app.documentStatus).forEach(([key, status]) => {
        if (status === 'pending') {
          newStatus[key] = 'pending';
        }
      });
    } else if (app.status === 'rejected' && app.rejectionReason) {
      // Si no tiene documentStatus pero está rechazado, parsear la razón
      const rejectionText = app.rejectionReason;
      const rejectionDocsList = rejectionText.includes(
        'Documentos rechazados que deben ser reenviados',
      )
        ? rejectionText
            .split('Documentos rechazados que deben ser reenviados: ')[1]
            ?.split(', ')
        : [];

      const docMapping: { [key: string]: string } = {
        'Foto Perfil': 'profilePhoto',
        'CI Frente': 'ciFront',
        'CI Dorso': 'ciBack',
        Antecedentes: 'antecedentsPhoto',
        'Auto Frente': 'carFront',
        'Auto Dorso': 'carBack',
        'Auto Izquierda': 'carLeft',
        'Auto Derecha': 'carRight',
        SOAT: 'soatPhoto',
        RUAT: 'ruatPhoto',
      };

      rejectionDocsList?.forEach(docLabel => {
        const key = docMapping[docLabel.trim()];
        if (key) {
          newStatus[key] = 'rejected';
        }
      });
    }

    console.log('Final documentApprovalStatus:', newStatus);
    setDocumentApprovalStatus(newStatus);
  };

  const handleApproveDriver = async () => {
    if (!selectedApplication) return;

    // Verificar si hay imágenes rechazadas
    const rejectedDocuments = Object.entries(documentApprovalStatus)
      .filter(([_, status]) => status === 'rejected')
      .map(([key]) => key);

    if (rejectedDocuments.length > 0) {
      Alert.alert(
        'Documentos Rechazados',
        'No se puede aprobar la solicitud. Hay documentos rechazados. El solicitante debe reenviar las imágenes rechazadas.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Usar requestId en lugar de driverId
      await AdminService.approveDriver(
        selectedApplication.currentRequest?.id || selectedApplication.id,
      );

      // Update local state
      setApplications(
        applications.map(app =>
          app.id === selectedApplication.id
            ? { ...app, status: 'approved' }
            : app,
        ),
      );

      Alert.alert(
        'Éxito',
        `${selectedApplication.name} ha sido aprobado como conductor!`,
      );
      setDocumentApprovalStatus({});
      setModalVisible(false);
      setSelectedApplication(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al aprobar conductor';
      Alert.alert('Error', errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDriver = async () => {
    if (!selectedApplication || !rejectionReason.trim()) {
      Alert.alert('Error', 'Por favor, proporciona una razón de rechazo');
      return;
    }

    // Mapear claves técnicas a nombres en español
    const docMapping: { [key: string]: string } = {
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

    // Obtener lista de documentos rechazados (mapear a nombres en español)
    const rejectedDocuments = Object.entries(documentApprovalStatus)
      .filter(([_, status]) => status === 'rejected')
      .map(([key]) => docMapping[key] || key)
      .join(', ');

    const fullReason =
      rejectionReason.trim() +
      (rejectedDocuments
        ? `\n\nDocumentos rechazados que deben ser reenviados: ${rejectedDocuments}`
        : '');

    setIsSubmitting(true);
    try {
      // Usar requestId en lugar de driverId
      await AdminService.rejectDriver(
        selectedApplication.currentRequest?.id || selectedApplication.id,
        fullReason,
      );

      // Update local state
      setApplications(
        applications.map(app =>
          app.id === selectedApplication.id
            ? {
                ...app,
                status: 'rejected',
                rejectionReason: fullReason,
              }
            : app,
        ),
      );

      Alert.alert(
        'Solicitud Rechazada',
        `${selectedApplication.name} ha sido rechazado. Se le ha enviado un mensaje con los documentos que debe reenviar.`,
      );
      setRejectionReason('');
      setDocumentApprovalStatus({});
      setRejectionModalVisible(false);
      setModalVisible(false);
      setSelectedApplication(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al rechazar conductor';
      Alert.alert('Error', errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = applications.filter(
    app => app.status === 'pending',
  ).length;
  const approvedCount = applications.filter(
    app => app.status === 'approved',
  ).length;
  const rejectedCount = applications.filter(
    app => app.status === 'rejected',
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Registration</Text>
        <Text style={styles.headerEmpty} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading applications...</Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>
              {approvedCount}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>
              {rejectedCount}
            </Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or license..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Status Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus('all')}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === 'all' && styles.filterTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === 'pending' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus('pending')}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === 'pending' && styles.filterTextActive,
                ]}
              >
                Pending ({pendingCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === 'approved' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus('approved')}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === 'approved' && styles.filterTextActive,
                ]}
              >
                Approved ({approvedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedStatus === 'rejected' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus('rejected')}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === 'rejected' && styles.filterTextActive,
                ]}
              >
                Rejected ({rejectedCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Applications List */}
        <View style={styles.listSection}>
          <Text style={styles.resultCount}>
            {filteredApplications.length} application
            {filteredApplications.length !== 1 ? 's' : ''} found
          </Text>

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No applications found</Text>
            </View>
          ) : (
            filteredApplications.map(app => (
              <TouchableOpacity
                key={app.id}
                style={styles.applicationCard}
                onPress={() => {
                  console.log('Selected app documents:', app.documents);
                  setSelectedApplication(app);
                  initializeRejectedDocuments(app);
                  setModalVisible(true);
                }}
              >
                <View style={styles.cardContent}>
                  <View style={styles.photoAndInfo}>
                    <View style={styles.photoAvatar}>
                      <Text style={styles.photoText}>{app.photo}</Text>
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appName}>{app.name}</Text>
                      <Text style={styles.appEmail}>{app.email}</Text>
                      <View style={styles.appMeta}>
                        <Text style={styles.appMetaText}>
                          🚗 {app.vehicleType}
                        </Text>
                        <Text style={styles.appMetaText}>
                          📋 {app.licenseNumber}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(app.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(app.status) },
                      ]}
                    >
                      {app.status === 'pending'
                        ? '⏳ Pending'
                        : app.status === 'approved'
                        ? '✓ Approved'
                        : '✕ Rejected'}
                    </Text>
                  </View>
                </View>

                {/* Verification Indicators */}
                <View style={styles.verificationRow}>
                  <View
                    style={[
                      styles.verificationCheck,
                      app.documentsVerified && styles.verificationCheckPassed,
                    ]}
                  >
                    <Text style={styles.verificationCheckText}>
                      {app.documentsVerified ? '✓' : '○'} Documents
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.verificationCheck,
                      app.backgroundCheckPassed &&
                        styles.verificationCheckPassed,
                    ]}
                  >
                    <Text style={styles.verificationCheckText}>
                      {app.backgroundCheckPassed ? '✓' : '○'} Background
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Application Details Modal */}
      {selectedApplication && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Application Review</Text>
                <Text style={styles.emptySpace} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Header with Status */}
                <View style={styles.modalHeaderSection}>
                  <View style={styles.largeAvatar}>
                    <Text style={styles.largeAvatarText}>
                      {selectedApplication.photo}
                    </Text>
                  </View>
                  <Text style={styles.modalUserName}>
                    {selectedApplication.name}
                  </Text>
                  <View
                    style={[
                      styles.largeStatusBadge,
                      {
                        backgroundColor: getStatusBgColor(
                          selectedApplication.status,
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.largeStatusText,
                        {
                          color: getStatusColor(selectedApplication.status),
                        },
                      ]}
                    >
                      {selectedApplication.status === 'pending'
                        ? '⏳ Pending Review'
                        : selectedApplication.status === 'approved'
                        ? '✓ Approved'
                        : '✕ Rejected'}
                    </Text>
                  </View>
                </View>

                {/* Resubmission Banner */}
                {selectedApplication.documentStatus &&
                  Object.keys(selectedApplication.documentStatus).length >
                    0 && (
                    <View style={styles.resubmissionBanner}>
                      <Text style={styles.resubmissionBannerText}>
                        🔄 REENVÍO DE DOCUMENTOS
                      </Text>
                      <Text style={styles.resubmissionBannerSubtext}>
                        Solo revisa los documentos marcados como "Pendiente"
                      </Text>
                    </View>
                  )}

                {/* Personal Information */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <DetailRow label="Email" value={selectedApplication.email} />
                  <DetailRow label="Phone" value={selectedApplication.phone} />
                  <DetailRow
                    label="Application Date"
                    value={selectedApplication.applicationDate}
                  />
                </View>

                {/* License Information */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>License Information</Text>
                  <DetailRow
                    label="License Number"
                    value={selectedApplication.licenseNumber}
                  />
                  <DetailRow
                    label="Expiry Date"
                    value={selectedApplication.licenseExpiryDate}
                  />
                </View>

                {/* Vehicle Information */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Vehicle Information</Text>
                  <DetailRow
                    label="Vehicle Type"
                    value={selectedApplication.vehicleType}
                  />
                  <DetailRow
                    label="License Plate"
                    value={selectedApplication.vehiclePlate}
                  />
                  <DetailRow
                    label="Year"
                    value={selectedApplication.vehicleYear.toString()}
                  />
                </View>

                {/* Documents Section */}
                {selectedApplication.currentRequest && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>
                      Documentos (v
                      {selectedApplication.currentRequest.version})
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.documentsScroll}
                    >
                      {/* Renderizar TODOS los 10 documentos posibles dinámicamente */}
                      {[
                        { key: 'profilePhoto', label: 'Foto Perfil' },
                        { key: 'ciFront', label: 'CI Frente' },
                        { key: 'ciBack', label: 'CI Dorso' },
                        { key: 'antecedentsPhoto', label: 'Antecedentes' },
                        { key: 'carFront', label: 'Auto Frente' },
                        { key: 'carBack', label: 'Auto Dorso' },
                        { key: 'carLeft', label: 'Auto Izquierda' },
                        { key: 'carRight', label: 'Auto Derecha' },
                        { key: 'soatPhoto', label: 'SOAT' },
                        { key: 'ruatPhoto', label: 'RUAT' },
                      ].map(doc => {
                        const fileData =
                          selectedApplication.currentRequest?.files?.[doc.key];
                        const docPath = fileData
                          ? fileData.url ||
                            `http://192.168.100.133:3000/uploads/drivers/${fileData.filename}`
                          : undefined;

                        return renderDocumentButton(
                          docPath,
                          doc.label,
                          doc.key,
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Documento Status Summary */}
                {Object.keys(documentApprovalStatus).length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>
                      Resumen de Documentos
                    </Text>
                    {getApprovedAndRejectedDocs().approved.length > 0 && (
                      <View style={styles.documentStatusBox}>
                        <Text
                          style={[styles.statusLabel, { color: '#10B981' }]}
                        >
                          ✓ Documentos Aprobados
                        </Text>
                        {getApprovedAndRejectedDocs().approved.map(
                          (doc, idx) => (
                            <Text key={idx} style={styles.documentStatusItem}>
                              • {doc}
                            </Text>
                          ),
                        )}
                      </View>
                    )}
                    {getApprovedAndRejectedDocs().rejected.length > 0 && (
                      <View style={styles.documentStatusBox}>
                        <Text
                          style={[styles.statusLabel, { color: '#EF4444' }]}
                        >
                          ✗ Documentos Rechazados (Deben ser reenviados)
                        </Text>
                        {getApprovedAndRejectedDocs().rejected.map(
                          (doc, idx) => (
                            <Text
                              key={idx}
                              style={[
                                styles.documentStatusItem,
                                { color: '#EF4444' },
                              ]}
                            >
                              • {doc}
                            </Text>
                          ),
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Notas de Verificación */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Notas de Verificación</Text>
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>
                      {selectedApplication.verificationNotes}
                    </Text>
                  </View>
                </View>

                {/* Motivo de Rechazo (si fue rechazado) */}
                {selectedApplication.status === 'rejected' &&
                  selectedApplication.rejectionReason && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>Motivo de Rechazo</Text>
                      <View style={styles.rejectionBox}>
                        <Text style={styles.rejectionText}>
                          {selectedApplication.rejectionReason}
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Action Buttons */}
                {selectedApplication.status === 'pending' && (
                  <View style={styles.actionsSection}>
                    <TouchableOpacity
                      style={[
                        styles.approveButton,
                        isSubmitting && styles.buttonDisabled,
                      ]}
                      onPress={handleApproveDriver}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.actionButtonText}>
                          ✓ Approve Driver
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.rejectButton,
                        isSubmitting && styles.buttonDisabled,
                      ]}
                      onPress={() => setRejectionModalVisible(true)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.actionButtonText}>
                        ✕ Reject Driver
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectionModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.rejectionModalContainer}>
          <View style={styles.rejectionModalContent}>
            <Text style={styles.rejectionModalTitle}>Rejection Reason</Text>
            <TextInput
              style={styles.rejectionInput}
              placeholder="Explain why you're rejecting this application..."
              placeholderTextColor="#999"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={styles.rejectionButtonsRow}>
              <TouchableOpacity
                style={styles.rejectionCancelButton}
                onPress={() => {
                  setRejectionReason('');
                  setRejectionModalVisible(false);
                }}
              >
                <Text style={styles.rejectionCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectionConfirmButton}
                onPress={handleRejectDriver}
              >
                <Text style={styles.rejectionConfirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Image Modal */}
      <Modal
        visible={documentImageModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.documentImageModalContainer}>
          <TouchableOpacity
            style={styles.documentImageModalBackdrop}
            onPress={() => setDocumentImageModalVisible(false)}
          />
          <View style={styles.documentImageModalContent}>
            {selectedDocumentImage && (
              <Image
                key={selectedDocumentImage}
                source={{ uri: selectedDocumentImage }}
                style={styles.documentImageLarge}
              />
            )}
            <View style={styles.documentImageButtonsRow}>
              <TouchableOpacity
                style={[styles.documentImageButton, styles.rejectImageButton]}
                onPress={() => {
                  if (currentDocumentKey) {
                    setDocumentApprovalStatus(prev => ({
                      ...prev,
                      [currentDocumentKey]: 'rejected',
                    }));
                    setDocumentImageModalVisible(false);
                    setCurrentDocumentKey(null);
                  }
                }}
              >
                <Text style={styles.documentImageButtonText}>✗ Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.documentImageButton, styles.approveImageButton]}
                onPress={() => {
                  if (currentDocumentKey) {
                    setDocumentApprovalStatus(prev => ({
                      ...prev,
                      [currentDocumentKey]: 'approved',
                    }));
                    setDocumentImageModalVisible(false);
                    setCurrentDocumentKey(null);
                  }
                }}
              >
                <Text style={styles.documentImageButtonText}>✓ Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.documentImageButton, styles.closeImageButton]}
                onPress={() => {
                  setDocumentImageModalVisible(false);
                  setCurrentDocumentKey(null);
                }}
              >
                <Text style={styles.documentImageButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerEmpty: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  resultCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoAndInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  photoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  appEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  appMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  appMetaText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  verificationRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  verificationCheck: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  verificationCheckPassed: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  verificationCheckText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySpace: {
    width: 28,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  largeStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  largeStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  verificationStatusRow: {
    gap: 10,
  },
  verificationStatusItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  verificationStatusItemPassed: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
  },
  verificationStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  notesBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
  },
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionText: {
    fontSize: 13,
    color: '#7F1D1D',
    fontWeight: '600',
    lineHeight: 20,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  approveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectionModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '85%',
  },
  rejectionModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  rejectionInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    maxHeight: 120,
  },
  rejectionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectionCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  rejectionCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  rejectionConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  rejectionConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 6,
  },
  errorText: {
    color: '#7F1D1D',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  documentsScroll: {
    marginVertical: 10,
  },
  documentItem: {
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  documentImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  documentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 120,
  },
  documentButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  documentStatusBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  documentStatusItem: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 18,
  },
  documentImageModalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentImageModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  documentImageModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxWidth: 350,
    alignItems: 'center',
    zIndex: 1,
  },
  documentImageLarge: {
    width: 300,
    height: 400,
    borderRadius: 8,
  },
  documentImageButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  documentImageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectImageButton: {
    backgroundColor: '#EF4444',
  },
  approveImageButton: {
    backgroundColor: '#10B981',
  },
  closeImageButton: {
    backgroundColor: '#6B7280',
  },
  documentImageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resubmissionBanner: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 6,
  },
  resubmissionBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  resubmissionBannerSubtext: {
    fontSize: 12,
    color: '#B45309',
  },
});

export default AdminDriverRegistrationScreen;
