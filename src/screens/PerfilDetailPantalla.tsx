import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React, { useState as usarEstado, useEffect as usarEfecto, useCallback as usarFuncionRetorno } from 'react';
import {
  View as Vista,
  Text as Texto,
  StyleSheet as EstiloHoja,
  ScrollView as DesplazableVista,
  TouchableOpacity as PulsableOpacidad,
  TextInput as TextoEntrada,
  Alert,
  ActivityIndicator as ActividadIndicador,
  Image as Imagen } from
'react-native';
import { SafeAreaView as SeguraZonaVista } from 'react-native-safe-area-context';
import { useNavigation as usarNavegacion, useRoute as usarRuta, useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import { usarAjustes } from "../context/AjustesContexto";
import { launchCamera as launchCamara, launchImageLibrary as launchImagenLibrary } from 'react-native-image-picker';
import { obtenerMiSolicitudEstado as obtenerMySolicitudEstado } from "../services/admin.servicio";
import { API_BASE_URL } from "../config/constantes";
import {
  User as Usuario,
  Mail,
  Phone as Telefono,
  ChevronRight as ChevronDerecha,
  Save as Guardar,
  X,
  Car,
  CheckCircle as ComprobarCircle,
  AlertCircle,
  Circle,
  Pencil,
  Star } from
'lucide-react-native';
import { calificacionesServicio } from "../services/ratings.servicio";

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
  warning: '#D97706'
};

const PerfilDetallePantalla: React.FC = () => {
  const navegacion = usarNavegacion<any>();
  const ruta = usarRuta<any>();
  const { user: usuario, updateUser: actualizarUsuario, token } = usarAutenticacion();
  const { settings: ajustes } = usarAjustes();
  const esOscuro = ajustes.darkMode;

  // Datos del vehículo pasados desde ProfileScreen
  const vehiculoModelo: string = ruta.params?.vehicleModel || '';
  const vehiculoPlaca: string = ruta.params?.vehiclePlate || '';
  const esAprobadoConductor: boolean = ruta.params?.isApprovedDriver ?? false;

  const { isDriverMode: esConductorModo } = usarAutenticacion();
  const perfilFotoUrl = usuario?.fotoPerfil || usuario?.urlFoto || null;

  const [esEditando, establecerEsEditando] = usarEstado(false);
  const [formularioDatos, establecerFormularioDatos] = usarEstado({
    nombre: usuario?.nombre || '',
    correo: usuario?.correo || '',
    telefono: usuario?.telefono || ''
  });

  const [calculadoCalificacion, establecerCalculadoCalificacion] = usarEstado<number>(5.0);
  const [totalViajes, establecerTotalViajes] = usarEstado<number>(0);

  const cargarMiCalificacion = usarFuncionRetorno(async () => {
    try {
      const datos = await calificacionesServicio.obtenerMiCalificacion();
      const calificacion = esConductorModo && datos.driverRating !== null ?
      datos.driverRating :
      datos.passengerRating;
      establecerCalculadoCalificacion(calificacion ?? 5.0);

      const viajes = esConductorModo && datos.driverTrips !== undefined ?
      datos.driverTrips :
      datos.passengerTrips ?? 0;
      establecerTotalViajes(viajes);
    } catch (error) {
      console.error('Error loading rating:', error);
      establecerCalculadoCalificacion(usuario?.calificacion ?? 5.0);
      establecerTotalViajes((esConductorModo ? usuario?.totalViajesComoConductor : usuario?.totalViajes) ?? 0);
    }
  }, [esConductorModo, usuario]);

  const [conductorEstado, establecerConductorEstado] = usarEstado<{
    hasApplication: boolean;
    status?: string | null;
    driver?: any;
  } | null>(null);
  const [cargandoConductorEstado, establecerCargandoConductorEstado] = usarEstado(true);
  const [ruatUploading, establecerRuatUploading] = usarEstado(false);

  const cargarConductorEstado = usarFuncionRetorno(async () => {
    try {
      establecerCargandoConductorEstado(true);
      const estado = await obtenerMySolicitudEstado();
      establecerConductorEstado(estado);
    } catch (error) {
      console.error('Error loading driver status:', error);
    } finally {
      establecerCargandoConductorEstado(false);
    }
  }, []);

  usarEfecto(() => {
    cargarConductorEstado();
    cargarMiCalificacion();
  }, [cargarConductorEstado, cargarMiCalificacion]);

  usarEnfoqueEfecto(
    usarFuncionRetorno(() => {
      cargarConductorEstado();
      cargarMiCalificacion();
    }, [cargarConductorEstado, cargarMiCalificacion])
  );

  // RUAT upload logic
  const vehiculo = conductorEstado?.driver?.vehicle ?? null;
  const ruatVerificado: boolean = vehiculo?.ruatVerified ?? false;
  const ruatRequerido: boolean = vehiculo?.ruatRequired ?? false;
  const ruatPendiente: boolean = !!vehiculo?.ruatFile && !ruatVerificado;

  const manejarRuatSubir = async (uri: string) => {
    if (!token) return;
    establecerRuatUploading(true);
    try {
      const formulario = new FormData();
      formulario.append('ruatPhoto', {
        uri,
        type: 'image/jpeg',
        name: 'ruat.jpg'
      } as any);

      const respuesta = await fetch(`${API_BASE_URL}/conductores/enviar-ruat`, {
        method: 'POST',
        body: formulario,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!respuesta.ok) {
        const error = await respuesta.json();
        throw new Error(error.error || `Error ${respuesta.status}`);
      }

      Alert.alert(
        '✅ RUAT enviado',
        'Tu RUAT fue enviado correctamente. El administrador lo revisará pronto.'
      );
      cargarConductorEstado();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo enviar el RUAT.');
    } finally {
      establecerRuatUploading(false);
    }
  };

  const abrirRuatSelector = () => {
    Alert.alert('Subir RUAT', 'Selecciona una opción', [
    {
      text: 'Cámara',
      onPress: () =>
      launchCamara({ mediaType: 'photo', quality: 0.7 }, (r) => {
        if (r.assets?.[0]?.uri) manejarRuatSubir(r.assets[0].uri!);
      })
    },
    {
      text: 'Galería',
      onPress: () =>
      launchImagenLibrary({ mediaType: 'photo', quality: 0.7 }, (r) => {
        if (r.assets?.[0]?.uri) manejarRuatSubir(r.assets[0].uri!);
      })
    },
    { text: 'Cancelar', style: 'cancel' }]
    );
  };

  const manejarGuardar = () => {
    if (!formularioDatos.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!formularioDatos.correo.trim()) {
      Alert.alert('Error', 'El correo es requerido');
      return;
    }
    if (!formularioDatos.telefono.trim()) {
      Alert.alert('Error', 'El teléfono es requerido');
      return;
    }

    // Here you would call API to update user
    actualizarUsuario({
      nombre: formularioDatos.nombre,
      correo: formularioDatos.correo,
      telefono: formularioDatos.telefono
    });

    establecerEsEditando(false);
    Alert.alert('Éxito', 'Perfil actualizado correctamente');
  };

  const manejarCancelar = () => {
    establecerFormularioDatos({
      nombre: usuario?.nombre || '',
      correo: usuario?.correo || '',
      telefono: usuario?.telefono || ''
    });
    establecerEsEditando(false);
  };

  const InformacionFila = ({ label: etiqueta, value: valor, isLast: esUltimo = false }: {label: string;value: string;isLast?: boolean;}) =>
  <Vista style={[estilos.infoRow, !esUltimo && estilos.infoRowBorder]}>
      <Texto style={estilos.infoLabel}>{etiqueta}</Texto>
      <Texto style={estilos.infoValue}>{valor || 'No registrado'}</Texto>
    </Vista>;


  return (
    <SeguraZonaVista style={[estilos.container, esOscuro && estilos.containerDark]}>
      <Vista style={[estilos.header, esOscuro && estilos.headerDark]}>
        <PulsableOpacidad style={estilos.backBtn} onPress={() => navegacion.goBack()}>
          <X size={24} color={Colores.primary} strokeWidth={2.8} />
        </PulsableOpacidad>
        {!esEditando ?
        <PulsableOpacidad onPress={() => establecerEsEditando(true)}>
            <Pencil size={22} color={Colores.primary} strokeWidth={2.8} />
          </PulsableOpacidad> :

        <PulsableOpacidad onPress={manejarCancelar}>
            <Texto style={estilos.cancelBtn}>Cancelar</Texto>
          </PulsableOpacidad>
        }
      </Vista>

      <DesplazableVista style={estilos.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <Vista style={[estilos.avatarSection, esOscuro && estilos.avatarSectionDark]}>
          <Vista style={[estilos.avatarWrapper, esOscuro && estilos.avatarWrapperDark]}>
            {perfilFotoUrl ?
            <Imagen source={privadoImagenOrigen(perfilFotoUrl)} style={estilos.avatarImage} /> :

            <Vista style={[estilos.avatarFallback, esOscuro && estilos.avatarFallbackDark]}>
                <Usuario size={32} color={Colores.primary} />
              </Vista>
            }
          </Vista>
          <Vista style={estilos.avatarInfo}>
            <Texto style={[estilos.userName, esOscuro && estilos.userNameDark]}>{formularioDatos.nombre || 'Usuario'}</Texto>
            <Texto style={[estilos.userEmail, esOscuro && estilos.userEmailDark]}>{formularioDatos.correo || 'Sin correo'}</Texto>
            <Vista style={estilos.statsRow}>
              <Star size={14} color={Colores.primary} fill={Colores.primary} />
              <Texto style={[estilos.ratingText, esOscuro && estilos.ratingTextDark]}>{calculadoCalificacion.toFixed(1)}</Texto>
              <Texto style={estilos.ratingDot}>•</Texto>
              <Texto style={[estilos.ridesText, esOscuro && estilos.ridesTextDark]}>{totalViajes} viajes</Texto>
            </Vista>
          </Vista>
        </Vista>

        {/* Personal Information */}
        <Vista style={estilos.section}>
          <Texto style={estilos.sectionTitle}>INFORMACIÓN PERSONAL</Texto>
          <Vista style={[estilos.card, esOscuro && estilos.cardDark]}>
            {esEditando ?
            <>
                <Vista style={estilos.inputGroup}>
                  <Texto style={estilos.inputLabel}>Nombre completo</Texto>
                  <TextoEntrada
                  style={[estilos.input, esOscuro && estilos.inputDark]}
                  value={formularioDatos.nombre}
                  onChangeText={(texto) => establecerFormularioDatos({ ...formularioDatos, nombre: texto })}
                  placeholder="Tu nombre"
                  placeholderTextColor={Colores.textTertiary} />

                </Vista>
                <Vista style={estilos.inputGroup}>
                  <Texto style={estilos.inputLabel}>Correo electrónico</Texto>
                  <TextoEntrada
                  style={[estilos.input, esOscuro && estilos.inputDark]}
                  value={formularioDatos.correo}
                  onChangeText={(texto) => establecerFormularioDatos({ ...formularioDatos, correo: texto })}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  placeholderTextColor={Colores.textTertiary} />

                </Vista>
                <Vista style={[estilos.inputGroup, { marginBottom: 0 }]}>
                  <Texto style={estilos.inputLabel}>Teléfono</Texto>
                  <TextoEntrada
                  style={[estilos.input, esOscuro && estilos.inputDark]}
                  value={formularioDatos.telefono}
                  onChangeText={(texto) => establecerFormularioDatos({ ...formularioDatos, telefono: texto })}
                  placeholder="+591 70000000"
                  keyboardType="phone-pad"
                  placeholderTextColor={Colores.textTertiary} />

                </Vista>
              </> :

            <>
                <InformacionFila label="Nombre" value={formularioDatos.nombre} />
                <InformacionFila label="Correo" value={formularioDatos.correo} />
                <InformacionFila label="Teléfono" value={formularioDatos.telefono} isLast />
              </>
            }
          </Vista>

          {esEditando &&
          <PulsableOpacidad style={estilos.saveBtn} onPress={manejarGuardar}>
              <Guardar size={20} color="#FFF" />
              <Texto style={estilos.saveBtnText}>Guardar cambios</Texto>
            </PulsableOpacidad>
          }
        </Vista>

        {/* Account Info */}
        <Vista style={estilos.section}>
          <Texto style={estilos.sectionTitle}>CUENTA</Texto>
          <Vista style={[estilos.card, esOscuro && estilos.cardDark]}>
            <Vista style={estilos.infoRow}>
              <Texto style={estilos.infoLabel}>Estado</Texto>
              <Vista style={estilos.statusBadge}>
                <Texto style={estilos.statusText}>Activa</Texto>
              </Vista>
            </Vista>
            <Vista style={[estilos.infoRow, { borderBottomWidth: 0 }]}>
              <Texto style={estilos.infoLabel}>Miembro desde</Texto>
              <Texto style={estilos.infoValue}>
                {usuario?.createdAt ?
                new Date(usuario.createdAt).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }) :
                'Enero 2024'}
              </Texto>
            </Vista>
          </Vista>
        </Vista>

        {/* Vehicle Info — solo conductores aprobados */}
        {esAprobadoConductor &&
        <Vista style={estilos.section}>
            <Texto style={estilos.sectionTitle}>VEHÍCULO</Texto>
            <Vista style={[estilos.card, esOscuro && estilos.cardDark, { marginBottom: 12 }]}>
              <Vista style={estilos.infoRow}>
                <Texto style={estilos.infoLabel}>Modelo</Texto>
                <Texto style={estilos.infoValue}>{vehiculoModelo || 'No registrado'}</Texto>
              </Vista>
              <Vista style={[estilos.infoRow, { borderBottomWidth: 0 }]}>
                <Texto style={estilos.infoLabel}>Placa</Texto>
                <Texto style={estilos.infoValue}>{vehiculoPlaca || 'No registrada'}</Texto>
              </Vista>
            </Vista>

            {/* RUAT Verification Section (no container card) */}
            <Vista style={{ marginTop: 12 }}>
              {/* Estado RUAT */}
              {ruatVerificado ?
            <Vista style={ruatEstilos.row}>
                  <Vista style={[ruatEstilos.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <ComprobarCircle size={20} color={Colores.success} />
                  </Vista>
                  <Vista style={{ flex: 1 }}>
                    <Texto style={[ruatEstilos.title, esOscuro && ruatEstilos.titleDark]}>Vehículo Verificado</Texto>
                    <Texto style={ruatEstilos.sub}>
                      Tu RUAT fue aprobado. Tu vehículo tiene el badge de verificado.
                    </Texto>
                  </Vista>
                </Vista> :
            ruatPendiente ?
            <Vista style={ruatEstilos.row}>
                  <Vista style={[ruatEstilos.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Circle size={20} color={Colores.warning} />
                  </Vista>
                  <Vista style={{ flex: 1 }}>
                    <Texto style={[ruatEstilos.title, esOscuro && ruatEstilos.titleDark]}>En revisión</Texto>
                    <Texto style={ruatEstilos.sub}>
                      Tu documento fue enviado y está siendo revisado por el administrador.
                    </Texto>
                  </Vista>
                </Vista> :
            ruatRequerido ?
            <Vista>
                  <Vista style={[ruatEstilos.row, ruatEstilos.alertRow]}>
                    <Vista style={[ruatEstilos.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                      <AlertCircle size={20} color={Colores.danger} />
                    </Vista>
                    <Vista style={{ flex: 1 }}>
                      <Texto style={[ruatEstilos.title, { color: Colores.danger }]}>
                        Verificación requerida
                      </Texto>
                      <Texto style={ruatEstilos.sub}>
                        El administrador requiere que envíes el RUAT de tu vehículo
                        {vehiculo?.ruatRequiredReason === 'accidente' && ' (accidente registrado)'}
                        {vehiculo?.ruatRequiredReason === 'vehiculo_no_coincide' && ' (vehículo no coincide)'}
                        {vehiculo?.ruatRequiredReason === 'reactivacion_tras_suspension' && ' (reactivación de cuenta)'}
                        {vehiculo?.ruatRequiredReason === 'antecedentes_penales' && ' (verificación adicional)'}
                        .
                      </Texto>
                    </Vista>
                  </Vista>
                  <PulsableOpacidad
                style={[ruatEstilos.btn, { backgroundColor: Colores.danger, marginTop: 12 }]}
                onPress={abrirRuatSelector}
                disabled={ruatUploading}
                activeOpacity={0.8}>

                    {ruatUploading ?
                <ActividadIndicador color="#fff" size="small" /> :

                <Texto style={ruatEstilos.btnTxt}>Subir RUAT ahora</Texto>
                }
                  </PulsableOpacidad>
                </Vista> :

            <PulsableOpacidad
              style={[ruatEstilos.btn, { backgroundColor: Colores.primary }]}
              onPress={abrirRuatSelector}
              disabled={ruatUploading}
              activeOpacity={0.8}>

                  {ruatUploading ?
              <ActividadIndicador color="#fff" size="small" /> :

              <Texto style={ruatEstilos.btnTxt}>Verificar vehículo</Texto>
              }
                </PulsableOpacidad>
            }
            </Vista>
          </Vista>
        }

        {/* Danger Zone */}
        <Vista style={estilos.section}>
          <PulsableOpacidad
            style={estilos.dangerBtn}
            onPress={() => Alert.alert('Eliminar cuenta', '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.')}>

            <Texto style={estilos.dangerBtnText}>Eliminar mi cuenta</Texto>
          </PulsableOpacidad>
        </Vista>
      </DesplazableVista>
    </SeguraZonaVista>);

};

const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  containerDark: {
    backgroundColor: '#1A1A1A'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colores.surface
  },
  headerDark: {
    backgroundColor: '#1A1A1A'
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  editBtn: {
    fontSize: 16,
    color: Colores.primary,
    fontWeight: '600'
  },
  cancelBtn: {
    fontSize: 16,
    color: Colores.danger,
    fontWeight: '600'
  },
  scrollView: {
    flex: 1
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colores.surface,
    marginBottom: 16
  },
  avatarSectionDark: {
    backgroundColor: '#2D2D2D'
  },
  avatarWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colores.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarWrapperDark: {
    backgroundColor: '#3D3D3D'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarFallbackDark: {
    backgroundColor: '#3D3D3D'
  },
  avatarInfo: {
    flex: 1,
    marginLeft: 16
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colores.text,
    marginBottom: 4
  },
  userNameDark: {
    color: '#FFF'
  },
  userEmail: {
    fontSize: 14,
    color: Colores.textSecondary
  },
  userEmailDark: {
    color: '#AAA'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.text,
    marginLeft: 4
  },
  ratingTextDark: {
    color: '#FFF'
  },
  ratingDot: {
    marginHorizontal: 6,
    color: Colores.textTertiary
  },
  ridesText: {
    fontSize: 13,
    color: Colores.textSecondary
  },
  ridesTextDark: {
    color: '#AAA'
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12
  },
  card: {
    backgroundColor: Colores.surface,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    overflow: 'hidden'
  },
  cardDark: {
    backgroundColor: '#2D2D2D'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colores.border
  },
  infoRowBorder: {
    borderBottomColor: '#F0F0F0'
  },
  infoLabel: {
    fontSize: 15,
    color: Colores.textSecondary
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colores.text
  },
  statusBadge: {
    backgroundColor: '#DFFFE0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colores.success
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colores.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  input: {
    backgroundColor: Colores.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colores.text
  },
  inputDark: {
    backgroundColor: '#3D3D3D',
    color: '#FFF'
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colores.primary,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF'
  },
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  dangerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colores.danger
  }
});

const ruatEstilos = EstiloHoja.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  alertRow: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colores.text,
    marginBottom: 2
  },
  titleDark: {
    color: '#FFFFFF'
  },
  sub: {
    fontSize: 12,
    color: Colores.textSecondary,
    lineHeight: 17
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  btnTxt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  }
});

export default PerfilDetallePantalla;
