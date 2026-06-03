import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  HelpCircle,
  ChevronRight,
  Phone,
  Mail,
  MessageCircle,
  Book,
  Shield,
  Car,
  CreditCard,
  User,
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
};

interface HelpCategoryProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
}

const HelpCategory: React.FC<HelpCategoryProps> = ({
  icon,
  title,
  description,
  onPress,
}) => (
  <TouchableOpacity style={styles.categoryItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.categoryIcon}>{icon}</View>
    <View style={styles.categoryContent}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <Text style={styles.categoryDescription}>{description}</Text>
    </View>
    <ChevronRight size={20} color={COLORS.textTertiary} />
  </TouchableOpacity>
);

const HelpScreen: React.FC = () => {
  const navigation = useNavigation();

  const categories = [
    {
      icon: <Book size={25} color={COLORS.primary} />,
      title: 'Preguntas frecuentes',
      description: 'Respuestas a las dudas más comunes',
      action: () => Alert.alert('FAQ', 'Pantalla en desarrollo'),
    },
    {
      icon: <User size={25} color={COLORS.primary} />,
      title: 'Cuenta y perfil',
      description: 'Gestiona tu cuenta y datos personales',
      action: () => Alert.alert('Cuenta', 'Pantalla en desarrollo'),
    },
    {
      icon: <Car size={25} color={COLORS.primary} />,
      title: 'Viajes',
      description: 'Cómo solicitar, cancelar o reportar problemas',
      action: () => Alert.alert('Viajes', 'Pantalla en desarrollo'),
    },
    {
      icon: <CreditCard size={25} color={COLORS.primary} />,
      title: 'Pagos y precios',
      description: 'Métodos de pago, promociones y facturas',
      action: () => Alert.alert('Pagos', 'Pantalla en desarrollo'),
    },
    {
      icon: <Shield size={25} color={COLORS.primary} />,
      title: 'Seguridad',
      description: 'Cómo mantenemos tus viajes seguros',
      action: () => Alert.alert('Seguridad', 'Pantalla en desarrollo'),
    },
  ];

  const contactOptions = [
    {
      icon: <Phone size={25} color={COLORS.primary} />,
      title: 'Llamar al soporte',
      subtitle: 'Lun - Vie, 8am - 8pm',
      action: () => Linking.openURL('tel:+59170000001'),
    },
    {
      icon: <Mail size={25} color={COLORS.primary} />,
      title: 'Enviar correo',
      subtitle: 'soporte@linealila.com',
      action: () => Linking.openURL('mailto:soporte@linealila.com'),
    },
    {
      icon: <MessageCircle size={25} color={COLORS.primary} />,
      title: 'Chat en vivo',
      subtitle: 'Respuesta inmediata',
      action: () => Alert.alert('Chat', 'Pantalla en desarrollo'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <X size={24} color={COLORS.primary} strokeWidth={2.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayuda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Categorías de ayuda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEMAS DE AYUDA</Text>
          <View style={styles.card}>
            {categories.map((category, index) => (
              <HelpCategory
                key={index}
                icon={category.icon}
                title={category.title}
                description={category.description}
                onPress={category.action}
              />
            ))}
          </View>
        </View>

        {/* Opciones de contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACTO</Text>
          <View style={styles.card}>
            {contactOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactItem}
                onPress={option.action}
                activeOpacity={0.7}
              >
                <View style={styles.contactIcon}>{option.icon}</View>
                <View style={styles.contactContent}>
                  <Text style={styles.contactTitle}>{option.title}</Text>
                  <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
                </View>
                <ChevronRight size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <HelpCircle size={32} color={COLORS.primary} />
            <Text style={styles.infoTitle}>¿Necesitas más ayuda?</Text>
            <Text style={styles.infoText}>
              Nuestro equipo de soporte está disponible 24/7 para ayudarte con cualquier situación.
            </Text>
          </View>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  categoryIcon: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  contactIcon: {
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  contactSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HelpScreen;