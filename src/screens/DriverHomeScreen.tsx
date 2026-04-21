import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';

const { width } = Dimensions.get('window');

type DriverHomeScreenNavigationProp = NativeStackNavigationProp<
  any,
  'DriverHome'
>;

const COLORS = {
  primary: '#7514C5',
  primaryLight: '#9B45E4',
  primaryUltraLight: '#F3E8FF',
  primaryMuted: '#EDE0FA',
  black: '#0A0A0A',
  gray900: '#1A1A1A',
  gray600: '#6B6B6B',
  gray400: '#A0A0A0',
  gray200: '#E8E8E8',
  gray100: '#F7F7F7',
  white: '#FFFFFF',
  gold: '#F59E0B',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

interface DriverStats {
  isAvailable: boolean;
  totalEarnings: number;
  totalTrips: number;
  averageRating: number;
  completedToday: number;
}

// ── Minimal geometric icons (no emojis) ──────────────────────────────────────

const IconTrips = ({ color = COLORS.primary, size = 20 }) => (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: 'space-between',
      paddingVertical: 2,
    }}
  >
    {[1, 0.75, 0.5].map((w, i) => (
      <View
        key={i}
        style={{
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          width: size * w,
        }}
      />
    ))}
  </View>
);

const IconProfile = ({ color = COLORS.primary, size = 20 }) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'flex-end',
    }}
  >
    <View
      style={{
        width: size * 0.42,
        height: size * 0.42,
        borderRadius: size * 0.21,
        backgroundColor: color,
        marginBottom: 2,
      }}
    />
    <View
      style={{
        width: size,
        height: size * 0.35,
        borderTopLeftRadius: size * 0.5,
        borderTopRightRadius: size * 0.5,
        backgroundColor: color,
      }}
    />
  </View>
);

const IconSettings = ({ color = COLORS.primary, size = 20 }) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <View
      style={{
        width: size * 0.5,
        height: size * 0.5,
        borderRadius: size * 0.25,
        borderWidth: 2.5,
        borderColor: color,
      }}
    />
    {[0, 45, 90, 135].map(deg => (
      <View
        key={deg}
        style={{
          position: 'absolute',
          width: 2.5,
          height: size * 0.22,
          borderRadius: 2,
          backgroundColor: color,
          top: size * 0.04,
          transform: [{ rotate: `${deg}deg` }, { translateY: size * 0.28 }],
        }}
      />
    ))}
  </View>
);

const IconSupport = ({ color = COLORS.primary, size = 20 }) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.5,
        borderWidth: 2.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.52,
          fontWeight: '900',
          color,
          lineHeight: size * 0.65,
        }}
      >
        ?
      </Text>
    </View>
  </View>
);

const IconArrow = ({ color = COLORS.danger, size = 16 }) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text
      style={{
        fontSize: size + 2,
        fontWeight: '700',
        color,
        lineHeight: size + 4,
      }}
    >
      →
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────

const DriverHomeScreen = () => {
  const navigation = useNavigation<DriverHomeScreenNavigationProp>();
  const { logout } = useAuth();

  const [stats, setStats] = useState<DriverStats>({
    isAvailable: false,
    totalEarnings: 0,
    totalTrips: 0,
    averageRating: 5.0,
    completedToday: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    loadDriverStats();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {}
        },
        style: 'destructive',
      },
    ]);
  };

  const loadDriverStats = async () => {
    setIsLoadingStats(true);
    try {
      // TODO: reemplazar con llamada real a la API de estadísticas del conductor
      // Por ahora se mantiene el estado inicial con rating 5.0 por defecto
      setStats(prev => ({
        ...prev,
        averageRating: prev.averageRating,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      const next = !stats.isAvailable;
      setStats(prev => ({ ...prev, isAvailable: next }));
      if (next)
        setTimeout(
          () => navigation.navigate('DriverRideRequest' as never),
          500,
        );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la disponibilidad');
    }
  };

  const quickActions = [
    {
      Icon: IconTrips,
      label: 'Mis viajes',
      sub: 'Historial',
      onPress: () => navigation.navigate('RideHistory' as never),
    },
    {
      Icon: IconProfile,
      label: 'Mi perfil',
      sub: 'Cuenta',
      onPress: () => navigation.navigate('Profile' as never),
    },
    { Icon: IconSettings, label: 'Ajustes', sub: 'Config.', onPress: () => {} },
    { Icon: IconSupport, label: 'Soporte', sub: 'Ayuda', onPress: () => {} },
  ];

  const cardW = (width - 32 - 10) / 2;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* ── AVAILABILITY CARD ── */}
        <View style={[s.availCard, stats.isAvailable && s.availCardActive]}>
          <View
            style={[s.availDecor, stats.isAvailable && s.availDecorActive]}
          />

          <View style={s.availTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.availEyebrow}>ESTADO ACTUAL</Text>
              <Text
                style={[s.availTitle, stats.isAvailable && s.availTitleActive]}
              >
                {stats.isAvailable ? 'En servicio' : 'Fuera de\nservicio'}
              </Text>
            </View>
            <View
              style={[
                s.statusPill,
                stats.isAvailable ? s.pillActive : s.pillInactive,
              ]}
            >
              <View
                style={[
                  s.statusDot,
                  stats.isAvailable ? s.dotActive : s.dotInactive,
                ]}
              />
              <Text
                style={[
                  s.statusPillText,
                  stats.isAvailable ? s.pillTextActive : s.pillTextInactive,
                ]}
              >
                {stats.isAvailable ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>

          <Text style={s.availDesc}>
            {stats.isAvailable
              ? 'Estás recibiendo solicitudes de viaje en tu zona.'
              : 'Activa el servicio para comenzar a recibir solicitudes.'}
          </Text>

          <TouchableOpacity
            style={[
              s.toggleBtn,
              stats.isAvailable ? s.toggleBtnOff : s.toggleBtnOn,
            ]}
            onPress={toggleAvailability}
            activeOpacity={0.85}
          >
            <Text
              style={[
                s.toggleBtnText,
                stats.isAvailable ? s.toggleBtnTextOff : s.toggleBtnTextOn,
              ]}
            >
              {stats.isAvailable ? 'Salir de servicio' : 'Ir a servicio'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── STATS ── */}
        <Text style={s.sectionLabel}>RESUMEN</Text>
        <View style={s.statsGrid}>
          {/* Earnings – full width */}
          <View style={[s.statCard, s.statCardWide]}>
            <View style={s.statCardRow}>
              <View>
                <Text style={s.statEyebrow}>Ganancias totales</Text>
                <Text style={s.statValueLarge}>
                  Bs. {stats.totalEarnings.toFixed(0)}
                </Text>
              </View>
              <View style={s.statBadge}>
                <Text style={s.statBadgeText}>↑ Este mes</Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: '72%' }]} />
            </View>
          </View>

          {/* Trips */}
          <View style={[s.statCard, { width: cardW }]}>
            <Text style={s.statEyebrow}>Viajes totales</Text>
            <Text style={s.statValueMed}>{stats.totalTrips}</Text>
            <View style={s.statDivider} />
            <Text style={s.statFootnote}>
              {stats.completedToday} completados hoy
            </Text>
          </View>

          {/* Rating */}
          <View style={[s.statCard, { width: cardW }]}>
            <Text style={s.statEyebrow}>Calificación</Text>
            <Text style={[s.statValueMed, { color: COLORS.gold }]}>
              {stats.averageRating.toFixed(1)}
            </Text>
            <View style={s.miniStars}>
              {[1, 2, 3, 4, 5].map(i => (
                <View
                  key={i}
                  style={[
                    s.miniStar,
                    {
                      backgroundColor:
                        i <= Math.round(stats.averageRating)
                          ? COLORS.gold
                          : COLORS.gray200,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={s.statFootnote}>Promedio general</Text>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <Text style={s.sectionLabel}>ACCIONES RÁPIDAS</Text>
        <View style={s.actionsGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[s.actionCard, { width: cardW }]}
              onPress={action.onPress}
              activeOpacity={0.72}
            >
              <View style={s.actionIconWrap}>
                <action.Icon color={COLORS.primary} size={20} />
              </View>
              <Text style={s.actionLabel}>{action.label}</Text>
              <Text style={s.actionSub}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray100 },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 11,
    color: COLORS.gray400,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDanger: { backgroundColor: COLORS.dangerLight },

  // SCROLL
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // EYEBROW / SECTION LABEL
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },

  // AVAILABILITY CARD
  availCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    overflow: 'hidden',
  },
  availCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  availDecor: {
    position: 'absolute',
    right: -28,
    top: -28,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray100,
  },
  availDecorActive: { backgroundColor: 'rgba(117,20,197,0.1)' },
  availTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  availEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 2,
    marginBottom: 6,
  },
  availTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  availTitleActive: { color: COLORS.primary },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 50,
  },
  pillActive: { backgroundColor: COLORS.successLight },
  pillInactive: { backgroundColor: COLORS.gray200 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: COLORS.success },
  dotInactive: { backgroundColor: COLORS.gray400 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  pillTextActive: { color: COLORS.success },
  pillTextInactive: { color: COLORS.gray600 },
  availDesc: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 20,
    lineHeight: 20,
  },
  toggleBtn: {
    paddingVertical: 15,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: { backgroundColor: COLORS.primary },
  toggleBtnOff: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
  },
  toggleBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  toggleBtnTextOn: { color: COLORS.white },
  toggleBtnTextOff: { color: COLORS.gray600 },

  // STATS
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  statCardWide: { width: '100%' },
  statCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  statEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray400,
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statValueLarge: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  statValueMed: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  statBadge: {
    backgroundColor: COLORS.primaryUltraLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  statDivider: { height: 1, backgroundColor: COLORS.gray200, marginBottom: 8 },
  statFootnote: { fontSize: 11, color: COLORS.gray400, fontWeight: '600' },
  miniStars: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  miniStar: { width: 7, height: 7, borderRadius: 2 },

  // ACTIONS
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: COLORS.black,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gray900,
    marginBottom: 3,
  },
  actionSub: { fontSize: 11, color: COLORS.gray400, fontWeight: '500' },
});

export default DriverHomeScreen;
