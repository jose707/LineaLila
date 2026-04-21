// src/services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/constants';
import { StorageHelper } from './storage';

export interface DriverLocationPayload {
  rideId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  /** Conecta al servidor usando el token JWT del storage */
  connect(): void {
    if (this.socket?.connected || this.isConnecting) return;

    const token = StorageHelper.getItem('authToken');
    if (!token) {
      console.warn('⚠️ [Socket] No auth token, skipping connect');
      return;
    }

    this.isConnecting = true;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
      forceNew: false,
    });

    this.socket.on('connect', () => {
      console.log('🔌 [Socket] Connected:', this.socket?.id);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket] Connection error:', error.message);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected:', reason);
      this.isConnecting = false;
    });
  }

  /** Desconecta y limpia */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /** Devuelve la instancia interna (puede ser null) */
  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ──────────────────────────────────────────────────────────
  // Helpers genéricos
  // ──────────────────────────────────────────────────────────

  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`⚠️ [Socket] Cannot emit "${event}" – not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  /** Elimina TODOS los listeners de un evento (o todos si no se pasa evento) */
  removeAllListeners(event?: string): void {
    if (event) {
      this.socket?.removeAllListeners(event);
    } else {
      this.socket?.removeAllListeners();
    }
  }

  // ──────────────────────────────────────────────────────────
  // Room management
  // ──────────────────────────────────────────────────────────

  joinRide(rideId: string): void {
    this.emit('join_ride', { rideId });
  }

  leaveRide(rideId: string): void {
    this.emit('leave_ride', { rideId });
  }

  // ──────────────────────────────────────────────────────────
  // Driver events
  // ──────────────────────────────────────────────────────────

  goOnline(coords?: { latitude: number; longitude: number }): void {
    this.emit('driver:go_online', coords ?? {});
  }

  goOffline(): void {
    this.emit('driver:go_offline');
  }

  /** Actualiza ubicación del conductor (se guarda en DB y se emite al room del viaje) */
  updateLocation(data: DriverLocationPayload): void {
    this.emit('driver:location:update', data);
  }

  // ──────────────────────────────────────────────────────────
  // Ride events
  // ──────────────────────────────────────────────────────────

  /** Cliente notifica al sistema que se creó un viaje → el server busca conductores cercanos */
  notifyRideCreated(rideId: string): void {
    this.emit('ride:created', { rideId });
  }
}

// Singleton
export const socketService = new SocketService();
export default socketService;
