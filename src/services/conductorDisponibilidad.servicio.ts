import api from "./api.cliente";
import socketServicio from "./socket.servicio";

/** Detiene de inmediato las ofertas nuevas y confirma la desconexión aunque el socket se haya suspendido. */
const desconectarConductorEnFondo = async (): Promise<void> => {
  socketServicio.suspenderParaSegundoPlano();
  try {
    await api.put('/ubicaciones-conductores/estado/desconectado');
  } catch (error) {
    console.warn('[Driver] Could not confirm background disconnection:', error);
  }
};export { desconectarConductorEnFondo as desconectarConductorEnSegundoPlano };
