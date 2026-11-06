function ofertaSegundosIzquierda(
venceEn?: string,
ahora = Date.now(),
servidorDesplazamientoMilisegundos = 0)
{
  const plazo = Date.parse(venceEn ?? '');
  return Number.isFinite(plazo) ?
  Math.max(0, Math.ceil((plazo - ahora - servidorDesplazamientoMilisegundos) / 1000)) :
  0;
}export { ofertaSegundosIzquierda };

function servidorRelojDesplazamiento(
clienteEnviadoEn: number,
clienteRecibidoEn: number,
reloj?: {receivedAt: string;sentAt: string;})
{
  const servidorRecibidoEn = Date.parse(reloj?.receivedAt ?? '');
  const servidorEnviadoEn = Date.parse(reloj?.sentAt ?? '');
  if (!Number.isFinite(servidorRecibidoEn) || !Number.isFinite(servidorEnviadoEn)) return 0;
  return (servidorRecibidoEn - clienteEnviadoEn + (servidorEnviadoEn - clienteRecibidoEn)) / 2;
}export { servidorRelojDesplazamiento as desfaseRelojServidor };
