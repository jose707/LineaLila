import { AppState } from 'react-native';
import socketService from '../services/socket.service';

/** One synchronization at a time; polling runs only when the caller needs it. */
export function startAdaptiveSync(
  refresh: () => Promise<void>,
  interval: () => number | null,
  events: string[] = [],
): () => void {
  let stopped = false;
  let running = false;
  let queued = false;
  let foreground =
    AppState.currentState !== 'background' &&
    AppState.currentState !== 'inactive';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (stopped || !foreground) return;
    const delay = interval();
    if (delay !== null) timer = setTimeout(sync, delay);
  };
  const sync = async () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (stopped || !foreground) return;
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      await refresh();
    } finally {
      running = false;
      if (queued && !stopped && foreground) {
        queued = false;
        void sync();
      } else schedule();
    }
  };
  const disconnected = () => {
    if (timer === undefined && !running) schedule();
  };
  const subscription = AppState.addEventListener('change', state => {
    foreground = state === 'active';
    if (foreground) void sync();
    else if (timer !== undefined) clearTimeout(timer);
  });
  socketService.on('connect', sync);
  socketService.on('disconnect', disconnected);
  socketService.on('connect_error', disconnected);
  events.forEach(event => socketService.on(event, sync));
  void sync();
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    subscription.remove();
    socketService.off('connect', sync);
    socketService.off('disconnect', disconnected);
    socketService.off('connect_error', disconnected);
    events.forEach(event => socketService.off(event, sync));
  };
}
