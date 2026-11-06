import { MAPA_CLARO } from '../theme/mapa';
import React, { useCallback, useEffect, useRef, useState as usarEstado } from 'react';
import { Modal, PermissionsAndroid as PermisosAndroid, Platform as Plataforma, StyleSheet as EstiloHoja, Text as Texto, TouchableOpacity as PulsableOpacidad, View as Vista } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import MapaVista from 'react-native-maps';
import { ArrowLeft } from 'lucide-react-native';
import { Icon } from '../theme/icons';

export type DomicilioPunto = {latitude: number;longitude: number;};
const CENTRO_INICIAL = { latitude: -16.5, longitude: -68.15 };
const ZOOM_INICIAL = { latitudeDelta: 0.015, longitudeDelta: 0.015 };

function DomicilioEntrada({ point: punto, onPointChange: alPuntoCambio, onAutoOpenMap
}: {point: DomicilioPunto | null;onPointChange: (value: DomicilioPunto) => void;onAutoOpenMap?: () => void;}) {
  const [visible, establecerVisible] = usarEstado(false);
  const mapa = useRef<MapaVista>(null);
  const centro = useRef<DomicilioPunto>(CENTRO_INICIAL);
  const mapaMovido = useRef(false);

  const centrarMapa = useCallback(async (automatico = false) => {
    try {
      const permitido = Plataforma.OS !== 'android' ||
      (await PermisosAndroid.request(PermisosAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)) === PermisosAndroid.RESULTS.GRANTED;
      if (permitido) {
        Geolocation.getCurrentPosition(
          (posicion) => {
            if (automatico && mapaMovido.current) return;
            mapa.current?.animateToRegion({
              latitude: posicion.coords.latitude,
              longitude: posicion.coords.longitude,
              ...ZOOM_INICIAL
            });
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      }
    } catch {/* El mapa permite elegir manualmente sin GPS. */}
  }, []);

  const abrirMapa = useCallback(() => {
    centro.current = punto ?? CENTRO_INICIAL;
    mapaMovido.current = false;
    establecerVisible(true);
    if (!punto) void centrarMapa(true);
  }, [punto, centrarMapa]);

  useEffect(() => {
    if (!onAutoOpenMap) return;
    onAutoOpenMap();
    void abrirMapa();
  }, [onAutoOpenMap, abrirMapa]);

  return <>
    <Texto style={estilos.label}>UBICACIÓN EN EL MAPA *</Texto>
    <PulsableOpacidad style={estilos.mapButton} onPress={abrirMapa}>
      <Texto style={estilos.mapText}>Mostrar domicilio en el mapa</Texto>
    </PulsableOpacidad>
    {punto && <Texto style={estilos.coordinates}>Ubicación seleccionada: {punto.latitude.toFixed(5)}, {punto.longitude.toFixed(5)}</Texto>}
    <Modal visible={visible} presentationStyle="fullScreen" animationType="slide" onRequestClose={() => establecerVisible(false)}>
      <Vista style={estilos.modal}>
        {visible && <Vista style={estilos.map}>
          <MapaVista
            {...MAPA_CLARO}
            ref={mapa}
            style={EstiloHoja.absoluteFill}
            initialRegion={{ ...(punto ?? CENTRO_INICIAL), ...ZOOM_INICIAL }}
            onTouchStart={() => { mapaMovido.current = true; }}
            onRegionChange={({ latitude, longitude }) => { centro.current = { latitude, longitude }; }}
            zoomEnabled
            showsUserLocation />
          <Vista pointerEvents="none" style={estilos.pin}>
            <Vista style={estilos.pinHead}><Vista style={estilos.pinHole} /></Vista>
            <Vista style={estilos.pinStem} />
          </Vista>
        </Vista>}
        <SafeAreaView pointerEvents="box-none" style={estilos.controles}>
          <Vista pointerEvents="box-none" style={estilos.header}>
            <Vista pointerEvents="none" style={estilos.aviso}>
              <Texto style={estilos.title}>Ubicación del domicilio</Texto>
              <Texto style={estilos.hint}>Mueve el mapa hasta que el puntero quede sobre tu domicilio.</Texto>
            </Vista>
          </Vista>
          <Vista pointerEvents="box-none">
            <Vista pointerEvents="box-none" style={estilos.accionesMapa}>
              <PulsableOpacidad accessibilityLabel="Volver" accessibilityRole="button" style={estilos.botonMapa} activeOpacity={0.8} onPress={() => establecerVisible(false)}>
                <ArrowLeft size={26} color="#000000" strokeWidth={2.5} />
              </PulsableOpacidad>
              <PulsableOpacidad accessibilityLabel="Centrar mapa en mi ubicación" accessibilityRole="button" style={[estilos.botonMapa, estilos.botonCentrar]} activeOpacity={0.8} onPress={() => void centrarMapa()}>
                <Icon.MiUbicacion size={30} color="#000000" strokeWidth={2} />
              </PulsableOpacidad>
            </Vista>
        <PulsableOpacidad style={estilos.save} onPress={() => {
        alPuntoCambio(centro.current);
        establecerVisible(false);
      }}><Texto style={estilos.saveText}>Hecho</Texto></PulsableOpacidad>
          </Vista>
        </SafeAreaView>
      </Vista>
    </Modal>
  </>;
}export { DomicilioEntrada };

const estilos = EstiloHoja.create({
  label: { color: '#7A7A8A', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  mapButton: { borderWidth: 1, borderColor: '#7514C5', borderRadius: 12, padding: 14, alignItems: 'center' },
  mapText: { color: '#7514C5', fontWeight: '700' },
  coordinates: { color: '#555', fontSize: 12, marginTop: 8 },
  modal: { flex: 1, backgroundColor: '#fff' },
  controles: { ...EstiloHoja.absoluteFillObject, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16 },
  botonMapa: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  botonCentrar: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  accionesMapa: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  aviso: { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#17131C', elevation: 4 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  hint: { color: '#FFFFFF', fontSize: 13, marginTop: 3 },
  map: { flex: 1 },
  pin: { position: 'absolute', top: '50%', left: '50%', alignItems: 'center', transform: [{ translateX: -19 }, { translateY: -66 }] },
  pinHead: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7514C5', alignItems: 'center', justifyContent: 'center', elevation: 6, zIndex: 2 },
  pinHole: { width: 15, height: 15, borderRadius: 9, backgroundColor: '#FFFFFF' },
  pinStem: { width: 5, height: 32, marginTop: -4, backgroundColor: '#7514C5', borderBottomLeftRadius: 4, borderBottomRightRadius: 4, elevation: 2 },
  save: { backgroundColor: '#7514C5', padding: 16, alignItems: 'center', borderRadius: 12, margin: 16 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
