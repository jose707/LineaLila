import React, { useEffect as usarEfecto } from 'react';
import { StatusBar as EstadoBar, Platform as Plataforma, NativeModules as NativoModules, AppState as AplicacionEstado } from 'react-native';
import { NavigationContainer as NavegacionContenedor, createNavigationContainerRef as crearNavegacionContenedorReferencia } from '@react-navigation/native';
import "./src/services/firebase-iniciar";
import * as firebaseServicio from "./src/services/firebase.servicio";

import { AutenticacionProvider } from "./src/context/ContextoAutenticacion";
import { AjustesProvider, usarAjustes } from "./src/context/AjustesContexto";
import RaizNavegador from "./src/navigation/RootNavegador";
import { usarAutenticacion } from "./src/hooks/usarAutenticacion";
import type { RaizPilaParametroLista } from "./src/navigation/AplicacionNavegador";
import { desconectarConductorEnSegundoPlano as disconnectConductorEnFondo } from "./src/services/conductorDisponibilidad.servicio";
import socketServicio from "./src/services/socket.servicio";

const { NavigationBarModule: NavegacionBarModule } = NativoModules;
const navegacionReferencia = crearNavegacionContenedorReferencia<RaizPilaParametroLista>();

const ViajeNotificacionOpener = () => {
  const { isLoading: esCargando, isAuthenticated: esAuthenticated, isDriverMode: esConductorModo } = usarAutenticacion();

  usarEfecto(() => {
    if (Plataforma.OS !== 'android' || esCargando || !esAuthenticated || !esConductorModo) return;
    const tracker = NativoModules.ActiveRideLocationModule;
    if (!tracker) return;
    let activo = true;
    const abrirPendienteViaje = async () => {
      const viajeId = await tracker.consumeLaunchRideId();
      if (!viajeId) return;
      const navigateWhenListo = (intento = 0) => {
        if (!activo) return;
        if (navegacionReferencia.isReady()) navegacionReferencia.navigate('ActiveRide', { rideId: viajeId });else
        if (intento < 20) setTimeout(() => navigateWhenListo(intento + 1), 100);
      };
      navigateWhenListo();
    };
    abrirPendienteViaje().catch(() => {});
    const suscripcion = AplicacionEstado.addEventListener('change', (estado) => {
      if (estado === 'active') abrirPendienteViaje().catch(() => {});
    });
    return () => {activo = false;suscripcion.remove();};
  }, [esCargando, esAuthenticated, esConductorModo]);

  return null;
};

const ConductorFondoDisponibilidad = () => {
  const { isAuthenticated: esAuthenticated, isDriverMode: esConductorModo } = usarAutenticacion();

  usarEfecto(() => {
    if (!esAuthenticated || !esConductorModo) return;
    let montado = true;
    let pendienteDesconectado = Promise.resolve();
    const suscripcion = AplicacionEstado.addEventListener('change', (estado) => {
      if (estado === 'background') {
        pendienteDesconectado = disconnectConductorEnFondo();
      } else if (estado === 'active' && socketServicio.debeRestablecerDespuesViajeSegundoPlano()) {
        void pendienteDesconectado.then(() => {
          if (montado && AplicacionEstado.currentState === 'active') {
            socketServicio.restablecerDespuesViajeSegundoPlano();
          }
        });
      }
    });
    return () => {montado = false;suscripcion.remove();};
  }, [esAuthenticated, esConductorModo]);

  return null;
};

const ThemeBar = () => {
  const { settings: ajustes } = usarAjustes();

  usarEfecto(() => {
    if (ajustes.darkMode) {
      EstadoBar.setBarStyle('light-content');
      EstadoBar.setBackgroundColor('#121212');
    } else {
      EstadoBar.setBarStyle('dark-content');
      EstadoBar.setBackgroundColor('#FFFFFF');
    }

    if (Plataforma.OS === 'android' && NavegacionBarModule) {
      try {
        NavegacionBarModule.setColor(
          ajustes.darkMode ? '#121212' : '#FFFFFF',
          !ajustes.darkMode
        );
      } catch {}
    }
  }, [ajustes.darkMode]);

  return null;
};

function Aplicacion() {
  usarEfecto(() => {
    const iniciarGoogle = async () => {
      try {
        console.log('Initializing Google Sign-In...');
        await firebaseServicio.configurarAccesoGoogle();
        console.log('Google Sign-In initialized');
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
        setTimeout(iniciarGoogle, 3000);
      }
    };

    iniciarGoogle();
  }, []);

  return (
    <AutenticacionProvider>
      <AjustesProvider>
        <NavegacionContenedor ref={navegacionReferencia}>
          <ThemeBar />
          <RaizNavegador />
          <ViajeNotificacionOpener />
          <ConductorFondoDisponibilidad />
        </NavegacionContenedor>
      </AjustesProvider>
    </AutenticacionProvider>);

}export { Aplicacion as default };
