import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  MessageCircle,
  Mail,
  Phone,
  ChevronRight,
  Send,
  FileText,
  AlertCircle,
  CheckCircle,
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
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
};

interface TicketProps {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  date: string;
}

const SupportScreen: React.FC = () => {
  const navigation = useNavigation();

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [tickets, setTickets] = useState<TicketProps[]>([
    { id: '1', subject: 'Problema con el pago', status: 'resolved', date: '15/04/2024' },
    { id: '2', subject: 'No arrives a mi destino', status: 'open', date: '18/04/2024' },
  ]);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sending, setSending] = useState(false);

  const categories = [
    { label: 'Viaje', value: 'ride' },
    { label: 'Pago', value: 'payment' },
    { label: 'Conductor', value: 'driver' },
    { label: 'App', value: 'app' },
    { label: 'Otro', value: 'other' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return COLORS.warning;
      case 'in_progress': return COLORS.primary;
      case 'resolved': return COLORS.success;
      case 'closed': return COLORS.textTertiary;
      default: return COLORS.textTertiary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En proceso';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const handleSubmitTicket = () => {
    if (!subject.trim() || !description.trim() || !category) {
      Alert.alert('Faltan datos', 'Por favor completa todos los campos');
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setShowNewTicket(false);
      setSubject('');
      setDescription('');
      setCategory('');
      Alert.alert('Enviado', 'Tu ticket de soporte ha sido enviado. Te contactaremos pronto.');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <X size={24} color={COLORS.primary} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Opciones de contacto rápido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACTO RÁPIDO</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
              <MessageCircle size={25} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
              <Mail size={25} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Correo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction} 
              activeOpacity={0.7}
              onPress={() => Alert.alert('Llamada', 'Llamando al centro de soporte...')}
            >
              <Phone size={25} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Llamar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tickets recientes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MIS TICKETS</Text>
            <TouchableOpacity onPress={() => setShowNewTicket(true)}>
              <Text style={styles.newTicketBtn}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
          
          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No tienes tickets de soporte</Text>
              <Text style={styles.emptySubtext}>Crea uno nuevo si necesitas ayuda</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {tickets.map((ticket, index) => (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.ticketContent}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                      <View style={[styles.ticketStatus, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                        <Text style={[styles.ticketStatusText, { color: getStatusColor(ticket.status) }]}>
                          {getStatusLabel(ticket.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ticketDate}>{ticket.date}</Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Formulario de nuevo ticket */}
        {showNewTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NUEVO TICKET</Text>
            <View style={styles.card}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Categoría</Text>
                <View style={styles.categoryOptions}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.categoryBtn, category === cat.value && styles.categoryBtnActive]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Text style={[styles.categoryBtnText, category === cat.value && styles.categoryBtnTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Asunto</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Describe brevemente tu problema"
                  placeholderTextColor={COLORS.textTertiary}
                />
              </View>

              <View style={[styles.formGroup, { borderBottomWidth: 0 }]}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Explica con detalle tu problema..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowNewTicket(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmitTicket}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Send size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Enviar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
  backButton: {
    fontSize: 18,
    color: COLORS.primary,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  newTicketBtn: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  ticketContent: {
    flex: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  ticketStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ticketDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  formGroup: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  categoryBtnTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  formActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default SupportScreen;