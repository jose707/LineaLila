type Punto = {latitude: number; longitude: number};

// Distancia al segmento más cercano, no solo a los vértices de la polilínea.
export function distanciaARuta(punto: Punto, ruta: Punto[]): number {
  const escala = Math.PI / 180 * 6371000;
  const coseno = Math.cos(punto.latitude * Math.PI / 180);
  let minima = Infinity;
  for (let i = 1; i < ruta.length; i++) {
    const ax = (ruta[i - 1].longitude - punto.longitude) * escala * coseno;
    const ay = (ruta[i - 1].latitude - punto.latitude) * escala;
    const bx = (ruta[i].longitude - punto.longitude) * escala * coseno;
    const by = (ruta[i].latitude - punto.latitude) * escala;
    const dx = bx - ax, dy = by - ay;
    const longitud2 = dx * dx + dy * dy;
    const t = longitud2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / longitud2)) : 0;
    minima = Math.min(minima, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return minima;
}

export function actualizarDesvio(
  estado: {muestras: number; ultimoIntento: number},
  distancia: number,
  ahora: number,
): boolean {
  estado.muestras = distancia > 60 ? estado.muestras + 1 : 0;
  if (estado.muestras < 3 || ahora - estado.ultimoIntento < 30000) return false;
  estado.muestras = 0;
  estado.ultimoIntento = ahora;
  return true;
}
