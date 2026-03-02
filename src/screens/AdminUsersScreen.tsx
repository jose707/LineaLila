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
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as AdminService from '../services/admin.service';

type AdminUsersScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminUsers'
>;

interface AdminUsersScreenProps {
  navigation: AdminUsersScreenNavigationProp;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  createdAt?: string;
  rating?: number;
}

const AdminUsersScreen: React.FC<AdminUsersScreenProps> = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin'>(
    'all',
  );
  const [showInactive, setShowInactive] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [showInactive]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('AdminUsersScreen focused, reloading users');
      loadUsers();
    }, [showInactive]),
  );

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AdminService.getAllUsers(
        100,
        0,
        undefined,
        undefined,
        showInactive,
      );
      if (response && response.data && response.data.length > 0) {
        // Map backend user data
        const mappedUsers = response.data.map((user: any) => ({
          id: user.id,
          name: user.name || 'Unknown',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'user',
          status: 'active',
          createdAt: user.createdAt,
          rating: user.rating || 0,
        }));
        setUsers(mappedUsers);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    Alert.alert(
      'Desactivar Usuario',
      `¿Estás seguro de que deseas desactivar a ${selectedUser.name}? El usuario no podrá acceder a la aplicación.`,
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Desactivar',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await AdminService.deleteUser(selectedUser.id);

              // Remove from local state
              setUsers(users.filter(u => u.id !== selectedUser.id));

              Alert.alert('Éxito', `${selectedUser.name} ha sido desactivado.`);
              setModalVisible(false);
              setSelectedUser(null);
            } catch (err: any) {
              const errorMessage =
                err?.message || 'Error al desactivar usuario';
              Alert.alert('Error', errorMessage);
              setError(errorMessage);
            } finally {
              setIsSubmitting(false);
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleEnableUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await AdminService.enableUser(selectedUser.id);

      // Remove from local state
      setUsers(users.filter(u => u.id !== selectedUser.id));

      Alert.alert('Éxito', `${selectedUser.name} ha sido habilitado.`);
      setModalVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al habilitar usuario';
      Alert.alert('Error', errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'suspended':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#ECFDF5';
      case 'pending':
        return '#FFFBEB';
      case 'suspended':
        return '#FEF2F2';
      default:
        return '#F3F4F6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerEmpty} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Role Filter */}
            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedRole === 'all' && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedRole('all')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedRole === 'all' && styles.filterTextActive,
                  ]}
                >
                  All Roles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedRole === 'user' && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedRole('user')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedRole === 'user' && styles.filterTextActive,
                  ]}
                >
                  Users
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedRole === 'admin' && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedRole('admin')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedRole === 'admin' && styles.filterTextActive,
                  ]}
                >
                  Admins
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inactive Filter */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                showInactive && styles.filterButtonActive,
              ]}
              onPress={() => setShowInactive(!showInactive)}
            >
              <Text
                style={[
                  styles.filterText,
                  showInactive && styles.filterTextActive,
                ]}
              >
                {showInactive ? 'Inactive Users' : 'Active Users'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Users List */}
        <View style={styles.listSection}>
          <Text style={styles.resultCount}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}{' '}
            found
          </Text>
          {filteredUsers.map(user => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => {
                setSelectedUser(user);
                setModalVisible(true);
              }}
            >
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <Text style={styles.userRole}>
                      {user.role === 'admin' ? '👨‍💼 Admin' : '👤 User'}
                    </Text>
                    {user.rating && user.rating > 0 && (
                      <Text style={styles.userRating}>⭐ {user.rating}</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>User Details</Text>
                <Text style={styles.emptySpace} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Avatar Section */}
                <View style={styles.modalAvatarSection}>
                  <View style={styles.largeAvatar}>
                    <Text style={styles.largeAvatarText}>
                      {selectedUser.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                </View>

                {/* Details */}
                <View style={styles.detailsSection}>
                  <DetailRow label="Email" value={selectedUser.email} />
                  <DetailRow label="Phone" value={selectedUser.phone} />
                  <DetailRow
                    label="Role"
                    value={selectedUser.role === 'admin' ? 'Admin' : 'User'}
                  />
                  <DetailRow
                    label="Join Date"
                    value={
                      selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleDateString()
                        : 'N/A'
                    }
                  />
                  {selectedUser.rating && selectedUser.rating > 0 && (
                    <DetailRow
                      label="Rating"
                      value={`⭐ ${selectedUser.rating} / 5.0`}
                    />
                  )}
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                  {!showInactive ? (
                    <TouchableOpacity
                      style={[
                        styles.actionButtonDanger,
                        isSubmitting && styles.buttonDisabled,
                      ]}
                      onPress={handleDeleteUser}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.actionButtonText}>
                        {isSubmitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          '⊘ Disable User'
                        )}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.actionButtonPrimary,
                        isSubmitting && styles.buttonDisabled,
                      ]}
                      onPress={handleEnableUser}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.actionButtonText}>
                        {isSubmitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          '✓ Enable User'
                        )}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    marginBottom: 12,
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  userRole: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '500',
  },
  userRating: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySpace: {
    width: 28,
  },
  modalBody: {
    padding: 16,
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 20,
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
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  actionsSection: {
    gap: 10,
    marginBottom: 20,
  },
  actionButtonPrimary: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AdminUsersScreen;
