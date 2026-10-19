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
  private joinedRideIds = new Set<string>();
  private driverOnline = false;
  private activeRideId: string | null = null;
  private resumeAfterRideBackground = false;
  private availabilityRestoredListeners = new Set<() => void>();
  private driverCoords: { latitude: number; longitude: number } | null = null;
  private driverCoordsAt = 0;

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
      this.joinedRideIds.forEach(rideId => {
        this.socket?.emit('join_ride', { rideId });
      });
      if (this.driverOnline) {
        const coords = Date.now() - this.driverCoordsAt < 30000
          ? this.driverCoords ?? {}
          : {};
        this.socket?.emit('driver:go_online', coords);
      }
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
    this.joinedRideIds.clear();
    this.driverOnline = false;
    this.activeRideId = null;
    this.resumeAfterRideBackground = false;
    this.driverCoords = null;
    this.driverCoordsAt = 0;
  }

  /** Devuelve la instancia interna (puede ser null) */
  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isDriverOnline(): boolean {
    return this.driverOnline;
  }

  setActiveRide(rideId: string, active: boolean): void {
    if (active) this.activeRideId = rideId;
    else if (this.activeRideId === rideId) this.activeRideId = null;
  }

  hasActiveRide(): boolean {
    return this.activeRideId !== null;
  }

  shouldRestoreAfterRideBackground(): boolean {
    return this.resumeAfterRideBackground;
  }

  onAvailabilityRestored(listener: () => void): () => void {
    this.availabilityRestoredListeners.add(listener);
    return () => { this.availabilityRestoredListeners.delete(listener); };
  }

  suspendForBackground(): void {
    const restore = this.resumeAfterRideBackground ||
      (this.driverOnline && this.hasActiveRide());
    this.goOffline();
    this.resumeAfterRideBackground = restore;
  }

  restoreAfterRideBackground(): void {
    if (!this.resumeAfterRideBackground) return;
    this.resumeAfterRideBackground = false;
    this.goOnline();
    this.availabilityRestoredListeners.forEach(listener => listener());
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
    this.joinedRideIds.add(rideId);
    if (this.socket?.connected) this.socket.emit('join_ride', { rideId });
  }

  leaveRide(rideId: string): void {
    this.joinedRideIds.delete(rideId);
    if (this.socket?.connected) this.socket.emit('leave_ride', { rideId });
  }

  // ──────────────────────────────────────────────────────────
  // Driver events
  // ──────────────────────────────────────────────────────────

  goOnline(coords?: { latitude: number; longitude: number }): void {
    this.driverOnline = true;
    if (coords) {
      this.driverCoords = coords;
      this.driverCoordsAt = Date.now();
    }
    this.emit('driver:go_online', coords ?? {});
  }

  goOffline(): void {
    this.driverOnline = false;
    this.resumeAfterRideBackground = false;
    this.driverCoords = null;
    this.driverCoordsAt = 0;
    this.emit('driver:go_offline');
  }

  /** Confirma con el servidor un cambio solicitado desde el control de disponibilidad. */
  confirmDriverAvailability(
    online: boolean,
    coords?: { latitude: number; longitude: number },
  ): Promise<boolean> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.resolve(false);

    return new Promise(resolve => {
      socket.timeout(8000).emit(
        online ? 'driver:go_online' : 'driver:go_offline',
        online ? coords ?? {} : {},
        (error: Error | null, response: { ok?: boolean }) => {
          if (error || !response?.ok) {
            resolve(false);
            return;
          }
          this.driverOnline = online;
          if (!online) this.resumeAfterRideBackground = false;
          this.driverCoords = online ? coords ?? null : null;
          this.driverCoordsAt = online && coords ? Date.now() : 0;
          resolve(true);
        },
      );
    });
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
