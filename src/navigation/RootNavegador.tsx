// src/navigation/RootNavegador.tsx
import React from 'react';
import { StyleSheet as EstiloHoja, View as Vista } from 'react-native';
import { SafeAreaProvider as SeguraZonaProvider } from 'react-native-safe-area-context';
import { usarAutenticacion } from "../hooks/usarAutenticacion";
import Toast from "../components/Aviso";
import SplashPantalla from "../screens/SplashPantalla";
import AutenticacionNavegador from "./AutenticacionNavegador";
import AplicacionNavegador from "./AplicacionNavegador";
import { IDENTIDAD_VERIFICACION_HABILITADO } from "../config/constantes";

const RaizNavegador = () => {
  const {
    isLoading: esCargando, isAuthenticated: esAuthenticated, role: rol, isDriverMode: esConductorModo, user: usuario,
    phoneVerifiedToastVisible: telefonoVerificadoAvisoVisible, hidePhoneVerifiedToast: ocultarTelefonoVerificadoAviso,
    registrationSuccessToastVisible: registroExitoAvisoVisible, hideRegistrationSuccessToast: ocultarRegistroExitoAviso
  } = usarAutenticacion();

  const finalRol = esConductorModo ? 'conductor' : rol;
  const identidadRequerido = IDENTIDAD_VERIFICACION_HABILITADO && rol !== 'administrador' && rol !== 'conductor' && usuario?.estadoVerificacionIdentidad !== 'verificado';
  const pantalla = esCargando ?
  <SplashPantalla /> :
  !esAuthenticated ?
  <AutenticacionNavegador /> :
  <AplicacionNavegador key={`${finalRol}:${identidadRequerido}`} role={finalRol as any} identityRequired={identidadRequerido} />;

  return (
    <SeguraZonaProvider>
      <Vista style={estilos.container}>
        {pantalla}
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
