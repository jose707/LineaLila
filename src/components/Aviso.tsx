import React, { useEffect as usarEfecto, useRef as usarReferencia } from 'react';
import { Text as Texto, View as Vista, StyleSheet as EstiloHoja, Animated as Animado } from 'react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';

interface Propiedades {
  message: string;
  visible: boolean;
  duration?: number;
  backgroundColor?: string;
  position?: 'top' | 'bottom';
  icon?: string;
  iconCircle?: boolean;
  fontSize?: number;
  fontWeight?: '500' | '700';
  verticalPadding?: number;
  horizontalInset?: number;
  minHeight?: number;
  borderRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  bottomOffset?: number;
  onHide?: () => void;
}

const Aviso: React.FC<Propiedades> = ({
  message: mensaje,
  visible,
  duration: duracion = 4500,
  backgroundColor: fondoColor = '#000000',
  position: posicion = 'bottom',
  icon: icono = '✓',
  iconCircle: iconoCirculo = true,
  fontSize: fuenteTamano = 15,
  fontWeight: fuentePeso = '500',
  verticalPadding: verticalRelleno = 8,
  horizontalInset: horizontalMargen = 16,
  minHeight: minimoAlto,
  borderRadius: bordeRadio = 10,
  textAlign: textoAlinear = 'left',
  bottomOffset: separacionInferior = 15,
  onHide: alOcultar
}) => {
  const opacidad = usarReferencia(new Animado.Value(0)).current;
  const temporizadorReferencia = usarReferencia<ReturnType<typeof setTimeout> | null>(null);
  const margenes = usarSeguraZonaMargenes();

  usarEfecto(() => {
    if (!visible) return;
    Animado.timing(opacidad, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
    if (temporizadorReferencia.current) clearTimeout(temporizadorReferencia.current);
    temporizadorReferencia.current = setTimeout(() => {
      Animado.timing(opacidad, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true
      }).start(() => alOcultar?.());
    }, duracion);
    return () => {
      if (temporizadorReferencia.current) clearTimeout(temporizadorReferencia.current);
    };
  }, [visible, duracion]);

  if (!visible) return null;

  return (
    <Animado.View
      style={[
      s.container,
      { backgroundColor: fondoColor, opacity: opacidad, paddingVertical: verticalRelleno, left: horizontalMargen, right: horizontalMargen, minHeight: minimoAlto, borderRadius: bordeRadio },
      posicion === 'top' ?
      { top: 15 + margenes.top } :
      { bottom: separacionInferior + margenes.bottom }]
      }
      pointerEvents="none">

      {!!icono && (iconoCirculo ?
      <Vista style={s.iconCircle}>
          <Texto style={s.iconCircleText}>{icono}</Texto>
        </Vista> :

      <Texto style={[s.icon, { fontSize: fuenteTamano + 2 }]}>{icono}</Texto>)
      }
      <Texto style={[s.text, { fontSize: fuenteTamano, fontWeight: fuentePeso, textAlign: textoAlinear }, textoAlinear === 'right' && s.rightAlignedText]}>{mensaje}</Texto>
    </Animado.View>);

};

const s = EstiloHoja.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999
  },
  icon: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 6
  },
  iconCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  iconCircleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18
  },
  text: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  rightAlignedText: { flex: 1 }
});

export default Aviso;
