import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default function ResplandorEmergencia() {
  return (
    <View pointerEvents="none" style={estilos.resplandor}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="luzEmergencia" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#DC2626" stopOpacity={0.34} />
            <Stop offset="45%" stopColor="#EF4444" stopOpacity={0.16} />
            <Stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#luzEmergencia)" />
      </Svg>
    </View>
  );
}

const estilos = StyleSheet.create({
  resplandor: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
});
