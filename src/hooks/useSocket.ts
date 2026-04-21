// src/hooks/useSocket.ts
import { useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';

/**
 * Hook base para usar socket.io en cualquier componente.
 * Se asegura de que el socket esté conectado cuando el componente está montado.
 *
 * Uso:
 *   const { on, off, emit } = useSocket();
 */
export function useSocket() {
  useEffect(() => {
    // Conectar si no está conectado
    if (!socketService.isConnected()) {
      socketService.connect();
    }
    // No desconectar al desmontar — la conexión persiste en el singleton
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketService.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    socketService.off(event, callback);
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketService.emit(event, data);
  }, []);

  return {
    socket: socketService.getSocket(),
    isConnected: socketService.isConnected(),
    on,
    off,
    emit,
    socketService,
  };
}

/**
 * Hook para suscribirse a un evento específico del socket.
 * Limpia el listener automáticamente al desmontar.
 *
 * Uso:
 *   useSocketEvent('ride:status:changed', (data) => { ... });
 */
export function useSocketEvent<T = unknown>(
  event: string,
  callback: (data: T) => void,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    socketService.on(event, callback);

    return () => {
      socketService.off(event, callback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}
