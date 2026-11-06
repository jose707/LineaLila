import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Phone } from 'lucide-react-native';
import api from '../services/api.cliente';
import socketServicio from '../services/socket.servicio';
import { iniciarAdaptativaSincronizacion } from '../utils/adaptativaSincronizar';

type ContactoConfianza = { id: string; nombre: string; telefono: string; relacion: string | null };

type Alerta = {
  idAlerta: string; idViaje: string | null; activadaEn: string; nombre: string | null;
  participante: string | null; telefono: string | null; latitud: number | null; longitud: number | null;
  direccionAlerta?: string | null; notas?: string | null;
  estadoViaje?: string | null; recogida?: string | null; destino?: string | null; viajeIniciadoEn?: string | null;
  nombrePasajero?: string | null; telefonoPasajero?: string | null;
  nombreConductor?: string | null; telefonoConductor?: string | null;
  contactosPasajero?: ContactoConfianza[]; contactosConductor?: ContactoConfianza[];
  vehiculoRegistrado?: { placa: string; marca: string; modelo: string; color: string | null } | null;
  smsTotal?: number; smsEnviados?: number; smsFallidos?: number; smsPendientes?: number;
};
const ruta = '/administracion/emergencias';
const estadosViaje: Record<string, string> = {
  solicitado: 'Solicitado', ofertado: 'Con ofertas', aceptado: 'Aceptado', llegado: 'Conductor llegó',
  en_curso: 'En curso', completado: 'Completado', cancelado: 'Cancelado', vencido: 'Vencido'
};
const fechaBolivia = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/La_Paz'
});

export function usarAlertasEmergencia() {
  const [alertas, establecerAlertas] = useState<Alerta[]>([]);
  const [error, establecerError] = useState('');
  const [consultada, establecerConsultada] = useState(false);
  const revision = useRef(0);
  useFocusEffect(useCallback(() => {
    let activa = true;
    establecerConsultada(false);
    socketServicio.conectar();
    const detener = iniciarAdaptativaSincronizacion(async () => {
      const revisionConsulta = revision.current;
      try {
        const datos = await api.obtener<{ alertas: Alerta[] }>(ruta, { headers: { 'Cache-Control': 'no-cache' } });
        if (activa && revisionConsulta === revision.current) {
          establecerAlertas(datos.alertas);
          establecerError('');
        }
      } catch {
        if (activa && revisionConsulta === revision.current) establecerError('No se pudo actualizar la lista de alertas.');
      } finally {
        if (activa && revisionConsulta === revision.current) establecerConsultada(true);
      }
    }, () => 5000, ['emergencia:registrada']);
    return () => { activa = false; detener(); };
  }, []));

  const resolver = (alerta: Alerta) => Alert.alert('Resolver alerta', 'Confirma solo después de atender la alerta.', [
    { text: 'Volver', style: 'cancel' },
    { text: 'Marcar resuelta', onPress: async () => {
      try {
        await api.put(`${ruta}/${alerta.idAlerta}/resolver`, {});
        revision.current += 1;
        establecerAlertas(anterior => anterior.filter(item => item.idAlerta !== alerta.idAlerta));
      } catch {
        Alert.alert('No se pudo resolver la alerta', 'Actualiza la lista e inténtalo nuevamente.');
      }
    } }
  ]);

  return { alertas, error, resolver, consultada };
}

export default function CentralEmergencias({ alertas, error, resolver }: Omit<ReturnType<typeof usarAlertasEmergencia>, 'consultada'>) {
  if (alertas.length === 0) return null;

  return <View style={estilos.seccion}>
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {alertas.map(alerta => {
      const vehiculo = alerta.vehiculoRegistrado;
      const rol = alerta.participante === 'pasajero' ? 'Pasajero' : alerta.participante === 'conductor' ? 'Conductor' : 'Rol no disponible';
      return (
        <View key={alerta.idAlerta} style={estilos.alerta}>
          <Text style={estilos.activa}>ALERTA ACTIVA</Text>
          <Contacto etiqueta={`Emitió el aviso · ${rol}`} nombre={alerta.nombre} telefono={alerta.telefono} />
          <Dato etiqueta="Activada · hora de Bolivia" valor={fechaBolivia.format(new Date(alerta.activadaEn))} />

          <UbicacionAlerta alerta={alerta} />

          <View style={estilos.bloque}>
            <Text accessibilityRole="header" style={estilos.titulo}>Viaje</Text>
            <Dato etiqueta="Último estado del viaje" valor={alerta.estadoViaje && (estadosViaje[alerta.estadoViaje] ?? alerta.estadoViaje)} />
            {alerta.participante === 'conductor'
              ? <Contacto etiqueta="Pasajero" nombre={alerta.nombrePasajero} telefono={alerta.telefonoPasajero} />
              : <Contacto etiqueta="Conductor" nombre={alerta.nombreConductor} telefono={alerta.telefonoConductor} />}
            <Dato etiqueta="Vehículo registrado" valor={vehiculo && [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')} />
            <Dato etiqueta="Placa" valor={vehiculo?.placa} />
            <Dato etiqueta="Color" valor={vehiculo?.color} />
            {vehiculo?.placa && <Text style={estilos.etiqueta}>Vehículo sin asignación confirmada a este viaje.</Text>}
          </View>

          <View style={estilos.bloque}>
            <Text accessibilityRole="header" style={estilos.titulo}>Contactos de confianza</Text>
            <ListaContactos etiqueta="Del conductor" contactos={alerta.contactosConductor} />
            <ListaContactos etiqueta="Del pasajero" contactos={alerta.contactosPasajero} />
          </View>

          <View style={estilos.bloque}>
            <Text accessibilityRole="header" style={estilos.titulo}>Avisos a contactos</Text>
            {alerta.smsTotal ? (
              <Text style={estilos.valor}>{alerta.smsEnviados} SMS aceptados por el proveedor · {alerta.smsPendientes} pendientes · {alerta.smsFallidos} fallidos</Text>
            ) : <Text style={estilos.valor}>{alerta.smsTotal === 0 ? 'No se registraron SMS para este aviso.' : 'Sin datos de envío.'}</Text>}
          </View>

          <View style={estilos.bloque}>
            <Dato etiqueta="ID del aviso" valor={alerta.idAlerta} />
            <Dato etiqueta="ID del viaje" valor={alerta.idViaje} />
            {!!alerta.notas && <Dato etiqueta="Notas registradas" valor={alerta.notas} />}
          </View>
          <Pressable style={estilos.resolver} accessibilityRole="button" onPress={() => resolver(alerta)}>
            <Text style={estilos.resolverTexto}>Marcar como resuelta</Text>
          </Pressable>
        </View>
      );
    })}
  </View>;
}

function UbicacionAlerta({ alerta }: { alerta: Alerta }) {
  const { idAlerta, latitud, longitud, direccionAlerta } = alerta;
  const ubicacion = typeof latitud === 'number' && typeof longitud === 'number'
    ? `${latitud},${longitud}` : null;
  const [direccion, establecerDireccion] = useState<string | null>();

  useEffect(() => {
    if (!ubicacion || direccionAlerta) return;
    let activa = true;
    api.obtener<{ direccion: string | null }>(`${ruta}/${idAlerta}/direccion`)
      .then(datos => { if (activa) establecerDireccion(datos.direccion ?? null); })
      .catch(() => { if (activa) establecerDireccion(null); });
    return () => { activa = false; };
  }, [idAlerta, ubicacion, direccionAlerta]);

  return (
    <View style={estilos.bloque}>
      <Text accessibilityRole="header" style={estilos.titulo}>Ubicación al activar el aviso</Text>
      <Text selectable style={estilos.valor}>
        {direccionAlerta || direccion || (ubicacion && direccion === undefined ? 'Buscando dirección…' : 'Dirección no disponible')}
      </Text>
      {!direccionAlerta && !!direccion && <Text style={estilos.etiqueta}>Dirección aproximada</Text>}
      {ubicacion && (
        <Pressable style={estilos.accion} accessibilityRole="button" onPress={() => {
          void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(ubicacion)}`)
            .catch(() => Alert.alert('No se pudo abrir el mapa'));
        }}>
          <MapPin size={20} color="#7514C5" />
          <Text style={estilos.accionTexto}>Abrir ubicación en el mapa</Text>
        </Pressable>
      )}
    </View>
  );
}

function ListaContactos({ etiqueta, contactos }: { etiqueta: string; contactos?: ContactoConfianza[] }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.titulo}>{etiqueta}</Text>
      {contactos?.length ? contactos.map(contacto => (
        <Contacto key={contacto.id} etiqueta={contacto.relacion || 'Contacto de confianza'}
          nombre={contacto.nombre} telefono={contacto.telefono} />
      )) : <Text style={estilos.etiqueta}>{contactos ? 'Sin contactos registrados' : 'Contactos no disponibles'}</Text>}
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return <View style={estilos.dato}>
    <Text style={estilos.etiqueta}>{etiqueta}</Text>
    <Text selectable style={estilos.valor}>{valor || 'No disponible'}</Text>
  </View>;
}

function Contacto({ etiqueta, nombre, telefono }: { etiqueta: string; nombre?: string | null; telefono?: string | null }) {
  const numero = telefono?.replace(/[^+\d]/g, '');
  return (
    <View style={estilos.contacto}>
      <View style={estilos.contactoDatos}>
        <Dato etiqueta={etiqueta} valor={nombre} />
        <Text selectable style={estilos.etiqueta}>{telefono || 'Teléfono no disponible'}</Text>
      </View>
      {numero && /^\+?\d+$/.test(numero) && (
        <Pressable style={estilos.llamar} accessibilityRole="button" accessibilityLabel={`Llamar a ${nombre || etiqueta}`}
          onPress={() => { void Linking.openURL(`tel:${numero}`).catch(() => Alert.alert('No se pudo abrir el marcador')); }}>
          <Phone size={22} color="#7514C5" />
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: 16 },
  alerta: { padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', gap: 12 },
  activa: { color: '#B91C1C', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  bloque: { borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 12, gap: 8 },
  titulo: { fontSize: 15, fontWeight: '700', color: '#111118' },
  dato: { gap: 2 },
  etiqueta: { fontSize: 13, color: '#55555F' },
  valor: { fontSize: 15, color: '#111118' },
  contacto: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactoDatos: { flex: 1, gap: 2 },
  llamar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  accion: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  accionTexto: { flex: 1, fontSize: 15, fontWeight: '600', color: '#7514C5' },
  resolver: { minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
  resolverTexto: { color: '#B91C1C', fontSize: 15, fontWeight: '600' }
});
