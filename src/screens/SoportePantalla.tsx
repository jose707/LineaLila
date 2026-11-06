import React, { useState as usarEstado } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  TextInput as TextoEntrada,
  Alert,
  ActivityIndicator as ActividadIndicador } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion } from '@react-navigation/native';
import {
  MessageCircle as MensajeCircle,
  Mail,
  Phone as Telefono,
  ChevronRight as ChevronDerecha,
  Send as Enviar,
  FileText as ArchivoTexto,
  AlertCircle,
  CheckCircle as ComprobarCircle,
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
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706'
};

interface ComprobantePropiedades {
  id: string;
  subject: string;
  status: 'abierto' | 'en_curso' | 'resuelto' | 'closed';
  date: string;
}

const SoportePantalla: React.FC = () => {
  const navegacion = usarNavegacion();

  const [mostrarNuevoComprobante, establecerMostrarNuevoComprobante] = usarEstado(false);
  const [tickets, establecerTickets] = usarEstado<ComprobantePropiedades[]>([
  { id: '1', subject: 'Problema con el pago', status: 'resuelto', date: '15/04/2024' },
  { id: '2', subject: 'No arrives a mi destino', status: 'abierto', date: '18/04/2024' }]
  );

  const [subject, establecerSubject] = usarEstado('');
  const [descripcion, establecerDescripcion] = usarEstado('');
  const [categoria, establecerCategoria] = usarEstado('');
  const [enviando, establecerEnviando] = usarEstado(false);

  const categorias = [
  { label: 'Viaje', value: 'ride' },
  { label: 'Pago', value: 'pago' },
  { label: 'Conductor', value: 'conductor' },
  { label: 'App', value: 'app' },
  { label: 'Otro', value: 'other' }];


  const obtenerEstadoColor = (estado: string) => {
    switch (estado) {
      case 'abierto':return Colores.warning;
      case 'en_curso':return Colores.primary;
      case 'resuelto':return Colores.success;
      case 'closed':return Colores.textTertiary;
      default:return Colores.textTertiary;
    }
  };

  const obtenerEstadoEtiqueta = (estado: string) => {
    switch (estado) {
      case 'abierto':return 'Abierto';
      case 'en_curso':return 'En proceso';
      case 'resuelto':return 'Resuelto';
      case 'closed':return 'Cerrado';
      default:return estado;
    }
  };

  const manejarEnviarComprobante = () => {
    if (!subject.trim() || !descripcion.trim() || !categoria) {
      Alert.alert('Faltan datos', 'Por favor completa todos los campos');
      return;
    }

    establecerEnviando(true);
    setTimeout(() => {
      establecerEnviando(false);
      establecerMostrarNuevoComprobante(false);
      establecerSubject('');
      establecerDescripcion('');
      establecerCategoria('');
      Alert.alert('Enviado', 'Tu ticket de soporte ha sido enviado. Te contactaremos pronto.');
    }, 1500);
  };

  return (
    <SeguraZonaVista style={estilos.container}>
      <Vista style={estilos.header}>
        <PulsableOpacidad style={estilos.backBtn} onPress={() => navegacion.goBack()}>
          <X size={24} color={Colores.primary} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={estilos.headerTitle}>Soporte</Texto>
        <Vista style={{ width: 40 }} />
      </Vista>

      <DesplazableVista style={estilos.scrollView} showsVerticalScrollIndicator={false}>
        {/* Opciones de contacto rápido */}
        <Vista style={estilos.section}>
          <Texto style={estilos.sectionTitle}>CONTACTO RÁPIDO</Texto>
          <Vista style={estilos.quickActions}>
            <PulsableOpacidad style={estilos.quickAction} activeOpacity={0.7}>
              <MensajeCircle size={25} color={Colores.primary} />
              <Texto style={estilos.quickActionText}>Chat</Texto>
            </PulsableOpacidad>
            <PulsableOpacidad style={estilos.quickAction} activeOpacity={0.7}>
              <Mail size={25} color={Colores.primary} />
              <Texto style={estilos.quickActionText}>Correo</Texto>
            </PulsableOpacidad>
            <PulsableOpacidad
              style={estilos.quickAction}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Llamada', 'Llamando al centro de soporte...')}>

              <Telefono size={25} color={Colores.primary} />
              <Texto style={estilos.quickActionText}>Llamar</Texto>
            </PulsableOpacidad>
          </Vista>
        </Vista>

        {/* Tickets recientes */}
        <Vista style={estilos.section}>
          <Vista style={estilos.sectionHeader}>
            <Texto style={estilos.sectionTitle}>MIS TICKETS</Texto>
            <PulsableOpacidad onPress={() => establecerMostrarNuevoComprobante(true)}>
              <Texto style={estilos.newTicketBtn}>+ Nuevo</Texto>
            </PulsableOpacidad>
          </Vista>

          {tickets.length === 0 ?
          <Vista style={estilos.emptyState}>
              <ArchivoTexto size={48} color={Colores.textTertiary} />
              <Texto style={estilos.emptyText}>No tienes tickets de soporte</Texto>
              <Texto style={estilos.emptySubtext}>Crea uno nuevo si necesitas ayuda</Texto>
            </Vista> :

          <Vista style={estilos.card}>
              {tickets.map((comprobante, indice) =>
            <PulsableOpacidad
              key={comprobante.id}
              style={estilos.ticketItem}
              activeOpacity={0.7}>

                  <Vista style={estilos.ticketContent}>
                    <Vista style={estilos.ticketHeader}>
                      <Texto style={estilos.ticketSubject}>{comprobante.subject}</Texto>
                      <Vista style={[estilos.ticketStatus, { backgroundColor: obtenerEstadoColor(comprobante.status) + '20' }]}>
                        <Texto style={[estilos.ticketStatusText, { color: obtenerEstadoColor(comprobante.status) }]}>
                          {obtenerEstadoEtiqueta(comprobante.status)}
                        </Texto>
                      </Vista>
                    </Vista>
                    <Texto style={estilos.ticketDate}>{comprobante.date}</Texto>
                  </Vista>
                  <ChevronDerecha size={20} color={Colores.textTertiary} />
                </PulsableOpacidad>
            )}
            </Vista>
          }
        </Vista>

        {/* Formulario de nuevo ticket */}
        {mostrarNuevoComprobante &&
        <Vista style={estilos.section}>
            <Texto style={estilos.sectionTitle}>NUEVO TICKET</Texto>
            <Vista style={estilos.card}>
              <Vista style={estilos.formGroup}>
                <Texto style={estilos.inputLabel}>Categoría</Texto>
                <Vista style={estilos.categoryOptions}>
                  {categorias.map((cat) =>
                <PulsableOpacidad
                  key={cat.value}
                  style={[estilos.categoryBtn, categoria === cat.value && estilos.categoryBtnActive]}
                  onPress={() => establecerCategoria(cat.value)}>

                      <Texto style={[estilos.categoryBtnText, categoria === cat.value && estilos.categoryBtnTextActive]}>
                        {cat.label}
                      </Texto>
                    </PulsableOpacidad>
                )}
                </Vista>
              </Vista>

              <Vista style={estilos.formGroup}>
                <Texto style={estilos.inputLabel}>Asunto</Texto>
                <TextoEntrada
                style={estilos.input}
                value={subject}
                onChangeText={establecerSubject}
                placeholder="Describe brevemente tu problema"
                placeholderTextColor={Colores.textTertiary} />

              </Vista>

              <Vista style={[estilos.formGroup, { borderBottomWidth: 0 }]}>
                <Texto style={estilos.inputLabel}>Descripción</Texto>
                <TextoEntrada
                style={[estilos.input, estilos.textArea]}
                value={descripcion}
                onChangeText={establecerDescripcion}
                placeholder="Explica con detalle tu problema..."
                placeholderTextColor={Colores.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top" />

              </Vista>

              <Vista style={estilos.formActions}>
                <PulsableOpacidad
                style={estilos.cancelBtn}
                onPress={() => establecerMostrarNuevoComprobante(false)}>

                  <Texto style={estilos.cancelBtnText}>Cancelar</Texto>
                </PulsableOpacidad>
                <PulsableOpacidad
                style={estilos.submitBtn}
                onPress={manejarEnviarComprobante}
                disabled={enviando}>

                  {enviando ?
                <ActividadIndicador size="small" color="#FFF" /> :

                <>
                      <Enviar size={18} color="#FFF" />
                      <Texto style={estilos.submitBtnText}>Enviar</Texto>
                    </>
                }
                </PulsableOpacidad>
              </Vista>
            </Vista>
          </Vista>
        }
      </DesplazableVista>
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
  backButton: {
    fontSize: 18,
    color: Colores.primary
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  newTicketBtn: {
    fontSize: 14,
    color: Colores.primary,
    fontWeight: '600'
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colores.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colores.text
  },
  card: {
    backgroundColor: Colores.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colores.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colores.text,
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 13,
    color: Colores.textSecondary,
    marginTop: 4
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  ticketContent: {
    flex: 1
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: Colores.text,
    flex: 1
  },
  ticketStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  ticketDate: {
    fontSize: 12,
    color: Colores.textTertiary
  },
  formGroup: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colores.border
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colores.background,
    borderWidth: 1,
    borderColor: Colores.border
  },
  categoryBtnActive: {
    backgroundColor: Colores.primary,
    borderColor: Colores.primary
  },
  categoryBtnText: {
    fontSize: 13,
    color: Colores.textSecondary
  },
  categoryBtnTextActive: {
    color: '#FFF',
    fontWeight: '600'
  },
  input: {
    backgroundColor: Colores.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colores.text
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12
  },
  formActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colores.background,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colores.textSecondary
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colores.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF'
  }
});

export default SoportePantalla;
