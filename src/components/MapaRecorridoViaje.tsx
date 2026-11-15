import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import MapaVista, { Marker, Polyline, type LatLng } from 'react-native-maps';
import { DestinoIndicadorIcono, PasajeroMapaIcono } from './MapUbicacionIcons';
import { MAPA_CLARO } from '../theme/mapa';
import type { ViajeRecorrido } from '../types/api';

const violeta = '#7C3AED';

function coordenadaValida({ latitude, longitude }: LatLng) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export default function MapaRecorridoViaje({
  rutaRecorrida, pickupLocation, dropoffLocation, status, oscuro = false, seguimientoEnVivo = false
}: ViajeRecorrido & { oscuro?: boolean; seguimientoEnVivo?: boolean }) {
  const mapa = useRef<React.ElementRef<typeof MapaVista>>(null);
  const marcadorCancelacion = useRef<React.ElementRef<typeof Marker>>(null);
  const redibujarCancelacion = () => marcadorCancelacion.current?.redraw();
  const puntos: LatLng[] = [];
  if (rutaRecorrida?.type === 'LineString') {
    for (const [longitude, latitude] of rutaRecorrida.coordinates) {
      if (!coordenadaValida({ latitude, longitude })) continue;
      const anterior = puntos[puntos.length - 1];
      if (anterior?.latitude === latitude && anterior.longitude === longitude) continue;
      puntos.push({ latitude, longitude });
    }
  }

  // El servicio devuelve 0,0 cuando falta una ubicación solicitada.
  const origen = pickupLocation && coordenadaValida(pickupLocation) && (pickupLocation.latitude !== 0 || pickupLocation.longitude !== 0)
    ? pickupLocation : null;
  const destino = dropoffLocation && coordenadaValida(dropoffLocation) && (dropoffLocation.latitude !== 0 || dropoffLocation.longitude !== 0)
    ? dropoffLocation : null;
  const cancelacion = status === 'cancelado' ? puntos[puntos.length - 1] : undefined;
  const conductor = seguimientoEnVivo ? puntos[puntos.length - 1] : undefined;
  const latitudConductor = conductor?.latitude;
  const longitudConductor = conductor?.longitude;
  useEffect(() => {
    if (latitudConductor !== undefined && longitudConductor !== undefined) {
      mapa.current?.animateCamera({ center: { latitude: latitudConductor, longitude: longitudConductor } }, { duration: 400 });
    }
  }, [latitudConductor, longitudConductor]);

  const inicio = origen ?? destino ?? puntos[0];
  const avisoSinRecorrido = <Text style={[s.sinRecorrido, oscuro && s.avisoOscuro]}>
    {seguimientoEnVivo ? 'Esperando la ubicación del conductor…' : 'No hay un recorrido registrado'}
  </Text>;
  if (!inicio) return avisoSinRecorrido;

  let sur = inicio.latitude;
  let norte = inicio.latitude;
  let oeste = inicio.longitude;
  let este = inicio.longitude;
  for (const punto of [...puntos, origen, destino]) {
    if (!punto) continue;
    const { latitude, longitude } = punto;
    sur = Math.min(sur, latitude);
    norte = Math.max(norte, latitude);
    oeste = Math.min(oeste, longitude);
    este = Math.max(este, longitude);
  }

  return (
    <>
      <View style={s.marcoMapa}>
        <MapaVista ref={mapa} {...MAPA_CLARO} style={s.mapa} onMapReady={redibujarCancelacion} initialRegion={{
          latitude: latitudConductor ?? (sur + norte) / 2,
          longitude: longitudConductor ?? (oeste + este) / 2,
          latitudeDelta: Math.max((norte - sur) * 1.35, 0.004),
          longitudeDelta: Math.max((este - oeste) * 1.35, 0.004)
        }}>
          {puntos.length > 1 && <Polyline coordinates={puntos} strokeColor={violeta} strokeWidth={5} />}
          {origen && (
            <Marker coordinate={origen} title="Origen" anchor={{ x: 0.5, y: 0.5 }} zIndex={1}>
              <View style={s.iconoMapa} collapsable={false}><PasajeroMapaIcono /></View>
            </Marker>
          )}
          {destino && (
            <Marker coordinate={destino} title="Destino solicitado" anchor={{ x: 0.5, y: 0.5 }} zIndex={2}>
              <View style={s.iconoMapa} collapsable={false}><DestinoIndicadorIcono /></View>
            </Marker>
          )}
          {conductor && <Marker coordinate={conductor} title="Conductor" pinColor={violeta} zIndex={3} />}
          {cancelacion && (
            <Marker ref={marcadorCancelacion} coordinate={cancelacion} title="Viaje cancelado"
              description="Última ubicación GPS registrada" anchor={{ x: 0.5, y: 0.5 }} zIndex={3} tracksViewChanges>
              <View style={s.iconoCancelacion} collapsable={false} onLayout={redibujarCancelacion}>
                <X size={22} color="#FFFFFF" strokeWidth={3} />
              </View>
            </Marker>
          )}
        </MapaVista>
      </View>
      {puntos.length === 0 && avisoSinRecorrido}
      {!seguimientoEnVivo && puntos.length === 1 && (
        <Text style={[s.secundario, oscuro && s.secundarioOscuro]}>Se registró un solo punto de ubicación.</Text>
      )}
    </>
  );
}

const s = StyleSheet.create({
  marcoMapa: { height: 264, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3F0F6' },
  mapa: { flex: 1 },
  iconoMapa: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconoCancelacion: { width: 36, height: 36, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
  sinRecorrido: { padding: 14, borderRadius: 12, backgroundColor: '#F8F5FF', color: '#666', fontSize: 14 },
  avisoOscuro: { backgroundColor: '#2D2D2D', color: '#BDBDC7' },
  secundario: { fontSize: 13, color: '#666' },
  secundarioOscuro: { color: '#BDBDC7' }
});
