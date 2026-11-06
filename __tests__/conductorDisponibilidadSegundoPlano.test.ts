import socketServicio from "../src/services/socket.servicio";

describe('disponibilidad del conductor al volver de segundo plano', () => {
  beforeEach(() => {
    socketServicio.desconectar();
    jest.spyOn(socketServicio, 'emitir').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    socketServicio.desconectar();
  });

  it('restaura En servicio tras un viaje, aunque se cancele en segundo plano', () => {
    const alRestored = jest.fn();
    const desuscribir = socketServicio.alDisponibilidadRestablecida(alRestored);
    socketServicio.irConectado();
    socketServicio.establecerActivoViaje('ride-1', true);

    socketServicio.suspenderParaSegundoPlano();
    socketServicio.establecerActivoViaje('ride-1', false);

    expect(socketServicio.esConductorConectado()).toBe(false);
    expect(socketServicio.debeRestablecerDespuesViajeSegundoPlano()).toBe(true);

    socketServicio.restablecerDespuesViajeSegundoPlano();

    expect(socketServicio.esConductorConectado()).toBe(true);
    expect(socketServicio.debeRestablecerDespuesViajeSegundoPlano()).toBe(false);
    expect(alRestored).toHaveBeenCalledTimes(1);
    desuscribir();
  });

  it('mantiene desconectado al conductor sin viaje activo', () => {
    socketServicio.irConectado();
    socketServicio.suspenderParaSegundoPlano();
    socketServicio.restablecerDespuesViajeSegundoPlano();

    expect(socketServicio.esConductorConectado()).toBe(false);
    expect(socketServicio.debeRestablecerDespuesViajeSegundoPlano()).toBe(false);
  });
});
