import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Car, Check, Menu, Search, X } from 'lucide-react-native';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { listarConductoresOperativos } from '../services/admin.servicio';
import type { ConductorOperativo, EstadoConduccion } from '../services/admin.servicio';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

const C = { blanco: '#FFFFFF', fondo: '#F7F7F9', tinta: '#111118', gris: '#666673', borde: '#EAEAF0', morado: '#7514C5', lila: '#F3EAFC', verde: '#16A34A', rojo: '#DC2626' };
const LIMITE = 25;
const filtroOpciones: { estado: EstadoConduccion | undefined; etiqueta: string }[] = [
  { estado: undefined, etiqueta: 'Todos' }, { estado: 'aprobado', etiqueta: 'Habilitados' }, { estado: 'suspendido', etiqueta: 'Suspendidos' }
];
function estadoTexto(conductor: ConductorOperativo) {
  if (conductor.estado === 'suspendido') return 'Conducción suspendida';
  if (!conductor.cuentaActiva) return 'Cuenta inactiva';
  return conductor.disponible ? 'Disponible' : 'Habilitado · no disponible';
}

function Avatar({ conductor }: { conductor: ConductorOperativo }) {
  const [fallida, setFallida] = useState<string | null>(null);
  const iniciales = conductor.nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
  return <View style={s.avatar}>
    {conductor.foto && fallida !== conductor.foto ? (
      <Image style={s.foto} source={privadoImagenOrigen(conductor.foto)} onError={() => setFallida(conductor.foto)} />
    ) : <Text style={s.iniciales}>{iniciales}</Text>}
  </View>;
}

export default function AdminConductoresPantalla({ navigation }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminDrivers'>) {
  const [conductores, setConductores] = useState<ConductorOperativo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [consulta, setConsulta] = useState('');
  const [buscar, setBuscar] = useState(false);
  const [filtros, setFiltros] = useState(false);
  const [estado, setEstado] = useState<EstadoConduccion>();
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState(false);
  const [recargar, setRecargar] = useState(0);
  useFocusEffect(useCallback(() => {
    let vigente = true;
    setCargando(true);
    setErrorLista(false);
    const espera = setTimeout(() => {
      listarConductoresOperativos(LIMITE, pagina * LIMITE, consulta.trim(), estado)
        .then(resultado => {
          if (!vigente) return;
          setConductores(resultado.conductores);
          setTotal(resultado.total);
          const ultima = Math.max(0, Math.ceil(resultado.total / LIMITE) - 1);
          if (pagina > ultima) setPagina(ultima);
        })
        .catch(() => { if (vigente) setErrorLista(true); })
        .finally(() => { if (vigente) setCargando(false); });
    }, consulta.trim() ? 250 : 0);
    return () => { vigente = false; clearTimeout(espera); };
  }, [pagina, consulta, estado, recargar]));

  return <SafeAreaView style={s.pantalla}>
    <StatusBar barStyle="dark-content" />
    <View style={s.cabecera}>
      <Pressable style={s.control} accessibilityRole="button" accessibilityLabel="Cerrar gestión de conductores" onPress={() => navigation.goBack()}><X size={24} color={C.tinta} strokeWidth={2.8} /></Pressable>
      <Text style={s.titulo}>Gestión de conductores</Text>
      <Pressable style={s.control} accessibilityRole="button" accessibilityLabel={buscar ? 'Cerrar búsqueda' : 'Buscar conductores'} onPress={() => { setBuscar(!buscar); setConsulta(''); setPagina(0); }}><Search size={20} color={buscar ? C.morado : C.tinta} strokeWidth={2.8} /></Pressable>
      <Pressable style={s.control} accessibilityRole="button" accessibilityLabel="Filtrar conductores" onPress={() => setFiltros(true)}><Menu size={22} color={estado ? C.morado : C.tinta} strokeWidth={2.8} /></Pressable>
    </View>
    {buscar && <View style={s.buscador}>
      <Search size={16} color={C.gris} />
      <TextInput style={s.entrada} autoFocus autoCapitalize="none" placeholder="Nombre, placa, correo o teléfono" placeholderTextColor={C.gris}
        accessibilityLabel="Buscar conductores" value={consulta} onChangeText={texto => { setConsulta(texto); setPagina(0); }} />
    </View>}
    <FlatList
      data={cargando || errorLista ? [] : conductores} keyExtractor={item => item.id} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<Text style={s.resumen}>{filtroOpciones.find(opcion => opcion.estado === estado)?.etiqueta}{!cargando && !errorLista ? ` · ${total}` : ''}</Text>}
      ListEmptyComponent={cargando ? <ActivityIndicator color={C.morado} style={s.espacio} /> : <View style={s.vacio}>
        <Car size={26} color={C.morado} /><Text style={s.nombre}>{errorLista ? 'No se pudieron cargar los conductores.' : 'Sin conductores para mostrar'}</Text>
        {errorLista && <Pressable onPress={() => setRecargar(actual => actual + 1)} accessibilityRole="button"><Text style={s.enlaceTexto}>Reintentar</Text></Pressable>}
      </View>}
      ListFooterComponent={!cargando && !errorLista && total > LIMITE ? <View style={s.paginacion}>
        <Pressable disabled={!pagina} onPress={() => setPagina(actual => actual - 1)} accessibilityRole="button"><Text style={[s.enlaceTexto, !pagina && s.atenuado]}>Anterior</Text></Pressable>
        <Text style={s.secundario}>{pagina + 1} de {Math.ceil(total / LIMITE)}</Text>
        <Pressable disabled={(pagina + 1) * LIMITE >= total} onPress={() => setPagina(actual => actual + 1)} accessibilityRole="button"><Text style={[s.enlaceTexto, (pagina + 1) * LIMITE >= total && s.atenuado]}>Siguiente</Text></Pressable>
      </View> : null}
      renderItem={({ item }) => {
        const vehiculo = item.vehiculos.find(actual => actual.status === 'activo') ?? item.vehiculos[0];
        return <Pressable style={s.tarjeta} onPress={() => navigation.push('AdminDriverDetails', { conductorId: item.id })} accessibilityRole="button">
          <Avatar conductor={item} />
          <View style={s.flex}>
            <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
            <Text style={s.secundario} numberOfLines={1}>{vehiculo ? `${vehiculo.plate} · ${vehiculo.brand} ${vehiculo.model}` : 'Sin vehículo registrado'}</Text>
            <Text style={s.secundario}>{estadoTexto(item)}</Text>
          </View>
          <View style={[s.punto, { backgroundColor: item.estado === 'suspendido' || !item.cuentaActiva ? C.rojo : item.disponible ? C.verde : C.gris }]} />
        </Pressable>;
      }}
    />

    <Modal visible={filtros} transparent animationType="fade" onRequestClose={() => setFiltros(false)}>
      <SafeAreaView style={s.fondoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltros(false)} accessibilityLabel="Cerrar filtros" />
        <View style={s.panelFiltros}>
          <View style={s.cabecera}>
            <Text style={[s.titulo, s.izquierda]}>Estado de conducción</Text>
            <Pressable style={s.control} onPress={() => setFiltros(false)} accessibilityRole="button" accessibilityLabel="Cerrar filtros"><X size={24} color={C.tinta} strokeWidth={2.8} /></Pressable>
          </View>
          {filtroOpciones.map(opcion => <Pressable key={opcion.etiqueta} style={[s.opcion, estado === opcion.estado && s.lila]}
            accessibilityRole="radio" accessibilityState={{ checked: estado === opcion.estado }} onPress={() => { setEstado(opcion.estado); setPagina(0); setFiltros(false); }}>
            <Text style={s.nombre}>{opcion.etiqueta}</Text>
            {estado === opcion.estado && <Check size={18} color={C.morado} strokeWidth={2.8} />}
          </Pressable>)}
        </View>
      </SafeAreaView>
    </Modal>


  </SafeAreaView>;
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.blanco },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  control: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blanco },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.tinta },
  izquierda: { textAlign: 'left' },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginHorizontal: 16, borderRadius: 12, backgroundColor: C.fondo },
  entrada: { flex: 1, minHeight: 46, color: C.tinta, fontSize: 15 },
  contenido: { padding: 16, gap: 10, flexGrow: 1 },
  resumen: { fontSize: 13, fontWeight: '700', color: C.gris },
  espacio: { marginTop: 24 },
  vacio: { alignItems: 'center', padding: 24, gap: 10 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, backgroundColor: C.fondo, borderRadius: 18 },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: C.lila, justifyContent: 'center', alignItems: 'center' },
  foto: { width: '100%', height: '100%' },
  iniciales: { color: C.morado, fontWeight: '800', fontSize: 16 },
  flex: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '800', color: C.tinta },
  secundario: { fontSize: 13, color: C.gris, lineHeight: 19 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  paginacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  atenuado: { opacity: 0.4 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'center', padding: 20 },
  panelFiltros: { backgroundColor: C.blanco, borderRadius: 20, padding: 12 },
  opcion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, borderRadius: 12, paddingHorizontal: 12 },
  lila: { backgroundColor: C.lila },
  enlaceTexto: { color: C.morado, fontSize: 14, fontWeight: '800' },
});
