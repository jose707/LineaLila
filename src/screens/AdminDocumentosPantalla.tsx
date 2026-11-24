import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, NativeModules, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Car, ChevronRight, FileCheck, FileText, Fingerprint, House, IdCard, ShieldCheck } from 'lucide-react-native';
import {
  coloresDetalle as C, EnlaceDetallePersona, estilosDetallePersona as s, MarcoDetallePersona, SeccionDetallePersona
} from '../components/AdminDetallePersona';
import ZoomableDocumentModal from '../components/ZoomableDocumentModal';
import type { RaizPilaParametroLista } from '../navigation/AplicacionNavegador';
import { corregirDatosIdentidad, obtenerDatosIdentidad, obtenerTodosConductores, type DatosIdentidadRevision } from '../services/admin.servicio';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

type Documento = { titulo: string; fotos: string[]; icono: typeof IdCard };

const documentosConductor = [
  { titulo: 'Licencia', tipos: ['licenseFront', 'licenseBack'], icono: IdCard },
  { titulo: 'Vehículo', tipos: ['carFront', 'carBack'], icono: Car },
  { titulo: 'RUAT', tipos: ['ruatPhoto'], icono: FileText },
  { titulo: 'CI del propietario del RUAT', tipos: ['ownerCiFront', 'ownerCiBack'], icono: IdCard },
  { titulo: 'SOAT', tipos: ['soatPhoto'], icono: ShieldCheck },
  { titulo: 'Certificado de antecedentes', tipos: ['antecedentsPhoto'], icono: FileCheck },
  { titulo: 'TIC', tipos: ['ticPhoto'], icono: IdCard },
  { titulo: 'Comprobante de domicilio', tipos: ['domicileProof'], icono: House }
];

function FilaDocumento({ documento, separador, onPress }: {
  documento: Documento; separador?: boolean; onPress: () => void;
}) {
  const Icono = documento.icono;
  return (
    <Pressable style={[estilos.fila, separador && s.separador]} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`Ver ${documento.titulo}`}>
      <Icono size={23} strokeWidth={2.3} color={C.texto} />
      <Text style={[s.valor, s.datos]}>{documento.titulo}</Text>
      <ChevronRight size={18} strokeWidth={2.5} color={C.lila} />
    </Pressable>
  );
}

const biometria = NativeModules.DocumentBiometrics as {
  authenticate: () => Promise<boolean>;
  cancel: () => void;
} | undefined;

const errorCorreccion = (error: unknown, alternativo: string) =>
  (error as { data?: { error?: string } } | null)?.data?.error || alternativo;

function formatearFecha(valor: string) {
  const digitos = valor.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1').replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/');
}

export default function AdminDocumentosPantalla({ navigation, route }: NativeStackScreenProps<RaizPilaParametroLista, 'AdminDocuments'>) {
  const { usuarioId, origen } = route.params;
  const esConductor = origen === 'conductor';
  const [autorizado, setAutorizado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [visor, setVisor] = useState<{ documento: Documento; indice: number } | null>(null);
  const [identidad, setIdentidad] = useState<DatosIdentidadRevision | null>(null);
  const [cambios, setCambios] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState(false);
  const [operacionIdentidad, setOperacionIdentidad] = useState<'cargando' | 'guardando' | null>(null);
  const [errorIdentidad, setErrorIdentidad] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const autenticacion = useRef(0);
  const verificando = useRef(false);

  const desbloquear = useCallback(async () => {
    if (verificando.current) return;
    if (Platform.OS !== 'android' || !biometria) {
      setMensaje('La verificación biométrica está disponible en la app de Android actualizada.');
      return;
    }
    const version = ++autenticacion.current;
    verificando.current = true;
    setOcupado(true);
    setMensaje('');
    try {
      const confirmado = await biometria.authenticate();
      if (version !== autenticacion.current || !navigation.isFocused()) return;
      if (confirmado && AppState.currentState === 'active') setAutorizado(true);
      else setMensaje('Confirma tu identidad para ver los documentos.');
    } catch (error) {
      if (version === autenticacion.current) {
        setMensaje(error instanceof Error ? error.message : 'No se pudo verificar tu identidad.');
      }
    } finally {
      if (version === autenticacion.current) {
        verificando.current = false;
        setOcupado(false);
      }
    }
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    void desbloquear();
    const bloquear = () => {
      autenticacion.current++;
      if (verificando.current) biometria?.cancel();
      verificando.current = false;
      setOcupado(false);
      setAutorizado(false);
      setVisor(null);
      setDocumentos([]);
      setIdentidad(null);
      setCambios({});
      setEditando(false);
      setOperacionIdentidad(null);
      setErrorIdentidad('');
      setConfirmacion('');
    };
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'background') bloquear();
    });
    return () => {
      suscripcion.remove();
      bloquear();
    };
  }, [desbloquear]));

  useEffect(() => {
    if (!autorizado || !esConductor) return;
    let vigente = true;
    setCargando(true);
    setErrorCarga(false);
    obtenerTodosConductores(1, 0, 'aprobado', undefined, usuarioId)
      .then(({ data }) => {
        if (!vigente) return;
        const archivos = data.find(item => item.userId === usuarioId)?.currentRequest?.files;
        setDocumentos(documentosConductor.map(({ titulo, tipos, icono }) => ({
          titulo,
          icono,
          fotos: tipos.flatMap(tipo => {
            const archivo = archivos?.[tipo]?.filename;
            return archivo ? [`/archivos/conductores/${encodeURIComponent(archivo)}`] : [];
          })
        })).filter(documento => documento.fotos.length > 0));
      })
      .catch(() => { if (vigente) setErrorCarga(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [autorizado, esConductor, usuarioId, intento]);

  const ci: Documento = {
    titulo: 'CI',
    icono: IdCard,
    fotos: ['ciFront', 'ciBack'].map(lado => `/api/administracion/usuarios/${encodeURIComponent(usuarioId)}/evidencia-identidad/${lado}`)
  };
  const abrir = (documento: Documento) => setVisor({ documento, indice: 0 });
  const foto = visor && visor.documento.fotos[visor.indice];

  const abrirCorreccion = async () => {
    if (operacionIdentidad) return;
    const version = autenticacion.current;
    setEditando(true);
    setIdentidad(null);
    setCambios({});
    setConfirmacion('');
    setErrorIdentidad('');
    setOperacionIdentidad('cargando');
    try {
      const datos = await obtenerDatosIdentidad(usuarioId);
      if (version === autenticacion.current) setIdentidad(datos);
    } catch (error) {
      if (version === autenticacion.current) setErrorIdentidad(errorCorreccion(error, 'No se pudieron cargar los datos del CI.'));
    } finally {
      if (version === autenticacion.current) setOperacionIdentidad(null);
    }
  };

  const valorCampo = (campo: DatosIdentidadRevision['campos'][number]) =>
    campo.tipo === 'fecha' ? formatearFecha(campo.valor) : campo.valor;
  const pendientes = Object.fromEntries((identidad?.campos ?? []).flatMap(campo => {
    const valor = cambios[campo.clave]?.trim();
    return valor !== undefined && valor !== valorCampo(campo) ? [[campo.clave, valor]] : [];
  }));
  const guardarCorreccion = async () => {
    if (!identidad || operacionIdentidad || !Object.keys(pendientes).length) return;
    const version = autenticacion.current;
    setErrorIdentidad('');
    setOperacionIdentidad('guardando');
    try {
      await corregirDatosIdentidad(usuarioId, identidad.revision, pendientes);
      if (version !== autenticacion.current) return;
      setEditando(false);
      setIdentidad(null);
      setCambios({});
      setConfirmacion('Datos del CI corregidos.');
    } catch (error) {
      if (version === autenticacion.current) setErrorIdentidad(errorCorreccion(error, 'No se pudieron guardar las correcciones.'));
    } finally {
      if (version === autenticacion.current) setOperacionIdentidad(null);
    }
  };

  return (
    <MarcoDetallePersona titulo={esConductor ? 'Documentos del conductor' : 'Documentos de identidad'} cerrar={navigation.goBack} ocupado={false}>
      {!autorizado ? (
        <View style={estilos.bloqueo}>
          <Fingerprint size={38} color={C.lila} strokeWidth={2.2} />
          <Text style={s.tituloSeccion} accessibilityRole="header">Documentos protegidos</Text>
          <Text style={[s.secundario, estilos.centrado]} accessibilityLiveRegion="polite">
            {mensaje || 'Confirma tu identidad para ver los documentos.'}
          </Text>
          <Pressable style={[s.accion, estilos.accionBloqueo]} disabled={ocupado} onPress={desbloquear}
            accessibilityRole="button" accessibilityLabel="Verificar identidad"
            accessibilityState={{ disabled: ocupado, busy: ocupado }}>
            {ocupado ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.accionTexto}>Verificar identidad</Text>}
          </Pressable>
        </View>
      ) : (
        <>
          <SeccionDetallePersona titulo="Identidad">
            <FilaDocumento documento={ci} onPress={() => abrir(ci)} />
            {!editando ? <EnlaceDetallePersona etiqueta="Corregir datos" onPress={abrirCorreccion} /> : (
              <>
                {operacionIdentidad === 'cargando' && <ActivityIndicator color={C.lila} accessibilityLabel="Cargando datos del CI" />}
                {identidad?.campos.map(campo => (
                  <View key={campo.clave} style={s.fila}>
                    <Text style={s.secundario}>{campo.etiqueta}</Text>
                    <TextInput style={[s.motivo, estilos.campo]} accessibilityLabel={campo.etiqueta}
                      editable={operacionIdentidad !== 'guardando'}
                      value={cambios[campo.clave] ?? valorCampo(campo)}
                      placeholder={campo.tipo === 'fecha' ? 'DD/MM/AAAA' : undefined}
                      placeholderTextColor={C.secundario}
                      keyboardType={campo.tipo === 'fecha' || campo.clave === 'ciNumber' ? 'number-pad' : 'default'}
                      maxLength={campo.maximo ?? 10}
                      onChangeText={valor => setCambios(actual => ({
                        ...actual, [campo.clave]: campo.tipo === 'fecha' ? formatearFecha(valor) : valor
                      }))} />
                  </View>
                ))}
                {errorIdentidad ? <Text style={[s.error, s.fila]} accessibilityRole="alert">{errorIdentidad}</Text> : null}
                {identidad && Object.keys(pendientes).length > 0 && (
                  <Pressable style={s.accion} disabled={operacionIdentidad === 'guardando'} onPress={guardarCorreccion} accessibilityRole="button">
                    <Text style={s.accionTexto}>{operacionIdentidad === 'guardando' ? 'Guardando…' : 'Guardar cambios'}</Text>
                  </Pressable>
                )}
                {!operacionIdentidad && <EnlaceDetallePersona etiqueta="Cerrar edición" onPress={() => {
                  setEditando(false);
                  setIdentidad(null);
                  setCambios({});
                  setErrorIdentidad('');
                }} />}
              </>
            )}
            {confirmacion ? <Text style={[s.exito, s.fila]} accessibilityLiveRegion="polite">{confirmacion}</Text> : null}
          </SeccionDetallePersona>
          {esConductor && (
            <SeccionDetallePersona titulo="Conducción y vehículo">
              {cargando ? (
                <View style={estilos.fila} accessibilityLiveRegion="polite">
                  <ActivityIndicator color={C.lila} />
                  <Text style={s.secundario}>Cargando documentos…</Text>
                </View>
              ) :
                errorCarga ? (
                  <View style={estilos.estado}>
                    <Text style={s.error} accessibilityRole="alert">No se pudieron cargar los documentos.</Text>
                    <Pressable style={[s.accion, s.accionSecundaria]} accessibilityRole="button"
                      onPress={() => setIntento(valor => valor + 1)}>
                      <Text style={[s.accionTexto, s.accionTextoSecundario]}>Reintentar</Text>
                    </Pressable>
                  </View>
                ) : documentos.length ? documentos.map((documento, indice) => (
                  <FilaDocumento key={documento.titulo} documento={documento} separador={indice > 0}
                    onPress={() => abrir(documento)} />
                )) : <Text style={[estilos.estado, s.secundario]}>Sin documentos de conducción registrados.</Text>}
            </SeccionDetallePersona>
          )}
          {visor && foto && (
            <ZoomableDocumentModal visible title={visor.documento.titulo} source={{ ...privadoImagenOrigen(foto), cache: 'reload' }}
              onClose={() => setVisor(null)} onSwipe={direccion => setVisor(actual => {
                if (!actual) return actual;
                const indice = actual.indice + direccion;
                return indice >= 0 && indice < actual.documento.fotos.length ? { ...actual, indice } : actual;
              })} />
          )}
        </>
      )}
    </MarcoDetallePersona>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 12 },
  bloqueo: { alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 28 },
  centrado: { textAlign: 'center' },
  accionBloqueo: { alignSelf: 'stretch', marginTop: 8, backgroundColor: '#000000' },
  estado: { gap: 10, paddingVertical: 14 },
  campo: { minHeight: 48, textAlignVertical: 'center' }
});
