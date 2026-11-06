// src/hooks/usarSocket.ts
import { useEffect as usarEfecto, useCallback as usarFuncionRetorno } from 'react';
import { socketServicio } from "../services/socket.servicio";

/**
 * Hook base para usar socket.io en cualquier componente.
 * Se asegura de que el socket esté conectado cuando el componente está montado.
 *
 * Uso:
 *   const { on, off, emit } = useSocket();
 */
function usarSocket() {
  usarEfecto(() => {
    // Conectar si no está conectado
    if (!socketServicio.esConectado()) {
      socketServicio.conectar();
    }
    // No desconectar al desmontar — la conexión persiste en el singleton
  }, []);

  const al = usarFuncionRetorno((evento: string, funcionRetorno: (...args: any[]) => void) => {
    socketServicio.al(evento, funcionRetorno);
  }, []);

  const off = usarFuncionRetorno((evento: string, funcionRetorno?: (...args: any[]) => void) => {
    socketServicio.desactivado(evento, funcionRetorno);
  }, []);

  const emitir = usarFuncionRetorno((evento: string, datos?: unknown) => {
    socketServicio.emitir(evento, datos);
  }, []);

  return {
    socket: socketServicio.obtenerSocket(),
    isConnected: socketServicio.esConectado(),
    on: al,
    off,
    emit: emitir,
    socketService: socketServicio
  };
}

/**
 * Hook para suscribirse a un evento específico del socket.
 * Limpia el listener automáticamente al desmontar.
 *
 * Uso:
 *   useSocketEvent('ride:status:changed', (data) => { ... });
 */export { usarSocket };
function usarSocketEvento<T = unknown>(
evento: string,
funcionRetorno: (data: T) => void,
deps: React.DependencyList = [])
{
  usarEfecto(() => {
    if (!socketServicio.esConectado()) {
      socketServicio.conectar();
    }

    socketServicio.al(evento, funcionRetorno);

    return () => {
      socketServicio.desactivado(evento, funcionRetorno);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento, ...deps]);
}export { usarSocketEvento };
