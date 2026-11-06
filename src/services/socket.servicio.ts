// src/services/socket.servicio.ts
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from "../config/constantes";
import { AlmacenamientoAuxiliar } from './storage';

export interface ContenidoUbicacionConductor {
  rideId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

class SocketServicio {
  private socket: Socket | null = null;
  private esConectando = false;
  private unidosViajeIds = new Set<string>();
  private conductorConectado = false;
  private activoViajeId: string | null = null;
  private reanudarDespuesViajeSegundoPlano = false;
  private disponibilidadRestablecidaEscuchas = new Set<() => void>();
  private conductorCoordenadas: {latitude: number;longitude: number;} | null = null;
  private conductorCoordenadasAt = 0;

  /** Conecta al servidor usando el token JWT del storage */
  conectar(): void {
    if (this.socket?.connected || this.esConectando) return;
    const token = AlmacenamientoAuxiliar.obtenerElemento('authToken');
    if (!token) {
      console.warn('⚠️ [Socket] No auth token, skipping connect');
      return;
    }
    if (this.socket) {
      this.socket.auth = { token };
      if (!this.socket.active) this.socket.connect();
      return;
    }

    this.esConectando = true;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
      forceNew: false
    });

    this.socket.on('connect', () => {
      console.log('🔌 [Socket] Connected:', this.socket?.id);
      this.esConectando = false;
      this.unidosViajeIds.forEach((viajeId) => {
        this.socket?.emit('join_ride', { rideId: viajeId });
      });
      if (this.conductorConectado) {
        const coordenadas = Date.now() - this.conductorCoordenadasAt < 30000 ?
        this.conductorCoordenadas ?? {} :
        {};
        this.socket?.emit('driver:go_online', coordenadas);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket] Connection error:', error.message);
      this.esConectando = false;
    });

    this.socket.on('disconnect', (motivo) => {
      console.log('🔌 [Socket] Disconnected:', motivo);
      this.esConectando = false;
    });
  }

  /** Desconecta y limpia */
  desconectar(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.esConectando = false;
    this.unidosViajeIds.clear();
    this.conductorConectado = false;
    this.activoViajeId = null;
    this.reanudarDespuesViajeSegundoPlano = false;
    this.conductorCoordenadas = null;
    this.conductorCoordenadasAt = 0;
  }

  /** Devuelve la instancia interna (puede ser null) */
  obtenerSocket(): Socket | null {
    return this.socket;
  }

  esConectado(): boolean {
    return this.socket?.connected ?? false;
  }

  esConductorConectado(): boolean {
    return this.conductorConectado;
  }

  establecerActivoViaje(viajeId: string, activo: boolean): void {
    if (activo) this.activoViajeId = viajeId;else
    if (this.activoViajeId === viajeId) this.activoViajeId = null;
  }

  tieneActivoViaje(): boolean {
    return this.activoViajeId !== null;
  }

  debeRestablecerDespuesViajeSegundoPlano(): boolean {
    return this.reanudarDespuesViajeSegundoPlano;
  }

  alDisponibilidadRestablecida(escucha: () => void): () => void {
    this.disponibilidadRestablecidaEscuchas.add(escucha);
    return () => {this.disponibilidadRestablecidaEscuchas.delete(escucha);};
  }

  suspenderParaSegundoPlano(): void {
    const restablecer = this.reanudarDespuesViajeSegundoPlano ||
    this.conductorConectado && this.tieneActivoViaje();
    this.irDesconectado();
    this.reanudarDespuesViajeSegundoPlano = restablecer;
  }

  restablecerDespuesViajeSegundoPlano(): void {
    if (!this.reanudarDespuesViajeSegundoPlano) return;
    this.reanudarDespuesViajeSegundoPlano = false;
    this.irConectado();
    this.disponibilidadRestablecidaEscuchas.forEach((escucha) => escucha());
  }

  // ──────────────────────────────────────────────────────────
  // Helpers genéricos
  // ──────────────────────────────────────────────────────────

  emitir(evento: string, datos?: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`⚠️ [Socket] Cannot emit "${evento}" – not connected`);
      return;
    }
    this.socket.emit(evento, datos);
  }

  al(evento: string, funcionRetorno: (...args: any[]) => void): void {
    this.socket?.on(evento, funcionRetorno);
  }

  desactivado(evento: string, funcionRetorno?: (...args: any[]) => void): void {
    this.socket?.off(evento, funcionRetorno);
  }

  /** Elimina TODOS los listeners de un evento (o todos si no se pasa evento) */
  quitarTodosEscuchas(evento?: string): void {
    if (evento) {
      this.socket?.removeAllListeners(evento);
    } else {
      this.socket?.removeAllListeners();
    }
  }

  // ──────────────────────────────────────────────────────────
  // Room management
  // ──────────────────────────────────────────────────────────

  unirViaje(viajeId: string): void {
    this.unidosViajeIds.add(viajeId);
    if (this.socket?.connected) this.socket.emit('join_ride', { rideId: viajeId });
  }

  leaveViaje(viajeId: string): void {
    this.unidosViajeIds.delete(viajeId);
    if (this.socket?.connected) this.socket.emit('leave_ride', { rideId: viajeId });
  }

  // ──────────────────────────────────────────────────────────
  // Driver events
  // ──────────────────────────────────────────────────────────

  irConectado(coordenadas?: {latitude: number;longitude: number;}): void {
    this.conductorConectado = true;
    if (coordenadas) {
      this.conductorCoordenadas = coordenadas;
      this.conductorCoordenadasAt = Date.now();
    }
    this.emitir('driver:go_online', coordenadas ?? {});
  }

  irDesconectado(): void {
    this.conductorConectado = false;
    this.reanudarDespuesViajeSegundoPlano = false;
    this.conductorCoordenadas = null;
    this.conductorCoordenadasAt = 0;
    this.emitir('driver:go_offline');
  }

  /** Confirma con el servidor un cambio solicitado desde el control de disponibilidad. */
  confirmarConductorDisponibilidad(
  conectado: boolean,
  coordenadas?: {latitude: number;longitude: number;})
  : Promise<boolean> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.resolve(false);

    return new Promise((resolver) => {
      socket.timeout(8000).emit(
        conectado ? 'driver:go_online' : 'driver:go_offline',
        conectado ? coordenadas ?? {} : {},
        (error: Error | null, respuesta: {ok?: boolean;}) => {
          if (error || !respuesta?.ok) {
            resolver(false);
            return;
          }
          this.conductorConectado = conectado;
          if (!conectado) this.reanudarDespuesViajeSegundoPlano = false;
          this.conductorCoordenadas = conectado ? coordenadas ?? null : null;
          this.conductorCoordenadasAt = conectado && coordenadas ? Date.now() : 0;
          resolver(true);
        }
      );
    });
  }

  /** Actualiza ubicación del conductor (se guarda en DB y se emite al room del viaje) */
  actualizarUbicacion(datos: ContenidoUbicacionConductor): void {
    this.emitir('driver:location:update', datos);
  }

  // ──────────────────────────────────────────────────────────
  // Ride events
  // ──────────────────────────────────────────────────────────

  /** Cliente notifica al sistema que se creó un viaje → el server busca conductores cercanos */
  notificarViajeCreated(viajeId: string): void {
    this.emitir('ride:created', { rideId: viajeId });
  }
}

// Singleton
const socketServicio = new SocketServicio();export { socketServicio };
export default socketServicio;
