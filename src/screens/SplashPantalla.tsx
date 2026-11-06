import React from 'react';
import { ActivityIndicator as ActividadIndicador, StatusBar as EstadoBar, StyleSheet as EstiloHoja, View as Vista } from 'react-native';

function SplashPantalla() {
  return (
    <Vista style={estilos.container}>
      <EstadoBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ActividadIndicador size="large" color="#7514C5" accessibilityLabel="Cargando aplicación" />
    </Vista>);

}export { SplashPantalla as default };

const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
