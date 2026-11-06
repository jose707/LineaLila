import { privadoImagenOrigen } from "../utils/privateImageOrigen";
import React, { useEffect as usarEfecto, useRef as usarReferencia } from 'react';
import {
  Animated as Animado,
  Image as Imagen,
  StyleSheet as EstiloHoja,
  Text as Texto,
  TouchableOpacity as PulsableOpacidad,
  View as Vista } from
'react-native';
import { ChevronRight as ChevronDerecha, Star, User as Usuario } from 'lucide-react-native';
import { useSafeAreaInsets as usarSeguraZonaMargenes } from 'react-native-safe-area-context';

export interface SlideUpMenuElemento {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

interface SlideUpMenuTheme {
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  bg: string;
  white: string;
  overlay: string;
  avatarBg: string;
}

interface SlideUpMenuPropiedades {
  visible: boolean;
  onClose: () => void;
  user?: {
    nombre?: string;
    fotoPerfil?: string | null;
    urlFoto?: string | null;
    calificacion?: number | string | null;
  } | null;
  menuItems: SlideUpMenuElemento[];
  closeButton?: {
    label: string;
    onPress: () => void;
    backgroundColor?: string;
    textColor?: string;
  };
  theme?: Partial<SlideUpMenuTheme>;
}

const PREDETERMINADO_THEME: SlideUpMenuTheme = {
  primary: '#7514C5',
  accent: '#7514C5',
  text: '#111111',
  textMuted: '#888888',
  border: '#F0F0F0',
  bg: '#FAFAFA',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  avatarBg: '#F3E8FF'
};

export const SlideUpMenu: React.FC<SlideUpMenuPropiedades> = ({
  visible,
  onClose: alCerrar,
  user: usuario,
  menuItems: menuElementos,
  closeButton: cerrarBoton,
  theme = {}
}) => {
  const margenes = usarSeguraZonaMargenes();
  const T = { ...PREDETERMINADO_THEME, ...theme };
  const menuAnimacion = usarReferencia(new Animado.Value(0)).current;

  usarEfecto(() => {
    Animado.spring(menuAnimacion, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12
    }).start();
  }, [visible, menuAnimacion]);

  if (!visible) return null;

  const analizadoCalificacion =
  typeof usuario?.calificacion === 'number' ? usuario.calificacion : Number(usuario?.calificacion);
  const fotoUsuario = usuario?.fotoPerfil || usuario?.urlFoto;
  const seguraCalificacion = Number.isFinite(analizadoCalificacion) ? analizadoCalificacion : 5;

  return (
    <Vista style={EstiloHoja.absoluteFillObject} pointerEvents="box-none">
      <PulsableOpacidad
        style={[estilos.backdrop, { backgroundColor: T.overlay }]}
        activeOpacity={1}
        onPress={alCerrar} />


      <Animado.View
        style={[
        estilos.menuSheet,
        {
          backgroundColor: T.white,
          paddingBottom: margenes.bottom + 20,
          transform: [
          {
            translateY: menuAnimacion.interpolate({
              inputRange: [0, 1],
              outputRange: [400, 0]
            })
          }],

          opacity: menuAnimacion
        }]
        }>

        <Vista style={[estilos.menuHandle, { backgroundColor: T.border }]} />

        <Vista style={estilos.menuUser}>
          <Vista style={[estilos.menuAvatar, { backgroundColor: T.avatarBg }]}>
            {fotoUsuario ?
            <Imagen
              source={privadoImagenOrigen(fotoUsuario)}
              style={{ width: 50, height: 50, borderRadius: 25 }} /> :


            <Usuario size={24} color={T.accent} />
            }
          </Vista>
          <Vista>
            <Texto style={[estilos.menuUserName, { color: T.text }]}>
              {usuario?.nombre || 'Usuario'}
            </Texto>
            <Vista style={estilos.menuRatingRow}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Texto style={[estilos.menuRatingText, { color: T.textMuted }]}>
                {seguraCalificacion.toFixed(1)}
              </Texto>
            </Vista>
          </Vista>
        </Vista>

        <Vista style={[estilos.menuSep, { backgroundColor: T.border }]} />

        {menuElementos.map((elemento) =>
        <PulsableOpacidad
          key={elemento.label}
          style={[estilos.menuItem, { borderBottomColor: T.border }]}
          onPress={() => {
            alCerrar();
            elemento.onPress();
          }}
          activeOpacity={0.7}>

            {elemento.icon}
            <Texto style={[estilos.menuItemLabel, { color: T.text }]}>
              {elemento.label}
            </Texto>
            <ChevronDerecha size={16} color={T.border} />
          </PulsableOpacidad>
        )}

        {cerrarBoton &&
        <PulsableOpacidad
          style={[
          estilos.menuClose,
          { backgroundColor: cerrarBoton.backgroundColor || T.primary }]
          }
          onPress={() => {
            alCerrar();
            cerrarBoton.onPress();
          }}>

            <Texto
            style={[
            estilos.menuCloseText,
            { color: cerrarBoton.textColor || T.white }]
            }>

              {cerrarBoton.label}
            </Texto>
          </PulsableOpacidad>
        }
      </Animado.View>
    </Vista>);

};

const estilos = EstiloHoja.create({
  backdrop: {
    ...EstiloHoja.absoluteFillObject
  },
  menuSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20
  },
  menuUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3
  },
  menuRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  menuRatingText: {
    fontSize: 12,
    fontWeight: '600'
  },
  menuSep: {
    height: 1,
    marginBottom: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500'
  },
  menuClose: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  menuCloseText: {
    fontSize: 14,
    fontWeight: '600'
  }
});

export default SlideUpMenu;
