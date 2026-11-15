import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Modal, Pressable,
  StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, ChevronRight, Menu, Search, UserRound, X } from 'lucide-react-native';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import * as AdministradorServicio from '../services/admin.servicio';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

const C = {
  white: '#FFFFFF', surface: '#F7F7F9', border: '#EAEAF0', text: '#111118',
  muted: '#666673', primary: '#7514C5', lilac: '#F3EAFC', green: '#16A34A', red: '#DC2626'
};

type Usuario = Awaited<ReturnType<typeof AdministradorServicio.obtenerTodosUsuarios>>['data'][number];
type FiltroRol = 'all' | Usuario['role'];
type Props = { navigation: NativeStackNavigationProp<RaizPilaParametroLista, 'AdminUsers'> };
const USUARIOS_POR_PAGINA = 25;
const filtrosRol: { valor: FiltroRol; etiqueta: string }[] = [
  { valor: 'all', etiqueta: 'Todos' },
  { valor: 'pasajero', etiqueta: 'Pasajeros' },
  { valor: 'conductor', etiqueta: 'Conductores' },
  { valor: 'administrador', etiqueta: 'Administradores' }
];

function Avatar({ nombre, foto }: { nombre: string; foto?: string }) {
  const [fotoFallida, setFotoFallida] = useState<string>();
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte.charAt(0)).join('').toUpperCase();
  return (
    <View style={s.avatar}>
      {foto && fotoFallida !== foto ? (
        <Image source={privadoImagenOrigen(foto)} style={s.foto} onError={() => setFotoFallida(foto)} />
      ) : <Text style={s.iniciales}>{iniciales || '?'}</Text>}
    </View>
  );
}

export default function AdministradorUsuariosPantalla({ navigation }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [buscarVisible, setBuscarVisible] = useState(false);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [rol, setRol] = useState<FiltroRol>('all');
  const [inactivos, setInactivos] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const consulta = busqueda.trim();

  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    const espera = setTimeout(() => {
      AdministradorServicio.obtenerTodosUsuarios(USUARIOS_POR_PAGINA, pagina * USUARIOS_POR_PAGINA, consulta || undefined, rol === 'all' ? undefined : rol, inactivos)
        .then(respuesta => {
          if (!vigente) return;
          const ultimaPagina = Math.max(0, Math.ceil(respuesta.total / USUARIOS_POR_PAGINA) - 1);
          if (pagina > ultimaPagina) setPagina(ultimaPagina);
          setUsuarios(respuesta.data);
          setTotal(respuesta.total);
        })
        .catch(() => { if (vigente) setError('No se pudieron cargar los usuarios.'); })
        .finally(() => { if (vigente) setCargando(false); });
    }, consulta ? 250 : 0);
    return () => { vigente = false; clearTimeout(espera); };
  }, [consulta, rol, inactivos, pagina, recarga]));

  const actualizarBusqueda = (texto: string) => { setBusqueda(texto); setPagina(0); };
  const etiquetaEstado = inactivos ? 'Inactivos' : 'Activos';
  const colorEstado = inactivos ? C.red : C.green;
  return (
    <SafeAreaView style={s.pantalla}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <View style={s.cabecera}>
        <Pressable style={s.control} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cerrar gestión de usuarios">
          <X size={24} color={C.text} strokeWidth={2.8} />
        </Pressable>
        <Text style={s.titulo} numberOfLines={1}>Gestión de usuarios</Text>
        <Pressable style={s.control} onPress={() => { setBuscarVisible(!buscarVisible); actualizarBusqueda(''); }} accessibilityRole="button" accessibilityLabel={buscarVisible ? 'Cerrar búsqueda' : 'Buscar usuarios'}>
          <Search size={20} color={buscarVisible ? C.primary : C.text} strokeWidth={2.8} />
        </Pressable>
        <Pressable style={s.control} onPress={() => setFiltrosVisible(true)} accessibilityRole="button" accessibilityLabel="Filtrar usuarios">
          <Menu size={22} color={rol !== 'all' || inactivos ? C.primary : C.text} strokeWidth={2.8} />
        </Pressable>
      </View>

      {buscarVisible && (
        <View style={s.buscador}>
          <Search size={16} color={C.muted} />
          <TextInput style={s.entrada} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search"
            placeholder="Nombre, correo o teléfono" placeholderTextColor={C.muted} value={busqueda} onChangeText={actualizarBusqueda} />
          {!!busqueda && (
            <Pressable onPress={() => actualizarBusqueda('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <X size={18} color={C.muted} strokeWidth={2.8} />
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={cargando || error ? [] : usuarios}
        keyExtractor={usuario => usuario.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.lista}
        ListHeaderComponent={<Text style={s.resumen}>{etiquetaEstado}{rol !== 'all' ? ` · ${filtrosRol.find(filtro => filtro.valor === rol)?.etiqueta}` : ''}{!cargando && !error ? ` · ${total}` : ''}</Text>}
        ListFooterComponent={!cargando && !error && total > USUARIOS_POR_PAGINA ? (
          <View style={s.paginacion}>
            <Pressable disabled={pagina === 0} onPress={() => setPagina(actual => actual - 1)} accessibilityRole="button">
              <Text style={[s.reintentar, pagina === 0 && s.textoDeshabilitado]}>Anterior</Text>
            </Pressable>
            <Text style={s.secundario}>{pagina + 1} de {Math.ceil(total / USUARIOS_POR_PAGINA)}</Text>
            <Pressable disabled={(pagina + 1) * USUARIOS_POR_PAGINA >= total} onPress={() => setPagina(actual => actual + 1)} accessibilityRole="button">
              <Text style={[s.reintentar, (pagina + 1) * USUARIOS_POR_PAGINA >= total && s.textoDeshabilitado]}>Siguiente</Text>
            </Pressable>
          </View>
        ) : null}
        ListEmptyComponent={cargando ? <ActivityIndicator style={s.carga} color={C.primary} /> : (
          <View style={s.vacio}>
            <UserRound size={28} color={C.primary} />
            <Text style={s.nombre}>{error || 'Sin usuarios para mostrar'}</Text>
            {error && <Pressable onPress={() => setRecarga(actual => actual + 1)} accessibilityRole="button"><Text style={s.reintentar}>Reintentar</Text></Pressable>}
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={s.tarjeta} onPress={() => navigation.push('AdminUserDetails', { usuarioId: item.id })} accessibilityRole="button">
            <Avatar nombre={item.name} foto={item.photo} />
            <View style={s.expandir}>
              <Text style={s.nombre} numberOfLines={1}>{item.name}</Text>
              {!!item.email && <Text style={s.secundario} numberOfLines={1}>{item.email}</Text>}
            </View>
            <View style={[s.punto, { backgroundColor: colorEstado }]} />
            <ChevronRight size={16} color={C.muted} />
          </Pressable>
        )}
      />

      <Modal visible={filtrosVisible} transparent animationType="fade" onRequestClose={() => setFiltrosVisible(false)}>
        <SafeAreaView style={s.fondoModal}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltrosVisible(false)} accessibilityLabel="Cerrar filtros" />
          <View style={s.panelFiltros} accessibilityViewIsModal>
            <View style={s.cabecera}>
              <Text style={[s.titulo, s.tituloIzquierda]}>Filtros</Text>
              <Pressable style={s.control} onPress={() => setFiltrosVisible(false)} accessibilityRole="button" accessibilityLabel="Cerrar filtros"><X size={24} color={C.text} strokeWidth={2.8} /></Pressable>
            </View>
            <Text style={s.etiquetaFiltro}>Rol</Text>
            {filtrosRol.map(filtro => (
              <Pressable key={filtro.valor} style={[s.opcion, rol === filtro.valor && s.opcionActiva]} onPress={() => { setRol(filtro.valor); setPagina(0); }} accessibilityRole="radio" accessibilityState={{ checked: rol === filtro.valor }}>
                <Text style={s.nombre}>{filtro.etiqueta}</Text>
                {rol === filtro.valor && <Check size={19} color={C.primary} strokeWidth={2.8} />}
              </Pressable>
            ))}
            <Text style={s.etiquetaFiltro}>Estado</Text>
            {[false, true].map(inactivo => (
              <Pressable key={String(inactivo)} style={[s.opcion, inactivos === inactivo && s.opcionActiva]} onPress={() => { setInactivos(inactivo); setPagina(0); }} accessibilityRole="radio" accessibilityState={{ checked: inactivos === inactivo }}>
                <Text style={s.nombre}>{inactivo ? 'Inactivos' : 'Activos'}</Text>
                {inactivos === inactivo && <Check size={19} color={C.primary} strokeWidth={2.8} />}
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </Modal>


    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.white },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  control: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center' },
  tituloIzquierda: { textAlign: 'left' },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 12 },
  entrada: { flex: 1, minHeight: 46, fontSize: 15, color: C.text },
  lista: { padding: 16, gap: 10, flexGrow: 1 },
  resumen: { fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 2 },
  carga: { marginTop: 24 },
  vacio: { alignItems: 'center', gap: 10, padding: 28 },
  reintentar: { color: C.primary, fontSize: 15, fontWeight: '700', padding: 8 },
  paginacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  textoDeshabilitado: { color: C.muted, opacity: 0.6 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: C.surface, borderRadius: 18 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.lilac, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  iniciales: { fontSize: 16, color: C.primary, fontWeight: '800' },
  expandir: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '800', color: C.text },
  secundario: { fontSize: 13, color: C.muted },
  punto: { width: 8, height: 8, borderRadius: 4 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'center', paddingHorizontal: 20 },
  panelFiltros: { backgroundColor: C.white, borderRadius: 20, padding: 12 },
  etiquetaFiltro: { fontSize: 13, fontWeight: '700', color: C.muted, margin: 10 },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12, borderRadius: 12 },
  opcionActiva: { backgroundColor: C.lilac },
});
