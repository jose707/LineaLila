// src/navigation/RootNavegador.tsx
import React from 'react';
import { StyleSheet as EstiloHoja, View as Vista } from 'react-native';
import { SafeAreaProvider as SeguraZonaProvider } from 'react-native-safe-area-context';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import Toast from "../components/Aviso";
import SplashPantalla from "../screens/SplashPantalla";
import CuentaDesactivadaPantalla from '../screens/CuentaDesactivadaPantalla';
import AutenticacionNavegador from "./AutenticacionNavegador";
import AplicacionNavegador from "./AplicacionNavegador";

const RaizNavegador = () => {
  const {
    isLoading: esCargando, isAuthenticated: esAuthenticated, role: rol, isDriverMode: esConductorModo,
    mensajeCuentaDesactivada, cerrarAvisoCuentaDesactivada,
    phoneVerifiedToastVisible: telefonoVerificadoAvisoVisible, hidePhoneVerifiedToast: ocultarTelefonoVerificadoAviso,
    registrationSuccessToastVisible: registroExitoAvisoVisible, hideRegistrationSuccessToast: ocultarRegistroExitoAviso
  } = usarAutenticacion();

  const [bienvenidaVisible, establecerBienvenidaVisible] = React.useState(false);
  const sesionAnterior = React.useRef(false);
  React.useEffect(() => {
    if (esCargando) return;
    if (esAuthenticated && !sesionAnterior.current && (rol === 'administrador' || rol === 'conductor' || esConductorModo)) {
      establecerBienvenidaVisible(true);
    }
    if (!esAuthenticated) establecerBienvenidaVisible(false);
    sesionAnterior.current = esAuthenticated;
  }, [esCargando, esAuthenticated, rol, esConductorModo]);

  if (mensajeCuentaDesactivada !== null) {
    return (
      <SeguraZonaProvider>
        <CuentaDesactivadaPantalla mensaje={mensajeCuentaDesactivada} alVolver={cerrarAvisoCuentaDesactivada} />
      </SeguraZonaProvider>
    );
  }

  const finalRol = rol === 'administrador' ? rol : esConductorModo ? 'conductor' : 'user';
  const pantalla = esCargando ?
  <SplashPantalla /> :
  !esAuthenticated ?
  <AutenticacionNavegador /> :
  <AplicacionNavegador key={finalRol} role={finalRol as any} />;

  return (
    <SeguraZonaProvider>
      <Vista style={estilos.container}>
        {pantalla}
        <Toast
          visible={bienvenidaVisible}
          message="¡Bienvenido a Línea Lila!"
          backgroundColor="#16A34A"
          duration={4000}
          onHide={() => establecerBienvenidaVisible(false)} />
        <Toast
          visible={telefonoVerificadoAvisoVisible}
          message="Se verificó tu número de celular"
          backgroundColor="#16A34A"
          duration={4000}
          onHide={ocultarTelefonoVerificadoAviso} />

        <Toast
          visible={registroExitoAvisoVisible}
          message={'Registro exitoso\nBienvenido a Línea Lila'}
          backgroundColor="#16A34A"
          duration={4500}
          textAlign="left"
          onHide={ocultarRegistroExitoAviso} />

      </Vista>
    </SeguraZonaProvider>);

};export { RaizNavegador };

const estilos = EstiloHoja.create({ container: { flex: 1 } });

export default RaizNavegador;
