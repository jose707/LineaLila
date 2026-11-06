import type { MapViewProps } from 'react-native-maps';

export const MAPA_CLARO: Pick<MapViewProps, 'mapType' | 'userInterfaceStyle' | 'customMapStyle'> = {
  mapType: 'standard',
  userInterfaceStyle: 'light',
  customMapStyle: [
    { elementType: 'geometry', stylers: [{ color: '#E8E9F0' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#535563' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F5F8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#C3E7A7' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C5DDF4' }] }
  ]
};
