import React from 'react';
import Svg, { Path as Ruta, Circle, Rect } from 'react-native-svg';

const T = { accent: '#7514C5', inkMid: '#7A7A8A', inkLight: '#AFAFBF' };

export const ViajeActivoIconos = {
  TaxiSuperior: ({ size: tamano = 38 }: {size?: number;}) =>
  <Svg width={tamano} height={tamano * 2 / 3} viewBox="0 0 72 48" fill="none">
      <Ruta d="M26 8L29 3H34L32 8M26 40L29 45H34L32 40" fill="#6813A8" />
      <Ruta d="M11 8H59C66 8 70 14 70 24S66 40 59 40H11C5 40 2 34 2 24S5 8 11 8Z" fill="#8B20D7" />
      <Ruta d="M12 11H58C64 11 67 16 67 24S64 37 58 37H12C7 37 5 32 5 24S7 11 12 11Z" fill="#A32CF0" stroke="#55118B" strokeWidth="1" />
      <Ruta d="M28 11C24 15 23 33 28 37L34 35V13L28 11Z" fill="#17202B" stroke="#38114E" strokeWidth="1.5" />
      <Ruta d="M55 13C59 18 59 30 55 35H50V13H55Z" fill="#17202B" stroke="#38114E" strokeWidth="1.5" />
      <Ruta d="M34 13H50V35H34C32 28 32 20 34 13Z" fill="#B644F7" />
      <Ruta d="M8 15C12 11 18 11 24 12M8 33C12 37 18 37 24 36M35 14H47" stroke="#EAB8FF" strokeWidth="1.6" strokeLinecap="round" />
      <Ruta d="M6 15L9 13M6 33L9 35" stroke="#E6F7FF" strokeWidth="2.4" strokeLinecap="round" />
      <Ruta d="M66 15L68 19M66 33L68 29" stroke="#FF6C69" strokeWidth="2.4" strokeLinecap="round" />
    </Svg>,

  Car: ({ size: tamano = 18, color = T.accent }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Ruta
      d="M5 11l1.5-4.5h11L19 11"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round" />

      <Rect
      x="3"
      y="11"
      width="18"
      height="7"
      rx="2"
      stroke={color}
      strokeWidth="1.75" />

      <Circle cx="7.5" cy="18" r="1.5" fill={color} />
      <Circle cx="16.5" cy="18" r="1.5" fill={color} />
    </Svg>,

  Usuario: ({
    size: tamano = 18,
    color = T.inkMid



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.75" />
      <Ruta
      d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round" />

    </Svg>,

  Star: ({
    size: tamano = 13,
    color = '#F59E0B'



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color}>
      <Ruta d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>,

  Distancia: ({
    size: tamano = 14,
    color = T.inkLight



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Ruta
      d="M2 12h20M16 7l5 5-5 5"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round" />

    </Svg>,

  Reloj: ({
    size: tamano = 14,
    color = T.inkLight



  }: {size?: number;color?: string;}) =>
  <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" />
      <Ruta
      d="M12 7v5l3 3"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round" />

    </Svg>,

};
