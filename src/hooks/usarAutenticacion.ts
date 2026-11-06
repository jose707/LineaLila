// src/hooks/usarAutenticacion.ts
import { useContext as usarContexto } from "react";
import { AutenticacionContexto, AutenticacionContextoTipo } from "../context/ContextoAutenticacion";

const usarAutenticacion = (): AutenticacionContextoTipo => {
  const contexto = usarContexto(AutenticacionContexto);

  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return contexto;
};export { usarAutenticacion };
