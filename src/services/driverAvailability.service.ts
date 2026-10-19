import api from './api.client';
import socketService from './socket.service';

/** Stop new offers immediately, then confirm offline even if the socket was suspended. */
export const disconnectDriverInBackground = async (): Promise<void> => {
  socketService.suspendForBackground();
  try {
    await api.put('/driver-locations/status/offline');
  } catch (error) {
    console.warn('[Driver] Could not confirm background disconnection:', error);
  }
};
