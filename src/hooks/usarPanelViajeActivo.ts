import React, { useState as usarEstado, useRef as usarReferencia, useCallback as usarFuncionRetorno } from 'react';
import { Animated, PanResponder } from 'react-native';

export function usarPanelViajeActivo(viajeId: string, puedeCancelarViaje: boolean, altoDisponible: number) {
  const [altoPanel, establecerAltoPanel] = usarEstado(0);
  const [altoCancelacion, establecerAltoCancelacion] = usarEstado(0);
  const [panelExpandido, establecerPanelExpandido] = usarEstado(false);
  const panelExpandidoRef = usarReferencia(false);
  const desplazamientoPanel = usarReferencia(new Animated.Value(0)).current;
  const inicioArrastrePanel = usarReferencia(0);
  const altoVisiblePanel = Math.min(altoDisponible * 0.56, Math.max(0, altoPanel - (puedeCancelarViaje ? altoCancelacion : 0)));
  const panelListo = altoPanel > 0 && (!puedeCancelarViaje || altoCancelacion > 0);
  const posicionPlegada = Math.max(0, altoPanel - altoVisiblePanel);

  const moverPanel = usarFuncionRetorno((expandir: boolean, animar = true) => {
    panelExpandidoRef.current = expandir;
    establecerPanelExpandido(expandir);
    const destino = expandir ? 0 : posicionPlegada;
    if (animar) {
      Animated.timing(desplazamientoPanel, { toValue: destino, duration: 210, useNativeDriver: true }).start();
    } else {
      desplazamientoPanel.setValue(destino);
    }
  }, [desplazamientoPanel, posicionPlegada]);

  React.useLayoutEffect(() => {
    panelExpandidoRef.current = false;
    establecerPanelExpandido(false);
  }, [viajeId]);

  React.useLayoutEffect(() => {
    moverPanel(panelExpandidoRef.current, false);
  }, [moverPanel, viajeId]);

  const gestoPanel = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesto) => posicionPlegada > 0 && Math.abs(gesto.dy) > 8 && Math.abs(gesto.dy) > Math.abs(gesto.dx),
    onPanResponderGrant: () => {
      inicioArrastrePanel.current = panelExpandidoRef.current ? 0 : posicionPlegada;
      desplazamientoPanel.stopAnimation(valor => { inicioArrastrePanel.current = valor; });
    },
    onPanResponderMove: (_, { dy }) => {
      desplazamientoPanel.setValue(Math.max(0, Math.min(posicionPlegada, inicioArrastrePanel.current + dy)));
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      moverPanel(Math.abs(vy) > 0.35 ? vy < 0 : inicioArrastrePanel.current + dy < posicionPlegada / 2);
    },
    onPanResponderTerminate: () => moverPanel(panelExpandidoRef.current)
  }), [desplazamientoPanel, moverPanel, posicionPlegada]);

  return { altoPanel, establecerAltoPanel, establecerAltoCancelacion, altoVisiblePanel, panelExpandido,
    desplazamientoPanel, panelListo, posicionPlegada, moverPanel, gestoPanel };
}
