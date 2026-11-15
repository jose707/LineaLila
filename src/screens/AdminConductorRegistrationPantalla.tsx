import React, { useState as usarEstado } from 'react';
import { ActivityIndicator as ActividadIndicador, Modal, RefreshControl as RenovarControl,
  ScrollView as DesplazableVista, StatusBar as EstadoBar, StyleSheet as EstiloHoja,
  Text as Texto, TextInput as TextoEntrada, TouchableOpacity as PulsableOpacidad, View as Vista } from 'react-native';
import { SafeAreaView as SeguraZonaVista, useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';
import { AlertCircle, Car, Check as Comprobar, Menu as MenuIcono, Search as Buscar, Share as Compartir, User as Usuario, X } from 'lucide-react-native';
import { useFocusEffect as usarEnfoqueEfecto } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Aviso from '../components/Aviso';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import * as AdministradorServicio from '../services/admin.servicio';
import { vehiculoTipoEtiqueta } from '../utils/vehiculoTipos';
import { C, estadoMeta, InitialsAvatar } from './solicitudesConductorCompartido';

export default function AdministradorConductorRegistroPantalla({ navigation: navegacion }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminDriverRegistration'>) {
  const margenes = usarSeguraZonaMargenes();
  const [buscarTexto, establecerBuscarTexto] = usarEstado('');
  const [busquedaVisible, establecerBusquedaVisible] = usarEstado(false);
  const [filtrosVisibles, establecerFiltrosVisibles] = usarEstado(false);
  const [seleccionadoEstado, establecerSeleccionadoEstado] = usarEstado<
    'all' | 'pendiente' | 'observado' | 'aprobado' | 'rechazado'>(
    'all');
  const [esCargando, establecerEsCargando] = usarEstado(true);
  const [esRenovando, establecerEsRenovando] = usarEstado(false);
  const [compartiendoLista, establecerCompartiendoLista] = usarEstado(false);
  const [error, establecerError] = usarEstado<string | null>(null);
  const [aviso, establecerAviso] = usarEstado<{ id: number; mensaje: string } | null>(null);
  const mostrarAviso = React.useCallback((mensaje: string) => establecerAviso({ id: Date.now(), mensaje }), []);
  const [solicitudes, establecerSolicitudes] = usarEstado<Awaited<ReturnType<typeof AdministradorServicio.obtenerTodosConductores>>['data']>([]);
  const cargandoSolicitudesReferencia = React.useRef(false);

  const cargarConductorSolicitudes = React.useCallback(async () => {
    if (cargandoSolicitudesReferencia.current) return;
    cargandoSolicitudesReferencia.current = true;
    establecerEsRenovando(true);
    establecerError(null);
    try {
      const respuesta = await AdministradorServicio.obtenerTodosConductores(50, 0);
      if (respuesta?.data?.length > 0) {
        establecerSolicitudes(respuesta.data);
      } else {
        establecerSolicitudes([]);
      }
    } catch {
      establecerError('Error al cargar los conductores');
    } finally {
      cargandoSolicitudesReferencia.current = false;
      establecerEsRenovando(false);
      establecerEsCargando(false);
    }
  }, []);

  usarEnfoqueEfecto(React.useCallback(() => {
    void cargarConductorSolicitudes();
  }, [cargarConductorSolicitudes]));

  const filtrado = solicitudes.filter((aplicacion) => {
    const q = buscarTexto.toLowerCase();
    const coincidenciaBuscar =
    aplicacion.name.toLowerCase().includes(q) ||
    aplicacion.email.toLowerCase().includes(q) ||
    aplicacion.licenseNumber.toLowerCase().includes(q);
    const coincidenciaEstado =
    seleccionadoEstado === 'all' || aplicacion.status === seleccionadoEstado;
    return coincidenciaBuscar && coincidenciaEstado;
  });

  const counts = {
    pending: solicitudes.filter((primero) => primero.status === 'pendiente').length,
    observed: solicitudes.filter((primero) => primero.status === 'observado').length,
    approved: solicitudes.filter((primero) => primero.status === 'aprobado').length,
    rejected: solicitudes.filter((primero) => primero.status === 'rechazado').length
  };

  const compartirLista = async () => {
    if (compartiendoLista) return;
    establecerCompartiendoLista(true);
    try {
      await AdministradorServicio.compartirPendientesPsicologia();
    } catch (e) { mostrarAviso(e instanceof Error ? e.message : 'No se pudo compartir el PDF.'); }
    finally { establecerCompartiendoLista(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SeguraZonaVista style={s.container}>
      <EstadoBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <Vista style={s.header}>
        <PulsableOpacidad onPress={() => navegacion.goBack()} style={[s.backBtn, s.closeBtn]}>
          <X size={24} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <Texto style={s.headerTitle} numberOfLines={1}>Solicitudes de conductores</Texto>
        <PulsableOpacidad
          style={s.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Buscar solicitudes"
          onPress={() => establecerBusquedaVisible((visible) => !visible)}>
          <Buscar size={20} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
        <PulsableOpacidad
          style={s.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Filtrar solicitudes"
          onPress={() => establecerFiltrosVisibles(true)}>
          <MenuIcono size={22} color={C.text} strokeWidth={2.8} />
        </PulsableOpacidad>
      </Vista>

      {/* Search */}
      {busquedaVisible && <Vista style={s.searchWrap}>
        <Buscar size={15} color={C.textMuted} strokeWidth={2} />
        <TextoEntrada
          style={s.searchInput}
          placeholder="Buscar conductora, correo o licencia"
          placeholderTextColor={C.textMuted}
          value={buscarTexto}
          onChangeText={establecerBuscarTexto} />

        {buscarTexto.length > 0 &&
        <PulsableOpacidad onPress={() => establecerBuscarTexto('')}>
            <X size={15} color={C.textMuted} strokeWidth={2} />
          </PulsableOpacidad>
        }
      </Vista>}

      <Modal visible={filtrosVisibles} transparent animationType="fade" onRequestClose={() => establecerFiltrosVisibles(false)}>
        <Vista style={s.filterOverlay}>
          <PulsableOpacidad style={EstiloHoja.absoluteFill} onPress={() => establecerFiltrosVisibles(false)} />
          <Vista style={s.filterMenu}>
            <Texto style={s.filterTitle}>Mostrar solicitudes</Texto>
        {(
        [
        { key: 'all', label: 'Todos' },
        { key: 'pendiente', label: `Pendientes (${counts.pending})` },
        { key: 'observado', label: `Observados (${counts.observed})` },
        { key: 'aprobado', label: `Aprobados (${counts.approved})` },
        { key: 'rechazado', label: `Rechazados (${counts.rejected})` }] as
        const).
        map((f) =>
        <PulsableOpacidad
          key={f.key}
          style={[s.filterOption, seleccionadoEstado === f.key && s.filterOptionActive]}
          onPress={() => { establecerSeleccionadoEstado(f.key); establecerFiltrosVisibles(false); }}>

            <Texto
            style={[s.filterOptionText, seleccionadoEstado === f.key && s.filterOptionTextActive]}>

              {f.label}
            </Texto>
            {seleccionadoEstado === f.key && <Comprobar size={18} color={C.primary} strokeWidth={2} />}
          </PulsableOpacidad>
        )}
          </Vista>
        </Vista>
      </Modal>

      <DesplazableVista
        style={{ flex: 1 }}
        contentContainerStyle={[s.listContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
        <RenovarControl
          refreshing={esRenovando}
          onRefresh={cargarConductorSolicitudes}
          tintColor={C.primary}
          colors={[C.primary]} />

        }>

        {/* Loading / Error */}
        {esCargando &&
        <Vista style={s.center}>
            <ActividadIndicador size="large" color={C.primary} />
            <Texto style={s.loadingTxt}>Cargando solicitudes...</Texto>
          </Vista>
        }
        {error && !esCargando &&
        <Vista style={s.errorBanner}>
            <AlertCircle size={14} color={C.error} strokeWidth={2} />
            <Texto style={s.errorTxt}>{error}</Texto>
          </Vista>
        }

        {/* Result count */}
        {!esCargando &&
        <Texto style={s.resultCount}>
            {filtrado.length} resultado{filtrado.length !== 1 ? 's' : ''}
          </Texto>
        }

        {/* Empty */}
        {!esCargando && filtrado.length === 0 &&
        <Vista style={s.center}>
            <Usuario size={32} color={C.textMuted} strokeWidth={1.5} />
            <Texto style={s.emptyTxt}>Sin solicitudes</Texto>
          </Vista>
        }

        {/* List */}
        {filtrado.map((aplicacion) => {
          return (
            <PulsableOpacidad
              key={aplicacion.id}
              style={s.card}
              onPress={() => navegacion.push('AdminDriverRequestDetails', { usuarioId: aplicacion.userId })}
              activeOpacity={0.7}>

              <Vista style={s.cardTop}>
                <InitialsAvatar name={aplicacion.name} photo={aplicacion.photo} size={50} />
                <Vista style={s.cardIdentity}>
                  <Texto style={s.cardName} numberOfLines={1}>{aplicacion.name}</Texto>
                  <Texto style={s.cardEmail} numberOfLines={1}>{aplicacion.email}</Texto>
                  <Vista style={s.cardVehicle}>
                    <Car size={15} color={C.primary} strokeWidth={1.8} />
                    <Texto style={s.cardVehicleText} numberOfLines={1}>
                      {vehiculoTipoEtiqueta(aplicacion.vehicleType).toUpperCase()} · {aplicacion.vehiclePlate || 'Sin placa'}
                    </Texto>
                  </Vista>
                </Vista>
                <Vista
                  style={[s.statusDot, { backgroundColor: estadoMeta(aplicacion.status).color }]}
                  accessibilityLabel={`Estado: ${estadoMeta(aplicacion.status).label}`}
                />
              </Vista>
            </PulsableOpacidad>);

        })}
      </DesplazableVista>

      {!filtrosVisibles &&
        <PulsableOpacidad
          style={[s.compartirFlotante, { bottom: margenes.bottom + 20 }, compartiendoLista && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Compartir PDF de solicitantes pendientes de evaluación psicológica"
          accessibilityState={{ disabled: compartiendoLista, busy: compartiendoLista }}
          disabled={compartiendoLista}
          onPress={compartirLista}>
          <Compartir size={25} color={C.white} strokeWidth={2.5} />
        </PulsableOpacidad>}

      {aviso && <Aviso key={aviso.id} message={aviso.mensaje} visible position="bottom" icon="!" iconCircle bottomOffset={10} fontWeight="700" textAlign="left" onHide={() => establecerAviso(null)} />}
    </SeguraZonaVista>
  );
}

const s = EstiloHoja.create({
  compartirFlotante: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5
  },
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.bg
  },
  closeBtn: { backgroundColor: C.white },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  headerAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'flex-end', paddingTop: 65, paddingRight: 20 },
  filterMenu: { width: 245, backgroundColor: C.white, borderRadius: 18, padding: 12, elevation: 8 },
  filterTitle: { fontSize: 13, fontWeight: '600', color: C.textMuted, paddingHorizontal: 12, paddingVertical: 10 },
  filterOption: { minHeight: 45, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10 },
  filterOptionActive: { backgroundColor: C.primaryLight },
  filterOptionText: { fontSize: 15, color: C.text },
  filterOptionTextActive: { color: C.primary, fontWeight: '700' },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingTxt: { fontSize: 13, color: C.textMuted },
  emptyTxt: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.errorBorder
  },
  errorTxt: { flex: 1, fontSize: 13, color: C.error, fontWeight: '600' },
  resultCount: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    overflow: 'hidden'
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  cardIdentity: { flex: 1, minWidth: 0 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 5 },
  cardName: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 3 },
  cardEmail: { fontSize: 13, color: C.textSub, marginBottom: 7 },
  cardVehicle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardVehicleText: { flex: 1, fontSize: 13, color: C.textSub, fontWeight: '500' },
});
