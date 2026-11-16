import React from 'react';
import { View as Vista, Text as Texto, StyleSheet as EstiloHoja } from 'react-native';
import { LugarSugerencia } from "../services/places.servicio";

function LugarSugerenciaEtiqueta({
  suggestion: sugerencia, oscuro = false


}: {suggestion: LugarSugerencia; oscuro?: boolean;}) {
  return (
    <Vista style={estilos.container}>
      <Texto style={[estilos.primary, oscuro && estilos.claro]} numberOfLines={2}>
        {sugerencia.mainText || sugerencia.address}
      </Texto>
      {!!sugerencia.secondaryText &&
      <Texto style={[estilos.secondary, oscuro && estilos.secundarioOscuro]} numberOfLines={2}>
          {sugerencia.secondaryText}
        </Texto>
      }
    </Vista>);

}export { LugarSugerenciaEtiqueta as default };
const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    justifyContent: 'center'
  },
  claro: { color: '#FFFFFF' },
  secundarioOscuro: { color: '#BDBDC7' },
  primary: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 21
  },
  secondary: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 1.5
  }
});
