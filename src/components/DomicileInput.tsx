import React, { useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';

export type DomicilePoint = { latitude: number; longitude: number };

export function DomicileInput({ address, onAddressChange, point, onPointChange }: {
  address: string;
  onAddressChange: (value: string) => void;
  point: DomicilePoint | null;
  onPointChange: (value: DomicilePoint) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<DomicilePoint | null>(null);
  const [center, setCenter] = useState<DomicilePoint>({ latitude: -16.5, longitude: -68.15 });

  const openMap = async () => {
    setDraft(point);
    if (point) setCenter(point);
    setVisible(true);
    try {
      const allowed = Platform.OS !== 'android' ||
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) === PermissionsAndroid.RESULTS.GRANTED;
      if (allowed && !point) {
        Geolocation.getCurrentPosition(
          position => setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
        );
      }
    } catch { /* El mapa permite elegir manualmente sin GPS. */ }
  };

  return <>
    <Text style={styles.label}>DIRECCIÓN DEL DOMICILIO *</Text>
    <TextInput
      style={styles.input}
      value={address}
      onChangeText={onAddressChange}
      placeholder="Calle, número, zona y ciudad"
      placeholderTextColor="#9CA3AF"
      multiline
      maxLength={255}
    />
    <Text style={styles.label}>UBICACIÓN EN EL MAPA *</Text>
    <TouchableOpacity style={styles.mapButton} onPress={openMap}>
      <Text style={styles.mapText}>{point ? 'Cambiar ubicación marcada' : 'Marcar domicilio en el mapa'}</Text>
    </TouchableOpacity>
    {point && <Text style={styles.coordinates}>Ubicación seleccionada: {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</Text>}
    {visible && <View style={styles.modal}>
        <Text style={styles.title}>Ubicación del domicilio</Text>
        <Text style={styles.hint}>Toca el lugar exacto de tu domicilio en el mapa.</Text>
        <MapView
          style={styles.map}
          region={{ ...center, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
          onRegionChangeComplete={region => setCenter({ latitude: region.latitude, longitude: region.longitude })}
          onPress={event => setDraft(event.nativeEvent.coordinate)}
          showsUserLocation
        >
          {draft && <Marker coordinate={draft} />}
        </MapView>
        <TouchableOpacity style={styles.save} onPress={() => {
          if (!draft) return Alert.alert('Ubicación pendiente', 'Toca el domicilio en el mapa.');
          onPointChange(draft);
          setVisible(false);
        }}><Text style={styles.saveText}>Guardar ubicación</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => setVisible(false)}><Text>Cancelar</Text></TouchableOpacity>
      </View>}
  </>;
}

const styles = StyleSheet.create({
  label: { color: '#7A7A8A', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, minHeight: 68, padding: 12, color: '#111118', textAlignVertical: 'top' },
  mapButton: { borderWidth: 1, borderColor: '#7514C5', borderRadius: 12, padding: 14, alignItems: 'center' },
  mapText: { color: '#7514C5', fontWeight: '700' },
  coordinates: { color: '#555', fontSize: 12, marginTop: 8 },
  modal: { backgroundColor: '#fff', paddingTop: 16, paddingBottom: 20 },
  title: { color: '#111118', fontSize: 20, fontWeight: '700' },
  hint: { color: '#555', marginVertical: 10 },
  map: { height: 350, borderRadius: 12 },
  save: { backgroundColor: '#7514C5', padding: 16, alignItems: 'center', borderRadius: 12, marginTop: 12 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { alignItems: 'center', padding: 14 },
});
