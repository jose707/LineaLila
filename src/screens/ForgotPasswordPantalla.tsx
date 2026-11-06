// src/screens/ForgotPasswordPantalla.tsx
import React, { useState as usarEstado } from "react";
import {
  View as Vista,
  StyleSheet as EstiloHoja,
  TextInput as TextoEntrada,
  TouchableOpacity as PulsableOpacidad,
  Text as Texto,
  ScrollView as DesplazableVista,
  ActivityIndicator as ActividadIndicador,
  Alert } from
"react-native";
import { COLORS as Colores } from "../theme/colors";
import type { NativeStackScreenProps as NativoPilaPantallaPropiedades } from "@react-navigation/native-stack";

type OlvidoContrasenaPantallaPropiedades = NativoPilaPantallaPropiedades<any, "ForgotPassword">;

function OlvidadaContrasenaPantalla({
  navigation: navegacion
}: OlvidoContrasenaPantallaPropiedades) {
  const [correo, establecerCorreo] = usarEstado("");
  const [cargando, establecerCargando] = usarEstado(false);
  const [enviado, establecerEnviado] = usarEstado(false);

  const manejarEnviarRestablecer = async () => {
    if (!correo) {
      Alert.alert("Error", "Por favor ingresa tu correo electrónico");
      return;
    }

    try {
      establecerCargando(true);
      // Call forgot password API
      // await authService.forgotPassword(email);
      establecerEnviado(true);
      Alert.alert(
        "Éxito",
        "Se envió un enlace de recuperación a tu correo electrónico"
      );
      setTimeout(() => navegacion.goBack(), 2000);
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo enviar el correo");
    } finally {
      establecerCargando(false);
    }
  };

  return (
    <DesplazableVista style={estilos.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Vista style={estilos.header}>
        <PulsableOpacidad
          onPress={() => navegacion.goBack()}
          style={estilos.backButton}>

          <Texto style={estilos.backText}>← Atrás</Texto>
        </PulsableOpacidad>
        <Texto style={estilos.title}>Recuperar Contraseña</Texto>
        <Texto style={estilos.subtitle}>
          Ingresa tu correo y te enviaremos un enlace para resetear tu
          contraseña
        </Texto>
      </Vista>

      {/* Form */}
      <Vista style={estilos.form}>
        <Vista style={estilos.inputGroup}>
          <Texto style={estilos.label}>Correo Electrónico</Texto>
          <TextoEntrada
            style={estilos.input}
            placeholder="tu@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            value={correo}
            onChangeText={establecerCorreo}
            editable={!cargando}
            autoCapitalize="none" />

        </Vista>

        <PulsableOpacidad
          style={[estilos.button, cargando && estilos.buttonDisabled]}
          onPress={manejarEnviarRestablecer}
          disabled={cargando}
          activeOpacity={0.8}>

          {cargando ?
          <ActividadIndicador color="#FFF" size="small" /> :

          <Texto style={estilos.buttonText}>Enviar Enlace</Texto>
          }
        </PulsableOpacidad>

        {enviado &&
        <Vista style={estilos.successMessage}>
            <Texto style={estilos.successText}>
              ✓ Revisa tu correo electrónico para las instrucciones de
              recuperación
            </Texto>
          </Vista>
        }
      </Vista>
    </DesplazableVista>);

}export { OlvidadaContrasenaPantalla as default };

const estilos = EstiloHoja.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24
  },
  backButton: {
    marginBottom: 20
  },
  backText: {
    color: Colores.primary,
    fontSize: 14,
    fontWeight: "600"
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colores.primary,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
    lineHeight: 20
  },
  form: {
    paddingHorizontal: 24
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333"
  },
  button: {
    backgroundColor: Colores.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colores.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600"
  },
  successMessage: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50"
  },
  successText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "500"
  }
});
