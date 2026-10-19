import socketService from '../src/services/socket.service';

describe('disponibilidad del conductor al volver de segundo plano', () => {
  beforeEach(() => {
    socketService.disconnect();
    jest.spyOn(socketService, 'emit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    socketService.disconnect();
  });

  it('restaura En servicio tras un viaje, aunque se cancele en segundo plano', () => {
    const onRestored = jest.fn();
    const unsubscribe = socketService.onAvailabilityRestored(onRestored);
    socketService.goOnline();
    socketService.setActiveRide('ride-1', true);

    socketService.suspendForBackground();
    socketService.setActiveRide('ride-1', false);

    expect(socketService.isDriverOnline()).toBe(false);
    expect(socketService.shouldRestoreAfterRideBackground()).toBe(true);

    socketService.restoreAfterRideBackground();

    expect(socketService.isDriverOnline()).toBe(true);
    expect(socketService.shouldRestoreAfterRideBackground()).toBe(false);
    expect(onRestored).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('mantiene desconectado al conductor sin viaje activo', () => {
    socketService.goOnline();
    socketService.suspendForBackground();
    socketService.restoreAfterRideBackground();

    expect(socketService.isDriverOnline()).toBe(false);
    expect(socketService.shouldRestoreAfterRideBackground()).toBe(false);
  });
});
