// src/navigation/AutenticacionNavegador.tsx
import React from 'react';
import { createNativeStackNavigator as crearNativoPilaNavegador } from '@react-navigation/native-stack';
import IngresarPantalla from "../screens/LoginPantalla";
import OlvidadaContrasenaPantalla from "../screens/ForgotPasswordPantalla";
import ConductorRegistroPantalla from "../screens/ConductorRegistrationPantalla";
import CorreoIngresarPantalla from "../screens/EmailLoginPantalla";
import GoogleTelefonoVerificacionPantalla from "../screens/GooglePhoneVerificacionPantalla";
import { Usuario } from "../types/modelos";

export type AutenticacionPilaParametroLista = {
  Login: undefined;
  ForgotPassword: undefined;
  DriverRegistration: {user?: Usuario;};
  EmailLogin: undefined;
  GooglePhoneVerification: {
    email: string;
    firebaseUid: string;
    displayName: string;
  };
  RoleSelection: {user?: any;};
};

const Pila = crearNativoPilaNavegador<AutenticacionPilaParametroLista>();

function AutenticacionNavegador() {
  return (
    <Pila.Navigator
      screenOptions={{
        headerShown: false
      }}>

      <Pila.Screen name="Login" component={IngresarPantalla} />
      <Pila.Screen
        name="EmailLogin"
        component={CorreoIngresarPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="GooglePhoneVerification"
        component={GoogleTelefonoVerificacionPantalla}
        options={{
          animation: 'slide_from_right'
        }} />


      <Pila.Screen
        name="ForgotPassword"
        component={OlvidadaContrasenaPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

      <Pila.Screen
        name="DriverRegistration"
        component={ConductorRegistroPantalla}
        options={{
          animation: 'slide_from_right'
        }} />

    </Pila.Navigator>);

}export { AutenticacionNavegador as default };
