import { AppState as AplicacionEstado } from 'react-native';
import socketServicio from "../services/socket.servicio";

/** Ejecuta una sincronización a la vez y consulta periódicamente solo cuando el código que llama lo necesita. */
function inicioAdaptativaSincronizar(
renovar: () => Promise<void>,
intervalo: () => number | null,
eventos: string[] = [])
: () => void {
  let detenido = false;
  let ejecutando = false;
  let enCola = false;
  let primerPlano =
  AplicacionEstado.currentState !== 'background' &&
  AplicacionEstado.currentState !== 'inactive';
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const programar = () => {
    if (temporizador !== undefined) clearTimeout(temporizador);
    temporizador = undefined;
    if (detenido || !primerPlano) return;
    const demora = intervalo();
    if (demora !== null) temporizador = setTimeout(sincronizar, demora);
  };
  const sincronizar = async () => {
    if (temporizador !== undefined) clearTimeout(temporizador);
    temporizador = undefined;
    if (detenido || !primerPlano) return;
    if (ejecutando) {
      enCola = true;
      return;
    }
    ejecutando = true;
    try {
      await renovar();
    } finally {
      ejecutando = false;
      if (enCola && !detenido && primerPlano) {
        enCola = false;
        void sincronizar();
      } else programar();
    }
  };
  const desconectado = () => {
    if (temporizador === undefined && !ejecutando) programar();
  };
  const suscripcion = AplicacionEstado.addEventListener('change', (estado) => {
    primerPlano = estado === 'active';
    if (primerPlano) void sincronizar();else
    if (temporizador !== undefined) clearTimeout(temporizador);
  });
  socketServicio.al('connect', sincronizar);
  socketServicio.al('disconnect', desconectado);
  socketServicio.al('connect_error', desconectado);
  eventos.forEach((evento) => socketServicio.al(evento, sincronizar));
  void sincronizar();
  return () => {
    detenido = true;
    if (temporizador !== undefined) clearTimeout(temporizador);
    suscripcion.remove();
    socketServicio.desactivado('connect', sincronizar);
    socketServicio.desactivado('disconnect', desconectado);
    socketServicio.desactivado('connect_error', desconectado);
    eventos.forEach((evento) => socketServicio.desactivado(evento, sincronizar));
  };
}export { inicioAdaptativaSincronizar as iniciarAdaptativaSincronizacion };
