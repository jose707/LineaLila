import React, { useState as usarEstado } from 'react';
import { Image as Imagen, StyleSheet as EstiloHoja, Text as Texto, View as Vista } from 'react-native';
import { privadoImagenOrigen } from '../utils/privateImageOrigen';

export const C = {
  primary: '#7514C5',
  primaryLight: '#F3E8FF',
  primaryBorder: '#E9D5FF',
  bg: '#FFFFFF',
  surface: '#F7F7F9',
  surfaceHigh: '#F3F3F3',
  border: '#EBEBEB',
  text: '#0D0D0D',
  textSub: '#555555',
  textMuted: '#777777',
  success: '#16A34A',
  successLight: '#DCFCE7',
  successBorder: '#BBF7D0',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorBorder: '#FECACA',
  white: '#FFFFFF'
};


export const estadoMeta = (estado: string) => {
  switch (estado) {
    case 'aprobado':
    case 'verificado':
      return {
        color: C.success,
        bg: C.successLight,
        border: C.successBorder,
        label: 'Aprobado'
      };
    case 'rechazado':
      return {
        color: C.error,
        bg: C.errorLight,
        border: C.errorBorder,
        label: 'Rechazado'
      };
    case 'observado':
      return {
        color: C.warning,
        bg: C.warningLight,
        border: C.warningBorder,
        label: 'Observado'
      };
    default:
      return {
        color: C.warning,
        bg: C.warningLight,
        border: C.warningBorder,
        label: 'Pendiente'
      };
  }
};


export function InitialsAvatar({ name: nombre, photo: foto, size: tamano = 44 }: {name: string;photo?: string;size?: number;}) {
  const [imagenError, establecerImagenError] = usarEstado(false);
  const initials = nombre.
  split(' ').
  slice(0, 2).
  map((w) => w[0]).
  join('').
  toUpperCase();
  return (
    <Vista
      style={[ia.wrap, { width: tamano, height: tamano, borderRadius: tamano / 2 }]}>

      {foto && !imagenError ?
        <Imagen
          source={privadoImagenOrigen(foto)}
          style={{ width: tamano, height: tamano, borderRadius: tamano / 2 }}
          onError={() => establecerImagenError(true)}
        /> :
        <Texto style={[ia.txt, { fontSize: tamano * 0.35 }]}>{initials}</Texto>}
    </Vista>);

}
const ia = EstiloHoja.create({
  wrap: {
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.primaryBorder
  },
  txt: { color: C.primary, fontWeight: '800', letterSpacing: -0.5 }
});
