export interface ConductorPunto {
  latitude: number;
  longitude: number;
  heading?: number;
  accuracy?: number;
}

const MINIMO_MOVEMENT_METROS = 5;
const hastaRadianes = (grados: number) => grados * Math.PI / 180;

export interface ConductorRumboEstado {
  anchor: ConductorPunto;
  heading?: number;
  timestamp?: number;
}

function normalizarRumbo(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const rumbo = Number(valor);
  return Number.isFinite(rumbo) && rumbo >= 0 ? rumbo % 360 : undefined;
}export { normalizarRumbo };

function distanciaMetros(desde: ConductorPunto, hasta: ConductorPunto): number {
  const latitudDelta = hastaRadianes(hasta.latitude - desde.latitude);
  const longitudDelta = hastaRadianes(hasta.longitude - desde.longitude);
  const arco = Math.sin(latitudDelta / 2) ** 2 +
  Math.cos(hastaRadianes(desde.latitude)) * Math.cos(hastaRadianes(hasta.latitude)) *
  Math.sin(longitudDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(arco), Math.sqrt(1 - arco));
}

function orientacionGrados(desde: ConductorPunto, hasta: ConductorPunto): number {
  const desdeLatitud = hastaRadianes(desde.latitude);
  const hastaLatitud = hastaRadianes(hasta.latitude);
  const longitudDelta = hastaRadianes(hasta.longitude - desde.longitude);
  const east = Math.sin(longitudDelta) * Math.cos(hastaLatitud);
  const north = Math.cos(desdeLatitud) * Math.sin(hastaLatitud) -
  Math.sin(desdeLatitud) * Math.cos(hastaLatitud) * Math.cos(longitudDelta);
  return (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
}

function precisionMetros(punto: ConductorPunto): number {
  return typeof punto.accuracy === 'number' && Number.isFinite(punto.accuracy) &&
  punto.accuracy > 0 ? punto.accuracy : 0;
}

function movementUmbral(anterior: ConductorPunto, real: ConductorPunto): number {
  // No interpretar pequeños saltos dentro del margen de error del GPS como giros.
  return Math.max(MINIMO_MOVEMENT_METROS, precisionMetros(anterior), precisionMetros(real));
}

/** El rumbo sigue el desplazamiento, no la orientación del teléfono. */
function resolverConductorRumbo(
anterior: ConductorPunto | null | undefined,
real: ConductorPunto)
: number | undefined {
  const priorRumbo = normalizarRumbo(anterior?.heading);
  if (anterior && distanciaMetros(anterior, real) >= movementUmbral(anterior, real)) {
    return orientacionGrados(anterior, real);
  }
  return priorRumbo;
}

/** Acumula pasos cortos y descarta ubicaciones repetidas o fuera de orden. */export { resolverConductorRumbo };
function actualizarConductorRumbo(
anterior: ConductorRumboEstado | null | undefined,
real: ConductorPunto,
fixMarcaTiempo?: number)
: ConductorRumboEstado {
  const marcaTiempo = Number.isFinite(fixMarcaTiempo) && (fixMarcaTiempo ?? 0) > 0 ?
  fixMarcaTiempo :
  undefined;
  if (anterior?.timestamp !== undefined && marcaTiempo !== undefined &&
  marcaTiempo <= anterior.timestamp) return anterior;

  if (!anterior) {
    return { anchor: real, heading: normalizarRumbo(real.heading), timestamp: marcaTiempo };
  }
  const precision = precisionMetros(real);
  if (precision > 0 && precision < precisionMetros(anterior.anchor) / 2) {
    // Una mejora de precisión no es movimiento: sustituir el punto impreciso.
    return { anchor: real, heading: anterior.heading, timestamp: marcaTiempo ?? anterior.timestamp };
  }
  const moved = distanciaMetros(anterior.anchor, real) >=
  movementUmbral(anterior.anchor, real);
  return {
    anchor: moved ? real : anterior.anchor,
    heading: moved ? orientacionGrados(anterior.anchor, real) : anterior.heading,
    timestamp: marcaTiempo ?? anterior.timestamp
  };
}export { actualizarConductorRumbo };
